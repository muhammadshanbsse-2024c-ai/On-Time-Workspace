import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp'; // <--- OTP Verification Page Import
import Dashboard from './pages/Dashboard';
import BoardView from './pages/BoardView';
import ProtectedRoute from './components/protectedroute';

// OAuth2 Redirect Handler Component - Fully Dynamic
function OAuth2RedirectHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Clear stale session/tokens first
    localStorage.clear();
    sessionStorage.clear();

    // 2. Extract DYNAMIC URL parameters sent by Spring Boot SecurityConfig
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const username = searchParams.get('username') || (email ? email.split('@')[0] : 'User');

    if (token && userId) {
      // Complete user object matching real backend data
      const userData = {
        id: Number(userId),
        userId: Number(userId),
        email: email,
        username: username,
        name: name || username
      };

      // Set authentic dynamic session values
      localStorage.setItem('token', token);
      localStorage.setItem('userId', String(userId));
      localStorage.setItem('username', username);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('user', JSON.stringify(userData));

      // Redirect to dashboard with complete dynamic user state
      window.location.href = '/dashboard';
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ece9e2] font-sans">
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center space-x-3">
        <div className="w-4 h-4 rounded-full bg-teal-600 animate-ping" />
        <span className="text-xs font-extrabold text-slate-800">
          Authenticating with Google, loading OnTime workspace...
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Email Registration OTP Verification Route */}
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* Google OAuth2 Handler Route */}
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/board/:boardId"
          element={
            <ProtectedRoute>
              <BoardView />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}