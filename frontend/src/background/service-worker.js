console.log("✅ Background service worker loaded")

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Background received:", message)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_SNIP") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab || !tab.id) {
        console.error("No active tab found")
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: activateSnipMode
      })
    })
  }

  if (message.action === "SNIP_COMPLETE") {
    console.log("snip completed")
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("captureVisibleTab failed:", chrome.runtime.lastError)
        return
      }
      console.log("Image captured, sending to popup for cropping")

      chrome.storage.local.set({
        lastSnip: {
            screenshot: dataUrl,
            rect: message.rect,
            timestamp: Date.now()
        }
      })

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon-48.png",
        title: "Snip Complete",
        message: "Click the extension icon to view your snip."
      })
    })
  }
})

async function cropImage(dataUrl, rect) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = rect.width
      canvas.height = rect.height

      const ctx = canvas.getContext("2d")
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.width, rect.height, // source region
        0, 0, rect.width, rect.height           // destination
      )

      resolve(canvas.toDataURL("image/png"))
    }
    img.src = dataUrl
  })
}


function activateSnipMode() {
  let startX, startY, selectionBox, overlay
  
 //Check if element already exists, if it does then do Console.log that the element exists, otherwise list code in the else under comment

  if (document.getElementById("div")) {
    console.log("Snip overlay already exists")
    return
  }
  else {
    overlay = document.createElement("div")
    overlay.style.position = "fixed"
    overlay.style.top = 0
    overlay.style.left = 0
    overlay.style.width = "100%"
    overlay.style.height = "100%"
    overlay.style.background = "rgba(0,0,0,0.1)"
    overlay.style.cursor = "crosshair"
    overlay.style.zIndex = 999999
    document.body.appendChild(overlay)
  }

    // overlay = document.createElement("div")
    // overlay.style.position = "fixed"
    // overlay.style.top = 0
    // overlay.style.left = 0
    // overlay.style.width = "100%"
    // overlay.style.height = "100%"
    // overlay.style.background = "rgba(0,0,0,0.1)"
    // overlay.style.cursor = "crosshair"
    // overlay.style.zIndex = 999999
    // document.body.appendChild(overlay)

  function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement("div")
    selectionBox.style.position = "absolute"
    selectionBox.style.border = "2px dashed red"
    selectionBox.style.left = `${startX}px`
    selectionBox.style.top = `${startY}px`
    overlay.appendChild(selectionBox)

    overlay.addEventListener("mousemove", onMouseMove)
    overlay.addEventListener("mouseup", onMouseUp)
  }

  function onMouseMove(e) {
    const width = e.clientX - startX
    const height = e.clientY - startY

    selectionBox.style.width = `${Math.abs(width)}px`
    selectionBox.style.height = `${Math.abs(height)}px`
    selectionBox.style.left = `${Math.min(e.clientX, startX)}px`
    selectionBox.style.top = `${Math.min(e.clientY, startY)}px`
  }

  function onMouseUp(e) {
    overlay.removeEventListener("mousemove", onMouseMove)
    overlay.removeEventListener("mouseup", onMouseUp)

    const rect = selectionBox.getBoundingClientRect()

    chrome.runtime.sendMessage({
      action: "SNIP_COMPLETE",
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    })

    document.body.removeChild(overlay)
  }

  overlay.addEventListener("mousedown", onMouseDown)
}
