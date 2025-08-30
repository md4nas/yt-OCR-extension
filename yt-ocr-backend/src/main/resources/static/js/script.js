let rows = []; // store current OCR result

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

// History (LocalStorage)
function saveToHistory(rows) {
    let history = JSON.parse(localStorage.getItem("ocrHistory")) || [];
    history.push(rows);
    localStorage.setItem("ocrHistory", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem("ocrHistory")) || [];
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    history.forEach((h, idx) => {
        const li = document.createElement("li");
        li.textContent = `Run ${idx+1} - ${h.length} lines`;
        list.appendChild(li);
    });
}

function clearHistory() {
    localStorage.removeItem("ocrHistory");
    document.getElementById("historyList").innerHTML = "";
}

// Load history on start
renderHistory();
