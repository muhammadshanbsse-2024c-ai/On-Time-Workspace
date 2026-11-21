import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/verify-otp', { email, otp: otp.trim() });
      const data = response.data;

      // OTP match ho gaya - active session set karein
      localStorage.clear();
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.userId || data.id));
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('user', JSON.stringify(data.user || data));

      // Go to Dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || 'Invalid OTP code. Please check terminal log.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex items-center justify-center p-4 font-sans antialiased">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200/60 w-full max-w-md">
        
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold mb-5 shadow-lg shadow-teal-600/20">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Verify Your Email
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
          Humne <span className="font-bold text-teal-600">{email}</span> ke liye verification code generate kiya hai. Terminal log se 6-digit OTP code yahan enter karein.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Enter 6-Digit OTP Code</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                maxLength={6}
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-center tracking-[0.3em] text-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Verifying...' : 'Verify & Continue to OnTime'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}