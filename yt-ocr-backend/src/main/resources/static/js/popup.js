document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById("toggleBtn");
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) return;
                
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        try {
                            if (window.startOcrOverlay) {
                                window.startOcrOverlay();
                            } else {
                                window.dispatchEvent(new CustomEvent('start-ocr-overlay'));
                            }
                        } catch (e) {
                            console.warn('OCR overlay start failed:', e);
                        }
                    }
                });
                window.close();
            } catch (error) {
                console.error('Script execution failed:', error);
            }
        });
    }
});