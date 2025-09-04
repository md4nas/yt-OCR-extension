// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('ocrFloatBtn');
    
    if (!toggleBtn) {
        console.error('OCR button not found!');
        return;
    }
    
    console.log('OCR popup loaded successfully');
    
    // Load current state
    chrome.storage.local.get(['ocrEnabled'], function(result) {
        const isEnabled = result.ocrEnabled || false;
        console.log('Current OCR state:', isEnabled);
        updateButtonState(isEnabled);
    });
    
    // Toggle OCR mode
    toggleBtn.addEventListener('click', function() {
        console.log('OCR button clicked!');
        
        chrome.storage.local.get(['ocrEnabled'], function(result) {
            const currentState = result.ocrEnabled || false;
            const newState = !currentState;
            
            console.log('Toggling OCR from', currentState, 'to', newState);
            
            chrome.storage.local.set({ocrEnabled: newState}, function() {
                updateButtonState(newState);
                
                // Send message to all tabs to show/hide OCR button
                chrome.tabs.query({}, function(tabs) {
                    console.log('Sending message to', tabs.length, 'tabs');
                    tabs.forEach(tab => {
                        try {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'toggleOCR',
                                enabled: newState
                            });
                        } catch (e) {
                            console.warn('Failed to send message to tab', tab.id, e);
                        }
                    });
                });
            });
        });
    });
    
    function updateButtonState(enabled) {
        console.log('Updating button state to:', enabled);
        toggleBtn.textContent = enabled ? 'Disable OCR Mode' : 'Enable OCR Mode';
        toggleBtn.className = enabled ? 'secondary-btn' : 'primary-btn';
    }
    
    // Donate button handler
    const donateBtn = document.getElementById('donateBtn');
    if (donateBtn) {
        donateBtn.addEventListener('click', function() {
            chrome.tabs.create({ url: 'https://buymeacoffee.com/md4nas' });
        });
    }
});