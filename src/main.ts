import { bootstrapPong } from "@app/host/dom-embed";

// ——— 1) Minimal error overlay ———
function showErrorOverlay(text: string) {
  const box = document.createElement("div");
  box.setAttribute("role", "alert");
  box.setAttribute("aria-live", "assertive");
  box.style.cssText =
    "position:fixed;inset:0;display:grid;place-items:center;z-index:99999;" +
    "background:rgba(0,0,0,.35);backdrop-filter:saturate(1.2) blur(1px)";
  const card = document.createElement("div");
  card.style.cssText =
    "max-width:520px;padding:16px 18px;border-radius:14px;" +
    "background:#111;color:#eee;font:14px system-ui,Segoe UI,Roboto,Ubuntu;" +
    "box-shadow:0 8px 30px rgba(0,0,0,.35)";
  card.innerHTML = `
    <strong style="display:block;margin-bottom:8px">Pong failed to start</strong>
    <div style="opacity:.9;white-space:pre-wrap">${text}</div>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
      <button id="pong-overlay-dismiss"
        style="padding:6px 10px;border:0;border-radius:10px;background:#2a2a2a;color:#eee;cursor:pointer">
        Dismiss
      </button>
    </div>`;
  box.appendChild(card);
  document.body.appendChild(box);
  document
    .getElementById("pong-overlay-dismiss")
    ?.addEventListener("click", () => box.remove());
}

// ——— 2) Global safety nets ———
window.addEventListener("error", (e) => {
  console.error(
    "[Pong] Uncaught error:",
    (e as ErrorEvent).error || e.message,
    e,
  );
  showErrorOverlay(
    String((e as ErrorEvent).error?.message || e.message || "Unexpected error"),
  );
});
window.addEventListener("unhandledrejection", (e) => {
  console.error(
    "[Pong] Unhandled rejection:",
    (e as PromiseRejectionEvent).reason,
    e,
  );
  showErrorOverlay(
    String(
      (e as PromiseRejectionEvent).reason?.message ||
        (e as PromiseRejectionEvent).reason ||
        "Unexpected async error",
    ),
  );
});

// ——— 3) Defensive initialization ———
(async () => {
  try {
    const el = document.getElementById("pong");
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error("Missing <canvas id='pong'> or wrong element type.");
    }

    // New API: boot via host bootstrap (replaces createPong(...).start())
    const app = await bootstrapPong(el);
    window.addEventListener("beforeunload", () => app.destroy());
  } catch (err) {
    console.error("[Pong] Startup failed:", err);
    showErrorOverlay(String(err instanceof Error ? err.message : err));
  }
})();
