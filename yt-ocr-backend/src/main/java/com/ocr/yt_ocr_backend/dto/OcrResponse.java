package com.ocr.yt_ocr_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.ArrayList;

public class OcrResponse {
    @JsonProperty("status")
    private String status = "success";

    @JsonProperty("rows")
    private List<TextRow> rows = new ArrayList<>();

    @JsonProperty("total_lines")
    private int totalLines;

    @JsonProperty("processing_time_ms")
    private long processingTimeMs;

    public OcrResponse() {}

    public OcrResponse(String text, long processingTime) {
        this.processingTimeMs = processingTime;
        parseTextToRows(text);
    }

    private void parseTextToRows(String text) {
        if (text == null || text.trim().isEmpty()) {
            this.status = "no_text_detected";
            return;
        }

        // Handle literal \n in text
        text = text.replace("\\n", "\n");
        
        String[] lines = text.split("\n");
        int lineNumber = 1;
        
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty()) {
                rows.add(new TextRow(lineNumber++, line));
            }
        }
        this.totalLines = rows.size();
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<TextRow> getRows() { return rows; }
    public void setRows(List<TextRow> rows) { this.rows = rows; }

    public int getTotalLines() { return totalLines; }
    public void setTotalLines(int totalLines) { this.totalLines = totalLines; }

    public long getProcessingTimeMs() { return processingTimeMs; }
    public void setProcessingTimeMs(long processingTimeMs) { this.processingTimeMs = processingTimeMs; }

    public static class TextRow {
        @JsonProperty("line_no")
        private int lineNo;

        @JsonProperty("content")
        private String content;

        public TextRow() {}

        public TextRow(int lineNo, String content) {
            this.lineNo = lineNo;
            this.content = content;
        }

        public int getLineNo() { return lineNo; }
        public void setLineNo(int lineNo) { this.lineNo = lineNo; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
