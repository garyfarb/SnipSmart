chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_SNIP") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: activateSnipMode
      });
    });
  }
});

function activateSnipMode() {
  let startX, startY, selectionBox, overlay;

  overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.1)";
  overlay.style.cursor = "crosshair";
  overlay.style.zIndex = 999999;
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onMouseDown);

  function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement("div");
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed red";
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    overlay.appendChild(selectionBox);

    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e) {
    const width = e.clientX - startX;
    const height = e.clientY - startY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${Math.min(e.clientX, startX)}px`;
    selectionBox.style.top = `${Math.min(e.clientY, startY)}px`;
  }

  function onMouseUp(e) {
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);

    const rect = selectionBox.getBoundingClientRect();
    console.log("Selected area:", rect);

    document.body.removeChild(overlay);
  }
}
