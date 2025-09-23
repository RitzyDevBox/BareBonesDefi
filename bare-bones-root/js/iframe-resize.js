// posts the iframe’s rendered size to the child; sizing itself is handled by CSS flex
(function () {
  var frame = document.getElementById("tenantFrame");
  if (!frame) return;

  // set your child origin explicitly in production
  var CHILD_ORIGIN = "http://localhost:5173"; // or "*"

  function postSize() {
    var rect = frame.getBoundingClientRect();
    if (frame.contentWindow) {
      frame.contentWindow.postMessage(
        { type: "resize", payload: { width: rect.width, height: rect.height } },
        CHILD_ORIGIN
      );
    }
  }

  // observe actual element size changes (handles window resize, CSS changes, etc.)
  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(postSize);
    ro.observe(frame);
  } else {
    window.addEventListener("resize", postSize);
  }

  frame.addEventListener("load", postSize);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    postSize();
  } else {
    document.addEventListener("DOMContentLoaded", postSize);
  }
})();
