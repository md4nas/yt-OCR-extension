package com.ocr.yt_ocr_backend.dto;

public class OcrBase64Request {
    private String imageBase64;
    private String language = "eng";
    private String mode = "auto";
    private Integer maxFileSizeMB = 10;

    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public Integer getMaxFileSizeMB() { return maxFileSizeMB; }
    public void setMaxFileSizeMB(Integer maxFileSizeMB) { this.maxFileSizeMB = maxFileSizeMB; }
}
