import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  BookMarked,
  Sun,
  Moon,
} from 'lucide-react';
import { loginUser, syncUsersFromCloud, ensureSeedUsersSyncedToCloud } from '../lib/auth';
import { subscribeToUsers, fetchUsersFromCloud } from '../lib/firebase';
import { SessionUser } from '../types';
import { playChime } from '../lib/notifications';

interface LoginViewProps {
  onLoginSuccess: (user: SessionUser) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ensure all 14 official student accounts and Admin are properly uploaded to Cloud Firestore
    ensureSeedUsersSyncedToCloud().catch(() => {});

    // Live synchronization with Firestore users collection
    const unsubscribe = subscribeToUsers((cloudUsers) => {
      syncUsersFromCloud(cloudUsers);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    let result = loginUser(username, password);

    // If initial check fails, fetch fresh cloud users once in case of recent update
    if (!result.success) {
      try {
        const cloudUsers = await fetchUsersFromCloud();
        if (cloudUsers.length > 0) {
          syncUsersFromCloud(cloudUsers);
          result = loginUser(username, password);
        }
      } catch (err) {
        console.warn('Cloud user refresh notice:', err);
      }
    }

    setIsLoading(false);

    if (result.success && result.user) {
      playChime('success');
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.error || '登入失敗，請確認帳號與密碼');
      playChime('urgent');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 dark:text-slate-100 relative transition-colors duration-200">
      {/* Top Bar with Dark Mode Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs btn-press cursor-pointer"
          title={isDarkMode ? '切換為淺色模式' : '切換為深色模式'}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Main Login Card - Multi-platform responsive container */}
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 relative z-10 modal-panel">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 mb-3">
            <BookMarked className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            作業統整管理系統
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            智慧課表與作業統整管理平台
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              帳號
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 text-slate-900 dark:text-white font-medium placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              密碼
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 text-slate-900 dark:text-white font-medium placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title={showPassword ? '隱藏密碼' : '顯示密碼'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full pt-1 py-3 sm:py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 btn-press flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>登入系統</span>
          </button>
        </form>
      </div>
    </div>
  );
};
