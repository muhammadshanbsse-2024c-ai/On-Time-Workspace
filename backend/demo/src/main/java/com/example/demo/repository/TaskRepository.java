package com.example.demo.repository;

import com.example.demo.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    // TaskController ke liye exact match method
    List<Task> findByBoardId(Long boardId);

    // Position/ID wise ordering ke liye
    List<Task> findByBoardIdOrderByIdAsc(Long boardId);

    // List/Column ID filter ke liye
    List<Task> findByBoardListId(Long boardListId);
}