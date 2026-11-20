'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('1234');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDevHint(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'OTP ઈમેલ પર મોકલી દેવાયો છે.');
        if (data.devHint) setDevHint(data.devHint);
        setStep(2);
      } else {
        setError(data.error || 'OTP મોકલવામાં ભૂલ આવી');
      }
    } catch {
      setError('નેટવર્ક એરર આવી છે. ફરી પ્રયત્ન કરો.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          newPin,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે! લૉગિન પેજ પર જઈ રહ્યા છીએ...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'પાસવર્ડ બદલવામાં ભૂલ આવી');
      }
    } catch {
      setError('નેટવર્ક એરર આવી છે. ફરી પ્રયત્ન કરો.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      }}
    >
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 1 ? 'પાસવર્ડ ભૂલી ગયા છો?' : 'નવો પાસવર્ડ સેટ કરો'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {step === 1
              ? 'તમારો રજિસ્ટર્ડ ઈમેલ દાખલ કરો જેથી અમે ૬-અંક નો સુરક્ષિત OTP મોકલી શકીએ'
              : 'ઈમેલ પર આવેલ ૬-અંક OTP અને નવો પાસવર્ડ દાખલ કરો'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {devHint && (
          <div className="mb-4 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs text-center font-mono">
            {devHint}
          </div>
        )}

        {/* ─── Step 1: Request OTP Form ─── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                રજિસ્ટર્ડ ઈમેલ એડ્રેસ
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                  placeholder="admin@navjivan.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>OTP મોકલો (Send OTP)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── Step 2: Verify OTP & Set New Password ─── */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                ૬-અંક નો OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full text-center tracking-widest text-xl font-bold py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-gray-50 outline-none transition-all"
                placeholder="123456"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                નવો પાસવર્ડ (New Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                નવો ૪-અંક PIN (New 4-Digit PIN)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                  placeholder="1234"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>પાસવર્ડ સેવ કરો (Save Password)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(1);
              }}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 pt-1"
            >
              ← ઈમેલ બદલવા પાછા જાઓ
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <Link
            href="/login"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>લૉગિન પેજ પર પાછા જાઓ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
