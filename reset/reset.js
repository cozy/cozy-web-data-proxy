function resetData(){window.localStorage.setItem("deletingLocalData",new Date().toISOString()),window.indexedDB.databases().then(function(e){e.forEach(function(e){window.indexedDB.deleteDatabase(e.name),console.log("Deleted indexedDB database : ",e.name)})}),window.localStorage.clear(),console.log("Deleted localstorage")}