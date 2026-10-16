const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Window } = require("happy-dom");
const settle = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
async function run() {
  const window = new Window({ url: "https://sub.example.test/article" });
  const document = window.document;
  document.body.innerHTML = "<p>Before quote after. Another quote here.</p>";
  let blocked = ["example.test"],
    clipboardEnabled,
    clipboardCopies = [],
    failSave = false,
    failSettings = false,
    saved = 0,
    highlightsRead = 0,
    listener;
  const registry = new Map();
  const chrome = {
    runtime: {
      id: "test",
      onMessage: {
        addListener: (fn) => {
          listener = fn;
        },
      },
      sendMessage: async (message) => {
        if (message.action === "getSetting") {
          if (failSettings) throw new Error("Database unavailable");
          return {
            success: true,
            value:
              message.key === "blockedSites"
                ? blocked
                : message.key === "clipboardCaptureEnabled"
                  ? (clipboardEnabled ?? message.defaultValue)
                  : "en",
          };
        }
        if (message.action === "getHighlightsForUrl") {
          highlightsRead++;
          return {
            success: true,
            highlights: [
              { id: "saved", text: "quote", textStart: 28, textEnd: 33 },
            ],
          };
        }
        if (message.action === "captureClipboard") {
          clipboardCopies.push(message.data.text);
          return { success: true };
        }
        if (message.action === "saveSnippet") {
          if (!failSave) saved++;
          return { success: !failSave };
        }
        if (message.action === "storeHighlight") return { success: true };
        throw new Error("Unexpected action");
      },
    },
  };
  const context = vm.createContext({
    window,
    document,
    ClipboardCapture: require("../clipboard-capture"),
    chrome,
    URL,
    crypto,
    CSS: { highlights: registry },
    Highlight: class {
      constructor(range) {
        this.range = range;
      }
    },
    NodeFilter: window.NodeFilter,
    setTimeout: () => {},
    console: { error() {}, warn() {} },
  });
  let source = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");
  source =
    source.slice(0, source.indexOf("// Initialize when DOM is ready")) +
    "\nthis.Content = iSnipsContent;";
  vm.runInContext(source, context);
  const content = new context.Content();
  await settle();
  assert.equal(
    typeof listener,
    "function",
    "Disabled sites still need a listener to re-enable live",
  );
  assert.equal(highlightsRead, 0);
  blocked = [];
  listener({ action: "capturePreferencesChanged" }, { id: "test" });
  await settle();
  assert.ok(registry.has("isnips-highlight-saved"));
  window.getSelection().selectAllChildren(document.querySelector("p"));
  const copyEvent = {
    isTrusted: true,
    defaultPrevented: false,
    target: document.querySelector("p"),
  };
  await content.clipboardCapture.handle(copyEvent);
  assert.equal(clipboardCopies.length, 0, "An unset preference stays off before consent");
  clipboardEnabled = true;
  listener({ action: "capturePreferencesChanged" }, { id: "test" });
  await settle();
  await content.clipboardCapture.handle(copyEvent);
  assert.equal(
    clipboardCopies.length,
    1,
    "An explicitly enabled preference captures webpage copies",
  );
  clipboardEnabled = false;
  listener({ action: "capturePreferencesChanged" }, { id: "test" });
  await settle();
  await content.clipboardCapture.handle(copyEvent);
  assert.equal(
    clipboardCopies.length,
    1,
    "An explicit pause overrides the default",
  );
  clipboardEnabled = true;
  listener({ action: "capturePreferencesChanged" }, { id: "test" });
  await settle();
  await content.clipboardCapture.handle(copyEvent);
  assert.deepEqual(clipboardCopies, [
    "Before quote after. Another quote here.",
    "Before quote after. Another quote here.",
  ]);
  const restored = registry.get("isnips-highlight-saved").range;
  assert.equal(restored.toString(), "quote");
  content.restoreHighlight({ id: "x){}body{display:none}", text: "quote" });
  assert.equal(registry.size, 1, "Imported IDs cannot inject highlight CSS");
  blocked = ["example.test"];
  listener({ action: "capturePreferencesChanged" }, { id: "test" });
  await settle();
  assert.equal(
    registry.size,
    0,
    "Disabling a domain removes highlights immediately",
  );
  assert.equal(document.getElementById("isnips-highlight-styles"), null);
  await content.clipboardCapture.handle(copyEvent);
  assert.equal(
    clipboardCopies.length,
    2,
    "Disabled sites cannot enter clipboard history",
  );
  window.getSelection().selectAllChildren(document.querySelector("p"));
  await content.handleCapture();
  assert.equal(saved, 0);
  blocked = [];
  failSave = true;
  await content.handleCapture();
  assert.equal(
    registry.size,
    0,
    "Failed storage must not produce a saved-looking highlight",
  );
  failSave = false;
  await Promise.all([content.handleCapture(), content.handleCapture()]);
  assert.equal(
    saved,
    1,
    "Repeated shortcuts while saving must not duplicate a clip",
  );
  failSettings = true;
  assert.equal(
    await content.checkIfSiteBlocked(),
    true,
    "Site preferences must fail closed",
  );
  await window.happyDOM.abort();
  console.log(
    "content.test.js: ok (live exclusions, subdomains, range restore, unsafe IDs, duplicate capture, failure)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
