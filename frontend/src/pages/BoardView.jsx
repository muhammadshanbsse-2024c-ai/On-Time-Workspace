import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Tesseract from 'tesseract.js';
import { 
  Plus, ArrowLeft, Trash2, X, FileText, Tag, Calendar, Edit3, Save, 
  GripVertical, Users, ShieldAlert, LogOut, Wifi, Activity, Clock, 
  MessageSquare, Send, Search, LayoutGrid, List, Columns,
  Filter, ArrowUpDown, ChevronRight, Home, CheckSquare, Settings, 
  Layers, Briefcase, UserMinus, ChevronDown, UserPlus, CheckCircle, AlertTriangle, Bell,
  Paperclip, File as FileIcon, Download, Image as ImageIcon, Video as VideoIcon, ExternalLink,
  PieChart, BarChart3, TrendingUp, Check, Camera, Upload, Loader2, Menu,
  PanelLeftOpen, PanelLeftClose
} from 'lucide-react';
import api, { BACKEND_URL } from '../services/api';
import TaskCommentSection from './TaskCommentSection';

// =========================================================
// ✨ MODERN CUSTOM "Ai" ICON (MATCHED WITH UI TEAL & AMBER THEME)
// =========================================================
const AiLogoIcon = ({ className = "w-4 h-4", variant = "default" }) => {
  const uid = React.useId();
  const isLightOnDark = variant === "light";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`aiGradA-${uid}`} x1="15" y1="20" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          {isLightOnDark ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ccfbf1" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`aiGradI-${uid}`} x1="65" y1="22" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <circle
        cx="21"
        cy="79"
        r="7.5"
        fill={isLightOnDark ? "#99f6e4" : "#0d9488"}
      />

      <path
        d="M44 21C47.5 21 50.5 23.1 52 26.3L75.5 76.5C77.2 80.1 74.6 84.2 70.6 84.2C67.5 84.2 64.7 82.4 63.3 79.6L58.5 70H32.5L28.8 77.8C27.2 81.2 23.2 82.6 19.8 81C16.4 79.4 15 75.4 16.6 72L36 26.3C37.5 23.1 40.5 21 44 21ZM44.5 39.5L37.2 57.5H52.5L44.5 39.5Z"
        fill={`url(#aiGradA-${uid})`}
      />

      <circle cx="71" cy="29" r="7.5" fill={`url(#aiGradI-${uid})`} />
      <rect x="63.5" y="41" width="15" height="39" rx="7.5" fill={`url(#aiGradI-${uid})`} />

      <path
        d="M88 33L90.2 38.8L96 41L90.2 43.2L88 49L85.8 43.2L80 41L85.8 38.8L88 33Z"
        fill={`url(#aiGradI-${uid})`}
      />
    </svg>
  );
};

// =========================================================
// ✨ CLIENT-SIDE LIBRARIES LOADER FOR PDF & DOCX IMAGE OCR
// =========================================================
const loadExternalScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

const ensureJsZipLoaded = async () => {
  if (window.JSZip) return window.JSZip;
  await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  return window.JSZip;
};

