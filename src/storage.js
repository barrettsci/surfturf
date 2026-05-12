import { openDB } from 'idb';

const DB_NAME = 'map-app';
const DB_VERSION = 1;
const STORE_POIS = 'pois';

let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_POIS, { keyPath: 'id' });
      store.createIndex('profileId', 'profileId');
    },
  });
  return _db;
}

export async function savePOI(poi) {
  const db = await getDB();
  await db.put(STORE_POIS, poi);
}

export async function getAllPOIs() {
  const db = await getDB();
  return db.getAll(STORE_POIS);
}

export async function getPOI(id) {
  const db = await getDB();
  return db.get(STORE_POIS, id);
}

export async function deletePOI(id) {
  const db = await getDB();
  await db.delete(STORE_POIS, id);
}

export async function getPOIsByProfile(profileId) {
  const db = await getDB();
  return db.getAllFromIndex(STORE_POIS, 'profileId', profileId);
}
