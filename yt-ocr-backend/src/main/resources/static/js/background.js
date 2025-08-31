// background.js (service worker)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'captureVisibleTab') {
        // capture visible tab as PNG
        chrome.tabs.captureVisibleTab({ format: 'png' }, dataUrl => {
            if (chrome.runtime.lastError || !dataUrl) {
                sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'capture failed' });
                console.log("📸 Sending cropped image to OCR, size:", rect.w, "x", rect.h);

                return;
            }
            sendResponse({ success: true, dataUrl });
        });
        // return true to indicate async sendResponse
        return true;
    }
});
