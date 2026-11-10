package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    private TaskPriority priority;

    private String dueDate;

    private String assignee;

    @Column(nullable = false)
    private Double position = 1000.0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "list_id")
    @JsonIgnoreProperties({"tasks", "board", "hibernateLazyInitializer", "handler"})
    private BoardList boardList;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "board_id", nullable = false)
    @JsonIgnoreProperties({"owner", "tasks", "hibernateLazyInitializer", "handler"})
    private Board board;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_to_id")
    @JsonIgnoreProperties({"boards", "password", "hibernateLazyInitializer", "handler"})
    private User assignedTo;

    @ElementCollection
    @CollectionTable(name = "task_checklist_items", joinColumns = @JoinColumn(name = "task_id"))
    private List<ChecklistItem> checklist = new ArrayList<>();

    // Direct TEXT Column for attachments
    @Column(name = "attachments", columnDefinition = "TEXT")
    private String attachments;

    // Dedicated Comments One-to-Many Relationship
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties({"task", "hibernateLazyInitializer", "handler"})
    private List<Comment> comments = new ArrayList<>();

    // Direct Comments Count Field for Board DTO persistence
    @Transient
    private Integer commentsCount = 0;

    private LocalDateTime createdAt;

    public Task() {}

    public Task(Long id, String title, String description, TaskStatus status, TaskPriority priority, String dueDate, String assignee, Double position, BoardList boardList, Board board, User assignedTo, List<ChecklistItem> checklist, String attachments, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.dueDate = dueDate;
        this.assignee = assignee;
        this.position = position != null ? position : 1000.0;
        this.boardList = boardList;
        this.board = board;
        this.assignedTo = assignedTo;
        this.checklist = checklist != null ? checklist : new ArrayList<>();
        this.attachments = attachments;
        this.createdAt = createdAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = TaskStatus.TODO;
        }
        if (this.position == null) {
            this.position = 1000.0;
        }
        syncAssignee();
    }

    @PreUpdate
    protected void onUpdate() {
        syncAssignee();
    }

    @PostLoad
    protected void onPostLoad() {
        syncAssignee();
    }

    private void syncAssignee() {
        if ((this.assignee == null || this.assignee.trim().isEmpty()) && this.assignedTo != null) {
            this.assignee = this.assignedTo.getUsername() != null ? this.assignedTo.getUsername() : this.assignedTo.getName();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getAssignee() { return this.assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }

    public Double getPosition() { return position; }
    public void setPosition(Double position) { this.position = position; }

    public BoardList getBoardList() { return boardList; }
    public void setBoardList(BoardList boardList) { this.boardList = boardList; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public User getAssignedTo() { return assignedTo; }
    public void setAssignedTo(User assignedTo) { 
        this.assignedTo = assignedTo;
        if (assignedTo != null && (this.assignee == null || this.assignee.trim().isEmpty())) {
            this.assignee = assignedTo.getUsername() != null ? assignedTo.getUsername() : assignedTo.getName();
        }
    }

    public List<ChecklistItem> getChecklist() { return checklist; }
    public void setChecklist(List<ChecklistItem> checklist) { this.checklist = checklist; }

    public List<Comment> getComments() { return comments; }
    public void setComments(List<Comment> comments) { this.comments = comments; }

    public Integer getCommentsCount() { return commentsCount != null ? commentsCount : 0; }
    public void setCommentsCount(Integer commentsCount) { this.commentsCount = commentsCount; }

    public String getAttachments() { return attachments; }
    public void setAttachments(String attachments) { this.attachments = attachments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}