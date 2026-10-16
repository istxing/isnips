// Local, temporary history. Kept outside the records database and portable backups.
(function (root) {
  const KEY = "clipboardHistory:v1";
  const LIMIT = 99;
  const MAX_BYTES = 1024 * 1024;
  function validText(text) {
    return (
      typeof text === "string" &&
      text.trim().length > 0 &&
      text.length <= MAX_BYTES &&
      new TextEncoder().encode(text).length <= MAX_BYTES
    );
  }
  class ClipboardHistory {
    constructor(
      storage,
      { now = () => Date.now(), id = () => crypto.randomUUID() } = {},
    ) {
      this.storage = storage;
      this.now = now;
      this.id = id;
      this.pending = Promise.resolve();
    }
    enqueue(work) {
      const operation = this.pending.then(work);
      this.pending = operation.catch(() => {});
      return operation;
    }
    async read() {
      const stored = (await this.storage.get(KEY))[KEY];
      if (stored == null) return [];
      if (!Array.isArray(stored))
        throw new Error("Clipboard history is unreadable");
      return stored
        .filter(
          (item) => item && typeof item.id === "string" && validText(item.text),
        )
        .slice(0, LIMIT);
    }
    async getHistory() {
      await this.pending;
      return this.read();
    }
    write(items) {
      return this.storage.set({ [KEY]: items });
    }
    capture(data) {
      return this.enqueue(async () => {
        if (!validText(data?.text)) return { success: true, changed: false };
        const items = await this.read();
        const previous = items.find((item) => item.text === data.text);
        const url = new URL(data.url);
        if (!["http:", "https:", "file:"].includes(url.protocol))
          throw new Error("Unsupported page");
        url.username = "";
        url.password = "";
        const timestamp = this.now();
        const item = {
          id: previous?.id || this.id(),
          type: "clipboard",
          text: data.text,
          url: url.href,
          domain: url.hostname,
          title: String(data.title || "").slice(0, 500),
          copied_at: timestamp,
          created_at: timestamp,
        };
        await this.write(
          [item, ...items.filter((entry) => entry.text !== data.text)].slice(
            0,
            LIMIT,
          ),
        );
        return { success: true, changed: true };
      });
    }
    remove(id) {
      return this.enqueue(async () => {
        const items = await this.read();
        await this.write(items.filter((item) => item.id !== id));
        return { success: true };
      });
    }
    clear() {
      return this.enqueue(async () => {
        await this.write([]);
        return { success: true };
      });
    }
    promote(id, db) {
      return this.enqueue(async () => {
        if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
          throw new Error("Invalid clipboard entry");
        const items = await this.read();
        const item = items.find((entry) => entry.id === id);
        // A stable destination also makes retries safe after the note was saved but history removal failed.
        const noteId = "clipboard-note-" + id;
        let snippet = await db.getSnippetById(noteId);
        if (snippet?.deleted_at != null || snippet?.purged_at != null)
          throw new Error("The saved note is in Trash");
        if (!snippet) {
          if (!item) throw new Error("Clipboard entry no longer exists");
          const result = await db.saveSnippet({
            id: noteId,
            type: "note",
            text: item.text,
            url: item.url,
            domain: item.domain,
            title: item.title,
            created_at: this.now(),
          });
          if (!result.success)
            throw new Error(result.error || "Could not save note");
          snippet = result.snippet;
        }
        await this.write(items.filter((entry) => entry.id !== id));
        return { success: true, snippet };
      });
    }
  }
  root.ClipboardHistory = ClipboardHistory;
  if (typeof module !== "undefined")
    module.exports = { ClipboardHistory, KEY, LIMIT, MAX_BYTES };
})(globalThis);
