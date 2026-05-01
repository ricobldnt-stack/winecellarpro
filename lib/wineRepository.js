import {
  addSyncLog,
  deleteLocalWineById,
  enqueueSyncAction,
  getAllLocalWines,
  getAllTombstones,
  getRecentSyncLogs,
  getQueuedActions,
  putLocalWine,
  putTombstone,
  removeQueuedAction,
  removeTombstone,
  replaceQueuedActions,
  replaceLocalWines,
} from "./db";
import {
  addWine as addWineRemote,
  deleteWine as deleteWineRemote,
  fetchWines as fetchWinesRemote,
  hasSupabaseConfig,
  isAuthError,
  updateWine as updateWineRemote,
} from "./supabase";

function nowIso() {
  return new Date().toISOString();
}

export function normalizeRemoteWine(remoteWine) {
  return {
    id: remoteWine.id,
    name: remoteWine.name ?? "",
    year: remoteWine.year ?? "",
    region: remoteWine.region ?? "",
    grape: remoteWine.grape ?? "",
    quantity: Number(remoteWine.quantity ?? 0),
    notes: remoteWine.notes ?? "",
    updatedAt: remoteWine.updated_at ?? nowIso(),
  };
}

export async function loadLocalWines() {
  return getAllLocalWines();
}

export async function createWine(input) {
  const wine = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    year: input.year.trim(),
    region: input.region.trim(),
    grape: input.grape.trim(),
    quantity: Number(input.quantity) || 0,
    notes: input.notes.trim(),
    updatedAt: nowIso(),
  };

  await putLocalWine(wine);
  await enqueueSyncAction({
    action: "add",
    wine,
    createdAt: Date.now(),
  });
  await compactSyncQueue();
  return wine;
}

export async function editWine(id, input) {
  const wine = {
    id,
    name: input.name.trim(),
    year: input.year.trim(),
    region: input.region.trim(),
    grape: input.grape.trim(),
    quantity: Number(input.quantity) || 0,
    notes: input.notes.trim(),
    updatedAt: nowIso(),
  };

  await putLocalWine(wine);
  await enqueueSyncAction({
    action: "update",
    wine,
    createdAt: Date.now(),
  });
  await compactSyncQueue();
  return wine;
}

export async function removeWine(id) {
  const deletedAt = nowIso();
  await deleteLocalWineById(id);
  await putTombstone(id, deletedAt);
  await enqueueSyncAction({
    action: "delete",
    wineId: id,
    deletedAt,
    createdAt: Date.now(),
  });
  await compactSyncQueue();
}

function getActionWineId(action) {
  if (action.action === "delete") return action.wineId;
  return action.wine?.id;
}

function mergeActions(previous, next) {
  if (previous.action === "add" && next.action === "update") {
    return { ...previous, wine: next.wine, createdAt: previous.createdAt };
  }

  if (previous.action === "add" && next.action === "delete") {
    return null;
  }

  if (previous.action === "update" && next.action === "update") {
    return { ...previous, wine: next.wine, createdAt: previous.createdAt };
  }

  if (previous.action === "update" && next.action === "delete") {
    return {
      action: "delete",
      wineId: next.wineId,
      deletedAt: next.deletedAt,
      createdAt: previous.createdAt,
    };
  }

  if (previous.action === "delete" && (next.action === "add" || next.action === "update")) {
    return {
      action: "add",
      wine: next.wine,
      createdAt: previous.createdAt,
    };
  }

  if (previous.action === "delete" && next.action === "delete") {
    return {
      ...previous,
      deletedAt: next.deletedAt || previous.deletedAt,
    };
  }

  return next;
}

async function compactSyncQueue() {
  const queue = await getQueuedActions();
  const compacted = [];
  const indexByWineId = new Map();

  queue.forEach((item) => {
    const wineId = getActionWineId(item);
    if (!wineId) {
      compacted.push(item);
      return;
    }

    const previousIndex = indexByWineId.get(wineId);
    if (previousIndex === undefined) {
      indexByWineId.set(wineId, compacted.length);
      compacted.push(item);
      return;
    }

    const merged = mergeActions(compacted[previousIndex], item);
    if (merged === null) {
      compacted.splice(previousIndex, 1);
      indexByWineId.delete(wineId);
      for (let idx = previousIndex; idx < compacted.length; idx += 1) {
        const id = getActionWineId(compacted[idx]);
        if (id) indexByWineId.set(id, idx);
      }
      return;
    }

    compacted[previousIndex] = merged;
  });

  await replaceQueuedActions(compacted);
}

