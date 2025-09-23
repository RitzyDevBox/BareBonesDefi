// iframe-resize-child.js
(function () {
  window.addEventListener("message", (event) => {
    if (event.data?.type === "resize") {
      const { width, height } = event.data.payload;

      // Update CSS custom properties (preferred way)
      document.documentElement.style.setProperty("--app-width", `${width}px`);
      document.documentElement.style.setProperty("--app-height", `${height}px`);

      // Let body naturally stretch; avoid hardcoding width/height here
    }
  });

  // Signal parent we’re ready (optional handshake)
  window.parent?.postMessage({ type: "child-ready" }, "*");
})();
