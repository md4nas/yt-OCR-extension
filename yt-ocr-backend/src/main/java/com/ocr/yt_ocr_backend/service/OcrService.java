package com.ocr.yt_ocr_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
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


    private  ITesseract newEngine(){
        Tesseract tesseract = new Tesseract();

        // location of traineddata files :
        String resolvePath;
        if (tessdatapath.equals("tessdata") || tessdatapath.startsWith("./")) {
            resolvePath = System.getProperty("user.dir") + "/yt-ocr-backend/tessdata";
        } else {
            resolvePath = tessdatapath;
        }
        tesseract.setDatapath(resolvePath);

        // Language, e.g. "eng"
        tesseract.setLanguage(lang);

        // Fine-tuning for code-like text:
        tesseract.setVariable("tessedit_pageseg_mode", psm);              // PSM
        tesseract.setVariable("tessedit_ocr_engine_mode", oem);          // OEM
        tesseract.setVariable("user_defined_dpi", userDfinedDpi);       // improves accuracy for small text
        tesseract.setVariable("preserve_interword_space", preserveSpaces);

        // Better page segmentation for text blocks
        tesseract.setPageSegMode(6); // uniform block of text
        tesseract.setOcrEngineMode(1); // LSTM only

        if (charWhitelist != null && !charWhitelist.isBlank()){
            tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
        }
        return tesseract;
    }

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

        }catch (Exception e){
            throw new RuntimeException("Image reading failed: " + e.getMessage());
        }
    }

    // Post-processing of OCR text
    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "No text detected";
        }

        // Enhanced text processing with aggressive word separation
        String processed = rawText
                .replaceAll("[|]", "I")
                .replaceAll("(?<=[a-z])(?=[A-Z])", " ")  // Space before capitals
                .replaceAll("(?<=[a-z])(?=\\d)", " ")     // Space before numbers
                .replaceAll("(?<=\\d)(?=[a-zA-Z])", " ")  // Space after numbers
                .replaceAll("([.!?])([A-Z])", "$1 $2")   // Space after sentence endings
                // More aggressive word separation
                .replaceAll("([a-z])([a-z]{2,}[A-Z])", "$1 $2")  // Split long concatenated words
                .replaceAll("(but)([a-z])", "$1 $2")      // Fix 'but' concatenations
                .replaceAll("(and)([a-z])", "$1 $2")      // Fix 'and' concatenations
                .replaceAll("(the)([a-z])", "$1 $2")      // Fix 'the' concatenations
                .replaceAll("(with)([a-z])", "$1 $2")     // Fix 'with' concatenations
                .replaceAll("(that)([a-z])", "$1 $2")     // Fix 'that' concatenations
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


}
