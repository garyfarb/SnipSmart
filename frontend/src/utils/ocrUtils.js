import { createWorker } from "tesseract.js";

async function runOCR(imageDataUrl, lang = "eng") {
  const testUrl = chrome.runtime.getURL("tesseract/worker.min.js");
  console.log("Worker URL:", testUrl);

  fetch(testUrl)
    .then(r => console.log("Fetch status:", r.status))
    .catch(err => console.error("Fetch failed:", err));

  const testUrl2 = chrome.runtime.getURL("tesseract/tesseract-core.wasm.js");
  console.log("Worker URL:", testUrl2);

  fetch(testUrl2)
    .then(r => console.log("Fetch status:", r.status))
    .catch(err => console.error("Fetch failed:", err));
  
  const testUrl3 = chrome.runtime.getURL("tesseract/lang/");
  console.log("Worker URL:", testUrl3);

  fetch(testUrl2)
    .then(r => console.log("Fetch status:", r.status))
    .catch(err => console.error("Fetch failed:", err));

  const workerPath = chrome.runtime.getURL("tesseract/worker.min.js")
  const corePath = chrome.runtime.getURL("tesseract/tesseract-core.wasm.js")
  const langPath = chrome.runtime.getURL("tesseract/lang/")

  const worker = await createWorker('eng', 3, {
    workerPath,
    corePath,
    langPath,
    workerBlobURL: false,
  });

  const {
    data: { text },
  } = await worker.recognize(imageDataUrl);

  await worker.terminate();

  return text.trim();
}

export default runOCR;