import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, LogOut, Layout, User, Search, Briefcase, 
  CheckSquare, Users, Settings, Home, Layers, Clock, ArrowRight, X, CheckCircle, PieChart,
  Camera, Upload, Bell, ChevronRight, Activity
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Navigation, Dynamic Sidebar & View States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'tasks'
  const [boards, setBoards] = useState([]);
  const [allAssignedTasks, setAllAssignedTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Profile Picture Upload Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // Helper to format backend relative image paths
  const getAvatarUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
  };

  // Helper to strictly extract logged in user & numeric userId
  const getNumericUserId = () => {
    let user = null;
    let userId = localStorage.getItem('userId');

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        user = JSON.parse(storedUser);
        if (user && (user.id || user.userId)) {
          const parsedId = user.id || user.userId;
          if (!isNaN(parsedId)) {
            userId = parsedId;
          }
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }

    if (!userId || isNaN(userId)) {
      const token = localStorage.getItem('token');
      if (token && typeof token === 'string') {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            if (payload.id && !isNaN(payload.id)) userId = payload.id;
            else if (payload.userId && !isNaN(payload.userId)) userId = payload.userId;
          }
        } catch (e) {
          console.error('Error decoding JWT payload:', e);
        }
      }
    }

    if (userId && (isNaN(userId) || String(userId).includes('@'))) {
      userId = user?.id || null;
    }

    return { user, userId };
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      setLoading(true);
      const { user, userId } = getNumericUserId();

      let activeUser = user;
      try {
        const userRes = await api.get('/users/me');
        if (userRes.data) {
          activeUser = userRes.data;
          localStorage.setItem('user', JSON.stringify(userRes.data));
        }
      } catch (e) {}

      setCurrentUser(activeUser);

      if (userId && !isNaN(userId)) {
        const response = await api.get(`/boards/owner/${userId}`);
        setBoards(response.data || []);
      } else {
        setBoards([]);
      }

      await fetchUserAssignedTasks(activeUser);

    } catch (err) {
      console.error('Error fetching user boards:', err);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAssignedTasks = async (userObj) => {
    try {
      const targetUsername = userObj?.username || userObj?.name || localStorage.getItem('userEmail')?.split('@')[0] || '';
      
      if (!targetUsername) {
        setAllAssignedTasks([]);
        return;
      }

      const res = await api.get(`/tasks/user/assigned?username=${encodeURIComponent(targetUsername)}`);
      const rawTasks = res.data || [];

      const formattedTasks = rawTasks.map((t) => ({
        ...t,
        boardName: t.board?.name || t.board?.title || 'OnTime Project',
        boardId: t.board?.id,
        listName: t.boardList?.name || 'In Progress',
        displayAssignee: t.assignee || t.assignedTo?.username || targetUsername
      }));

      setAllAssignedTasks(formattedTasks);
    } catch (err) {
      console.error('Error fetching assigned tasks:', err);
      setAllAssignedTasks([]);
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
      alert('Please select an image file first.');
      return;
    }

    const { userId } = getNumericUserId();
    const uid = currentUser?.id || userId;

    if (!uid) {
      alert('User session not found.');
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', selectedAvatarFile);
    formData.append('userId', uid);

    try {
      const res = await api.post('/users/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedAvatarUrl = res.data?.avatarUrl;
      const updatedUser = { ...currentUser, avatarUrl: updatedAvatarUrl };
      setCurrentUser(updatedUser);

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.avatarUrl = updatedAvatarUrl;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (e) {}
      }

      setIsProfileModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert('Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    try {
      let { user, userId } = getNumericUserId();

      if (!userId && user && user.id) {
        userId = user.id;
      }

      if (!userId || isNaN(userId)) {
        alert('Session context missing. Please re-login.');
        handleLogout();
        return;
      }

      const payload = {
        name: newBoardTitle.trim(),
        title: newBoardTitle.trim(),
        ownerId: Number(userId)
      };

      const response = await api.post(`/boards/owner/${userId}`, payload);

      const updatedBoards = [...boards, response.data];
      setBoards(updatedBoards);
      setNewBoardTitle('');
      setShowModal(false);

      fetchUserAssignedTasks(currentUser);
    } catch (err) {
      console.error('Error creating board:', err);
      const errData = err.response?.data;
      const msg = typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : (errData || 'Failed to create board.');
      alert(msg);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
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

  // REALTIME WORKING SEARCH FILTERING FOR BOARDS
  const filteredBoards = boards.filter(b => 
    (b.name || b.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // REALTIME WORKING SEARCH FILTERING FOR ASSIGNED TASKS
  const filteredTasks = allAssignedTasks.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (t.title || '').toLowerCase().includes(q);
    const boardMatch = (t.boardName || '').toLowerCase().includes(q);
    const listMatch = (t.listName || '').toLowerCase().includes(q);
    return titleMatch || boardMatch || listMatch;
  });

  return (
    <div className="h-screen w-screen bg-[#ece9e2] font-sans text-slate-800 flex overflow-hidden p-2 md:p-4 gap-3 antialiased">
      
      {/* 1. EXPANDABLE SIDEBAR DRAWER WITH PROPERLY ADJUSTED "OnTime" BRANDING & PROFILE AVATAR */}
      <aside className={`${isSidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300 bg-[#18191c] rounded-3xl flex flex-col justify-between py-6 px-3 text-slate-400 shrink-0 shadow-2xl z-30`}>
        <div className="flex flex-col space-y-6">
          
          {/* BRANDING CONTAINER */}
          <div 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center space-x-3 cursor-pointer group ${!isSidebarOpen ? 'justify-center w-full' : 'px-1'}`}
            title="Toggle Sidebar Menu"
          >
            {currentUser?.avatarUrl ? (
              <img 
                src={getAvatarUrl(currentUser.avatarUrl)} 
                alt="Profile" 
                className="w-10 h-10 rounded-2xl object-cover border-2 border-teal-500 shadow-lg shadow-teal-500/20 group-hover:scale-105 active:scale-95 transition shrink-0 mx-auto" 
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-teal-500/20 group-hover:scale-105 active:scale-95 transition shrink-0 mx-auto">
                {(currentUser?.username || currentUser?.name || 'O').charAt(0).toUpperCase()}
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
              onClick={() => setActiveTab('home')} 
              className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer w-full text-left ${activeTab === 'home' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Dashboard Home"
            >
              <Home className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Dashboard</span>}
            </button>

            <button 
              onClick={() => setActiveTab('tasks')} 
              className={`flex items-center space-x-3 p-3 rounded-2xl transition cursor-pointer relative w-full text-left ${activeTab === 'tasks' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' : 'hover:bg-slate-800 text-slate-400'}`}
              title="My Assigned Tasks"
            >
              <CheckSquare className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">My Tasks</span>}
              {allAssignedTasks.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse ml-auto shrink-0" />
              )}
            </button>

            <button 
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition cursor-pointer w-full text-left"
              title="Projects"
            >
              <Layers className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-xs font-bold truncate">Projects</span>}
            </button>
          </nav>
        </div>

        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800/80">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer w-full text-left"
            title="Logout"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-xs font-bold truncate">Logout</span>}
          </button>

          {/* AVATAR CLICK TO TRIGGER PROFILE UPLOAD */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center space-x-3 p-1.5 rounded-2xl cursor-pointer hover:bg-slate-800 transition group"
            title="Click to update Profile Picture"
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
                  {(currentUser?.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 text-teal-400">
                <Camera className="w-2.5 h-2.5" />
              </div>
            </div>
            {isSidebarOpen && (
              <span className="text-xs font-bold text-slate-200 truncate group-hover:text-teal-400 transition">
                @{currentUser?.username || currentUser?.name || 'User'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CARD CONTAINER */}
      <div className="flex-1 bg-[#f7f5f0] rounded-3xl border border-slate-300/60 shadow-xl flex flex-col min-w-0 overflow-hidden relative">
        
        {/* TOP TOOLBAR & SEARCH HEADER */}
        <header className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#f7f5f0]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-extrabold text-slate-900">
              {activeTab === 'home' ? 'OnTime Workspace' : 'My Assigned Tasks'}
            </h1>
          </div>

          <div className="flex-1 max-w-sm mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder={activeTab === 'home' ? "Search OnTime boards..." : "Search assigned tasks..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 placeholder-slate-400 font-medium transition shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentUser && (
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold shadow-2xs hover:border-teal-400 cursor-pointer transition"
                title="Change Profile Picture"
              >
                {currentUser.avatarUrl ? (
                  <img src={getAvatarUrl(currentUser.avatarUrl)} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-teal-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-teal-600" />
                )}
                <span>@{currentUser.username || currentUser.name || currentUser.email?.split('@')[0]}</span>
              </div>
            )}
            
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl flex items-center space-x-1.5 shadow-md cursor-pointer transition"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span> Create Board</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE CANVAS CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">

          
          {activeTab === 'home' ? (
            <>
              {/* FEATURE STATS BANNER */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Total Boards</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{boards.length}</h3>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                    <Layout className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Assigned Tasks</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{allAssignedTasks.length}</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Active Workspace</p>
                    <h3 className="text-xl font-black text-teal-600 mt-1">OnTime Live</h3>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <PieChart className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">OnTime Projects</h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Manage workflows, collaborate in real-time, and track project deadlines effortlessly.
                  </p>
                </div>
                <span className="text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full">
                  {filteredBoards.length} Active Boards
                </span>
              </div>

              {loading ? (
                <div className="text-center py-20 text-xs font-bold text-slate-400">Loading OnTime boards...</div>
              ) : filteredBoards.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-2xs max-w-lg mx-auto">
                  <Layout className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                  <p className="text-slate-900 font-extrabold mb-1">
                    {searchQuery.trim() ? "No matching boards found." : "No project boards found."}
                  </p>
                  <p className="text-slate-400 text-xs mb-5">
                    {searchQuery.trim() ? "Try searching with a different board title." : "Create your first board to start organizing tasks."}
                  </p>
                  {!searchQuery.trim() && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-5 py-2.5 bg-teal-600 text-white text-xs font-extrabold rounded-2xl shadow-md hover:bg-teal-700 cursor-pointer transition"
                    >
                      Create First Board
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredBoards.map((board) => (
                    <div
                      key={board.id}
                      onClick={() => navigate(`/board/${board.id}`)}
                      className="p-5 bg-white border border-slate-200/80 rounded-3xl hover:border-teal-400 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-44 group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all">
                          <Layout className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm truncate mb-1">
                          {board.name || board.title}
                        </h3>
                        <div className="flex items-center text-[11px] text-slate-400 font-semibold space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>OnTime Workspace</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-teal-600">
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}

                  <div
                    onClick={() => setShowModal(true)}
                    className="p-5 border-2 border-dashed border-slate-300 rounded-3xl hover:border-teal-400 cursor-pointer flex flex-col items-center justify-center text-teal-600 hover:bg-white transition-all h-44 shrink-0 group"
                  >
                    <Plus className="w-6 h-6 mb-1.5 text-teal-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-extrabold"> Create Board</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Tasks Assigned to Me</h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Showing all tasks assigned to @{currentUser?.username || currentUser?.name || 'you'} across OnTime projects.
                  </p>
                </div>
                <span className="text-xs font-extrabold bg-teal-100 text-teal-800 px-3 py-1 rounded-full">
                  {filteredTasks.length} Tasks
                </span>
              </div>

              {loading ? (
                <div className="text-center py-20 text-xs font-bold text-slate-400">Loading assigned tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-2xs max-w-lg mx-auto">
                  <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-900 font-extrabold mb-1">
                    {searchQuery.trim() ? "No matching tasks found." : "No assigned tasks found."}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {searchQuery.trim() ? "Try searching for a different task or board name." : "Tasks assigned to you will show up here automatically."}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2">
                  <div className="grid grid-cols-5 text-xs font-extrabold text-slate-400 border-b pb-2 px-2">
                    <span>Task Name</span>
                    <span>Project Board</span>
                    <span>Column</span>
                    <span>Priority</span>
                    <span>Action</span>
                  </div>

                  {filteredTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="grid grid-cols-5 text-xs font-semibold text-slate-800 p-3 border-b border-slate-100 hover:bg-slate-50 items-center transition"
                    >
                      <span className="font-extrabold text-slate-900 truncate">{task.title}</span>
                      <span className="text-teal-600 font-extrabold truncate">{task.boardName}</span>
                      <span>{task.listName}</span>
                      <div>
                        <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${getTagBadgeStyle(task.priority)}`}>
                          {task.priority || 'MEDIUM'}
                        </span>
                      </div>
                      <button 
                        onClick={() => navigate(`/board/${task.boardId}`)}
                        className="text-xs font-extrabold text-teal-600 hover:underline text-left cursor-pointer flex items-center space-x-1"
                      >
                        <span>Open Board</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

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

      {/* CREATE BOARD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-4">Create New OnTime Board</h3>
            <form onSubmit={handleCreateBoard}>
              <input
                type="text"
                placeholder="Board Title (e.g. Sprint Planning)"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-xs mb-6 bg-slate-50 focus:bg-white font-medium"
                autoFocus
                required
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-extrabold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-teal-700 transition cursor-pointer"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}