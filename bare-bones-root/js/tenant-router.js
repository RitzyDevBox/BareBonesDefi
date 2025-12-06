// tenant-router.js
(function () {
  const iframe = document.getElementById("tenantFrame");
  if (!iframe) return;

  function updateIframeFromHash() {
    const hash = window.location.hash || "";
    const path = hash.slice(1); // remove "#"

    const match = path.match(/^\/tenant(\/.*)?$/);

    if (match) {
      const route = match[1] || "/";
      iframe.src = `http://localhost:5173${route}`;
    }
    // else do nothing → keep whatever iframe.src already is
  }

  // Run once at startup
  updateIframeFromHash();

  // Update whenever hash changes
  window.addEventListener("hashchange", updateIframeFromHash);
})();
