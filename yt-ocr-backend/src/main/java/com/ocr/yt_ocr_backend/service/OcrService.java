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

    @Value("${ocr.char-whitelist:}")
    private String charWhitelist;

    private ITesseract tesseractEngine;
    private String currentLanguage;

    private ITesseract newEngine(String language, String mode) {
        Tesseract tesseract = new Tesseract();

        String resolvePath = tessdatapath.startsWith("./") || tessdatapath.equals("tessdata") 
            ? System.getProperty("user.dir") + "/tessdata" 
            : tessdatapath;
        tesseract.setDatapath(resolvePath);
        tesseract.setLanguage(language);

        // Optimize for code recognition
        if ("code".equals(mode)) {
            tesseract.setPageSegMode(6); // Uniform block of text
            tesseract.setOcrEngineMode(1); // LSTM only for better accuracy
            
            // Code-specific settings
            tesseract.setVariable("tessedit_char_blacklist", ""); // Allow all characters
            tesseract.setVariable("preserve_interword_spaces", "1");
            tesseract.setVariable("tessedit_enable_dict_correction", "0"); // Disable dictionary for code
            tesseract.setVariable("tessedit_enable_bigram_correction", "0");
            tesseract.setVariable("load_system_dawg", "0"); // Disable word lists
            tesseract.setVariable("load_freq_dawg", "0");
            tesseract.setVariable("load_punc_dawg", "0");
            tesseract.setVariable("load_number_dawg", "0");
            tesseract.setVariable("load_unambig_dawg", "0");
            tesseract.setVariable("load_bigram_dawg", "0");
            tesseract.setVariable("load_fixed_length_dawgs", "0");
        } else {
            tesseract.setPageSegMode(Integer.parseInt(psm));
            tesseract.setOcrEngineMode(Integer.parseInt(oem));
        }

        tesseract.setVariable("tessedit_create_hocr", "0");
        tesseract.setVariable("tessedit_create_pdf", "0");
        tesseract.setVariable("tessedit_create_tsv", "0");

        if (charWhitelist != null && !charWhitelist.isBlank()){
            tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
        }
        return tesseract;
    }

    public String doOcr(File imageFile, String language, String mode) throws TesseractException {
        if (tesseractEngine == null || !language.equals(currentLanguage)) {
            tesseractEngine = newEngine(language, mode);
            currentLanguage = language;
        }

        try{
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new TesseractException("Image could not decode the file. Unsupported Format");
            }

            // Apply preprocessing for better code recognition
            if ("code".equals(mode)) {
                img = preprocessForCode(img);
            }

            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText, mode);

        } catch (Exception e) {
            throw new TesseractException("Image reading failed: " + e.getMessage(), e);
        }
    }
    
    private BufferedImage preprocessForCode(BufferedImage original) {
        // Scale up for better character recognition
        int newWidth = original.getWidth() * 2;
        int newHeight = original.getHeight() * 2;
        
        BufferedImage scaled = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = scaled.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.drawImage(original, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        
        // Convert to grayscale and enhance contrast
        BufferedImage processed = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = processed.createGraphics();
        g.drawImage(scaled, 0, 0, null);
        g.dispose();
        
        return processed;
    }

    private String processOcrText(String rawText, String mode) {
        return processOcrText(rawText);
    }
    
    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "";
        }

        // Fix literal \n in text and normalize line breaks
        rawText = rawText.replace("\\n", "\n");
        rawText = rawText.replace("\\r\\n", "\n");
        rawText = rawText.replace("\\r", "\n");
        
        // Also handle cases where OCR reads \n as literal text
        rawText = rawText.replace(" \n ", "\n");
        rawText = rawText.replace("\n", "\n");
        rawText = rawText.replace("| ", "\n"); // Handle | as line separator
        
        String[] lines = rawText.split("\n");
        
        StringBuilder formatted = new StringBuilder();
        
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty()) {
                String correctedLine = correctCommonOcrErrors(line);
                formatted.append(correctedLine).append("\n");
            }
        }
        
        String result = formatted.toString().trim();
        return result;
    }

    private String correctCommonOcrErrors(String text) {
        // Code-specific OCR corrections
        
        // Fix common Java/programming symbols
        text = text.replaceAll("\\b1(?=\\w)", "I"); // 1 -> I at word start
        text = text.replaceAll("(?<=\\w)1(?=\\w)", "l"); // 1 -> l in middle
        text = text.replaceAll("\\b0(?=\\w)", "O"); // 0 -> O at word start
        text = text.replaceAll("(?<=\\w)0\\b", "o"); // 0 -> o at word end
        
        // Fix lambda arrows and operators
        text = text.replaceAll("\\s*-\\s*>\\s*", " -> "); // Fix lambda arrows
        text = text.replaceAll("\\s*=\\s*>\\s*", " -> "); // = > to ->
        text = text.replaceAll("\\s*—\\s*>\\s*", " -> "); // em dash to ->
        text = text.replaceAll("\\s*–\\s*>\\s*", " -> "); // en dash to ->
        
        // Fix generic brackets
        text = text.replaceAll("\\s*<\\s*", "<"); // Fix < spacing
        text = text.replaceAll("\\s*>\\s*", ">"); // Fix > spacing
        text = text.replaceAll("\\(\\s*", "("); // Fix ( spacing
        text = text.replaceAll("\\s*\\)", ")"); // Fix ) spacing
        
        // Fix common programming keywords
        text = text.replaceAll("\\bpubIic\\b", "public");
        text = text.replaceAll("\\bstalic\\b", "static");
        text = text.replaceAll("\\bvold\\b", "void");
        text = text.replaceAll("\\bmalN\\b", "main");
        text = text.replaceAll("\\bMaln\\b", "Main");
        text = text.replaceAll("\\bSysteM\\b", "System");
        text = text.replaceAll("\\bprintln\\b", "println");
        text = text.replaceAll("\\bFunctlon\\b", "Function");
        text = text.replaceAll("\\blnteger\\b", "Integer");
        text = text.replaceAll("\\bapply\\b", "apply");
        text = text.replaceAll("\\bandThen\\b", "andThen");
        
        // Fix common OCR mistakes in code
        text = text.replaceAll("\\brn\\b", "m"); // rn -> m
        text = text.replaceAll("\\bvv\\b", "w"); // vv -> w
        text = text.replaceAll("\\b\\|\\b", "I"); // | -> I
        text = text.replaceAll("\\b5\\b", "S"); // 5 -> S in context
        text = text.replaceAll("\\b8\\b", "B"); // 8 -> B in context
        
        // Fix method calls and dots
        text = text.replaceAll("\\s*\\.\\s*", "."); // Fix dot spacing
        text = text.replaceAll("\\s*;\\s*", ";"); // Fix semicolon spacing
        text = text.replaceAll("\\s*,\\s*", ", "); // Fix comma spacing
        
        // Fix indentation (preserve leading spaces but normalize)
        text = text.replaceAll("^\\s+", "    "); // Normalize indentation to 4 spaces
        
        // Remove extra spaces but preserve single spaces
        text = text.replaceAll(" +", " ");
        
        return text.trim();
    }
}