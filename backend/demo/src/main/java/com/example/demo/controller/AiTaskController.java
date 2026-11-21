package com.example.demo.controller;

import com.example.demo.service.AiTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiTaskController {

    @Autowired
    private AiTaskService aiTaskService;

    @SuppressWarnings("rawtypes")
    @PostMapping("/analyze-task")
    public ResponseEntity analyzeTaskFile(@RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file received from browser."));
        }
        if (file.getSize() == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Selected file '" + file.getOriginalFilename() + "' is empty (0 KB). Please open the file, write some text, save it, and try again."));
        }

        try {
            Map extractedTask = aiTaskService.analyzeFileForTask(file);
            return ResponseEntity.ok(extractedTask);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "AI Analysis Failed: " + e.getMessage()));
        }
    }
}