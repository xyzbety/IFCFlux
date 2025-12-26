class CacheDB {
    private dbName = 'LoadersCache';
    private storeName = 'loadersCache';
    private version = 1;
  
    private async openDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'url' });
          }
        };
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    public async get(url: string): Promise<any> {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);
  
        request.onsuccess = () => resolve(request.result?.data);
        request.onerror = () => reject(request.error);
      });
    }
  
    public async set(url: string, data: any): Promise<void> {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put({ url, data });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }
  
  export const cacheDB = new CacheDB();