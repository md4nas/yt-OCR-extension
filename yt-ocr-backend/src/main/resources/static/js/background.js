// background.js (service worker)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'captureVisibleTab') {
        chrome.tabs.captureVisibleTab({ format: 'png' }, dataUrl => {
            if (chrome.runtime.lastError || !dataUrl) {
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError?.message || 'capture failed'
                });
                return;
            }

            // Pass back the raw base64 screenshot (cropping happens in content.js / backend)
            sendResponse({
                success: true,
                dataUrl
            });
        });

        // Keep channel open for async response
        return true;
    }
});
