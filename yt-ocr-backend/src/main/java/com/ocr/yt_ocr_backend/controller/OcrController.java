package com.ocr.yt_ocr_backend.controller;

import com.ocr.yt_ocr_backend.dto.OcrBase64Request;
import com.ocr.yt_ocr_backend.dto.OcrResponse;
import com.ocr.yt_ocr_backend.service.OcrService;
import com.ocr.yt_ocr_backend.util.ImageUtils;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {
    private final OcrService ocrService;

    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    //1. Multipart endpoint
    @PostMapping(value="/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OcrResponse> exteactFromFile(@RequestParam("file") MultipartFile file) {
        File tmp = null;
        try {
            tmp = File.createTempFile("ocr_",".img");
            file.transferTo(tmp);
            String text = ocrService.doOcr(tmp);
            return ResponseEntity.ok(new OcrResponse(text));
        }
        catch (TesseractException te) {
            return ResponseEntity.badRequest().body(new OcrResponse("OCR Failed: " + te.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new OcrResponse("Error: " + e.getMessage()));
        } finally {
            if (tmp != null) tmp.delete();
        }
    }

    //2. Base64 endpoint (this is what extension will call)
    @PostMapping(value = "/base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OcrResponse> extractFromBase64(@RequestBody OcrBase64Request req) {
        File tmp = null;
        try {
            tmp = ImageUtils.base64ToTempPng(req.getImageBase64());
            String text = ocrService.doOcr(tmp);
            return ResponseEntity.ok(new OcrResponse(text));
        }
        catch (TesseractException te) {
            return ResponseEntity.badRequest().body(new OcrResponse("OCR Failed: " + te.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new OcrResponse("Error: " + e.getMessage()));
        } finally {
            if (tmp != null) tmp.delete();
        }
    }
}
