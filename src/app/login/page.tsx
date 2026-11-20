'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, User, KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'pin' | 'password'>('pin');

  // PIN state
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Password state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('Kundan Enterprise');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    // Fetch company info for branding
    fetch('/api/company')
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setCompanyName(data.name);
        if (data?.logoUrl) setCompanyLogo(data.logoUrl);
      })
      .catch(() => {});

    // Focus first PIN input on load
    inputRefs[0].current?.focus();
  }, []);

  // Handle PIN input change
  const handlePinChange = (index: number, value: string) => {
    // Only accept numeric digit
    if (value && !/^\d$/.test(value)) return;

    setError('');
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto advance to next box
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits are filled
    if (value && index === 3 && newPin.every((digit) => digit !== '')) {
      submitPin(newPin.join(''));
    }
  };

  // Handle PIN keydown (backspace & navigation)
  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs[index - 1].current?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    } else if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === 4) {
        submitPin(fullPin);
      }
    }
  };

  // Virtual Keypad press
  const handleKeypadPress = (num: string) => {
    setError('');
    const firstEmptyIndex = pin.findIndex((digit) => digit === '');
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = num;
      setPin(newPin);

      if (firstEmptyIndex < 3) {
        inputRefs[firstEmptyIndex + 1].current?.focus();
      }

      if (firstEmptyIndex === 3) {
        submitPin(newPin.join(''));
      }
    }
  };

  const handleKeypadBackspace = () => {
    setError('');
    const lastFilledIndex = [...pin].reverse().findIndex((d) => d !== '');
    if (lastFilledIndex !== -1) {
      const targetIndex = 3 - lastFilledIndex;
      const newPin = [...pin];
      newPin[targetIndex] = '';
      setPin(newPin);
      inputRefs[targetIndex].current?.focus();
    }
  };

  const handleKeypadClear = () => {
    setPin(['', '', '', '']);
    setError('');
    inputRefs[0].current?.focus();
  };

  // Submit PIN login
  const submitPin = async (enteredPin: string) => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'ખોટો PIN દાખલ કર્યો છે');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch {
      setError('કનેક્શન એરર આવી. ફરી પ્રયાસ કરો.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'ખોટો Username અથવા Password છે');
      }
    } catch {
      setError('કનેક્શન એરર આવી. ફરી પ્રયાસ કરો.');
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
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative z-10">
        {/* Header / Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className="w-full h-full object-contain p-2 rounded-2xl"
              />
            ) : (
              <ShieldCheck className="w-9 h-9 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {companyName}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Billing & Inventory ERP System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-sm font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Mode 1: 4-Digit Quick PIN Login ─── */}
        {mode === 'pin' && (
          <div>
            <div className="text-center mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ૪-અંક નો સિક્રેટ PIN દાખલ કરો
              </label>
              {/* 4 PIN Boxes */}
              <div className="flex justify-center gap-3.5 mt-3">
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    className="w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-gray-50 text-gray-900 transition-all outline-none"
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>

            {/* Virtual Keypad for Mobile / Touch / Quick Clicks */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  disabled={loading}
                  className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-lg font-semibold text-gray-800 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                disabled={loading}
                className="h-12 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 active:scale-95 text-sm font-semibold text-gray-600 transition-all flex items-center justify-center"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={loading}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-lg font-semibold text-gray-800 transition-all flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                disabled={loading}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-lg font-semibold text-gray-800 transition-all flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {/* Unlock Button */}
            <button
              type="button"
              onClick={() => submitPin(pin.join(''))}
              disabled={loading || pin.join('').length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>લૉગિન કરો (Unlock Dashboard)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Toggle to Username / Password Mode & Forgot Password */}
            <div className="flex flex-col gap-2 text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('password');
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                અથવા Username & Password વડે લૉગિન કરો →
              </button>
              <Link
                href="/forgot-password"
                className="text-xs text-gray-500 hover:text-blue-700 hover:underline transition-colors"
              >
                પાસવર્ડ ભૂલી ગયા? (Forgot Password / PIN)
              </Link>
            </div>
          </div>
        )}

        {/* ─── Mode 2: Username & Password Login ─── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>લૉગિન કરો (Login)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Toggle back to PIN Mode & Forgot Password */}
            <div className="flex flex-col gap-2 text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('pin');
                  setTimeout(() => inputRefs[0].current?.focus(), 50);
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                ← ૪-અંક PIN મોડ પર પાછા જાઓ
              </button>
              <Link
                href="/forgot-password"
                className="text-xs text-gray-500 hover:text-blue-700 hover:underline transition-colors"
              >
                પાસવર્ડ ભૂલી ગયા? (Forgot Password / PIN)
              </Link>
            </div>
          </form>
        )}

        {/* Security Badge */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Secure 256-Bit Encrypted Session</span>
          </p>
        </div>
      </div>
    </div>
  );
}
