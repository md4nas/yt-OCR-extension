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

        // Balanced settings for accuracy and speed
        tesseract.setPageSegMode(6);
        tesseract.setOcrEngineMode(1);
        tesseract.setVariable("tessedit_create_hocr", "0");
        tesseract.setVariable("tessedit_create_pdf", "0");
        tesseract.setVariable("tessedit_create_tsv", "0");

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

            // Optimize image for faster processing
            img = optimizeImage(img);
            
            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText);

        }catch (Exception e){
            throw new RuntimeException("Image reading failed: " + e.getMessage());
        }
    }

    // Post-processing of OCR text
    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "No text detected";
        }

        // Simplified processing for speed
        String processed = rawText
                .replaceAll("[|]", "I")
                .replaceAll("(?<=[a-z])(?=[A-Z])", " ")
                .replaceAll("\\s+", " ")
                .trim();

        // Split into sentences for better readability
        String[] sentences = processed.split("(?<=[.!?])\\s+");
        StringBuilder sb = new StringBuilder();

        int lineNumber = 1;
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (!sentence.isEmpty() && sentence.length() > 3) {
                sb.append(lineNumber++).append(". ").append(sentence).append("\n");
            }
        }

        return sb.toString();
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

    private BufferedImage optimizeImage(BufferedImage original) {
        // Only resize if extremely large (over 3000px width)
        int width = original.getWidth();
        int height = original.getHeight();
        
        if (width > 3000) {
            double scale = 3000.0 / width;
            width = 3000;
            height = (int) (height * scale);
            
            BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = resized.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g2d.drawImage(original, 0, 0, width, height, null);
            g2d.dispose();
            return resized;
        }
        
        return original;
    }
}
