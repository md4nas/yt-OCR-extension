package com.ocr.yt_ocr_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OcrResponse {
    @JsonProperty("extracted_text")
    private String text;

    @JsonProperty("line_count")
    private int lineCount;

    @JsonProperty("success")
    private boolean success = true;

    public OcrResponse() {}

    public OcrResponse(String text) {
        this.text = text;
        this.lineCount = text != null ? text.split("\n").length : 0;
    }

    // Getters and setters...
    public String getText() { return text; }
    public void setText(String text) {
        this.text = text;
        this.lineCount = text != null ? text.split("\n").length : 0;
    }

    public int getLineCount() { return lineCount; }
    public void setLineCount(int lineCount) { this.lineCount = lineCount; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}
