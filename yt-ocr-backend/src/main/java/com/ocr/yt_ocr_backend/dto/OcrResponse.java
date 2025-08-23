package com.ocr.yt_ocr_backend.dto;

public class OcrResponse {
    private String text;

    public OcrResponse() {}
    public OcrResponse(String text) {
        this.text=text;
    }

    public String getText() {
        return text;
    }
    public void setText(String text) {
        this.text=text;
    }
}
