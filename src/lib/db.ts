export interface GalleryImage {
  id: string;
  timestamp: number;
  originalImage: string;
  processedImage: string;
  mode: string;
  prompt?: string;
}

const DB_NAME = 'vibecraft-gallery';
const STORE_NAME = 'history';
const DB_VERSION = 2; 
const MAX_IMAGES = 20;

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

export function initGalleryDB(): Promise<IDBDatabase> {
  // Safari 17 drops WebGPU context here sometimes if IDB initializes synchronously during page load.
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on the server'));
  }
  
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      dbInstance.onclose = () => {
        dbInstance = null;
        initPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      initPromise = null;
      reject(new Error('Failed to open IndexedDB'));
    };
  });

  return initPromise;
}

function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  return initGalleryDB().then((db) => {
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      
      transaction.onerror = () => reject(transaction.error);
      
      callback(store).then(resolve).catch(reject);
    });
  });
}

export async function getGalleryItems(): Promise<GalleryImage[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    return await withStore('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.index('timestamp').getAll();
        request.onsuccess = () => {
          const items = request.result as GalleryImage[];
          resolve(items.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function addGalleryItem(item: Omit<GalleryImage, 'id' | 'timestamp'>): Promise<string> {
  const record: GalleryImage = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...item
  };

  try {
    await withStore('readwrite', async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          if (request.error?.name === 'QuotaExceededError') {
            reject(request.error);
          } else {
            reject(request.error);
          }
        };
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      await evictOldestItem();
      await withStore('readwrite', (store) => {
        return new Promise<void>((resolve, reject) => {
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      });
    } else {
      throw error;
    }
  }

  await enforceStorageLimit();
  return record.id;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export async function clearGallery(): Promise<void> {
  if (typeof window === 'undefined') return;
  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function evictOldestItem(): Promise<void> {
  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.index('timestamp').openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}

async function enforceStorageLimit(): Promise<void> {
  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.index('timestamp').getAllKeys();
      request.onsuccess = () => {
        const keys = request.result;
        if (keys.length > MAX_IMAGES) {
          const keysToDelete = keys.slice(0, keys.length - MAX_IMAGES);
          let deletedCount = 0;
          let hasError = false;

          for (const key of keysToDelete) {
            const delReq = store.delete(key);
            delReq.onsuccess = () => {
              deletedCount++;
              if (deletedCount === keysToDelete.length && !hasError) resolve();
            };
            delReq.onerror = () => {
              hasError = true;
              reject(delReq.error);
            };
          }
          if (keysToDelete.length === 0) resolve();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}
