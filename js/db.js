// IndexedDB 래퍼 — 모든 데이터는 폰 안에만 저장됩니다.
const DB_NAME = 'opic-practice';
const DB_VER = 2; // v2: 질문 AI 음성 캐시(qaudio) 추가
let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id' });
        s.createIndex('qid', 'qid');
        s.createIndex('sessionId', 'sessionId');
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      if (!db.objectStoreNames.contains('vocab')) db.createObjectStore('vocab', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('dict')) db.createObjectStore('dict');
      if (!db.objectStoreNames.contains('samples')) db.createObjectStore('samples');
      if (!db.objectStoreNames.contains('scripts')) db.createObjectStore('scripts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('qaudio')) db.createObjectStore('qaudio');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('transaction aborted'));
  }));
}

export const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const put = (store, val, key) => run(store, 'readwrite', (s) => (key === undefined ? s.put(val) : s.put(val, key)));
export const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const getAll = (store) => run(store, 'readonly', (s) => s.getAll());
export const getAllKeys = (store) => run(store, 'readonly', (s) => s.getAllKeys());
export const clearStore = (store) => run(store, 'readwrite', (s) => s.clear());
export const byIndex = (store, index, value) => run(store, 'readonly', (s) => s.index(index).getAll(value));

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
