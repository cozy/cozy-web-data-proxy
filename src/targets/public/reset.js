/* eslint-disable no-console */

const SHARED_WORKER_DB_NAME = 'sharedWorkerStorage'
const STORE_NAME = 'store'
const DB_NAMES_KEY = 'cozy-client-pouch-link-db-names'

function openDB(dbName) {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(dbName, 1)

    request.onsuccess = function (event) {
      const db = event.target.result
      resolve(db)
    }
    request.onerror = function (event) {
      reject(event.target.error)
    }
  })
}

async function getItem(LOCAL_DB_NAME, key) {
  const db = await openDB(LOCAL_DB_NAME)
  if (!db) {
    return null
  }

  return new Promise(function (resolve, reject) {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = function () {
        resolve(request.result ? request.result.value : null)
      }

      request.onerror = function () {
        reject(request.error)
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        console.log(`No db ${LOCAL_DB_NAME} found: nothing to clean`)
        resolve(null)
      }
      reject(err)
    }
  })
}

;(async function () {
  try {
    // Remove localstorage
    window.localStorage.clear()
    console.log('Deleted localStorage.')

    // Add this flag for future check
    window.localStorage.setItem('deletingLocalData', new Date().toISOString())

    if (typeof window.indexedDB?.databases === 'function') {
      // Remove all indexedDB databases
      window.indexedDB.databases().then(function (databases) {
        databases.forEach(function (db) {
          window.indexedDB.deleteDatabase(db.name)
          console.log('Deleted indexedDB database: ', db.name)
        })
      })
    } else {
      // indexedDB.databases() does not exist: fallback to stored db names
      const item = await getItem(SHARED_WORKER_DB_NAME, DB_NAMES_KEY)
      if (!item) {
        console.log('No databases info found. Nothing will be removed.')
        return
      }
      const dbNames = JSON.parse(item)

      dbNames.forEach(function (dbName) {
        const request = window.indexedDB.deleteDatabase(dbName)
        request.onsuccess = function () {
          console.log('Deleted database:', dbName)
        }
        request.onerror = function (e) {
          console.warn('Failed to delete database:', dbName, e)
        }
      })
      window.indexedDB.deleteDatabase(LOCAL_DB_NAME)
    }
    // Everything is done, remove the flag
    window.localStorage.removeItem('deletingLocalData')
  } catch (e) {
    console.log('Something went wrong during cleanup: ', e)
  }
})()
