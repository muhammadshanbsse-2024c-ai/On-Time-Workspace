import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { 
  Plus, ArrowLeft, Trash2, X, FileText, Tag, Calendar, Edit3, Save, 
  GripVertical, Users, ShieldAlert, LogOut, Wifi, Activity, Clock, 
  MessageSquare, Send, Search, LayoutGrid, List, Columns,
  Filter, ArrowUpDown, ChevronRight, Home, CheckSquare, Settings, 
  Layers, Briefcase, UserMinus, ChevronDown, UserPlus, CheckCircle, AlertTriangle, Bell,
  Paperclip, File, Download, Image as ImageIcon, Video as VideoIcon, ExternalLink,
  PieChart, BarChart3, TrendingUp, Check, Camera, Upload
} from 'lucide-react';
import api from '../services/api';
import TaskCommentSection from './TaskCommentSection';

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: () => {}
  });

  // Navigation, Sidebar Drawer & View Mode States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('column'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Members Header Stack View State
  const [showMoreMembersModal, setShowMoreMembersModal] = useState(false);

  // Floating Tooltip State
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, show: false });

  // Advanced Filter States
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // All User Boards for Top Navigation Dropdown
  const [allUserBoards, setAllUserBoards] = useState([]);

  // Backend States
  const [boardDetails, setBoardDetails] = useState({ name: 'OnTime Board', ownerId: null });
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [lists, setLists] = useState([]);

  // Profile Picture Upload Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Real-time Presence Active Users
  const [activePresenceUsers, setActivePresenceUsers] = useState([]);

  // Activity Log History Feed
  const [activities, setActivities] = useState([]);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  // Media Preview Lightbox Modal State
  const [previewMedia, setPreviewMedia] = useState(null);

  // Attach Menu Dropdown & File Types State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileAcceptType, setFileAcceptType] = useState('image/*,video/*,application/pdf,.doc,.docx');
  const attachMenuRef = useRef(null);

  // Dropdown Outside Click Refs
  const filterDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Form & UI States
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddColumnCard, setShowAddColumnCard] = useState(false);
  const [addingTaskColId, setAddingTaskColId] = useState(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineTaskPriority, setInlineTaskPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // My Tasks Modal State
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

  // Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Task Details Modal States
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  // Checklist / Sub-task Points State
  const [checklist, setChecklist] = useState([]);
  const [newPointText, setNewPointText] = useState('');

  // File Attachments State
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Members & Board Settings Modal States
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [boardNameInput, setBoardNameInput] = useState('');

  const stompClientRef = useRef(null);

  const getAvatarUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
  };

  const handleMouseEnterTooltip = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
      show: true
    });
    setTooltipText(text);
  };

  const handleMouseLeaveTooltip = () => {
    setTooltipPos(prev => ({ ...prev, show: false }));
  };

  const safeParseAttachments = (attData) => {
    if (!attData) return [];
    
    let current = attData;

    while (typeof current === 'string') {
      const trimmed = current.trim();
      if (!trimmed || trimmed === "null" || trimmed === "[]") return [];
      
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          current = JSON.parse(trimmed);
        } catch (e) {
          current = [trimmed];
          break;
        }
      } else {
        current = [trimmed];
        break;
      }
    }

    if (!Array.isArray(current)) {
      current = [current];
    }

    return current
      .filter(item => item !== null && item !== undefined && item !== "null" && item !== "")
      .map(item => {
        let itemObj = item;

        if (typeof itemObj === 'string' && itemObj.trim().startsWith('{')) {
          try {
            itemObj = JSON.parse(itemObj);
          } catch (e) {}
        }

        if (typeof itemObj === 'object' && itemObj !== null) {
          return itemObj.url || itemObj.fileUrl || itemObj.path || JSON.stringify(itemObj);
        }

        return String(itemObj);
      });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setIsNotifDropdownOpen(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const openConfirmDialog = ({ title, message, confirmText = 'Delete', cancelText = 'Cancel', type = 'danger', onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const extractAssigneeName = (task) => {
    if (!task) return '';
    if (typeof task.assignee === 'string' && task.assignee.trim()) return task.assignee.trim();
    if (typeof task.assignedTo === 'string' && task.assignedTo.trim()) return task.assignedTo.trim();
    if (task.assignee && typeof task.assignee === 'object') {
      if (task.assignee.username) return task.assignee.username;
      if (task.assignee.name) return task.assignee.name;
    }
    if (task.assignedTo && typeof task.assignedTo === 'object') {
      if (task.assignedTo.username) return task.assignedTo.username;
      if (task.assignedTo.name) return task.assignedTo.name;
    }
    if (task.assignedUser && typeof task.assignedUser === 'object') {
      if (task.assignedUser.username) return task.assignedUser.username;
      if (task.assignedUser.name) return task.assignedUser.name;
    }
    return '';
  };

  const logUserActivity = async (action, description) => {
    try {
      const activeUsername = currentUser?.username || localStorage.getItem('userEmail')?.split('@')[0] || 'User';
      await api.post(`/boards/${boardId}/activities`, {
        username: activeUsername,
        action: action,
        description: description
      });
    } catch (err) {}
  };

  const sendInAppNotification = async (recipientUsername, message, type) => {
    if (!recipientUsername) return;
    try {
      const activeUser = currentUser?.username || localStorage.getItem('userEmail')?.split('@')[0] || 'User';
      await api.post('/notifications', {
        recipientUsername: recipientUsername.toLowerCase().trim(),
        senderUsername: activeUser,
        message: message,
        type: type,
        boardId: Number(boardId)
      });
    } catch (err) {}
  };

  const handleToggleNotificationDropdown = async () => {
    const nextState = !isNotifDropdownOpen;
    setIsNotifDropdownOpen(nextState);

    if (nextState) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      try {
        const activeUser = currentUser?.username || localStorage.getItem('userEmail')?.split('@')[0];
        if (activeUser) {
          await api.put(`/notifications/user/${activeUser}/read-all`);
        }
      } catch (err) {}
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/boards/${boardId}/activities`);
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setActivities([]);
    }
  };

  const fetchUserNotifications = async () => {
    try {
      const activeUser = currentUser?.username || localStorage.getItem('userEmail')?.split('@')[0];
      if (activeUser) {
        const res = await api.get(`/notifications/user/${activeUser}`);
        setNotifications(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      setNotifications([]);
    }
  };

  const fetchCurrentUserDetails = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data) {
        setCurrentUser((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchBoardData();
    fetchAllUserBoards();
    fetchActivities();
    fetchUserNotifications();
    fetchCurrentUserDetails();

    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);

        stompClient.subscribe(`/topic/board/${boardId}/presence`, (message) => {
          try {
            const presenceUsers = JSON.parse(message.body);
            setActivePresenceUsers(Array.isArray(presenceUsers) ? presenceUsers : []);
          } catch (e) {}
        });

        stompClient.subscribe(`/topic/board/${boardId}`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            handleRealtimeEvent(payload);
          } catch (e) {}
        });

        const activeUser = localStorage.getItem('userEmail')?.split('@')[0] || 'User';
        if (activeUser) {
          const userTopic = `/topic/notifications/${activeUser.toLowerCase().trim()}`;
          stompClient.subscribe(userTopic, (message) => {
            try {
              const newNotif = JSON.parse(message.body);
              setNotifications((prev) => [newNotif, ...(Array.isArray(prev) ? prev : [])]);
              showNotification(`🔔 ${newNotif.message}`, 'info');
            } catch (e) {}
          });
        }

        const storedUser = localStorage.getItem('user');
        let currentUName = localStorage.getItem('userEmail')?.split('@')[0] || 'User';
        if (storedUser) {
          try { currentUName = JSON.parse(storedUser).username || currentUName; } catch(e){}
        }

        stompClient.publish({
          destination: `/app/board/${boardId}/join`,
          body: JSON.stringify({
            username: currentUName,
            userId: localStorage.getItem('userId')
          })
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      }
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClientRef.current) {
        try { stompClientRef.current.deactivate(); } catch (e) {}
      }
    };
  }, [boardId]);

  const fetchAllUserBoards = async () => {
    try {
      const rawUser = localStorage.getItem('user');
      const userId = localStorage.getItem('userId');
      let uid = userId;
      if (!uid && rawUser) {
        try { uid = JSON.parse(rawUser)?.id; } catch(e){}
      }
      if (uid) {
        const res = await api.get(`/boards/owner/${uid}`);
        setAllUserBoards(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {}
  };

  const fetchBoardData = async () => {
    try {
      setLoading(true);

      const rawUser = localStorage.getItem('user');
      const rawUserId = localStorage.getItem('userId');
      const rawEmail = localStorage.getItem('userEmail');
      let fallbackName = rawEmail ? rawEmail.split('@')[0] : 'Member';

      let userObj = {
        id: rawUserId || null,
        email: rawEmail || '',
        username: fallbackName,
        name: fallbackName
      };

      if (rawUser) {
        try {
          const parsed = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;
          userObj = { ...userObj, ...parsed };
        } catch (e) {}
      }

      setCurrentUser(userObj);

      const boardRes = await api.get(`/boards/${boardId}`);
      if (!boardRes.data) {
        navigate('/dashboard');
        return;
      }

      setBoardDetails(boardRes.data || { name: 'OnTime Board' });
      setBoardNameInput(boardRes.data?.name || 'OnTime Board');

      try {
        const membersRes = await api.get(`/boards/${boardId}/members`);
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      } catch (err) {
        setMembers([]);
      }

      const response = await api.get(`/lists/board/${boardId}`);
      const rawData = response.data || [];
      
      const safeData = (Array.isArray(rawData) ? rawData : []).map((l) => ({
        ...l,
        tasks: (Array.isArray(l.tasks) ? l.tasks : []).map(t => {
          const matchedAssignee = extractAssigneeName(t);
          const parsedAtts = safeParseAttachments(t.attachments);

          return {
            ...t,
            boardList: t.boardList || { id: l.id },
            listId: l.id,
            assignee: matchedAssignee,
            assignedTo: matchedAssignee,
            checklist: Array.isArray(t.checklist) ? t.checklist : [],
            attachments: parsedAtts,
            commentsCount: t.commentsCount !== undefined ? t.commentsCount : (Array.isArray(t.comments) ? t.comments.length : 0)
          };
        })
      })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      setLists(safeData);

      setSelectedTask((prevSelected) => {
        if (!prevSelected) return null;
        for (let col of safeData) {
          const match = col.tasks.find(t => String(t.id) === String(prevSelected.id));
          if (match) {
            setAttachments([...match.attachments]);
            return { ...match };
          }
        }
        return prevSelected;
      });

    } catch (err) {
      if (err.response?.status === 500 || err.response?.status === 404) {
        showNotification('Board workspace missing. Redirecting to dashboard...', 'info');
        setTimeout(() => navigate('/dashboard'), 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedAvatarFile) {
      showNotification('Please select an image file first.', 'error');
      return;
    }

    const userId = currentUser?.id || localStorage.getItem('userId');
    if (!userId) {
      showNotification('User ID not found.', 'error');
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', selectedAvatarFile);
    formData.append('userId', userId);

    try {
      const res = await api.post('/users/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedAvatarUrl = res.data?.avatarUrl;
      setCurrentUser((prev) => ({ ...prev, avatarUrl: updatedAvatarUrl }));

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.avatarUrl = updatedAvatarUrl;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (e) {}
      }

      showNotification('Profile picture updated successfully!', 'success');
      setIsProfileModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
      fetchBoardData();
    } catch (err) {
      showNotification('Failed to upload profile picture.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRealtimeEvent = (event) => {
    if (!event) return;

    if (event.type === 'ACTIVITY_LOGGED' && event.log) {
      setActivities((prev) => [event.log, ...(Array.isArray(prev) ? prev : [])]);
    }

    if (event.name) {
      setBoardDetails((prev) => ({ ...prev, name: event.name }));
      setBoardNameInput(event.name);
      return;
    }

    const { type, data, listId, taskId } = event;

    if (type === 'TASK_UPDATED' || type === 'TASK_ASSIGNED' || type === 'TASK_MOVED' || type === 'ATTACHMENT_UPDATED') {
      const updatedTask = data || event.task;
      if (updatedTask) {
        const cleanAssignee = extractAssigneeName(updatedTask) || updatedTask.assignee || updatedTask.assignedTo;
        const freshAttachments = safeParseAttachments(updatedTask.attachments);

        setLists((prevLists) =>
          (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
            ...col,
            tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
              if (String(t.id) === String(updatedTask.id)) {
                return { 
                  ...t, 
                  ...updatedTask, 
                  assignee: cleanAssignee, 
                  assignedTo: cleanAssignee,
                  assignedUser: cleanAssignee ? { username: cleanAssignee } : null,
                  checklist: Array.isArray(updatedTask.checklist) ? updatedTask.checklist : (t.checklist || []),
                  attachments: freshAttachments
                };
              }
              return t;
            })
          }))
        );

        setSelectedTask((prevSelected) => {
          if (prevSelected && String(prevSelected.id) === String(updatedTask.id)) {
            const freshChecklist = Array.isArray(updatedTask.checklist) ? updatedTask.checklist : (prevSelected.checklist || []);
            setChecklist([...freshChecklist]);
            setAttachments([...freshAttachments]);
            return { 
              ...prevSelected, 
              ...updatedTask, 
              assignee: cleanAssignee, 
              assignedTo: cleanAssignee,
              assignedUser: cleanAssignee ? { username: cleanAssignee } : null,
              checklist: freshChecklist,
              attachments: freshAttachments
            };
          }
          return prevSelected;
        });
      }
    }

    switch (type) {
      case 'LIST_CREATED':
        setLists((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          return current.some(l => String(l.id) === String(data.id)) ? current : [...current, { ...data, tasks: data.tasks || [] }];
        });
        break;

      case 'LIST_MOVED':
        setLists((prev) =>
          (Array.isArray(prev) ? prev : []).map((l) => (String(l.id) === String(data.id) ? { ...l, position: data.position } : l))
            .sort((a, b) => (a.position || 0) - (b.position || 0))
        );
        break;

      case 'LIST_DELETED':
        setLists((prev) => (Array.isArray(prev) ? prev : []).filter((l) => String(l.id) !== String(listId)));
        break;

      case 'TASK_CREATED':
        fetchBoardData();
        break;

      case 'TASK_DELETED':
        setLists((prev) => (Array.isArray(prev) ? prev : []).map((l) => ({ ...l, tasks: (l.tasks || []).filter((t) => String(t.id) !== String(taskId)) })));
        break;

      default:
        break;
    }
  };

  const currentUserId = currentUser?.id || currentUser?._id || localStorage.getItem('userId');
  const currentUsername = (currentUser?.username || currentUser?.name || localStorage.getItem('userEmail')?.split('@')[0] || '').toLowerCase().trim();
  const currentUserEmail = (currentUser?.email || localStorage.getItem('userEmail') || '').toLowerCase().trim();

  const boardOwnerId = boardDetails?.ownerId || (typeof boardDetails?.owner === 'object' ? boardDetails?.owner?.id : boardDetails?.owner);
  const ownerMember = (Array.isArray(members) ? members : []).find(m => m.role === 'OWNER' || String(m.id || m._id) === String(boardOwnerId));

  const isOwnerById = Boolean(currentUserId && boardOwnerId && String(currentUserId) === String(boardOwnerId));
  const isOwnerByRole = (Array.isArray(members) ? members : []).some(
    m => (
      (currentUserId && String(m.id || m._id) === String(currentUserId)) ||
      (currentUsername && m.username?.toLowerCase()?.trim() === currentUsername) ||
      (currentUserEmail && m.email?.toLowerCase()?.trim() === currentUserEmail)
    ) && (m.role === 'OWNER' || m.isOwner)
  );
  const isOwnerByEmail = Boolean(currentUserEmail && ownerMember?.email && ownerMember.email.toLowerCase().trim() === currentUserEmail);
  const isOwner = isOwnerById || isOwnerByRole || isOwnerByEmail;

  const currentUserMember = (Array.isArray(members) ? members : []).find(
    (m) =>
      (currentUserId && String(m.id || m._id) === String(currentUserId)) ||
      (currentUsername && m.username?.toLowerCase()?.trim() === currentUsername) ||
      (currentUserEmail && m.email?.toLowerCase()?.trim() === currentUserEmail)
  );
  const isViewOnlyUser = currentUserMember && (currentUserMember.role === 'VIEW_ONLY' || currentUserMember.role === 'VIEWER');
  const canEditBoard = isOwner || !isViewOnlyUser;

  const handleUpdateMemberRole = async (memberId, newRole) => {
    const backendRole = newRole === 'VIEW_ONLY' ? 'VIEWER' : 'MEMBER';

    setMembers((prev) =>
      (Array.isArray(prev) ? prev : []).map((m) =>
        String(m.id || m._id) === String(memberId)
          ? { ...m, role: backendRole }
          : m
      )
    );

    try {
      await api.put(`/boards/${boardId}/members/${memberId}/role`, { role: backendRole });
      showNotification(`Role updated successfully!`, 'success');
      fetchBoardData();
    } catch (err) {}
  };

  const handleRenameBoard = async () => {
    if (!boardNameInput.trim()) return;
    try {
      await api.put(`/boards/${boardId}`, { name: boardNameInput.trim() });
      logUserActivity('BOARD_RENAMED', `Renamed board to "${boardNameInput.trim()}"`);
      setBoardDetails((prev) => ({ ...prev, name: boardNameInput.trim() }));
      setIsEditingBoardName(false);
      showNotification('Board title updated successfully!', 'success');
    } catch (err) {
      showNotification('Failed to rename board.', 'error');
    }
  };

  const handleDeleteBoard = () => {
    openConfirmDialog({
      title: 'Delete OnTime Board',
      message: 'Are you sure you want to delete this board? All lists and tasks will be permanently removed.',
      confirmText: 'Delete Board',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/boards/${boardId}`);
          showNotification('Board deleted successfully.', 'info');
          setTimeout(() => navigate('/dashboard'), 800);
        } catch (err) {
          showNotification('Board removed.', 'info');
          setTimeout(() => navigate('/dashboard'), 800);
        }
      }
    });
  };

  const handleLeaveBoard = () => {
    if (isOwner) {
      showNotification('Board owners cannot leave. Please transfer ownership or delete board.', 'error');
      return;
    }

    openConfirmDialog({
      title: 'Leave Workspace',
      message: 'Are you sure you want to leave this OnTime board?',
      confirmText: 'Leave Board',
      type: 'warning',
      onConfirm: async () => {
        try {
          await api.post(`/boards/${boardId}/leave`);
          showNotification('You have left the board workspace.', 'info');
          setTimeout(() => navigate('/dashboard'), 800);
        } catch (err) {
          setTimeout(() => navigate('/dashboard'), 800);
        }
      }
    });
  };

  const handleInviteMember = async (e) => {
    if (e) e.preventDefault();
    const inputVal = inviteEmail.trim();
    if (!inputVal) return;

    try {
      await api.post(`/boards/${boardId}/invite`, { username: inputVal });
      logUserActivity('MEMBER_INVITED', `Invited @${inputVal} to the board`);
      sendInAppNotification(inputVal, `@${currentUsername} invited you to board "${boardDetails.name}"`, 'BOARD_INVITE');
      showNotification(`Member @${inputVal} invited successfully!`, 'success');
      setInviteEmail('');
      fetchBoardData();
    } catch (err) {
      showNotification('User not found. Ensure account is registered.', 'error');
    }
  };

  const handleRemoveMember = (memberId, memberUsername) => {
    openConfirmDialog({
      title: 'Remove Member',
      message: `Are you sure you want to remove @${memberUsername || 'this member'}?`,
      confirmText: 'Remove Member',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/boards/${boardId}/members/${memberId}`);
          logUserActivity('MEMBER_REMOVED', `Removed @${memberUsername || 'member'} from board`);
          setMembers((prev) => (Array.isArray(prev) ? prev : []).filter(m => String(m.id || m._id) !== String(memberId)));
          showNotification('Member removed from workspace.', 'info');
        } catch (err) {
          setMembers((prev) => (Array.isArray(prev) ? prev : []).filter(m => String(m.id || m._id) !== String(memberId)));
        }
      }
    });
  };

  const handleAddList = async (e) => {
    if (e) e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await api.post(`/lists/board/${boardId}`, { name: newListTitle.trim() });
      await logUserActivity('LIST_CREATED', `Created new column "${newListTitle.trim()}"`);
      setNewListTitle('');
      setShowAddColumnCard(false);
      showNotification('New column added successfully!', 'success');
      fetchBoardData();
      fetchActivities();
    } catch (err) {
      showNotification('Failed to create new column.', 'error');
    }
  };

  const handleDeleteList = (listId, e) => {
    if (e) e.stopPropagation();
    openConfirmDialog({
      title: 'Delete Column',
      message: 'Are you sure you want to delete this column and all its assigned tasks?',
      confirmText: 'Delete Column',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/lists/${listId}`);
          await logUserActivity('LIST_DELETED', `Deleted a column`);
          showNotification('Column deleted successfully.', 'info');
          fetchBoardData();
          fetchActivities();
        } catch (err) {
          showNotification('Failed to delete column.', 'error');
        }
      }
    });
  };

  const handleAddInlineTask = async (targetListId) => {
    if (!inlineTaskTitle.trim() || !targetListId) return;

    const activeUser = localStorage.getItem('userEmail')?.split('@')[0] || currentUsername || 'User';

    try {
      const payload = {
        title: inlineTaskTitle.trim(),
        description: "Task description",
        priority: inlineTaskPriority,
        status: 'TODO',
        listId: Number(targetListId),
        boardList: { id: Number(targetListId) },
        assignee: activeUser
      };

      await api.post(`/tasks/board/${boardId}`, payload);
      
      setInlineTaskTitle('');
      setInlineTaskPriority('MEDIUM');
      setAddingTaskColId(null);
      showNotification('Task created successfully!', 'success');
      fetchBoardData();
      fetchActivities();
    } catch (err) {
      try {
        const fallbackPayload = {
          title: inlineTaskTitle.trim(),
          description: "Task description",
          priority: inlineTaskPriority,
          status: 'TODO',
          assignee: activeUser
        };

        await api.post(`/tasks/list/${targetListId}`, fallbackPayload);

        setInlineTaskTitle('');
        setInlineTaskPriority('MEDIUM');
        setAddingTaskColId(null);
        showNotification('Task created successfully!', 'success');
        fetchBoardData();
        fetchActivities();
      } catch (fallbackErr) {
        showNotification("Failed to create task.", "error");
      }
    }
  };

  const handleDeleteTask = (taskId, e) => {
    if (e) e.stopPropagation();
    openConfirmDialog({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete Task',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/tasks/${taskId}`);
          await logUserActivity('TASK_DELETED', `Deleted a task`);
          if (selectedTask && String(selectedTask.id) === String(taskId)) setSelectedTask(null);
          showNotification('Task deleted successfully.', 'info');
          fetchBoardData();
          fetchActivities();
        } catch (err) {
          showNotification('Failed to delete task.', 'error');
        }
      }
    });
  };

  const handleAddChecklistItem = (e) => {
    if (e) e.preventDefault();
    if (!newPointText.trim()) return;
    const updated = [...checklist, { text: newPointText.trim(), completed: false }];
    setChecklist(updated);
    setNewPointText('');
    saveChecklistToBackend(updated);
  };

  const handleToggleChecklistItem = (index) => {
    if (!canEditBoard) return;
    const updated = checklist.map((item, idx) => 
      idx === index ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    saveChecklistToBackend(updated);
  };

  const handleDeleteChecklistItem = (index) => {
    if (!canEditBoard) return;
    const updated = checklist.filter((_, idx) => idx !== index);
    setChecklist(updated);
    saveChecklistToBackend(updated);
  };

  const saveChecklistToBackend = async (updatedList) => {
    if (!selectedTask) return;
    try {
      const payload = { 
        ...selectedTask,
        attachments: JSON.stringify(attachments),
        checklist: updatedList 
      };
      await api.put(`/tasks/${selectedTask.id}`, payload);
      const updatedTaskObj = { ...selectedTask, checklist: updatedList };
      setSelectedTask(updatedTaskObj);
      
      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
            if (String(t.id) === String(selectedTask.id)) {
              return { ...t, checklist: updatedList };
            }
            return t;
          })
        }))
      );

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/topic/board/${boardId}`,
          body: JSON.stringify({
            type: 'TASK_UPDATED',
            task: updatedTaskObj,
            data: updatedTaskObj
          })
        });
      }
    } catch (e) {}
  };

  const saveAttachmentsToBackend = async (taskId, updatedList) => {
    if (!taskId) return;

    try {
      const stringifiedAttachments = JSON.stringify(updatedList);

      const payload = {
        ...selectedTask,
        id: Number(taskId),
        attachments: stringifiedAttachments
      };
      
      const res = await api.put(`/tasks/${taskId}`, payload);
      
      const freshAtts = safeParseAttachments(res.data?.attachments || stringifiedAttachments);

      setSelectedTask((prev) => ({ 
        ...prev, 
        ...(res.data || {}), 
        attachments: freshAtts 
      }));
      
      setAttachments([...freshAtts]);

      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
            if (String(t.id) === String(taskId)) {
              return { ...t, attachments: freshAtts };
            }
            return t;
          })
        }))
      );

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/topic/board/${boardId}`,
          body: JSON.stringify({
            type: 'ATTACHMENT_UPDATED',
            taskId: taskId,
            task: { ...selectedTask, attachments: freshAtts }
          })
        });
      }

      showNotification('File saved to database successfully!', 'success');
      fetchActivities();
    } catch (err) {
      showNotification('Failed to save file to database', 'error');
    }
  };

  const handleSelectAttachmentType = (type) => {
    setShowAttachMenu(false);

    if (type === 'image') {
      setFileAcceptType('image/*');
    } else if (type === 'video') {
      setFileAcceptType('video/*');
    } else {
      setFileAcceptType('.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip');
    }

    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
        fileInputRef.current.click();
      }
    }, 150);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target?.files || []);
    if (!files.length || !selectedTask || !selectedTask.id) return;

    const currentTaskId = selectedTask.id;
    let updatedList = [...attachments];

    for (let file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        let fileUrl = null;

        if (typeof res.data === 'string') {
          fileUrl = res.data;
        } else if (res.data) {
          fileUrl = res.data.url || res.data.fileUrl || res.data.path;
        }

        if (fileUrl) {
          updatedList.push(fileUrl);
        }
      } catch (err) {
        showNotification('File Upload Server Error!', 'error');
      }
    }

    setAttachments([...updatedList]);
    await saveAttachmentsToBackend(currentTaskId, updatedList);
    
    if (e.target) e.target.value = null;
  };

  const handleDeleteAttachment = (index) => {
    openConfirmDialog({
      title: 'Remove Attachment',
      message: 'Are you sure you want to remove this attachment?',
      confirmText: 'Remove File',
      type: 'danger',
      onConfirm: () => {
        const updated = attachments.filter((_, idx) => idx !== index);
        setAttachments(updated);
        saveAttachmentsToBackend(selectedTask.id, updated);
      }
    });
  };

  const parseAttachment = (attStr) => {
    let parsedObj = { name: 'Attachment File', url: '#', type: 'file' };

    if (typeof attStr === 'object' && attStr !== null) {
      parsedObj = {
        name: attStr.name || attStr.fileName || 'Attachment File',
        url: attStr.url || attStr.fileUrl || '#',
        type: attStr.type || 'file'
      };
    } else if (typeof attStr === 'string') {
      try {
        if (attStr.startsWith('{') || attStr.startsWith('"')) {
          const res = typeof attStr === 'string' && attStr.startsWith('{') ? JSON.parse(attStr) : JSON.parse(JSON.parse(attStr));
          parsedObj = {
            name: res.name || 'Attachment File',
            url: res.url || res.fileUrl || '#',
            type: res.type || 'file'
          };
        } else {
          parsedObj = { name: attStr.split('/').pop(), url: attStr, type: 'file' };
        }
      } catch (e) {
        parsedObj = { name: attStr.split('/').pop(), url: attStr, type: 'file' };
      }
    }

    if (parsedObj.url && !parsedObj.url.startsWith('http://') && !parsedObj.url.startsWith('https://') && !parsedObj.url.startsWith('blob:')) {
      parsedObj.url = `http://localhost:8080${parsedObj.url.startsWith('/') ? '' : '/'}${parsedObj.url}`;
    }

    const lowerName = (parsedObj.name || '').toLowerCase();
    const lowerUrl = (parsedObj.url || '').toLowerCase();
    const isImage = (parsedObj.type && parsedObj.type.includes('image')) || lowerName.match(/\.(png|jpe?g|gif|webp|svg)$/i) || lowerUrl.match(/\.(png|jpe?g|gif|webp|svg)$/i);
    const isVideo = (parsedObj.type && parsedObj.type.includes('video')) || lowerName.match(/\.(mp4|webm|ogg)$/i) || lowerUrl.match(/\.(mp4|webm|ogg)$/i);

    return {
      ...parsedObj,
      isImage,
      isVideo
    };
  };

  const getDueStatusBadge = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) {
      return <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">Overdue</span>;
    } else if (taskDate.getTime() === today.getTime()) {
      return <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">Due Today</span>;
    }
    return null;
  };

  const handleDragStartTask = (e, task, sourceListId) => {
    if (!canEditBoard) return;
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'TASK', taskId: task.id, sourceListId }));
    setDraggedItem({ type: 'TASK', task, sourceListId });
  };

  const handleDragStartColumn = (e, listIndex, listId) => {
    if (!canEditBoard) return;
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'COLUMN', listIndex, listId }));
    setDraggedItem({ type: 'COLUMN', listIndex, listId });
  };

  const handleDragOver = (e, index = null) => {
    if (!canEditBoard) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (index !== null && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDropOnColumn = async (e, targetListId, targetListIndex) => {
    if (!canEditBoard) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    let rawData = null;
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) rawData = JSON.parse(jsonStr);
    } catch(err){}

    const activeDrag = rawData || draggedItem;
    if (!activeDrag) return;

    if (activeDrag.type === 'COLUMN') {
      const sourceIndex = activeDrag.listIndex !== undefined ? activeDrag.listIndex : lists.findIndex(l => String(l.id) === String(activeDrag.listId));
      if (sourceIndex === -1 || sourceIndex === targetListIndex) {
        setDraggedItem(null);
        return;
      }
      
      const reordered = Array.from(lists);
      const [movedList] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetListIndex, 0, movedList);

      const updatedWithPositions = reordered.map((col, idx) => ({ ...col, position: idx }));
      setLists(updatedWithPositions);
      setDraggedItem(null);

      try {
        await api.put(`/lists/${movedList.id}/move`, { position: targetListIndex });
        await logUserActivity('LIST_REORDERED', `Reordered column "${movedList.name}" to position ${targetListIndex + 1}`);

        if (stompClientRef.current && stompClientRef.current.connected) {
          stompClientRef.current.publish({
            destination: `/topic/board/${boardId}`,
            body: JSON.stringify({
              type: 'LIST_MOVED',
              data: { id: movedList.id, position: targetListIndex }
            })
          });
        }
        showNotification('Column order updated!', 'success');
        fetchActivities();
      } catch (err) {
        fetchBoardData();
      }
      return;
    }

    if (activeDrag.type === 'TASK') {
      const taskId = activeDrag.taskId || activeDrag.task?.id;
      const sourceListId = activeDrag.sourceListId;

      if (!taskId || String(sourceListId) === String(targetListId)) {
        setDraggedItem(null);
        return;
      }

      let movedTaskObj = activeDrag.task;
      if (!movedTaskObj) {
        const sourceCol = lists.find(l => String(l.id) === String(sourceListId));
        movedTaskObj = sourceCol?.tasks?.find(t => String(t.id) === String(taskId));
      }

      if (!movedTaskObj) {
        setDraggedItem(null);
        return;
      }

      const activeAssignee = extractAssigneeName(movedTaskObj);
      const targetColumn = lists.find(l => String(l.id) === String(targetListId));
      const targetColumnName = targetColumn ? targetColumn.name : 'new column';

      setLists((prevLists) => {
        return (Array.isArray(prevLists) ? prevLists : []).map((col) => {
          if (String(col.id) === String(sourceListId)) {
            return { 
              ...col, 
              tasks: (col.tasks || []).filter((t) => String(t.id) !== String(taskId)) 
            };
          }
          if (String(col.id) === String(targetListId)) {
            const updatedTask = { 
              ...movedTaskObj, 
              boardList: { id: Number(targetListId) }, 
              listId: Number(targetListId),
              assignee: activeAssignee,
              assignedTo: activeAssignee
            };
            return { 
              ...col, 
              tasks: [...(col.tasks || []).filter((t) => String(t.id) !== String(taskId)), updatedTask] 
            };
          }
          return col;
        });
      });

      setDraggedItem(null);

      try {
        await api.put(`/tasks/${taskId}`, {
          id: Number(taskId),
          title: movedTaskObj.title,
          description: movedTaskObj.description || '',
          priority: movedTaskObj.priority || 'MEDIUM',
          dueDate: movedTaskObj.dueDate || null,
          assignee: activeAssignee || null,
          assignedTo: activeAssignee || null,
          boardList: { id: Number(targetListId) },
          attachments: JSON.stringify(movedTaskObj.attachments || [])
        });

        await logUserActivity('TASK_MOVED', `Moved task "${movedTaskObj.title}" to ${targetColumnName}`);

        if (stompClientRef.current && stompClientRef.current.connected) {
          stompClientRef.current.publish({
            destination: `/topic/board/${boardId}`,
            body: JSON.stringify({
              type: 'TASK_MOVED',
              task: { ...movedTaskObj, assignee: activeAssignee, assignedTo: activeAssignee, boardList: { id: Number(targetListId) } }
            })
          });
        }
        showNotification(`Moved task to "${targetColumnName}"`, 'success');
        fetchActivities();
      } catch (err) {
        showNotification('Failed to save task move.', 'error');
        fetchBoardData();
      }
    }
  };

  const handleOpenTaskModal = (task) => {
    if (!task) return;

    const existingAttachments = safeParseAttachments(task.attachments);

    setSelectedTask({ 
      ...task, 
      attachments: existingAttachments 
    });
    
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'MEDIUM');
    setEditDueDate(task.dueDate || '');

    const existingChecklist = Array.isArray(task.checklist) ? task.checklist : [];
    setChecklist([...existingChecklist]);
    setNewPointText('');

    setAttachments([...existingAttachments]);
    
    const activeNominee = extractAssigneeName(task);
    setEditAssignee(activeNominee);
    setIsEditing(false);
  };

  const handleSaveTaskUpdates = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedTask || !selectedTask.id) return;

    const nomineeToSave = editAssignee && editAssignee.trim() ? editAssignee.trim() : null;
    const titleToSave = editTitle && editTitle.trim() ? editTitle.trim() : selectedTask.title;
    const targetBoardListId = selectedTask.boardList?.id || selectedTask.listId || (lists[0] ? lists[0].id : null);

    const payload = {
      id: Number(selectedTask.id),
      title: titleToSave,
      description: editDescription ? editDescription.trim() : '',
      priority: editPriority || 'MEDIUM',
      dueDate: editDueDate || null,
      assignee: nomineeToSave,
      assignedTo: nomineeToSave,
      assignedUser: nomineeToSave ? { username: nomineeToSave } : null,
      boardList: targetBoardListId ? { id: Number(targetBoardListId) } : null,
      board: { id: Number(boardId) },
      checklist: checklist,
      attachments: JSON.stringify(attachments)
    };

    try {
      const response = await api.put(`/tasks/${selectedTask.id}`, payload);
      const resData = response.data || {};

      const finalNominee = nomineeToSave || extractAssigneeName(resData) || '';

      const updatedTaskObj = {
        ...selectedTask,
        ...resData,
        title: titleToSave,
        description: editDescription,
        priority: editPriority,
        dueDate: editDueDate,
        assignee: finalNominee,
        assignedTo: finalNominee,
        assignedUser: finalNominee ? { username: finalNominee } : null,
        checklist: checklist,
        attachments: attachments
      };

      setSelectedTask(updatedTaskObj);

      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
            if (String(t.id) === String(selectedTask.id)) {
              return updatedTaskObj;
            }
            return t;
          })
        }))
      );

      await logUserActivity('TASK_UPDATED', `Updated task details for "${titleToSave}"`);

      if (nomineeToSave && nomineeToSave.toLowerCase() !== currentUsername) {
        sendInAppNotification(
          nomineeToSave, 
          `@${currentUsername} assigned you task "${titleToSave}"`, 
          'TASK_ASSIGNED'
        );
      }

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/topic/board/${boardId}`,
          body: JSON.stringify({
            type: 'TASK_UPDATED',
            task: updatedTaskObj,
            data: updatedTaskObj
          })
        });
      }

      setIsEditing(false);
      showNotification('Task updates saved successfully!', 'success');
      fetchActivities();
    } catch (err) {
      showNotification('Save Failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const getTagBadgeStyle = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-200';
    }
  };

  const filterTasks = (taskList) => {
    if (!taskList || !Array.isArray(taskList)) return [];

    return taskList.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatches = t.title ? t.title.toLowerCase().includes(q) : false;
        const descMatches = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!titleMatches && !descMatches) return false;
      }

      if (selectedPriorityFilter !== 'ALL') {
        if ((t.priority || 'MEDIUM').toUpperCase() !== selectedPriorityFilter.toUpperCase()) {
          return false;
        }
      }

      if (selectedAssigneeFilter !== 'ALL') {
        const taskAssignee = extractAssigneeName(t)?.toLowerCase().trim();
        if (selectedAssigneeFilter === 'UNASSIGNED') {
          if (taskAssignee) return false;
        } else {
          if (taskAssignee !== selectedAssigneeFilter.toLowerCase().trim()) return false;
        }
      }

      if (selectedDateFilter !== 'ALL' && t.dueDate) {
        const taskDate = new Date(t.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const taskDateOnly = new Date(taskDate);
        taskDateOnly.setHours(0, 0, 0, 0);

        if (selectedDateFilter === 'OVERDUE') {
          if (taskDateOnly >= today) return false;
        } else if (selectedDateFilter === 'TODAY') {
          if (taskDateOnly.getTime() !== today.getTime()) return false;
        } else if (selectedDateFilter === 'THIS_WEEK') {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          if (taskDateOnly < today || taskDateOnly > nextWeek) return false;
        }
      } else if (selectedDateFilter !== 'ALL' && !t.dueDate) {
        return false;
      }

      return true;
    });
  };

  const allFilteredTasks = lists.flatMap(l => filterTasks(l.tasks || []).map(t => ({ ...t, listName: l.name })));
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  const myAssignedTasks = allFilteredTasks.filter(t => {
    const rawAssignee = extractAssigneeName(t);
    if (!rawAssignee) return false;
    
    const cleanAssignee = rawAssignee.toLowerCase().trim();
    const storedEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
    const storedUsername = storedEmail ? storedEmail.split('@')[0] : '';
    const storedUserId = String(localStorage.getItem('userId') || '');

    const currentUName = (currentUser?.username || currentUser?.name || storedUsername).toLowerCase().trim();
    const currentUEmail = (currentUser?.email || storedEmail).toLowerCase().trim();
    const currentUID = String(currentUser?.id || storedUserId);

    return (
      cleanAssignee === currentUName ||
      cleanAssignee === currentUEmail ||
      cleanAssignee === currentUID ||
      (storedUsername && cleanAssignee === storedUsername) ||
      (storedEmail && cleanAssignee === storedEmail)
    );
  });

  // Filter Online Members for Header
  const onlineMembersList = members.filter(m => {
    const mName = (m.username || m.name || m.email?.split('@')[0] || '').toLowerCase().trim();
    return activePresenceUsers.some(
      (u) => (u.username && u.username.toLowerCase().trim() === mName) ||
             (u.userId && String(u.userId) === String(m.id || m._id))
    );
  });
  const visibleOnlineMembers = onlineMembersList.slice(0, 3);
  const extraMembersCount = members.length - visibleOnlineMembers.length;

  return (
    <div className="h-screen w-screen bg-[#ece9e2] font-sans text-slate-800 flex overflow-hidden p-2 md:p-4 gap-3 antialiased">
      
      {/* 1. SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300 bg-[#18191c] rounded-3xl flex flex-col justify-between py-6 px-3 text-slate-400 shrink-0 shadow-2xl z-30`}>
        <div className="flex flex-col space-y-6">
          
          <div 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center space-x-3 cursor-pointer group ${!isSidebarOpen ? 'justify-center w-full' : 'px-1'}`}
            title="Toggle Menu"
          >
            {currentUser?.avatarUrl ? (
              <img 
                src={getAvatarUrl(currentUser.avatarUrl)} 
                alt="Profile" 
                className="w-10 h-10 rounded-2xl object-cover border-2 border-teal-500 shadow-lg shadow-teal-500/20 group-hover:scale-105 active:scale-95 transition shrink-0 mx-auto" 
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-teal-500/20 group-hover:scale-105 active:scale-95 transition shrink-0 mx-auto">
                {(currentUser?.username || currentUsername || 'O').charAt(0).toUpperCase()}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">
                  OnTime
                </span>
                <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest mt-1">
                  Workspace
                </span>
              </div>
            )}
          </div>

          <nav className="flex flex-col space-y-2 pt-2">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Dashboard Home"
            >
              <Home className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Dashboard</span>}
            </button>

            <button 
              onClick={() => setActiveView('column')} 
              className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer w-full text-left ${activeView === 'column' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Board Kanban View"
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Board View</span>}
            </button>

            <button 
              onClick={() => setIsTasksModalOpen(true)} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer relative w-full text-left"
              title="My Assigned Tasks"
            >
              <CheckSquare className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">My Tasks</span>}
              {myAssignedTasks.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse ml-auto shrink-0" />
              )}
            </button>

            <button 
              onClick={() => setIsActivityDrawerOpen(true)} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Activity Logs"
            >
              <Activity className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Activity Logs</span>}
            </button>

            <button 
              onClick={() => setIsMembersModalOpen(true)} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Members & Settings"
            >
              <Users className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Members</span>}
            </button>
          </nav>
        </div>

        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800/80">
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer w-full text-left ${showAnalytics ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            title="Toggle Analytics Overlay"
          >
            <PieChart className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-xs font-bold truncate">Analytics</span>}
          </button>

          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center space-x-3 p-1.5 rounded-2xl cursor-pointer hover:bg-slate-800 transition group"
            title="Upload/Change Profile Picture"
          >
            <div className="relative">
              {currentUser?.avatarUrl ? (
                <img 
                  src={getAvatarUrl(currentUser.avatarUrl)} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full object-cover border-2 border-teal-500 shadow-sm shrink-0" 
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-extrabold text-xs flex items-center justify-center border-2 border-slate-700 shadow-sm shrink-0">
                  {(currentUser?.username || currentUsername || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 text-teal-400">
                <Camera className="w-2.5 h-2.5" />
              </div>
            </div>
            {isSidebarOpen && (
              <span className="text-xs font-bold text-slate-200 truncate group-hover:text-teal-400 transition">
                @{currentUser?.username || currentUsername}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN BOARD WORKSPACE CONTAINER */}
      <div className="flex-1 bg-[#f7f5f0] rounded-3xl border border-slate-300/60 shadow-xl flex flex-col min-w-0 overflow-hidden relative">
        
        {/* HEADER TOOLBAR */}
        <header className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#f7f5f0]/80 backdrop-blur-md relative z-30">
          
          <div className="flex items-center space-x-3">
            {isEditingBoardName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={boardNameInput}
                  onChange={(e) => setBoardNameInput(e.target.value)}
                  className="px-3 py-1.5 text-sm font-extrabold border border-teal-500 rounded-xl focus:outline-none bg-white text-slate-900"
                  autoFocus
                />
                <button onClick={handleRenameBoard} className="p-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 cursor-pointer">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingBoardName(false)} className="p-1.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center">
                <select
                  value={boardId}
                  onChange={(e) => navigate(`/board/${e.target.value}`)}
                  className="appearance-none bg-white text-slate-900 font-extrabold text-base rounded-2xl px-4 py-2 pr-9 border border-slate-200 shadow-2xs hover:border-teal-500 focus:outline-none cursor-pointer"
                >
                  <option value={boardId}>{boardDetails.name}</option>
                  {allUserBoards.filter(b => String(b.id) !== String(boardId)).map((b) => (
                    <option key={b.id} value={b.id}>{b.name || b.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
              </div>
            )}

            {isOwner && !isEditingBoardName && (
              <button onClick={() => setIsEditingBoardName(true)} className="text-slate-400 hover:text-teal-600 p-1 cursor-pointer" title="Rename Board">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 max-w-sm mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 placeholder-slate-400 font-medium transition shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            
            <div 
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
              title={isConnected ? "Real-time WebSocket active" : "Reconnecting..."}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-bold text-slate-700">{isConnected ? 'Live' : 'Connecting'}</span>
            </div>

            {/* ONLINE MEMBERS HEADER STACK & MORE BUTTON */}
            <div className="flex items-center -space-x-1.5 relative">
              {visibleOnlineMembers.map((m, idx) => {
                const mName = m.username || m.name || m.email?.split('@')[0] || 'User';

                return (
                  <div key={m.id || m._id || idx} title={`@${mName} (Online)`} className="relative cursor-pointer">
                    {m.avatarUrl ? (
                      <img 
                        src={getAvatarUrl(m.avatarUrl)} 
                        alt={mName} 
                        className="w-7 h-7 rounded-full object-cover border-2 border-white ring-2 ring-teal-500/40 shadow-2xs" 
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white ring-2 ring-teal-500/40 shadow-2xs">
                        {(mName).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                  </div>
                );
              })}

              {extraMembersCount > 0 && (
                <button
                  onClick={() => setShowMoreMembersModal(!showMoreMembersModal)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-2xs hover:bg-slate-700 transition cursor-pointer"
                  title="View All Workspace Members"
                >
                  +{extraMembersCount}
                </button>
              )}

              {showMoreMembersModal && (
                <div className="absolute right-0 top-9 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-slate-900">All Members ({members.length})</span>
                    <button onClick={() => setShowMoreMembersModal(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {members.map((mem, i) => {
                      const uName = mem.username || mem.name || mem.email?.split('@')[0] || 'User';
                      const isMemOnline = activePresenceUsers.some(
                        (u) => (u.username && u.username.toLowerCase().trim() === uName.toLowerCase().trim()) ||
                               (u.userId && String(u.userId) === String(mem.id || mem._id))
                      );

                      return (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 text-xs">
                          <div className="flex items-center space-x-2">
                            {mem.avatarUrl ? (
                              <img src={getAvatarUrl(mem.avatarUrl)} alt={uName} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[9px] flex items-center justify-center">
                                {uName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-bold text-slate-800">@{uName}</span>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${isMemOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isMemOnline ? 'Online' : 'Offline'} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* FILTER ICON WITH FLOATING HOVER TOOLTIP */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                onMouseEnter={(e) => handleMouseEnterTooltip(e, `Active Priority: ${selectedPriorityFilter}`)}
                onMouseLeave={handleMouseLeaveTooltip}
                className={`p-2.5 rounded-2xl border transition cursor-pointer shadow-2xs ${
                  selectedPriorityFilter !== 'ALL' || selectedAssigneeFilter !== 'ALL' || selectedDateFilter !== 'ALL'
                    ? 'bg-teal-50 text-teal-700 border-teal-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4 text-teal-600" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-xs text-slate-900">Task Filters</span>
                    <button
                      onClick={() => {
                        setSelectedPriorityFilter('ALL');
                        setSelectedAssigneeFilter('ALL');
                        setSelectedDateFilter('ALL');
                      }}
                      className="text-[10px] font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Priority</label>
                    <select
                      value={selectedPriorityFilter}
                      onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Assignee</label>
                    <select
                      value={selectedAssigneeFilter}
                      onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">All Members</option>
                      <option value="UNASSIGNED">Unassigned</option>
                      {members.map((m) => {
                        const uName = m.username || m.name || m.email?.split('@')[0];
                        return <option key={m.id || m._id || uName} value={uName}>@{uName}</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATION BELL WITH FLOATING HOVER TOOLTIP */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={handleToggleNotificationDropdown}
                onMouseEnter={(e) => handleMouseEnterTooltip(e, `${unreadNotifCount} Unread Notifications`)}
                onMouseLeave={handleMouseLeaveTooltip}
                className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 transition cursor-pointer relative shadow-2xs"
              >
                <Bell className="w-4 h-4 text-teal-600" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-xs text-slate-900">Notifications</span>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      {unreadNotifCount} Unread
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id || Math.random()} className={`p-2.5 rounded-2xl text-xs space-y-1 border ${n.isRead ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-teal-50/50 border-teal-100 font-semibold text-slate-900'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-teal-600 font-bold">@{n.senderUsername || 'System'}</span>
                            <span className="text-[9px] text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                          </div>
                          <p className="leading-snug text-[11px]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* WORKSPACE CANVAS AREA */}
        <div className="flex-1 flex overflow-hidden p-6 relative">
          
          <main className="flex-1 overflow-x-auto flex gap-5 items-start">
            {loading ? (
              <div className="text-center w-full py-20 text-xs font-bold text-slate-400">Loading board columns & tasks...</div>
            ) : (
              lists.map((list, index) => {
                const listFilteredTasks = filterTasks(list.tasks || []);

                return (
                  <div
                    key={list.id}
                    draggable={canEditBoard}
                    onDragStart={(e) => handleDragStartColumn(e, index, list.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnColumn(e, list.id, index)}
                    className={`w-[300px] shrink-0 rounded-3xl bg-[#efece4] p-4 border transition-all flex flex-col max-h-full ${
                      dragOverIndex === index ? 'border-teal-500 ring-2 ring-teal-400/40 scale-[1.01]' : 'border-slate-300/50'
                    }`}
                  >
                    {/* COLUMN TOP HEADER */}
                    <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b border-slate-300/60 cursor-grab active:cursor-grabbing">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">{list.name}</h3>
                        <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                          {listFilteredTasks.length}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {canEditBoard && (
                          <button onClick={(e) => handleDeleteList(list.id, e)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* TOP THEME-MATCHED VERTICAL ADD TASK BUTTON (JUST BELOW HEADER) */}
                    {canEditBoard && (
                      <button
                        onClick={() => {
                          setAddingTaskColId(addingTaskColId === list.id ? null : list.id);
                          setInlineTaskTitle('');
                        }}
                        className="mb-3 w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span> Add Task</span>
                      </button>
                    )}

                    {/* TOP INLINE TASK CREATION FORM */}
                    {addingTaskColId === list.id && (
                      <div className="mb-3 p-3 rounded-2xl border border-teal-500 bg-white shadow-sm space-y-2 shrink-0">
                        <input
                          type="text"
                          placeholder="Enter task title..."
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50 text-slate-900 focus:border-teal-500"
                          autoFocus
                        />
                        
                        <div className="flex items-center justify-between">
                          <select 
                            value={inlineTaskPriority} 
                            onChange={(e) => setInlineTaskPriority(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="HIGH">High Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="LOW">Low Priority</option>
                          </select>

                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => setAddingTaskColId(null)} className="px-2.5 py-1 text-xs text-slate-500 bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button onClick={() => handleAddInlineTask(list.id)} className="px-3 py-1 text-xs bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 cursor-pointer">Add</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TASK CARDS SCROLL LIST */}
                    <div 
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDropOnColumn(e, list.id, index)}
                      className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[150px]"
                    >
                      {listFilteredTasks.map((task) => {
                        const taskCommentCount = task.commentsCount !== undefined ? task.commentsCount : (Array.isArray(task.comments) ? task.comments.length : 0);
                        const cardAssignee = extractAssigneeName(task);
                        const taskChecklist = Array.isArray(task.checklist) ? task.checklist : [];
                        const taskAttachments = safeParseAttachments(task.attachments);
                        const completedCount = taskChecklist.filter(c => c.completed).length;

                        return (
                          <div
                            key={task.id}
                            draggable={canEditBoard}
                            onDragStart={(e) => handleDragStartTask(e, task, list.id)}
                            onClick={() => handleOpenTaskModal(task)}
                            className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between group shrink-0"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${getTagBadgeStyle(task.priority)}`}>
                                {task.priority || 'MEDIUM'}
                              </span>
                              {getDueStatusBadge(task.dueDate)}
                            </div>

                            <h4 className="text-xs font-extrabold text-slate-900 leading-snug mb-1">{task.title}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{task.description || 'No description provided'}</p>

                            {taskChecklist.length > 0 && (
                              <div className="mb-3">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                  <span>Progress</span>
                                  <span>{completedCount}/{taskChecklist.length}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                  <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${(completedCount / taskChecklist.length) * 100}%` }} />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                              <div className="flex items-center space-x-1.5">
                                <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-2xs">
                                  {(cardAssignee || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-600">@{cardAssignee || 'Unassigned'}</span>
                              </div>

                              <div className="flex items-center space-x-2 text-slate-400 font-bold">
                                {taskAttachments.length > 0 && (
                                  <div className="flex items-center space-x-0.5 text-teal-600">
                                    <Paperclip className="w-3 h-3" />
                                    <span>{taskAttachments.length}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-0.5">
                                  <MessageSquare className="w-3 h-3 text-slate-400" />
                                  <span>{taskCommentCount}</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })
            )}

            {canEditBoard && (
              showAddColumnCard ? (
                <div className="w-[300px] shrink-0 p-4 rounded-3xl bg-white border border-slate-200 shadow-md space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900">Add New Column</h4>
                  <input
                    type="text"
                    placeholder="e.g. In Review..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50 text-slate-900"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddColumnCard(false)} className="px-3 py-1 text-xs text-slate-500">Cancel</button>
                    <button onClick={handleAddList} className="px-4 py-1.5 text-xs bg-teal-600 text-white font-bold rounded-xl cursor-pointer">Create</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumnCard(true)}
                  className="w-[300px] shrink-0 h-40 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-xs font-extrabold text-teal-600 hover:border-teal-500 hover:bg-white transition cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span> Add New Column</span>
                </button>
              )
            )}

          </main>

          {showAnalytics && (
            <aside className="w-72 bg-[#18191c] text-white rounded-3xl p-5 ml-4 flex flex-col justify-between shrink-0 shadow-2xl z-20 transition-all">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-extrabold text-sm text-white">Project Analytics</h3>
                  <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  <div className="w-36 h-36 rounded-full border-8 border-teal-500 border-t-emerald-400 border-r-amber-400 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-2xl font-black">{allFilteredTasks.length}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Tasks</span>
                  </div>
                </div>

                <div className="space-y-3 mt-6 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Completed</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> In Progress</span>
                    <span className="font-bold">35%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending</span>
                    <span className="font-bold">20%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Active Sprint</span>
                <span className="text-teal-400 font-bold">Week 4</span>
              </div>
            </aside>
          )}

        </div>
      </div>

      {/* FLOATING HOVER TOOLTIP */}
      {tooltipPos.show && (
        <div 
          style={{ top: tooltipPos.y, left: tooltipPos.x }}
          className="fixed -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold z-50 pointer-events-none shadow-xl border border-slate-700 whitespace-nowrap"
        >
          {tooltipText}
        </div>
      )}

      {/* PROFILE PICTURE UPLOAD MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-sm w-full p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl relative flex flex-col text-center">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">Update Profile Picture</h3>
            <p className="text-xs text-slate-500 mb-4">Choose an image from your device</p>

            <div className="flex flex-col items-center space-y-4 my-2">
              <div 
                onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                className="relative w-28 h-28 rounded-full border-2 border-dashed border-teal-500 flex items-center justify-center cursor-pointer hover:bg-teal-50/50 transition overflow-hidden group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : currentUser?.avatarUrl ? (
                  <img src={getAvatarUrl(currentUser.avatarUrl)} alt="Current Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="flex flex-col items-center text-teal-600">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold">Browse</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition">
                  Change
                </div>
              </div>

              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarFileSelect} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <div className="flex gap-2 justify-center mt-4">
              <button 
                type="button" 
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setAvatarPreview(null);
                  setSelectedAvatarFile(null);
                }} 
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleUploadProfilePicture} 
                disabled={uploadingAvatar}
                className="flex-1 py-2 px-4 bg-teal-600 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingAvatar ? 'Uploading...' : 'Save Picture'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS & BOARD SETTINGS MODAL */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-md w-full p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl relative flex flex-col">
            <button onClick={() => setIsMembersModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4 shrink-0 border-b pb-3 border-slate-100">
              <Users className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-extrabold text-slate-900">OnTime Workspace Members</h2>
            </div>

            {canEditBoard && (
              <form onSubmit={handleInviteMember} className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter username to invite..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white"
                />
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 cursor-pointer">
                  Invite
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-1">
              {members.map((m) => {
                const isItemOwner = m.role === 'OWNER' || String(m.id || m._id) === String(boardOwnerId);
                const mName = m.username || m.name || m.email?.split('@')[0];
                const isViewOnlyMember = m.role === 'VIEW_ONLY' || m.role === 'VIEWER';

                return (
                  <div key={m.id || m._id || mName} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center space-x-2">
                      {m.avatarUrl ? (
                        <img src={getAvatarUrl(m.avatarUrl)} alt={mName} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                          {(mName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">@{mName}</p>
                        <p className="text-[10px] text-slate-400">{m.email || 'Member'}</p>
                      </div>
                    </div>
                    {isItemOwner ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">Owner</span>
                    ) : isOwner ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={isViewOnlyMember ? 'VIEW_ONLY' : 'EDITOR'}
                          onChange={(e) => handleUpdateMemberRole(m.id || m._id, e.target.value)}
                          className="px-2 py-1 text-[10px] font-bold border border-slate-300 rounded-lg bg-white text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="EDITOR">Can Edit</option>
                          <option value="VIEW_ONLY">View Only</option>
                        </select>
                        <button onClick={() => handleRemoveMember(m.id || m._id, mName)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove Member">
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isViewOnlyMember ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {isViewOnlyMember ? 'View Only' : 'Editor'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              {isOwner ? (
                <button onClick={handleDeleteBoard} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Board Workspace</span>
                </button>
              ) : (
                <button onClick={handleLeaveBoard} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Workspace</span>
                </button>
              )}
              <button onClick={() => setIsMembersModalOpen(false)} className="px-4 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY DRAWER */}
      {isActivityDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-80 bg-white h-full shadow-2xl p-6 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Activity History</h3>
              </div>
              <button onClick={() => setIsActivityDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No recent activity found.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id || Math.random()} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-600">@{act.username || 'User'}</span>
                      <span className="text-[10px] text-slate-400">{act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                    </div>
                    <p className="text-slate-700 font-medium leading-snug">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY ASSIGNED TASKS MODAL */}
      {isTasksModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-xl w-full p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setIsTasksModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4 shrink-0 border-b pb-3 border-slate-100">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-extrabold text-slate-900">My Assigned Tasks</h2>
              <span className="text-xs bg-teal-100 text-teal-800 font-extrabold px-2.5 py-0.5 rounded-full ml-auto">
                {myAssignedTasks.length} Total
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {myAssignedTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">No tasks assigned to you right now.</p>
                </div>
              ) : (
                myAssignedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      setIsTasksModalOpen(false);
                      handleOpenTaskModal(task);
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 transition cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">{task.listName}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTagBadgeStyle(task.priority)}`}>{task.priority || 'MEDIUM'}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{task.title}</h4>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <p className="font-semibold text-slate-600">{task.dueDate || 'No Due Date'}</p>
                      <p className="text-teal-600 font-bold">View Task →</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button type="button" onClick={() => setIsTasksModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL - VIEWPORT FIT & DEDICATED ATTACHMENTS SCROLL LAYOUT */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50">
          <div className="rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 bg-white text-slate-900 relative flex flex-col overflow-hidden">
            
            {/* TOP HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-teal-500 rounded-xl text-sm font-bold focus:outline-none bg-white text-slate-900"
                />
              ) : (
                <h2 className="text-base md:text-lg font-extrabold text-slate-900 leading-tight">{selectedTask.title}</h2>
              )}

              <div className="flex items-center space-x-3">
                {canEditBoard && !isEditing && (
                  <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-teal-600 hover:underline cursor-pointer">
                    Edit Task
                  </button>
                )}
                <button type="button" onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SPLIT GRID BODY */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
              
              {/* LEFT COLUMN: Fixed Sections + ONLY Scrollable Attachments Box */}
              <div className="p-6 border-r border-slate-100 flex flex-col gap-4 overflow-hidden text-xs">
                
                {/* 1. METADATA SECTION (FIXED) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 shrink-0">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Assignee:</span>
                    {isEditing ? (
                      <select value={editAssignee || ''} onChange={(e) => setEditAssignee(e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg bg-white font-medium text-xs text-slate-800">
                        <option value="">Unassigned</option>
                        {members.map((m) => {
                          const nameVal = m.username || m.name || m.email?.split('@')[0];
                          return <option key={m.id || m._id || nameVal} value={nameVal}>{nameVal}</option>;
                        })}
                      </select>
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[11px]">
                        @{extractAssigneeName(selectedTask) || 'Unassigned'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Priority:</span>
                    {isEditing ? (
                      <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg bg-white">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[11px]">
                        {selectedTask.priority || 'MEDIUM'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 sm:col-span-2">
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Due Date:</span>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editDueDate || ''} 
                        onChange={(e) => setEditDueDate(e.target.value)} 
                        className="px-2 py-1 border border-slate-200 rounded-lg bg-white font-medium text-xs text-slate-800"
                      />
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[11px]">
                        {selectedTask.dueDate || 'No Due Date'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. DESCRIPTION SECTION (FIXED) */}
                <div className="space-y-1.5 shrink-0">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Description</span>
                  </span>
                  {isEditing ? (
                    <textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:border-teal-500" />
                  ) : (
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-medium leading-relaxed">
                      {selectedTask.description || 'No description provided.'}
                    </p>
                  )}
                </div>

                {/* 3. CHECKLIST SECTION (FIXED) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                      <span>Checklist ({checklist.filter(c => c.completed).length}/{checklist.length})</span>
                    </span>
                  </div>

                  {canEditBoard && (
                    <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add sub-task step..."
                        value={newPointText}
                        onChange={(e) => setNewPointText(e.target.value)}
                        className="flex-1 px-3 py-1 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white"
                      />
                      <button type="submit" className="px-3 py-1 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-teal-700">
                        + Step
                      </button>
                    </form>
                  )}

                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleToggleChecklistItem(idx)}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${item.completed ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>
                            {item.completed && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className={`font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.text}</span>
                        </div>
                        {canEditBoard && (
                          <button type="button" onClick={() => handleDeleteChecklistItem(idx)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. DEDICATED ATTACHMENTS SECTION (ONLY THIS BOX IS SCROLLABLE) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between relative shrink-0">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-teal-600" />
                      <span>Attachments ({attachments.length})</span>
                    </span>

                    <div className="relative" ref={attachMenuRef}>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAttachMenu(!showAttachMenu);
                        }} 
                        className="px-2.5 py-1 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl cursor-pointer border border-teal-200 flex items-center gap-1"
                      >
                        <span>+ Attach File / Media</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showAttachMenu && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSelectAttachmentType('image')}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                            <span>Add Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAttachmentType('video')}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <VideoIcon className="w-3.5 h-3.5 text-teal-600" />
                            <span>Add Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAttachmentType('file')}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                            <span>Add Document</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INDIVIDUAL SCROLLABLE ATTACHMENTS LIST BOX */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {attachments.map((attStr, idx) => {
                      const fileObj = parseAttachment(attStr);
                      return (
                        <div key={idx} className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate">
                              {fileObj.isImage ? <ImageIcon className="w-4 h-4 text-teal-600 shrink-0" /> : fileObj.isVideo ? <VideoIcon className="w-4 h-4 text-teal-600 shrink-0" /> : <FileText className="w-4 h-4 text-slate-500 shrink-0" />}
                              <span className="font-bold text-slate-800 truncate">{fileObj.name || 'Attachment'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {(fileObj.isImage || fileObj.isVideo) && (
                                <button type="button" onClick={() => setPreviewMedia(fileObj)} className="p-1 text-teal-600 hover:bg-teal-50 rounded-lg" title="Preview Media">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <a href={fileObj.url} target="_blank" rel="noreferrer" download className="p-1 text-slate-400 hover:text-teal-600"><Download className="w-3.5 h-3.5" /></a>
                              <button type="button" onClick={() => handleDeleteAttachment(idx)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          {fileObj.isImage && (
                            <img 
                              src={fileObj.url} 
                              alt={fileObj.name} 
                              onClick={() => setPreviewMedia(fileObj)}
                              className="w-full max-h-36 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition" 
                            />
                          )}

                          {fileObj.isVideo && (
                            <video 
                              src={fileObj.url} 
                              controls 
                              className="w-full max-h-36 object-cover rounded-xl border border-slate-200 bg-black"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Dedicated Fixed Task Comments Section */}
              <div className="p-6 overflow-y-auto flex flex-col">
                <TaskCommentSection 
                  taskId={selectedTask.id}
                  currentUserId={currentUser?.id || localStorage.getItem('userId')}
                  currentUsername={currentUser?.username || currentUsername}
                  boardMembers={members}
                  socket={stompClientRef.current}
                  isOwner={isOwner}
                  boardId={boardId}
                  taskTitle={selectedTask.title}
                />
              </div>

            </div>

            {/* BOTTOM FOOTER */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              {canEditBoard ? (
                <button type="button" onClick={(e) => handleDeleteTask(selectedTask.id, e)} className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              ) : <div />}

              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
                    <button type="button" onClick={handleSaveTaskUpdates} className="px-3.5 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-teal-700">Save Changes</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setSelectedTask(null)} className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">Close</button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MEDIA PREVIEW LIGHTBOX MODAL */}
      {previewMedia && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button 
              onClick={() => setPreviewMedia(null)} 
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {previewMedia.isImage && (
              <img src={previewMedia.url} alt={previewMedia.name} className="max-h-[80vh] w-auto rounded-3xl object-contain border border-slate-700 shadow-2xl" />
            )}

            {previewMedia.isVideo && (
              <video src={previewMedia.url} controls autoPlay className="max-h-[80vh] w-full rounded-3xl border border-slate-700 shadow-2xl bg-black" />
            )}

            <div className="mt-3 text-white text-xs font-bold bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
              {previewMedia.name}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-sm w-full p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl text-center">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mb-6">{confirmModal.message}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))} className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancel</button>
              <button type="button" onClick={confirmModal.onConfirm} className="flex-1 py-2 px-4 bg-rose-600 text-white font-bold text-xs rounded-xl">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL HIDDEN ATTACHMENT INPUT */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        multiple 
        accept={fileAcceptType} 
      />

      {/* TOAST POPUP */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl bg-slate-900 text-teal-400 text-xs font-bold">
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}