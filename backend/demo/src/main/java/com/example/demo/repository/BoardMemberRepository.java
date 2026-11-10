package com.example.demo.repository;

import com.example.demo.model.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BoardMemberRepository extends JpaRepository<BoardMember, Long> {
    List<BoardMember> findByBoardId(Long boardId);
}