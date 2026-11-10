package com.example.demo.controller;

import com.example.demo.model.Comment;
import com.example.demo.model.Notification;
import com.example.demo.model.Task;
import com.example.demo.model.User;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@Transactional
public class CommentController {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public CommentController(CommentRepository commentRepository,
                             TaskRepository taskRepository,
                             UserRepository userRepository,
                             NotificationRepository notificationRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Task ke saare persistent DB comments fetch karne ke liye
    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<?> getTaskComments(@PathVariable Long taskId) {
        List<Comment> comments = commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
        return ResponseEntity.ok(comments);
    }

    // Comment save karna, @Mention notifications generate karna aur broadcast karna
    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long taskId, @RequestBody Map<String, Object> payload) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.badRequest().body("Task not found!");
        }

        String text = (String) payload.getOrDefault("content", payload.get("text"));
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Comment text cannot be empty!");
        }

        User authorVar = null;
        if (payload.containsKey("userId") && payload.get("userId") != null) {
            Long userId = Long.parseLong(payload.get("userId").toString());
            authorVar = userRepository.findById(userId).orElse(null);
        } else if (payload.containsKey("username") && payload.get("username") != null) {
            String username = payload.get("username").toString();
            authorVar = userRepository.findByUsername(username).orElse(null);
        }

        Comment parentComment = null;
        if (payload.containsKey("parentId") && payload.get("parentId") != null) {
            Long parentId = Long.parseLong(payload.get("parentId").toString());
            parentComment = commentRepository.findById(parentId).orElse(null);
        }

        // Database Table mein permanent save
        Comment comment = new Comment(text, task, authorVar, parentComment);
        Comment savedComment = commentRepository.save(comment);

        // --- @MENTION (USER TAGGING) NOTIFICATIONS HANDLING ---
        Pattern pattern = Pattern.compile("@(\\w+)");
        Matcher matcher = pattern.matcher(text);
        Set<String> taggedUsernames = new HashSet<>();
        while (matcher.find()) {
            taggedUsernames.add(matcher.group(1));
        }

        Long boardId = (task.getBoard() != null) ? task.getBoard().getId() 
                       : (task.getBoardList() != null && task.getBoardList().getBoard() != null) 
                       ? task.getBoardList().getBoard().getId() : null;

        // Effective Final reference lambda compatibility ke liye
        final User finalAuthor = authorVar;

        for (String username : taggedUsernames) {
            userRepository.findByUsername(username).ifPresent(taggedUser -> {
                if (finalAuthor == null || !taggedUser.getId().equals(finalAuthor.getId())) {
                    Notification notification = new Notification();
                    
                    notification.setRecipientUsername(taggedUser.getUsername());
                    if (finalAuthor != null) {
                        notification.setSenderUsername(finalAuthor.getUsername());
                    }
                    
                    notification.setMessage((finalAuthor != null ? "@" + finalAuthor.getUsername() : "Someone") 
                            + " mentioned you in a comment on task \"" + task.getTitle() + "\"");
                    notification.setType("MENTION");
                    notification.setBoardId(boardId);
                    notificationRepository.save(notification);

                    // User-Specific Realtime Push
                    messagingTemplate.convertAndSend("/topic/notifications/" + taggedUser.getUsername(), notification);
                }
            });
        }

        // Realtime Board WebSocket Broadcast with Database Count
        int updatedCount = commentRepository.countByTaskId(taskId);
        Map<String, Object> event = new HashMap<>();
        event.put("type", "COMMENT_ADDED");
        event.put("taskId", taskId);
        event.put("comment", savedComment);
        event.put("commentsCount", updatedCount);

        if (boardId != null) {
            messagingTemplate.convertAndSend("/topic/board/" + boardId, event);
        }

        return ResponseEntity.ok(savedComment);
    }

    // Comment Delete logic
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @RequestParam(required = false) Long taskId) {

        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null) {
            return ResponseEntity.notFound().build();
        }

        Long tId = comment.getTask() != null ? comment.getTask().getId() : taskId;
        Long boardId = (comment.getTask() != null && comment.getTask().getBoard() != null) 
                       ? comment.getTask().getBoard().getId() : null;

        commentRepository.delete(comment);

        int updatedCount = (tId != null) ? commentRepository.countByTaskId(tId) : 0;
        
        if (boardId != null) {
            messagingTemplate.convertAndSend("/topic/board/" + boardId, Map.of(
                "type", "COMMENT_DELETED",
                "taskId", tId != null ? tId : 0,
                "commentId", commentId,
                "commentsCount", updatedCount
            ));
        }

        return ResponseEntity.ok(Map.of("message", "Comment deleted successfully"));
    }
}