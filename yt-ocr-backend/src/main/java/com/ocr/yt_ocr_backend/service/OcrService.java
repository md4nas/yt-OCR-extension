package com.ocr.yt_ocr_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
        // Where thaineddata files live:
        tesseract.setDatapath(tessdatapath);
        // Language, e.g. "eng"
        tesseract.setLanguage(lang);

        // Fine-tuning for code-like text:
        tesseract.setVariable("tessedit_pageseg_mode", psm);              // PSM
        tesseract.setVariable("tessedit_ocr_engine_mode", oem);          // OEM
        tesseract.setVariable("user_defined_dpi", userDfinedDpi);       // improves accuracy for small text
        tesseract.setVariable("preserve_interword_space", preserveSpaces);

        if (charWhitelist != null && !charWhitelist.isBlank()){
            tesseract.setTessVariable("tessedit_char_whitelist", charWhitelist);
        }
        return tesseract;
    }

    public String doOcr(File imageFile) throws TesseractException {
        ITesseract engine = newEngine();
        return engine.doOCR(imageFile);
    }

}
