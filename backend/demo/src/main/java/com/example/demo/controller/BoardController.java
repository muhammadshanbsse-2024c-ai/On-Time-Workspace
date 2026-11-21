package com.example.demo.controller;

import com.example.demo.model.Board;
import com.example.demo.model.BoardMember;
import com.example.demo.model.BoardRole;
import com.example.demo.model.User;
import com.example.demo.repository.BoardMemberRepository;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/boards")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@SuppressWarnings({"rawtypes", "unchecked"})
public class BoardController {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BoardMemberRepository boardMemberRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private void broadcastBoardUpdate(Long boardId, Object data) {
        try {
            if (boardId != null) {
                messagingTemplate.convertAndSend("/topic/board/" + boardId, data);
            }
            messagingTemplate.convertAndSend("/topic/dashboard", "BOARD_MUTATED");
        } catch (Exception ignored) {}
    }

    private Map mapBoardToDTO(Board board) {
        Map dto = new HashMap();
        if (board == null) return dto;

        dto.put("id", board.getId());
        dto.put("name", board.getName() != null ? board.getName() : "Untitled Board");
        dto.put("title", board.getName() != null ? board.getName() : "Untitled Board");
        dto.put("ownerId", board.getOwner() != null ? board.getOwner().getId() : null);
        
        if (board.getOwner() != null) {
            Map ownerInfo = new HashMap();
            ownerInfo.put("id", board.getOwner().getId());
            ownerInfo.put("name", board.getOwner().getName() != null ? board.getOwner().getName() : board.getOwner().getUsername());
            ownerInfo.put("username", board.getOwner().getUsername());
            ownerInfo.put("email", board.getOwner().getEmail() != null ? board.getOwner().getEmail() : "");
            ownerInfo.put("avatarUrl", board.getOwner().getAvatarUrl() != null ? board.getOwner().getAvatarUrl() : ""); // Added avatarUrl
            dto.put("owner", ownerInfo);
        }
        return dto;
    }

    private Map createResponseMap(String message) {
        Map response = new HashMap();
        response.put("message", message);
        return response;
    }

