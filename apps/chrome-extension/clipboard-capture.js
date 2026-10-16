// Observe native webpage copy/cut gestures without reading the system clipboard.
(function (root) {
  class ClipboardCapture {
    constructor({ document, window, enabled, onCapture }) {
      this.document = document;
      this.window = window;
      this.enabled = enabled;
      this.onCapture = onCapture;
    }
    start() {
      for (const type of ["copy", "cut"])
        this.document.addEventListener(
          type,
          (event) => {
            void this.handle(event);
          },
          true,
        );
    }
    async handle(event) {
      if (!event.isTrusted || !this.enabled()) return;
      const active = this.document.activeElement;
      const target = event.composedPath?.()[0] || event.target;
      if (
        [active, target].some((element) =>
          element?.matches?.('input[type="password"]'),
        )
      )
        return;
      let selected = "";
      if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) {
        if (
          typeof active.selectionStart !== "number" ||
          typeof active.selectionEnd !== "number"
        )
          return;
        selected = active.value.slice(
          active.selectionStart,
          active.selectionEnd,
        );
      } else selected = this.window.getSelection()?.toString() || "";
      // Wait for all page handlers and the default cut before committing the original selection.
      // A canceled copy may substitute arbitrary content; do not infer what it copied.
      await new Promise((resolve) => this.window.setTimeout(resolve, 0));
      if (!this.enabled()) return;
      if (event.defaultPrevented) return;
      const text = selected;
      if (!text.trim() || text.length > 1024 * 1024) return;
      try {
        await this.onCapture({ text, title: this.document.title });
      } catch {
        /* Copy itself must keep working if extension storage is unavailable. */
      }
    }
  }
  root.ClipboardCapture = ClipboardCapture;
  if (typeof module !== "undefined") module.exports = ClipboardCapture;
})(globalThis);
