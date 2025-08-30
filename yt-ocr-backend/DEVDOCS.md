#### date: 23-08-2025, 7:35pm

### controller/OcrController.java

define:
```
@RestController
@RequestMapping("/api/ocr")
public class OcrController {

- @RestController → tells Spring Boot this class is a REST API controller.
- @RequestMapping("/api/ocr") → all APIs in this controller will start with /api/ocr.

@PostMapping("/extract")
public ResponseEntity<String> extractText(@RequestParam("file") MultipartFile file) {

- @PostMapping("/extract") → this method handles POST requests at /api/ocr/extract.
- MultipartFile file → Spring Boot automatically maps the uploaded file to this parameter.
- ResponseEntity<String> → we’ll return text (OCR result) inside an HTTP response.

File convFile = File.createTempFile("ocr", ".png");
file.transferTo(convFile);
```

- We temporarily save the uploaded file on disk, because Tesseract works with file paths.
- Example: if you upload receipt.jpg, it gets stored as something like ocr12345.png.

ITesseract tesseract = new Tesseract();
tesseract.setDatapath("tessdata"); // folder with training data
tesseract.setLanguage("eng");

- We create a Tesseract OCR engine instance.
- setDatapath("tessdata") → points to the folder where eng.traineddata (English language data) is stored.
- setLanguage("eng") → tells OCR to use English recognition.

String result = tesseract.doOCR(convFile);

- Tesseract scans the image and extracts all the text it can recognize.
- The extracted text is stored in result.

# Flow Summary (Step by Step)

- User uploads image (via Postman or frontend).
- Spring Boot receives it in extractText().
- Save image temporarily.
- Pass it to Tesseract (OCR engine).
- Tesseract extracts text from the image.
- Return extracted text as HTTP response.

---

#### date: 24-08-2025,time: 12:03 AM

created 
- Image utilities (decode base64, simple preprocess)
- OCR Service (all Tesseract logic here)
- REST Controller (two endpoints)

## What each annotation does (quickly):
@RestController → class serves HTTP JSON/text endpoints.
@RequestMapping("/api/ocr") → base path for all endpoints here.
@PostMapping("/file") → HTTP POST at /api/ocr/file with multipart/form-data.
@PostMapping("/base64") → HTTP POST at /api/ocr/base64 with JSON.
ResponseEntity<OcrResponse> → return HTTP status + body { "text": "..." }.

---

#### date: 25-08-2025,time: 11:06 AM

fixed some minutes typoes in code 
- OcrService.java:

