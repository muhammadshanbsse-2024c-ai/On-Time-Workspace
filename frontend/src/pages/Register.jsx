import React, { useState } from 'react';
import API from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Clear stale session
      localStorage.clear();
      sessionStorage.clear();

      // Step 2: Clean Payload match with Spring Boot User model
      const payload = {
        name: formData.name ? formData.name.trim() : '',
        email: formData.email ? formData.email.trim() : '',
        password: formData.password
      };

      // Step 3: Send POST request to backend
      const response = await API.post('/auth/register', payload);
      const data = response.data;

      // Step 4: Check if OTP is required for manual email registration
      if (data && data.requiresOtp) {
        navigate(`/verify-otp?email=${encodeURIComponent(payload.email)}`);
      } else if (data && data.token) {
        // Fallback for direct token response
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', String(data.userId || data.id || '1'));
        localStorage.setItem('user', JSON.stringify(data.user || data));
        localStorage.setItem('userEmail', payload.email);
        window.location.href = '/dashboard';
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Registration Error:', err);
      
      // Extract backend error response string or object message
      let errMsg = 'Registration failed. Please check your details.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.message) {
          errMsg = err.response.data.message;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Seamless Google Sign-In Trigger Handler
  const handleGoogleRegister = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-4 md:p-8 font-sans antialiased">
      {/* Main Split-Screen Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/60 w-full max-w-4xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px]">
        
        {/* LEFT PANEL: Branding & Illustration */}
        <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-slate-50 p-8 md:p-12 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-slate-100">
          <div>
            {/* Logo */}
            <div className="flex items-center space-x-2.5 mb-10">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-teal-500/20 text-lg">
                O
              </div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">OnTime</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
              Unlock Your <br />
              <span className="text-teal-600">Team Performance</span>
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Streamline tasks, collaborate in real-time, and track project status seamlessly.
            </p>
          </div>

          {/* SVG Team Vector Illustration */}
          <div className="my-8 flex justify-center">
            <svg className="w-64 h-44 text-teal-600" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="240" width="400" height="12" rx="6" fill="#E2E8F0" />
              {/* Person Left */}
              <circle cx="150" cy="120" r="30" fill="#F59E0B" />
              <path d="M115 240 C115 170 185 170 185 240 Z" fill="#D97706" />
              {/* Person Center */}
              <circle cx="250" cy="95" r="34" fill="#0D9488" />
              <path d="M205 240 C205 150 295 150 295 240 Z" fill="#0F766E" />
              {/* Person Right */}
              <circle cx="350" cy="125" r="28" fill="#0284C7" />
              <path d="M318 240 C318 175 382 175 382 240 Z" fill="#0369A1" />
            </svg>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Real-time WebSocket Synchronization Active</span>
          </div>
        </div>

        {/* RIGHT PANEL: Registration Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome to OnTime
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Create an account to track tasks in real-time
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-white border border-slate-200 hover:border-teal-500 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-[10px] uppercase font-bold text-slate-400">or register with email</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-medium transition"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-medium transition"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-medium transition"
                  placeholder="••••••••"
                />
                {/* Password Toggle Icon */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs text-slate-500 font-medium mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-600 hover:underline">
              Sign in
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}