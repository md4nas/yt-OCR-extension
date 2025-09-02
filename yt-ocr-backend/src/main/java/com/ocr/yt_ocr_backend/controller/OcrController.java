package com.ocr.yt_ocr_backend.controller;

import com.ocr.yt_ocr_backend.dto.OcrBase64Request;
import com.ocr.yt_ocr_backend.dto.OcrResponse;
import com.ocr.yt_ocr_backend.service.OcrService;
import com.ocr.yt_ocr_backend.service.ImageEnhancementService;
import com.ocr.yt_ocr_backend.util.ImageUtils;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Map;

@RestController
@RequestMapping("/api/ocr")
@CrossOrigin(origins = "*")
public class OcrController {
    private final OcrService ocrService;
    private final ImageEnhancementService imageEnhancementService;

    public OcrController(OcrService ocrService, ImageEnhancementService imageEnhancementService) {
        this.ocrService = ocrService;
        this.imageEnhancementService = imageEnhancementService;
    }

    //1. Multipart endpoint
    @PostMapping(value="/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OcrResponse> extractFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "language", defaultValue = "eng") String language) {
        
        long startTime = System.currentTimeMillis();
        File tmp = null;
        
        try {
            // File size validation (10MB limit)
            if (file.getSize() > 10 * 1024 * 1024) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_too_large");
                return ResponseEntity.badRequest().body(response);
            }
            
            // File format validation
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                OcrResponse response = new OcrResponse();
                response.setStatus("invalid_format");
                return ResponseEntity.badRequest().body(response);
            }
            
            tmp = File.createTempFile("ocr_",".img");
            file.transferTo(tmp);
            String text = ocrService.doOcr(tmp, language);
            
            long processingTime = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(new OcrResponse(text, processingTime));
            
        } catch (TesseractException te) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("OCR Failed: " + te.getMessage(), processingTime);
            response.setStatus("ocr_failed");
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("Error: " + e.getMessage(), processingTime);
            response.setStatus("error");
            return ResponseEntity.badRequest().body(response);
        } finally {
            if (tmp != null) tmp.delete();
        }
    }

    //2. Base64 endpoint (this is what extension will call)
    @PostMapping(value = "/base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OcrResponse> extractFromBase64(@RequestBody OcrBase64Request req) {
        long startTime = System.currentTimeMillis();
        File tmp = null;
        
        try {
            tmp = ImageUtils.base64ToTempPng(req.getImageBase64());
            
            // File size check after conversion
            if (tmp.length() > req.getMaxFileSizeMB() * 1024 * 1024) {
                OcrResponse response = new OcrResponse();
                response.setStatus("file_too_large");
                return ResponseEntity.badRequest().body(response);
            }
            
            String text = ocrService.doOcr(tmp, req.getLanguage());
            long processingTime = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(new OcrResponse(text, processingTime));
            
        } catch (TesseractException te) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("OCR Failed: " + te.getMessage(), processingTime);
            response.setStatus("ocr_failed");
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("Error: " + e.getMessage(), processingTime);
            response.setStatus("error");
            return ResponseEntity.badRequest().body(response);
        } finally {
            if (tmp != null) tmp.delete();
        }
    }

    //3. Enhanced OCR endpoint for extension modes
    @PostMapping(value = "/enhanced", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OcrResponse> enhancedOcr(@RequestBody Map<String, String> request) {
        long startTime = System.currentTimeMillis();
        File tmp = null;
        
        try {
            String base64Image = request.get("imageBase64");
            String mode = request.getOrDefault("mode", "web");
            String language = request.getOrDefault("language", "eng");
            
            // Enhance image based on mode
            String enhancedImage = imageEnhancementService.enhanceForOCR(base64Image, mode);
            
            // Convert to temp file for OCR
            tmp = ImageUtils.base64ToTempPng(enhancedImage);
            
            // Perform OCR
            String text = ocrService.doOcr(tmp, language);
            
            long processingTime = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(new OcrResponse(text, processingTime));
            
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            OcrResponse response = new OcrResponse("Error: " + e.getMessage(), processingTime);
            response.setStatus("error");
            return ResponseEntity.badRequest().body(response);
        } finally {
            if (tmp != null) tmp.delete();
        }
    }
}