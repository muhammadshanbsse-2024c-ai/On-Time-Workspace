package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@SuppressWarnings({"unchecked", "rawtypes"})
public class AiTaskService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MAX_EMBEDDED_IMAGES = 6;

    public AiTaskService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(60000);
        this.restTemplate = new RestTemplate(factory);
    }

    private static class ExtractedDocumentContent {
        String text = "";
        List<String> base64Images = new ArrayList<>();
    }

    private String toOptimizedBase64DataUrl(BufferedImage original) {
        try {
            if (original == null) return null;
            int maxDim = 800;
            int width = original.getWidth();
            int height = original.getHeight();

            if (width < 40 || height < 40) {
                return null;
            }

            int newW = width;
            int newH = height;
            if (width > maxDim || height > maxDim) {
                double scale = Math.min((double) maxDim / width, (double) maxDim / height);
                newW = Math.max(1, (int) Math.round(width * scale));
                newH = Math.max(1, (int) Math.round(height * scale));
            }

            BufferedImage rgbImage = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = rgbImage.createGraphics();
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, newW, newH);
            if (newW != width || newH != height) {
                Image scaled = original.getScaledInstance(newW, newH, Image.SCALE_SMOOTH);
                g2d.drawImage(scaled, 0, 0, null);
            } else {
                g2d.drawImage(original, 0, 0, null);
            }
            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
            if (writers.hasNext()) {
                ImageWriter writer = writers.next();
                ImageWriteParam param = writer.getDefaultWriteParam();
                if (param.canWriteCompressed()) {
                    param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                    param.setCompressionQuality(0.78f);
                }
                try (MemoryCacheImageOutputStream mcios = new MemoryCacheImageOutputStream(baos)) {
                    writer.setOutput(mcios);
                    writer.write(null, new IIOImage(rgbImage, null, null), param);
                }
                writer.dispose();
            } else {
                ImageIO.write(rgbImage, "jpg", baos);
            }

            String b64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            return "data:image/jpeg;base64," + b64;
        } catch (Exception e) {
            return null;
        }
    }

    private void collectImagesFromResources(PDResources resources, List<String> images) {
        if (resources == null || images.size() >= MAX_EMBEDDED_IMAGES) return;
        for (COSName name : resources.getXObjectNames()) {
            if (images.size() >= MAX_EMBEDDED_IMAGES) break;
            try {
                PDXObject xObject = resources.getXObject(name);
                if (xObject instanceof PDImageXObject imageXObject) {
                    String dataUrl = toOptimizedBase64DataUrl(imageXObject.getImage());
                    if (dataUrl != null) {
                        images.add(dataUrl);
                    }
                } else if (xObject instanceof PDFormXObject formXObject) {
                    collectImagesFromResources(formXObject.getResources(), images);
                }
            } catch (Exception ignored) {}
        }
    }

    private ExtractedDocumentContent extractFromPdf(byte[] pdfBytes) throws Exception {
        ExtractedDocumentContent content = new ExtractedDocumentContent();

        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            PDFTextStripper stripper = new PDFTextStripper();
            content.text = stripper.getText(document).trim();

            List<String> rawEmbedded = new ArrayList<>();
            for (PDPage page : document.getPages()) {
                collectImagesFromResources(page.getResources(), rawEmbedded);
            }

            if (!rawEmbedded.isEmpty() || content.text.length() < 200) {
                PDFRenderer renderer = new PDFRenderer(document);
                int pagesToRender = Math.min(document.getNumberOfPages(), 4);
                for (int i = 0; i < pagesToRender; i++) {
                    BufferedImage pageImg = renderer.renderImageWithDPI(i, 130, ImageType.RGB);
                    String dataUrl = toOptimizedBase64DataUrl(pageImg);
                    if (dataUrl != null) {
                        content.base64Images.add(dataUrl);
                    }
                }
            }

            if (content.base64Images.isEmpty() && !rawEmbedded.isEmpty()) {
                content.base64Images.addAll(rawEmbedded);
            }
        }

        return content;
    }

    private ExtractedDocumentContent extractFromDocx(byte[] docxBytes) throws Exception {
        ExtractedDocumentContent content = new ExtractedDocumentContent();
        StringBuilder sb = new StringBuilder();

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(docxBytes))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            while ((entry = zis.getNextEntry()) != null) {
                String entryName = entry.getName();
                ByteArrayOutputStream entryOut = new ByteArrayOutputStream();
                int len;
                while ((len = zis.read(buffer)) > 0) {
                    entryOut.write(buffer, 0, len);
                }
                byte[] entryBytes = entryOut.toByteArray();

                if (entryName.equals("word/document.xml")) {
                    String xml = new String(entryBytes, StandardCharsets.UTF_8);
                    String cleanText = xml
                            .replaceAll("</w:p>", "\n")
                            .replaceAll("<[^>]+>", " ")
                            .replaceAll("&amp;", "&")
                            .replaceAll("&lt;", "<")
                            .replaceAll("&gt;", ">")
                            .replaceAll("&quot;", "\"")
                            .replaceAll("&apos;", "'")
                            .replaceAll("[ \\t]+", " ")
                            .replaceAll("\\n\\s*\\n+", "\n")
                            .trim();
                    sb.append(cleanText);
                } else if (entryName.startsWith("word/media/")
                        && !entry.isDirectory()
                        && content.base64Images.size() < MAX_EMBEDDED_IMAGES) {
                    try {
                        BufferedImage bImg = ImageIO.read(new ByteArrayInputStream(entryBytes));
                        String dataUrl = toOptimizedBase64DataUrl(bImg);
                        if (dataUrl != null) {
                            content.base64Images.add(dataUrl);
                        }
                    } catch (Exception ignored) {}
                }
                zis.closeEntry();
            }
        }

        content.text = sb.toString().trim();
        System.out.println("[AiTaskService] DOCX Extracted text length: " + content.text.length()
                + ", embedded images found: " + content.base64Images.size());
        return content;
    }

    private List<String> getAvailableGroqVisionModels() {
        Set<String> visionCandidates = new LinkedHashSet<>();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            HttpEntity req = new HttpEntity(headers);

            ResponseEntity<String> res = restTemplate.exchange(
                    "https://api.groq.com/openai/v1/models",
                    HttpMethod.GET,
                    req,
                    String.class
            );

            if (res.getBody() != null) {
                JsonNode data = objectMapper.readTree(res.getBody()).path("data");
                for (JsonNode item : data) {
                    String id = item.path("id").asText();
                    String lower = id.toLowerCase();
                    if (lower.contains("decommissioned") || lower.contains("guard")) continue;
                    if (lower.contains("llama-4") || lower.contains("vision")) {
                        visionCandidates.add(id);
                    }
                }
            }
        } catch (Exception ignored) {}

        visionCandidates.add("meta-llama/llama-4-scout-17b-16e-instruct");
        visionCandidates.add("meta-llama/llama-4-maverick-17b-128e-instruct");

        return new ArrayList<>(visionCandidates);
    }

    private String readSingleImageWithGroqVision(String dataUrl, List<String> visionModels) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        List contentParts = new ArrayList();

        Map textPart = new HashMap();
        textPart.put("type", "text");
        textPart.put("text", "Read and transcribe EVERY SINGLE WORD, task instruction, question, heading, bullet point, table cell, code snippet, and diagram label visible in this image. Do not summarize or skip anything.");
        contentParts.add(textPart);

        Map urlObj = new HashMap();
        urlObj.put("url", dataUrl);

        Map imagePart = new HashMap();
        imagePart.put("type", "image_url");
        imagePart.put("image_url", urlObj);
        contentParts.add(imagePart);

        Map userMsg = new HashMap();
        userMsg.put("role", "user");
        userMsg.put("content", contentParts);

        List messages = new ArrayList();
        messages.add(userMsg);

        for (String visionModel : visionModels) {
            Map requestBody = new HashMap();
            requestBody.put("model", visionModel);
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.1);
            requestBody.put("max_tokens", 800);

            try {
                HttpEntity entity = new HttpEntity(requestBody, headers);
                String body = restTemplate.postForObject(apiUrl, entity, String.class);
                if (body != null) {
                    JsonNode root = objectMapper.readTree(body);
                    String extracted = root.path("choices").get(0)
                            .path("message").path("content").asText("");
                    if (!extracted.isBlank()) {
                        System.out.println("[AiTaskService] Vision OCR succeeded with model: " + visionModel);
                        return extracted.trim();
                    }
                }
            } catch (HttpStatusCodeException httpEx) {
                System.err.println("[Groq Vision Error] Model " + visionModel + ": " + httpEx.getStatusCode() + " - " + httpEx.getResponseBodyAsString());
            } catch (Exception e) {
                System.err.println("[Groq Vision Error] Model " + visionModel + ": " + e.getMessage());
            }
        }
        return "";
    }

    private String extractTextFromEmbeddedImagesUsingGroqVision(List<String> base64Images) {
        if (base64Images == null || base64Images.isEmpty()) return "";

        List<String> visionModels = getAvailableGroqVisionModels();
        StringBuilder combinedVisionText = new StringBuilder();

        for (int i = 0; i < base64Images.size(); i++) {
            String pageOrImgText = readSingleImageWithGroqVision(base64Images.get(i), visionModels);
            if (!pageOrImgText.isEmpty()) {
                combinedVisionText.append("\n[Page/Image ").append(i + 1).append(" Content]:\n")
                        .append(pageOrImgText).append("\n");
            }
        }

        return combinedVisionText.toString().trim();
    }

    private List getAvailableGroqModels() {
        Set candidates = new LinkedHashSet();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            HttpEntity req = new HttpEntity(headers);

            ResponseEntity res = restTemplate.exchange(
                "https://api.groq.com/openai/v1/models",
                HttpMethod.GET,
                req,
                String.class
            );

            if (res.getBody() != null) {
                JsonNode data = objectMapper.readTree(res.getBody().toString()).path("data");
                for (JsonNode item : data) {
                    String id = item.path("id").asText();
                    String lower = id.toLowerCase();
                    if (lower.contains("whisper") || lower.contains("guard") || lower.contains("tts")
                            || lower.contains("embed") || lower.contains("decommissioned")) {
                        continue;
                    }
                    if (lower.contains("llama-4") || lower.contains("gpt-oss") || lower.contains("qwen")
                            || lower.contains("llama-3.3") || lower.contains("llama-3.1") || lower.contains("gemma")) {
                        candidates.add(id);
                    }
                }
            }
        } catch (Exception ignored) {}

        candidates.add("meta-llama/llama-4-scout-17b-16e-instruct");
        candidates.add("qwen/qwen3.8-27b");

        return new ArrayList(candidates);
    }

    private String callGroq(List messages) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        List modelsToTry = getAvailableGroqModels();
        List errors = new ArrayList();

        for (Object modelObj : modelsToTry) {
            String modelName = modelObj.toString();
            Map requestBody = new HashMap();
            requestBody.put("model", modelName);
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.2);
            requestBody.put("max_tokens", 750);

            try {
                HttpEntity entity = new HttpEntity(requestBody, headers);
                String body = restTemplate.postForObject(apiUrl, entity, String.class);
                if (body != null) {
                    System.out.println("[AiTaskService] Successfully generated task with model: " + modelName);
                    return body;
                }
            } catch (HttpStatusCodeException httpEx) {
                errors.add(modelName + " -> " + httpEx.getStatusCode() + ": " + httpEx.getResponseBodyAsString());
            } catch (Exception e) {
                errors.add(modelName + " -> " + e.getMessage());
            }
        }

        throw new RuntimeException(String.join(" | ", errors));
    }

    public Map analyzeFileForTask(MultipartFile file) throws Exception {
        String mimeType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        if (mimeType.startsWith("video/") || fileName.matches(".*\\.(mp4|mov|webm|avi|mkv|flv|wmv)$")) {
            throw new RuntimeException("AI analysis is not supported for video files. Please upload a document or image.");
        }

        byte[] bytes = file.getBytes();

        boolean isPdfMagic = bytes.length >= 4
                && bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46; // %PDF
        boolean isZipMagic = bytes.length >= 2
                && bytes[0] == 0x50 && bytes[1] == 0x4B; // PK

        boolean isPdf = mimeType.equals("application/pdf") || fileName.endsWith(".pdf") || isPdfMagic;
        boolean isZipOrDocx = fileName.endsWith(".docx") || mimeType.contains("wordprocessingml") || isZipMagic;
        boolean isDirectImage = mimeType.startsWith("image/")
                || fileName.matches(".*\\.(png|jpg|jpeg|webp|bmp|gif)$");

        String extractedText = "";
        List<String> embeddedImages = new ArrayList<>();

        if (isPdf) {
            ExtractedDocumentContent pdfContent = extractFromPdf(bytes);
            extractedText = pdfContent.text;
            embeddedImages = pdfContent.base64Images;
        } else if (isZipOrDocx) {
            ExtractedDocumentContent docxContent = extractFromDocx(bytes);
            extractedText = docxContent.text;
            embeddedImages = docxContent.base64Images;
        } else if (isDirectImage) {
            BufferedImage bImg = ImageIO.read(new ByteArrayInputStream(bytes));
            String dataUrl = toOptimizedBase64DataUrl(bImg);
            if (dataUrl != null) {
                embeddedImages.add(dataUrl);
            }
        } else {
            extractedText = new String(bytes, StandardCharsets.UTF_8).trim();
        }

        if (!embeddedImages.isEmpty()) {
            String visionExtractedText = extractTextFromEmbeddedImagesUsingGroqVision(embeddedImages);
            if (!visionExtractedText.isEmpty()) {
                if (extractedText.isEmpty()) {
                    extractedText = visionExtractedText;
                } else {
                    extractedText = extractedText + "\n\n--- Extracted Content From Embedded Images ---\n" + visionExtractedText;
                }
            }
        }

        if (extractedText == null || extractedText.trim().isEmpty()) {
            throw new RuntimeException("No readable text or visual content found in the uploaded file.");
        }

        if (extractedText.length() > 14000) {
            extractedText = extractedText.substring(0, 14000);
        }

        String systemPrompt = """
            Carefully read and analyze ALL actual content inside the attached PRD, document, and extracted embedded image text.
            Extract the real project scope, features, requirements, and actionable development/execution steps.
            
            Rules for "points" (checklist steps):
            - Do NOT fix the number of steps to 4. Scale the count naturally based on the document's or image's length, depth, and requirements.
            - Minimum 3 steps for short documents or images.
            - Maximum 10 to 12 steps for large, detailed documents or PRDs.
            - Each step must be clear, distinct, and actionable.
            
            Return ONLY a valid raw JSON object (no markdown fences, no extra text before or after) with this exact structure:
            {
              "title": "Specific, clear task title based on actual content (max 55 chars)",
              "description": "Concise 1-2 sentence summary under 220 characters of the goals and what needs to be built/done",
              "points": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
              "priority": "HIGH"
            }
            Priority must strictly be LOW, MEDIUM, or HIGH.
            """;

        List messages = List.of(Map.of(
            "role", "user",
            "content", systemPrompt + "\n\nDocument / Image Content:\n" + extractedText
        ));

        String responseBody = callGroq(messages);

        JsonNode root = objectMapper.readTree(responseBody);
        String jsonText = root.path("choices").get(0)
                .path("message").path("content").asText();

        jsonText = jsonText.replaceAll("```json", "").replaceAll("```", "").trim();
        int firstBrace = jsonText.indexOf('{');
        int lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }

        Map result = objectMapper.readValue(jsonText, Map.class);

        Object titleObj = result.get("title");
        if (titleObj instanceof String) {
            String titleStr = ((String) titleObj).trim();
            if (titleStr.length() > 100) {
                result.put("title", titleStr.substring(0, 97) + "...");
            }
        }

        Object descObj = result.get("description");
        if (descObj instanceof String) {
            String descStr = ((String) descObj).trim();
            if (descStr.length() > 235) {
                result.put("description", descStr.substring(0, 232) + "...");
            }
        }

        Object pointsObj = result.get("points");
        if (pointsObj instanceof List) {
            List rawPoints = (List) pointsObj;
            if (rawPoints.size() > 12) {
                result.put("points", rawPoints.subList(0, 12));
            }
        }

        return result;
    }
}