Change all $( to ${ in @Value annotations (lines 13-20)

Fix eom to oem in line 17

Fix enigne to engine in line 45

Use same engine instance in doOcr method

application.properties:

Change ocr.char-ehitelist to ocr.char-whitelis

#### time 05:11 PM

trying to solve the issue 
"Error opening data file tessdata/eng.traineddata
Please make sure the TESSDATA_PREFIX environment variable is set to your "tessdata" directory.
Failed loading language 'eng'
Tesseract couldn't load any languages!"

### steps taken:
1. change the wrong dataFile name from ENG to eng 
2. updated the pom and remove the conflicting loggers
3. Move tessdata folder to src/main/resources/ and update your service
4. Fix the tessdata path resolution in newEngine() method:
   - Replace this line:
   - tesseract.setDatapath(tessdatapath);
   - With this:
     
   - String resolvedPath;
     if (tessdatapath.equals("tessdata") || tessdatapath.startsWith("./")) {
     resolvedPath = System.getProperty("user.dir") + "/tessdata";
     } else {
     resolvedPath = tessdatapath;
     }
     tesseract.setDatapath(resolvedPath);
     System.out.println("Using tessdata path: " + resolvedPath); // Debug line
   - 
5. Fix the variable name in setTessVariable:
   - Change this line:
   - tesseract.setVariable("tessedit_char_whitelist", charWhitelist);
   - To:
   - tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
   
6. Update your application.properties:
   - Change from:
   - ocr.tessdata-path=tessdata
   - To:
   - resolvePath = System.getProperty("user.dir") + "/yt-ocr-backend/tessdata";

finally getting the proper json output
post: ("http://localhost:8080/api/ocr/file")

backend done

---

## now next task to fix the spacing, indentation, row/line numbers

#### date: 26-08-2025,time: 12:10AM

- Right now,OCR is correctly extracting text but spacing / indentation / row numbers are lost.
- fix this in OcrService.doOcr() by post-processing the raw OCR text before returning.

```
// Get OCR text
        String rawText = engine.doOCR(img);

        // ---- Post Processing Section ----
        // Normalize spacing: replace multiple spaces with a single space
        String cleaned = rawText.replaceAll("[ ]{2,}", " ");

        // Preserve line breaks and add row numbers
        String[] lines = cleaned.split("\\r?\\n");
        StringBuilder formatted = new StringBuilder();

        int row = 1;
        for (String line : lines) {
            if (!line.trim().isEmpty()) { // skip empty lines
                formatted.append(row).append(". ").append(line.trim()).append("\n");
                row++;
            }
        }
```

#### time: 6:20 pm 

- found the issue! In your OcrService.doOcr method
  - service method processes the text but returns the raw unprocessed text. The processed text with proper formatting is in the formatted StringBuilder but never return

```
// Change this line at the end of doOcr method:
return engine.doOCR(img);

// To this:
return formatted.toString();
```

- Additional Improvements for Better JSON Output
```
package com.ocr.yt_ocr_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OcrResponse {
    @JsonProperty("extracted_text")
    private String text;
    
    @JsonProperty("line_count")
    private int lineCount;
    
    @JsonProperty("success")
    private boolean success = true;

    public OcrResponse() {}
    
    public OcrResponse(String text) {
        this.text = text;
        this.lineCount = text != null ? text.split("\n").length : 0;
    }

    // Getters and setters...
    public String getText() { return text; }
    public void setText(String text) { 
        this.text = text;
        this.lineCount = text != null ? text.split("\n").length : 0;
    }
    
    public int getLineCount() { return lineCount; }
    public void setLineCount(int lineCount) { this.lineCount = lineCount; }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}

```

- issue! The OCR is working but the text processing needs improvement. The main problems are:
  - Word spacing : Words are getting concatenated (like "Helpwithcodesnippetsinareadme")
  - Line breaks : Not preserving proper paragraph structure
  - Special characters : Some characters are being misread

- repalced the old post porcessing in doOcr() Method inside ocrService file with processOcrText() method

```
// --- POST PROCESSING SECTION !!! ---
            
            //  1. collapse multiple spaces
            String cleaned = rawText.replaceAll("[ ]{2,}", " ").trim();

            // 2. split into lines and add row numbers
            String[] lines = cleaned.split("\\r?\\n");
            StringBuilder formatted = new StringBuilder();

            int row = 1;
            for (String line : lines) {
                if (!line.trim().isEmpty()) { // only include non-empty lines
                    // skip empty lines
                    formatted.append(row++).append(". ").append(line.trim()).append("\n");
                }
            }

            // Pass the Buffered Image directly to Tess4J
            return formatted.toString();
```

- Now let's move forward with your Chrome extension project! Here's the complete roadmap:

## Project Structure Overview
### Backend (Spring Boot) ✅ - Already completed

- OCR API endpoints
- Image processing with Tesseract
- Base64 image handling

### Frontend (Chrome Extension) - Next steps:
- Manifest file - Extension configuration
- Popup HTML/CSS - Extension UI
- Content script - Screen capture functionality
- Background script - API communication

### Next Steps for Chrome Extension

```
1. Extension Structure
chrome-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
└── icons/

2. Key Features to Implement:

Screen area selection - Using HTML5 Canvas
- Image capture - Convert to base64
- API integration - Send to your Spring Boot backend
- Text display - Show OCR results
- Copy funcionality - Copy extracted text

3. Technologies Needed:
- Manifest V3 - Latest Chrome extension format
- Canvas API - For screen capture
- Fetch API - Backend communication
- Chrome APIs - activeTab, storage permissions
```

#### date: 30-08-2025

### Optimize OCR performance by reusing Tesseract engine and reducing processing overhead

- Optimizations Made:
    - Engine Reuse: Tesseract engine is now created once and reused (major speed boost)

    - Simplified Processing: Removed complex regex patterns that were slowing down post-processing

    - Disabled Unnecessary Outputs: Turned off HOCR, PDF, and TSV generation

    - Removed Debug Logging: Eliminated console output that adds overhead

Changed: 
```
public String doOcr(File imageFile) throws TesseractException {
        ITesseract engine = newEngine();

        try{
            // Debug step: tryImageIO first
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new RuntimeException("Image could not decode the file. Unsupported Format");
            }
            System.out.println("Loaded image: " + img.getWidth() + "x" + img.getHeight());

            // Get OCR text(raw text)
            String rawText = engine.doOCR(img);

            //Enhanced post-processing
            return processOcrText(rawText);
        }
```
TO:
```
public String doOcr(File imageFile) throws TesseractException {
        if (tesseractEngine == null) {
            tesseractEngine = newEngine();
        }

        try{
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new RuntimeException("Image could not decode the file. Unsupported Format");
            }

            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText);

        }
```

- Optimize Tesseract settings for faster processing

From:
```

        // Fine-tuning for code-like text:
        tesseract.setVariable("tessedit_pageseg_mode", psm);              // PSM
        tesseract.setVariable("tessedit_ocr_engine_mode", oem);          // OEM
        tesseract.setVariable("user_defined_dpi", userDfinedDpi);       // improves accuracy for small text
        tesseract.setVariable("preserve_interword_space", preserveSpaces);

        // Better page segmentation for text blocks
        tesseract.setPageSegMode(6); // uniform block of text
        tesseract.setOcrEngineMode(1); // LSTM only

```
Change To:
```
 // Optimized for speed
        tesseract.setPageSegMode(6); // uniform block of text
        tesseract.setOcrEngineMode(1); // LSTM only
        tesseract.setVariable("tessedit_create_hocr", "0");
        tesseract.setVariable("tessedit_create_pdf", "0");
        tesseract.setVariable("tessedit_create_tsv", "0");

```

### API Improvements Implemented

- Enhanced JSON Response
```
{
  "status": "success",
  "rows": [
    {"line_no": 1, "content": "Hello world"},
    {"line_no": 2, "content": "This is OCR output"}
  ],
  "total_lines": 2,
  "processing_time_ms": 1250
}
```
- Processing Time Tracking
  - Shows actual OCR processing time
  - Useful for performance monitoring

- Better Error Handling
  - Specific status codes: file_too_large, invalid_format, ocr_failed
  - Consistent error response structure

#### File Changes
- Replace simple OcrResponse with enhanced structure including rows and status
- Enhance OcrBase64Request to support language selection and file size limits
- Update OcrService to support language parameter and add processing time tracking
- Update controller to use enhanced response format with timing and file validation

### FrontEnd Part

```
src/main/resources/
├── static/
│   ├── css/style.css  ✅
│   └── js/script.js   ✅
├── templates/
│   └── index.html     ✅
└── application.properties
```
- Added WebController
- Added Thymeleaf Dependency

#### Features:
- Non-Selectable Line Numbers
- Content-Only Copy
- Visual
- Manual copy,Copy button
- Image preview + recapture
- Copy, Download TXT, Download JSON
- Processing time display
- Clean, lightweight UI

### Improvement

- 1.History List Update: 
   - Instead of plain text, each history item will have:
     - Timestamp / Run No.
     - Line Count
     - View Button → Opens a modal (popup) or expandable section showing the extracted text.

- 2.Temporary Storage (per session):
  - Use sessionStorage (not localStorage) so history is stored only until the page is refreshed.
  - This avoids saving anything on the server.

- 3.UI Changes:
  - Add a View History button in each history entry.
  - When clicked → Show a modal with the text that was extracted in that OCR run.

### Flow

- User runs OCR → results displayed + saved in sessionStorage.
- History entry created with View button.
- Clicking View opens a modal showing the exact extracted text.
- Closing modal hides it, but history stays until refresh or "Clear History".