## date: 23-08-2025, 7:35pm

### controller/OcrController.java

define:
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

## date: 24-08-2025 12:03 AM

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