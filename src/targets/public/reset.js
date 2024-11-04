/* eslint-disable no-console */

function resetData() {
  // Remove localstorage
  window.localStorage.clear()
  console.log('Deleted localStorage')

  // Add this flag for future check
  window.localStorage.setItem('deletingLocalData', new Date().toISOString())

  // Remove all indexedDB databases
  window.indexedDB.databases().then(function (databases) {
    databases.forEach(function (db) {
      window.indexedDB.deleteDatabase(db.name)
      console.log('Deleted indexedDB database : ', db.name)
    })
    // Everything is done, remove the flag
    window.localStorage.removeItem('deletingLocalData')
  })
}

resetData()
