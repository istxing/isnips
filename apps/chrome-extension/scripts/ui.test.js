// Offline DOM simulation; this does not launch or control a browser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Window } = require("happy-dom");
const LibraryData = require("../library-data");
const script = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  for (let i = 0; i < 12; i++)
    await new Promise((resolve) => setImmediate(resolve));
};

async function setup(page, options = {}) {
  const window = new Window({
    url: "https://extension.test/" + page + ".html" + (options.hash || ""),
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  const document = window.document;
  // Debounced search runs on the next timer tick in offline tests.
  const setWindowTimeout = window.setTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) =>
    setWindowTimeout(callback, delay === 250 ? 0 : delay, ...args);
  document.write(
    fs.readFileSync(
      path.join(__dirname, "..", (page === "panel" ? "popup" : page) + ".html"),
      "utf8",
    ),
  );
  document.querySelectorAll("script").forEach((node) => node.remove());
  const state = {
    cards: [],
    spaces: [],
    trash: [],
    history: [],
    settings: { language: options.language || "zh-CN" },
    session: options.session || {},
    calls: [],
    confirms: 0,
    clipboardChoice: "accepted",
    ...options,
  };
  if (options.geometry) {
    // Synthetic geometry exercises placement without claiming browser rendering.
    const geometry = options.geometry,
      computedStyle = window.getComputedStyle.bind(window);
    Object.defineProperty(document.getElementById("libraryGrid"), "clientWidth", {
      get: () => geometry.width,
    });
    Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", {
      get() {
        if (!this.classList.contains("snippet-card")) return 0;
        state.layoutMeasurements = (state.layoutMeasurements || 0) + 1;
        return geometry.heights[this.querySelector(".item-text").textContent];
      },
    });
    window.getComputedStyle = (element) =>
      element.id === "libraryGrid"
        ? {
            gridTemplateColumns: Array(geometry.columns).fill("200px").join(" "),
            columnGap: "12px",
          }
        : computedStyle(element);
    window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
    window.cancelAnimationFrame = (frame) => window.clearTimeout(frame);
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.observed = new Set();
        state.layoutObserver = this;
      }
      observe(element) {
        this.observed.add(element);
      }
      disconnect() {
        this.observed.clear();
      }
    };
  }
  let clipboard = "";
  const incoming = [];
  const storageListeners = [];
  if (options.browser === "brave")
    Object.defineProperty(window.navigator, "brave", {
      value: { isBrave: async () => true },
    });
  if (options.browser === "chrome")
    Object.defineProperty(window.navigator, "userAgentData", {
      value: { brands: [{ brand: "Google Chrome", version: "141" }] },
    });
  Object.defineProperty(window.navigator, "clipboard", {
    value: {
      writeText: async (text) => {
        clipboard = text;
      },
    },
  });
  window.close = () => {
    state.closedPanel = true;
  };
  window.confirm = () => {
    state.confirms++;
    return options.confirm !== false;
  };
  // happy-dom does not implement the native modal top layer; emulate only its open/close API.
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
  window.Option = function (text, value) {
    const option = document.createElement("option");
    option.textContent = text;
    option.value = value;
    return option;
  };
  window.chrome = {
    runtime: {
      getURL: (file) => "https://extension.test/" + file,
      getManifest: () => ({ version: "2.0.0" }),
      openOptionsPage: () => {
        state.openedSettings = true;
      },
      onMessage: { addListener: (listener) => incoming.push(listener) },
      async sendMessage(message) {
        state.calls.push(message);
        if (state.reply) {
          const value = await state.reply(message);
          if (value) return value;
        }
        const { action } = message;
        if (action === "getClipboardConsentStatus") {
          const known = ["accepted", "declined"].includes(state.clipboardChoice);
          return { success: true,
            enabled: state.clipboardChoice === "accepted" && state.settings.clipboardCaptureEnabled !== false,
            consentRequired: state.clipboardChoice !== "accepted",
            needsNotice: !known && state.settings.clipboardCaptureEnabled !== false };
        }
        if (action === "setClipboardConsent") {
          state.clipboardChoice = message.choice;
          state.settings.clipboardCaptureEnabled = message.choice === "accepted";
          window.setTimeout(() => {
            incoming.forEach((listener) => listener({ action: "clipboardConsentChanged" }));
            incoming.forEach((listener) => listener({ action: "clipboardChanged" }));
          }, 0);
          return { success: true };
        }
        if (action === "getGoogleAuthStatus") {
          if (message.browser === "brave")
            state.googleAuth = { ...state.googleAuth, method: "web" };
          return {
            success: true,
            method: "native",
            webConfigured: false,
            connected: false,
            ...(state.googleAuth || {}),
          };
        }
        if (action === "connectGoogleDrive") {
          state.googleAuth = {
            method: state.googleAuth?.method || "native",
            webConfigured: state.googleAuth?.webConfigured || false,
            connected: true,
          };
          return { success: true, ...state.googleAuth };
        }
        if (action === "getSetting")
          return {
            success: true,
            value: state.settings[message.key] ?? message.defaultValue,
          };
        if (action === "setSetting") {
          if (message.key === "syncConfig" && state.settings.syncConfig?.type !== message.value.type)
            state.googleAuth = { ...state.googleAuth, connected: false, needsReconnect: false };
          state.settings[message.key] = message.value;
          return { success: true };
        }
        if (action === "disconnectGoogleDrive") {
          state.settings.syncConfig = { ...state.settings.syncConfig, type: "none" };
          state.googleAuth = { ...state.googleAuth, connected: false, needsReconnect: false };
          return { success: true };
        }
        if (action === "getLibraryPage") {
          const sink = LibraryData.collector(message.query);
          for (const card of [...state.cards, ...state.trash]) sink.add(card);
          return structuredClone(sink.finish());
        }
        if (action === "getSnippet")
          return {
            success: true,
            snippet: structuredClone(
              [...state.cards, ...state.trash].find(
                (card) => card.id === message.cardId,
              ),
            ),
          };
        if (action === "getClipboardEntry")
          return {
            success: true,
            snippet: structuredClone(
              state.history.find((card) => card.id === message.entryId),
            ),
          };
        if (action === "getSpaces")
          return { success: true, spaces: structuredClone(state.spaces) };
        if (action === "createSpace") {
          const space = {
            id: "folder-" + (state.spaces.length + 1),
            name: message.name,
          };
          state.spaces.push(space);
          return { success: true, space };
        }
        if (action === "updateSpace") {
          const space = state.spaces.find(
            (space) => space.id === message.spaceId,
          );
          space.name = message.name;
          return { success: true, space };
        }
        if (action === "deleteSpace") {
          state.spaces = state.spaces.filter(
            (space) => space.id !== message.spaceId,
          );
          for (const card of [...state.cards, ...state.trash])
            if (card.spaceId === message.spaceId) card.spaceId = "inbox";
          return { success: true };
        }
        if (action === "moveSnippet") {
          state.cards.find((card) => card.id === message.cardId).spaceId =
            message.spaceId;
          return { success: true };
        }
        if (action === "getSnippets")
          return { success: true, cards: structuredClone(state.cards) };
        if (action === "getDeletedSnippets")
          return { success: true, cards: structuredClone(state.trash) };
        if (action === "getClipboardHistory")
          return {
            success: true,
            items: structuredClone(
              message.preview
                ? state.history
                    .filter(
                      (card) =>
                        !message.search ||
                        [card.text, card.domain, card.title, card.url].some(
                          (value) =>
                            String(value || "")
                              .toLowerCase()
                              .includes(message.search),
                        ),
                    )
                    .map((card) => ({
                      ...LibraryData.preview(card),
                      copied_at: card.copied_at,
                    }))
                : state.history,
            ),
            totalCount: state.history.length,
            enabled: state.clipboardChoice === "accepted" && state.settings.clipboardCaptureEnabled !== false,
          };
        if (action === "deleteClipboardEntry") {
          state.history = state.history.filter(
            (item) => item.id !== message.entryId,
          );
          return { success: true };
        }
        if (action === "clearClipboardHistory") {
          state.history = [];
          return { success: true };
        }
        if (action === "promoteClipboardEntry") {
          const entry = state.history.find(
            (item) => item.id === message.entryId,
          );
          state.cards.push({
            ...entry,
            id: "note-" + entry.id,
            type: "note",
            copied_at: undefined,
            created_at: Date.now(),
            updated_at: Date.now(),
          });
          state.history = state.history.filter(
            (item) => item.id !== message.entryId,
          );
          return { success: true };
        }
        if (action === "listBackupSnapshots")
          return { success: true, snapshots: state.snapshots || [] };
        if (action === "saveSnippet") {
          state.cards.push({
            ...message.data,
            id: "new",
            updated_at: Date.now(),
          });
          return { success: true };
        }
        if (action === "updateSnippet") {
          Object.assign(
            state.cards.find((c) => c.id === message.cardId),
            message.updates,
          );
          return { success: true };
        }
        if (action === "softDeleteSnippet") {
          const card = state.cards.find((c) => c.id === message.cardId);
          state.cards = state.cards.filter((c) => c.id !== message.cardId);
          state.trash.push({ ...card, deleted_at: Date.now() });
          return { success: true };
        }
        if (action === "restoreSnippet") {
          const card = state.trash.find((c) => c.id === message.cardId);
          state.trash = state.trash.filter((c) => c.id !== message.cardId);
          state.cards.push({ ...card, deleted_at: null });
          return { success: true };
        }
        throw new Error("Unhandled action: " + action);
      },
    },
    tabs: {
      query: async () => [{ url: "https://example.test/article" }],
      create: async ({ url }) => {
        (state.openedTabs ||= []).push(url);
      },
    },
    commands: { getAll: async () => [] },
    storage: {
      onChanged: { addListener: (listener) => storageListeners.push(listener) },
      session: {
        get: async (key) => ({ [key]: state.session[key] }),
        set: async (values) => {
          if (state.sessionError) throw new Error(state.sessionError);
          if (state.sessionWrite) await state.sessionWrite();
          return Object.assign(state.session, values);
        },
      },
    },
  };
  if (page === "settings")
    window.eval(fs.readFileSync(path.join(__dirname, "../google-auth.js"), "utf8"));
  window.eval(script);
  document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await settle();
  return {
    window,
    document,
    state,
    clipboard: () => clipboard,
    receive: (message) => incoming.forEach((listener) => listener(message)),
    storageChanged: (changes) =>
      storageListeners.forEach((listener) => listener(changes, "local")),
    dispose: () => window.happyDOM.abort(),
  };
}
async function run() {
  let ui = await setup("library", {
    cards: Array.from({ length: 405 }, (_, i) => ({
      id: String(i),
      text:
        i === 0
          ? "<img src=x onerror=alert(1)>\n" + "Long text ".repeat(200)
          : "Item " + i,
      type: "note",
      created_at:
        new Date(2026, 9, 8, 12).getTime() -
        Math.floor(i / 45) * 86400000 -
        i * 1000,
      updated_at: Date.now() + i,
    })),
  });
  const { document, state, window } = ui;
  assert.equal(
    document.getElementById("libraryGrid").style.getPropertyValue("--columns"),
    "5",
  );
  ui.storageChanged({ columnCount: { newValue: 7 } });
  assert.equal(
    document.getElementById("libraryGrid").style.getPropertyValue("--columns"),
    "7",
  );
  ui.storageChanged({ columnCount: { newValue: 2 } });
  assert.equal(
    document.getElementById("libraryGrid").style.getPropertyValue("--columns"),
    "3",
  );
  ui.storageChanged({ columnCount: {} });
  assert.equal(
    document.getElementById("libraryGrid").style.getPropertyValue("--columns"),
    "5",
  );
  assert.equal(document.getElementById("newNote").textContent.trim(), "闪记");
  assert.equal(document.querySelectorAll(".snippet-card").length, 200);
  assert.equal(document.querySelectorAll(".date-group, .date-group-title").length, 0);
  assert.equal(document.querySelectorAll("#libraryGrid > .snippet-card").length, 200);
  assert.equal(document.getElementById("pageStatus").textContent, "第 1 / 3 页");
  assert.equal(document.querySelector('[data-library-view="all"]').textContent, "汇总");
  assert.equal(document.querySelector(".item-date").textContent, "2026/10/8");
  assert.equal(
    document.querySelectorAll(".snippet-card img").length,
    0,
    "Record content must remain plain text",
  );
  document.getElementById("loadMore").click();
  await settle();
  assert.equal(document.querySelectorAll(".snippet-card").length, 200);
  assert.equal(document.querySelector(".item-text").textContent, "Item 200");
  assert.equal(document.querySelector(".item-date").textContent, "2026/10/4");
  const pageCalls = state.calls.filter((call) => call.action === "getLibraryPage").length;
  document.querySelector('[data-library-view="day"]').click();
  await settle();
  assert.equal(document.getElementById("pageStatus").textContent, "第 2 / 3 页");
  assert.equal(document.querySelector(".date-group-title time").dateTime, "2026-10-04");
  assert.equal(document.querySelectorAll(".snippet-card").length, 200);
  assert.equal(state.calls.filter((call) => call.action === "getLibraryPage").length, pageCalls,
    "Changing presentation only rearranges the bounded current page");
  document.querySelector('[data-library-view="all"]').click();
  await settle();
  document.getElementById("loadMore").click();
  await settle();
  assert.equal(document.querySelectorAll(".snippet-card").length, 5);
  document.getElementById("previousPage").click();
  await settle();
  document.getElementById("previousPage").click();
  await settle();
  assert.equal(document.querySelectorAll(".snippet-card").length, 200);
  assert.equal(
    state.calls.some((message) =>
      ["getSnippets", "getDeletedSnippets"].includes(message.action),
    ),
    false,
    "Library browsing never requests all record bodies",
  );
  document.querySelector(".item-text").click();
  await settle();
  assert.equal(
    document.querySelector(".reader-content").textContent,
    state.cards[0].text,
  );
  assert.ok(document.querySelector(".reader-dialog[open]"));
  document.querySelector(".reader-dialog .icon-button").click();
  assert.equal(document.querySelector(".reader-dialog"), null);
  document.querySelector(".card-action.danger").click();
  await settle();
  assert.equal(
    state.confirms,
    0,
    "Trash is reversible and must not ask for confirmation",
  );
  assert.equal(state.trash.length, 1);
  document.querySelector("#toast button").click();
  await settle();
  assert.equal(state.trash.length, 0);
  assert.equal(state.cards.length, 405);
  const sort = document.getElementById("sortSelect");
  sort.value = "old";
  sort.dispatchEvent(new window.Event("change"));
  await settle();
  assert.equal(
    document.querySelector(".item-date").textContent,
    "2026/9/30",
  );
  sort.value = "new";
  sort.dispatchEvent(new window.Event("change"));
  await settle();
  const search = document.getElementById("searchInput");
  search.value = "Item 49";
  search.dispatchEvent(new window.Event("input"));
  await settle();
  assert.equal(document.querySelectorAll(".snippet-card").length, 1);
  assert.equal(
    document.querySelector(".item-date").textContent,
    "2026/10/7",
  );
  search.value = "no match";
  search.dispatchEvent(new window.Event("input"));
  await settle();
  assert.equal(
    document.getElementById("emptyTitle").textContent,
    "没有找到记录",
  );
  assert.equal(document.querySelectorAll(".snippet-card").length, 0);
  assert.equal(document.getElementById("librarySettings").getAttribute("href"), "settings.html");
  assert.equal(document.getElementById("librarySettings").hasAttribute("target"), false);
  document.getElementById("newNote").click();
  const editor = document.getElementById("editorText");
  editor.value = "Keyboard save";
  editor.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
    }),
  );
  await settle();
  assert.ok(state.cards.some((c) => c.text === "Keyboard save"));
  await ui.dispose();

  // Keep local dates in card footers, and use deletion dates in Trash.
  const localMidnight = new Date(2026, 9, 9, 0, 5).getTime();
  ui = await setup("library", {
    cards: [
      {
        id: "midnight",
        text: "Local day",
        type: "note",
        created_at: localMidnight,
        updated_at: localMidnight + 86400000,
      },
      { id: "undated", text: "Old record without dates", type: "note" },
    ],
    trash: [
      {
        id: "trashed",
        text: "Deleted later",
        type: "web",
        created_at: new Date(2026, 8, 1).getTime(),
        deleted_at: new Date(2026, 9, 11, 15).getTime(),
      },
    ],
  });
  assert.equal(
    ui.document.querySelector(".item-date").textContent,
    "2026/10/9",
  );
  assert.equal(
    [...ui.document.querySelectorAll(".item-date")].at(-1).textContent,
    "—",
  );
  ui.document.querySelector('[data-filter="trash"]').click();
  await settle();
  assert.equal(ui.document.querySelectorAll(".snippet-card").length, 1);
  assert.equal(
    ui.document.querySelector(".item-date").textContent,
    "2026/10/11",
  );
  await ui.dispose();

  const groupedCards = [
    { id: "new-year", text: "January record", type: "note", created_at: new Date(2026, 0, 1, 0, 5).getTime(), updated_at: new Date(2026, 2, 1).getTime() },
    { id: "year-end", text: "December record", type: "web", created_at: new Date(2025, 11, 31, 23, 55).getTime() },
    { id: "sunday", text: "Sunday record", type: "note", created_at: new Date(2025, 11, 28, 12).getTime() },
    { id: "undated", text: "Undated record", type: "note" },
  ];
  ui = await setup("library", {
    settings: { language: "zh-CN", libraryGrouping: "day" },
    cards: groupedCards,
    trash: [{ id: "spring-trash", text: "Deleted in spring", type: "note",
      created_at: new Date(2025, 8, 1).getTime(), deleted_at: new Date(2026, 2, 8, 0, 5).getTime() }],
  });
  const groupKeys = () => [...ui.document.querySelectorAll(".date-group-title")]
    .map((heading) => heading.querySelector("time")?.dateTime || "undated");
  assert.deepEqual(groupKeys(), ["2026-01-01", "2025-12-31", "2025-12-28", "undated"]);
  assert.equal(ui.document.querySelector("#date-title-undated").textContent, "日期未知");
  ui.document.querySelector('[data-library-view="week"]').click();
  await settle();
  assert.deepEqual(groupKeys(), ["2025-12-29", "2025-12-22", "undated"]);
  assert.deepEqual([...ui.document.querySelectorAll(".date-group")].map((group) => group.querySelectorAll(".snippet-card").length), [2, 1, 1]);
  assert.deepEqual([...ui.document.querySelectorAll(".date-group-title")[0].querySelectorAll("time")].map((time) => time.dateTime), ["2025-12-29", "2026-01-04"]);
  ui.document.querySelector('[data-library-view="month"]').click();
  await settle();
  assert.deepEqual(groupKeys(), ["2026-01", "2025-12", "undated"]);
  assert.equal(ui.document.querySelector(".date-group-title").textContent, "2026年1月");
  assert.equal(ui.state.settings.libraryGrouping, "month");
  const rememberedView = await setup("library", { settings: { ...ui.state.settings }, cards: groupedCards });
  assert.equal(rememberedView.document.querySelector('[data-library-view="month"]').getAttribute("aria-pressed"), "true");
  await rememberedView.dispose();
  ui.document.getElementById("sortSelect").value = "old";
  ui.document.getElementById("sortSelect").dispatchEvent(new ui.window.Event("change"));
  await settle();
  assert.deepEqual(groupKeys(), ["2025-12", "2026-01", "undated"]);
  ui.document.querySelector('[data-filter="trash"]').click();
  await settle();
  assert.deepEqual(groupKeys(), ["2026-03"]);
  ui.document.querySelector('[data-library-view="week"]').click();
  await settle();
  assert.deepEqual([...ui.document.querySelectorAll(".date-group-title time")].map((time) => time.dateTime), ["2026-03-02", "2026-03-08"]);
  assert.equal(ui.document.querySelector(".item-date").textContent, "2026/3/8");
  ui.storageChanged({ libraryGrouping: { newValue: "invalid" } });
  assert.equal(ui.document.querySelector('[data-library-view="all"]').getAttribute("aria-pressed"), "true");
  assert.equal(ui.document.querySelectorAll(".date-group").length, 0);
  await ui.dispose();

  const geometry = {
    width: 624,
    columns: 3,
    heights: { A: 120, B: 60, C: 90, D: 70, E: 100 },
  };
  ui = await setup("library", {
    geometry,
    cards: Object.keys(geometry.heights).map((text, i) => ({
      id: text,
      text,
      type: "note",
      created_at: Date.now() - i * 1000,
    })),
  });
  await settle();
  const masonry = ui.document.getElementById("libraryGrid"),
    tiles = [...masonry.children],
    positions = () => tiles.map((tile) => [
      parseFloat(tile.style.getPropertyValue("--masonry-x")),
      parseFloat(tile.style.getPropertyValue("--masonry-y")),
    ]);
  assert.ok(masonry.classList.contains("masonry-ready"));
  assert.equal(masonry.style.getPropertyValue("--masonry-width"), "200px");
  assert.deepEqual(positions(), [[0, 0], [212, 0], [424, 0], [212, 72], [424, 102]]);
  assert.equal(masonry.style.height, "202px");
  assert.deepEqual(tiles.map((tile) => tile.querySelector(".item-text").textContent),
    ["A", "B", "C", "D", "E"], "Masonry preserves the sorted DOM and keyboard order");
  assert.equal(ui.state.layoutObserver.observed.size, 6);

  // A column-setting change must arrange cards even when the container width
  // and observed card heights have not changed yet.
  geometry.width = 412;
  geometry.columns = 2;
  ui.storageChanged({ columnCount: { newValue: 3 } });
  await settle();
  assert.deepEqual(positions(), [[0, 0], [212, 0], [212, 72], [0, 132], [212, 174]]);
  assert.equal(masonry.style.height, "274px");
  geometry.heights.A = 180;
  ui.state.layoutObserver.callback();
  await settle();
  assert.deepEqual(positions(), [[0, 0], [212, 0], [212, 72], [212, 174], [0, 192]]);
  assert.equal(masonry.style.height, "292px");

  // Resize bursts share one frame, including the narrow single-column layout.
  geometry.width = 200;
  geometry.columns = 1;
  const measurements = ui.state.layoutMeasurements;
  for (let i = 0; i < 3; i++) ui.window.dispatchEvent(new ui.window.Event("resize"));
  await settle();
  assert.equal(ui.state.layoutMeasurements - measurements, 5);
  assert.deepEqual(positions(), [[0, 0], [0, 192], [0, 264], [0, 366], [0, 448]]);
  assert.equal(masonry.style.height, "548px");
  ui.document.querySelector('[data-library-view="day"]').click();
  await settle();
  assert.equal(masonry.style.height, "");
  assert.equal(masonry.classList.contains("masonry-ready"), false);
  assert.equal(ui.state.layoutObserver.observed.size, 0);
  ui.document.querySelector('[data-library-view="all"]').click();
  await settle();
  assert.equal(masonry.style.height, "548px");
  assert.equal(ui.state.layoutObserver.observed.size, 6);
  ui.document.querySelector('[data-filter="web"]').click();
  await settle();
  assert.equal(masonry.children.length, 0);
  assert.equal(masonry.style.height, "");
  assert.equal(masonry.classList.contains("masonry-ready"), false);
  assert.equal(ui.state.layoutObserver.observed.size, 0, "Old cards are not retained by the observer");
  await ui.dispose();

  ui = await setup("library", {
    reply: (message) =>
      message.action === "getLibraryPage"
        ? { success: false, error: "Offline" }
        : null,
  });
  assert.equal(
    ui.document.querySelector("#libraryGrid .button").textContent,
    "重试",
  );
  ui.state.reply = null;
  ui.document.querySelector("#libraryGrid .button").click();
  await settle();
  assert.equal(ui.document.querySelector("#libraryGrid .button"), null);
  await ui.dispose();

  ui = await setup("panel", {
    session: {
      panelDraft: { text: "Draft survives reopening", attachPage: false },
    },
  });
  const input = ui.document.getElementById("noteInput");
  assert.equal(input.value, "Draft survives reopening");
  let finish;
  ui.state.reply = (message) =>
    message.action === "saveSnippet"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : null;
  ui.document.getElementById("saveNote").click();
  await settle();
  input.value = "Typed while saving";
  input.dispatchEvent(new ui.window.Event("input"));
  assert.equal(ui.document.getElementById("saveNote").disabled, true);
  finish({ success: true });
  await settle();
  assert.equal(input.value, "Typed while saving");
  assert.equal(ui.state.session.panelDraft.text, "Typed while saving");
  ui.state.reply = (message) =>
    message.action === "saveSnippet"
      ? { success: false, error: "Storage full" }
      : null;
  ui.document.getElementById("saveNote").click();
  await settle();
  assert.equal(
    input.value,
    "Typed while saving",
    "Failed writes must preserve the draft",
  );
  assert.match(ui.document.getElementById("toast").textContent, /Storage full/);
  await ui.dispose();

  ui = await setup("panel", {
    cards: Array.from({ length: 6 }, (_, index) => ({
      id: "note-" + index,
      type: "note",
      text: "Saved note " + index,
      created_at: 100 - index,
    })),
    history: [
      {
        id: "recent-copy",
        type: "clipboard",
        text: "Newest copied text",
        copied_at: 200,
      },
    ],
  });
  assert.equal(ui.document.querySelectorAll(".recent-item").length, 6);
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Saved note 0",
  );
  assert.equal(ui.document.getElementById("panelCount").textContent, "6");
  assert.equal(ui.document.querySelector('[aria-label="转为闪记"]'), null);
  ui.document.getElementById("clipboardTab").click();
  assert.equal(ui.document.querySelectorAll(".recent-item").length, 1);
  assert.equal(ui.document.getElementById("panelCount").textContent, "1");
  let firstCard = ui.document.querySelector(".recent-item");
  const promoteInPanel = firstCard.querySelector(
    '.card-actions [aria-label="转为闪记"]',
  );
  assert.ok(promoteInPanel.querySelector("svg"));
  assert.equal(firstCard.querySelector('[aria-label="编辑"]'), null);
  promoteInPanel.click();
  await settle();
  assert.equal(ui.state.history.length, 0);
  assert.equal(ui.state.cards.length, 7);
  assert.equal(ui.document.querySelector('[aria-label="转为闪记"]'), null);
  ui.document.getElementById("recentTitle").click();
  assert.equal(ui.document.querySelectorAll(".recent-item").length, 7);
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Newest copied text",
    "Only conversion adds copied text to Recent",
  );
  ui.state.history = [
    {
      id: "later-copy",
      type: "clipboard",
      text: "Another live copy",
      copied_at: 300,
    },
  ];
  ui.receive({ action: "clipboardChanged" });
  await settle();
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Newest copied text",
    "New clipboard events do not enter Recent",
  );
  ui.document.getElementById("clipboardTab").click();
  firstCard = ui.document.querySelector(".recent-item");
  assert.equal(
    firstCard.querySelector(".item-text-content").textContent,
    "Another live copy",
  );
  firstCard.querySelector('[aria-label="删除"]').click();
  await settle();
  assert.equal(ui.state.history.length, 0);
  assert.equal(ui.state.cards.length, 7);
  assert.equal(ui.state.trash.length, 0);
  const close = ui.document.getElementById("closePanel"),
    draft = ui.document.getElementById("noteInput");
  assert.equal(close.getAttribute("aria-label"), "关闭");
  draft.value = "Keep the draft before closing";
  draft.dispatchEvent(new ui.window.Event("input"));
  await settle();
  let finishSessionWrite;
  ui.state.sessionWrite = () =>
    new Promise((resolve) => {
      finishSessionWrite = resolve;
    });
  close.click();
  await settle();
  assert.equal(
    ui.state.closedPanel,
    undefined,
    "Close waits for the draft to persist",
  );
  assert.equal(draft.disabled, true);
  finishSessionWrite();
  await settle();
  assert.equal(ui.state.closedPanel, true);
  assert.equal(
    ui.state.session.panelDraft.text,
    "Keep the draft before closing",
  );
  await ui.dispose();
  ui = await setup("panel", {
    reply: (message) =>
      message.action === "getClipboardHistory"
        ? { success: false, error: "History unavailable" }
        : null,
    cards: [{ id: "keep", type: "note", text: "Keep saved records visible" }],
  });
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Keep saved records visible",
  );
  assert.equal(
    ui.document.getElementById("recentList").textContent.includes("重试"),
    false,
    "Clipboard failures do not affect Recent",
  );
  ui.document.getElementById("clipboardTab").click();
  assert.ok(
    ui.document.getElementById("recentList").textContent.includes("重试"),
  );
  ui.state.sessionError = "Draft storage unavailable";
  ui.document.getElementById("noteInput").value = "Unsaved draft";
  ui.document.getElementById("closePanel").click();
  await settle();
  assert.equal(ui.state.closedPanel, undefined);
  assert.equal(ui.document.getElementById("noteInput").disabled, false);
  assert.match(
    ui.document.getElementById("toast").textContent,
    /Draft storage unavailable/,
  );
  await ui.dispose();

  ui = await setup("panel", {
    cards: Array.from({ length: 14 }, (_, i) => ({
      id: "saved-" + i,
      type: "note",
      text: "Saved " + i,
      created_at: 200 - i,
    })),
    history: Array.from({ length: 12 }, (_, i) => ({
      id: "copy-" + i,
      type: "clipboard",
      text: "Copied " + i,
      copied_at: 400 - i,
    })),
  });
  const recentTab = ui.document.getElementById("recentTitle"),
    clipboardTab = ui.document.getElementById("clipboardTab"),
    panelList = ui.document.getElementById("recentList");
  assert.equal(
    ui.document.querySelector('[data-i18n="to_clip"]').textContent,
    "记录",
  );
  assert.equal(ui.document.querySelectorAll(".recent-item").length, 10);
  assert.equal(ui.document.getElementById("panelCount").textContent, "14");
  assert.equal(ui.document.getElementById("viewAll").textContent.trim(), "查看全部");
  assert.equal(ui.document.getElementById("viewAllBottom").textContent.trim(), "查看全部");
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Saved 0",
  );
  assert.equal(ui.document.querySelector('[aria-label="转为闪记"]'), null);
  assert.equal(recentTab.getAttribute("aria-selected"), "true");
  assert.equal(clipboardTab.tabIndex, -1);
  ui.document.getElementById("noteInput").value = "Draft stays while switching";
  ui.document
    .getElementById("noteInput")
    .dispatchEvent(new ui.window.Event("input"));
  await settle();
  clipboardTab.click();
  assert.equal(clipboardTab.getAttribute("aria-selected"), "true");
  assert.equal(panelList.getAttribute("aria-labelledby"), "clipboardTab");
  assert.equal(ui.document.getElementById("viewAll").textContent.trim(), "查看全部");
  assert.equal(ui.document.querySelectorAll(".recent-item").length, 10);
  assert.equal(
    ui.document.querySelectorAll('.recent-item [aria-label="编辑"]').length,
    0,
  );
  assert.equal(ui.document.getElementById("panelCount").textContent, "12");
  assert.equal(
    ui.document.getElementById("noteInput").value,
    "Draft stays while switching",
  );
  assert.equal(ui.state.session.panelDraft.text, "Draft stays while switching");
  ui.document.getElementById("viewAllBottom").click();
  assert.equal(
    ui.state.openedTabs.at(-1),
    "https://extension.test/library.html#clipboard",
  );
  panelList.scrollTop = 300;
  clipboardTab.dispatchEvent(
    new ui.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  assert.equal(recentTab.getAttribute("aria-selected"), "true");
  assert.equal(ui.document.activeElement, recentTab);
  assert.equal(panelList.scrollTop, 0);
  recentTab.dispatchEvent(
    new ui.window.KeyboardEvent("keydown", { key: "End", bubbles: true }),
  );
  assert.equal(clipboardTab.getAttribute("aria-selected"), "true");
  ui.state.history.unshift({
    id: "new-live",
    type: "clipboard",
    text: "Live copy in filtered view",
    copied_at: 500,
  });
  ui.receive({ action: "clipboardChanged" });
  await settle();
  assert.equal(
    clipboardTab.getAttribute("aria-selected"),
    "true",
    "Live updates retain the selected list",
  );
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Live copy in filtered view",
  );
  ui.document.querySelector('.recent-item [aria-label="转为闪记"]').click();
  await settle();
  assert.equal(clipboardTab.getAttribute("aria-selected"), "true");
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Copied 0",
  );
  ui.state.history = [];
  ui.receive({ action: "clipboardChanged" });
  await settle();
  assert.equal(panelList.querySelectorAll(".recent-item").length, 0);
  assert.equal(ui.document.getElementById("recentItems").textContent, "暂无剪贴板历史");
  assert.equal(ui.document.getElementById("viewAll").disabled, false);
  clipboardTab.dispatchEvent(
    new ui.window.KeyboardEvent("keydown", { key: "Home", bubbles: true }),
  );
  assert.equal(panelList.querySelectorAll(".recent-item").length, 10);
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Live copy in filtered view",
  );
  ui.document.getElementById("viewAll").click();
  assert.equal(
    ui.state.openedTabs.at(-1),
    "https://extension.test/library.html",
  );
  await ui.dispose();
  ui = await setup("library", {
    hash: "#clipboard",
    history: [{ id: "direct", type: "clipboard", text: "Opened directly" }],
  });
  assert.equal(ui.document.getElementById("pageTitle").textContent, "剪贴板");
  assert.equal(
    ui.document
      .querySelector('[data-filter="clipboard"]')
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Opened directly",
  );
  await ui.dispose();

  for (const page of ["panel", "library"]) {
    ui = await setup(page, {
      cards: [
        { id: "saved", type: "note", text: "Existing note", created_at: 1 },
      ],
      history: [
        {
          id: "read-copy",
          type: "clipboard",
          text: "Read and save this copy",
          url: "https://example.test/article",
          domain: "example.test",
          title: "A long article title",
          copied_at: 2,
        },
      ],
    });
    if (page === "library")
      ui.document.querySelector('[data-filter="clipboard"]').click();
    else ui.document.getElementById("clipboardTab").click();
    await settle();
    const card = ui.document.querySelector(
      page === "panel" ? ".recent-item" : ".snippet-card",
    );
    const link = card.querySelector("a.item-source");
    link.addEventListener("click", (event) => event.preventDefault());
    link.click();
    assert.equal(
      ui.document.querySelector(".reader-dialog"),
      null,
      "Source links must not also open the reader",
    );
    card.querySelector('.card-actions [aria-label="复制"]').click();
    await settle();
    assert.equal(
      ui.document.querySelector(".reader-dialog"),
      null,
      "Card actions must not also open the reader",
    );
    for (const surface of [
      card,
      card.querySelector(".item-meta"),
      card.querySelector(".item-date"),
      card.querySelector(".item-text"),
    ]) {
      surface.click();
      await settle();
      assert.equal(
        ui.document.querySelectorAll(".reader-dialog").length,
        1,
        "Every non-link card surface opens exactly one reader",
      );
      ui.document.querySelector(".reader-dialog .icon-button").click();
    }
    card.click();
    await settle();
    const dismissible = ui.document.querySelector(".reader-dialog");
    // Offline DOM has no layout. Supply geometry to exercise backdrop hit testing.
    dismissible.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 500,
      bottom: 400,
    });
    function pointerDown(x, y, button = 0) {
      dismissible.dispatchEvent(
        new ui.window.PointerEvent("pointerdown", {
          bubbles: true,
          clientX: x,
          clientY: y,
          button,
        }),
      );
    }
    function clickAt(x, y) {
      dismissible.dispatchEvent(
        new ui.window.MouseEvent("click", {
          bubbles: true,
          clientX: x,
          clientY: y,
        }),
      );
    }
    pointerDown(120, 120);
    clickAt(120, 120);
    assert.equal(
      dismissible.open,
      true,
      "Clicking dialog padding keeps it open",
    );
    pointerDown(120, 120);
    clickAt(20, 20);
    assert.equal(
      dismissible.open,
      true,
      "Dragging from inside to the backdrop must not dismiss text being selected",
    );
    pointerDown(20, 20);
    clickAt(120, 120);
    assert.equal(
      dismissible.open,
      true,
      "A gesture ending inside the dialog is not a backdrop click",
    );
    pointerDown(20, 20);
    dismissible.dispatchEvent(
      new ui.window.PointerEvent("pointercancel", { bubbles: true }),
    );
    clickAt(20, 20);
    assert.equal(
      dismissible.open,
      true,
      "Canceled pointers cannot dismiss the reader",
    );
    pointerDown(20, 20, 2);
    clickAt(20, 20);
    assert.equal(
      dismissible.open,
      true,
      "Secondary clicks leave the reader open",
    );
    dismissible.querySelector(".reader-content").click();
    assert.equal(dismissible.open, true);
    pointerDown(20, 20);
    clickAt(20, 20);
    assert.equal(
      ui.document.querySelector(".reader-dialog"),
      null,
      "Clicking the backdrop closes and removes the reader",
    );
    card.click();
    await settle();
    const reader = ui.document.querySelector(".reader-dialog"),
      actions = reader.querySelector(".reader-actions");
    assert.deepEqual(
      [...actions.children].map((button) => button.textContent),
      ["复制", "转为闪记"],
    );
    const source = reader.querySelector(".reader-source");
    assert.equal(source.parentElement.className, "reader-footer");
    assert.equal(source.nextElementSibling, actions);
    assert.equal(source.href, "https://example.test/article");
    assert.equal(source.textContent, "example.test");
    actions.children[0].click();
    await settle();
    assert.equal(ui.clipboard(), "Read and save this copy");
    ui.state.reply = (message) =>
      message.action === "promoteClipboardEntry"
        ? { success: false, error: "Save unavailable" }
        : null;
    const promote = actions.children[1];
    promote.click();
    await settle();
    assert.equal(
      reader.hasAttribute("open"),
      true,
      "Failed promotion keeps the full text open for retry",
    );
    assert.equal(promote.disabled, false);
    assert.equal(ui.state.history.length, 1);
    ui.state.reply = null;
    promote.click();
    promote.click();
    await settle();
    assert.equal(ui.document.querySelector(".reader-dialog"), null);
    assert.equal(ui.state.history.length, 0);
    assert.equal(ui.state.cards.length, 2);
    assert.equal(
      ui.state.calls.filter(
        (message) => message.action === "promoteClipboardEntry",
      ).length,
      2,
      "One failed attempt plus one retry, without double-click duplicates",
    );
    await ui.dispose();
  }

  const longBody = "Long original record ".repeat(350);
  ui = await setup("library", {
    cards: [
      { id: "organize", type: "note", text: longBody, created_at: 3 },
      {
        id: "web-source",
        type: "web",
        text: "Web clip",
        url: "https://example.test",
        created_at: 2,
      },
    ],
  });
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent.length,
    1000,
  );
  assert.equal(
    ui.state.calls.some((message) => message.action === "getSnippet"),
    false,
  );
  ui.document.querySelector('.snippet-card [aria-label="复制"]').click();
  await settle();
  assert.equal(
    ui.clipboard(),
    longBody,
    "Copy always reads the full stored body",
  );
  ui.document.querySelector('.snippet-card [aria-label="编辑"]').click();
  await settle();
  assert.equal(ui.document.getElementById("editorText").value, longBody);
  ui.document.getElementById("editorText").value += " Edited";
  ui.document
    .getElementById("editorForm")
    .dispatchEvent(
      new ui.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await settle();
  assert.equal(
    ui.state.cards.find((card) => card.id === "organize").text,
    longBody + " Edited",
    "Editing a preview cannot truncate the record",
  );
  ui.document.getElementById("createFolder").click();
  ui.document.getElementById("folderName").value = "Project";
  ui.document
    .getElementById("folderEditorForm")
    .dispatchEvent(
      new ui.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await settle();
  assert.equal(ui.document.getElementById("pageTitle").textContent, "Project");
  assert.equal(ui.document.querySelectorAll(".snippet-card").length, 0);
  ui.document.getElementById("newNote").click();
  assert.equal(ui.document.getElementById("editorFolder").value, "folder-1");
  ui.document.getElementById("editorText").value = "Filed note";
  ui.document
    .getElementById("editorForm")
    .dispatchEvent(
      new ui.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await settle();
  assert.equal(
    ui.state.cards.find((card) => card.text === "Filed note").spaceId,
    "folder-1",
  );
  ui.document.querySelector(".folder-manage").click();
  ui.document.getElementById("folderName").value = "Work";
  ui.document
    .getElementById("folderEditorForm")
    .dispatchEvent(
      new ui.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await settle();
  assert.equal(ui.document.getElementById("pageTitle").textContent, "Work");
  ui.document.querySelector('[data-filter="all"]').click();
  await settle();
  const originalCard = [...ui.document.querySelectorAll(".snippet-card")].find(
    (card) =>
      card
        .querySelector(".item-text-content")
        .textContent.startsWith("Long original record"),
  );
  originalCard.querySelector('[aria-label="移入文件夹"]').click();
  const moving = ui.document.querySelector("dialog[open]");
  moving.querySelector("select").value = "folder-1";
  moving.querySelector(".button.primary").click();
  await settle();
  assert.equal(
    ui.state.cards.find((card) => card.id === "organize").spaceId,
    "folder-1",
  );
  ui.document.querySelector('[data-filter="folder:folder-1"]').click();
  await settle();
  assert.equal(ui.document.querySelectorAll(".snippet-card").length, 2);
  ui.document.querySelector(".folder-manage").click();
  ui.document.getElementById("deleteFolder").click();
  await settle();
  assert.equal(ui.state.spaces.length, 0);
  assert.equal(ui.state.cards.length, 3);
  assert.equal(
    ui.state.cards.find((card) => card.id === "organize").spaceId,
    "inbox",
  );
  assert.equal(
    ui.state.cards.find((card) => card.id === "organize").text,
    longBody + " Edited",
  );
  assert.equal(ui.document.getElementById("pageTitle").textContent, "全部记录");
  await ui.dispose();

  ui = await setup("settings", {
    browser: "brave",
    settings: { language: "zh-CN", syncConfig: { type: "googledrive" } },
    googleAuth: { method: "native", webConfigured: true, connected: false },
  });
  assert.equal(ui.state.calls.find((message) => message.action === "getGoogleAuthStatus").browser, "brave");
  assert.equal(ui.document.getElementById("driveStatus").textContent, "未连接");
  assert.equal(ui.document.getElementById("connectDrive").textContent.trim(), "连接");
  assert.ok(ui.document.getElementById("disconnectDrive").classList.contains("hidden"));
  assert.equal(ui.document.getElementById("connectDrive").disabled, false);
  let finishConnection;
  ui.state.reply = (message) => message.action === "connectGoogleDrive"
    ? new Promise((resolve) => { finishConnection = resolve; }) : null;
  ui.document.getElementById("connectDrive").click();
  await settle();
  assert.equal(ui.document.getElementById("syncMethod").disabled, true);
  assert.equal(ui.document.getElementById("syncNow").disabled, true);
  ui.document.getElementById("connectDrive").click();
  assert.equal(ui.state.calls.filter((message) => message.action === "connectGoogleDrive").length, 1);
  ui.state.googleAuth.connected = true;
  finishConnection({ success: true });
  ui.state.reply = null;
  await settle();
  assert.equal(
    ui.document.getElementById("driveStatus").textContent,
    "已连接",
  );
  assert.ok(ui.document.getElementById("connectDrive").classList.contains("hidden"));
  assert.equal(ui.document.getElementById("disconnectDrive").classList.contains("hidden"), false);
  const syncMethod = ui.document.getElementById("syncMethod");
  syncMethod.value = "none";
  syncMethod.dispatchEvent(new ui.window.Event("change"));
  await settle();
  assert.ok(ui.document.getElementById("disconnectDrive").classList.contains("hidden"));
  syncMethod.value = "googledrive";
  syncMethod.dispatchEvent(new ui.window.Event("change"));
  await settle();
  assert.equal(ui.document.getElementById("driveStatus").textContent, "未连接");
  assert.equal(ui.document.getElementById("connectDrive").classList.contains("hidden"), false);
  assert.ok(ui.document.getElementById("disconnectDrive").classList.contains("hidden"));
  assert.equal(ui.document.getElementById("driveFields").textContent.includes("Brave"), false);
  ui.document.getElementById("connectDrive").click();
  await settle();
  assert.equal(ui.document.getElementById("driveStatus").textContent, "已连接");
  ui.state.reply = (message) =>
    message.action === "syncGoogleDrive"
      ? message.allowCreate
        ? { success: true, lastSyncTime: Date.now() }
        : {
            success: false,
            code: "AUTH_CREATE_SYNC_REQUIRED",
            error: "No accessible old file",
          }
      : null;
  ui.document.getElementById("syncNow").click();
  await settle();
  assert.equal(ui.state.confirms, 1);
  assert.equal(
    ui.state.calls.filter((message) => message.action === "syncGoogleDrive")
      .length,
    2,
  );
  assert.equal(
    ui.state.calls
      .filter((message) => message.action === "syncGoogleDrive")
      .at(-1).allowCreate,
    true,
  );
  await ui.dispose();

  ui = await setup("settings", {
    browser: "chrome",
    settings: { language: "zh-CN", syncConfig: { type: "googledrive" } },
  });
  assert.equal(ui.state.calls.find((message) => message.action === "getGoogleAuthStatus").browser, "chrome");
  assert.equal(ui.document.getElementById("connectDrive").disabled, false);
  ui.document.getElementById("connectDrive").click();
  await settle();
  assert.equal(ui.state.googleAuth.method, "native");
  assert.equal(ui.document.getElementById("driveStatus").textContent, "已连接");
  ui.document.getElementById("disconnectDrive").click();
  await settle();
  assert.equal(ui.document.getElementById("syncMethod").value, "none");
  assert.ok(ui.document.getElementById("disconnectDrive").classList.contains("hidden"));
  await ui.dispose();

  ui = await setup("settings", {
    confirm: false,
    settings: { language: "zh-CN", syncConfig: { type: "googledrive" } },
    googleAuth: { method: "web", webConfigured: true, connected: true },
    reply: (message) =>
      message.action === "syncGoogleDrive"
        ? {
            success: false,
            code: "AUTH_CREATE_SYNC_REQUIRED",
            error: "Missing library",
          }
        : null,
  });
  ui.document.getElementById("syncNow").click();
  await settle();
  assert.equal(
    ui.state.calls.filter((message) => message.action === "syncGoogleDrive")
      .length,
    1,
    "Declining a new library never repeats sync with creation permission",
  );
  await ui.dispose();
  ui = await setup("settings", {
    settings: { language: "zh-CN", syncConfig: { type: "googledrive" } },
    googleAuth: { method: "web", webConfigured: false, connected: false },
  });
  assert.equal(ui.document.getElementById("connectDrive").disabled, true);
  assert.equal(ui.document.getElementById("syncNow").disabled, true);
  assert.equal(
    ui.document.getElementById("driveStatus").textContent,
    "网页连接尚未配置。",
  );
  await ui.dispose();

  for (const language of ["en", "zh-CN", "ja"]) {
    ui = await setup("settings", { language });
    assert.equal(ui.document.getElementById("backToLibrary").getAttribute("href"), "library.html");
    assert.equal(ui.document.getElementById("backToLibrary").hasAttribute("target"), false);
    assert.ok(
      ui.document.getElementById("syncOptions").classList.contains("hidden"),
    );
    assert.equal(ui.document.querySelectorAll("details[open]").length, 0);
    assert.equal(ui.document.getElementById("columnCount").value, "5");
    const columnSelect = ui.document.getElementById("columnCount");
    columnSelect.value = "7";
    columnSelect.dispatchEvent(new ui.window.Event("change"));
    await settle();
    assert.equal(ui.state.settings.columnCount, 7);
    const reloaded = await setup("library", {
      settings: { ...ui.state.settings },
    });
    assert.equal(
      reloaded.document
        .getElementById("libraryGrid")
        .style.getPropertyValue("--columns"),
      "7",
    );
    await reloaded.dispose();
    assert.ok(ui.document.querySelector('a[href="privacy.html"]'));
    assert.equal(
      ui.document.getElementById("appVersion").textContent,
      "iSnips 2.0.0",
    );
    for (const el of ui.document.querySelectorAll("[data-i18n]"))
      assert.notEqual(
        el.textContent,
        el.dataset.i18n,
        "Translation: " + language + "/" + el.dataset.i18n,
      );
    const oldBackupStatus =
      ui.document.getElementById("lastBackup").textContent;
    const completedAt = Date.UTC(2026, 9, 15, 8, 30);
    ui.state.settings.lastBackupTime = completedAt;
    ui.state.snapshots = [
      { id: "automatic-snapshot", createdAt: completedAt, snippetCount: 2 },
    ];
    ui.receive({
      action: "backupCompleted",
      data: { lastBackupTime: completedAt },
    });
    await settle();
    assert.notEqual(
      ui.document.getElementById("lastBackup").textContent,
      oldBackupStatus,
    );
    assert.equal(
      ui.document.getElementById("backupSelect").value,
      "automatic-snapshot",
    );
    assert.equal(ui.document.getElementById("restoreBackup").disabled, false);
    const service = ui.document.getElementById("syncMethod");
    service.value = "webdav";
    service.dispatchEvent(new ui.window.Event("change"));
    await settle();
    assert.equal(
      ui.document.getElementById("syncOptions").classList.contains("hidden"),
      false,
      JSON.stringify({
        toast: ui.document.getElementById("toast").textContent,
        calls: ui.state.calls.slice(-5),
      }),
    );
    assert.equal(
      ui.document.getElementById("syncNow").disabled,
      true,
      "An unconfigured server cannot sync",
    );
    await ui.dispose();
  }
  ui = await setup("settings", {
    settings: { language: "zh-CN", columnCount: 2 },
  });
  assert.equal(ui.document.getElementById("columnCount").value, "3");
  await ui.dispose();
  ui = await setup("library", {
    history: [
      {
        id: "h1",
        type: "clipboard",
        text: "A temporary copy",
        copied_at: Date.now(),
      },
    ],
  });
  assert.equal(ui.document.getElementById("countAll").textContent, "");
  assert.equal(ui.document.getElementById("countClipboard").textContent, "1");
  ui.document.querySelector('[data-filter="clipboard"]').click();
  await settle();
  assert.equal(ui.document.getElementById("pageTitle").textContent, "剪贴板");
  assert.equal(
    ui.document.getElementById("newNote").classList.contains("hidden"),
    true,
  );
  const toggle = ui.document.getElementById("clipboardAuto");
  assert.equal(toggle.checked, true);
  toggle.checked = false;
  toggle.dispatchEvent(new ui.window.Event("change"));
  await settle();
  assert.equal(ui.state.settings.clipboardCaptureEnabled, false);
  toggle.checked = true;
  toggle.dispatchEvent(new ui.window.Event("change"));
  await settle();
  assert.equal(ui.state.settings.clipboardCaptureEnabled, true);
  assert.equal(
    ui.document.querySelectorAll('.snippet-card [aria-label="编辑"]').length,
    0,
  );
  const promoteIcon = ui.document.querySelector(
    '.snippet-card .card-actions [aria-label="转为闪记"]',
  );
  assert.ok(promoteIcon.querySelector("svg"));
  assert.equal(ui.document.querySelector(".clipboard-promote"), null);
  promoteIcon.click();
  await settle();
  assert.equal(ui.state.history.length, 0);
  assert.equal(ui.state.cards.length, 1);
  assert.equal(
    ui.document.getElementById("emptyTitle").textContent,
    "暂无剪贴板历史",
  );
  ui.document.querySelector('[data-filter="note"]').click();
  await settle();
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "A temporary copy",
  );
  ui.state.history = [
    { id: "h2", type: "clipboard", text: "Next", copied_at: Date.now() },
  ];
  ui.receive({ action: "clipboardChanged" });
  await settle();
  ui.document.querySelector('[data-filter="clipboard"]').click();
  await settle();
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Next",
  );
  ui.document.getElementById("clearClipboard").click();
  await settle();
  assert.equal(ui.state.history.length, 0);
  await ui.dispose();
  ui = await setup("library", {
    cards: [{ id: "kept", type: "note", text: "Durable record" }],
    reply: (message) =>
      message.action === "getClipboardHistory"
        ? { success: false, error: "History unavailable" }
        : null,
  });
  assert.equal(
    ui.document.querySelector(".item-text-content").textContent,
    "Durable record",
  );
  ui.document.querySelector('[data-filter="clipboard"]').click();
  await settle();
  assert.equal(ui.document.getElementById("clipboardAuto").disabled, true);
  assert.ok(
    ui.document.getElementById("libraryGrid").textContent.includes("重试"),
  );
  await ui.dispose();
  for (const language of ["zh-CN", "en", "ja"]) {
    ui = await setup("library", { language, hash: "#clipboard-consent", clipboardChoice: null,
      history: [{ id: "before-upgrade", text: "Existing local history", type: "clipboard" }] });
    const notice = ui.document.getElementById("clipboardConsentDialog");
    assert.ok(notice?.hasAttribute("open"), "Fresh install and upgrade require an explicit choice");
    assert.equal(ui.document.getElementById("clipboardAuto").checked, false);
    assert.equal(ui.document.querySelectorAll(".snippet-card").length, 1, "Upgrade retains existing records");
    assert.equal(notice.querySelector("a").getAttribute("href"), "https://extension.test/privacy.html");
    notice.querySelector(".button.secondary").click();
    await settle();
    assert.equal(ui.state.clipboardChoice, "declined");
    assert.equal(ui.state.settings.clipboardCaptureEnabled, false);
    assert.equal(ui.document.getElementById("clipboardConsentDialog"), null);
    const toggle = ui.document.getElementById("clipboardAuto");
    toggle.checked = true;
    toggle.dispatchEvent(new ui.window.Event("change"));
    await settle();
    assert.equal(toggle.checked, false, "Turning on after declining requires consent again");
    assert.ok(ui.document.getElementById("clipboardConsentDialog"));
    ui.document.querySelector("#clipboardConsentDialog .button.primary").click();
    await settle();
    assert.equal(ui.state.clipboardChoice, "accepted");
    assert.equal(ui.document.getElementById("clipboardAuto").checked, true);
    assert.equal(ui.document.getElementById("clipboardConsentDialog"), null);
    await ui.dispose();
  }
  ui = await setup("panel", { clipboardChoice: null, settings: { clipboardCaptureEnabled: false } });
  assert.equal(ui.document.getElementById("clipboardConsentDialog"), null, "A previously paused user stays paused");
  await ui.dispose();
  ui = await setup("panel", { clipboardChoice: null });
  ui.document.getElementById("clipboardConsentDialog").close();
  assert.equal(ui.state.calls.some((message) => message.action === "setClipboardConsent"), false,
    "Dismissing a notice never implies consent");
  await ui.dispose();
  console.log(
    "ui.test.js: ok (offline DOM: reading, undo, search, 200-item pagination, day/week/month/all views, masonry geometry, draft, failed saves, keyboard, locales, sorting, trash dates)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
