// src/app/host/dom-embed.ts
// Keep render-only side effects here
import "@client/ui/tailwind.css";
import "@client/babylon-register"; // Babylon component registration

import { createPongApp } from "@app/index";

export async function bootstrapPong(canvas: HTMLCanvasElement) {
  const app = await createPongApp({ mode: "local", canvas });
  app.start();
  return app;
}
