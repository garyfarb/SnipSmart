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
    const handleProcessedSnip = async (snip) => {
      try {
        setStatus("Cropping...")
        const cropped = await cropImage(snip.screenshot, snip.rect)
        const processed = await preprocessImage(cropped)

        setImage(processed)
        setStatus("Running OCR...")

        const text = await runOCR(processed, "end")
        setOcrText(text)
        setStatus("OCR Complete!")
      } catch (err) {
        console.error("Failed to process snip:", err)
        setStatus("OCR Error")
      }
    }

    chrome.storage.local.get("lastSnip", ({ lastSnip }) => {
      if (lastSnip) {
        handleProcessedSnip(lastSnip)
      }
    })

    const handleStorageChange = (changes) => {
      if (changes.lastSnip?.newValue) {
        handleProcessedSnip(changes.lastSnip.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
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
