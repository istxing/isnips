const assert = require("node:assert/strict");
const { Window } = require("happy-dom");
const { ClipboardHistory, KEY, MAX_BYTES } = require("../clipboard");
const ClipboardCapture = require("../clipboard-capture");
async function run() {
  let local = {},
    tick = 1,
    sequence = 0,
    failWrite = false;
  const history = new ClipboardHistory(
    {
      get: async (key) => ({ [key]: structuredClone(local[key]) }),
      set: async (values) => {
        if (failWrite) throw new Error("Storage failed");
        Object.assign(local, structuredClone(values));
      },
    },
    { now: () => tick++, id: () => "entry-" + sequence++ },
  );
  const capture = (text) =>
    history.capture({
      text,
      url: "https://user:secret@example.test/article",
      title: "Article",
    });
  await Promise.all(
    Array.from({ length: 120 }, (_, i) => capture("Text " + i)),
  );
  let items = await history.getHistory();
  assert.equal(items.length, 99);
  assert.equal(items[0].text, "Text 119");
  assert.equal(items[98].text, "Text 21");
  assert.equal(items[0].url, "https://example.test/article");
  const originalId = items[98].id;
  await capture("Text 21");
  items = await history.getHistory();
  assert.equal(items.length, 99);
  assert.equal(items[0].id, originalId);
  assert.ok(items[0].copied_at > items[1].copied_at);
  for (const text of [
    "",
    " \n ",
    "a".repeat(MAX_BYTES + 1),
    "中".repeat(MAX_BYTES / 2),
  ]) {
    assert.equal((await capture(text)).changed, false);
  }
  await capture("  spacing\n\nmatters  ");
  assert.equal((await history.getHistory())[0].text, "  spacing\n\nmatters  ");
  failWrite = true;
  await assert.rejects(capture("unsaved"), /Storage failed/);
  failWrite = false;
  await capture("queue recovers");
  assert.equal((await history.getHistory())[0].text, "queue recovers");
  const notes = new Map();
  let failSave = true;
  const db = {
    getSnippetById: async (id) => notes.get(id) || null,
    saveSnippet: async (snippet) => {
      if (failSave) throw new Error("Note failed");
      assert.equal(notes.has(snippet.id), false);
      notes.set(snippet.id, snippet);
      return { success: true, snippet };
    },
  };
  const id = (await history.getHistory())[0].id;
  await assert.rejects(history.promote(id, db), /Note failed/);
  assert.equal((await history.getHistory())[0].id, id);
  failSave = false;
  failWrite = true;
  await assert.rejects(history.promote(id, db), /Storage failed/);
  assert.equal(notes.size, 1);
  assert.ok((await history.getHistory()).some((item) => item.id === id));
  failWrite = false;
  const saved = await history.promote(id, db);
  assert.equal(saved.snippet.type, "note");
  assert.equal(saved.snippet.text, "queue recovers");
  assert.equal(
    (await history.getHistory()).some((item) => item.id === id),
    false,
  );
  await history.promote(id, db);
  assert.equal(notes.size, 1, "Retries cannot create duplicate notes");
  saved.snippet.deleted_at = 100;
  await assert.rejects(history.promote(id, db), /Trash/);
  await assert.rejects(history.promote("missing", db), /no longer exists/);
  const removeId = (await history.getHistory())[0].id;
  await history.remove(removeId);
  assert.equal(
    (await history.getHistory()).some((item) => item.id === removeId),
    false,
  );
  await history.clear();
  assert.deepEqual(await history.getHistory(), []);
  assert.deepEqual(Object.keys(local), [KEY]);

  // Native event payloads are modeled here; no browser is launched.
  const window = new Window({ url: "https://example.test" }),
    document = window.document;
  document.body.innerHTML =
    '<p>selected page text</p><textarea>before chosen after</textarea><input type="password" value="secret">';
  let enabled = true,
    captured = [];
  const listener = new ClipboardCapture({
    document,
    window,
    enabled: () => enabled,
    onCapture: async (data) => {
      captured.push(data.text);
    },
  });
  const event = {
    isTrusted: true,
    target: document.querySelector("p"),
    defaultPrevented: false,
  };
  window.getSelection().selectAllChildren(document.querySelector("p"));
  await listener.handle(event);
  assert.deepEqual(captured, ["selected page text"]);
  await listener.handle({ ...event, isTrusted: false });
  enabled = false;
  await listener.handle(event);
  enabled = true;
  const canceled = { ...event };
  const pending = listener.handle(canceled);
  canceled.defaultPrevented = true;
  await pending;
  assert.equal(
    captured.length,
    1,
    "Untrusted, disabled and canceled copies are ignored",
  );
  const textarea = document.querySelector("textarea");
  textarea.focus();
  textarea.setSelectionRange(7, 13);
  await listener.handle({ ...event, target: textarea });
  assert.equal(captured[1], "chosen");
  document.querySelector("input").focus();
  await listener.handle({ ...event, target: document.querySelector("input") });
  assert.equal(captured.length, 2, "Password fields are never recorded");
  textarea.focus();
  const inFlight = listener.handle({ ...event, target: textarea });
  enabled = false;
  await inFlight;
  assert.equal(
    captured.length,
    2,
    "Pausing while a copy is pending takes effect",
  );
  await window.happyDOM.abort();
  console.log(
    "clipboard.test.js: ok (99-entry cap, dedupe, concurrency, failures, idempotent promotion, native-copy guards)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
