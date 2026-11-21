package com.example.demo.repository;

import com.example.demo.model.BoardList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardListRepository extends JpaRepository<BoardList, Long> {
    
    // Board ke tamam lists ko position ke hisab se sorted fetch karne ke liye
    List<BoardList> findByBoardIdOrderByPositionAsc(Long boardId);
}