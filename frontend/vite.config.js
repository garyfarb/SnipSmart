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
        { src: "public/*", dest: "." },
        { src: "public/*", dest: "." },
        { src: "node_modules/tesseract.js/dist/tesseract.min.js", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js/dist/worker.min.js", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core.wasm.js", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core.wasm", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-simd.wasm.js", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-simd.wasm", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-lstm.wasm", dest: "tesseract", flatten: true },
        { src: "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", dest: "tesseract", flatten: true },
        { src: "public/languageData/*", dest: "tesseract/lang", flatten: true }
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