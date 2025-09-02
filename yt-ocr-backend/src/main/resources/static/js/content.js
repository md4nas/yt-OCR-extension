// content.js
// Injected into pages. Handles overlay UI, selection, cropping and sending data to background for screenshot.

if (!window.ocrContentInjected) {
    window.ocrContentInjected = true;

    // Inject CSS styles
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'http://localhost:8080/css/content.css';
    document.head.appendChild(cssLink);

    // Alternative: Inline CSS (more reliable)
    const style = document.createElement('style');
    style.textContent = `
        #ocrFloatBtn {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 999999 !important;
            background: #007bff !important;
            color: white !important;
            border: none !important;
            border-radius: 50px !important;
            padding: 12px 20px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(0,123,255,0.3) !important;
            transition: all 0.3s ease !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        #ocrFloatBtn:hover {
            background: #0056b3 !important;
            transform: translateY(-2px) !important;
        }
    `;
    document.head.appendChild(style);

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
        // push to session storage history (keep small)
        history.unshift({ time: new Date().toLocaleString(), text, processingTimeMs });
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
        showSpinner(true);

        // ask background to capture screen
        // ask background to capture screen
        chrome.runtime.sendMessage({
            action: 'capture',
            rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
        }, async (response) => {
            showSpinner(false);
            if (!response || !response.imageBase64) {
                alert('Failed to capture.');
                return;
            }

            try {
                // crop screenshot to the selected rect
                const croppedBase64 = await cropImage(response.imageBase64, rect);

                // send cropped image to OCR backend
                const t0 = performance.now();
                const res = await fetch(OCR_BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: croppedBase64 })
                });
                const data = await res.json();
                const t1 = performance.now();

                // debugger to check the OCR response
                console.log("OCR raw response:", data);

                // Handle multiple response formats
                const extracted = data.text || data.result || data.ocrText || '';
                if (!extracted) {
                    console.error("⚠️ OCR backend did not return text:", data);
                }
                showResult(extracted || '(no text)', Math.round(t1 - t0));


                // optional: copy to clipboard automatically
                if (extracted) {
                    navigator.clipboard.writeText(extracted).catch(err =>
                        console.error("Clipboard write failed:", err)
                    );
                }

            } catch (err) {
                console.error(err);
                alert('OCR request failed: ' + err.message);
            }
        });

    }
}
