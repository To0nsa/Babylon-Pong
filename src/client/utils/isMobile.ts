// src/shared/utils/Logger.ts
import Logger from "../../shared/utils/Logger";

export function isMobile(): boolean {
  const ctx = "isMobile";

  // Guard for SSR/Node/test environments
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    Logger.warn(
      ctx,
      "Called in a non-browser environment (SSR/Node). Returning false.",
    );
    return false;
  }

  const ua: string = navigator.userAgent || "";

  // 1) Classic UA sniffing
  const isMobileUA: boolean = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);

  // 2) Viewport heuristic (phones + small tablets)
  const isSmallHighDPI: boolean =
    window.innerWidth <= 812 && (window.devicePixelRatio || 1) > 1;

  // 3) Pointer heuristic (covers tablets & hybrids with touch input)
  const isTouchDevice: boolean =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  const result = isMobileUA || isSmallHighDPI || isTouchDevice;

  Logger.debug(ctx, {
    ua,
    isMobileUA,
    innerWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
    isSmallHighDPI,
    isTouchDevice,
    result,
  });

  Logger.info(ctx, "Result:", result);

  return result;
}
