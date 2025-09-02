package com.ocr.yt_ocr_backend.service;

import org.springframework.stereotype.Service;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@Service
public class ImageEnhancementService {

    public String enhanceForOCR(String base64Image, String mode) throws IOException {
        String imageData = base64Image.substring(base64Image.indexOf(",") + 1);
        byte[] imageBytes = Base64.getDecoder().decode(imageData);
        BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

        BufferedImage enhancedImage = switch (mode.toLowerCase()) {
            case "video" -> enhanceVideoFrame(originalImage);
            case "image" -> enhanceImageText(originalImage);
            case "web" -> enhanceWebText(originalImage);
            default -> originalImage;
        };

        return convertToBase64(enhancedImage);
    }

    private BufferedImage enhanceVideoFrame(BufferedImage image) {
        // Minimal processing - JavaScript already handles scaling + contrast
        return image;
    }

    private BufferedImage enhanceImageText(BufferedImage image) {
        // Minimal processing - JavaScript already handles scaling + contrast
        return image;
    }

    private BufferedImage enhanceWebText(BufferedImage image) {
        // Minimal processing - JavaScript already handles scaling + contrast
        return image;
    }

    private BufferedImage scaleImage(BufferedImage image, double factor) {
        int newWidth = (int) (image.getWidth() * factor);
        int newHeight = (int) (image.getHeight() * factor);
        
        BufferedImage scaled = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = scaled.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.drawImage(image, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        
        return scaled;
    }

    private BufferedImage applyHighContrast(BufferedImage image, int threshold) {
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                Color pixel = new Color(image.getRGB(x, y));
                int gray = (int) (pixel.getRed() * 0.299 + pixel.getGreen() * 0.587 + pixel.getBlue() * 0.114);
                int newValue = gray > threshold ? 255 : 0;
                Color newColor = new Color(newValue, newValue, newValue);
                result.setRGB(x, y, newColor.getRGB());
            }
        }
        
        return result;
    }

    private BufferedImage applyAdaptiveThreshold(BufferedImage image) {
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                Color pixel = new Color(image.getRGB(x, y));
                int gray = (int) (pixel.getRed() * 0.299 + pixel.getGreen() * 0.587 + pixel.getBlue() * 0.114);
                int threshold = gray > 128 ? 255 : 0;
                Color newColor = new Color(threshold, threshold, threshold);
                result.setRGB(x, y, newColor.getRGB());
            }
        }
        
        return result;
    }

    private BufferedImage applyContrastEnhancement(BufferedImage image, float factor) {
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                Color pixel = new Color(image.getRGB(x, y));
                int gray = (int) (pixel.getRed() * 0.299 + pixel.getGreen() * 0.587 + pixel.getBlue() * 0.114);
                int enhanced = Math.max(0, Math.min(255, (int) ((gray - 128) * factor + 128)));
                Color newColor = new Color(enhanced, enhanced, enhanced);
                result.setRGB(x, y, newColor.getRGB());
            }
        }
        
        return result;
    }

    private BufferedImage applyDenoising(BufferedImage image) {
        // Simple denoising filter
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        for (int y = 1; y < image.getHeight() - 1; y++) {
            for (int x = 1; x < image.getWidth() - 1; x++) {
                int sum = 0;
                for (int dy = -1; dy <= 1; dy++) {
                    for (int dx = -1; dx <= 1; dx++) {
                        Color pixel = new Color(image.getRGB(x + dx, y + dy));
                        sum += (pixel.getRed() + pixel.getGreen() + pixel.getBlue()) / 3;
                    }
                }
                int avg = sum / 9;
                Color newColor = new Color(avg, avg, avg);
                result.setRGB(x, y, newColor.getRGB());
            }
        }
        
        return result;
    }
    
    private BufferedImage applySharpen(BufferedImage image) {
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        // Sharpening kernel
        float[] kernel = {
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        };
        
        for (int y = 1; y < image.getHeight() - 1; y++) {
            for (int x = 1; x < image.getWidth() - 1; x++) {
                float sum = 0;
                int idx = 0;
                
                for (int dy = -1; dy <= 1; dy++) {
                    for (int dx = -1; dx <= 1; dx++) {
                        Color pixel = new Color(image.getRGB(x + dx, y + dy));
                        int gray = (int) (pixel.getRed() * 0.299 + pixel.getGreen() * 0.587 + pixel.getBlue() * 0.114);
                        sum += gray * kernel[idx++];
                    }
                }
                
                int sharpened = Math.max(0, Math.min(255, (int) sum));
                Color newColor = new Color(sharpened, sharpened, sharpened);
                result.setRGB(x, y, newColor.getRGB());
            }
        }
        
        return result;
    }
    
    private BufferedImage convertToGrayscale(BufferedImage image) {
        BufferedImage result = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                Color pixel = new Color(image.getRGB(x, y));
                int gray = (int) (pixel.getRed() * 0.299 + pixel.getGreen() * 0.587 + pixel.getBlue() * 0.114);
                Color grayColor = new Color(gray, gray, gray);
                result.setRGB(x, y, grayColor.getRGB());
            }
        }
        
        return result;
    }
    
    private String convertToBase64(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        byte[] imageBytes = baos.toByteArray();
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
    }
}