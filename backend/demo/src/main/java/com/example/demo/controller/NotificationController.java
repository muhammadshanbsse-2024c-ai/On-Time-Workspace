package com.example.demo.controller;

import com.example.demo.model.Notification;
import com.example.demo.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationController(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/user/{username}")
    public List<Notification> getUserNotifications(@PathVariable String username) {
        return notificationRepository.findByRecipientUsernameOrderByCreatedAtDesc(username.toLowerCase().trim());
    }

    @PostMapping
    public Notification createNotification(@RequestBody Notification notification) {
        if (notification.getRecipientUsername() != null) {
            notification.setRecipientUsername(notification.getRecipientUsername().toLowerCase().trim());
        }
        Notification saved = notificationRepository.save(notification);

        // Real-time Push Alert to specific user
        messagingTemplate.convertAndSend("/topic/notifications/" + notification.getRecipientUsername(), saved);
        return saved;
    }

    // NEW: Mark all notifications as read for a user
    @PutMapping("/user/{username}/read-all")
    public void markAllAsRead(@PathVariable String username) {
        List<Notification> unreadList = notificationRepository.findByRecipientUsernameOrderByCreatedAtDesc(username.toLowerCase().trim());
        for (Notification n : unreadList) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unreadList);
    }
}