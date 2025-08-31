document.getElementById("toggleBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    // execute script in tab to start overlay mode
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // call injected helper (content script exposes startOcrOverlay)
            if (window.startOcrOverlay) {
                window.startOcrOverlay();
            } else {
                // fallback: dispatch a custom event that content script listens to
                window.dispatchEvent(new CustomEvent('start-ocr-overlay'));
            }
        }
    });
    window.close();
});
