import CozyClient, { Q, QueryDefinition } from 'cozy-client'
import { QueryOptions } from 'cozy-client/types/types'
import Minilog from 'cozy-minilog'

import { LOCALSTORAGE_KEY_DELETING_DATA, FILES_DOCTYPE } from '@/consts'
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

  const isLongRun = resp?.data?.attributes?.long_run
  const isUnDefined = isLongRun === undefined

  if (isUnDefined) {
    return true // special case for twake instances with linagora SSO
  } else {
    return !!isLongRun
  }
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

export const queryRecents = async (client: CozyClient): Promise<unknown[]> => {
  if (!client) {
    throw new Error('Client is not initialized')
  }
  const pouchLink = getPouchLink(client)
  if (!pouchLink) {
    throw new Error('PouchLink is not initialized')
  }
  const doctypes = pouchLink.doctypes.filter(doctype =>
    doctype.startsWith(FILES_DOCTYPE)
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

  return recents
}
