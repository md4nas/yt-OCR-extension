package com.ocr.yt_ocr_backend.controller;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {

    @PostMapping("/extract")
    public ResponseEntity<String> extractText(@RequestParam("file")MultipartFile file) {
        try {
            // saving file temporely
            File convFile = File.createTempFile("ocr", ".png");
            file.transferTo(convFile);

            //OCR process
            ITesseract tesseract = new Tesseract();
            tesseract.setDatapath("tessdata"); // folder where trained data is kept
            tesseract.setLanguage("eng");

            String result = tesseract.doOCR(convFile);

            return ResponseEntity.ok(result);
        }
        catch (TesseractException e) {
            return ResponseEntity.status(500).body("OCR failed: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
