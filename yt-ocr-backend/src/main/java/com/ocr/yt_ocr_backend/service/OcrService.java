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
        System.out.println("using tessdata path " + resolvePath);

        // Language, e.g. "eng"
        tesseract.setLanguage(lang);

        // Fine-tuning for code-like text:
        tesseract.setVariable("tessedit_pageseg_mode", psm);              // PSM
        tesseract.setVariable("tessedit_ocr_engine_mode", oem);          // OEM
        tesseract.setVariable("user_defined_dpi", userDfinedDpi);       // improves accuracy for small text
        tesseract.setVariable("preserve_interword_space", preserveSpaces);

        // Page Segmentation Mode
        tesseract.setPageSegMode(1); // automatic page segmentation
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

            // Get OCR text
            String rawText = engine.doOCR(img);

            // --- POST PROCESSING SECTION !!! ---
            // Normalize spacing: replace multiple spaces with a single space
            String cleaned = rawText.replaceAll("[ ]{2,}", " ");

            //Preserve line breaks and add new row number
            String[] lines = cleaned.split("\\r?\\n");
            StringBuilder formatted = new StringBuilder();

            int row = 1;
            for (String line : lines) {
                if (line.trim().isEmpty()){
                    // skip empty lines
                    formatted.append(row).append(". ").append(line.trim()).append("\n");
                    row++;
                }
            }

            // Pass the Buffered Image directly to Tess4J
            return engine.doOCR(img);
        }catch (Exception e){
            throw new RuntimeException("Image reading failed: " + e.getMessage());
        }
    }

}
