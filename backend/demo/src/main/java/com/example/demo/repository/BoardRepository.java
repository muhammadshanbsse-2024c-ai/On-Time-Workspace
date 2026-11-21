package com.example.demo.repository;

import com.example.demo.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    // 1. Fetch boards strictly owned by the user
    List<Board> findByOwnerId(Long ownerId);

    // 2. Fetch boards where the user is joined as a BoardMember
    @Query("SELECT bm.board FROM BoardMember bm WHERE bm.user.id = :userId")
    List<Board> findBoardsByMemberUserId(@Param("userId") Long userId);
}