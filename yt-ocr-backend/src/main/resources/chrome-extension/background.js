// background.js - Service Worker for Chrome Extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
        console.log('Capture request received:', request.rect);
        
        // Capture the visible tab in current window
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Capture failed:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            
            console.log('Capture successful, cropping image...');
            
            // Crop the image to the selected rectangle
            cropImage(dataUrl, request.rect).then(croppedBase64 => {
                console.log('Crop successful');
                sendResponse({ imageBase64: croppedBase64 });
            }).catch(error => {
                console.error('Crop failed:', error);
                sendResponse({ error: error.message });
            });
        });

        // Return true to indicate we'll send response asynchronously
        return true;
    }
});

// For now, just return the full screenshot - we'll crop in content script
function cropImage(dataUrl, rect) {
    return Promise.resolve(dataUrl);
}