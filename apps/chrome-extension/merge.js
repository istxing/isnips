function mergeSnippets(localSnippets, remoteSnippets, options = {}) {
  const preferRemoteOnTie = options.preferRemoteOnTie !== false;
  const localMap = new Map(localSnippets.map(s => [s.id, s]));
  const remoteMap = new Map(remoteSnippets.map(s => [s.id, s]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged = [];
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && remote) {
      const localUpdated = local.updated_at ?? 0;
      const remoteUpdated = remote.updated_at ?? 0;
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

if (typeof module !== 'undefined') {
  module.exports = { mergeSnippets };
}
