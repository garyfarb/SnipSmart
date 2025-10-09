import { createWorker } from "tesseract.js";

async function runOCR(imageDataUrl, lang = "eng") {
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
    data: { text, confidence },
  } = await worker.recognize(imageDataUrl);

  console.log(`Confidence Score: ${confidence}`)
  await worker.terminate();

  return cleanRecognizedText(text);
}

function cleanRecognizedText(text) {
  return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim()
}

export default runOCR