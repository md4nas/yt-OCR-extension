// content.js - Simple OCR selection implementation
(function() {
    'use strict';
    
    if (window.ocrInjected) return;
    window.ocrInjected = true;
    
    const OCR_API = 'http://localhost:8080/api/ocr/base64';
    
    let isEnabled = false;
    let isSelecting = false;
    let startX, startY, endX, endY;
    let overlay, selection;
    
    // Create OCR button
    const ocrBtn = document.createElement('div');
    ocrBtn.id = 'ocr-btn';
    ocrBtn.textContent = 'OCR';
    ocrBtn.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: #007bff !important;
        color: white !important;
        padding: 10px 15px !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: bold !important;
        display: none !important;
        user-select: none !important;
    `;
    document.body.appendChild(ocrBtn);
    
    // Check initial state
    chrome.storage.local.get(['ocrEnabled'], (result) => {
        isEnabled = result.ocrEnabled || false;
        ocrBtn.style.display = isEnabled ? 'block' : 'none';
    });
    
    // Listen for toggle messages
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'toggleOCR') {
            isEnabled = request.enabled;
            ocrBtn.style.display = isEnabled ? 'block' : 'none';
        }
    });
    
    // OCR button click
    ocrBtn.addEventListener('click', startSelection);
    
    function startSelection() {
        if (isSelecting) return;
        
        isSelecting = true;
        ocrBtn.textContent = 'Cancel';
        document.body.style.cursor = 'crosshair';
        
        // Create overlay
        overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.3) !important;
            z-index: 999998 !important;
            cursor: crosshair !important;
        `;
        
        // Create selection box
        selection = document.createElement('div');
        selection.style.cssText = `
            position: absolute !important;
            border: 2px dashed #007bff !important;
            background: rgba(0,123,255,0.1) !important;
            display: none !important;
        `;
        overlay.appendChild(selection);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('mousedown', onMouseDown);
        overlay.addEventListener('mousemove', onMouseMove);
        overlay.addEventListener('mouseup', onMouseUp);
        document.addEventListener('keydown', onKeyDown);
    }
    
    function onMouseDown(e) {
        startX = e.clientX;
        startY = e.clientY;
        selection.style.display = 'block';
        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0px';
        selection.style.height = '0px';
    }
    
    function onMouseMove(e) {
        if (!startX) return;
        
        endX = e.clientX;
        endY = e.clientY;
        
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        selection.style.left = left + 'px';
        selection.style.top = top + 'px';
        selection.style.width = width + 'px';
        selection.style.height = height + 'px';
    }
    
    function onMouseUp(e) {
        if (!startX) return;
        
        const rect = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
        };
        
        endSelection();
        
        if (rect.width > 10 && rect.height > 10) {
            captureAndOCR(rect);
        }
    }
    
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            endSelection();
        }
    }
    
    function endSelection() {
        isSelecting = false;
        ocrBtn.textContent = 'OCR';
        document.body.style.cursor = '';
        
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        
        startX = startY = endX = endY = null;
        document.removeEventListener('keydown', onKeyDown);
    }
    
    async function captureAndOCR(rect) {
        try {
            // Capture screenshot
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'capture',
                    rect: rect
                }, resolve);
            });
            
            if (!response || !response.imageBase64) {
                alert('Failed to capture screenshot');
                return;
            }
            
            // Crop image
            const croppedImage = await cropImage(response.imageBase64, rect);
            
            // Send to OCR
            const ocrResult = await fetch(OCR_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: croppedImage })
            });
            
            const data = await ocrResult.json();
            console.log('OCR Response:', data);
            
            let text = '';
            if (data.rows && data.rows.length > 0) {
                text = data.rows.map(row => row.content).join('\\n');
            }
            
            if (text) {
                await navigator.clipboard.writeText(text);
                showNotification('Text copied to clipboard!');
            } else {
                showNotification('No text detected');
            }
            
        } catch (error) {
            console.error('OCR Error:', error);
            showNotification('OCR failed: ' + error.message);
        }
    }
    
    function cropImage(dataUrl, rect) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale up for better OCR accuracy
                const scale = 3;
                canvas.width = rect.width * scale;
                canvas.height = rect.height * scale;
                
                // Draw scaled image
                ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
                
                // Apply image enhancements for better OCR
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Convert to grayscale and increase contrast
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    // Increase contrast
                    const contrast = ((gray - 128) * 1.5) + 128;
                    const final = Math.max(0, Math.min(255, contrast));
                    
                    data[i] = final;     // Red
                    data[i + 1] = final; // Green
                    data[i + 2] = final; // Blue
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = dataUrl;
        });
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            z-index: 1000000 !important;
            background: #333 !important;
            color: white !important;
            padding: 10px 15px !important;
            border-radius: 5px !important;
            font-size: 14px !important;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
})();