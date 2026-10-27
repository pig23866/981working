import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  Shield,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  Search,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AppUser, SessionUser, UserRole } from '../types';
import {
  createUser,
  deleteUser,
  loadUsers,
  changePassword,
  syncUsersWithCloud,
  syncUsersFromCloud,
} from '../lib/auth';
import { subscribeToUsers } from '../lib/firebase';
import { playChime } from '../lib/notifications';
import confetti from 'canvas-confetti';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Create user form state
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Quick reset password state for list tab
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Sync state
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshList = () => {
    setUsersList(loadUsers());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshList();
    setErrorMessage('');
    setSuccessMessage('');
    setResetTargetUser(null);

    // Live subscription with Cloud Firestore users collection (即時多裝置監聽)
    const unsubscribe = subscribeToUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        syncUsersFromCloud(cloudUsers);
        setUsersList(loadUsers());
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle generating a random secure initial password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let generated = 'Aa';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  // Submit new user creation
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 4) {
      setErrorMessage('密碼長度至少需要 4 碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('兩次輸入的密碼不一致，請再次確認');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = createUser(
        {
          username: newUsername,
          displayName: newDisplayName,
          password: newPassword,
          role: newRole,
        },
        currentUser
      );

      setIsSubmitting(false);

      if (result.success && result.user) {
        setSuccessMessage(`帳號「${result.user.username}」建立成功！`);
        playChime('success');
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
        refreshList();
        // Reset form
        setNewUsername('');
        setNewDisplayName('');
        setNewPassword('');
        setConfirmPassword('');
        setNewRole('user');
      } else {
        setErrorMessage(result.error || '建立帳號失敗');
        playChime('urgent');
      }
    }, 250);
  };

  // Handle deleting a user
  const handleDeleteUser = (usernameToDelete: string) => {
    if (usernameToDelete.toLowerCase() === currentUser.username.toLowerCase()) {
      setErrorMessage('無法刪除目前正在登入的管理員帳號');
      return;
    }

    if (
      !window.confirm(
        `確定要刪除帳號「${usernameToDelete}」嗎？刪除後該使用者將無法登入系統。`
      )
    ) {
      return;
    }

    const result = deleteUser(usernameToDelete, currentUser.username, currentUser);
    if (result.success) {
      playChime('info');
      setSuccessMessage(`已成功刪除帳號「${usernameToDelete}」`);
      refreshList();
    } else {
      setErrorMessage(result.error || '刪除帳號失敗');
      playChime('urgent');
    }
  };

  // Handle submitting quick reset password from admin
  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (resetNewPassword.length < 4) {
      setErrorMessage('新密碼長度至少需要 4 碼');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('兩次密碼輸入不一致');
      return;
    }

    const result = changePassword(resetTargetUser.username, '', resetNewPassword, true, currentUser);
    if (result.success) {
      playChime('success');
      setSuccessMessage(`已成功重設「${resetTargetUser.username}」的密碼！`);
      setResetTargetUser(null);
      setResetNewPassword('');
      setResetConfirmPassword('');
      refreshList();
    } else {
      setErrorMessage(result.error || '重設密碼失敗');
      playChime('urgent');
    }
  };

  // 手動從雲端拉取最新帳號資料並合併
  const handleSyncWithCloud = async () => {
    setIsSyncingCloud(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await syncUsersWithCloud();
      refreshList();
      setSuccessMessage('帳號清單已更新');
      playChime('info');
    } catch {
      setErrorMessage('更新失敗，請檢查網路連線');
      playChime('urgent');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        id="user-management-modal"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  帳號管理與建立
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  管理員專用
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                可新增系統學員帳號、指派身分權限與管理密碼
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-white dark:bg-slate-900 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 btn-press cursor-pointer ${
              activeTab === 'create'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>新增帳號</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 btn-press cursor-pointer ${
              activeTab === 'list'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>帳號清單 ({usersList.length})</span>
          </button>
        </div>

        {/* Alert Feedback Messages */}
        <div className="px-6 pt-3">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            /* Tab 1: Create Account Form */
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    使用者帳號 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.trim())}
                    placeholder="例如: 98211 或 cadet02"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 text-slate-900 dark:text-white font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">登入專用帳號，不可包含空格</span>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    姓名 / 顯示稱謂 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="例如: 陸官正98期學員 (98211)"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 text-slate-900 dark:text-white font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">系統頂端與個人選單之顯示名稱</span>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  身分權限等級 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRole === 'user'
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value="user"
                      checked={newRole === 'user'}
                      onChange={() => setNewRole('user')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          一般學員 (user)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        可檢視課表、登記作業、修改個人密碼
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRole === 'admin'
                        ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value="admin"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          系統管理員 (admin)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        擁有帳號建立、重設他人密碼與清空作業權限
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    初始密碼 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>隨機產生安全密碼</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="請設定初始密碼 (至少4碼)"
                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次確認初始密碼"
                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? '隱藏密碼文字' : '顯示密碼文字'}</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    系統自動加密保護
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
                >
                  取消
                </button>
                <button
                  id="admin-create-user-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-500/25 btn-press flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>立即建立新帳號</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: Existing Accounts List */
            <div className="space-y-4">
              {/* Search Bar & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋帳號或使用者名稱..."
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/25 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSyncWithCloud}
                  disabled={isSyncingCloud}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 btn-press shrink-0"
                  title="重新整理帳號清單"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">重新整理</span>
                </button>
              </div>

              {/* Admin Quick Reset Password Box */}
              {resetTargetUser && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                        管理員快速重設密碼：{resetTargetUser.displayName} ({resetTargetUser.username})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetTargetUser(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAdminResetPassword} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          required
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="請輸入新密碼 (至少4碼)"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          required
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          placeholder="確認新密碼"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        {showResetPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showResetPassword ? '隱藏密碼' : '顯示密碼'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setResetTargetUser(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs cursor-pointer"
                        >
                          儲存新密碼
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List Cards */}
              <div className="space-y-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    查無相符之使用者帳號
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.username.toLowerCase() === currentUser.username.toLowerCase();
                    const isDefaultAdmin = u.username.toLowerCase() === 'admin';
                    const isUserAdmin = u.role === 'admin';

                    return (
                      <div
                        key={u.username}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              isUserAdmin ? 'bg-purple-600' : 'bg-blue-600'
                            }`}
                          >
                            {isUserAdmin ? 'A' : '學'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {u.displayName}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                  isUserAdmin
                                    ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                }`}
                              >
                                {isUserAdmin ? '管理員' : '一般學員'}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  (目前登入中)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              <span>帳號：{u.username}</span>
                              {u.createdAt && (
                                <span className="hidden sm:inline">
                                  建立時間：{new Date(u.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(u);
                              setResetNewPassword('');
                              setResetConfirmPassword('');
                              setErrorMessage('');
                              setSuccessMessage('');
                            }}
                            className="px-2.5 py-1.5 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl btn-press flex items-center gap-1.5 cursor-pointer font-medium"
                            title="重設此帳號密碼"
                          >
                            <KeyRound className="w-3 h-3 text-purple-600" />
                            <span>重設密碼</span>
                          </button>

                          {!isSelf && !isDefaultAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl btn-press cursor-pointer"
                              title="刪除此帳號"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
