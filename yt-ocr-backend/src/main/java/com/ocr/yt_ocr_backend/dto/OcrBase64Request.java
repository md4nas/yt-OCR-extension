package com.ocr.yt_ocr_backend.dto;

public class OcrBase64Request {
    // data URL form "data: image/png;base64,AAA..."
    // or raw base64 without profile
    private String imageBase64;

    public String getImageBase64() {
        return imageBase64;
    }
    public void setImageBase64(String imageBase64) {
        this.imageBase64 = imageBase64;
    }
}
