package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "board_lists")
public class BoardList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Fractional Indexing (Double Precision) for O(1) Reordering & Concurrency Strategy
    @Column(nullable = false)
    private Double position = 1000.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    @JsonIgnoreProperties({"lists", "tasks", "owner", "hibernateLazyInitializer", "handler"})
    private Board board;

    // CC-6 Stability Fix: Ensures full task properties (including attachments) are fetched & serialized cleanly
    @OneToMany(mappedBy = "boardList", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC, id ASC")
    @JsonIgnoreProperties({"boardList", "board", "hibernateLazyInitializer", "handler"})
    private List<Task> tasks = new ArrayList<>();

    public BoardList() {}

    public BoardList(String name, Double position, Board board) {
        this.name = name;
        this.position = position != null ? position : 1000.0;
        this.board = board;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getPosition() { return position; }
    public void setPosition(Double position) { this.position = position; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }
}