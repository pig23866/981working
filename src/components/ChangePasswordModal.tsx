import React, { useState } from 'react';
import {
  X,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCheck,
} from 'lucide-react';
import { SessionUser } from '../types';
import { changePassword, loadUsers } from '../lib/auth';
import { playChime } from '../lib/notifications';
import confetti from 'canvas-confetti';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [targetUsername, setTargetUsername] = useState(currentUser.username);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';
  const allUsers = isAdmin ? loadUsers() : [];
  const isModifyingOtherUser = isAdmin && targetUsername.toLowerCase() !== currentUser.username.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 4) {
      setErrorMessage('新密碼長度至少需要 4 碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('兩次輸入的新密碼不一致，請重新檢查');
      return;
    }

    if (!isModifyingOtherUser && !oldPassword) {
      setErrorMessage('請輸入目前舊密碼');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = changePassword(
        targetUsername,
        oldPassword,
        newPassword,
        isModifyingOtherUser, // Admin can override without old password
        currentUser
      );

      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage('密碼修改成功！新密碼已儲存更新。');
        playChime('success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(result.error || '密碼修改失敗');
        playChime('urgent');
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        id="change-password-modal"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">修改安全密碼</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">請設定至少4碼之新密碼</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg btn-press cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Admin selecting target user */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                選擇欲修改密碼的帳號 (管理員特權)
              </label>
              <select
                value={targetUsername}
                onChange={(e) => {
                  setTargetUsername(e.target.value);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {allUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.displayName} ({u.role === 'admin' ? '管理員' : '一般使用者'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Old password (not needed if admin editing another user) */}
          {!isModifyingOtherUser && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                目前舊密碼 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="請輸入目前密碼"
                  className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {isModifyingOtherUser && (
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 shrink-0" />
              <span>管理員身分：可直接重設目標使用者密碼，無需輸入舊密碼。</span>
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              設定新密碼 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="請輸入新密碼 (至少4碼)"
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              確認新密碼 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼"
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Show/Hide password toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPasswords ? '隱藏密碼文字' : '顯示密碼文字'}</span>
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 btn-press cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '儲存中...' : '確認更新密碼'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
