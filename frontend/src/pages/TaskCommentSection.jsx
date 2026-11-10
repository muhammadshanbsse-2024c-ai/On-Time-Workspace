import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const TaskCommentSection = ({ 
    taskId, 
    currentUserId, 
    currentUsername, 
    currentUserAvatar, 
    boardMembers = [], 
    socket,
    isOwner = false,
    boardId = null,
    taskTitle = 'Task'
}) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [likes, setLikes] = useState({});
    const [loading, setLoading] = useState(false);

    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef(null);

    const getAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
            return path;
        }
        return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
    };

    useEffect(() => {
        if (taskId) {
            fetchComments();
        }
    }, [taskId]);

    const fetchComments = async () => {
        try {
            const res = await api.get(`/tasks/${taskId}/comments`);
            const data = Array.isArray(res.data) ? res.data : [];
            const sorted = data.sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id));
            setComments(sorted);
        } catch (err) {
            console.error("Error fetching comments:", err);
            setComments([]);
        }
    };

    useEffect(() => {
        if (socket && socket.connected) {
            try {
                const subscription = socket.subscribe(`/topic/task/${taskId}/comments`, (message) => {
                    try {
                        const event = JSON.parse(message.body);
                        if (event.type === 'COMMENT_ADDED') {
                            setComments(prev => {
                                const currentArr = Array.isArray(prev) ? prev : [];
                                if (currentArr.some(c => c.id === event.comment.id)) return currentArr;
                                return [event.comment, ...currentArr];
                            });
                        } else if (event.type === 'COMMENT_DELETED') {
                            setComments(prev => (Array.isArray(prev) ? prev.filter(c => c.id !== event.commentId) : []));
                        }
                    } catch (e) {
                        console.error("Error parsing comment websocket event", e);
                    }
                });

                return () => {
                    if (subscription) subscription.unsubscribe();
                };
            } catch (err) {
                console.error("Socket subscription error:", err);
            }
        }
    }, [socket, taskId]);

    const handleTextChange = (e) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setText(val);
        setCursorPosition(cursorPos);

        const textBeforeCursor = val.substring(0, cursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1 && lastAtPos < cursorPos) {
            const query = textBeforeCursor.substring(lastAtPos + 1);
            if (!query.includes(' ')) {
                setMentionFilter(query.toLowerCase());
                setShowMentionDropdown(true);
                return;
            }
        }
        setShowMentionDropdown(false);
    };

    const handleSelectMention = (username) => {
        const textBeforeCursor = text.substring(0, cursorPosition);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = text.substring(cursorPosition);

        const newText = text.substring(0, lastAtPos) + `@${username} ` + textAfterCursor;
        setText(newText);
        setShowMentionDropdown(false);

        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // UPDATED & RELIABLE MENTION NOTIFICATION LOGIC
    const notifyMentionedUsers = async (commentText) => {
        const activeUser = (currentUsername || localStorage.getItem('userEmail')?.split('@')[0] || 'User').toLowerCase().trim();
        
        // Match all @mentions in comment text
        const matches = commentText.match(/@([a-zA-Z0-9_.-]+)/g);
        if (!matches || matches.length === 0) return;

        const mentionedUsernames = [...new Set(matches.map(m => m.substring(1).toLowerCase().trim()))];

        for (let targetUser of mentionedUsernames) {
            if (targetUser === activeUser) continue; // Khud ko ignore karo

            // Match mentioned username with board members
            const matchedMember = boardMembers.find(m => {
                const uName = (m.username || m.name || m.email?.split('@')[0] || '').toLowerCase().trim();
                return uName === targetUser;
            });

            const recipient = matchedMember ? (matchedMember.username || matchedMember.email || targetUser) : targetUser;

            const notifPayload = {
                recipientUsername: recipient.toLowerCase().trim(),
                senderUsername: activeUser,
                message: `@${activeUser} mentioned you in a comment on task "${taskTitle || 'Task'}"`,
                type: 'COMMENT_MENTION',
                boardId: boardId ? Number(boardId) : null
            };

            try {
                // 1. Direct Backend API Call
                await api.post('/notifications', notifPayload);

                // 2. Real-time WebSocket Broadcast (if connected)
                if (socket && socket.connected) {
                    socket.publish({
                        destination: `/topic/notifications/${recipient.toLowerCase().trim()}`,
                        body: JSON.stringify({
                            id: Date.now(),
                            ...notifPayload,
                            isRead: false,
                            createdAt: new Date().toISOString()
                        })
                    });
                }
            } catch (err) {
                console.error(`Failed to send notification to ${recipient}:`, err);
            }
        }
    };

    const handlePostComment = async () => {
        if (!text.trim() || loading) return;

        setLoading(true);
        const commentContent = text.trim();
        const activeUsername = currentUsername || localStorage.getItem('userEmail')?.split('@')[0] || 'User';

        let currentAvatar = currentUserAvatar;
        if (!currentAvatar) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try { currentAvatar = JSON.parse(storedUser).avatarUrl; } catch (e) {}
            }
        }

        const payload = {
            content: commentContent,
            text: commentContent,
            userId: currentUserId,
            username: activeUsername,
            author: activeUsername,
            avatarUrl: currentAvatar,
            user: { id: currentUserId, username: activeUsername, avatarUrl: currentAvatar },
            parentId: replyingTo ? replyingTo.id : null
        };

        try {
            const res = await api.post(`/tasks/${taskId}/comments`, payload);
            const savedComment = res.data || {
                id: Date.now(),
                content: commentContent,
                text: commentContent,
                username: activeUsername,
                avatarUrl: currentAvatar,
                user: { id: currentUserId, username: activeUsername, avatarUrl: currentAvatar },
                createdAt: new Date().toISOString(),
                parentComment: replyingTo ? { id: replyingTo.id } : null
            };

            setComments(prev => [savedComment, ...(Array.isArray(prev) ? prev : [])]);
            
            // Send mention notification with fallback
            await notifyMentionedUsers(commentContent);

            setText('');
            setReplyingTo(null);
            setShowMentionDropdown(false);
        } catch (err) {
            console.error("Error posting comment:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        handlePostComment();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlePostComment();
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.delete(`/comments/${commentId}?taskId=${taskId}`);
            setComments(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== commentId));
        } catch (err) {
            console.error("Error deleting comment:", err);
            setComments(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== commentId));
        }
    };

    const handleToggleLike = (commentId) => {
        setLikes(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const safeComments = Array.isArray(comments) ? comments : [];
    const filteredMembers = boardMembers.filter(m => 
        (m.username || m.name || '').toLowerCase().includes(mentionFilter)
    );

    const rootComments = safeComments.filter(c => !c.parentComment);
    const getReplies = (parentId) => safeComments.filter(c => c.parentComment && c.parentComment.id === parentId);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    let activeUserAvatar = currentUserAvatar;
    if (!activeUserAvatar) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { activeUserAvatar = JSON.parse(storedUser).avatarUrl; } catch (e) {}
        }
    }
    const currentDpUrl = getAvatarUrl(activeUserAvatar);

    return (
        <div style={{ fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', width: '100%' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#050505', marginBottom: '14px' }}>
                Comments ({safeComments.length})
            </h3>

            {/* Input Box */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', position: 'relative' }}>
                {currentDpUrl ? (
                    <img src={currentDpUrl} alt="Avatar" style={styles.avatarImg} />
                ) : (
                    <div style={styles.avatar}>
                        {getInitials(currentUsername)}
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative' }}>
                    {replyingTo && (
                        <div style={styles.replyBanner}>
                            <span>Replying to <strong style={{ color: '#1877f2' }}>@{replyingTo.user?.username || replyingTo.username || 'Member'}</strong></span>
                            <button type="button" onClick={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>✕</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder={replyingTo ? "Write a reply..." : "Write a comment... (use @ to mention)"}
                            rows={2}
                            style={styles.textarea}
                        />

                        {showMentionDropdown && filteredMembers.length > 0 && (
                            <div style={styles.mentionDropdown}>
                                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#65676b', fontWeight: 'bold', borderBottom: '1px solid #e4e6eb' }}>
                                    SUGGESTED MEMBERS
                                </div>
                                {filteredMembers.map((member, idx) => {
                                    const memberDp = getAvatarUrl(member.avatarUrl);
                                    const mName = member.username || member.name;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectMention(mName)}
                                            style={styles.mentionItem}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            {memberDp ? (
                                                <img src={memberDp} alt={mName} style={{ ...styles.avatarImg, width: '24px', height: '24px' }} />
                                            ) : (
                                                <div style={{ ...styles.avatar, width: '24px', height: '24px', fontSize: '11px' }}>
                                                    {getInitials(mName)}
                                                </div>
                                            )}
                                            <span style={{ fontWeight: '600', color: '#050505' }}>@{mName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button 
                                type="button" 
                                onClick={handlePostComment}
                                disabled={!text.trim() || loading}
                                style={{
                                    ...styles.postBtn,
                                    opacity: (!text.trim() || loading) ? 0.5 : 1,
                                    cursor: (!text.trim() || loading) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Posting...' : replyingTo ? 'Reply' : 'Post'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Comment List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rootComments.map(comment => (
                    <FacebookCommentItem
                        key={comment.id}
                        comment={comment}
                        replies={getReplies(comment.id)}
                        onReply={(c) => { setReplyingTo(c); textareaRef.current?.focus(); }}
                        onDelete={handleDelete}
                        onLike={handleToggleLike}
                        isLiked={!!likes[comment.id]}
                        getInitials={getInitials}
                        getAvatarUrl={getAvatarUrl}
                        boardMembers={boardMembers}
                        likesMap={likes}
                        isOwner={isOwner}
                        currentUserId={currentUserId}
                        currentUsername={currentUsername}
                    />
                ))}
            </div>
        </div>
    );
};

const FacebookCommentItem = ({ 
    comment, 
    replies, 
    onReply, 
    onDelete, 
    onLike, 
    isLiked, 
    getInitials, 
    getAvatarUrl, 
    boardMembers, 
    likesMap,
    isOwner,
    currentUserId,
    currentUsername
}) => {
    const username = comment.user?.username || comment.username || comment.author || 'Member';
    const commentUserId = comment.user?.id || comment.userId;

    const activeUName = (currentUsername || localStorage.getItem('userEmail')?.split('@')[0] || '').toLowerCase().trim();
    const activeUID = String(currentUserId || localStorage.getItem('userId') || '');

    const isCommentAuthor = (
        (commentUserId && String(commentUserId) === activeUID) ||
        (username && username.toLowerCase().trim() === activeUName)
    );

    const canDeleteComment = isOwner || isCommentAuthor;

    let avatarPath = comment.user?.avatarUrl || comment.avatarUrl || comment.authorAvatar;
    if (!avatarPath && Array.isArray(boardMembers)) {
        const matchedMember = boardMembers.find(m => (m.username || m.name)?.toLowerCase() === username.toLowerCase());
        if (matchedMember) avatarPath = matchedMember.avatarUrl;
    }
    const avatarSrc = getAvatarUrl(avatarPath);

    const renderFormattedText = (content) => {
        if (!content) return null;
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                return <span key={i} style={{ color: '#1877f2', fontWeight: '600', cursor: 'pointer' }}>{part}</span>;
            }
            return part;
        });
    };

    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            {avatarSrc ? (
                <img src={avatarSrc} alt={username} style={styles.avatarImg} />
            ) : (
                <div style={styles.avatar}>
                    {getInitials(username)}
                </div>
            )}

            <div style={{ flex: 1 }}>
                <div style={styles.commentBubble}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#050505', marginBottom: '2px' }}>
                        @{username}
                    </div>
                    <div style={{ fontSize: '13px', color: '#050505', lineHeight: '1.38', whiteSpace: 'pre-wrap' }}>
                        {renderFormattedText(comment.text || comment.content)}
                    </div>
                </div>

                <div style={styles.actionRow}>
                    <span 
                        onClick={() => onLike(comment.id)} 
                        style={{ ...styles.actionLink, color: isLiked ? '#1877f2' : '#65676b', fontWeight: isLiked ? 'bold' : '600' }}
                    >
                        {isLiked ? 'Liked 👍' : 'Like'}
                    </span>
                    <span>·</span>
                    <span onClick={() => onReply(comment)} style={styles.actionLink}>
                        Reply
                    </span>

                    {canDeleteComment && (
                        <>
                            <span>·</span>
                            <span onClick={() => onDelete(comment.id)} style={{ ...styles.actionLink, color: '#f02849' }}>
                                Delete
                            </span>
                        </>
                    )}

                    <span>·</span>
                    <span style={{ color: '#8a8d91', fontSize: '11px' }}>
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                </div>

                {replies && replies.length > 0 && (
                    <div style={{ marginLeft: '12px', borderLeft: '2px solid #e4e6eb', paddingLeft: '12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {replies.map(reply => (
                            <FacebookCommentItem
                                key={reply.id}
                                comment={reply}
                                replies={[]}
                                onReply={onReply}
                                onDelete={onDelete}
                                onLike={onLike}
                                isLiked={!!likesMap[reply.id]}
                                getInitials={getInitials}
                                getAvatarUrl={getAvatarUrl}
                                boardMembers={boardMembers}
                                likesMap={likesMap}
                                isOwner={isOwner}
                                currentUserId={currentUserId}
                                currentUsername={currentUsername}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    avatar: {
        width: '32px', height: '32px', borderRadius: '50%',
        backgroundColor: '#e4e6eb', color: '#050505', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
        fontSize: '13px', flexShrink: 0
    },
    avatarImg: {
        width: '32px', height: '32px', borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0, border: '1px solid #e4e6eb'
    },
    commentBubble: {
        backgroundColor: '#f0f2f5', borderRadius: '16px', padding: '8px 12px',
        display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word'
    },
    actionRow: {
        display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px',
        marginTop: '3px', marginLeft: '10px', color: '#65676b'
    },
    actionLink: { fontWeight: '600', cursor: 'pointer', color: '#65676b', userSelect: 'none' },
    textarea: {
        width: '100%', backgroundColor: '#f0f2f5', border: 'none',
        borderRadius: '14px', padding: '8px 12px', fontSize: '13px',
        outline: 'none', resize: 'none', boxSizing: 'border-box'
    },
    replyBanner: {
        backgroundColor: '#e7f3ff', padding: '4px 10px', borderRadius: '6px',
        marginBottom: '6px', fontSize: '12px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
    },
    cancelReplyBtn: { border: 'none', background: 'none', cursor: 'pointer', color: '#65676b', fontWeight: 'bold' },
    mentionDropdown: {
        position: 'absolute', bottom: '40px', left: '0', backgroundColor: '#ffffff',
        border: '1px solid #ced0d4', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: '220px', maxHeight: '160px', overflowY: 'auto', zIndex: 1000
    },
    mentionItem: {
        padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #f0f2f5'
    },
    postBtn: {
        backgroundColor: '#1877f2', color: '#ffffff', border: 'none',
        borderRadius: '6px', padding: '6px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
    }
};

export default TaskCommentSection;