package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long boardId;
    private String username;
    private String action; // e.g. "TASK_MOVED", "TASK_CREATED", "COMMENT_ADDED"
    
    @Column(length = 500)
    private String description; // Human readable description e.g., "Ali moved task from To Do to In Progress"

    private LocalDateTime createdAt;

    public ActivityLog() {}

    public ActivityLog(Long boardId, String username, String action, String description) {
        this.boardId = boardId;
        this.username = username;
        this.action = action;
        this.description = description;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public Long getBoardId() { return boardId; }
    public void setBoardId(Long boardId) { this.boardId = boardId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}