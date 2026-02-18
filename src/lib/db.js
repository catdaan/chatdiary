import { openDB } from 'idb';

const DB_NAME = 'chatdiary-db';
const DB_VERSION = 2;

export const STORES = {
  DIARIES: 'diaries',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  CHATS: 'chats'
};

/**
 * Initialize the database
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Diaries store: indexed by date (primary) and id
      if (!db.objectStoreNames.contains(STORES.DIARIES)) {
        const store = db.createObjectStore(STORES.DIARIES, { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('category', 'category');
      }

      // Categories store
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      // Settings store (key-value pairs)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }

      // Chats store (keyed by date string 'YYYY-MM-DD')
      if (!db.objectStoreNames.contains(STORES.CHATS)) {
        db.createObjectStore(STORES.CHATS, { keyPath: 'date' });
      }
    },
  });
};

/**
 * Database operations wrapper
 */
export const db = {
  async getAll(storeName) {
    const db = await initDB();
    return db.getAll(storeName);
  },

  async get(storeName, key) {
    const db = await initDB();
    return db.get(storeName, key);
  },

  async put(storeName, value, key) {
    const db = await initDB();
    return db.put(storeName, value, key);
  },

  async delete(storeName, key) {
    const db = await initDB();
    return db.delete(storeName, key);
  },
  
  // Batch operations
  async putAll(storeName, items) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    return tx.done;
  },

  async clear(storeName) {
    const db = await initDB();
    return db.clear(storeName);
  }
};
