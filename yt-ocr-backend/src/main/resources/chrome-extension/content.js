// content.js - Secure OCR selection implementation
(function() {
    'use strict';
    
    if (window.ocrInjected) return;
    window.ocrInjected = true;
    
    const OCR_API = 'http://localhost:9090/api/ocr/base64';
    
    let isEnabled = false;
    let isSelecting = false;
    let startX, startY, endX, endY;
    let overlay, selection;
    
    // Sanitize text input
    function sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[<>"'&]/g, '');
    }
    
    // Create OCR button with dropdown
    const ocrContainer = document.createElement('div');
    ocrContainer.id = 'ocr-container';
    ocrContainer.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 999999 !important;
        display: none !important;
    `;
    
    const ocrBtn = document.createElement('div');
    ocrBtn.id = 'ocr-btn';
    ocrBtn.textContent = 'OCR ▼';
    ocrBtn.style.cssText = `
        background: #007bff !important;
        color: white !important;
        padding: 10px 15px !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: bold !important;
        user-select: none !important;
        margin-bottom: 5px !important;
    `;
    
    const dropdown = document.createElement('div');
    dropdown.id = 'ocr-dropdown';
    dropdown.style.cssText = `
        background: white !important;
        border: 1px solid #ccc !important;
        border-radius: 5px !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        display: none !important;
        min-width: 150px !important;
    `;
    
    const modes = [
        { id: 'video', text: '📹 Video OCR', color: '#28a745' },
        { id: 'web', text: '🌐 Web Text', color: '#17a2b8' },
        { id: 'image', text: '🖼️ Image OCR', color: '#ffc107' }
    ];
    
    modes.forEach(mode => {
        const option = document.createElement('div');
        option.className = 'ocr-option';
        option.dataset.mode = sanitizeText(mode.id);
        option.textContent = sanitizeText(mode.text);
        option.style.cssText = `
            padding: 10px 15px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            border-bottom: 1px solid #eee !important;
            color: #333 !important;
        `;
        option.addEventListener('mouseenter', () => {
            option.style.background = mode.color + '20 !important';
        });
        option.addEventListener('mouseleave', () => {
            option.style.background = 'white !important';
        });
        dropdown.appendChild(option);
    });
    
    ocrContainer.appendChild(ocrBtn);
    ocrContainer.appendChild(dropdown);
    document.body.appendChild(ocrContainer);
    
    // Check initial state with error handling
    try {
        chrome.storage.local.get(['ocrEnabled'], (result) => {
            isEnabled = result.ocrEnabled || false;
            ocrContainer.style.display = isEnabled ? 'block' : 'none';
        });
    } catch (e) {
        console.warn('Chrome storage access failed:', e);
    }
    
    // Listen for toggle messages with error handling
    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Content script received message:', request);
            if (request && request.action === 'toggleOCR') {
                isEnabled = Boolean(request.enabled);
                ocrContainer.style.display = isEnabled ? 'block' : 'none';
                console.log('OCR container display set to:', isEnabled ? 'block' : 'none');
                sendResponse({success: true});
            }
        });
    } catch (e) {
        console.warn('Chrome runtime message listener failed:', e);
    }
    
    let currentMode = 'video';
    let dropdownVisible = false;
    
    // OCR button click - toggle dropdown
    ocrBtn.addEventListener('click', () => {
        dropdownVisible = !dropdownVisible;
        dropdown.style.display = dropdownVisible ? 'block' : 'none';
        ocrBtn.textContent = dropdownVisible ? 'OCR ▲' : 'OCR ▼';
    });
    
    // Mode selection
    dropdown.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('ocr-option')) {
            currentMode = sanitizeText(e.target.dataset.mode) || 'video';
            dropdown.style.display = 'none';
            dropdownVisible = false;
            ocrBtn.textContent = 'OCR ▼';
            startSelection(currentMode);
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!ocrContainer.contains(e.target) && dropdownVisible) {
            dropdown.style.display = 'none';
            dropdownVisible = false;
            ocrBtn.textContent = 'OCR ▼';
        }
    });
    
    function startSelection(mode) {
        if (isSelecting) return;
        
        isSelecting = true;
        currentMode = sanitizeText(mode) || 'video';
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
        endX = startX; // Initialize endX and endY
        endY = startY;
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
        if (!startX || !endX || !endY) return;
        
        const rect = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
        };
        
        endSelection();
        
        if (rect.width > 10 && rect.height > 10) {
            captureAndOCR(rect, currentMode);
        }
    }
    
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            endSelection();
        }
    }
    
    function endSelection() {
        isSelecting = false;
        ocrBtn.textContent = 'OCR ▼';
        document.body.style.cursor = '';
        
        if (overlay && overlay.parentNode) {
            overlay.remove();
            overlay = null;
        }
        
        startX = startY = endX = endY = null;
        document.removeEventListener('keydown', onKeyDown);
    }
    
    async function captureAndOCR(rect, mode) {
        try {
            showNotification('Processing ' + sanitizeText(mode) + ' text...');
            
            // Capture screenshot with error handling
            let response;
            try {
                response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'capture',
                        rect: rect
                    }, (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    });
                });
            } catch (e) {
                throw new Error('Screenshot capture failed: ' + e.message);
            }
            
            if (!response || !response.imageBase64) {
                throw new Error('Failed to capture screenshot');
            }
            
            const imageData = await cropImage(response.imageBase64, rect);
            
            const ocrResult = await fetch(OCR_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: imageData,
                    language: 'eng',
                    mode: 'code'
                })
            });
            
            if (!ocrResult.ok) {
                throw new Error('OCR API request failed: ' + ocrResult.status);
            }
            
            const data = await ocrResult.json();
            
            let text = '';
            if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
                text = data.rows.map(row => sanitizeText(String(row.content || ''))).join('\n');
            }
            
            if (text.trim()) {
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification('Text copied to clipboard!');
                } catch (e) {
                    showNotification('Text extracted but clipboard access denied');
                }
            } else {
                showNotification('No text detected');
            }
            
        } catch (error) {
            console.error('OCR Error:', error);
            showNotification('OCR failed: ' + sanitizeText(String(error.message)));
        }
    }
    
    function cropImage(dataUrl, rect) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        const scale = 2;
                        canvas.width = rect.width * scale;
                        canvas.height = rect.height * scale;
                        
                        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
                        
                        resolve(canvas.toDataURL('image/png'));
                    } catch (e) {
                        reject(new Error('Image processing failed: ' + e.message));
                    }
                };
                img.onerror = () => reject(new Error('Image loading failed'));
                img.src = dataUrl;
            } catch (e) {
                reject(new Error('Image creation failed: ' + e.message));
            }
        });
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = sanitizeText(String(message));
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
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
})();