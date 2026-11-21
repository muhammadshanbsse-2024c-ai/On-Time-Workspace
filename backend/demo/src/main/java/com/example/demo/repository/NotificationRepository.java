package com.example.demo.repository;

import com.example.demo.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUsernameOrderByCreatedAtDesc(String recipientUsername);

    // Fetch only notifications from the last 30 days (Last Month)
    List<Notification> findByRecipientUsernameAndCreatedAtAfterOrderByCreatedAtDesc(
            String recipientUsername,
            LocalDateTime cutoffDate
    );

    // Auto-delete notifications older than 30 days
    @Modifying
    @Transactional
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);
}