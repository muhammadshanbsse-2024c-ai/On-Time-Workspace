package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class FileUploadController {

    private final String UPLOAD_DIR = "uploads/";

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Please select a valid non-empty file.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        try {
            // Ensure Upload Folder Exists
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Clean & Unique File Name Generation
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "uploaded_file";
            String safeFileName = originalName.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");
            String fileName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + safeFileName;

            // Save File to Disk
            Path filePath = Paths.get(UPLOAD_DIR).resolve(fileName).toAbsolutePath();
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Construct Direct Accessible URL
            String fileUrl = "http://localhost:8080/uploads/" + fileName;

            // Structured JSON Response for Frontend Integration
            Map<String, Object> response = new HashMap<>();
            response.put("url", fileUrl);
            response.put("fileUrl", fileUrl);
            response.put("path", fileUrl);
            response.put("name", originalName);
            response.put("fileName", originalName);
            response.put("size", Math.max(1, (file.getSize() / 1024)) + " KB");
            response.put("type", file.getContentType() != null ? file.getContentType() : "application/octet-stream");

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error saving file to server: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}