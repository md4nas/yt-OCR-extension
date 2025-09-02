// content.js - Simple OCR with dropdown modes
(function() {
    'use strict';
    
    if (window.ocrInjected) return;
    window.ocrInjected = true;
    
    let isEnabled = false;
    let isSelecting = false;
    let startX, startY, endX, endY;
    let overlay, selection;
    let currentMode = 'web';
    let dropdownVisible = false;
    
    // Create OCR container with dropdown
    const ocrContainer = document.createElement('div');
    ocrContainer.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 999999 !important;
        display: none !important;
    `;
    
    const ocrBtn = document.createElement('div');
    ocrBtn.textContent = 'OCR ▼';
    ocrBtn.style.cssText = `
        background: #007bff !important;
        color: white !important;
        padding: 10px 15px !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: bold !important;
        margin-bottom: 5px !important;
    `;
    
    const dropdown = document.createElement('div');
    dropdown.style.cssText = `
        background: white !important;
        border: 1px solid #ccc !important;
        border-radius: 5px !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        display: none !important;
        min-width: 150px !important;
    `;
    
    // Create mode options
    const modes = [
        { id: 'video', text: '📹 Video OCR' },
        { id: 'web', text: '🌐 Web Text' },
        { id: 'image', text: '🖼️ Image OCR' }
    ];
    
    modes.forEach(mode => {
        const option = document.createElement('div');
        option.textContent = mode.text;
        option.style.cssText = `
            padding: 10px 15px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            border-bottom: 1px solid #eee !important;
            color: #333 !important;
        `;
        option.onmouseenter = () => option.style.background = '#f0f0f0 !important';
        option.onmouseleave = () => option.style.background = 'white !important';
        option.onclick = () => {
            currentMode = mode.id;
            dropdown.style.display = 'none';
            dropdownVisible = false;
            ocrBtn.textContent = 'OCR ▼';
            startSelection();
        };
        dropdown.appendChild(option);
    });
    
    ocrContainer.appendChild(ocrBtn);
    ocrContainer.appendChild(dropdown);
    document.body.appendChild(ocrContainer);
    
    // Initialize
    chrome.storage.local.get(['ocrEnabled'], (result) => {
        isEnabled = result.ocrEnabled || false;
        ocrContainer.style.display = isEnabled ? 'block' : 'none';
    });
    
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'toggleOCR') {
            isEnabled = request.enabled;
            ocrContainer.style.display = isEnabled ? 'block' : 'none';
        }
    });
    
    // Button click - toggle dropdown
    ocrBtn.onclick = () => {
        if (isSelecting) {
            endSelection();
            return;
        }
        
        dropdownVisible = !dropdownVisible;
        dropdown.style.display = dropdownVisible ? 'block' : 'none';
        ocrBtn.textContent = dropdownVisible ? 'OCR ▲' : 'OCR ▼';
    };
    
    // Close dropdown when clicking outside
    document.onclick = (e) => {
        if (!ocrContainer.contains(e.target) && dropdownVisible) {
            dropdown.style.display = 'none';
            dropdownVisible = false;
            ocrBtn.textContent = 'OCR ▼';
        }
    };
    
    function startSelection() {
        isSelecting = true;
        ocrBtn.textContent = 'Cancel';
        document.body.style.cursor = 'crosshair';
        
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
        
        selection = document.createElement('div');
        selection.style.cssText = `
            position: absolute !important;
            border: 2px dashed #007bff !important;
            background: rgba(0,123,255,0.1) !important;
            display: none !important;
        `;
        
        overlay.appendChild(selection);
        document.body.appendChild(overlay);
        
        overlay.onmousedown = (e) => {
            startX = e.clientX;
            startY = e.clientY;
            selection.style.display = 'block';
            selection.style.left = startX + 'px';
            selection.style.top = startY + 'px';
            selection.style.width = '0px';
            selection.style.height = '0px';
        };
        
        overlay.onmousemove = (e) => {
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
        };
        
        overlay.onmouseup = () => {
            if (!startX) return;
            const rect = {
                x: Math.min(startX, endX),
                y: Math.min(startY, endY),
                width: Math.abs(endX - startX),
                height: Math.abs(endY - startY)
            };
            endSelection();
            if (rect.width > 10 && rect.height > 10) {
                processOCR(rect);
            }
        };
        
        document.onkeydown = (e) => {
            if (e.key === 'Escape') endSelection();
        };
    }
    
    function endSelection() {
        isSelecting = false;
        ocrBtn.textContent = 'OCR ▼';
        document.body.style.cursor = '';
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        startX = startY = endX = endY = null;
        document.onkeydown = null;
    }
    
    async function processOCR(rect) {
        try {
            showNotification(`Processing ${currentMode} text...`);
            
            // Quick web text extraction
            if (currentMode === 'web') {
                const selectedText = window.getSelection().toString().trim();
                if (selectedText) {
                    await navigator.clipboard.writeText(selectedText);
                    showNotification('Selected text copied!');
                    return;
                }
            }
            
            // Capture screenshot
            const response = await new Promise(resolve => 
                chrome.runtime.sendMessage({ action: 'capture', rect }, resolve)
            );
            
            if (!response?.imageBase64) {
                showNotification('Capture failed');
                return;
            }
            
            // Crop image
            const croppedImage = await cropImage(response.imageBase64, rect);
            
            // Send to enhanced OCR with mode
            const result = await fetch('http://localhost:8080/api/ocr/enhanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: croppedImage,
                    mode: currentMode,
                    language: 'eng'
                })
            }).then(r => r.json());
            
            let text = '';
            if (result.rows && result.rows.length > 0) {
                text = result.rows.map(row => row.content).join('\n');
            }
            
            if (text) {
                await navigator.clipboard.writeText(text);
                showNotification('Text copied to clipboard!');
            } else {
                showNotification('No text detected');
            }
        } catch (error) {
            showNotification('OCR failed');
            console.error('OCR Error:', error);
        }
    }
    
    function cropImage(dataUrl, rect) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale up 3x for better OCR accuracy (from DEVDOCS)
                const scale = 3;
                canvas.width = rect.width * scale;
                canvas.height = rect.height * scale;
                
                // Draw scaled image
                ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
                
                // Apply image enhancements for better OCR (from DEVDOCS)
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