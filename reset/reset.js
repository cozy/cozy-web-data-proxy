function resetData(){window.localStorage.clear(),console.log("Deleted localStorage"),window.localStorage.setItem("deletingLocalData",new Date().toISOString()),window.indexedDB.databases().then(function(e){e.forEach(function(e){window.indexedDB.deleteDatabase(e.name),console.log("Deleted indexedDB database : ",e.name)}),window.localStorage.removeItem("deletingLocalData")})}resetData();