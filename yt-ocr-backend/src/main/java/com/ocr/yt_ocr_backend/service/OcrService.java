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
        return newEngine(language, "auto");
    }

    private ITesseract newEngine(String language, String mode) {
        Tesseract tesseract = new Tesseract();

        String resolvePath = tessdatapath.startsWith("./") || tessdatapath.equals("tessdata") 
            ? System.getProperty("user.dir") + "/tessdata" 
            : tessdatapath;
        tesseract.setDatapath(resolvePath);
        tesseract.setLanguage(language);

        // Mode-specific Tesseract settings
        if ("web".equals(mode) || "image".equals(mode)) {
            tesseract.setPageSegMode(6); // Uniform block of text
            tesseract.setOcrEngineMode(1); // LSTM only for better accuracy
            tesseract.setVariable("tessedit_char_blacklist", "|[]{}~`");
            tesseract.setVariable("tessedit_enable_dict_correction", "1");
            tesseract.setVariable("tessedit_enable_bigram_correction", "1");
            tesseract.setVariable("load_system_dawg", "1");
            tesseract.setVariable("load_freq_dawg", "1");
            if ("image".equals(mode)) {
                tesseract.setVariable("tessedit_char_blacklist", "|[]{}~`@#$%^&*");
                tesseract.setVariable("tessedit_pageseg_mode", "6");
            }
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

    public String doOcr(File imageFile) throws TesseractException {
        return doOcr(imageFile, "eng", "auto");
    }

    public String doOcr(File imageFile, String language) throws TesseractException {
        return doOcr(imageFile, language, "auto");
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

            // Apply mode-specific preprocessing
            img = preprocessImage(img, mode);
            
            String rawText = tesseractEngine.doOCR(img);
            return processOcrText(rawText);

        } catch (Exception e) {
            throw new TesseractException("Image reading failed: " + e.getMessage(), e);
        }
    }

    private String processOcrText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return "";
        }

        System.out.println("DEBUG - Raw OCR text: [" + rawText.replace("\n", "\\n").replace("\r", "\\r") + "]");

        // Split into lines FIRST to preserve newlines
        String[] lines = rawText.split("\n");
        System.out.println("DEBUG - Split into " + lines.length + " lines");
        
        StringBuilder formatted = new StringBuilder();
        
        int row = 1;
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty()) {
                // Apply corrections to individual line
                String correctedLine = correctCommonOcrErrors(line);
                formatted.append(row++).append(". ").append(correctedLine);
                formatted.append("\n");
            }
        }
        
        String result = formatted.toString().trim();
        System.out.println("DEBUG - Final result: [" + result.replace("\n", "\\n") + "]");
        return result;
    }

    private String correctCommonOcrErrors(String text) {
        // Common OCR character mistakes
        text = text.replaceAll("(?i)\\b0(?=\\w)", "O"); // 0 -> O at word start
        text = text.replaceAll("(?i)(?<=\\w)0\\b", "o"); // 0 -> o at word end
        text = text.replaceAll("(?i)\\b1(?=\\w)", "I"); // 1 -> I at word start
        text = text.replaceAll("(?i)(?<=\\w)1(?=\\w)", "l"); // 1 -> l in middle
        text = text.replaceAll("(?i)5(?=\\w)", "S"); // 5 -> S
        text = text.replaceAll("(?i)8(?=\\w)", "B"); // 8 -> B
        text = text.replaceAll("(?i)6(?=\\w)", "G"); // 6 -> G
        text = text.replaceAll("(?i)\\|(?=\\w)", "I"); // | -> I
        text = text.replaceAll("(?i)rn", "m"); // rn -> m
        text = text.replaceAll("(?i)vv", "w"); // vv -> w
        text = text.replaceAll("(?i)\\bthe\\s+the\\b", "the"); // duplicate "the"
        text = text.replaceAll("(?i)\\band\\s+and\\b", "and"); // duplicate "and"
        
        // Image-specific OCR corrections
        text = text.replaceAll("(?i)\\bcl", "d"); // cl -> d
        text = text.replaceAll("(?i)\\bri", "n"); // ri -> n
        text = text.replaceAll("(?i)\\bii", "u"); // ii -> u
        text = text.replaceAll("(?i)\\bnn", "m"); // nn -> m
        text = text.replaceAll("(?i)\\b3(?=\\w)", "E"); // 3 -> E at word start
        text = text.replaceAll("(?i)\\b4(?=\\w)", "A"); // 4 -> A at word start
        text = text.replaceAll("(?i)\\b7(?=\\w)", "T"); // 7 -> T at word start
        text = text.replaceAll("(?i)\\b9(?=\\w)", "g"); // 9 -> g at word start
        text = text.replaceAll("(?i)\\bq(?=\\w)", "g"); // q -> g at word start
        text = text.replaceAll("(?i)\\bcl(?=\\w)", "d"); // cl -> d
        
        // Fix common word patterns
        text = text.replaceAll("(?i)\\bteh\\b", "the");
        text = text.replaceAll("(?i)\\badn\\b", "and");
        text = text.replaceAll("(?i)\\bwith\\b", "with");
        text = text.replaceAll("(?i)\\bfrom\\b", "from");
        text = text.replaceAll("(?i)\\bthis\\b", "this");
        text = text.replaceAll("(?i)\\bthat\\b", "that");
        text = text.replaceAll("(?i)\\bwhen\\b", "when");
        text = text.replaceAll("(?i)\\bwhere\\b", "where");
        text = text.replaceAll("(?i)\\bwhat\\b", "what");
        text = text.replaceAll("(?i)\\bwhich\\b", "which");
        
        // Remove extra spaces and normalize
        text = text.replaceAll("\\s+", " ");
        text = text.replaceAll("\\s*([.!?,:;])\\s*", "$1 ");
        
        return text.trim();
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
        img = removeNoise(img);
        img = adaptiveThreshold(img);
        img = adjustContrast(img, 1.5f);
        img = sharpenImage(img);
        return img;
    }

    private BufferedImage enhanceImageText(BufferedImage img) {
        img = scaleUp(img, 2.0);
        img = toGrayscale(img);
        img = removeNoise(img);
        img = adaptiveThreshold(img);
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

    private BufferedImage removeNoise(BufferedImage img) {
        float[] blurKernel = {
            1f/9f, 1f/9f, 1f/9f,
            1f/9f, 1f/9f, 1f/9f,
            1f/9f, 1f/9f, 1f/9f
        };
        Kernel kernel = new Kernel(3, 3, blurKernel);
        ConvolveOp op = new ConvolveOp(kernel);
        return op.filter(img, null);
    }

    private BufferedImage adaptiveThreshold(BufferedImage img) {
        BufferedImage result = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_BYTE_BINARY);
        
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                int pixel = img.getRGB(x, y) & 0xFF;
                int threshold = getLocalThreshold(img, x, y, 15);
                
                if (pixel > threshold) {
                    result.setRGB(x, y, 0xFFFFFF);
                } else {
                    result.setRGB(x, y, 0x000000);
                }
            }
        }
        return result;
    }

    private int getLocalThreshold(BufferedImage img, int x, int y, int windowSize) {
        int sum = 0;
        int count = 0;
        int halfWindow = windowSize / 2;
        
        for (int dy = -halfWindow; dy <= halfWindow; dy++) {
            for (int dx = -halfWindow; dx <= halfWindow; dx++) {
                int nx = Math.max(0, Math.min(img.getWidth() - 1, x + dx));
                int ny = Math.max(0, Math.min(img.getHeight() - 1, y + dy));
                sum += img.getRGB(nx, ny) & 0xFF;
                count++;
            }
        }
        return sum / count;
    }
}