export interface FileHistoryRecord {
  name: string;
  path: string;
  file?: File; // 可选的 File 对象，用于存储文件引用
  timestamp: number;
}

const DB_NAME = 'IFCFluxDB';
const STORE_NAME = 'fileHistory';
const DB_VERSION = 1;

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error');
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'path' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Object store created:', STORE_NAME);
      }
    };
  });
};

export const addFileHistory = async (file: FileHistoryRecord): Promise<void> => {
  const dbInstance = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // 使用 put 方法来添加或更新记录（如果路径已存在）
    const request = store.put(file);

    request.onsuccess = () => {
      console.log('File history added/updated:', file);
      resolve();
    };

    request.onerror = () => {
      console.error('Error adding file history:', request.error);
      reject(request.error);
    };
  });
};

export const getFileHistory = async (limit: number = 10): Promise<FileHistoryRecord[]> => {
  const dbInstance = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const records: FileHistoryRecord[] = [];
    
    // 使用 'prev' 方向的游标来按时间戳降序获取记录
    const cursorRequest = index.openCursor(null, 'prev');

    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && records.length < limit) {
        records.push(cursor.value);
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    cursorRequest.onerror = () => {
      console.error('Error getting file history:', cursorRequest.error);
      reject(cursorRequest.error);
    };
  });
};