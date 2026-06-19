import 'fake-indexeddb/auto'

import { platformWorker } from '@/dataproxy/worker/platformWorker'
import {
  RESET_VERSION,
  resetSharedDrivePouchesOnce
} from '@/dataproxy/worker/sharedDrivePouchReset'

const storageData = new Map<string, unknown>()

const URI = 'http://alice.localhost:8080'
const DRIVE_ID = 'drive1'
const DOCTYPE = `io.cozy.files.shareddrives-${DRIVE_ID}`
const DB_NAME = `_pouch_alice.localhost:8080__doctype__${DOCTYPE}`
const SEQUENCES_KEY = 'cozy-client-pouch-link-lastreplicationsequence'
const MARKER_KEY = 'shared-drive-pouches-rewrite-reset'

const createDatabase = (name: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onsuccess = (): void => {
      request.result.close()
      resolve()
    }
    request.onerror = (): void => reject(request.error)
  })

const databaseExists = async (name: string): Promise<boolean> => {
  return new Promise(resolve => {
    const request = indexedDB.open(name)
    request.onupgradeneeded = (): void => {
      // The open created it, so it did not exist: abort the creation
      request.transaction?.abort()
      resolve(false)
    }
    request.onsuccess = (): void => {
      request.result.close()
      resolve(true)
    }
    request.onerror = (): void => resolve(false)
  })
}

describe('resetSharedDrivePouchesOnce', () => {
  beforeEach(() => {
    storageData.clear()
    jest
      .spyOn(platformWorker.storage, 'getItem')
      .mockImplementation((key: string) =>
        Promise.resolve(storageData.has(key) ? storageData.get(key) : null)
      )
    jest
      .spyOn(platformWorker.storage, 'setItem')
      .mockImplementation((key: string, value: unknown) => {
        storageData.set(key, value)
        return Promise.resolve()
      })
    jest
      .spyOn(platformWorker.storage, 'removeItem')
      .mockImplementation((key: string) => {
        storageData.delete(key)
        return Promise.resolve()
      })
  })

  it('deletes the drive database, its checkpoints and search data once', async () => {
    await createDatabase(DB_NAME)
    storageData.set(
      SEQUENCES_KEY,
      JSON.stringify({ [DOCTYPE]: '42-abc', 'io.cozy.files': '7-def' })
    )
    storageData.set(`@dataproxy:${DOCTYPE}:searchIndexKeys`, ['reg', 'store'])
    storageData.set(`@dataproxy:${DOCTYPE}:reg`, '{}')
    storageData.set(`@dataproxy:${DOCTYPE}:store`, 'false')
    storageData.set(`@dataproxy:${DOCTYPE}:searchIndexLastSeq`, 42)

    await resetSharedDrivePouchesOnce(URI, [DRIVE_ID])

    expect(await databaseExists(DB_NAME)).toBe(false)
    expect(JSON.parse(storageData.get(SEQUENCES_KEY) as string)).toEqual({
      'io.cozy.files': '7-def'
    })
    expect(storageData.has(`@dataproxy:${DOCTYPE}:reg`)).toBe(false)
    expect(storageData.has(`@dataproxy:${DOCTYPE}:store`)).toBe(false)
    expect(storageData.has(`@dataproxy:${DOCTYPE}:searchIndexLastSeq`)).toBe(
      false
    )
    expect(storageData.get(MARKER_KEY)).toEqual({
      version: RESET_VERSION,
      doctypes: { [DOCTYPE]: true }
    })

    // A database recreated by the resync must not be deleted again
    await createDatabase(DB_NAME)
    await resetSharedDrivePouchesOnce(URI, [DRIVE_ID])
    expect(await databaseExists(DB_NAME)).toBe(true)
  })

  it('resets drives that appear after a previous reset', async () => {
    storageData.set(MARKER_KEY, {
      version: RESET_VERSION,
      doctypes: { [DOCTYPE]: true }
    })
    const otherDoctype = 'io.cozy.files.shareddrives-drive2'
    const otherDbName = `_pouch_alice.localhost:8080__doctype__${otherDoctype}`
    await createDatabase(otherDbName)

    await resetSharedDrivePouchesOnce(URI, [DRIVE_ID, 'drive2'])

    expect(await databaseExists(otherDbName)).toBe(false)
    expect(storageData.get(MARKER_KEY)).toEqual({
      version: RESET_VERSION,
      doctypes: { [DOCTYPE]: true, [otherDoctype]: true }
    })
  })

  it('repairs a drive again when its marker predates the current reset version', async () => {
    // A marker from before version gating (or an older version) must not stop
    // the repair from running again under the current version.
    storageData.set(MARKER_KEY, { [DOCTYPE]: true })
    await createDatabase(DB_NAME)

    await resetSharedDrivePouchesOnce(URI, [DRIVE_ID])

    expect(await databaseExists(DB_NAME)).toBe(false)
    expect(storageData.get(MARKER_KEY)).toEqual({
      version: RESET_VERSION,
      doctypes: { [DOCTYPE]: true }
    })
  })

  it('drops a corrupted checkpoint map instead of keeping it', async () => {
    storageData.set(SEQUENCES_KEY, '{not json')

    await resetSharedDrivePouchesOnce(URI, [DRIVE_ID])

    expect(storageData.has(SEQUENCES_KEY)).toBe(false)
  })
})
