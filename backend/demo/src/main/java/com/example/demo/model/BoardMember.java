package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "board_members")
public class BoardMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardRole role = BoardRole.MEMBER; // <--- YAHAN DEFAULT ROLE SET KAR DEIN

    public BoardMember() {}

    public BoardMember(Board board, User user, BoardRole role) {
        this.board = board;
        this.user = user;
        this.role = (role != null) ? role : BoardRole.MEMBER; // <--- Fallback Check
    }

    public BoardMember(Long id, Board board, User user, BoardRole role) {
        this.id = id;
        this.board = board;
        this.user = user;
        this.role = (role != null) ? role : BoardRole.MEMBER;
    }

    public Long getId() { 
        return id; 
    }
    
    public void setId(Long id) { 
        this.id = id; 
    }

    public Board getBoard() { 
        return board; 
    }
    
    public void setBoard(Board board) { 
        this.board = board; 
    }

    public User getUser() { 
        return user; 
    }
    
    public void setUser(User user) { 
        this.user = user; 
    }

    public BoardRole getRole() { 
        return role; 
    }
    
    public void setRole(BoardRole role) { 
        this.role = role; 
    }
}