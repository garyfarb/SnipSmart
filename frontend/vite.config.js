import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "src/background/service-worker.js", dest: "." },
        { src: "src/content/content.js", dest: "." },
        { src: "manifest.json", dest: "." },
        { src: "public/*", dest: "." }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html")
      }
    },
    outDir: "dist"
  }
});