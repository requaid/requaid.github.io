import { CONFIG } from './config.js';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CONFIG.IDB_NAME, CONFIG.IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('localPosts')) {
        const store = db.createObjectStore('localPosts', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localPosts = {
  async put(post) {
    const store = await tx('localPosts', 'readwrite');
    return wrap(store.put(post));
  },
  async get(id) {
    const store = await tx('localPosts', 'readonly');
    return wrap(store.get(id));
  },
  async delete(id) {
    const store = await tx('localPosts', 'readwrite');
    return wrap(store.delete(id));
  },
  async all() {
    const store = await tx('localPosts', 'readonly');
    return wrap(store.getAll());
  },
};

export const settings = {
  async get(key) {
    const store = await tx('settings', 'readonly');
    const r = await wrap(store.get(key));
    return r ? r.value : null;
  },
  async set(key, value) {
    const store = await tx('settings', 'readwrite');
    return wrap(store.put({ key, value }));
  },
  async delete(key) {
    const store = await tx('settings', 'readwrite');
    return wrap(store.delete(key));
  },
};
