import PouchDB from 'pouchdb-browser'

const dbName = 'sharedWorkerStorage'
let db: IDBDatabase | null = null

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db)
    }

    const request = indexedDB.open(dbName, 1)

    request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
      const database = (event.target as IDBOpenDBRequest).result
      db = database
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store', { keyPath: 'key' })
      }
    }

    request.onsuccess = (event: Event): void => {
      db = (event.target as IDBOpenDBRequest).result
      resolve(db)
    }

    request.onerror = (event: Event): void => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

const storage = {
  getItem: async (key: string): Promise<unknown> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readonly')
      const store = transaction.objectStore('store')
      const request = store.get(key)

      request.onsuccess = (): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        resolve(request.result ? request.result.value : null)
      }

      request.onerror = (): void => {
        reject(request.error)
      }
    })
  },

  setItem: async (key: string, value: unknown): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readwrite')
      const store = transaction.objectStore('store')
      const request = store.put({ key, value })

      request.onsuccess = (): void => {
        resolve()
      }

      request.onerror = (): void => {
        reject(request.error)
      }
    })
  },

  removeItem: async (key: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('store', 'readwrite')
      const store = transaction.objectStore('store')
      const request = store.delete(key)

      request.onsuccess = (): void => {
        resolve()
      }

      request.onerror = (): void => {
        reject(request.error)
      }
    })
  },
  destroy: async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (db) {
        db.close()
        db = null
      }
      const request = indexedDB.deleteDatabase(dbName)

      request.onsuccess = (): void => {
        resolve()
      }
      request.onerror = (): void => {
        reject(request.error)
      }
    })
  }
}

export const searchEngineStorage = {
  storeData: async (key: string, value: unknown): Promise<void> => {
    return storage.setItem(key, value)
  },
  getData: async <T>(key: string): Promise<T | null> => {
    const item = storage.getItem(key)
    return item ? (item as T) : null
  }
}

const events = {
  addEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject
  ): void => {
    self.addEventListener(eventName, handler)
  },
  removeEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject
  ): void => {
    self.removeEventListener(eventName, handler)
  }
}

const isOnline = async (): Promise<boolean> => {
  return self.navigator.onLine
}

export const platformWorker = {
  storage,
  events,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  pouchAdapter: PouchDB,
  isOnline
}
