package com.example.demo.controller;

import com.example.demo.model.Board;
import com.example.demo.model.BoardList;
import com.example.demo.model.ChecklistItem;
import com.example.demo.model.Task;
import com.example.demo.model.TaskPriority;
import com.example.demo.model.TaskStatus;
import com.example.demo.model.User;
import com.example.demo.repository.BoardListRepository;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
@Transactional
public class TaskController {

    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardListRepository boardListRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TaskController(TaskRepository taskRepository, 
                          BoardRepository boardRepository, 
                          UserRepository userRepository,
                          BoardListRepository boardListRepository,
                          SimpMessagingTemplate messagingTemplate,
                          EmailService emailService) {
        this.taskRepository = taskRepository;
        this.boardRepository = boardRepository;
        this.userRepository = userRepository;
        this.boardListRepository = boardListRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
    }

    private void broadcastTaskEvent(Long boardId, String eventType, Object payload) {
        if (boardId != null) {
            Map<String, Object> eventMap = new HashMap<>();
            eventMap.put("type", eventType);
            eventMap.put("data", payload);
            eventMap.put("task", payload);
            messagingTemplate.convertAndSend("/topic/board/" + boardId, eventMap);
        }
    }

    // Helper method to lookup user by username or email and send Task Assigned email
    private void triggerTaskAssignedEmail(String assigneeIdentifier, Task task, Board board) {
        if (assigneeIdentifier == null || assigneeIdentifier.trim().isEmpty()) return;

        String cleanIdentifier = assigneeIdentifier.trim();
        User user = userRepository.findByUsername(cleanIdentifier)
                .orElseGet(() -> userRepository.findByEmail(cleanIdentifier).orElse(null));

        if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
            String recipientName = user.getUsername() != null ? user.getUsername() : (user.getName() != null ? user.getName() : "Member");
            String boardName = (board != null && board.getName() != null) ? board.getName() : "OnTime Board";
            String dueDateStr = task.getDueDate() != null ? task.getDueDate() : "Not Set";
            String priorityStr = task.getPriority() != null ? task.getPriority().name() : "MEDIUM";

            emailService.sendTaskAssignedEmail(
                user.getEmail(),
                recipientName,
                "Workspace Member",
                task.getTitle(),
                boardName,
                dueDateStr,
                priorityStr
            );
        }
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskRepository.findAll());
    }

    @GetMapping("/user/assigned")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAssignedTasksForUser(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username parameter missing");
        }

        String cleanUser = username.trim().toLowerCase();

        List<Task> allTasks = taskRepository.findAll();
        List<Task> assignedTasks = allTasks.stream().filter(t -> {
            if (t.getAssignedTo() != null && t.getAssignedTo().getUsername() != null) {
                if (t.getAssignedTo().getUsername().toLowerCase().trim().equals(cleanUser)) {
                    return true;
                }
            }
            if (t.getAssignee() != null && !t.getAssignee().trim().isEmpty()) {
                if (t.getAssignee().toLowerCase().trim().equals(cleanUser)) {
                    return true;
                }
            }
            return false;
        }).toList();

        return ResponseEntity.ok(assignedTasks);
    }

    @PostMapping
    public ResponseEntity<Task> createGeneralTask(@RequestBody Task task) {
        task.setCreatedAt(LocalDateTime.now());
        if (task.getStatus() == null) {
            task.setStatus(TaskStatus.TODO);
        }
        if (task.getPosition() == null || task.getPosition() == 0) {
            task.setPosition(1000.0);
        }
        
        Task savedTask = taskRepository.saveAndFlush(task);

        if (savedTask.getBoard() != null) {
            broadcastTaskEvent(savedTask.getBoard().getId(), "TASK_CREATED", savedTask);
        }

        return ResponseEntity.ok(savedTask);
    }

    @PostMapping("/board/{boardId}")
    public ResponseEntity<?> createTask(@RequestBody Task task, 
                                        @PathVariable Long boardId, 
                                        @RequestParam(required = false) Long assignedUserId) {
        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) {
            return ResponseEntity.badRequest().body("Error: Board not found!");
        }

        task.setBoard(board);
        task.setCreatedAt(LocalDateTime.now());

        if (task.getBoardList() != null && task.getBoardList().getId() != null) {
            BoardList list = boardListRepository.findById(task.getBoardList().getId()).orElse(null);
            if (list != null) {
                task.setBoardList(list);
            }
        }

        if (task.getPosition() == null || task.getPosition() == 0) {
            List<Task> existingTasks = taskRepository.findByBoardId(boardId);
            if (existingTasks.isEmpty()) {
                task.setPosition(1000.0);
            } else {
                Double maxPos = existingTasks.stream()
                        .mapToDouble(t -> t.getPosition() != null ? t.getPosition() : 0.0)
                        .max()
                        .orElse(0.0);
                task.setPosition(maxPos + 1000.0);
            }
        }

        if (assignedUserId != null) {
            User assignedUser = userRepository.findById(assignedUserId).orElse(null);
            task.setAssignedTo(assignedUser);
            if (assignedUser != null) {
                task.setAssignee(assignedUser.getUsername() != null ? assignedUser.getUsername() : assignedUser.getName());
            }
        }

        Task savedTask = taskRepository.saveAndFlush(task);
        broadcastTaskEvent(boardId, "TASK_CREATED", savedTask);

        // Send email if assigned during task creation
        if (savedTask.getAssignee() != null && !savedTask.getAssignee().isBlank()) {
            triggerTaskAssignedEmail(savedTask.getAssignee(), savedTask, board);
        }

        return ResponseEntity.ok(savedTask);
    }

    @GetMapping("/board/{boardId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Task>> getTasksByBoard(@PathVariable Long boardId) {
        return ResponseEntity.ok(taskRepository.findByBoardId(boardId));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable Long taskId, @RequestBody Map<String, Object> payload) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        // Capture previous assignee before updating so we only send email when assignee actually changes
        String previousAssignee = task.getAssignee() != null ? task.getAssignee().trim().toLowerCase() : "";

        // 1. Title & Description
        if (payload.get("title") != null && !payload.get("title").toString().trim().isEmpty()) {
            task.setTitle(payload.get("title").toString().trim());
        }
        if (payload.containsKey("description")) {
            task.setDescription(payload.get("description") != null ? payload.get("description").toString() : "");
        }

        // 2. Priority & Status & DueDate
        if (payload.get("priority") != null) {
            try {
                task.setPriority(TaskPriority.valueOf(payload.get("priority").toString().toUpperCase()));
            } catch (Exception ignored) {}
        }

        if (payload.containsKey("dueDate")) {
            task.setDueDate(payload.get("dueDate") != null ? payload.get("dueDate").toString() : null);
        }

        if (payload.get("status") != null) {
            try {
                task.setStatus(TaskStatus.valueOf(payload.get("status").toString().toUpperCase()));
            } catch (Exception ignored) {}
        }

        // 3. Assignee
        if (payload.containsKey("assignee") || payload.containsKey("assignedTo")) {
            String assigneeName = null;
            if (payload.get("assignee") != null) {
                assigneeName = payload.get("assignee").toString();
            } else if (payload.get("assignedTo") != null) {
                assigneeName = payload.get("assignedTo").toString();
            }

            if (assigneeName != null && !assigneeName.trim().isEmpty()) {
                String cleanName = assigneeName.trim();
                task.setAssignee(cleanName);

                User user = userRepository.findByUsername(cleanName)
                        .orElseGet(() -> userRepository.findByEmail(cleanName).orElse(null));
                task.setAssignedTo(user);
            } else {
                task.setAssignee(null);
                task.setAssignedTo(null);
            }
        }

        // 4. Checklist
        if (payload.containsKey("checklist") && payload.get("checklist") != null) {
            try {
                Object checklistObj = payload.get("checklist");
                if (checklistObj instanceof List) {
                    List<?> checklistList = (List<?>) checklistObj;
                    List<ChecklistItem> newChecklist = new ArrayList<>();
                    
                    for (Object item : checklistList) {
                        if (item instanceof Map) {
                            Map<?, ?> itemMap = (Map<?, ?>) item;
                            String text = itemMap.get("text") != null ? itemMap.get("text").toString() : "";
                            boolean completed = itemMap.get("completed") != null && Boolean.parseBoolean(itemMap.get("completed").toString());
                            newChecklist.add(new ChecklistItem(text, completed));
                        }
                    }

                    if (task.getChecklist() == null) {
                        task.setChecklist(new ArrayList<>());
                    }
                    task.getChecklist().clear();
                    task.getChecklist().addAll(newChecklist);
                }
            } catch (Exception e) {
                System.err.println("Error parsing checklist: " + e.getMessage());
            }
        }

        // 5. File Attachments Persistence
        if (payload.containsKey("attachments") && payload.get("attachments") != null) {
            Object rawAtt = payload.get("attachments");
            if (rawAtt instanceof String) {
                String strAtt = (String) rawAtt;
                if (!strAtt.trim().isEmpty() && !strAtt.equalsIgnoreCase("null")) {
                    task.setAttachments(strAtt);
                }
            } else {
                try {
                    task.setAttachments(objectMapper.writeValueAsString(rawAtt));
                } catch (Exception e) {
                    task.setAttachments(rawAtt.toString());
                }
            }
        }

        // 6. Position
        if (payload.get("position") != null) {
            try {
                task.setPosition(Double.parseDouble(payload.get("position").toString()));
            } catch (Exception ignored) {}
        }

        // 7. BoardList
        if (payload.get("boardList") != null) {
            try {
                Object listObj = payload.get("boardList");
                Long listId = null;
                if (listObj instanceof Map) {
                    Map<?, ?> listMap = (Map<?, ?>) listObj;
                    if (listMap.get("id") != null) {
                        listId = Long.parseLong(listMap.get("id").toString());
                    }
                } else {
                    listId = Long.parseLong(listObj.toString());
                }

                if (listId != null) {
                    BoardList newList = boardListRepository.findById(listId).orElse(null);
                    if (newList != null) {
                        task.setBoardList(newList);
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing boardList: " + e.getMessage());
            }
        }

        Task savedTask = taskRepository.saveAndFlush(task);

        // Send Gmail notification if a new assignee was set or changed
        String newAssignee = savedTask.getAssignee() != null ? savedTask.getAssignee().trim().toLowerCase() : "";
        if (!newAssignee.isEmpty() && !newAssignee.equals(previousAssignee)) {
            triggerTaskAssignedEmail(savedTask.getAssignee(), savedTask, savedTask.getBoard());
        }

        if (savedTask.getBoard() != null) {
            Long bId = savedTask.getBoard().getId();
            broadcastTaskEvent(bId, "TASK_UPDATED", savedTask);
            broadcastTaskEvent(bId, "TASK_ASSIGNED", savedTask);
        }

        return ResponseEntity.ok(savedTask);
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(@PathVariable Long taskId, @RequestParam TaskStatus status) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        task.setStatus(status);
        Task savedTask = taskRepository.saveAndFlush(task);

        if (savedTask.getBoard() != null) {
            broadcastTaskEvent(savedTask.getBoard().getId(), "TASK_UPDATED", savedTask);
        }

        return ResponseEntity.ok(savedTask);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        Long boardId = task.getBoard() != null ? task.getBoard().getId() : null;

        // 1. Unlink task from parent BoardList (CRITICAL for JPA bidirectional delete)
        if (task.getBoardList() != null && task.getBoardList().getTasks() != null) {
            task.getBoardList().getTasks().remove(task);
        }
        task.setBoardList(null);
        task.setBoard(null);

        // 2. Delete and flush immediately to database
        taskRepository.delete(task);
        taskRepository.flush();

        if (boardId != null) {
            messagingTemplate.convertAndSend("/topic/board/" + boardId, Map.of(
                "type", "TASK_DELETED",
                "taskId", taskId
            ));
        }

        return ResponseEntity.ok(Map.of("message", "Task deleted successfully!", "taskId", taskId));
    }
}