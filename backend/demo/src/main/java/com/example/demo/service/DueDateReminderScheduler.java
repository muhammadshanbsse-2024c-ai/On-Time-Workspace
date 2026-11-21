package com.example.demo.service;

import com.example.demo.model.Task;
import com.example.demo.model.TaskStatus;
import com.example.demo.model.User;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DueDateReminderScheduler {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    public DueDateReminderScheduler(TaskRepository taskRepository,
                                    UserRepository userRepository,
                                    NotificationRepository notificationRepository,
                                    EmailService emailService) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }

    // Har roz raat 2 baje 30 din se purane notifications khud delete karega
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        notificationRepository.deleteByCreatedAtBefore(thirtyDaysAgo);
        System.out.println(">>> Cleaned up notifications older than 30 days.");
    }

    // Har roz subah 9 baje due date email reminders bhejega
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyDueDateReminders() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        List<Task> tasks = taskRepository.findAll();

        for (Task task : tasks) {
            if (task.getDueDate() == null || task.getDueDate().isBlank()) continue;
            if (task.getAssignee() == null || task.getAssignee().isBlank()) continue;
            if (task.getStatus() == TaskStatus.DONE) continue;

            try {
                LocalDate due = LocalDate.parse(task.getDueDate().trim());
                String statusLabel = null;

                if (due.isEqual(today)) {
                    statusLabel = "DUE TODAY";
                } else if (due.isEqual(tomorrow)) {
                    statusLabel = "DUE TOMORROW";
                } else if (due.isBefore(today)) {
                    statusLabel = "OVERDUE";
                }

                if (statusLabel != null) {
                    String cleanAssignee = task.getAssignee().trim();
                    User user = userRepository.findByUsername(cleanAssignee)
                            .orElseGet(() -> userRepository.findByEmail(cleanAssignee).orElse(null));

                    if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
                        String recipientName = user.getUsername() != null ? user.getUsername() : "Member";
                        emailService.sendDueDateReminderEmail(
                            user.getEmail(),
                            recipientName,
                            task.getTitle(),
                            task.getDueDate(),
                            statusLabel
                        );
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}