    @GetMapping
    public ResponseEntity<?> getAllBoards() {
        try {
            List boards = boardRepository.findAll();
            List response = new ArrayList();
            for (Object b : boards) {
                if (b != null) {
                    response.add(mapBoardToDTO((Board) b));
                }
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<?> getBoardsByOwner(@PathVariable Long ownerId) {
        try {
            if (ownerId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            User user = userRepository.findById(ownerId).orElse(null);
            if (user == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            Set userBoards = new LinkedHashSet();

            try {
                List ownedBoards = boardRepository.findByOwnerId(ownerId);
                if (ownedBoards != null) {
                    userBoards.addAll(ownedBoards);
                }
            } catch (Exception ignored) {}

            try {
                List memberBoards = boardRepository.findBoardsByMemberUserId(ownerId);
                if (memberBoards != null) {
                    userBoards.addAll(memberBoards);
                }
            } catch (Exception ignored) {}

            List responseList = new ArrayList();
            for (Object b : userBoards) {
                if (b != null) {
                    responseList.add(mapBoardToDTO((Board) b));
                }
            }

            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/{boardId}")
    public ResponseEntity<?> getBoardById(@PathVariable Long boardId) {
        try {
            Optional<Board> boardOpt = boardRepository.findById(boardId);
            if (boardOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(mapBoardToDTO(boardOpt.get()));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/owner/{ownerId}")
    public ResponseEntity<?> createBoardForOwner(@PathVariable Long ownerId, @RequestBody Map payload) {
        try {
            String name = (String) payload.get("name");
            if (name == null || name.trim().isEmpty()) {
                name = (String) payload.get("title");
            }

            User owner = userRepository.findById(ownerId).orElse(null);
            if (owner == null) {
                return ResponseEntity.badRequest().body(createResponseMap("User not found with id: " + ownerId));
            }

            Board board = new Board();
            board.setName(name != null && !name.trim().isEmpty() ? name.trim() : "Untitled Board");
            board.setOwner(owner);

            Board savedBoard = boardRepository.save(board);

            try {
                BoardMember ownerMember = new BoardMember();
                ownerMember.setBoard(savedBoard);
                ownerMember.setUser(owner);
                ownerMember.setRole(BoardRole.MEMBER);
                boardMemberRepository.save(ownerMember);
            } catch (Exception ignored) {}

            Map responseData = mapBoardToDTO(savedBoard);
            broadcastBoardUpdate(savedBoard.getId(), responseData);

            return ResponseEntity.ok(responseData);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(createResponseMap("Failed to create board: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createBoard(@RequestBody Map payload) {
        try {
            String name = (String) payload.get("name");
            if (name == null || name.trim().isEmpty()) {
                name = (String) payload.get("title");
            }

            Long parsedOwnerId = null;
            if (payload.containsKey("ownerId") && payload.get("ownerId") != null) {
                try {
                    parsedOwnerId = Long.parseLong(payload.get("ownerId").toString());
                } catch (Exception e) {
                    parsedOwnerId = null;
                }
            }

            if (parsedOwnerId == null) {
                return ResponseEntity.badRequest().body(createResponseMap("Owner ID is required"));
            }

            User owner = userRepository.findById(parsedOwnerId).orElse(null);
            if (owner == null) {
                return ResponseEntity.badRequest().body(createResponseMap("User not found with id: " + parsedOwnerId));
            }

            Board board = new Board();
            board.setName(name != null && !name.trim().isEmpty() ? name.trim() : "Untitled Board");
            board.setOwner(owner);

            Board savedBoard = boardRepository.save(board);

            try {
                BoardMember ownerMember = new BoardMember();
                ownerMember.setBoard(savedBoard);
                ownerMember.setUser(owner);
                ownerMember.setRole(BoardRole.MEMBER);
                boardMemberRepository.save(ownerMember);
            } catch (Exception ignored) {}

            Map responseData = mapBoardToDTO(savedBoard);
            broadcastBoardUpdate(savedBoard.getId(), responseData);

            return ResponseEntity.ok(responseData);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(createResponseMap("Failed to create board: " + e.getMessage()));
        }
    }

    @GetMapping("/{boardId}/members")
    public ResponseEntity<?> getBoardMembers(@PathVariable Long boardId) {
        try {
            Board board = boardRepository.findById(boardId).orElse(null);
            if (board == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List membersList = new ArrayList();

            if (board.getOwner() != null) {
                Map ownerMap = new HashMap();
                ownerMap.put("id", board.getOwner().getId());
                ownerMap.put("name", board.getOwner().getName() != null ? board.getOwner().getName() : board.getOwner().getUsername());
                ownerMap.put("username", board.getOwner().getUsername());
                ownerMap.put("email", board.getOwner().getEmail());
                ownerMap.put("avatarUrl", board.getOwner().getAvatarUrl() != null ? board.getOwner().getAvatarUrl() : ""); // Added avatarUrl
                ownerMap.put("role", "OWNER");
                membersList.add(ownerMap);
            }

            List allMembers = boardMemberRepository.findAll();
            for (Object obj : allMembers) {
                BoardMember bm = (BoardMember) obj;
                if (bm != null && bm.getBoard() != null && bm.getBoard().getId().equals(boardId)) {
                    User member = bm.getUser();
                    if (member != null && (board.getOwner() == null || !member.getId().equals(board.getOwner().getId()))) {
                        Map memberMap = new HashMap();
                        memberMap.put("id", member.getId());
                        memberMap.put("name", member.getName() != null ? member.getName() : member.getUsername());
                        memberMap.put("username", member.getUsername());
                        memberMap.put("email", member.getEmail());
                        memberMap.put("avatarUrl", member.getAvatarUrl() != null ? member.getAvatarUrl() : ""); // Added avatarUrl
                        
                        String roleStr = "EDITOR";
                        if (bm.getRole() != null) {
                            roleStr = bm.getRole().name();
                        }
                        memberMap.put("role", roleStr);
                        membersList.add(memberMap);
                    }
                }
            }

            return ResponseEntity.ok(membersList);
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PutMapping("/{boardId}/members/{userId}/role")
    public ResponseEntity<?> updateMemberRole(
            @PathVariable Long boardId,
            @PathVariable Long userId,
            @RequestBody Map payload) {

        String requestedRole = (String) payload.get("role");
        if (requestedRole == null || requestedRole.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(createResponseMap("Role is required."));
        }

        BoardMember member = null;
        List allMembers = boardMemberRepository.findAll();
        for (Object obj : allMembers) {
            BoardMember bm = (BoardMember) obj;
            if (bm != null && bm.getBoard() != null && bm.getBoard().getId().equals(boardId)
                    && bm.getUser() != null && bm.getUser().getId().equals(userId)) {
                member = bm;
                break;
            }
        }

        if (member == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            BoardRole roleEnum = BoardRole.valueOf(requestedRole.toUpperCase());
            member.setRole(roleEnum);
        } catch (Exception e) {
            member.setRole(BoardRole.MEMBER);
        }

        boardMemberRepository.save(member);

        Map response = createResponseMap("Member role updated successfully!");
        broadcastBoardUpdate(boardId, response);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{boardId}/invite")
    public ResponseEntity<?> inviteMember(@PathVariable Long boardId, @RequestBody Map payload) {
        String identifier = (String) payload.get("username");
        if (identifier == null || identifier.trim().isEmpty()) {
            identifier = (String) payload.get("email");
        }
        if (identifier == null || identifier.trim().isEmpty()) {
            identifier = (String) payload.get("identifier");
        }

        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(createResponseMap("Please provide a username or email address."));
        }

        String searchKey = identifier.trim();

        User user = userRepository.findByUsername(searchKey)
                .orElseGet(() -> userRepository.findByEmail(searchKey).orElse(null));

        if (user == null) {
            return ResponseEntity.badRequest().body(createResponseMap("User not found with identifier: " + searchKey));
        }

        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) {
            return ResponseEntity.badRequest().body(createResponseMap("Board not found!"));
        }

        if (board.getOwner() != null && board.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body(createResponseMap("User is already the owner of this board!"));
        }

        boolean alreadyMember = false;
        List allMembers = boardMemberRepository.findAll();
        for (Object obj : allMembers) {
            BoardMember bm = (BoardMember) obj;
            if (bm != null && bm.getBoard() != null && bm.getBoard().getId().equals(boardId)
                    && bm.getUser() != null && bm.getUser().getId().equals(user.getId())) {
                alreadyMember = true;
                break;
            }
        }

        if (alreadyMember) {
            return ResponseEntity.badRequest().body(createResponseMap("User is already a member of this board!"));
        }

        BoardMember newMember = new BoardMember();
        newMember.setBoard(board);
        newMember.setUser(user);
        newMember.setRole(BoardRole.MEMBER);
        
        boardMemberRepository.save(newMember);

        Map response = createResponseMap("User invited successfully!");
        broadcastBoardUpdate(boardId, response);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{boardId}/members/{memberId}")
    public ResponseEntity<?> removeMember(@PathVariable Long boardId, @PathVariable Long memberId) {
        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) return ResponseEntity.notFound().build();

        BoardMember memberRecord = null;
        List allMembers = boardMemberRepository.findAll();
        for (Object obj : allMembers) {
            BoardMember bm = (BoardMember) obj;
            if (bm != null && bm.getBoard() != null && bm.getBoard().getId().equals(boardId)
                    && bm.getUser() != null && bm.getUser().getId().equals(memberId)) {
                memberRecord = bm;
                break;
            }
        }

        if (memberRecord != null) {
            boardMemberRepository.delete(memberRecord);
        }

        User member = userRepository.findById(memberId).orElse(null);
        if (member != null && board.getMembers() != null) {
            board.getMembers().remove(member);
            boardRepository.save(board);
        }
        
        Map response = createResponseMap("Member removed successfully.");
        broadcastBoardUpdate(boardId, response);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{boardId}/transfer-ownership")
    public ResponseEntity<?> transferOwnership(@PathVariable Long boardId, @RequestBody Map payload) {
        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) return ResponseEntity.notFound().build();

        if (!payload.containsKey("newOwnerId")) {
            return ResponseEntity.badRequest().body(createResponseMap("newOwnerId is required"));
        }

        Long newOwnerId = Long.parseLong(payload.get("newOwnerId").toString());
        User newOwner = userRepository.findById(newOwnerId).orElse(null);
        if (newOwner == null) return ResponseEntity.badRequest().body(createResponseMap("New owner user not found."));

        board.setOwner(newOwner);
        boardRepository.save(board);

        Map response = createResponseMap("Ownership transferred successfully.");
        broadcastBoardUpdate(boardId, response);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{boardId}")
    public ResponseEntity<?> deleteBoard(@PathVariable Long boardId) {
        if (!boardRepository.existsById(boardId)) {
            return ResponseEntity.notFound().build();
        }
        boardRepository.deleteById(boardId);
        broadcastBoardUpdate(boardId, createResponseMap("Board deleted"));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{boardId}")
    public ResponseEntity<?> updateBoard(@PathVariable Long boardId, @RequestBody Map payload) {
        Board board = boardRepository.findById(boardId).orElse(null);
        if (board == null) {
            return ResponseEntity.notFound().build();
        }

        String name = (String) payload.get("name");
        if (name != null && !name.trim().isEmpty()) {
            board.setName(name.trim());
        }

        Board updatedBoard = boardRepository.save(board);
        Map responseData = mapBoardToDTO(updatedBoard);
        broadcastBoardUpdate(boardId, responseData);

        return ResponseEntity.ok(responseData);
    }
}