async function applyQueueToSupabase() {
  const queue = await getQueuedActions();

  for (const item of queue) {
    let synced = false;
    let attempt = 0;

    while (!synced && attempt < 3) {
      try {
        if (item.action === "add") {
          await addWineRemote(item.wine);
        } else if (item.action === "update") {
          await updateWineRemote(item.wine);
        } else if (item.action === "delete") {
          await deleteWineRemote(item.wineId);
          await removeTombstone(item.wineId);
        }
        synced = true;
      } catch {
        attempt += 1;
        if (attempt >= 3) break;
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      }
    }

    if (synced) {
      await removeQueuedAction(item.queueId);
    } else {
      // Stop early if cloud is unstable. Remaining items stay queued.
      await addSyncLog({
        status: "error",
        reason: "queue_retry_exhausted",
        detail: `Action ${item.action} non synchronisee apres 3 tentatives`,
        createdAt: Date.now(),
      });
      return false;
    }
  }

  return true;
}

function pickMostRecent(localWine, remoteWine) {
  const localTs = new Date(localWine.updatedAt).getTime();
  const remoteTs = new Date(remoteWine.updatedAt).getTime();
  return localTs >= remoteTs ? localWine : remoteWine;
}

async function mergeRemoteIntoLocal() {
  const [localWines, remoteRaw] = await Promise.all([
    getAllLocalWines(),
    fetchWinesRemote(),
  ]);

  const remoteWines = remoteRaw.map(normalizeRemoteWine);
  const tombstones = await getAllTombstones();
  const tombstonesById = new Map(tombstones.map((t) => [t.id, t.deletedAt]));

  const map = new Map();
  localWines.forEach((wine) => map.set(wine.id, wine));
  remoteWines.forEach((remoteWine) => {
    const deletedAt = tombstonesById.get(remoteWine.id);
    if (deletedAt) {
      const remoteTs = new Date(remoteWine.updatedAt).getTime();
      const tombstoneTs = new Date(deletedAt).getTime();
      if (tombstoneTs >= remoteTs) {
        return;
      }
      map.set(remoteWine.id, remoteWine);
      tombstonesById.delete(remoteWine.id);
      return;
    }

    const existing = map.get(remoteWine.id);
    if (!existing) {
      map.set(remoteWine.id, remoteWine);
      return;
    }
    map.set(remoteWine.id, pickMostRecent(existing, remoteWine));
  });

  await replaceLocalWines(Array.from(map.values()));
  await Promise.all(Array.from(tombstonesById.keys()).map((id) => removeTombstone(id)));
}

export async function synchronize() {
  if (!navigator.onLine || !hasSupabaseConfig) {
    await addSyncLog({
      status: "skipped",
      reason: "offline_or_not_configured",
      detail: "Synchronisation ignoree (offline ou Supabase absent)",
      createdAt: Date.now(),
    });
    return { success: false, reason: "offline_or_not_configured" };
  }

  try {
    const queueApplied = await applyQueueToSupabase();
    if (!queueApplied) {
      return { success: false, reason: "queue_retry_exhausted" };
    }
    await mergeRemoteIntoLocal();
    await addSyncLog({
      status: "success",
      reason: "ok",
      detail: "Synchronisation reussie",
      createdAt: Date.now(),
    });
    return { success: true };
  } catch (error) {
    if (isAuthError(error)) {
      await addSyncLog({
        status: "error",
        reason: "not_authenticated",
        detail: "Session invalide ou expiree",
        createdAt: Date.now(),
      });
      return { success: false, reason: "not_authenticated" };
    }
    await addSyncLog({
      status: "error",
      reason: "sync_failed",
      detail: String(error?.message || "Erreur inconnue"),
      createdAt: Date.now(),
    });
    return { success: false, reason: "sync_failed" };
  }
}

export async function hasPendingActions() {
  const actions = await getQueuedActions();
  return actions.length > 0;
}

export async function getPendingActionsCount() {
  const actions = await getQueuedActions();
  return actions.length;
}

export async function getSyncHistory(limit = 15) {
  return getRecentSyncLogs(limit);
}
