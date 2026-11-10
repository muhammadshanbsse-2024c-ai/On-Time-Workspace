package com.example.demo.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class PresenceController {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Map boardId -> Map<Username, UserInfoMap>
    private final Map<Long, Map<String, Map<String, Object>>> boardPresenceMap = new ConcurrentHashMap<>();

    public PresenceController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/board/{boardId}/join")
    public void userJoinedBoard(@DestinationVariable Long boardId, @Payload Map<String, Object> userInfo) {
        if (boardId == null || userInfo == null || userInfo.get("username") == null) return;

        String username = userInfo.get("username").toString();

        boardPresenceMap.putIfAbsent(boardId, new ConcurrentHashMap<>());
        boardPresenceMap.get(boardId).put(username, userInfo);

        // Broadcast active presence list for this board
        List<Map<String, Object>> activeUsers = new ArrayList<>(boardPresenceMap.get(boardId).values());
        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/presence", activeUsers);
    }

    @MessageMapping("/board/{boardId}/leave")
    public void userLeftBoard(@DestinationVariable Long boardId, @Payload Map<String, Object> userInfo) {
        if (boardId == null || userInfo == null || userInfo.get("username") == null) return;

        String username = userInfo.get("username").toString();

        if (boardPresenceMap.containsKey(boardId)) {
            boardPresenceMap.get(boardId).remove(username);
            List<Map<String, Object>> activeUsers = new ArrayList<>(boardPresenceMap.get(boardId).values());
            messagingTemplate.convertAndSend("/topic/board/" + boardId + "/presence", activeUsers);
        }
    }
}