const ensurePdfJsLoaded = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return window.pdfjsLib;
};

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Activity Log History Feed & Time Filter ('24H' | 'MONTH')
  const [activities, setActivities] = useState([]);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [activityTimeFilter, setActivityTimeFilter] = useState('24H');

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  // Media Preview Lightbox Modal State
  const [previewMedia, setPreviewMedia] = useState(null);

  // Attach Menu Dropdown, Upload Window & File Types State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('file');
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);
  const [fileAcceptType, setFileAcceptType] = useState('image/*,video/*,application/pdf,.doc,.docx');
  const attachMenuRef = useRef(null);

  // Dropdown & Board Scroll Refs
  const filterDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const boardScrollRef = useRef(null);

  // Form & Action Loader States
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddColumnCard, setShowAddColumnCard] = useState(false);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [addingTaskColId, setAddingTaskColId] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineTaskDescription, setInlineTaskDescription] = useState('');
  const [inlineTaskPriority, setInlineTaskPriority] = useState('MEDIUM');
  const [inlineTaskPoints, setInlineTaskPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // ✨ AI File Analysis States (Inline & Modal)
  const [isAiAnalyzingInline, setIsAiAnalyzingInline] = useState(false);
  const [isAiAnalyzingModal, setIsAiAnalyzingModal] = useState(false);
  const aiInlineFileInputRef = useRef(null);
  const aiModalFileInputRef = useRef(null);

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

  // Keep latest attachments ref so async AI updates never lose existing files
  const attachmentsRef = useRef([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const stompClientRef = useRef(null);

  // Members & Board Settings Modal States
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [boardNameInput, setBoardNameInput] = useState('');

  const isWithinLastMonth = (dateString) => {
    if (!dateString) return true;
    const itemTime = new Date(dateString).getTime();
    if (isNaN(itemTime)) return true;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - itemTime <= thirtyDaysMs;
  };

  const isWithinLast24Hours = (dateString) => {
    if (!dateString) return true;
    const itemTime = new Date(dateString).getTime();
    if (isNaN(itemTime)) return true;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return Date.now() - itemTime <= twentyFourHoursMs;
  };

  const getActiveUsername = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.username) return parsed.username.toLowerCase().trim();
      } catch (e) {}
    }
    if (currentUser?.username) return currentUser.username.toLowerCase().trim();
    const email = localStorage.getItem('userEmail');
    return email ? email.split('@')[0].toLowerCase().trim() : 'user';
  };

  const getAvatarUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    return `${BACKEND_URL}${path.startsWith('/') ? path : '/' + path}`;
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

    if (!Array.isArray(current)) current = [current];

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

  const sanitizeToastMessage = (rawMessage, type) => {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return type === 'error' ? 'Something went wrong. Please try again.' : 'Done!';
    }
    const lower = rawMessage.toLowerCase();
    const technicalPatterns = [
      '500', '404', '403', '401', '400', 'status code', 'request failed',
      'network error', 'axios', 'exception', 'sql', 'varchar', 'jdbc',
      'stacktrace', 'internal server', 'timeout', 'econnrefused', 'undefined', 'nullpointer'
    ];
    if (technicalPatterns.some((p) => lower.includes(p))) {
      return 'Something went wrong. Please try again.';
    }
    return rawMessage;
  };

  const showNotification = (message, type = 'success') => {
    const cleanMessage = sanitizeToastMessage(message, type);
    setToast({ show: true, message: cleanMessage, type });
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

  // =========================================================
  // ✨ AI FILE VALIDATION (DOCUMENTS & IMAGES ONLY - NO VIDEO)
  // =========================================================
  const validateAiUploadFile = (file) => {
    if (!file) {
      throw new Error('INVALID_FILE');
    }

    const fileName = file.name.toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|mov|webm|avi|mkv|flv|wmv)$/)) {
      throw new Error('VIDEO_NOT_SUPPORTED');
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const isSupported =
      allowedExtensions.some((ext) => fileName.endsWith(ext)) ||
      mimeType.startsWith('image/') ||
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.startsWith('text/');

    if (!isSupported) {
      throw new Error('INVALID_FILE');
    }

    return file;
  };

  // =========================================================
  // ✨ EXTRACT TEXT + EMBEDDED IMAGES FROM DOCX (JSZIP + TESSERACT)
  // =========================================================
  const extractFullContentFromDocx = async (file) => {
    const JSZip = await ensureJsZipLoaded();
    if (!JSZip) return null;

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    let typedText = '';
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const xmlStr = await docXmlFile.async('string');
      typedText = xmlStr
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
    }

    const mediaEntries = Object.keys(zip.files)
      .filter((name) => name.startsWith('word/media/') && !zip.files[name].dir)
      .sort()
      .slice(0, 8);

    const imageTexts = [];
    for (let i = 0; i < mediaEntries.length; i++) {
      try {
        const entryName = mediaEntries[i];
        const lower = entryName.toLowerCase();
        let mime = 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (lower.endsWith('.webp')) mime = 'image/webp';
        else if (lower.endsWith('.gif')) mime = 'image/gif';
        else if (lower.endsWith('.bmp')) mime = 'image/bmp';

        const uint8 = await zip.files[entryName].async('uint8array');
        const imgBlob = new Blob([uint8], { type: mime });
        const imgUrl = URL.createObjectURL(imgBlob);

        try {
          const { data } = await Tesseract.recognize(imgUrl, 'eng');
          const ocr = (data?.text || '').trim();
          if (ocr.length > 3) {
            imageTexts.push(`[Picture ${i + 1} Content]:\n${ocr}`);
          }
        } finally {
          URL.revokeObjectURL(imgUrl);
        }
      } catch (e) {}
    }

    return [typedText, ...imageTexts].filter(Boolean).join('\n\n').trim();
  };

  // =========================================================
  // ✨ EXTRACT TEXT + RENDERED PAGE IMAGES FROM PDF (PDFJS + TESSERACT)
  // =========================================================
  const extractFullContentFromPdf = async (file) => {
    const pdfjsLib = await ensurePdfJsLoaded();
    if (!pdfjsLib) return null;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = Math.min(pdf.numPages, 6);

    const pageSections = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      let pageTypedText = '';
      try {
        const textContent = await page.getTextContent();
        pageTypedText = textContent.items.map((it) => it.str).join(' ').trim();
      } catch (e) {}

      let pageOcrText = '';
      try {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        const { data } = await Tesseract.recognize(canvas, 'eng');
        pageOcrText = (data?.text || '').trim();
      } catch (e) {}

      if (pageOcrText.length >= pageTypedText.length && pageOcrText.length > 5) {
        pageSections.push(`[Page ${pageNum}]:\n${pageOcrText}`);
      } else if (pageTypedText || pageOcrText) {
        pageSections.push(`[Page ${pageNum}]:\n${[pageTypedText, pageOcrText].filter(Boolean).join('\n')}`);
      }
    }

    return pageSections.join('\n\n').trim();
  };

  // =========================================================
  // ✨ MAGIC-BYTES + EXTENSION DETECTOR FOR DOCX, PDF & IMAGES
  // =========================================================
  const prepareAiTextFile = async (file) => {
    const fileName = (file.name || '').toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    const headerBuffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);
    const isZipMagic = bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
    const isPdfMagic = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF

    const isImage =
      mimeType.startsWith('image/') ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(fileName);

    const isDocx =
      fileName.endsWith('.docx') ||
      mimeType.includes('wordprocessingml') ||
      (isZipMagic && !fileName.endsWith('.xlsx') && !fileName.endsWith('.zip'));

    const isPdf =
      fileName.endsWith('.pdf') ||
      mimeType === 'application/pdf' ||
      isPdfMagic;

    if (isImage) {
      const imgUrl = URL.createObjectURL(file);
      try {
        const { data } = await Tesseract.recognize(imgUrl, 'eng');
        const extractedText = (data?.text || '').trim();
        if (!extractedText || extractedText.length < 5) {
          throw new Error('UNREADABLE_IMAGE');
        }
        return new window.File(
          [extractedText],
          `${file.name.replace(/\.[^/.]+$/, '')}_extracted.txt`,
          { type: 'text/plain' }
        );
      } finally {
        URL.revokeObjectURL(imgUrl);
      }
    }

    if (isDocx) {
      const extractedDocxText = await extractFullContentFromDocx(file);
      if (extractedDocxText && extractedDocxText.length >= 5) {
        return new window.File(
          [extractedDocxText],
          `${file.name.replace(/\.[^/.]+$/, '')}_extracted.txt`,
          { type: 'text/plain' }
        );
      }
    }

    if (isPdf) {
      const extractedPdfText = await extractFullContentFromPdf(file);
      if (extractedPdfText && extractedPdfText.length >= 5) {
        return new window.File(
          [extractedPdfText],
          `${file.name.replace(/\.[^/.]+$/, '')}_extracted.txt`,
          { type: 'text/plain' }
        );
      }
    }

    return file;
  };

  // Safe DB length helpers
  const safeDbTitle = (text, fallback = '') => {
    const val = (text || fallback || '').trim();
    return val.length > 100 ? `${val.slice(0, 97)}...` : val;
  };

  const safeDbDescription = (text, fallback = '') => {
    const val = (text || fallback || '').trim();
    return val.length > 240 ? `${val.slice(0, 237)}...` : val;
  };

  const normalizeAiChecklistPoints = (points) => {
    if (!Array.isArray(points)) return [];
    return points
      .map((p) => (typeof p === 'string' ? p.trim() : (p?.text || '').trim()))
      .filter(Boolean)
      .slice(0, 12)
      .map((text) => ({ text, completed: false }));
  };

  const getFriendlyAiErrorMessage = (err) => {
    if (err?.message === 'VIDEO_NOT_SUPPORTED') {
      return 'Videos are not supported for AI auto-fill. Please select a document or image.';
    }
    if (err?.message === 'UNREADABLE_IMAGE') {
      return 'Could not read text from this image. Please try a clearer image or document.';
    }
    if (err?.message === 'INVALID_FILE') {
      return 'Please select a valid document (PDF, DOCX, TXT) or image.';
    }
    return 'Could not analyze this file. Please try again.';
  };

  // =========================================================
  // ✨ AI FILE ANALYZER FOR INLINE TASK CREATION
  // =========================================================
  const handleAiAnalyzeForInlineTask = async (e) => {
    const rawFile = e.target?.files?.[0];
    if (!rawFile) return;

    setIsAiAnalyzingInline(true);
    try {
      const validFile = validateAiUploadFile(rawFile);
      const fileToUpload = await prepareAiTextFile(validFile);

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('minSteps', '3');
      formData.append('maxSteps', '12');

      const res = await api.post('/ai/analyze-task', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data || {};
      if (data.title) setInlineTaskTitle(safeDbTitle(data.title));
      if (data.description) setInlineTaskDescription(safeDbDescription(data.description));
      if (data.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(data.priority.toUpperCase())) {
        setInlineTaskPriority(data.priority.toUpperCase());
      }
      const extractedPoints = normalizeAiChecklistPoints(data.points);
      if (extractedPoints.length > 0) {
        setInlineTaskPoints(extractedPoints);
      }

      showNotification(`Task details & ${extractedPoints.length} steps generated!`, 'success');
    } catch (err) {
      showNotification(getFriendlyAiErrorMessage(err), 'error');
    } finally {
      setIsAiAnalyzingInline(false);
      if (aiInlineFileInputRef.current) aiInlineFileInputRef.current.value = null;
    }
  };

  // =========================================================
  // ✨ AI FILE ANALYZER INSIDE EXISTING TASK MODAL (HEADER BUTTON)
  // =========================================================
  const handleAiAnalyzeForModalTask = async (e) => {
    const rawFile = e.target?.files?.[0];
    if (!rawFile || !selectedTask) return;

    setIsAiAnalyzingModal(true);
    try {
      const validFile = validateAiUploadFile(rawFile);
      const fileToUpload = await prepareAiTextFile(validFile);

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('minSteps', '3');
      formData.append('maxSteps', '12');

      const res = await api.post('/ai/analyze-task', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data || {};
      const aiTitle = safeDbTitle(data.title, selectedTask.title);
      const aiDesc = safeDbDescription(data.description, selectedTask.description);
      const aiPriority =
        data.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(data.priority.toUpperCase())
          ? data.priority.toUpperCase()
          : (selectedTask.priority || 'MEDIUM');

      const aiChecklistItems = normalizeAiChecklistPoints(data.points);
      const mergedChecklist = [...checklist, ...aiChecklistItems];

      const preservedAttachments =
        attachmentsRef.current && attachmentsRef.current.length > 0
          ? [...attachmentsRef.current]
          : safeParseAttachments(selectedTask.attachments);

      setEditTitle(aiTitle);
      setEditDescription(aiDesc);
      setEditPriority(aiPriority);
      setChecklist(mergedChecklist);
      setAttachments(preservedAttachments);

      const payload = {
        ...selectedTask,
        id: Number(selectedTask.id),
        title: aiTitle,
        description: aiDesc,
        priority: aiPriority,
        checklist: mergedChecklist,
        attachments: JSON.stringify(preservedAttachments)
      };

      await api.put(`/tasks/${selectedTask.id}`, payload);

      const updatedTaskObj = {
        ...selectedTask,
        title: aiTitle,
        description: aiDesc,
        priority: aiPriority,
        checklist: mergedChecklist,
        attachments: preservedAttachments
      };

      setSelectedTask(updatedTaskObj);
      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) =>
            String(t.id) === String(selectedTask.id) ? updatedTaskObj : t
          )
        }))
      );

      await logUserActivity('AI_TASK_ENRICHED', `Used AI to generate description & ${aiChecklistItems.length} steps for "${aiTitle}"`);
      showNotification(`Task details & ${aiChecklistItems.length} checklist steps added!`, 'success');
      fetchActivities();
    } catch (err) {
      showNotification(getFriendlyAiErrorMessage(err), 'error');
    } finally {
      setIsAiAnalyzingModal(false);
      if (aiModalFileInputRef.current) aiModalFileInputRef.current.value = null;
    }
  };

  // =========================================================
  // ✨ AI ANALYZE ON EXISTING ATTACHMENT CARD CLICK (NON-VIDEO)
  // =========================================================
  const handleAnalyzeExistingAttachment = async (fileObj) => {
    if (!fileObj?.url || fileObj.url === '#' || !selectedTask) return;

    if (fileObj.isVideo) {
      showNotification('Videos are not supported for AI auto-fill.', 'error');
      return;
    }

    setIsAiAnalyzingModal(true);
    try {
      const response = await fetch(fileObj.url);
      if (!response.ok) {
        throw new Error('FILE_LOAD_FAILED');
      }
      const blob = await response.blob();
      const rawFile = new window.File([blob], fileObj.name || 'attachment', {
        type: blob.type || 'application/octet-stream'
      });

      const fileToUpload = await prepareAiTextFile(rawFile);

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('minSteps', '3');
      formData.append('maxSteps', '12');

      const res = await api.post('/ai/analyze-task', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data || {};
      const aiTitle = safeDbTitle(data.title, selectedTask.title);
      const aiDesc = safeDbDescription(data.description, selectedTask.description);
      const aiPriority =
        data.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(data.priority.toUpperCase())
          ? data.priority.toUpperCase()
          : (selectedTask.priority || 'MEDIUM');

      const aiChecklistItems = normalizeAiChecklistPoints(data.points);
      const mergedChecklist = [...checklist, ...aiChecklistItems];

      const preservedAttachments =
        attachmentsRef.current && attachmentsRef.current.length > 0
          ? [...attachmentsRef.current]
          : safeParseAttachments(selectedTask.attachments);

      setEditTitle(aiTitle);
      setEditDescription(aiDesc);
      setEditPriority(aiPriority);
      setChecklist(mergedChecklist);
      setAttachments(preservedAttachments);

      const payload = {
        ...selectedTask,
        id: Number(selectedTask.id),
        title: aiTitle,
        description: aiDesc,
        priority: aiPriority,
        checklist: mergedChecklist,
        attachments: JSON.stringify(preservedAttachments)
      };

      await api.put(`/tasks/${selectedTask.id}`, payload);

      const updatedTaskObj = {
        ...selectedTask,
        title: aiTitle,
        description: aiDesc,
        priority: aiPriority,
        checklist: mergedChecklist,
        attachments: preservedAttachments
      };

      setSelectedTask(updatedTaskObj);
      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) =>
            String(t.id) === String(selectedTask.id) ? updatedTaskObj : t
          )
        }))
      );

      await logUserActivity('AI_ATTACHMENT_ANALYZED', `Generated title, description & ${aiChecklistItems.length} steps from "${fileObj.name}"`);
      showNotification(`Task title, description & ${aiChecklistItems.length} steps generated!`, 'success');
      fetchActivities();
    } catch (err) {
      showNotification(getFriendlyAiErrorMessage(err), 'error');
    } finally {
      setIsAiAnalyzingModal(false);
    }
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

  const sendInAppNotification = async (recipientUsername, message, type, taskId = null) => {
    if (!recipientUsername) return;
    const activeUser = getActiveUsername();
    const cleanRecipient = recipientUsername.toLowerCase().trim();

    if (cleanRecipient === activeUser) return;

    try {
      await api.post('/notifications', {
        recipientUsername: cleanRecipient,
        senderUsername: activeUser,
        message: message,
        type: type,
        boardId: Number(boardId),
        taskId: taskId ? Number(taskId) : null
      });
    } catch (err) {}
  };

  const handleNotificationClick = (notif) => {
    setIsNotifDropdownOpen(false);

    if (notif.taskId) {
      for (const col of lists) {
        const targetTask = (col.tasks || []).find((t) => String(t.id) === String(notif.taskId));
        if (targetTask) {
          handleOpenTaskModal(targetTask);
          return;
        }
      }
    }

    if (notif.message) {
      for (const col of lists) {
        const matchedTask = (col.tasks || []).find(
          (t) => t.title && notif.message.toLowerCase().includes(t.title.toLowerCase())
        );
        if (matchedTask) {
          handleOpenTaskModal(matchedTask);
          return;
        }
      }
    }
  };

  const handleToggleNotificationDropdown = async () => {
    const nextState = !isNotifDropdownOpen;
    setIsNotifDropdownOpen(nextState);

    if (nextState) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      try {
        const activeUser = getActiveUsername();
        if (activeUser) {
          await api.put(`/notifications/user/${activeUser}/read-all`);
        }
      } catch (err) {}
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/boards/${boardId}/activities`);
      const rawActs = Array.isArray(res.data) ? res.data : [];
      setActivities(rawActs.filter((act) => isWithinLastMonth(act.createdAt)));
    } catch (err) {
      setActivities([]);
    }
  };

  const fetchUserNotifications = async () => {
    try {
      const activeUser = getActiveUsername();
      if (activeUser) {
        const res = await api.get(`/notifications/user/${activeUser}`);
        const rawList = Array.isArray(res.data) ? res.data : [];

        const cleanList = [];
        for (const item of rawList) {
          if (!isWithinLastMonth(item.createdAt)) continue;
          if (item.senderUsername && item.senderUsername.toLowerCase().trim() === activeUser) continue;

          const exists = cleanList.some(
            (existing) =>
              (item.id && existing.id === item.id) ||
              (existing.message === item.message && existing.senderUsername === item.senderUsername)
          );
          if (!exists) cleanList.push(item);
        }
        setNotifications(cleanList);
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

    if (stompClientRef.current) {
      try {
        stompClientRef.current.deactivate();
      } catch (e) {}
    }

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`),
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

        const activeUser = getActiveUsername();
        if (activeUser) {
          const userTopic = `/topic/notifications/${activeUser}`;
          stompClient.subscribe(userTopic, (message) => {
            try {
              const newNotif = JSON.parse(message.body);

              if (!isWithinLastMonth(newNotif.createdAt)) return;
              if (newNotif.senderUsername && newNotif.senderUsername.toLowerCase().trim() === activeUser) {
                return;
              }

              setNotifications((prev) => {
                const currentList = (Array.isArray(prev) ? prev : []).filter((n) => isWithinLastMonth(n.createdAt));
                const isDuplicate = currentList.some(
                  (item) =>
                    (newNotif.id && item.id === newNotif.id) ||
                    (item.message === newNotif.message &&
                      Math.abs(new Date(item.createdAt || Date.now()) - new Date(newNotif.createdAt || Date.now())) < 5000)
                );

                if (isDuplicate) return currentList;

                showNotification(`🔔 ${newNotif.message}`, 'info');
                return [newNotif, ...currentList];
              });
            } catch (e) {}
          });
        }

        const currentUName = getActiveUsername();
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
        try {
          stompClientRef.current.deactivate();
        } catch (e) {}
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

  // ✅ SILENT REFRESH SUPPORT (PREVENT RELOAD BLINK & PRESERVE HORIZONTAL SCROLL)
  const fetchBoardData = async (silent = false) => {
    const savedScrollLeft = boardScrollRef.current ? boardScrollRef.current.scrollLeft : 0;

    try {
      if (!silent) setLoading(true);

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
            const preservedAtts =
              match.attachments && match.attachments.length > 0
                ? match.attachments
                : attachmentsRef.current;
            setAttachments([...preservedAtts]);
            return { ...match, attachments: preservedAtts };
          }
        }
        return prevSelected;
      });

      if (silent && boardScrollRef.current) {
        requestAnimationFrame(() => {
          if (boardScrollRef.current) {
            boardScrollRef.current.scrollLeft = savedScrollLeft;
          }
        });
      }

    } catch (err) {
      if (err.response?.status === 500 || err.response?.status === 404) {
        showNotification('Board not found. Returning to dashboard...', 'info');
        setTimeout(() => navigate('/dashboard'), 1200);
      }
    } finally {
      if (!silent) setLoading(false);
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
      showNotification('Please select a photo first.', 'error');
      return;
    }

    const userId = currentUser?.id || localStorage.getItem('userId');
    if (!userId) {
      showNotification('Please log in again to update your photo.', 'error');
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

      showNotification('Profile picture updated!', 'success');
      setIsProfileModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
      fetchBoardData(true);
    } catch (err) {
      showNotification('Could not update profile picture. Please try again.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRealtimeEvent = (event) => {
    if (!event) return;

    if (event.type === 'ACTIVITY_LOGGED' && event.log) {
      setActivities((prev) => [event.log, ...(Array.isArray(prev) ? prev : []).filter((a) => isWithinLastMonth(a.createdAt))]);
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
        const parsedIncomingAtts = safeParseAttachments(updatedTask.attachments);

        setLists((prevLists) =>
          (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
            ...col,
            tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
              if (String(t.id) === String(updatedTask.id)) {
                const finalAtts =
                  type === 'ATTACHMENT_UPDATED' || parsedIncomingAtts.length > 0
                    ? parsedIncomingAtts
                    : (t.attachments || []);
                return { 
                  ...t, 
                  ...updatedTask, 
                  assignee: cleanAssignee, 
                  assignedTo: cleanAssignee,
                  assignedUser: cleanAssignee ? { username: cleanAssignee } : null,
                  checklist: Array.isArray(updatedTask.checklist) ? updatedTask.checklist : (t.checklist || []),
                  attachments: finalAtts
                };
              }
              return t;
            })
          }))
        );

        setSelectedTask((prevSelected) => {
          if (prevSelected && String(prevSelected.id) === String(updatedTask.id)) {
            const freshChecklist = Array.isArray(updatedTask.checklist) ? updatedTask.checklist : (prevSelected.checklist || []);
            const finalAtts =
              type === 'ATTACHMENT_UPDATED' || parsedIncomingAtts.length > 0
                ? parsedIncomingAtts
                : (attachmentsRef.current.length > 0 ? attachmentsRef.current : (prevSelected.attachments || []));
            setChecklist([...freshChecklist]);
            setAttachments([...finalAtts]);
            return { 
              ...prevSelected, 
              ...updatedTask, 
              assignee: cleanAssignee, 
              assignedTo: cleanAssignee,
              assignedUser: cleanAssignee ? { username: cleanAssignee } : null,
              checklist: freshChecklist,
              attachments: finalAtts
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
        fetchBoardData(true);
        break;

      case 'TASK_DELETED':
        setLists((prev) => (Array.isArray(prev) ? prev : []).map((l) => ({ ...l, tasks: (l.tasks || []).filter((t) => String(t.id) !== String(taskId)) })));
        if (selectedTask && String(selectedTask.id) === String(taskId)) {
          setSelectedTask(null);
        }
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
      showNotification('Member role updated!', 'success');
      fetchBoardData(true);
    } catch (err) {}
  };

  const handleRenameBoard = async () => {
    if (!boardNameInput.trim()) return;
    try {
      await api.put(`/boards/${boardId}`, { name: boardNameInput.trim() });
      logUserActivity('BOARD_RENAMED', `Renamed board to "${boardNameInput.trim()}"`);
      setBoardDetails((prev) => ({ ...prev, name: boardNameInput.trim() }));
      setIsEditingBoardName(false);
      showNotification('Board name updated!', 'success');
    } catch (err) {
      showNotification('Could not rename board. Please try again.', 'error');
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
          showNotification('Board deleted.', 'info');
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
      showNotification('Board owners cannot leave the board.', 'error');
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
          showNotification('You left the board.', 'info');
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
      showNotification(`@${inputVal} added to the board!`, 'success');
      setInviteEmail('');
      fetchBoardData(true);
    } catch (err) {
      showNotification('Could not add member. Please check the username.', 'error');
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
          showNotification('Member removed.', 'info');
        } catch (err) {
          setMembers((prev) => (Array.isArray(prev) ? prev : []).filter(m => String(m.id || m._id) !== String(memberId)));
        }
      }
    });
  };

  const handleAddList = async (e) => {
    if (e) e.preventDefault();
    if (!newListTitle.trim() || isCreatingColumn) return;
    setIsCreatingColumn(true);
    try {
      await api.post(`/lists/board/${boardId}`, { name: newListTitle.trim() });
      await logUserActivity('LIST_CREATED', `Created new column "${newListTitle.trim()}"`);
      setNewListTitle('');
      setShowAddColumnCard(false);
      showNotification('Column added!', 'success');
      await fetchBoardData(true);
      fetchActivities();
    } catch (err) {
      showNotification('Could not add column. Please try again.', 'error');
    } finally {
      setIsCreatingColumn(false);
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
          showNotification('Column deleted.', 'info');
          await fetchBoardData(true);
          fetchActivities();
        } catch (err) {
          showNotification('Could not delete column. Please try again.', 'error');
        }
      }
    });
  };

  const handleAddInlineTask = async (targetListId) => {
    if (!inlineTaskTitle.trim() || !targetListId || isAddingTask) return;

    setIsAddingTask(true);
    const titleToSave = safeDbTitle(inlineTaskTitle);
    const descToSave = safeDbDescription(inlineTaskDescription, 'Task description');

    try {
      const payload = {
        title: titleToSave,
        description: descToSave,
        priority: inlineTaskPriority,
        status: 'TODO',
        listId: Number(targetListId),
        boardList: { id: Number(targetListId) },
        assignee: null,
        assignedTo: null,
        checklist: inlineTaskPoints
      };

      await api.post(`/tasks/board/${boardId}`, payload);
      
      setInlineTaskTitle('');
      setInlineTaskDescription('');
      setInlineTaskPoints([]);
      setInlineTaskPriority('MEDIUM');
      setAddingTaskColId(null);
      showNotification('Task added!', 'success');
      await fetchBoardData(true);
      fetchActivities();
    } catch (err) {
      try {
        const fallbackPayload = {
          title: titleToSave,
          description: descToSave,
          priority: inlineTaskPriority,
          status: 'TODO',
          assignee: null,
          assignedTo: null,
          checklist: inlineTaskPoints
        };

        await api.post(`/tasks/list/${targetListId}`, fallbackPayload);

        setInlineTaskTitle('');
        setInlineTaskDescription('');
        setInlineTaskPoints([]);
        setInlineTaskPriority('MEDIUM');
        setAddingTaskColId(null);
        showNotification('Task added!', 'success');
        await fetchBoardData(true);
        fetchActivities();
      } catch (fallbackErr) {
        showNotification('Task addition failed. Please try again.', 'error');
      }
    } finally {
      setIsAddingTask(false);
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
        const previousLists = [...lists];
        setLists((prevLists) =>
          (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
            ...col,
            tasks: (Array.isArray(col.tasks) ? col.tasks : []).filter(
              (t) => String(t.id) !== String(taskId)
            )
          }))
        );
        if (selectedTask && String(selectedTask.id) === String(taskId)) {
          setSelectedTask(null);
        }

        try {
          await api.delete(`/tasks/${taskId}`);
          await logUserActivity('TASK_DELETED', `Deleted a task`);

          if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
              destination: `/topic/board/${boardId}`,
              body: JSON.stringify({
                type: 'TASK_DELETED',
                taskId: taskId
              })
            });
          }

          showNotification('Task deleted.', 'info');
          fetchActivities();
        } catch (err) {
          setLists(previousLists);
          showNotification('Could not delete task. Please try again.', 'error');
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
    const currentAtts = attachmentsRef.current || attachments;
    try {
      const payload = { 
        ...selectedTask,
        title: safeDbTitle(selectedTask.title),
        description: safeDbDescription(selectedTask.description),
        attachments: JSON.stringify(currentAtts),
        checklist: updatedList 
      };
      await api.put(`/tasks/${selectedTask.id}`, payload);
      const updatedTaskObj = { ...selectedTask, checklist: updatedList, attachments: currentAtts };
      setSelectedTask(updatedTaskObj);
      
      setLists((prevLists) =>
        (Array.isArray(prevLists) ? prevLists : []).map((col) => ({
          ...col,
          tasks: (Array.isArray(col.tasks) ? col.tasks : []).map((t) => {
            if (String(t.id) === String(selectedTask.id)) {
              return { ...t, checklist: updatedList, attachments: currentAtts };
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
        title: safeDbTitle(selectedTask?.title),
        description: safeDbDescription(selectedTask?.description),
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

      showNotification('File attached!', 'success');
      fetchActivities();
    } catch (err) {
      showNotification('Could not save attachment. Please try again.', 'error');
    }
  };

  const handleSelectAttachmentType = (type) => {
    setShowAttachMenu(false);
    setUploadCategory(type);

    if (type === 'image') {
      setFileAcceptType('image/*');
    } else if (type === 'video') {
      setFileAcceptType('video/*');
    } else {
      setFileAcceptType('.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip');
    }

    setIsUploadModalOpen(true);
  };

  const handleBrowseButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target?.files || []);
    if (!files.length || !selectedTask || !selectedTask.id) return;

    const currentTaskId = selectedTask.id;
    let updatedList = [...(attachmentsRef.current || attachments)];
    let hasUploadError = false;

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
        hasUploadError = true;
      }
    }

    if (hasUploadError && updatedList.length === attachments.length) {
      showNotification('File upload failed. Please try again.', 'error');
      setIsUploadModalOpen(false);
      if (e.target) e.target.value = null;
      return;
    }

    setAttachments([...updatedList]);
    await saveAttachmentsToBackend(currentTaskId, updatedList);
    setIsUploadModalOpen(false);
    
    if (e.target) e.target.value = null;
  };

  const handleDeleteAttachment = (index) => {
    openConfirmDialog({
      title: 'Remove Attachment',
      message: 'Are you sure you want to remove this attachment?',
      confirmText: 'Remove File',
      type: 'danger',
      onConfirm: () => {
        const updated = (attachmentsRef.current || attachments).filter((_, idx) => idx !== index);
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
      parsedObj.url = `${BACKEND_URL}${parsedObj.url.startsWith('/') ? '' : '/'}${parsedObj.url}`;
    }

    const lowerName = (parsedObj.name || '').toLowerCase();
    const lowerUrl = (parsedObj.url || '').toLowerCase();
    const isImage = (parsedObj.type && parsedObj.type.includes('image')) || lowerName.match(/\.(png|jpe?g|gif|webp|svg)$/i) || lowerUrl.match(/\.(png|jpe?g|gif|webp|svg)$/i);
    const isVideo = (parsedObj.type && parsedObj.type.includes('video')) || lowerName.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) || lowerUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);

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
        fetchBoardData(true);
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
          title: safeDbTitle(movedTaskObj.title),
          description: safeDbDescription(movedTaskObj.description),
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
        showNotification('Could not move task. Please try again.', 'error');
        fetchBoardData(true);
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

    if (!selectedTask || !selectedTask.id || isSavingTask) return;

    setIsSavingTask(true);
    const previousAssignee = (extractAssigneeName(selectedTask) || '').toLowerCase().trim();
    const nomineeToSave = editAssignee && editAssignee.trim() ? editAssignee.trim() : null;
    const titleToSave = safeDbTitle(editTitle, selectedTask.title);
    const descToSave = safeDbDescription(editDescription);
    const targetBoardListId = selectedTask.boardList?.id || selectedTask.listId || (lists[0] ? lists[0].id : null);
    const currentAtts = attachmentsRef.current || attachments;

    const payload = {
      id: Number(selectedTask.id),
      title: titleToSave,
      description: descToSave,
      priority: editPriority || 'MEDIUM',
      dueDate: editDueDate || null,
      assignee: nomineeToSave,
      assignedTo: nomineeToSave,
      assignedUser: nomineeToSave ? { username: nomineeToSave } : null,
      boardList: targetBoardListId ? { id: Number(targetBoardListId) } : null,
      board: { id: Number(boardId) },
      checklist: checklist,
      attachments: JSON.stringify(currentAtts)
    };

    try {
      const response = await api.put(`/tasks/${selectedTask.id}`, payload);
      const resData = response.data || {};

      const finalNominee = nomineeToSave || extractAssigneeName(resData) || '';

      const updatedTaskObj = {
        ...selectedTask,
        ...resData,
        title: titleToSave,
        description: descToSave,
        priority: editPriority,
        dueDate: editDueDate,
        assignee: finalNominee,
        assignedTo: finalNominee,
        assignedUser: finalNominee ? { username: finalNominee } : null,
        checklist: checklist,
        attachments: currentAtts
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

      const cleanNewNominee = nomineeToSave ? nomineeToSave.toLowerCase().trim() : '';
      if (cleanNewNominee && cleanNewNominee !== previousAssignee && cleanNewNominee !== getActiveUsername()) {
        sendInAppNotification(
          nomineeToSave, 
          `@${getActiveUsername()} assigned you task "${titleToSave}"`, 
          'TASK_ASSIGNED',
          selectedTask.id
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
      showNotification('Task updated!', 'success');
      fetchActivities();
    } catch (err) {
      showNotification('Could not save task changes. Please try again.', 'error');
    } finally {
      setIsSavingTask(false);
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
  const recentNotifications = notifications.filter((n) => isWithinLastMonth(n.createdAt));
  const unreadNotifCount = recentNotifications.filter(n => !n.isRead).length;

  const filteredActivities = activities.filter((act) => {
    if (!isWithinLastMonth(act.createdAt)) return false;
    if (activityTimeFilter === '24H') {
      return isWithinLast24Hours(act.createdAt);
    }
    return true;
  });

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

  const onlineMembersList = members.filter(m => {
    const mName = (m.username || m.name || m.email?.split('@')[0] || '').toLowerCase().trim();
    return activePresenceUsers.some(
      (u) => (u.username && u.username.toLowerCase().trim() === mName) ||
             (u.userId && String(u.userId) === String(m.id || m._id))
    );
  });
  const visibleOnlineMembers = onlineMembersList.slice(0, 3);
  const extraMembersCount = members.length - visibleOnlineMembers.length;

  const handleMobileNavAction = (action) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <div className="h-dvh w-screen bg-[#ece9e2] font-sans text-slate-800 flex overflow-hidden p-1.5 sm:p-2 md:p-4 gap-2 md:gap-3 antialiased">
      
      {/* MOBILE SIDEBAR BACKDROP */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* 1. RESPONSIVE SIDEBAR */}
      <aside
        className={`fixed md:static inset-y-2 left-2 z-50 md:z-30 ${
          isMobileMenuOpen ? 'translate-x-0 w-60' : '-translate-x-[120%] md:translate-x-0'
        } ${
          isSidebarOpen ? 'md:w-56' : 'md:w-16'
        } transition-all duration-300 bg-[#18191c] rounded-3xl flex flex-col justify-between py-5 md:py-6 px-3 text-slate-400 shrink-0 shadow-2xl`}
      >
        <div className="flex flex-col space-y-6">
          
          {/* CLEAN SIDEBAR TOGGLE ICON */}
          <div className="flex items-center justify-between">
            <div 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`flex items-center space-x-3 cursor-pointer group select-none ${
                !isSidebarOpen && !isMobileMenuOpen ? 'justify-center w-full' : 'px-1'
              }`}
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <button
                type="button"
                className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-teal-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 shrink-0 shadow-sm cursor-pointer"
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>

              {(isSidebarOpen || isMobileMenuOpen) && (
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

            {isMobileMenuOpen && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="flex flex-col space-y-2 pt-2">
            <button 
              onClick={() => handleMobileNavAction(() => navigate('/dashboard'))} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Dashboard Home"
            >
              <Home className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">Dashboard</span>}
            </button>

            <button 
              onClick={() => handleMobileNavAction(() => setActiveView('column'))} 
              className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer w-full text-left ${activeView === 'column' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Board Kanban View"
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">Board View</span>}
            </button>

            <button 
              onClick={() => handleMobileNavAction(() => setIsTasksModalOpen(true))} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer relative w-full text-left"
              title="My Assigned Tasks"
            >
              <CheckSquare className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">My Tasks</span>}
              {myAssignedTasks.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse ml-auto shrink-0" />
              )}
            </button>

            <button 
              onClick={() => handleMobileNavAction(() => setIsActivityDrawerOpen(true))} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Activity Logs"
            >
              <Activity className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">Activity Logs</span>}
            </button>

            <button 
              onClick={() => handleMobileNavAction(() => setIsMembersModalOpen(true))} 
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Members & Settings"
            >
              <Users className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">Members</span>}
            </button>
          </nav>
        </div>

        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800/80">
          <button 
            onClick={() => handleMobileNavAction(() => setShowAnalytics(!showAnalytics))}
            className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer w-full text-left ${showAnalytics ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            title="Toggle Analytics Overlay"
          >
            <PieChart className="w-5 h-5 shrink-0" />
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-bold truncate">Analytics</span>}
          </button>

          <div 
            onClick={() => handleMobileNavAction(() => setIsProfileModalOpen(true))}
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
            {(isSidebarOpen || isMobileMenuOpen) && (
              <span className="text-xs font-bold text-slate-200 truncate group-hover:text-teal-400 transition">
                @{currentUser?.username || currentUsername}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN BOARD WORKSPACE CONTAINER */}
      <div className="flex-1 bg-[#f7f5f0] rounded-2xl md:rounded-3xl border border-slate-300/60 shadow-xl flex flex-col min-w-0 overflow-hidden relative">
        
        {/* RESPONSIVE HEADER TOOLBAR */}
        <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0 bg-[#f7f5f0]/80 backdrop-blur-md relative z-30">
          
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-teal-500 shrink-0 shadow-2xs"
              aria-label="Open Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {isEditingBoardName ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <input
                  type="text"
                  value={boardNameInput}
                  onChange={(e) => setBoardNameInput(e.target.value)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-extrabold border border-teal-500 rounded-xl focus:outline-none bg-white text-slate-900 w-36 sm:w-auto"
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
              <div className="relative flex items-center min-w-0">
                <select
                  value={boardId}
                  onChange={(e) => navigate(`/board/${e.target.value}`)}
                  className="appearance-none bg-white text-slate-900 font-extrabold text-xs sm:text-base rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 pr-8 sm:pr-9 border border-slate-200 shadow-2xs hover:border-teal-500 focus:outline-none cursor-pointer max-w-[145px] sm:max-w-[240px] truncate"
                >
                  <option value={boardId}>{boardDetails.name}</option>
                  {allUserBoards.filter(b => String(b.id) !== String(boardId)).map((b) => (
                    <option key={b.id} value={b.id}>{b.name || b.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 absolute right-2.5 sm:right-3 pointer-events-none" />
              </div>
            )}

            {isOwner && !isEditingBoardName && (
              <button onClick={() => setIsEditingBoardName(true)} className="text-slate-400 hover:text-teal-600 p-1 cursor-pointer shrink-0" title="Rename Board">
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          <div className="order-3 md:order-2 w-full md:w-auto md:flex-1 md:max-w-sm md:mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 sm:top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 sm:py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 placeholder-slate-400 font-medium transition shadow-2xs"
              />
            </div>
          </div>

          <div className="order-2 md:order-3 flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            
            <div 
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
              title={isConnected ? "Real-time WebSocket active" : "Reconnecting..."}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline text-[11px] font-bold text-slate-700">{isConnected ? 'Live' : 'Connecting'}</span>
            </div>

            {/* ONLINE MEMBERS HEADER STACK */}
            <div className="hidden sm:flex items-center -space-x-1.5 relative">
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

            {/* FILTER ICON */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                onMouseEnter={(e) => handleMouseEnterTooltip(e, `Active Priority: ${selectedPriorityFilter}`)}
                onMouseLeave={handleMouseLeaveTooltip}
                className={`p-2 sm:p-2.5 rounded-2xl border transition cursor-pointer shadow-2xs ${
                  selectedPriorityFilter !== 'ALL' || selectedAssigneeFilter !== 'ALL' || selectedDateFilter !== 'ALL'
                    ? 'bg-teal-50 text-teal-700 border-teal-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4 text-teal-600" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-3">
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

            {/* NOTIFICATION BELL */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={handleToggleNotificationDropdown}
                onMouseEnter={(e) => handleMouseEnterTooltip(e, `${unreadNotifCount} Unread Notifications`)}
                onMouseLeave={handleMouseLeaveTooltip}
                className="p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 transition cursor-pointer relative shadow-2xs hover:border-teal-400"
              >
                <Bell className="w-4 h-4 text-teal-600" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <span className="font-extrabold text-xs text-slate-900">Notifications</span>
                      <p className="text-[9px] text-slate-400 font-medium">Showing last 30 days</p>
                    </div>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                      {unreadNotifCount} Unread
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {recentNotifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-6">No notifications in the last 30 days.</p>
                    ) : (
                      recentNotifications.map((n, idx) => (
                        <div
                          key={n.id || idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(n)}
                          onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                          className={`group relative p-3 rounded-2xl text-xs border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md hover:border-teal-500 ${
                            n.isRead
                              ? 'bg-slate-50/90 hover:bg-white border-slate-200/80 text-slate-600'
                              : 'bg-teal-50/60 hover:bg-white border-teal-200 font-semibold text-slate-900 shadow-2xs'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-teal-700 font-extrabold bg-teal-100/70 px-2 py-0.5 rounded-full">
                              @{n.senderUsername || 'System'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Just now'}
                            </span>
                          </div>

                          <p className="leading-snug text-[11px] text-slate-800 group-hover:text-slate-950 pr-1">
                            {n.message}
                          </p>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-teal-600 group-hover:text-teal-700 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>Open Task & Comments</span>
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white group-hover:bg-teal-600 text-slate-600 group-hover:text-white border border-slate-200 group-hover:border-teal-600 font-bold text-[9px] transition-colors">
                              <span>View</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
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
        <div className="flex-1 flex overflow-hidden p-3 sm:p-6 relative">
          
          <main ref={boardScrollRef} className="flex-1 overflow-x-auto flex gap-3.5 sm:gap-5 items-start pb-2">
            {loading ? (
              <div className="flex items-center justify-center w-full py-20 gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Loading board columns & tasks...</span>
              </div>
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
                    className={`w-[275px] sm:w-[300px] shrink-0 rounded-3xl bg-[#efece4] p-3.5 sm:p-4 border transition-all flex flex-col max-h-full ${
                      dragOverIndex === index ? 'border-teal-500 ring-2 ring-teal-400/40 scale-[1.01]' : 'border-slate-300/50'
                    }`}
                  >
                    {/* COLUMN TOP HEADER */}
                    <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b border-slate-300/60 cursor-grab active:cursor-grabbing">
                      <div className="flex items-center space-x-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">{list.name}</h3>
                        <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200 shrink-0">
                          {listFilteredTasks.length}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1 shrink-0">
                        {canEditBoard && (
                          <button onClick={(e) => handleDeleteList(list.id, e)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* TOP ADD TASK BUTTON */}
                    {canEditBoard && (
                      <button
                        onClick={() => {
                          setAddingTaskColId(addingTaskColId === list.id ? null : list.id);
                          setInlineTaskTitle('');
                          setInlineTaskDescription('');
                          setInlineTaskPoints([]);
                        }}
                        className="mb-3 w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Task</span>
                      </button>
                    )}

                    {/* INLINE TASK CREATION FORM WITH AI AUTO-FILL & CLEAN ALIGNED ADD BUTTON */}
                    {addingTaskColId === list.id && (
                      <div className="mb-3 p-3 rounded-2xl border border-teal-500 bg-white shadow-md space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-xl px-2.5 py-1.5">
                          <span className="text-[10px] font-extrabold text-teal-800 flex items-center gap-1.5 shrink-0">
                            <AiLogoIcon className="w-4 h-4 shrink-0" />
                            <span>AI Doc / Image</span>
                          </span>
                          <button
                            type="button"
                            disabled={isAiAnalyzingInline || isAddingTask}
                            onClick={() => aiInlineFileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs shrink-0 whitespace-nowrap"
                          >
                            {isAiAnalyzingInline ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Reading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3" />
                                <span>Auto-Fill</span>
                              </>
                            )}
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Enter task title..."
                          value={inlineTaskTitle}
                          disabled={isAddingTask}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddInlineTask(list.id);
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none bg-slate-50 text-slate-900 focus:border-teal-500 disabled:opacity-60"
                          autoFocus
                        />

                        {inlineTaskDescription && (
                          <textarea
                            rows={2}
                            value={inlineTaskDescription}
                            disabled={isAddingTask}
                            onChange={(e) => setInlineTaskDescription(e.target.value)}
                            placeholder="AI generated description..."
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-[11px] bg-slate-50 text-slate-700 focus:outline-none focus:border-teal-500 disabled:opacity-60"
                          />
                        )}

                        {inlineTaskPoints.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-teal-700 flex items-center gap-1">
                                <AiLogoIcon className="w-3.5 h-3.5" />
                                <span>AI Steps ({inlineTaskPoints.length})</span>
                              </span>
                              <button
                                type="button"
                                disabled={isAddingTask}
                                onClick={() => setInlineTaskPoints([])}
                                className="text-[9px] text-slate-400 hover:text-rose-500 font-bold"
                              >
                                Clear
                              </button>
                            </div>
                            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                              {inlineTaskPoints.map((pt, i) => (
                                <li key={i} className="text-[10px] text-slate-600 truncate">
                                  • {pt.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* STRAIGHT ALIGNED PRIORITY + CANCEL + ADD ROW */}
                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          <select 
                            value={inlineTaskPriority} 
                            disabled={isAddingTask}
                            onChange={(e) => setInlineTaskPriority(e.target.value)}
                            className="h-7 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[11px] font-bold text-slate-700 outline-none cursor-pointer disabled:opacity-60 shrink-0"
                          >
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                          </select>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isAddingTask}
                              onClick={() => {
                                setAddingTaskColId(null);
                                setInlineTaskDescription('');
                                setInlineTaskPoints([]);
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50 inline-flex items-center justify-center whitespace-nowrap"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!inlineTaskTitle.trim() || isAiAnalyzingInline || isAddingTask}
                              onClick={() => handleAddInlineTask(list.id)}
                              className="h-7 px-3 text-[11px] bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap shadow-2xs"
                            >
                              {isAddingTask ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Adding</span>
                                </>
                              ) : (
                                <span>Add</span>
                              )}
                            </button>
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
                            className="p-3.5 sm:p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between group shrink-0"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${getTagBadgeStyle(task.priority)}`}>
                                {task.priority || 'MEDIUM'}
                              </span>
                              {getDueStatusBadge(task.dueDate)}
                            </div>

                            <h4 className="text-xs font-extrabold text-slate-900 leading-snug mb-2.5">{task.title}</h4>

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
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-2xs shrink-0">
                                  {(cardAssignee || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-600 truncate">@{cardAssignee || 'Unassigned'}</span>
                              </div>

                              <div className="flex items-center space-x-2 text-slate-400 font-bold shrink-0">
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
                <div className="w-[275px] sm:w-[300px] shrink-0 p-4 rounded-3xl bg-white border border-slate-200 shadow-md space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900">Add New Column</h4>
                  <input
                    type="text"
                    placeholder="e.g. In Review..."
                    value={newListTitle}
                    disabled={isCreatingColumn}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddList();
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50 text-slate-900"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isCreatingColumn}
                      onClick={() => setShowAddColumnCard(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newListTitle.trim() || isCreatingColumn}
                      onClick={handleAddList}
                      className="px-4 py-1.5 text-xs bg-teal-600 text-white font-bold rounded-xl cursor-pointer hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isCreatingColumn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isCreatingColumn ? 'Creating...' : 'Create'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumnCard(true)}
                  className="w-[275px] sm:w-[300px] shrink-0 h-40 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-xs font-extrabold text-teal-600 hover:border-teal-500 hover:bg-white transition cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span>Add New Column</span>
                </button>
              )
            )}

          </main>

          {showAnalytics && (
            <aside className="fixed md:static inset-y-3 right-3 w-[calc(100vw-1.5rem)] max-w-xs md:w-72 bg-[#18191c] text-white rounded-3xl p-5 md:ml-4 flex flex-col justify-between shrink-0 shadow-2xl z-40 md:z-20 transition-all">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-extrabold text-sm text-white">Project Analytics</h3>
                  <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
          className="hidden md:block fixed -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold z-50 pointer-events-none shadow-xl border border-slate-700 whitespace-nowrap"
        >
          {tooltipText}
        </div>
      )}

      {/* PROFILE PICTURE UPLOAD MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl relative flex flex-col text-center">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1">
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
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{uploadingAvatar ? 'Uploading...' : 'Save Picture'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS & BOARD SETTINGS MODAL */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0 border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-600 shrink-0" />
                <h2 className="text-base font-extrabold text-slate-900">Workspace Members</h2>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {canEditBoard && (
              <form onSubmit={handleInviteMember} className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter username to invite..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white min-w-0"
                />
                <button type="submit" className="px-3.5 sm:px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 cursor-pointer shrink-0">
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
                  <div key={m.id || m._id || mName} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      {m.avatarUrl ? (
                        <img src={getAvatarUrl(m.avatarUrl)} alt={mName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(mName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">@{mName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.email || 'Member'}</p>
                      </div>
                    </div>
                    {isItemOwner ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 shrink-0">Owner</span>
                    ) : isOwner ? (
                      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
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
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${isViewOnlyMember ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {isViewOnlyMember ? 'View Only' : 'Editor'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
              {isOwner ? (
                <button onClick={handleDeleteBoard} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete Board Workspace</span>
                </button>
              ) : (
                <button onClick={handleLeaveBoard} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Leave Workspace</span>
                </button>
              )}
              <button onClick={() => setIsMembersModalOpen(false)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer shrink-0">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY DRAWER */}
      {isActivityDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-xs sm:w-80 bg-white h-full shadow-2xl p-5 sm:p-6 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Activity History</h3>
              </div>
              <button onClick={() => setIsActivityDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setActivityTimeFilter('24H')}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                  activityTimeFilter === '24H'
                    ? 'bg-white text-teal-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Last 24 Hours
              </button>
              <button
                type="button"
                onClick={() => setActivityTimeFilter('MONTH')}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                  activityTimeFilter === 'MONTH'
                    ? 'bg-white text-teal-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Last Month
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">
                  No activity found for {activityTimeFilter === '24H' ? 'the last 24 hours' : 'the last month'}.
                </p>
              ) : (
                filteredActivities.map((act) => (
                  <div key={act.id || Math.random()} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-600">@{act.username || 'User'}</span>
                      <span className="text-[10px] text-slate-400">
                        {act.createdAt
                          ? new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
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
          <div className="rounded-3xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 bg-white text-slate-900 shadow-2xl flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0 border-b pb-3.5 border-slate-100">
              <div className="flex items-center space-x-2.5 min-w-0">
                <CheckSquare className="w-5 h-5 text-teal-600 shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">My Assigned Tasks</h2>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                <span className="text-[11px] sm:text-xs bg-teal-100 text-teal-800 font-extrabold px-2.5 sm:px-3 py-1 rounded-full border border-teal-200/70">
                  {myAssignedTasks.length} Total
                </span>
                <button
                  type="button"
                  onClick={() => setIsTasksModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 transition cursor-pointer flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">{task.listName}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTagBadgeStyle(task.priority)}`}>{task.priority || 'MEDIUM'}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">{task.title}</h4>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 shrink-0">
                      <p className="font-semibold text-slate-600">{task.dueDate || 'No Due Date'}</p>
                      <p className="text-teal-600 font-bold mt-0.5">View Task →</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button type="button" onClick={() => setIsTasksModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE TASK DETAILS MODAL */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="rounded-3xl max-w-4xl w-full h-[92dvh] md:h-[86vh] shadow-2xl border border-slate-200 bg-white text-slate-900 relative flex flex-col overflow-hidden">
            
            {/* TOP HEADER WITH AI AUTO-FILL BUTTON */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 shrink-0 bg-slate-50/50 gap-2 sm:gap-3">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-teal-500 rounded-xl text-xs sm:text-sm font-bold focus:outline-none bg-white text-slate-900"
                />
              ) : (
                <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 leading-tight truncate">{selectedTask.title}</h2>
              )}

              <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
                {canEditBoard && (
                  <button
                    type="button"
                    disabled={isAiAnalyzingModal}
                    onClick={() => aiModalFileInputRef.current?.click()}
                    title="Upload a Document or Image to auto-generate description & checklist steps"
                    className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition whitespace-nowrap"
                  >
                    {isAiAnalyzingModal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Reading Doc/Images...</span>
                      </>
                    ) : (
                      <>
                        <AiLogoIcon variant="light" className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline">AI Auto-Fill</span>
                        <span className="sm:hidden">AI</span>
                      </>
                    )}
                  </button>
                )}

                {canEditBoard && !isEditing && (
                  <button type="button" onClick={() => setIsEditing(true)} className="text-[11px] sm:text-xs font-bold text-teal-600 hover:underline cursor-pointer whitespace-nowrap">
                    Edit
                  </button>
                )}
                <button type="button" onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SPLIT GRID BODY */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto md:overflow-hidden min-h-0">
              
              {/* LEFT COLUMN */}
              <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-3.5 md:overflow-y-auto text-xs">
                
                {/* 1. METADATA SECTION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 shrink-0">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Assignee:</span>
                    {isEditing ? (
                      <select value={editAssignee || ''} onChange={(e) => setEditAssignee(e.target.value)} className="px-2 py-0.5 border border-slate-200 rounded-lg bg-white font-medium text-xs text-slate-800">
                        <option value="">Unassigned</option>
                        {members.map((m) => {
                          const nameVal = m.username || m.name || m.email?.split('@')[0];
                          return <option key={m.id || m._id || nameVal} value={nameVal}>{nameVal}</option>;
                        })}
                      </select>
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px]">
                        @{extractAssigneeName(selectedTask) || 'Unassigned'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Tag className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Priority:</span>
                    {isEditing ? (
                      <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="px-2 py-0.5 border border-slate-200 rounded-lg bg-white">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px]">
                        {selectedTask.priority || 'MEDIUM'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 sm:col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-500">Due Date:</span>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editDueDate || ''} 
                        onChange={(e) => setEditDueDate(e.target.value)} 
                        className="px-2 py-0.5 border border-slate-200 rounded-lg bg-white font-medium text-xs text-slate-800"
                      />
                    ) : (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px]">
                        {selectedTask.dueDate || 'No Due Date'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. DESCRIPTION SECTION */}
                <div className="flex flex-col space-y-1 shrink-0">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Description</span>
                  </span>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-teal-500 max-h-24 overflow-y-auto"
                    />
                  ) : (
                    <div className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium leading-relaxed whitespace-pre-line min-h-[3.5rem] max-h-24 overflow-y-auto pr-1">
                      {selectedTask.description || 'No description provided.'}
                    </div>
                  )}
                </div>

                {/* 3. CHECKLIST / STEPS SECTION */}
                <div className="flex flex-col space-y-1.5 pt-2 border-t border-slate-100 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
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
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white min-w-0"
                      />
                      <button type="submit" className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-teal-700 shrink-0 whitespace-nowrap">
                        + Step
                      </button>
                    </form>
                  )}

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {checklist.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1.5">No steps added yet.</p>
                    ) : (
                      checklist.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <div className="flex items-start space-x-2 cursor-pointer min-w-0" onClick={() => handleToggleChecklistItem(idx)}>
                            <div className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${item.completed ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>
                              {item.completed && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className={`font-medium leading-snug ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.text}</span>
                          </div>
                          {canEditBoard && (
                            <button type="button" onClick={() => handleDeleteChecklistItem(idx)} className="text-slate-400 hover:text-rose-500 shrink-0 ml-1.5">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. ATTACHMENTS SECTION */}
                <div className="flex flex-col space-y-2 pt-2.5 border-t border-slate-100 shrink-0 relative pb-2">
                  <div className="flex items-center justify-between relative shrink-0 z-30">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                        <span>Attachments</span>
                      </span>
                      {attachments.length > 0 && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {attachments.length}
                        </span>
                      )}
                      {isAiAnalyzingModal && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>AI reading...</span>
                        </span>
                      )}
                    </div>

                    {canEditBoard && (
                      <div className="relative" ref={attachMenuRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAttachMenu((prev) => !prev);
                          }}
                          className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                            showAttachMenu
                              ? 'bg-teal-700 text-white ring-2 ring-teal-500/30'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Attachment</span>
                        </button>

                        {showAttachMenu && (
                          <div className="absolute right-0 bottom-8 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Attach to task
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAttachmentType('image');
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition group"
                            >
                              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-none">Photo</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAttachmentType('video');
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition group"
                            >
                              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                                <VideoIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-none">Video</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">MP4, WEBM</p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAttachmentType('file');
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition group"
                            >
                              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-none">Document</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX, XLSX</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attachments Grid */}
                  <div className="pr-1 pt-0.5">
                    {attachments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1.5">
                        No attachments added yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 pt-1">
                        {attachments.map((attStr, idx) => {
                          const fileObj = parseAttachment(attStr);
                          const ext = (fileObj.name?.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (fileObj.isImage || fileObj.isVideo) {
                                  setPreviewMedia(fileObj);
                                } else {
                                  window.open(fileObj.url, '_blank', 'noreferrer');
                                }
                              }}
                              className="group relative flex items-center gap-2 p-2 pr-2.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-teal-400 shadow-2xs hover:shadow-md transition-all cursor-pointer w-full"
                            >
                              {fileObj.isImage ? (
                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200/60 relative">
                                  <img
                                    src={fileObj.url}
                                    alt={fileObj.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                              ) : fileObj.isVideo ? (
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                                  <VideoIcon className="w-3.5 h-3.5" />
                                  <span className="text-[7px] font-black mt-0.5">VIDEO</span>
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex flex-col items-center justify-center shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="text-[7px] font-black mt-0.5">{ext}</span>
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-800 truncate group-hover:text-teal-700 transition">
                                  {fileObj.name || 'Attachment'}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] font-semibold text-slate-400 uppercase">
                                    {fileObj.isImage ? 'Image' : fileObj.isVideo ? 'Video' : ext}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <a
                                    href={fileObj.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[8px] font-bold text-teal-600 hover:underline flex items-center gap-0.5"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>Save</span>
                                  </a>
                                </div>
                              </div>

                              {/* Hover / Mobile Action Buttons */}
                              {canEditBoard && (
                                <div className="absolute -top-2 -right-1.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20">
                                  {!fileObj.isVideo && (
                                    <button
                                      type="button"
                                      disabled={isAiAnalyzingModal}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAnalyzeExistingAttachment(fileObj);
                                      }}
                                      title="Analyze with AI to generate Task Name, Description & Steps"
                                      className="w-5 h-5 rounded-full bg-white hover:bg-teal-50 border border-teal-300 disabled:opacity-50 flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                                    >
                                      {isAiAnalyzingModal ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-teal-600" />
                                      ) : (
                                        <AiLogoIcon className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAttachment(idx);
                                    }}
                                    title="Remove file"
                                    className="w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Dedicated Fixed Task Comments Section */}
              <div className="p-4 sm:p-6 md:overflow-y-auto flex flex-col">
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
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50 gap-2">
              {canEditBoard ? (
                <button type="button" onClick={(e) => handleDeleteTask(selectedTask.id, e)} className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              ) : <div />}

              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={isSavingTask}
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingTask}
                      onClick={handleSaveTaskUpdates}
                      className="px-3.5 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isSavingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isSavingTask ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setSelectedTask(null)} className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer">Close</button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* UPLOAD WINDOW */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-900"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-2xs">
                  <Paperclip className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Insert {uploadCategory === 'image' ? 'Photos' : uploadCategory === 'video' ? 'Videos' : 'Documents'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 border-b border-slate-200 bg-slate-50/40 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleSelectAttachmentType('file')}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  uploadCategory === 'file'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Documents</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectAttachmentType('image')}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  uploadCategory === 'image'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photos</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectAttachmentType('video')}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  uploadCategory === 'video'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Videos</span>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverDropzone(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverDropzone(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverDropzone(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverDropzone(false);
                  const droppedFiles = e.dataTransfer?.files;
                  if (droppedFiles && droppedFiles.length > 0) {
                    handleFileUpload({ target: { files: droppedFiles } });
                  }
                }}
                className={`h-56 sm:h-72 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-4 sm:p-6 transition-all ${
                  isDraggingOverDropzone
                    ? 'border-teal-500 bg-teal-50/60 scale-[1.01]'
                    : 'border-slate-300 bg-white hover:border-teal-400'
                }`}
              >
                <div className="w-16 sm:w-20 h-14 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-100 via-teal-100 to-sky-100 border border-teal-200/70 flex items-center justify-center mb-4 sm:mb-5 shadow-xs">
                  <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600" />
                </div>

                <button
                  type="button"
                  onClick={handleBrowseButtonClick}
                  className="px-7 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition cursor-pointer mb-3"
                >
                  Browse
                </button>

                <p className="text-xs text-slate-600 font-medium">
                  or drag {uploadCategory === 'image' ? 'photos' : uploadCategory === 'video' ? 'videos' : 'files'} here to upload
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {uploadCategory === 'image'
                    ? 'PNG, JPG, WEBP, GIF'
                    : uploadCategory === 'video'
                    ? 'MP4, WEBM, MOV'
                    : 'PDF, DOCX, XLSX, TXT, ZIP'}
                </p>
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
              <img src={previewMedia.url} alt={previewMedia.name} className="max-h-[75dvh] sm:max-h-[80vh] w-auto rounded-3xl object-contain border border-slate-700 shadow-2xl" />
            )}

            {previewMedia.isVideo && (
              <video src={previewMedia.url} controls autoPlay className="max-h-[75dvh] sm:max-h-[80vh] w-full rounded-3xl border border-slate-700 shadow-2xl bg-black" />
            )}

            <div className="mt-3 text-white text-xs font-bold bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 max-w-full truncate">
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
              <button type="button" onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))} className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmModal.onConfirm} className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">Confirm</button>
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

      {/* HIDDEN AI FILE INPUTS */}
      <input
        type="file"
        ref={aiInlineFileInputRef}
        onChange={handleAiAnalyzeForInlineTask}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
      />
      <input
        type="file"
        ref={aiModalFileInputRef}
        onChange={handleAiAnalyzeForModalTask}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
      />

      {/* TOAST POPUP */}
      {toast.show && (
        <div
          className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-700'
              : 'bg-slate-900 text-teal-300 border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}