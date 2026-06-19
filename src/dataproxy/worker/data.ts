import CozyClient, { Q, QueryDefinition } from 'cozy-client'
import { QueryOptions } from 'cozy-client/types/types'
import Minilog from 'cozy-minilog'

import {
  LOCALSTORAGE_KEY_DELETING_DATA,
  FILES_DOCTYPE,
  SHARED_DRIVE_FILE_DOCTYPE
} from '@/consts'
import { getPouchLink } from '@/helpers/client'

import { ClientData } from '../common/DataProxyInterface'

export const TRASH_DIR_ID = 'io.cozy.files.trash-dir'
export const SHARED_DRIVES_DIR_ID = 'io.cozy.files.shared-drives-dir' // This folder mostly contains external drives like Nextcloud

const log = Minilog('👷‍♂️ [Worker utils]')

const DEFAULT_CACHE_TIMEOUT_QUERIES = 9 * 60 * 1000
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
const defaultFetchPolicy: QueryOptions['fetchPolicy'] = (
  CozyClient as any
).fetchPolicies.olderThan(DEFAULT_CACHE_TIMEOUT_QUERIES)

interface SessionInfo {
  last_seen: string
  long_run: boolean
}

interface SessionResponse {
  data: {
    attributes: SessionInfo
  }
}

export const queryIsTrustedDevice = async (
  client: CozyClient,
  clientData: ClientData
): Promise<boolean> => {
  const resp: SessionResponse = await client
    .getStackClient()
    .fetchJSON('GET', '/settings/sessions/current')

  // Need to get the flag from clientData since cozy-flags are not fully initialized yet
  const flags = clientData.instanceOptions?.flags as
    | Record<string, boolean>
    | undefined

  if (flags?.['dataproxy.force-trusted-device.enabled']) {
    return true
  }

  // On OIDC instances long_run is not a reliable trust signal, so trust the device
  if (clientData.capabilities?.can_auth_with_oidc) {
    return true
  }

  const isLongRun = resp?.data?.attributes?.long_run
  if (isLongRun === undefined) {
    return true
  }

  return isLongRun
}

const deleteDatabases = async (): Promise<void> => {
  if (typeof window.indexedDB?.databases === 'function') {
    const databases = await window.indexedDB.databases()
    // Remove all indexedDB databases
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name)
        log.info('Deleted indexedDB database : ', db.name)
      }
    }
  }
}

export const removeStaleLocalData = async (): Promise<void> => {
  // Check flag existence proving the reset process was incomplete
  try {
    const hasStaleData = localStorage.getItem(LOCALSTORAGE_KEY_DELETING_DATA)
    if (hasStaleData) {
      log.info('Found stale data: remove it')
      await deleteDatabases()
      localStorage.removeItem(LOCALSTORAGE_KEY_DELETING_DATA)
    }
  } catch (e) {
    log.error(e)
  }
  return
}

function buildRecentsQuery(doctype: string): {
  definition: QueryDefinition
  options: QueryOptions
} {
  return {
    definition: Q(doctype)
      .where({
        updated_at: {
          $gt: null
        }
      })
      .partialIndex({
        type: 'file',
        trashed: false,
        dir_id: {
          $nin: [SHARED_DRIVES_DIR_ID, TRASH_DIR_ID]
        }
      })
      .indexFields(['updated_at'])
      .sortBy([{ updated_at: 'desc' }])
      .limitBy(50),
    options: {
      as: 'recent-view-query-' + doctype,
      fetchPolicy: defaultFetchPolicy
    }
  }
}

