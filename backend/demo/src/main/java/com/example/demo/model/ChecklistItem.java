package com.example.demo.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class ChecklistItem {
    private String text;
    private boolean completed = false;

    public ChecklistItem() {}

    public ChecklistItem(String text, boolean completed) {
        this.text = text;
        this.completed = completed;
    }

    public String getText() { 
        return text; 
    }
    
    public void setText(String text) { 
        this.text = text; 
    }

    public boolean isCompleted() { 
        return completed; 
    }
    
    public void setCompleted(boolean completed) { 
        this.completed = completed; 
    }
}