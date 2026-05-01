const DB_NAME = "wine-cellar-db";
const DB_VERSION = 3;
const WINES_STORE = "wines";
const QUEUE_STORE = "sync_queue";
const TOMBSTONES_STORE = "tombstones";
const SYNC_LOGS_STORE = "sync_logs";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(WINES_STORE)) {
        db.createObjectStore(WINES_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, {
          keyPath: "queueId",
          autoIncrement: true,
        });
        queueStore.createIndex("createdAt", "createdAt");
      }

      if (!db.objectStoreNames.contains(TOMBSTONES_STORE)) {
        db.createObjectStore(TOMBSTONES_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SYNC_LOGS_STORE)) {
        const syncLogsStore = db.createObjectStore(SYNC_LOGS_STORE, {
          keyPath: "logId",
          autoIncrement: true,
        });
        syncLogsStore.createIndex("createdAt", "createdAt");
      }
    };
  });
}

function txDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function getAllLocalWines() {
  const db = await openDb();
  const tx = db.transaction(WINES_STORE, "readonly");
  const store = tx.objectStore(WINES_STORE);

  const result = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  await txDone(tx);
  db.close();
  return result;
}

export async function putLocalWine(wine) {
  const db = await openDb();
  const tx = db.transaction(WINES_STORE, "readwrite");
  tx.objectStore(WINES_STORE).put(wine);
  await txDone(tx);
  db.close();
}

export async function deleteLocalWineById(id) {
  const db = await openDb();
  const tx = db.transaction(WINES_STORE, "readwrite");
  tx.objectStore(WINES_STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function replaceLocalWines(wines) {
  const db = await openDb();
  const tx = db.transaction(WINES_STORE, "readwrite");
  const winesStore = tx.objectStore(WINES_STORE);
  winesStore.clear();
  wines.forEach((wine) => winesStore.put(wine));
  await txDone(tx);
  db.close();
}

export async function enqueueSyncAction(action) {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).add(action);
  await txDone(tx);
  db.close();
}

export async function getQueuedActions() {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const store = tx.objectStore(QUEUE_STORE);

  const result = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  await txDone(tx);
  db.close();
  return result.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedAction(queueId) {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).delete(queueId);
  await txDone(tx);
  db.close();
}

export async function replaceQueuedActions(actions) {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  store.clear();
  actions.forEach((action) => {
    const { queueId, ...nextAction } = action;
    store.add(nextAction);
  });
  await txDone(tx);
  db.close();
}

export async function putTombstone(id, deletedAt) {
  const db = await openDb();
  const tx = db.transaction(TOMBSTONES_STORE, "readwrite");
  tx.objectStore(TOMBSTONES_STORE).put({ id, deletedAt });
  await txDone(tx);
  db.close();
}

export async function removeTombstone(id) {
  const db = await openDb();
  const tx = db.transaction(TOMBSTONES_STORE, "readwrite");
  tx.objectStore(TOMBSTONES_STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function getAllTombstones() {
  const db = await openDb();
  const tx = db.transaction(TOMBSTONES_STORE, "readonly");
  const store = tx.objectStore(TOMBSTONES_STORE);

  const result = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  await txDone(tx);
  db.close();
  return result;
}

export async function addSyncLog(entry) {
  const db = await openDb();
  const tx = db.transaction(SYNC_LOGS_STORE, "readwrite");
  tx.objectStore(SYNC_LOGS_STORE).add(entry);
  await txDone(tx);
  db.close();
}

export async function getRecentSyncLogs(limit = 20) {
  const db = await openDb();
  const tx = db.transaction(SYNC_LOGS_STORE, "readonly");
  const store = tx.objectStore(SYNC_LOGS_STORE);

  const result = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  await txDone(tx);
  db.close();
  return result.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
