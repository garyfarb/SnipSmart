import { useState } from 'react'

function App() {
  const [status, setStatus] = useState("Idle")

  const handleClick = () => {
    setStatus("Snip Mode!")
    chrome.runtime.sendMessage({ action: "START_SNIP"}) 
  }

  return (
    <>
      <div style={{ padding: "10px", width: "150px"}}>
        <button onClick={handleClick}>Start Snip</button>
        <p>{status}</p>
      </div>
    </>
  )
}

export default App
