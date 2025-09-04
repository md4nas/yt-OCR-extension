package com.ocr.yt_ocr_backend.util;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.RescaleOp;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.util.Base64;

public class ImageUtils {

    // Accept either raw data base64 or data url; return a temp file (PNG)
    public static File base64ToTempPng(String base64) throws IOException {
        String cleaned = base64;
        int comma = base64.indexOf(',');
        if(comma != -1) {
            cleaned = cleaned.substring(comma + 1); // strip "data: image/...;base64"
        }
        byte[] bytes = Base64.getDecoder().decode(cleaned);
        
        try (ByteArrayInputStream bis = new ByteArrayInputStream(bytes)) {
            BufferedImage img = ImageIO.read(bis);
            if (img == null) throw new IOException("Invalid image data");

            BufferedImage processed = preprocess(img);

            File tmp = File.createTempFile("ocr_", ".png");
            ImageIO.write(processed, "png", tmp);
            return tmp;
        }
    }

    // Basic image preprocessing for better OCR
    private static BufferedImage preprocess(BufferedImage src) {
      //1. Upscale 2x (bilinear)
        int w = src.getWidth() * 2;
        int h = src.getHeight() * 2;
        BufferedImage scaled = new BufferedImage(w,h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = scaled.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.drawImage(src, 0, 0, w, h, null);
        } finally {
            g.dispose();
        }

        //2. convert to grayscale
        BufferedImage gray = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_GRAY);
        Graphics g2 = gray.getGraphics();
        try {
            g2.drawImage(scaled, 0, 0, null);
        } finally {
            g2.dispose();
        }

        //3. Light contrast stretch (normalize)
        RescaleOp op = new RescaleOp(1.5f, 10, null); // scale offset
        BufferedImage contrasted = new BufferedImage(w,h, BufferedImage.TYPE_BYTE_GRAY);
        op.filter(gray, contrasted);

        return contrasted;
    }
}
