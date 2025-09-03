// src/client/ui/Scoreboard.ts
export type ServerSide = "left" | "right";

export type DomScoreboardAPI = {
  setPoints: (left: number, right: number) => void;
  setServer: (side: ServerSide) => void;  
  setDeuce: (flag: boolean) => void;
  setPlayerNames: (left: string, right: string) => void;
  attachToCanvas: (canvas: HTMLCanvasElement) => void; // rebind overlay to canvas bounds
  dispose: () => void;
};

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

function injectStylesOnce() {
  if (document.getElementById("pong-hud-styles")) return;
  const css = `
  @keyframes score-pop   { 0% { transform: translateZ(0) scale(1); } 40% { transform: translateZ(0) scale(1.25); } 100% { transform: translateZ(0) scale(1); } }
  @keyframes score-flip  { 0% { transform: rotateX(0); } 50% { transform: rotateX(90deg); } 100% { transform: rotateX(0); } }
  .score-pop { animation: score-pop .35s ease-out; }
  .score-flip { animation: score-flip .35s ease-in; transform-style: preserve-3d; perspective: 800px; }
  `;
  const style = document.createElement("style");
  style.id = "pong-hud-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Minimal DOM/Tailwind scoreboard HUD
 * - Only score flip/pop is animated.
 * - Gradient outer frame (cyan → sky → fuchsia), simple glass inner card.
 * - If #pong-hud-root exists, it uses it; otherwise creates a fixed root.
 * - Call `attachToCanvas(canvas)` so the HUD follows a non-fullscreen canvas.
 */
export function createScoreboard(): DomScoreboardAPI {
  injectStylesOnce();

  // Root spanning viewport (clips to canvas via overlay rect)
  const existingRoot = document.getElementById(
    "pong-hud-root",
  ) as HTMLDivElement | null;
  const root =
    existingRoot ?? createEl("div", "pointer-events-none fixed inset-0 z-50");
  if (!existingRoot) document.body.appendChild(root);

  // Movable overlay matching canvas bounds
  const overlay = createEl("div", "pointer-events-none absolute inset-0");
  root.appendChild(overlay);

  // ====== Gradient Frame (outer) + Glass Card (inner)
  const outer = createEl(
    "div",
    [
      "relative mx-auto mt-4 w-[64%] max-w-[1120px] min-w-[420px]",
      "rounded-3xl p-[2px]",
      "bg-gradient-to-r from-cyan-300/70 via-sky-400/60 to-fuchsia-400/70",
      "shadow-[0_0_0_1px_rgba(110,205,255,0.18),0_12px_40px_rgba(0,0,0,0.45)]",
    ].join(" "),
  );

  const glass = createEl(
    "div",
    [
      "rounded-[calc(theme(borderRadius.3xl)-2px)]",
      "border border-white/10",
      "bg-slate-900/60 backdrop-blur-md",
      "px-4",
    ].join(" "),
  );
  outer.appendChild(glass);

  // ====== Grid content
  // Layout: [name (1fr) | score (90) | center divider | score (90) | name (1fr)]
  const grid = createEl(
    "div",
    "grid grid-cols-[1fr_90px_32px_90px_1fr] items-center h-[82px]",
  );

  // Left name
  const leftWrap = createEl("div", "pl-4 pr-3");
  const leftName = createEl(
    "div",
    "truncate text-[18px] font-semibold text-slate-200/90 tracking-wide select-none",
    "to0nsa.dev",
  );
  leftWrap.appendChild(leftName);

  // Left score (flip/pop on change)
  const leftScore = createEl(
    "div",
    "text-[42px] font-black text-white text-center select-none will-change-transform",
    "0",
  );

  // Center divider + blue orb
  const center = createEl("div", "relative flex items-center justify-center");
  const divider = createEl(
    "div",
    "h-[60%] w-[3px] rounded-full bg-gradient-to-b from-cyan-300/80 via-cyan-200/40 to-transparent",
  );
  center.appendChild(divider);

  const orb = createEl(
    "div",
    [
      "absolute w-[10px] h-[10px] rounded-full",
      "bg-cyan-300/80",
      "shadow-[0_0_12px_2px_rgba(56,189,248,.55)]",
      "pointer-events-none",
    ].join(" "),
  );
  // True center and its own stacking context
  Object.assign(orb.style, {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "10",
    willChange: "transform",
  } as CSSStyleDeclaration);
  center.appendChild(orb);

  // Right score
  const rightScore = createEl(
    "div",
    "text-[42px] font-black text-white text-center select-none will-change-transform",
    "0",
  );

  // Right name
  const rightWrap = createEl("div", "pr-4 pl-3 text-right");
  const rightName = createEl(
    "div",
    "truncate text-[18px] font-semibold text-slate-200/90 tracking-wide select-none",
    "to0nsa.dev",
  );
  rightWrap.appendChild(rightName);

  // Assemble
  grid.appendChild(leftWrap);
  grid.appendChild(leftScore);
  grid.appendChild(center);
  grid.appendChild(rightScore);
  grid.appendChild(rightWrap);
  glass.appendChild(grid);
  overlay.appendChild(outer);

  // ===== Optional DEUCE badge (no animation)
  const deuce = createEl(
    "div",
    [
      "mx-auto mt-3 w-[128px] h-[34px]",
      "rounded-full border border-cyan-300/50",
      "bg-cyan-400/15 text-cyan-100",
      "flex items-center justify-center select-none",
      "font-extrabold text-[14px] tracking-[0.18em]",
      "opacity-0", // show/hide instantly
    ].join(" "),
    "D  E  U  C  E",
  );
  overlay.appendChild(deuce);

  // ===== API bits
  const flipPoint = (el: HTMLElement, value: number) => {
    const next = String((value | 0) < 0 ? 0 : value | 0);
    if (el.textContent === next) return;
    el.classList.remove("score-pop", "score-flip");
    // force reflow to restart animation
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (el as any).offsetHeight;
    el.textContent = next;
    el.classList.add("score-flip", "score-pop");
  };

  const setPoints = (l: number, r: number) => {
    flipPoint(leftScore, l);
    flipPoint(rightScore, r);
  };

  // Serving highlight (static ring on the serving player's name)
  const ringClasses = ["ring-2", "ring-cyan-400/60", "rounded-md"];
  const setServer = (side: ServerSide) => {
    leftWrap.classList.remove(...ringClasses);
    rightWrap.classList.remove(...ringClasses);
    (side === "left" ? leftWrap : rightWrap).classList.add(...ringClasses);
  };

  const setDeuce = (flag: boolean) => {
    deuce.style.opacity = flag ? "1" : "0";
  };

  const setPlayerNames = (l: string, r: string) => {
    leftName.textContent = l;
    rightName.textContent = r;
    leftName.setAttribute("title", l);
    rightName.setAttribute("title", r);
  };

  // Position overlay to match canvas bounds (if canvas is not fullscreen)
  let boundCanvas: HTMLCanvasElement | null = null;
  const syncOverlay = () => {
    if (!boundCanvas) return;
    const rect = boundCanvas.getBoundingClientRect();
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
  };

  const attachToCanvas = (canvas: HTMLCanvasElement) => {
    boundCanvas = canvas;
    syncOverlay();
  };

  const onResize = () => syncOverlay();
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onResize, { passive: true });

  const dispose = () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onResize);
    root.contains(overlay) && root.removeChild(overlay);
    if (!existingRoot && root.parentElement)
      root.parentElement.removeChild(root);
  };

  return {
    setPoints,
    setServer,
    setDeuce,
    setPlayerNames,
    attachToCanvas,
    dispose,
  };
}
