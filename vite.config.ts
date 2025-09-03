import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/embed.ts",
      name: "BabylonPong", // window.BabylonPong in IIFE build
      fileName: "babylon-pong",
      formats: ["es", "iife"],
    },
    rollupOptions: {
      // We bundle everything for easy drop-in usage.
      // If you want smaller bundles and shared deps, mark externals here.
      output: {
        // Keep function/class names helpful in dev builds
        preserveModules: false,
      },
    },
    sourcemap: true,
  },
  plugins: [tailwindcss()],
});
