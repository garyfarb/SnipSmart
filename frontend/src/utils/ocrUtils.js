import { createWorker } from "tesseract.js";

async function runOCR(imageDataUrl, lang = "eng") {
  // Explicit paths for extension
  const workerPath = chrome.runtime.getURL("tesseract/worker.min.js");
  const corePath = chrome.runtime.getURL("tesseract/");
  const langPath = chrome.runtime.getURL("tesseract/");

  // Create worker
  const worker = await createWorker({
    workerPath,
    corePath,
    langPath,
  });

  // Load language
  await worker.loadLanguage(lang);
  await worker.initialize(lang);

  // Run OCR
  const {
    data: { text },
  } = await worker.recognize(imageDataUrl);

  // Clean up worker after use
  await worker.terminate();

  return text.trim();
}

export default runOCR;