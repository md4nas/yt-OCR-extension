// content.js - Secure version
if (!window.ocrContentInjected) {
    window.ocrContentInjected = true;

    // Sanitize text input
    function sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[<>"'&]/g, '');
    }

    // Inject CSS styles
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

    const OCR_BACKEND_URL = "http://localhost:9090/api/ocr/base64";

    // create floating toggle button
    const floatBtn = document.createElement('button');
    floatBtn.id = 'ocrFloatBtn';
    floatBtn.title = 'Click to start selection';
    floatBtn.textContent = 'OCR';
    document.documentElement.appendChild(floatBtn);

    // result panel
    const resultPanel = document.createElement('div');
    resultPanel.id = 'ocrResultPanel';
    const headerDiv = document.createElement('div');
    headerDiv.id = 'ocrResultHeader';
    const headerStrong = document.createElement('strong');
    headerStrong.textContent = 'OCR Result';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'ocrClosePanel';
    closeBtn.title = 'Close';
    closeBtn.textContent = '✕';
    headerDiv.appendChild(headerStrong);
    headerDiv.appendChild(closeBtn);
    
    const bodyDiv = document.createElement('div');
    bodyDiv.id = 'ocrResultBody';
    const resultPre = document.createElement('pre');
    resultPre.id = 'ocrResultText';
    resultPre.textContent = 'No result yet';
    bodyDiv.appendChild(resultPre);
    
    const footerDiv = document.createElement('div');
    footerDiv.id = 'ocrResultFooter';
    const copyBtn = document.createElement('button');
    copyBtn.id = 'ocrCopyBtn';
    copyBtn.textContent = 'Copy';
    const clearBtn = document.createElement('button');
    clearBtn.id = 'ocrClearHistoryBtn';
    clearBtn.textContent = 'Clear History';
    footerDiv.appendChild(copyBtn);
    footerDiv.appendChild(clearBtn);
    
    resultPanel.appendChild(headerDiv);
    resultPanel.appendChild(bodyDiv);
    resultPanel.appendChild(footerDiv);
    document.documentElement.appendChild(resultPanel);

    // spinner overlay
    const spinner = document.createElement('div');
    spinner.id = 'ocrSpinner';
    const spinnerDiv = document.createElement('div');
    spinnerDiv.className = 'spinner';
    const spinnerText = document.createElement('div');
    spinnerText.className = 'spinnerText';
    spinnerText.textContent = 'Processing...';
    spinner.appendChild(spinnerDiv);
    spinner.appendChild(spinnerText);
    document.documentElement.appendChild(spinner);

    // states
    let selecting = false;
    let startX = 0, startY = 0;
    let selBox = null;
    let history = [];
    
    // Safe history loading
    try {
        history = JSON.parse(sessionStorage.getItem('ocrHistory') || '[]');
    } catch (e) {
        console.warn('Failed to load OCR history:', e);
        history = [];
    }

    function showSpinner(show) { 
        spinner.style.display = show ? 'flex' : 'none'; 
    }

    function showResult(text, processingTimeMs = 0) {
        const pre = document.getElementById('ocrResultText');
        pre.textContent = sanitizeText(String(text || '(no text)'));
        document.getElementById('ocrResultPanel').style.display = 'block';
        
        try {
            history.unshift({ 
                time: new Date().toLocaleString(), 
                text: sanitizeText(String(text || '')), 
                processingTimeMs: Number(processingTimeMs) || 0 
            });
            if (history.length > 20) history.length = 20;
            sessionStorage.setItem('ocrHistory', JSON.stringify(history));
        } catch (e) {
            console.warn('Failed to save OCR history:', e);
        }
    }

    function cropImage(base64Img, rect) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = rect.w;
                        canvas.height = rect.h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
                        resolve(canvas.toDataURL('image/png'));
                    } catch (e) {
                        reject(new Error('Canvas processing failed'));
                    }
                };
                img.onerror = () => reject(new Error('Image loading failed'));
                img.src = base64Img;
            } catch (e) {
                reject(new Error('Image creation failed'));
            }
        });
    }

    // Event handlers
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'ocrCopyBtn') {
            const text = document.getElementById('ocrResultText').textContent;
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!');
            }).catch(() => {
                showNotification('Failed to copy to clipboard');
            });
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

    floatBtn.addEventListener('click', () => {
        if (selecting) {
            cancelSelection();
            return;
        }
        floatBtn.textContent = 'Cancel';
        selecting = true;
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousedown', startSelection);
    });

    function cancelSelection() {
        selecting = false;
        floatBtn.textContent = 'OCR';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (selBox && selBox.parentNode) { 
            selBox.remove(); 
            selBox = null; 
        }
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
        if (!selBox) return;
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

    async function finishSelection(e) {
        document.removeEventListener('mousemove', resizeSelection);
        document.removeEventListener('mouseup', finishSelection);

        if (!selBox) return;
        
        const rect = selBox.getBoundingClientRect();
        cancelSelection();
        showSpinner(true);

        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'capture',
                    rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                }, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });

            showSpinner(false);
            
            if (!response || !response.imageBase64) {
                throw new Error('Failed to capture screenshot');
            }

            const croppedBase64 = await cropImage(response.imageBase64, rect);
            const t0 = performance.now();
            
            const res = await fetch(OCR_BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: croppedBase64 })
            });
            
            if (!res.ok) {
                throw new Error('OCR request failed: ' + res.status);
            }
            
            const data = await res.json();
            const t1 = performance.now();

            let extracted = '';
            if (data.rows && Array.isArray(data.rows)) {
                extracted = data.rows.map(row => sanitizeText(String(row.content || ''))).join('\n');
            } else {
                extracted = sanitizeText(String(data.text || data.result || data.ocrText || ''));
            }
            
            showResult(extracted || '(no text)', Math.round(t1 - t0));

            if (extracted) {
                try {
                    await navigator.clipboard.writeText(extracted);
                    showNotification('Text copied to clipboard!');
                } catch (e) {
                    showNotification('Text extracted but clipboard access denied');
                }
            }

        } catch (err) {
            showSpinner(false);
            console.error('OCR Error:', err);
            showNotification('OCR failed: ' + sanitizeText(String(err.message)));
        }
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = sanitizeText(String(message));
        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 1000000 !important;
            background: #333 !important;
            color: white !important;
            padding: 10px 15px !important;
            border-radius: 5px !important;
            font-size: 14px !important;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}