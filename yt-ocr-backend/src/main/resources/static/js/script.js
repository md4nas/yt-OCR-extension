let rows = []; // store current OCR result
let historyData = [];

// Safely parse history data
try {
    historyData = JSON.parse(sessionStorage.getItem("ocrHistory")) || [];
} catch (e) {
    console.warn('Invalid history data, resetting');
    historyData = [];
    sessionStorage.removeItem("ocrHistory");
}

// Input sanitization
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>"'&\n\r]/g, '').substring(0, 10000);
}

// Preview Image
document.getElementById("fileInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById("preview").src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Recapture / Reset
function recapture() {
    document.getElementById("fileInput").value = "";
    document.getElementById("resultsTable").querySelector("tbody").innerHTML = "";
    document.getElementById("preview").src = "";
    document.getElementById("processingTime").textContent = "";
}

// Process Image (API Call) - Secure Version
async function processImage() {
    const file = document.getElementById("fileInput").files[0];
    if (!file) {
        showNotification("Please select an image first!", "warning");
        return;
    }

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification("Invalid file type. Only images are allowed.", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showNotification("File size must be less than 5MB.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    
    const mode = document.getElementById("ocrMode").value;
    formData.append("mode", mode);

    try {
        document.getElementById("processingTime").textContent = "⏳ Processing...";
        const response = await fetch("/api/ocr/file", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
            throw new Error(`Processing failed: ${response.status}`);
        }

        const result = await response.json();
        
        rows = result.rows || [];
        renderResults(rows);
        saveToHistory(rows);
        
        const timeMs = result.processing_time_ms || 0;
        document.getElementById("processingTime").textContent = `✅ Time Taken ${(timeMs/1000).toFixed(2)} sec`;
        showNotification("OCR processing completed successfully!", "success");
    } catch (error) {
        console.error("OCR Error:", error);
        document.getElementById("processingTime").textContent = "❌ Error occurred";
        showNotification("Error: " + error.message, "error");
    }
}

// Render Table - XSS Safe
function renderResults(rows) {
    const tbody = document.getElementById("resultsTable").querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach((r, index) => {
        const tr = document.createElement("tr");
        const lineCell = document.createElement("td");
        lineCell.className = "line-number";
        lineCell.textContent = String(index + 1);
        const contentCell = document.createElement("td");
        contentCell.className = "content";
        contentCell.style.whiteSpace = "pre-wrap";
        contentCell.style.wordWrap = "break-word";
        contentCell.textContent = String(r.content || '');
        tr.appendChild(lineCell);
        tr.appendChild(contentCell);
        tbody.appendChild(tr);
    });
}

// Copy to Clipboard (content only) - Secure
function copyToClipboard() {
    if (!rows.length) {
        showNotification("No text to copy", "warning");
        return;
    }
    const text = rows.map(r => String(r.content || '').replace(/\\n/g, '\n')).join("\n");
    navigator.clipboard.writeText(text).then(() => {
        showNotification("Copied to clipboard!", "success");
    }).catch(() => {
        showNotification("Failed to copy to clipboard", "error");
    });
}

// Download TXT - Secure
function downloadText() {
    if (!rows.length) {
        showNotification("No text to download", "warning");
        return;
    }
    const text = rows.map(r => String(r.line_no || '') + ". " + String(r.content || '')).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "ocr_result.txt";
    link.click();
    URL.revokeObjectURL(url);
}

// Download JSON - Secure
function downloadJson() {
    if (!rows.length) {
        showNotification("No data to download", "warning");
        return;
    }
    const sanitizedRows = rows.map(r => ({
        line_no: Number(r.line_no) || 0,
        content: String(r.content || '')
    }));
    const blob = new Blob([JSON.stringify(sanitizedRows, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "ocr_result.json";
    link.click();
    URL.revokeObjectURL(url);
}

// Clear Results
function clearResults() {
    rows = [];
    document.getElementById("resultsTable").querySelector("tbody").innerHTML = "";
    document.getElementById("processingTime").textContent = "";
}

// Enhanced History with sessionStorage
function saveToHistory(rows) {
    const extractedText = rows.map(r => String(r.content || '')).join("\n");
    const entry = {
        id: historyData.length + 1,
        time: new Date().toLocaleTimeString(),
        lineCount: rows.length,
        content: extractedText,
        rows: rows
    };

    historyData.push(entry);
    try {
        sessionStorage.setItem("ocrHistory", JSON.stringify(historyData));
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    historyData.forEach((item, index) => {
        const li = document.createElement("li");
        const runId = item.id || (index + 1);
        const time = String(item.time || 'Unknown time');
        const lineCount = item.lineCount || (item.content ? item.content.split('\n').length : 0);
        
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";
        
        const span = document.createElement("span");
        const bold = document.createElement("b");
        bold.textContent = `Sr.No. ${runId}`;
        span.appendChild(bold);
        span.appendChild(document.createTextNode(` (${time}) - ${lineCount} lines`));
        
        const button = document.createElement("button");
        button.className = "view-btn";
        button.textContent = "View";
        button.onclick = () => viewHistory(runId);
        
        historyItem.appendChild(span);
        historyItem.appendChild(button);
        li.appendChild(historyItem);
        historyList.appendChild(li);
    });
}

function reloadHistory() {
    try {
        historyData = JSON.parse(sessionStorage.getItem("ocrHistory")) || [];
        renderHistory();
        showNotification('History reloaded!', 'success');
    } catch (e) {
        console.warn('Failed to reload history:', e);
        historyData = [];
        renderHistory();
        showNotification('History data was corrupted and has been reset', 'warning');
    }
}

function viewHistory(id) {
    const item = historyData.find((h, index) => (h.id || (index + 1)) === id);
    if (item) {
        const content = String(item.content || item.text || 'No content available');
        document.getElementById("historyText").textContent = content;
        document.getElementById("historyModal").style.display = "block";
    }
}

function closeModal() {
    document.getElementById("historyModal").style.display = "none";
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("historyModal");
    if (event.target === modal) {
        closeModal();
    }
}

function copyHistoryText() {
    const text = document.getElementById("historyText").textContent;
    navigator.clipboard.writeText(text).then(() => {
        showNotification("History text copied to clipboard!", "success");
    }).catch(() => {
        showNotification("Failed to copy text", "error");
    });
}

function clearHistory() {
    historyData = [];
    sessionStorage.removeItem("ocrHistory");
    renderHistory();
}

// Secure Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = String(message); // Prevent XSS
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// FAQ Toggle Functionality
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Load history on start
renderHistory();