let rows = []; // store current OCR result
let historyData = JSON.parse(sessionStorage.getItem("ocrHistory")) || [];

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

// Process Image (API Call)
async function processImage() {
    const file = document.getElementById("fileInput").files[0];
    if (!file) {
        alert("Please select an image first!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        document.getElementById("processingTime").textContent = "⏳ Processing...";
        const response = await fetch("/api/ocr/file", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("API Response:", result); // Debug log
        
        rows = result.rows || [];
        renderResults(rows);
        saveToHistory(rows);
        
        const timeMs = result.processing_time_ms || 0;
        document.getElementById("processingTime").textContent = `✅ Took ${(timeMs/1000).toFixed(2)} sec`;
    } catch (error) {
        console.error("OCR Error:", error);
        document.getElementById("processingTime").textContent = "❌ Error occurred";
        alert("Error: " + error.message);
    }
}

// Render Table
function renderResults(rows) {
    const tbody = document.getElementById("resultsTable").querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="line-number">${r.line_no}</td><td class="content">${r.content}</td>`;
        tbody.appendChild(tr);
    });
}

// Copy to Clipboard (content only)
function copyToClipboard() {
    if (!rows.length) return;
    const text = rows.map(r => r.content).join("\n");
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

// Download TXT
function downloadText() {
    if (!rows.length) return;
    const text = rows.map(r => r.line_no + ". " + r.content).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ocr_result.txt";
    link.click();
}

// Download JSON
function downloadJson() {
    if (!rows.length) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ocr_result.json";
    link.click();
}

// Clear Results
function clearResults() {
    rows = [];
    document.getElementById("resultsTable").querySelector("tbody").innerHTML = "";
    document.getElementById("processingTime").textContent = "";
}

// Enhanced History with sessionStorage
function saveToHistory(rows) {
    const extractedText = rows.map(r => r.content).join("\n");
    const entry = {
        id: historyData.length + 1,
        time: new Date().toLocaleTimeString(),
        lineCount: rows.length,
        content: extractedText,
        rows: rows
    };

    historyData.push(entry);
    sessionStorage.setItem("ocrHistory", JSON.stringify(historyData));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    historyData.forEach((item, index) => {
        const li = document.createElement("li");
        // Fix undefined issue by ensuring all properties exist
        const runId = item.id || (index + 1);
        const time = item.time || 'Unknown time';
        const lineCount = item.lineCount || (item.content ? item.content.split('\n').length : 0);
        
        li.innerHTML = `
          <div class="history-item">
            <span><b>Sr.No. ${runId}</b> (${time}) - ${lineCount} lines</span>
            <button onclick="viewHistory(${runId})" class="view-btn">View</button>
          </div>
        `;
        historyList.appendChild(li);
    });
}

function reloadHistory() {
    // Reload history from sessionStorage
    historyData = JSON.parse(sessionStorage.getItem("ocrHistory")) || [];
    renderHistory();
    alert('History reloaded!');
}

function viewHistory(id) {
    const item = historyData.find((h, index) => (h.id || (index + 1)) === id);
    if (item) {
        const content = item.content || item.text || 'No content available';
        document.getElementById("historyText").innerText = content;
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
    navigator.clipboard.writeText(text);
    alert("History text copied to clipboard!");
}

function clearHistory() {
    historyData = [];
    sessionStorage.removeItem("ocrHistory");
    renderHistory();
}

// Load history on start
renderHistory();
