import { useState, useEffect } from 'react'
import { cropImage, preprocessImage }  from "../utils/imageUtils"
import runOCR from "../utils/ocrUtils"

function App() {
  const [status, setStatus] = useState("Idle")
  const [image, setImage] = useState(null)
  const [ocrText, setOcrText] = useState("")

  const handleClick = () => {
    setStatus("Snip Mode!")
    chrome.runtime.sendMessage({ action: "START_SNIP"}) 
  }

  useEffect(() => {
    chrome.storage.local.get("lastSnip", ({ lastSnip }) => {
      if (lastSnip) {
        console.log("Popup found last snip in storage:", lastSnip)
        cropImage(lastSnip.screenshot, lastSnip.rect)
          .then(preprocessImage)
          .then((processed) => {
            setImage(processed);
            setStatus("Snip Complete!")
            console.log("Paths", {
              worker: chrome.runtime.getURL("tesseract/worker.min.js"),
              core: chrome.runtime.getURL("tesseract/tesseract-core.wasm.js"),
              lang: chrome.runtime.getURL("tesseract/")
            });
            runOCR(processed, "eng")
              .then((text) => {
                setOcrText(text)
                setStatus("OCR Complete!")
              })
              .catch((err) => {
                console.error("OCR failed:", err)
                setStatus("OCR Error")
              })
        })
      }
    })

    const handleStorageChange = (changes) => {
      if (changes.lastSnip && changes.lastSnip.newValue) {
        const newSnip = changes.lastSnip.newValue
        console.log("Popup detected new snip:", newSnip)
        cropImage(newSnip.screenshot, newSnip.rect)
          .then(preprocessImage)
          .then((processed) => {
            setImage(processed);
            setStatus("Snip Complete!")
            console.log("Paths", {
              worker: chrome.runtime.getURL("tesseract/worker.min.js"),
              core: chrome.runtime.getURL("tesseract/tesseract-core.wasm.js"),
              lang: chrome.runtime.getURL("tesseract/")
            });
            runOCR(processed, "eng")
              .then((text) => {
                setOcrText(text)
                setStatus("OCR Complete!")
              })
              .catch((err) => {
                console.error("OCR failed:", err)
                setStatus("OCR Error")
              })
        })
      }
    }

  chrome.storage.onChanged.addListener(handleStorageChange)

  // Cleanup when popup closes
  return () => chrome.storage.onChanged.removeListener(handleStorageChange)
}, [])

  return (
    <>
      <div style={{ padding: "10px", width: "150px"}}>
        <button onClick={handleClick}>Start Snip</button>
        <p>{status}</p>
      </div>

      {image && (
        <div>
          <h4>Preview:</h4>
          <img src={image} alt="snip" style={{ maxWidth: "200px" }} />
        </div>
      )}

      {ocrText && (
        <div>
          <h4>Detected Text:</h4>
          <pre>{ocrText}</pre>
        </div>
      )}
    </>
  )
}

export default App
