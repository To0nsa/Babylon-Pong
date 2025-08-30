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

  // classic user-agent sniffing
  const isMobileUA: boolean = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  Logger.debug(ctx, "User agent:", ua, "| isMobileUA:", isMobileUA);

  // viewport heuristic (small width + high pixel density)
  const isSmallHighDPI: boolean =
    window.innerWidth <= 812 && (window.devicePixelRatio || 1) > 1;
  Logger.debug(
    ctx,
    "innerWidth:",
    window.innerWidth,
    "devicePixelRatio:",
    window.devicePixelRatio,
    "| isSmallHighDPI:",
    isSmallHighDPI,
  );

  const result = isMobileUA || isSmallHighDPI;
  Logger.info(ctx, "Result:", result);

  return result;
}
