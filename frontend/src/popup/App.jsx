import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State management
  const [status, setStatus] = useState('Ready to capture text');
  const [processedImage, setProcessedImage] = useState(null);
  const [detectedText, setDetectedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [showTranslation, setShowTranslation] = useState(false);

  // Load history on mount
  useEffect(() => {
    chrome.storage.local.get('snippetHistory', ({ snippetHistory }) => {
      if (snippetHistory) {
        setHistory(snippetHistory);
      }
    });
  }, []);

  // Listen for new snips
  useEffect(() => {
    const handleNewSnip = (snipData) => {
      if (snipData) {
        processSnip(snipData);
      }
    };

    chrome.storage.local.get('lastSnip', ({ lastSnip }) => {
      if (lastSnip) {
        handleNewSnip(lastSnip);
      }
    });

    const listener = (changes) => {
      if (changes.lastSnip?.newValue) {
        handleNewSnip(changes.lastSnip.newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Start snip mode
  const handleStartSnip = () => {
    setStatus('Click and drag to select area...');
    setDetectedText('');
    setTranslatedText('');
    setProcessedImage(null);
    setConfidence(null);
    setShowTranslation(false);
    chrome.runtime.sendMessage({ action: 'START_SNIP' });
  };

  // Crop image
  const cropImage = async (screenshot, rect) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          rect.x, rect.y, rect.width, rect.height,
          0, 0, rect.width, rect.height
        );
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = screenshot;
    });
  };

  // Preprocess image for better OCR
  const preprocessImage = async (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        const minWidth = 400;
        const minHeight = 400;
        const widthScale = width < minWidth ? minWidth / width : 1;
        const heightScale = height < minHeight ? minHeight / height : 1;
        const scale = Math.max(widthScale, heightScale);
        
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const contrast = 1.2;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const enhanced = factor * (avg - 128) + 128;
          data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, enhanced));
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  // Run OCR
  const runOCR = async (imageSrc) => {
    const workerPath = chrome.runtime.getURL('tesseract/worker.min.js');
    const corePath = chrome.runtime.getURL('tesseract/tesseract-core.wasm.js');
    const langPath = chrome.runtime.getURL('tesseract/lang/');
    
    const Tesseract = await import('tesseract.js');
    
    const worker = await Tesseract.createWorker('eng', 3, {
      workerPath,
      corePath,
      langPath,
      workerBlobURL: false
    });
    
    const { data: { text, confidence } } = await worker.recognize(imageSrc);
    await worker.terminate();
    
    return {
      text: cleanText(text),
      confidence: Math.round(confidence)
    };
  };

  // Clean OCR text
  const cleanText = (text) => {
    return text
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n\t]/gu, '')
      .replace(/  +/g, ' ')
      .replace(/\n\n+/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  };

  // Process the snip
  const processSnip = async (snipData) => {
    try {
      setIsProcessing(true);
      setStatus('Processing image...');
      
      const croppedImage = await cropImage(snipData.screenshot, snipData.rect);
      
      setStatus('Enhancing image...');
      const enhancedImage = await preprocessImage(croppedImage);
      setProcessedImage(enhancedImage);
      
      setStatus('Running OCR...');
      const result = await runOCR(enhancedImage);
      
      setDetectedText(result.text);
      setConfidence(result.confidence);
      setStatus('✓ OCR Complete!');
      
      saveToHistory({
        text: result.text,
        confidence: result.confidence,
        image: enhancedImage,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Translate using MyMemory API (completely free, no API key needed)
  const translateText = async () => {
    if (!detectedText) return;
    
    setStatus('Translating...');
    setShowTranslation(true);
    
    try {
      // MyMemory Translation API - 100% free, no API key
      const langPair = `${detectedLanguage}|${targetLanguage}`;
      const encodedText = encodeURIComponent(detectedText);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;
      
      console.log('Translating with MyMemory API...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Translation response:', data);
      
      if (data.responseData && data.responseData.translatedText) {
        setTranslatedText(data.responseData.translatedText);
        setStatus('✓ Translation complete!');
        
        // Show match quality if available
        if (data.responseData.match < 1) {
          console.log(`Translation match: ${(data.responseData.match * 100).toFixed(0)}%`);
        }
      } else {
        throw new Error('No translation in response');
      }
      
    } catch (error) {
      console.error('Translation error:', error);
      setStatus('❌ Translation failed');
      
      // Provide helpful error message
      setTranslatedText(
        `⚠️ Translation unavailable.\n\n` +
        `Error: ${error.message}\n\n` +
        `Possible solutions:\n` +
        `• Check your internet connection\n` +
        `• Try a different target language\n` +
        `• The text might be too long (limit: 500 chars)\n\n` +
        `Original text copied to clipboard for manual translation.`
      );
      
      // Auto-copy for manual translation
      copyToClipboard(detectedText);
    }
  };

  // Save to history
  const saveToHistory = (snippet) => {
    // Read directly from Chrome storage to avoid stale state issues
    chrome.storage.local.get('snippetHistory', ({ snippetHistory }) => {
        const currentHistory = snippetHistory || [];
        const newHistory = [snippet, ...currentHistory].slice(0, 10);
        setHistory(newHistory);
        chrome.storage.local.set({ snippetHistory: newHistory });
    });
};

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus('✓ Copied to clipboard!');
      setTimeout(() => setStatus('Ready'), 2000);
    }).catch(() => {
      setStatus('❌ Failed to copy');
    });
  };

  // Clear history
  const clearHistory = () => {
    if (confirm('Clear all snippet history?')) {
      setHistory([]);
      chrome.storage.local.remove('snippetHistory');
      setStatus('History cleared');
    }
  };

  // Delete single history item
  const deleteHistoryItem = (index) => {
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    chrome.storage.local.set({ snippetHistory: newHistory });
  };

  // View history item
  const viewHistoryItem = (item) => {
    setDetectedText(item.text);
    setConfidence(item.confidence);
    setProcessedImage(item.image);
    setTranslatedText('');
    setShowTranslation(false);
  };

  const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>✂️ SnipSmart</h1>
          <p className="tagline">Screen OCR & Translation</p>
        </div>
        <div className="status-bar">
          <span className={`status ${isProcessing ? 'processing' : ''}`}>
            {isProcessing && <span className="spinner"></span>}
            {status}
          </span>
        </div>
      </header>

      <main className="app-main">
        <section className="controls-section">
          <button 
            className="btn-primary btn-snip" 
            onClick={handleStartSnip}
            disabled={isProcessing}
          >
            {isProcessing ? '⏳ Processing...' : '✂️ Start New Snip'}
          </button>
        </section>

        {processedImage && (
          <section className="preview-section">
            <h3>📸 Captured Image</h3>
            <div className="preview-container">
              <img src={processedImage} alt="Captured snip" />
            </div>
          </section>
        )}

        {detectedText && (
          <section className="text-section">
            <div className="section-header">
              <h3>📝 Detected Text</h3>
              {confidence !== null && (
                <span className={`confidence-badge ${
                  confidence > 80 ? 'high' : confidence > 60 ? 'medium' : 'low'
                }`}>
                  {confidence}%
                </span>
              )}
            </div>
            
            <div className="text-content">
              <pre>{detectedText}</pre>
            </div>
            
            <div className="text-actions">
              <button 
                className="btn-secondary"
                onClick={() => copyToClipboard(detectedText)}
              >
                📋 Copy Text
              </button>
            </div>
          </section>
        )}

        {detectedText && (
          <section className="translation-section">
            <div className="section-header">
              <h3>🌍 Translation</h3>
            </div>
            
            <div className="translation-controls">
              <div className="language-row">
                <div className="language-selector">
                  <label htmlFor="source-lang">From:</label>
                  <select 
                    id="source-lang"
                    value={detectedLanguage}
                    onChange={(e) => setDetectedLanguage(e.target.value)}
                    className="language-select"
                  >
                    <option value="en">English</option>
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="language-selector">
                  <label htmlFor="target-lang">To:</label>
                  <select 
                    id="target-lang"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="language-select"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button 
                className="btn-translate"
                onClick={translateText}
                disabled={isProcessing}
              >
                🔄 Translate
              </button>
            </div>

            {showTranslation && translatedText && (
              <div className="translated-content">
                <div className="translation-label">
                  <strong>Translation ({languages.find(l => l.code === targetLanguage)?.name}):</strong>
                </div>
                <div className="text-content translation-text">
                  <pre>{translatedText}</pre>
                </div>
                <button 
                  className="btn-secondary btn-copy-translation"
                  onClick={() => copyToClipboard(translatedText)}
                >
                  📋 Copy Translation
                </button>
              </div>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section className="history-section">
            <div className="section-header">
              <h3>📚 Recent Snippets ({history.length})</h3>
              <button className="btn-clear" onClick={clearHistory}>
                🗑️ Clear All
              </button>
            </div>
            
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-preview">
                    {item.image && (
                      <img src={item.image} alt="Snippet preview" className="history-thumbnail" />
                    )}
                  </div>
                  <div className="history-details">
                    <div className="history-text">
                      {item.text.substring(0, 80)}
                      {item.text.length > 80 && '...'}
                    </div>
                    <div className="history-meta">
                      <span className="history-time">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      {item.confidence && (
                        <span className="history-confidence">
                          {item.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="history-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => viewHistoryItem(item)}
                      title="View"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => copyToClipboard(item.text)}
                      title="Copy"
                    >
                      📋
                    </button>
                    <button 
                      className="btn-icon btn-delete"
                      onClick={() => deleteHistoryItem(index)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>Powered by Tesseract.js & MyMemory Translation</p>
          <p className="version">v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}

export default App;