export const queryRecents = async (
  client: CozyClient,
  staleSharedDriveIds: string[] = []
): Promise<unknown[]> => {
  if (!client) {
    throw new Error('Client is not initialized')
  }
  const pouchLink = getPouchLink(client)
  if (!pouchLink) {
    throw new Error('PouchLink is not initialized')
  }

  // Skip shared drives the user was removed from: querying them makes the stack
  // answer 403 and rejects the whole batch
  const staleDoctypes = new Set(
    staleSharedDriveIds.map(id => `${SHARED_DRIVE_FILE_DOCTYPE}-${id}`)
  )
  const doctypes = pouchLink.doctypes.filter(
    doctype => doctype.startsWith(FILES_DOCTYPE) && !staleDoctypes.has(doctype)
  )

  // to be sure to have all the shared drives at first page display
  await pouchLink.pouches.waitForCurrentReplications()

  const sharedDrivesRecentsPromises = doctypes.map(doctype => {
    const request = buildRecentsQuery(doctype)
    return client.requestQuery(request.definition, request.options)
  })
  const recents: unknown[] = (
    (await Promise.all(sharedDrivesRecentsPromises)) as Array<{
      data?: unknown[]
    }>
  ).flatMap(recentResult => recentResult.data || [])

  // Sort results from all doctypes by updated_at descending
  recents.sort((a, b) => {
    const dateA = new Date(
      (a as Record<string, string>).updated_at ?? 0
    ).getTime()
    const dateB = new Date(
      (b as Record<string, string>).updated_at ?? 0
    ).getTime()
    return dateB - dateA
  })

  return recents
}

interface SharedDrive {
  _id: string
  owner?: boolean
}

export interface SharedDriveDrift {
  // indexed locally but the user is no longer a recipient (stack answers 403)
  staleDriveIds: string[]
  // a recipient on the stack but never indexed locally (needs a full sync)
  missingDriveIds: string[]
}

/**
 * Compares the shared drives indexed locally against the ones the stack reports
 * the user is a recipient of, and returns the drift both ways: drives gone stale
 * locally (the stack now answers 403 for them) and drives present on the stack
 * but missing locally (they need a full sync to show up in recents and search).
 */
export const findSharedDriveDrift = async (
  client: CozyClient
): Promise<SharedDriveDrift> => {
  const empty: SharedDriveDrift = { staleDriveIds: [], missingDriveIds: [] }
  const pouchLink = getPouchLink(client)
  if (!pouchLink) {
    return empty
  }

  const prefix = `${SHARED_DRIVE_FILE_DOCTYPE}-`
  const localDriveIds = pouchLink.doctypes
    .filter(doctype => doctype.startsWith(prefix))
    .map(doctype => doctype.slice(prefix.length))

  const { data: sharedDrives } = await client
    .collection('io.cozy.sharings')
    .fetchSharedDrives()
  const accessibleDriveIds = (sharedDrives as SharedDrive[])
    .filter(drive => !drive.owner)
    .map(drive => drive._id)

  const localSet = new Set(localDriveIds)
  const accessibleSet = new Set(accessibleDriveIds)

  return {
    staleDriveIds: localDriveIds.filter(id => !accessibleSet.has(id)),
    missingDriveIds: accessibleDriveIds.filter(id => !localSet.has(id))
  }
}

/**
 * Runs the recents query. If it fails, the reconcile compares the local shared
 * drives against the stack: it lets the caller drop drives gone stale (the stack
 * answers 403 for them) and sync back drives present on the stack but missing
 * locally, then retries without the stale ones. An error not explained by any
 * drift is rethrown.
 */
export const queryRecentsHandlingStaleDrives = async (
  client: CozyClient,
  onStaleSharedDrives: (driveIds: string[]) => Promise<void>,
  onMissingSharedDrives: (driveIds: string[]) => Promise<void>
): Promise<unknown[]> => {
  try {
    return await queryRecents(client)
  } catch (error) {
    const { staleDriveIds, missingDriveIds } =
      await findSharedDriveDrift(client)
    if (staleDriveIds.length === 0 && missingDriveIds.length === 0) {
      throw error
    }
    if (missingDriveIds.length > 0) {
      await onMissingSharedDrives(missingDriveIds)
    }
    await onStaleSharedDrives(staleDriveIds)
    return queryRecents(client, staleDriveIds)
  }
}
