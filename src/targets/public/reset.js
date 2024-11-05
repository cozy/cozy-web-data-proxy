export function resetData() {
  // Add this flag for future check
  window.localStorage.setItem('deletingLocalData', new Date().toISOString())

  // Remove all indexedDB databases
  window.indexedDB.databases().then(function (databases) {
    databases.forEach(function (db) {
      window.indexedDB.deleteDatabase(db.name)
      console.log('Deleted indexedDB database : ', db.name)
    })
  })
  // Remove localstorage
  window.localStorage.clear()
  console.log('Deleted localstorage')
}
