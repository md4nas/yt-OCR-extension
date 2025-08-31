// content.js
// Injected into pages. Handles overlay UI, selection, cropping and sending data to background for screenshot.

if (!window.ocrContentInjected) {
    window.ocrContentInjected = true;

    /*********** CONFIG ***********/
    const OCR_BACKEND_URL = "http://localhost:8080/api/ocr/base64"; // expects JSON: { imageBase64: "data:image/png;base64,..." }
    const MAX_SEND_WIDTH = 1600; // scale down width to this for speed/accuracy tradeoff
    /*******************************/

    // create floating toggle button
    const floatBtn = document.createElement('button');
    floatBtn.id = 'ocrFloatBtn';
    floatBtn.title = 'Click to start selection';
    floatBtn.innerText = 'OCR';
    document.documentElement.appendChild(floatBtn);

    // result panel (hidden by default)
    const resultPanel = document.createElement('div');
    resultPanel.id = 'ocrResultPanel';
    resultPanel.innerHTML = `
    <div id="ocrResultHeader">
      <strong>OCR Result</strong>
      <button id="ocrClosePanel" title="Close">✕</button>
    </div>
    <div id="ocrResultBody"><pre id="ocrResultText">No result yet</pre></div>
    <div id="ocrResultFooter">
      <button id="ocrCopyBtn">Copy</button>
      <button id="ocrClearHistoryBtn">Clear History</button>
    </div>`;
    document.documentElement.appendChild(resultPanel);

    // small spinner overlay
    const spinner = document.createElement('div');
    spinner.id = 'ocrSpinner';
    spinner.innerHTML = `<div class="spinner"></div><div class="spinnerText">Processing...</div>`;
    document.documentElement.appendChild(spinner);

    // states
    let selecting = false;
    let startX = 0, startY = 0;
    let selBox = null;
    let history = JSON.parse(sessionStorage.getItem('ocrHistory') || '[]');

    // helper to show/hide spinner
    function showSpinner(show) { spinner.style.display = show ? 'flex' : 'none'; }

    // show result in panel and save to history
    function showResult(text, processingTimeMs = 0) {
        const pre = document.getElementById('ocrResultText');
        pre.textContent = text || '(no text)';
        document.getElementById('ocrResultPanel').style.display = 'block';
        // push to session storage history (keep small) - fix undefined issue
        const lineCount = text ? text.split('\n').length : 0;
        history.unshift({ 
            time: new Date().toLocaleString(), 
            text: text || '', 
            processingTimeMs: processingTimeMs || 0,
            lineCount: lineCount
        });
        if (history.length > 20) history.length = 20;
        sessionStorage.setItem('ocrHistory', JSON.stringify(history));
    }

    // --- EVENT HANDLERS ---

    // Cropping Image
    function cropImage(base64Img, rect) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = rect.w;
                canvas.height = rect.h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = base64Img;
        });
    }

    // copy to clipboard
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'ocrCopyBtn') {
            const text = document.getElementById('ocrResultText').innerText;
            navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        }
        if (e.target && e.target.id === 'ocrClosePanel') {
            document.getElementById('ocrResultPanel').style.display = 'none';
        }
        if (e.target && e.target.id === 'ocrClearHistoryBtn') {
            history = [];
            sessionStorage.removeItem('ocrHistory');
            document.getElementById('ocrResultText').textContent = '(history cleared)';
        }
    });

    // toggle button clicked
    floatBtn.addEventListener('click', () => {
        if (selecting) {
            cancelSelection();
            return;
        }
        floatBtn.innerText = 'Cancel';
        selecting = true;
        document.body.style.cursor = 'crosshair';

        // disable scroll
        document.body.style.userSelect = 'none';

        document.addEventListener('mousedown', startSelection);
    });

    function cancelSelection() {
        selecting = false;
        floatBtn.innerText = 'OCR';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (selBox) { selBox.remove(); selBox = null; }
        document.removeEventListener('mousedown', startSelection);
        document.removeEventListener('mousemove', resizeSelection);
        document.removeEventListener('mouseup', finishSelection);
    }

    function startSelection(e) {
        startX = e.pageX;
        startY = e.pageY;
        selBox = document.createElement('div');
        selBox.id = 'ocrSelectionBox';
        selBox.style.left = startX + 'px';
        selBox.style.top = startY + 'px';
        document.body.appendChild(selBox);

        document.addEventListener('mousemove', resizeSelection);
        document.addEventListener('mouseup', finishSelection);
    }

    function resizeSelection(e) {
        const x = Math.min(e.pageX, startX);
        const y = Math.min(e.pageY, startY);
        const w = Math.abs(e.pageX - startX);
        const h = Math.abs(e.pageY - startY);
        Object.assign(selBox.style, {
            left: x + 'px',
            top: y + 'px',
            width: w + 'px',
            height: h + 'px'
        });
    }

    function finishSelection(e) {
        document.removeEventListener('mousemove', resizeSelection);
        document.removeEventListener('mouseup', finishSelection);

        const rect = selBox.getBoundingClientRect();
        cancelSelection();

        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
            alert('Extension was reloaded. Please refresh the page.');
            return;
        }
        
        chrome.runtime.sendMessage({
            action: 'capture',
            rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
        }, async (response) => {
            console.log('Capture response received');
            
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                if (chrome.runtime.lastError.message.includes('context invalidated')) {
                    alert('Extension was reloaded. Please refresh the page.');
                } else {
                    alert('Extension error: ' + chrome.runtime.lastError.message);
                }
                return;
            }
            
            if (!response) {
                alert('No response from background script');
                return;
            }
            
            if (response.error) {
                alert('Capture failed: ' + response.error);
                return;
            }
            
            if (!response.imageBase64) {
                alert('No image data received');
                return;
            }
            
            // Crop the image in content script
            try {
                const croppedImage = await cropImageInContent(response.imageBase64, rect);
                // Add small delay to ensure popup is visible
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendToOCR(croppedImage);
            } catch (error) {
                console.error('Crop or OCR failed:', error);
                alert('Processing failed: ' + error.message);
            }
        });
    }
    
    // Crop image using Canvas in content script
    function cropImageInContent(dataUrl, rect) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = rect.width;
                canvas.height = rect.height;
                
                ctx.drawImage(
                    img,
                    rect.left, rect.top, rect.width, rect.height,
                    0, 0, rect.width, rect.height
                );
                
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }
    
    // Send cropped image to OCR backend
    async function sendToOCR(imageBase64) {
        try {
            const t0 = performance.now();
            const res = await fetch(OCR_BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64 })
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            const t1 = performance.now();
            
            console.log("OCR raw response:", data);
            
            // Handle new API format with rows array
            let extracted = '';
            if (data.rows && data.rows.length > 0) {
                extracted = data.rows.map(row => row.content).join('\n');
            } else if (data.text) {
                extracted = data.text;
            } else {
                console.error("⚠️ OCR backend did not return expected format:", data);
            }
            
            console.log("Extracted text:", extracted);
            showResult(extracted || '(no text)', Math.round(t1 - t0));

            // Auto-copy to clipboard with alert
            if (extracted) {
                navigator.clipboard.writeText(extracted).then(() => {
                    console.log("✅ Text copied to clipboard automatically");
                    alert('Text copied to clipboard!');
                }).catch(err => {
                    console.error("Clipboard write failed:", err);
                    alert('Failed to copy to clipboard');
                });
            }
        } catch (err) {
            console.error('OCR request failed:', err);
            throw err;
        }
    }
}