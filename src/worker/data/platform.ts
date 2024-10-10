import PouchDB from 'pouchdb-browser';

const dbName = 'sharedWorkerStorage';
let db;

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    
    const request = indexedDB.open(dbName, 1);
    
    request.onupgradeneeded = event => {
      db = event.target.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };
    
    request.onerror = event => {
      reject(event.target.error);
    };
  });
};

const storage = {
  getItem: async key => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readonly');
      const store = transaction.objectStore('store');
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  },
  
  setItem: async (key, value) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readwrite');
      const store = transaction.objectStore('store');
      const request = store.put({ key, value });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  },
  
  removeItem: async key => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readwrite');
      const store = transaction.objectStore('store');
      const request = store.delete(key);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
};

const events = {
  addEventListener: (eventName, handler) => {
    self.addEventListener(eventName, handler);
  },
  removeEventListener: (eventName, handler) => {
    self.removeEventListener(eventName, handler);
  }
};

const isOnline = async () => {
  return self.navigator.onLine;
};

export const platformWorker = {
  storage,
  events,
  pouchAdapter: PouchDB,
  isOnline
};
