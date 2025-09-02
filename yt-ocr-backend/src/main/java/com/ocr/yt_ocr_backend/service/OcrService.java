package com.ocr.yt_ocr_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
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
    private String userDefinedDpi;

    @Value("${ocr.max-width:3000}")
    private int maxWidth;

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

        String resolvePath = tessdatapath.startsWith("./") || tessdatapath.equals("tessdata") 
            ? System.getProperty("user.dir") + "/tessdata" 
            : tessdatapath;
        tesseract.setDatapath(resolvePath);
        tesseract.setLanguage(language);

        // Use configured settings for accuracy and speed
        tesseract.setPageSegMode(Integer.parseInt(psm));
        tesseract.setOcrEngineMode(Integer.parseInt(oem));
        tesseract.setVariable("tessedit_create_hocr", "0");
        tesseract.setVariable("tessedit_create_pdf", "0");
        tesseract.setVariable("tessedit_create_tsv", "0");

        if (charWhitelist != null && !charWhitelist.isBlank()){
            tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
        }
        return tesseract;
    }

    public String doOcr(File imageFile) throws TesseractException {
        return doOcr(imageFile, "eng", "auto");
    }

    public String doOcr(File imageFile, String language) throws TesseractException {
        return doOcr(imageFile, language, "auto");
    }

    public String doOcr(File imageFile, String language, String mode) throws TesseractException {
        if (tesseractEngine == null || !language.equals(currentLanguage)) {
            tesseractEngine = newEngine(language);
            currentLanguage = language;
        }

        try{
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new TesseractException("Image could not decode the file. Unsupported Format");
            }

            // Apply mode-specific preprocessing
            img = preprocessImage(img, mode);
            
            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText);

        } catch (Exception e) {
            throw new TesseractException("Image reading failed: " + e.getMessage(), e);
        }
    }

    // Post-processing of OCR text
    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "No text detected";
        }

        // Clean up spacing and normalize
        String cleaned = rawText.replaceAll("[ ]{2,}", " ").trim();
        String[] lines = cleaned.split("\\r?\\n");
        StringBuilder formatted = new StringBuilder();


        int row = 1;
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty()) {
                formatted.append(row++).append(". ").append(line);
                // Add line separator except for last line
                if (row - 1 < lines.length) {
                    formatted.append(System.lineSeparator());
                }
            }
        }

        return formatted.toString();
    }



    private BufferedImage preprocessImage(BufferedImage original, String mode) {
        BufferedImage processed = resizeIfNeeded(original);
        
        switch (mode.toLowerCase()) {
            case "web":
                processed = enhanceWebText(processed);
                break;
            case "image":
                processed = enhanceImageText(processed);
                break;
            case "video":
                processed = enhanceVideoText(processed);
                break;
            default:
                processed = autoEnhance(processed);
        }
        
        return processed;
    }

    private BufferedImage resizeIfNeeded(BufferedImage original) {
        int width = original.getWidth();
        int height = original.getHeight();
        
        if (width > maxWidth) {
            double scale = (double) maxWidth / width;
            width = maxWidth;
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

    private BufferedImage enhanceWebText(BufferedImage img) {
        img = toGrayscale(img);
        img = adjustContrast(img, 1.5f);
        img = sharpenImage(img);
        return img;
    }

    private BufferedImage enhanceImageText(BufferedImage img) {
        img = scaleUp(img, 2.0);
        img = toGrayscale(img);
        img = binarize(img);
        return img;
    }

    private BufferedImage enhanceVideoText(BufferedImage img) {
        img = toGrayscale(img);
        img = invertColors(img);
        img = adjustContrast(img, 1.8f);
        img = sharpenImage(img);
        return img;
    }

    private BufferedImage autoEnhance(BufferedImage img) {
        img = toGrayscale(img);
        img = adjustContrast(img, 1.3f);
        return img;
    }

    private BufferedImage toGrayscale(BufferedImage original) {
        BufferedImage gray = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g2d = gray.createGraphics();
        g2d.drawImage(original, 0, 0, null);
        g2d.dispose();
        return gray;
    }

    private BufferedImage adjustContrast(BufferedImage img, float factor) {
        BufferedImage enhanced = new BufferedImage(img.getWidth(), img.getHeight(), img.getType());
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                int rgb = img.getRGB(x, y);
                int r = Math.min(255, Math.max(0, (int) (((rgb >> 16) & 0xFF) * factor)));
                int g = Math.min(255, Math.max(0, (int) (((rgb >> 8) & 0xFF) * factor)));
                int b = Math.min(255, Math.max(0, (int) ((rgb & 0xFF) * factor)));
                enhanced.setRGB(x, y, (r << 16) | (g << 8) | b);
            }
        }
        return enhanced;
    }

    private BufferedImage binarize(BufferedImage img) {
        BufferedImage binary = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_BYTE_BINARY);
        Graphics2D g2d = binary.createGraphics();
        g2d.drawImage(img, 0, 0, null);
        g2d.dispose();
        return binary;
    }

    private BufferedImage invertColors(BufferedImage img) {
        BufferedImage inverted = new BufferedImage(img.getWidth(), img.getHeight(), img.getType());
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                int rgb = img.getRGB(x, y);
                int r = 255 - ((rgb >> 16) & 0xFF);
                int g = 255 - ((rgb >> 8) & 0xFF);
                int b = 255 - (rgb & 0xFF);
                inverted.setRGB(x, y, (r << 16) | (g << 8) | b);
            }
        }
        return inverted;
    }

    private BufferedImage sharpenImage(BufferedImage img) {
        float[] sharpenKernel = {
            0f, -1f, 0f,
            -1f, 5f, -1f,
            0f, -1f, 0f
        };
        Kernel kernel = new Kernel(3, 3, sharpenKernel);
        ConvolveOp op = new ConvolveOp(kernel);
        return op.filter(img, null);
    }

    private BufferedImage scaleUp(BufferedImage img, double factor) {
        int newWidth = (int) (img.getWidth() * factor);
        int newHeight = (int) (img.getHeight() * factor);
        BufferedImage scaled = new BufferedImage(newWidth, newHeight, img.getType());
        Graphics2D g2d = scaled.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.drawImage(img, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        return scaled;
    }
}
