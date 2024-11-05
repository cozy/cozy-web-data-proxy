import Minilog from 'cozy-minilog'

import { LOCALSTORAGE_KEY_DELETING_DATA } from '@/consts'
const log = Minilog('👷‍♂️ [Worker utils]')

const deleteDatabases = async (): Promise<void> => {
  const databases = await window.indexedDB.databases()
  // Remove all indexedDB databases
  for (const db of databases) {
    if (db.name) {
      window.indexedDB.deleteDatabase(db.name)
      log.info('Deleted indexedDB database : ', db.name)
    }
  }
}

export const removeStaleLocalData = async (): Promise<void> => {
  // Check flag existence proving the reset process was incomplete
  const hasStaleData = localStorage.getItem(LOCALSTORAGE_KEY_DELETING_DATA)
  if (hasStaleData) {
    log.info('Found stale data: remove it')
    await deleteDatabases()
    localStorage.removeItem(LOCALSTORAGE_KEY_DELETING_DATA)
  }
  return
}
