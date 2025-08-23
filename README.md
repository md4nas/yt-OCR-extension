# yt-OCR-extension
- Project: Maven
- Language: Java
- Spring Boot: 3.5.5
- Group: com.ocr
- Artifact: yt-ocr-backend
- Java Version: 17

# Dependencies to select:
- Spring Web
- Spring Boot DevTools
- Lombok (optional, but helps reduce boilerplate code)


# Flow Example
- User selects text area → extension captures image.
- Extension → fetch("http://localhost:8080/api/ocr/extract", { method: "POST", body: image }).
- Backend extracts text.
- Extension shows result in popup.

# Tech Stack Decision
🔹 Backend
Spring Boot 3.x (Java 17+) → REST API.

Tess4J → OCR library (Java wrapper around Tesseract).

Maven → build & dependencies.

Optional DB (Postgres/MySQL) → if you want to store history of OCR texts.

🔹 Frontend (Browser Extension)

Manifest V3 (Chrome Extension standard).

Vanilla JS / HTML / CSS (keep it light).

Use Chrome’s desktopCapture or captureVisibleTab APIs for screenshot.

Show extracted text in a popup.
# use 
- Chrome/Edge Extension → handles UI, screen capture, text preview.
- Spring Boot Backend → OCR engine + API layer.
- OCR Engine → Tesseract (Java wrapper:Tess4J ("https://github.com/nguyenq/tess4j")) or cloud OCR (optional).

# High-Level Flow Diagram
[ User Clicks Extension ]
|
v
[ Select Screen Area ] --- (JS canvas cropper)
|
v
[ Image Captured (base64) ]
|
v
[ Extension sends to API ]
POST http://localhost:8080/api/ocr/extract
|
v
[ Spring Boot Backend ]
- Accept image
- Run Tesseract OCR
- Return extracted text
|
v
[ Extension Popup UI ]
Show extracted text instantly


