// Deduplicate remote/imported IDs before enqueueing IndexedDB reads and writes.
function latestSnippets(snippets) {
  const records = new Map();
  for (const item of snippets) {
    const previous = records.get(item.id);
    if (
      !previous ||
      Number(item.updated_at ?? 0) > Number(previous.updated_at ?? 0)
    )
      records.set(item.id, item);
  }
  return [...records.values()];
}

function mergeSnippets(localSnippets, remoteSnippets, options = {}) {
  const preferRemoteOnTie = options.preferRemoteOnTie !== false;
  const localMap = new Map(latestSnippets(localSnippets).map((s) => [s.id, s]));
  const remoteMap = new Map(
    latestSnippets(remoteSnippets).map((s) => [s.id, s]),
  );
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged = [];
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && remote) {
      const localUpdated = Number(local.updated_at ?? 0);
      const remoteUpdated = Number(remote.updated_at ?? 0);
      if (remoteUpdated > localUpdated) {
        merged.push(remote);
      } else if (remoteUpdated < localUpdated) {
        merged.push(local);
      } else {
        merged.push(preferRemoteOnTie ? remote : local);
      }
    } else if (remote) {
      merged.push(remote);
    } else if (local) {
      merged.push(local);
    }
  }

  return merged;
}

if (typeof module !== "undefined") {
  module.exports = { mergeSnippets, latestSnippets };
}

function spaceRevision(space) {
  return Math.max(
    ...["updated_at", "updatedAt", "createdAt", "deleted_at"].map(
      (key) => Number(space?.[key]) || 0,
    ),
  );
}

function normalizeSyncSpace(space) {
  if (
    !space ||
    typeof space.id !== "string" ||
    !space.id ||
    space.id.length > 1024 ||
    typeof space.name !== "string" ||
    !space.name.trim() ||
    space.name.length > 1000 ||
    /[\u0000-\u001f\u007f]/.test(space.name)
  )
    throw new Error("Invalid folder data");
  for (const key of [
    "createdAt",
    "updated_at",
    "updatedAt",
    "deleted_at",
    "order",
  ]) {
    if (
      space[key] != null &&
      (!Number.isFinite(Number(space[key])) ||
        (key !== "order" && Number(space[key]) < 0))
    )
      throw new Error("Invalid folder date or order");
  }
  // Folder sync never forwards unrelated properties from an imported object.
  return {
    id: space.id,
    name: space.name.trim(),
    createdAt: Number(space.createdAt) || 0,
    updated_at: spaceRevision(space),
    deleted_at: Number(space.deleted_at) || null,
    order: Number(space.order) || 0,
  };
}

function chooseSpace(local, incoming) {
  if (!local) return incoming;
  if (!incoming) return local;
  // Deletion is terminal for a folder ID. Offline renames and old files cannot resurrect it.
  if (Boolean(local.deleted_at) !== Boolean(incoming.deleted_at))
    return incoming.deleted_at ? incoming : local;
  const revision = spaceRevision(incoming) - spaceRevision(local);
  if (revision) return revision > 0 ? incoming : local;
  const stableKey = (space) =>
    JSON.stringify([
      String(space.name || ""),
      Number(space.order) || 0,
      Number(space.createdAt) || 0,
      Number(space.deleted_at) || 0,
    ]);
  return stableKey(incoming) > stableKey(local) ? incoming : local;
}

function latestSpaces(spaces) {
  const values = new Map();
  for (const space of spaces)
    if (space.id !== "inbox")
      values.set(space.id, chooseSpace(values.get(space.id), space));
  return [...values.values()];
}

// Schedule related folder and record changes in one caller-owned IndexedDB transaction.
function upsertSyncData(
  transaction,
  snippets,
  spaces = [],
  onSnippetWrite = () => {},
) {
  const records = transaction.objectStore("snippets"),
    folders = transaction.objectStore("spaces");
  const guard = (callback) => (event) => {
    try {
      callback(event);
    } catch {
      try {
        transaction.abort();
      } catch {}
    }
  };
  const request = folders.getAll();
  request.onsuccess = guard(() => {
    const effectiveFolders = new Map(
      (request.result || [])
        .filter((space) => space.id !== "inbox")
        .map((space) => [space.id, space]),
    );
    for (const remote of latestSpaces(spaces)) {
      const local = effectiveFolders.get(remote.id),
        winner = chooseSpace(local, remote);
      if (winner !== local) {
        folders.put(winner);
        effectiveFolders.set(winner.id, winner);
      }
    }
    const normalizeAssignment = (record) =>
      effectiveFolders.get(record.spaceId)?.deleted_at
        ? { ...record, spaceId: "inbox" }
        : record;
    const values = latestSnippets(snippets);
    function normalizeExistingAssignments() {
      if (![...effectiveFolders.values()].some((space) => space.deleted_at))
        return;
      const cursorRequest = records.openCursor();
      cursorRequest.onsuccess = guard(() => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const original = cursor.value;
        const value = normalizeAssignment(original);
        // Folder deletion changes assignment, not the record's content revision.
        if (value !== original) cursor.update(value);
        cursor.continue();
      });
    }
    let pending = values.length;
    if (!pending) {
      normalizeExistingAssignments();
      return;
    }
    const done = () => {
      if (--pending === 0) normalizeExistingAssignments();
    };
    for (const incoming of values) {
      const read = records.get(incoming.id);
      read.onsuccess = guard(() => {
        const local = read.result;
        const useRemote =
          !local ||
          Number(incoming.updated_at ?? 0) > Number(local.updated_at ?? 0);
        const winner = useRemote ? incoming : local;
        const normalized = normalizeAssignment(winner);
        if (useRemote || normalized !== winner) {
          const write = records.put(normalized);
          write.onsuccess = guard(() => {
            if (useRemote) onSnippetWrite();
            done();
          });
        } else done();
      });
    }
  });
}

if (typeof module !== "undefined")
  Object.assign(module.exports, {
    spaceRevision,
    normalizeSyncSpace,
    chooseSpace,
    latestSpaces,
    upsertSyncData,
  });
