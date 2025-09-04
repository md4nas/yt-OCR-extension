package com.ocr.yt_ocr_backend.controller;

import com.ocr.yt_ocr_backend.dto.OcrBase64Request;
import com.ocr.yt_ocr_backend.dto.OcrResponse;
import com.ocr.yt_ocr_backend.service.OcrService;
import com.ocr.yt_ocr_backend.util.ImageUtils;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/ocr")
@CrossOrigin(origins = "*")
public class OcrController {
    private final OcrService ocrService;
    
    @Value("${app.upload.max-size:5242880}")
    private long maxFileSize;
    
    private final List<String> allowedContentTypes = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/webp"
    );

    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    private boolean isValidImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && allowedContentTypes.contains(contentType.toLowerCase());
    }

    private String sanitizeInput(String input) {
        if (input == null) return "eng";
        return input.replaceAll("[^a-zA-Z]", "");
    }

    @PostMapping(value="/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OcrResponse> extractFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "language", defaultValue = "eng") String language,
            @RequestParam(value = "mode", defaultValue = "auto") String mode) {
        
        long startTime = System.currentTimeMillis();
        File tmp = null;
        
        try {
            if (file.isEmpty()) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_empty");
                return ResponseEntity.badRequest().body(response);
            }

            if (file.getSize() > maxFileSize) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_too_large");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (!isValidImageFile(file)) {
                OcrResponse response = new OcrResponse();
                response.setStatus("invalid_format");
                return ResponseEntity.badRequest().body(response);
            }
            
            tmp = File.createTempFile("ocr_", ".img");
            file.transferTo(tmp);
            
            String sanitizedLanguage = sanitizeInput(language);
            String sanitizedMode = sanitizeInput(mode);
            String text = ocrService.doOcr(tmp, sanitizedLanguage, sanitizedMode);
            
            long processingTime = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(new OcrResponse(text, processingTime));
            
        } catch (TesseractException te) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("OCR processing failed", processingTime);
            response.setStatus("ocr_failed");
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("Processing error occurred", processingTime);
            response.setStatus("error");
            return ResponseEntity.badRequest().body(response);
        } finally {
            if (tmp != null) tmp.delete();
        }
    }

    @PostMapping(value = "/base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OcrResponse> extractFromBase64(@RequestBody OcrBase64Request req) {
        long startTime = System.currentTimeMillis();
        File tmp = null;
        
        try {
            if (req.getImageBase64() == null || req.getImageBase64().trim().isEmpty()) {
                OcrResponse response = new OcrResponse();
                response.setStatus("invalid_base64");
                return ResponseEntity.badRequest().body(response);
            }

            if (req.getImageBase64().length() > maxFileSize * 2) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_too_large");
                return ResponseEntity.badRequest().body(response);
            }
            
            tmp = ImageUtils.base64ToTempPng(req.getImageBase64());
            
            if (tmp.length() > maxFileSize) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_too_large");
                return ResponseEntity.badRequest().body(response);
            }
            
            String sanitizedLanguage = sanitizeInput(req.getLanguage());
            String sanitizedMode = sanitizeInput(req.getMode());
            String text = ocrService.doOcr(tmp, sanitizedLanguage, sanitizedMode);
            long processingTime = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(new OcrResponse(text, processingTime));
            
        } catch (TesseractException te) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("OCR processing failed", processingTime);
            response.setStatus("ocr_failed");
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("Processing error occurred", processingTime);
            response.setStatus("error");
            return ResponseEntity.badRequest().body(response);
        } finally {
            if (tmp != null) tmp.delete();
        }
    }
}