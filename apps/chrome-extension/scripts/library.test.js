const assert = require("node:assert/strict");
const { IDBFactory, IDBObjectStore } = require("fake-indexeddb");
const LibraryData = require("../library-data");
async function run() {
  const request = new IDBFactory().open("library-v5", 5);
  request.onupgradeneeded = () =>
    request.result.createObjectStore("snippets", { keyPath: "id" });
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = db.transaction("snippets", "readwrite"),
    store = transaction.objectStore("snippets");
  for (let i = 0; i < 1800; i++)
    store.put({
      id: "record-" + String(i).padStart(5, "0"),
      type: i % 2 ? "web" : "note",
      text: "正文".repeat(6000) + (i === 700 ? "needle-after-preview" : ""),
      created_at: Math.floor(i / 3),
      spaceId: i % 3 ? "folder-a" : "inbox",
    });
  store.put({ id: "undated", text: "No dates", type: "note" });
  store.put({
    id: "fallback",
    text: "Updated date fallback",
    type: "note",
    updated_at: 2000,
  });
  store.put({
    id: "trash",
    text: "Deleted",
    type: "note",
    created_at: 100,
    deleted_at: 3000,
    spaceId: "folder-a",
  });
  store.put({
    id: "purged",
    text: "Purged must not return",
    purged_at: 2,
    deleted_at: 1,
  });
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = transaction.onerror = () => reject(transaction.error);
  });
  const database = { initialize: async () => db };
  const originalGetAll = IDBObjectStore.prototype.getAll;
  IDBObjectStore.prototype.getAll = function (...args) {
    if (this.name === "snippets")
      throw new Error("Browsing must not materialize all bodies");
    return originalGetAll.apply(this, args);
  };
  try {
    let page = await LibraryData.query(database, {});
    assert.equal(page.cards.length, 200);
    assert.equal(page.counts.all, 1802);
    assert.equal(page.counts.trash, 1);
    assert.equal(page.folderCounts["folder-a"], 1200);
    assert.equal(page.cards[0].id, "fallback");
    assert.ok(
      page.cards.every((card) => card.preview && card.text.length <= 1000),
    );
    assert.ok(
      JSON.stringify(page).length < 300000,
      "A page contains bounded previews, never full library bodies",
    );
    const ids = new Set();
    let pages = 0,
      after = null;
    do {
      page = await LibraryData.query(database, { after });
      assert.ok(page.cards.length <= 200);
      for (const card of page.cards) {
        assert.equal(
          ids.has(card.id),
          false,
          "Timestamp ties must not duplicate records",
        );
        ids.add(card.id);
      }
      pages++;
      after = page.nextCursor;
    } while (page.hasMore);
    assert.equal(ids.size, 1802);
    assert.equal(pages, 10);
    assert.equal(page.cards.at(-1).id, "undated");
    const ascending = await LibraryData.query(database, { sort: "old" });
    assert.equal(ascending.cards[0].id, "record-00000");
    const search = await LibraryData.query(database, {
      search: "NEEDLE-after-preview",
    });
    assert.equal(search.matchCount, 1);
    assert.equal(search.cards[0].id, "record-00700");
    assert.equal(
      search.cards[0].text.includes("needle"),
      false,
      "Matching scans the body, independent of preview truncation",
    );
    assert.equal(
      (
        await LibraryData.query(database, {
          filter: "folder",
          spaceId: "folder-a",
        })
      ).matchCount,
      1200,
    );
    assert.equal(
      (await LibraryData.query(database, { filter: "web" })).matchCount,
      900,
    );
    assert.equal(
      (await LibraryData.query(database, { filter: "trash" })).cards[0].id,
      "trash",
    );
    const sink = LibraryData.collector({ limit: 10 });
    for (let i = 0; i < 10000; i++) {
      sink.add({
        id: String(i),
        text: "Long content".repeat(1000),
        created_at: i,
      });
      assert.ok(sink.retained <= 11);
    }
    assert.equal(sink.finish().cards.length, 10);
    const fullPage = LibraryData.collector();
    for (let i = 0; i < 1000; i++) {
      fullPage.add({ id: String(i), text: "Body".repeat(2000), created_at: i });
      assert.ok(fullPage.retained <= 201);
    }
    assert.equal(fullPage.finish().cards.length, 200);
    const superseded = LibraryData.query(database, {
      clientId: "same-client",
    }).then(
      () => false,
      () => true,
    );
    const current = LibraryData.query(database, {
      clientId: "same-client",
      search: "Updated date fallback",
    });
    assert.equal(
      await superseded,
      true,
      "Superseded searches release their transaction",
    );
    assert.equal((await current).cards[0].id, "fallback");
    await assert.rejects(
      LibraryData.query(database, { limit: 201 }),
      /page size/,
    );
    await assert.rejects(
      LibraryData.query(database, { after: { time: "bad", id: "x" } }),
      /cursor/,
    );
  } finally {
    IDBObjectStore.prototype.getAll = originalGetAll;
    db.close();
  }
  console.log(
    "library.test.js: ok (v5 streaming cursor, bounded 200-item pages, 10 pages, tie dates, full-body search, filters, cancellation)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
