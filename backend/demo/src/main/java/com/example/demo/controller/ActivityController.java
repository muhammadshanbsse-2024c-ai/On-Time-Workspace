package com.example.demo.controller;

import com.example.demo.model.ActivityLog;
import com.example.demo.repository.ActivityLogRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/boards")
@CrossOrigin(origins = "*")
public class ActivityController {

    private final ActivityLogRepository activityLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ActivityController(ActivityLogRepository activityLogRepository, SimpMessagingTemplate messagingTemplate) {
        this.activityLogRepository = activityLogRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // 1. GET: Fetch all activities for a board
    @GetMapping("/{boardId}/activities")
    public List<ActivityLog> getBoardActivities(@PathVariable Long boardId) {
        return activityLogRepository.findByBoardIdOrderByCreatedAtDesc(boardId);
    }

    // 2. POST: Endpoint for Frontend direct logging
    @PostMapping("/{boardId}/activities")
    public ActivityLog addActivity(@PathVariable Long boardId, @RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "User");
        String action = body.getOrDefault("action", "ACTION");
        String description = body.getOrDefault("description", "Performed an action");

        ActivityLog log = new ActivityLog(boardId, username, action, description);
        ActivityLog savedLog = activityLogRepository.save(log);

        // Real-time broadcast payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ACTIVITY_LOGGED");
        payload.put("log", savedLog);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, payload);
        return savedLog;
    }

    // 3. Helper method for internal Java backend calls
    public void logActivity(Long boardId, String username, String action, String description) {
        ActivityLog log = new ActivityLog(boardId, username, action, description);
        ActivityLog savedLog = activityLogRepository.save(log);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ACTIVITY_LOGGED");
        payload.put("log", savedLog);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, payload);
    }
}