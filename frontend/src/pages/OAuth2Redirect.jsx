import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuth2Redirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Purana storage completely wipe karein
    localStorage.clear();
    sessionStorage.clear();

    // 2. Google OAuth redirect URL se params extract karein
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    if (token) {
      // 3. New Logged-in Google User Details Save Karein
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email);

      const userObj = {
        id: userId,
        email: email,
        username: username || email.split('@')[0],
        name: username || email.split('@')[0]
      };

      localStorage.setItem('user', JSON.stringify(userObj));

      // 4. Hard redirect to dashboard for fresh state
      window.location.href = '/dashboard';
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ece9e2] font-sans">
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center space-x-3">
        <div className="w-4 h-4 rounded-full bg-teal-600 animate-ping" />
        <span className="text-xs font-extrabold text-slate-800">
          Authenticating with Google, setting up workspace...
        </span>
      </div>
    </div>
  );
}