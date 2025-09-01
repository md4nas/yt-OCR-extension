// background.js - Simple screenshot capture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ imageBase64: dataUrl });
            }
        });
        return true;
    }
});