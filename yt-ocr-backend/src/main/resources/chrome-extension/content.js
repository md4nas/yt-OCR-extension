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
        option.dataset.mode = mode.id;
        option.textContent = mode.text;
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
    
    // Check initial state
    chrome.storage.local.get(['ocrEnabled'], (result) => {
        isEnabled = result.ocrEnabled || false;
        ocrContainer.style.display = isEnabled ? 'block' : 'none';
    });
    
    // Listen for toggle messages
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'toggleOCR') {
            isEnabled = request.enabled;
            ocrContainer.style.display = isEnabled ? 'block' : 'none';
        }
    });
    
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
        if (e.target.classList.contains('ocr-option')) {
            currentMode = e.target.dataset.mode;
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
        currentMode = mode;
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
        ocrBtn.textContent = 'OCR';
        document.body.style.cursor = '';
        
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        
        startX = startY = endX = endY = null;
        document.removeEventListener('keydown', onKeyDown);
    }
    
    async function captureAndOCR(rect, mode) {
        try {
            // Mode-specific processing
            if (mode === 'video') {
                // Try YouTube captions first
                if (window.location.hostname.includes('youtube.com')) {
                    const captionText = getYouTubeCaptions();
                    if (captionText) {
                        await navigator.clipboard.writeText(captionText);
                        showNotification('Caption text copied!');
                        return;
                    }
                }
            } else if (mode === 'web') {
                // Try to get selected text first
                const selectedText = window.getSelection().toString().trim();
                if (selectedText) {
                    await navigator.clipboard.writeText(selectedText);
                    showNotification('Selected text copied!');
                    return;
                }
            }
            
            let imageData;
            
            if (mode === 'video') {
                const video = getVideoInArea(rect);
                if (video) {
                    if (!video.paused) {
                        video.pause();
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    imageData = captureVideoFrame(video, rect);
                    showNotification('Processing video text...');
                } else {
                    showNotification('No video found in selection');
                    return;
                }
            } else {
                // Web text or image mode - use screenshot
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'capture',
                        rect: rect
                    }, resolve);
                });
                
                if (!response || !response.imageBase64) {
                    showNotification('Failed to capture screenshot');
                    return;
                }
                
                if (mode === 'image') {
                    imageData = await cropImageHighQuality(response.imageBase64, rect);
                } else {
                    imageData = await cropImage(response.imageBase64, rect);
                }
                showNotification(`Processing ${mode} text...`);
            }
            
            const ocrResult = await fetch(OCR_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imageData })
            });
            
            const data = await ocrResult.json();
            
            let text = '';
            if (data.rows && data.rows.length > 0) {
                text = data.rows.map(row => row.content).join('\n');
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
    
    function getYouTubeCaptions() {
        const captions = document.querySelectorAll('.ytp-caption-segment');
        if (captions.length > 0) {
            return [...captions].map(el => el.innerText).join(' ');
        }
        return null;
    }
    
    function captureVideoFrame(video, selection) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        return preprocessCanvas(canvas, selection);
    }
    
    function preprocessCanvas(canvas, selection) {
        const videoRect = document.querySelector('video').getBoundingClientRect();
        const scaleX = canvas.width / videoRect.width;
        const scaleY = canvas.height / videoRect.height;
        
        const cropX = (selection.x - videoRect.left) * scaleX;
        const cropY = (selection.y - videoRect.top) * scaleY;
        const cropW = selection.width * scaleX;
        const cropH = selection.height * scaleY;
        
        const cropped = document.createElement('canvas');
        cropped.width = cropW;
        cropped.height = cropH;
        
        const ctx = cropped.getContext('2d');
        ctx.filter = 'contrast(200%) brightness(120%)';
        ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        
        return cropped.toDataURL('image/png');
    }
    
    function cropImageHighQuality(dataUrl, rect) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Higher scale for images (5x)
                const scale = 5;
                canvas.width = rect.width * scale;
                canvas.height = rect.height * scale;
                
                ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
                
                // Advanced image processing for better OCR
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Sharpen and enhance contrast
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    // Adaptive thresholding
                    const threshold = gray > 128 ? 255 : 0;
                    
                    data[i] = threshold;
                    data[i + 1] = threshold;
                    data[i + 2] = threshold;
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = dataUrl;
        });
    }
    
    function getVideoInArea(rect) {
        const videos = document.querySelectorAll('video');
        for (const video of videos) {
            const videoRect = video.getBoundingClientRect();
            if (rect.x < videoRect.right && rect.x + rect.width > videoRect.left &&
                rect.y < videoRect.bottom && rect.y + rect.height > videoRect.top) {
                return video;
            }
        }
        return null;
    }
    
    async function extractVideoFrame(video, rect) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const videoRect = video.getBoundingClientRect();
        const relativeX = Math.max(0, rect.x - videoRect.left);
        const relativeY = Math.max(0, rect.y - videoRect.top);
        const cropWidth = Math.min(rect.width, videoRect.right - rect.x);
        const cropHeight = Math.min(rect.height, videoRect.bottom - rect.y);
        
        // Scale up 4x for better OCR
        const scale = 4;
        canvas.width = cropWidth * scale;
        canvas.height = cropHeight * scale;
        
        // Draw video frame
        ctx.drawImage(
            video,
            relativeX * (video.videoWidth / videoRect.width),
            relativeY * (video.videoHeight / videoRect.height),
            cropWidth * (video.videoWidth / videoRect.width),
            cropHeight * (video.videoHeight / videoRect.height),
            0, 0, canvas.width, canvas.height
        );
        
        // High contrast processing for video text
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const contrast = gray > 140 ? 255 : 0; // High contrast threshold
            
            data[i] = contrast;
            data[i + 1] = contrast;
            data[i + 2] = contrast;
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
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