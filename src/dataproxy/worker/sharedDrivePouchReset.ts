import Minilog from 'cozy-minilog'

import { SHARED_DRIVE_FILE_DOCTYPE } from '@/consts'
import { platformWorker } from '@/dataproxy/worker/platformWorker'

const log = Minilog('👷‍♂️ [SharedDrivePouchReset]')

const RESET_MARKER_KEY = 'shared-drive-pouches-rewrite-reset'

const DELETE_DATABASE_TIMEOUT = 10 * 1000

// Storage keys owned by cozy-pouch-link (see cozy-pouch-link/src/localStorage.js)
const POUCH_LINK_DOCTYPE_MAPS = [
  'cozy-client-pouch-link-lastreplicationsequence',
  'cozy-client-pouch-link-synced',
  'cozy-client-pouch-link-lastreplicateddocid'
]

// Storage keys owned by cozy-dataproxy-lib's SearchEngine, per doctype
const SEARCH_META_KEYS = [
  'searchIndexKeys',
  'searchIndexLastSeq',
  'searchIndexLastUpdated'
]
const SEARCH_INDEX_KEYS_FALLBACK = [
  'reg',
  'name.cfg',
  'name.map',
  'name.ctx',
  'path.cfg',
  'path.map',
  'path.ctx',
  'tag',
  'store'
]

const deleteDatabase = (name: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // A connection held open elsewhere blocks the deletion indefinitely, so
    // give up after a while and let the next worker startup retry.
    const timeout = setTimeout(
      () => reject(new Error(`Deletion of ${name} timed out`)),
      DELETE_DATABASE_TIMEOUT
    )
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = (): void => {
      clearTimeout(timeout)
      resolve()
    }
    request.onerror = (): void => {
      clearTimeout(timeout)
      reject(request.error)
    }
    request.onblocked = (): void => {
      log.warn(`Deletion of ${name} is blocked by an open connection`)
    }
  })
}

const removeDoctypeFromMap = async (
  storageKey: string,
  doctype: string
): Promise<void> => {
  const raw = await platformWorker.storage.getItem(storageKey)
  if (typeof raw !== 'string') return
  let map: Record<string, unknown>
  try {
    map = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // A checkpoint map we cannot parse would make the resync resume from an
    // unknown state, so drop it entirely
    await platformWorker.storage.removeItem(storageKey)
    return
  }
  if (!(doctype in map)) return
  delete map[doctype]
  await platformWorker.storage.setItem(storageKey, JSON.stringify(map))
}

const removeSearchIndexData = async (doctype: string): Promise<void> => {
  const prefix = `@dataproxy:${doctype}:`
  const storedKeys = await platformWorker.storage.getItem(
    `${prefix}searchIndexKeys`
  )
  const indexKeys = Array.isArray(storedKeys)
    ? (storedKeys as string[])
    : SEARCH_INDEX_KEYS_FALLBACK
  for (const key of [...indexKeys, ...SEARCH_META_KEYS]) {
    await platformWorker.storage.removeItem(`${prefix}${key}`)
  }
}

const getResetDoctypes = async (): Promise<Record<string, boolean>> => {
  const marker = await platformWorker.storage.getItem(RESET_MARKER_KEY)
  return marker && typeof marker === 'object'
    ? (marker as Record<string, boolean>)
    : {}
}

/**
 * One-time reset of the shared-drive databases.
 *
 * Shared-drive documents synced before the pouchdb-adapter-indexeddb rewrite
 * patch were stored without the adapter's field-name escaping, so the Mango
 * indexes on those databases never matched them and queries (e.g. recents)
 * silently returned nothing. Already-stored documents stay in that broken
 * shape even with the patched adapter, so the databases must be dropped and
 * resynced once. The replication and search checkpoints must go with them,
 * otherwise the resync resumes from the old sequence and the new database
 * stays empty.
 *
 * The marker records each reset doctype individually, so a drive that fails
 * mid-reset or only appears in a later session is still reset.
 */
export const resetSharedDrivePouchesOnce = async (
  uri: string,
  sharedDriveIds: string[]
): Promise<void> => {
  const resetDoctypes = await getResetDoctypes()
  const prefix = uri.replace(/^https?:\/\//, '')

  for (const driveId of sharedDriveIds) {
    const doctype = `${SHARED_DRIVE_FILE_DOCTYPE}-${driveId}`
    if (resetDoctypes[doctype]) continue

    log.info(`Resetting local database for ${doctype}`)
    await deleteDatabase(`_pouch_${prefix}__doctype__${doctype}`)
    for (const storageKey of POUCH_LINK_DOCTYPE_MAPS) {
      await removeDoctypeFromMap(storageKey, doctype)
    }
    await removeSearchIndexData(doctype)

    resetDoctypes[doctype] = true
    await platformWorker.storage.setItem(RESET_MARKER_KEY, resetDoctypes)
  }
}
