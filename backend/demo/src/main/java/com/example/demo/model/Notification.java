package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String recipientUsername; // Receiver
    private String senderUsername;    // Sender
    private String message;
    private String type;              // TASK_ASSIGNED, COMMENT_ADDED, INVITE
    private Long boardId;
    private boolean isRead = false;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Notification() {}

    public Notification(String recipientUsername, String senderUsername, String message, String type, Long boardId) {
        this.recipientUsername = recipientUsername;
        this.senderUsername = senderUsername;
        this.message = message;
        this.type = type;
        this.boardId = boardId;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public String getRecipientUsername() { return recipientUsername; }
    public void setRecipientUsername(String recipientUsername) { this.recipientUsername = recipientUsername; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getBoardId() { return boardId; }
    public void setBoardId(Long boardId) { this.boardId = boardId; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}