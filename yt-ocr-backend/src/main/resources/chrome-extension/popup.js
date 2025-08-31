// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('ocrFloarBtn');
    
    // Load current state
    chrome.storage.local.get(['ocrEnabled'], function(result) {
        const isEnabled = result.ocrEnabled || false;
        updateButtonState(isEnabled);
    });
    
    // Toggle OCR mode
    toggleBtn.addEventListener('click', function() {
        chrome.storage.local.get(['ocrEnabled'], function(result) {
            const currentState = result.ocrEnabled || false;
            const newState = !currentState;
            
            chrome.storage.local.set({ocrEnabled: newState}, function() {
                updateButtonState(newState);
                
                // Send message to all tabs to show/hide OCR button
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'toggleOCR',
                            enabled: newState
                        }).catch(() => {}); // Ignore errors for tabs that can't receive messages
                    });
                });
            });
        });
    });
    
    function updateButtonState(enabled) {
        toggleBtn.textContent = enabled ? 'Disable OCR Mode' : 'Enable OCR Mode';
        toggleBtn.className = enabled ? 'secondary-btn' : 'primary-btn';
    }
});