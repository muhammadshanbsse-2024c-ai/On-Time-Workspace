package com.example.demo.controller;

import com.example.demo.model.Board;
import com.example.demo.model.BoardList;
import com.example.demo.repository.BoardListRepository;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.CommentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/lists")
@CrossOrigin(origins = "*")
@Transactional
public class BoardListController {

    private final BoardListRepository boardListRepository;
    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardListController(BoardListRepository boardListRepository, 
                               BoardRepository boardRepository,
                               CommentRepository commentRepository,
                               SimpMessagingTemplate messagingTemplate) {
        this.boardListRepository = boardListRepository;
        this.boardRepository = boardRepository;
        this.commentRepository = commentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @SuppressWarnings("rawtypes")
    private Map<String, Object> mapListToDTO(BoardList list) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", list.getId());
        dto.put("name", list.getName());
        dto.put("position", list.getPosition());
        
        if (list.getBoard() != null) {
            dto.put("boardId", list.getBoard().getId());
        }

        List taskDTOs = new ArrayList();
        if (list.getTasks() != null) {
            list.getTasks().forEach(task -> {
                Map<String, Object> tDto = new HashMap<>();
                tDto.put("id", task.getId());
                tDto.put("title", task.getTitle());
                tDto.put("description", task.getDescription());
                tDto.put("priority", task.getPriority() != null ? task.getPriority().toString() : "MEDIUM");
                tDto.put("status", task.getStatus() != null ? task.getStatus().toString() : "TODO");
                tDto.put("position", task.getPosition());
                tDto.put("dueDate", task.getDueDate() != null ? task.getDueDate().toString() : null);
                tDto.put("assignee", task.getAssignee());
                
                // 1. ATTACHMENTS MAPPING
                String att = task.getAttachments();
                tDto.put("attachments", (att != null && !att.trim().isEmpty()) ? att : "[]");

                // 2. CLEAN DYNAMIC COMMENT COUNT FROM DEDICATED DB REPOSITORY
                int commentCount = 0;
                if (task.getId() != null) {
                    try {
                        commentCount = commentRepository.countByTaskId(task.getId());
                    } catch (Exception e) {
                        commentCount = 0;
                    }
                }
                tDto.put("commentsCount", commentCount);

                if (task.getAssignedTo() != null) {
                    Map<String, Object> uMap = new HashMap<>();
                    uMap.put("id", task.getAssignedTo().getId());
                    uMap.put("username", task.getAssignedTo().getUsername());
                    uMap.put("email", task.getAssignedTo().getEmail());
                    tDto.put("assignedTo", uMap);
                    tDto.put("assignedUser", uMap);
                } else {
                    tDto.put("assignedTo", task.getAssignee());
                }

                List checklistDTOs = new ArrayList();
                if (task.getChecklist() != null) {
                    task.getChecklist().forEach(item -> {
                        Map<String, Object> cMap = new HashMap<>();
                        cMap.put("text", item.getText());
                        cMap.put("completed", item.isCompleted());
                        checklistDTOs.add(cMap);
                    });
                }
                tDto.put("checklist", checklistDTOs);

                taskDTOs.add(tDto);
            });
        }
        dto.put("tasks", taskDTOs);

        return dto;
    }

    @GetMapping("/board/{boardId}")
    @Transactional(readOnly = true)
    @SuppressWarnings("rawtypes")
    public ResponseEntity<?> getListsByBoard(@PathVariable Long boardId) {
        try {
            List<BoardList> lists = boardListRepository.findByBoardIdOrderByPositionAsc(boardId);
            
            if (lists == null || lists.isEmpty()) {
                Board board = boardRepository.findById(boardId).orElse(null);
                if (board != null) {
                    BoardList todo = new BoardList();
                    todo.setName("To Do");
                    todo.setPosition(1000.0);
                    todo.setBoard(board);

                    BoardList inProgress = new BoardList();
                    inProgress.setName("In Progress");
                    inProgress.setPosition(2000.0);
                    inProgress.setBoard(board);

                    BoardList done = new BoardList();
                    done.setName("Done");
                    done.setPosition(3000.0);
                    done.setBoard(board);

                    lists = Arrays.asList(
                        boardListRepository.save(todo),
                        boardListRepository.save(inProgress),
                        boardListRepository.save(done)
                    );
                }
            }

            List response = new ArrayList();
            for (BoardList list : lists) {
                response.add(mapListToDTO(list));
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error fetching board lists: " + e.getMessage());
        }
    }

    @PostMapping("/board/{boardId}")
    public ResponseEntity<?> createList(@PathVariable Long boardId, @RequestBody BoardList boardList) {
        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) {
            return ResponseEntity.badRequest().body("Board not found!");
        }
        boardList.setBoard(board);
        
        if (boardList.getPosition() == null || boardList.getPosition() == 0) {
            List<BoardList> existingLists = boardListRepository.findByBoardIdOrderByPositionAsc(boardId);
            if (existingLists.isEmpty()) {
                boardList.setPosition(1000.0);
            } else {
                Double maxPos = existingLists.get(existingLists.size() - 1).getPosition();
                boardList.setPosition(maxPos != null ? maxPos + 1000.0 : 1000.0);
            }
        }
        BoardList savedList = boardListRepository.save(boardList);
        Map<String, Object> listDTO = mapListToDTO(savedList);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, Map.of(
            "type", "LIST_CREATED",
            "data", listDTO
        ));

        return ResponseEntity.ok(listDTO);
    }

    @PutMapping("/{listId}/move")
    public ResponseEntity<?> moveList(@PathVariable Long listId, @RequestBody Map<String, Object> payload) {
        BoardList list = boardListRepository.findById(listId).orElse(null);
        if (list == null) {
            return ResponseEntity.notFound().build();
        }

        if (payload.containsKey("position")) {
            Double newPosition = Double.parseDouble(payload.get("position").toString());
            list.setPosition(newPosition);
        }

        BoardList savedList = boardListRepository.save(list);
        Long boardId = savedList.getBoard().getId();
        Map<String, Object> listDTO = mapListToDTO(savedList);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, Map.of(
            "type", "LIST_MOVED",
            "data", listDTO
        ));

        return ResponseEntity.ok(listDTO);
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<?> deleteList(@PathVariable Long listId) {
        BoardList list = boardListRepository.findById(listId).orElse(null);
        if (list == null) {
            return ResponseEntity.notFound().build();
        }

        Long boardId = list.getBoard() != null ? list.getBoard().getId() : null;
        boardListRepository.deleteById(listId);

        if (boardId != null) {
            messagingTemplate.convertAndSend("/topic/board/" + boardId, Map.of(
                "type", "LIST_DELETED",
                "listId", listId
            ));
        }

        return ResponseEntity.ok("List deleted!");
    }
}