// Local persistence in IndexedDB: annotations per document (Instant JSON) and the personas/categories settings.
// Everything stays in the browser, so it works offline.
// Versioned name: a database left stuck by an old tab (pending delete) cannot block the app.
const DB_NAME = "hearing-annotations-v2";
const STORE = "instant-json";
import { lang } from "./i18n.js";

// Settings are kept per UI language so each language has its own personas and categories.
const SETTINGS_KEY = `__settings__:v2:${lang}`;
// Annotation keys carry the data model version too (v2: highlight color comes from the theme).
const docKey = (docId) => `v2:${docId}`;

let dbPromise = null;
function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      // Another tab wants to delete or upgrade the database: let go, so it is not blocked forever.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const request = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(request.result);
    t.onerror = () => reject(t.error);
  });
}

export const loadInstantJson = (docId) => tx("readonly", (s) => s.get(docKey(docId))).then((r) => r ?? null);
export const saveInstantJson = (docId, json) => tx("readwrite", (s) => s.put(json, docKey(docId)));
export const clearAll = () => tx("readwrite", (s) => s.clear());

export const loadSettings = () => tx("readonly", (s) => s.get(SETTINGS_KEY)).then((r) => r ?? null);
export const saveSettings = (settings) => tx("readwrite", (s) => s.put(settings, SETTINGS_KEY));
