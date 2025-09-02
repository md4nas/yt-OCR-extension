package com.ocr.yt_ocr_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;

@Service
public class OcrService {

    @Value("${ocr.tessdata-path}")
    private String tessdatapath;

    @Value("${ocr.lang:eng}")
    private String lang;

    @Value("${ocr.psm:6}")
    private String psm;

    @Value("${ocr.oem:1}")
    private String oem;

    @Value("${ocr.user-defined-dpi:300}")
    private String userDfinedDpi;

    @Value("${ocr.preserve-interword-spaces:1}")
    private String preserveSpaces;

    @Value("${ocr.char-whitelist:}")
    private String charWhitelist;

    private ITesseract tesseractEngine;
    private String currentLanguage;


    private ITesseract newEngine() {
        return newEngine(lang);
    }

    private ITesseract newEngine(String language) {
        Tesseract tesseract = new Tesseract();

        String resolvePath;
        if (tessdatapath.equals("tessdata") || tessdatapath.startsWith("./")) {
            resolvePath = System.getProperty("user.dir") + "/yt-ocr-backend/tessdata";
        } else {
            resolvePath = tessdatapath;
        }
        tesseract.setDatapath(resolvePath);
        tesseract.setLanguage(language);

        // High accuracy LSTM-only settings
        tesseract.setPageSegMode(6); // Uniform block of text (most reliable)
        tesseract.setOcrEngineMode(1); // LSTM only (avoids legacy engine issues)
        
        // Quality settings for LSTM engine
        tesseract.setTessVariable("preserve_interword_spaces", "1");
        tesseract.setTessVariable("tessedit_char_blacklist", "");
        tesseract.setTessVariable("tessedit_write_images", "0");
        tesseract.setTessVariable("user_defined_dpi", "300");
        
        // Disable outputs for focus
        tesseract.setVariable("tessedit_create_hocr", "0");
        tesseract.setVariable("tessedit_create_pdf", "0");
        tesseract.setVariable("tessedit_create_tsv", "0");

        // Allow all characters for maximum detection
        if (charWhitelist != null && !charWhitelist.isBlank()){
            tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
        }
        return tesseract;
    }

    public String doOcr(File imageFile) throws TesseractException {
        return doOcr(imageFile, "eng");
    }

    public String doOcr(File imageFile, String language) throws TesseractException {
        if (tesseractEngine == null || !language.equals(currentLanguage)) {
            tesseractEngine = newEngine(language);
            currentLanguage = language;
        }

        try{
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new RuntimeException("Image could not decode the file. Unsupported Format");
            }

            // Keep original image quality for better accuracy
            
            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText);

        }catch (Exception e){
            throw new RuntimeException("Image reading failed: " + e.getMessage());
        }
    }

    // Simple text processing like original working version
    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "";
        }

        // Clean up spacing and normalize
        String cleaned = rawText.replaceAll("[ ]{2,}", " ").trim();
        
        // Split into lines and add numbering
        String[] lines = cleaned.split("\\r?\\n");
        StringBuilder formatted = new StringBuilder();
        
        int row = 1;
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty()) {
                formatted.append(row++).append(". ").append(line);
                // Add proper line break (not literal \n)
                if (row <= lines.length) {
                    formatted.append(System.lineSeparator());
                }
            }
        }
        
        return formatted.toString();
    }

    private String processLine(String line) {
        if (line.isEmpty()) {
            return "";
        }

        // Add spaces before capital letter that follow Lowercase (likely word boundaries)
        line = line.replaceAll("(?<=[a-z])(?=[A-Z])", " ");

        // Add spaces around numbers that are likely saprated elements
        line = line.replaceAll("(?<=[a-zA-Z])(?=\\d)", " ");
        line = line.replaceAll("(?<=\\d)(?=[a-zA-Z])", " ");

        // Fix common punctuation issues
        line = line.replaceAll("\\s*([.!?,:;])\\s*", "$1 ");

        // Clean up multiple spaces
        line = line.replaceAll("\\s+", " ").trim();

        return line;
    }


}
