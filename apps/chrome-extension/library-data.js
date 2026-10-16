// Bounded browsing projections. Full record bodies are fetched only for explicit actions.
(function (root) {
  const PAGE_SIZE = 200,
    PREVIEW_LENGTH = 1000;
  const queries = new Map();
  function timestamp(card, trash) {
    const raw = trash ? card.deleted_at : (card.created_at ?? card.updated_at);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime())
      ? value
      : null;
  }
  function compare(a, b, sort) {
    if (a.time == null && b.time != null) return 1;
    if (b.time == null && a.time != null) return -1;
    const time =
      a.time == null ? 0 : (a.time - b.time) * (sort === "old" ? 1 : -1);
    return time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }
  function shortCopy(value, length) {
    // Copy code units into a short string; a sliced preview must not retain its large parent body.
    return String(value || "")
      .slice(0, length)
      .split("")
      .join("");
  }
  function preview(card) {
    const value = {
      id: card.id,
      type: card.type,
      text: shortCopy(card.text, PREVIEW_LENGTH),
      preview: true,
    };
    for (const key of ["domain", "title"])
      value[key] =
        typeof card[key] === "string" ? shortCopy(card[key], 500) : null;
    value.spaceId = typeof card.spaceId === "string" ? card.spaceId : null;
    value.url =
      typeof card.url === "string" && card.url.length <= 4096 ? card.url : null;
    for (const key of ["created_at", "updated_at", "deleted_at"])
      value[key] = card[key] ?? null;
    return value;
  }
  function collector(options = {}) {
    const limit = options.limit ?? PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE)
      throw new Error("Invalid page size");
    const filter = options.filter || "all",
      sort = options.sort === "old" ? "old" : "new";
    if (!["all", "web", "note", "trash", "folder"].includes(filter))
      throw new Error("Invalid library filter");
    const after = options.after;
    if (
      after &&
      (typeof after.id !== "string" ||
        (after.time !== null && !Number.isFinite(after.time)))
    )
      throw new Error("Invalid page cursor");
    const search = String(options.search || "")
      .trim()
      .toLowerCase()
      .slice(0, 200);
    const counts = { all: 0, web: 0, note: 0, trash: 0 },
      folderCounts = Object.create(null);
    const candidates = [];
    let matchCount = 0;
    return {
      get retained() {
        return candidates.length;
      },
      add(card) {
        if (!card || card.purged_at || typeof card.id !== "string") return;
        const trash = Boolean(card.deleted_at),
          web = ["web", "clip"].includes(card.type);
        if (trash) counts.trash++;
        else {
          counts.all++;
          counts[web ? "web" : "note"]++;
          const folder = card.spaceId || "inbox";
          folderCounts[folder] = (folderCounts[folder] || 0) + 1;
        }
        if (filter === "trash" ? !trash : trash) return;
        if ((filter === "web" && !web) || (filter === "note" && web)) return;
        if (
          filter === "folder" &&
          (card.spaceId || "inbox") !== options.spaceId
        )
          return;
        if (
          search &&
          ![card.text, card.domain, card.title, card.url].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search),
          )
        )
          return;
        matchCount++;
        const key = { time: timestamp(card, filter === "trash"), id: card.id };
        if (after && compare(key, after, sort) <= 0) return;
        if (
          candidates.length === limit + 1 &&
          compare(key, candidates.at(-1).key, sort) >= 0
        )
          return;
        let low = 0,
          high = candidates.length;
        while (low < high) {
          const mid = (low + high) >>> 1;
          if (compare(candidates[mid].key, key, sort) < 0) low = mid + 1;
          else high = mid;
        }
        candidates.splice(low, 0, { key, card: preview(card) });
        if (candidates.length > limit + 1) candidates.pop();
      },
      finish() {
        const hasMore = candidates.length > limit;
        const page = candidates.slice(0, limit);
        return {
          success: true,
          cards: page.map((item) => item.card),
          counts,
          folderCounts,
          matchCount,
          hasMore,
          nextCursor: hasMore ? page.at(-1).key : null,
        };
      },
    };
  }
  async function query(database, options = {}) {
    const sink = collector(options);
    const db = await database.initialize();
    const client =
      typeof options.clientId === "string"
        ? options.clientId.slice(0, 100)
        : null;
    if (client) queries.get(client)?.cancel();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["snippets"], "readonly");
      const job = {
        cancel() {
          try {
            transaction.abort();
          } catch {}
        },
      };
      if (client) queries.set(client, job);
      const cleanup = () => {
        if (client && queries.get(client) === job) queries.delete(client);
      };
      transaction.oncomplete = () => {
        cleanup();
        resolve(sink.finish());
      };
      transaction.onabort = transaction.onerror = () => {
        cleanup();
        reject(transaction.error || new Error("Query canceled"));
      };
      const request = transaction.objectStore("snippets").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        try {
          sink.add(cursor.value);
          cursor.continue();
        } catch (error) {
          cleanup();
          reject(error);
          try {
            transaction.abort();
          } catch {}
        }
      };
    });
  }
  const api = { query, collector, preview, PAGE_SIZE, PREVIEW_LENGTH };
  root.LibraryData = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
