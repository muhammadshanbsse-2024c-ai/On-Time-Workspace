package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtUtil;
import com.example.demo.service.EmailService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, allowedHeaders = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Autowired(required = false)
    private EmailService emailService;

    @Value("${google.client.id:YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com}")
    private String googleClientId;

    public AuthController(UserRepository userRepository, 
                          PasswordEncoder passwordEncoder, 
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    private Map<String, Object> createUserDTO(User user) {
        Map<String, Object> userMap = new HashMap<>();
        if (user == null) return userMap;
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("name", user.getName() != null ? user.getName() : user.getUsername());
        userMap.put("username", user.getUsername());
        userMap.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
        return userMap;
    }

    // 1. MANUAL EMAIL REGISTRATION & OTP DISPATCH
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> payload) {
        try {
            String email = (String) payload.get("email");
            String password = (String) payload.get("password");
            String name = (String) payload.get("name");

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Email is required!"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Password is required!"));
            }

            email = email.trim().toLowerCase();
            Optional<User> existingUserOpt = userRepository.findByEmail(email);

            String otp = String.format("%06d", new Random().nextInt(900000) + 100000);
            User targetUser;

            if (existingUserOpt.isPresent()) {
                targetUser = existingUserOpt.get();

                // Verified User check
                if (targetUser.getOtp() == null && targetUser.getPassword() != null && targetUser.isVerified()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Error: Email is already in use!"));
                }

                if (name != null && !name.trim().isEmpty()) {
                    targetUser.setName(name.trim());
                }
                targetUser.setPassword(passwordEncoder.encode(password.trim()));
                targetUser.setOtp(otp);
                targetUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
            } else {
                targetUser = new User();
                targetUser.setEmail(email);
                targetUser.setName(name != null && !name.trim().isEmpty() ? name.trim() : email.split("@")[0]);
                targetUser.setUsername(email.split("@")[0]);
                targetUser.setPassword(passwordEncoder.encode(password.trim()));
                targetUser.setOtp(otp);
                targetUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
            }

            userRepository.save(targetUser);

            System.out.println("=========================================");
            System.out.println(">>> OTP for " + email + " is: " + otp);
            System.out.println("=========================================");

            if (emailService != null) {
                try {
                    emailService.sendOtpEmail(email, otp);
                } catch (Exception e) {
                    System.err.println(">>> Failed to send email via SMTP: " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "OTP generated successfully!");
            response.put("requiresOtp", true);
            response.put("email", email);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Registration failed: " + e.getMessage()));
        }
    }

    // 2. VERIFY MANUAL REGISTRATION OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");

            if (email == null || otp == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Email and OTP are required!"));
            }

            Optional<User> userOptional = userRepository.findByEmail(email.trim().toLowerCase());
            if (userOptional.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: User not found!"));
            }

            User user = userOptional.get();

            if (user.getOtp() == null || !user.getOtp().equals(otp.trim())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Invalid OTP code!"));
            }

            if (user.getOtpExpiry() != null && user.getOtpExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: OTP has expired!"));
            }

            user.setOtp(null);
            user.setOtpExpiry(null);
            user.setVerified(true);
            User verifiedUser = userRepository.save(user);

            String token = jwtUtil.generateToken(verifiedUser.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Email verified successfully!");
            response.put("token", token);
            response.put("userId", verifiedUser.getId());
            response.put("id", verifiedUser.getId());
            response.put("user", createUserDTO(verifiedUser));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "OTP Verification failed: " + e.getMessage()));
        }
    }

    // 3. RESEND OTP ENDPOINT
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Email is required!"));
            }

            Optional<User> userOptional = userRepository.findByEmail(email.trim().toLowerCase());
            if (userOptional.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: User not found!"));
            }

            User user = userOptional.get();

            String newOtp = String.format("%06d", new Random().nextInt(900000) + 100000);
            user.setOtp(newOtp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
            userRepository.save(user);

            System.out.println("=========================================");
            System.out.println(">>> RESENT OTP for " + email + " is: " + newOtp);
            System.out.println("=========================================");

            if (emailService != null) {
                try {
                    emailService.sendOtpEmail(email.trim(), newOtp);
                } catch (Exception e) {
                    System.err.println(">>> Failed to resend email via SMTP: " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "New OTP sent successfully!");
            response.put("requiresOtp", true);
            response.put("email", email.trim());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Resend OTP failed: " + e.getMessage()));
        }
    }

    // 4. MANUAL LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> loginRequest) {
        try {
            String email = loginRequest.get("email");
            String password = loginRequest.get("password");

            if (email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email and Password are required."));
            }

            Optional<User> userOptional = userRepository.findByEmail(email.trim().toLowerCase());

            if (userOptional.isPresent()) {
                User user = userOptional.get();

                if (user.getOtp() != null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Error: Email verification pending. Please verify OTP first."));
                }

                if (passwordEncoder.matches(password, user.getPassword())) {
                    String token = jwtUtil.generateToken(user.getEmail());
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("token", token);
                    response.put("message", "Login successful!");
                    response.put("userId", user.getId());
                    response.put("id", user.getId());
                    response.put("user", createUserDTO(user));
                    
                    return ResponseEntity.ok(response);
                }
            }

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Error: Invalid email or password!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login error: " + e.getMessage()));
        }
    }

    // 5. DIRECT GOOGLE LOGIN
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> payload) {
        String idTokenString = payload.get("idToken");

        if (idTokenString == null || idTokenString.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Google Token is required!"));
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload tokenPayload = idToken.getPayload();
                String email = tokenPayload.getEmail().toLowerCase();
                String name = (String) tokenPayload.get("name");
                String pictureUrl = (String) tokenPayload.get("picture");

                User user = userRepository.findByEmail(email).map(existingUser -> {
                    if (pictureUrl != null && (existingUser.getAvatarUrl() == null || existingUser.getAvatarUrl().isEmpty())) {
                        existingUser.setAvatarUrl(pictureUrl);
                        return userRepository.save(existingUser);
                    }
                    return existingUser;
                }).orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(name != null ? name : email.split("@")[0]);
                    newUser.setUsername(email.split("@")[0]);
                    newUser.setPassword(passwordEncoder.encode("OAUTH_GOOGLE_USER_SECRET"));
                    if (pictureUrl != null) {
                        newUser.setAvatarUrl(pictureUrl);
                    }
                    newUser.setVerified(true);
                    return userRepository.save(newUser);
                });

                String token = jwtUtil.generateToken(user.getEmail());

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Google Authentication Successful!");
                response.put("token", token);
                response.put("userId", user.getId());
                response.put("id", user.getId());
                response.put("user", createUserDTO(user));

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Error: Invalid Google Token!"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error: Verification failed - " + e.getMessage()));
        }
    }
}