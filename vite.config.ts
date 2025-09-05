// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      name: "BabylonPong",
      fileName: "babylon-pong",
      formats: ["es", "iife"],
    },
    rollupOptions: { output: { preserveModules: false } },
    sourcemap: true,
  },
  plugins: [
    tsconfigPaths(), // can be first; order doesn’t matter for this one
    tailwindcss(),
  ],
});
