package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private static final String UPLOAD_DIR = "uploads/";

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            Authentication authentication,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {

        User user = null;

        // 1. Spring Security Context se fetch karein
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            String principal = authentication.getName();
            Optional<User> userByEmail = userRepository.findByEmail(principal);
            if (userByEmail.isPresent()) {
                user = userByEmail.get();
            } else {
                Optional<User> userByUsername = userRepository.findByUsername(principal);
                if (userByUsername.isPresent()) {
                    user = userByUsername.get();
                }
            }
        }

        // 2. X-User-Id Header fallback
        if (user == null && headerUserId != null && !headerUserId.isEmpty() && !"undefined".equals(headerUserId) && !"null".equals(headerUserId)) {
            try {
                Long id = Long.parseLong(headerUserId);
                user = userRepository.findById(id).orElse(null);
            } catch (NumberFormatException ignored) {}
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }

        // Standardized User Response Payload with Avatar URL
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName() != null ? user.getName() : user.getUsername());
        response.put("username", user.getUsername() != null ? user.getUsername() : user.getName());
        response.put("email", user.getEmail());
        response.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""); // Fixed: Added avatarUrl

        return ResponseEntity.ok(response);
    }

    // 3. Profile Image Upload Endpoint
    @PostMapping("/profile-image")
    public ResponseEntity<?> uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            Authentication authentication) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Please select a file to upload."));
            }

            User user = null;
            if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
                user = userRepository.findByEmail(authentication.getName())
                        .orElseGet(() -> userRepository.findByUsername(authentication.getName()).orElse(null));
            }

            if (user == null && headerUserId != null && !headerUserId.isEmpty()) {
                try {
                    Long id = Long.parseLong(headerUserId);
                    user = userRepository.findById(id).orElse(null);
                } catch (NumberFormatException ignored) {}
            }

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated."));
            }

            File uploadFolder = new File(UPLOAD_DIR);
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().replaceAll("\\s+", "_") : "avatar.jpg";
            String fileName = System.currentTimeMillis() + "_" + originalFilename;
            Path filePath = Paths.get(UPLOAD_DIR + fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8080/uploads/" + fileName;
            user.setAvatarUrl(fileUrl);
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile picture updated successfully!");
            response.put("avatarUrl", fileUrl);
            response.put("user", Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "avatarUrl", fileUrl
            ));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload image: " + e.getMessage()));
        }
    }
}