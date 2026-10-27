import React, { useState, useEffect, useRef } from 'react';
import {
  BookMarked,
  Plus,
  Bell,
  Trash2,
  Calendar,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  Shield,
  User as UserIcon,
  UserPlus,
  ChevronDown,
  Database,
  FileText,
  LayoutGrid,
  RotateCw,
  Users,
} from 'lucide-react';
import { playChime, requestNotificationPermission } from '../lib/notifications';
import { SessionUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenSchedule: () => void;
  onOpenBackupRestore: () => void;
  onOpenAuditLogs?: () => void;
  onOpenClassOverview?: () => void;
  onClearAllAssignments: () => void;
  notificationGranted: boolean;
  setNotificationGranted: (val: boolean) => void;
  assignmentCount: number;
  currentUser: SessionUser | null;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  onOpenUserManagement?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onManualRefresh?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenSchedule,
  onOpenBackupRestore,
  onOpenAuditLogs,
  onOpenClassOverview,
  onClearAllAssignments,
  notificationGranted,
  setNotificationGranted,
  currentUser,
  onLogout,
  onOpenChangePassword,
  onOpenUserManagement,
  isDarkMode,
  onToggleDarkMode,
  onManualRefresh,
}) => {
  const [currentClock, setCurrentClock] = useState('');
  const [showFeaturesMenu, setShowFeaturesMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const featuresMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onManualRefresh) {
        await onManualRefresh();
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 600);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const dayName = days[now.getDay()];
      setCurrentClock(`${year}/${month}/${date} (${dayName}) ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        featuresMenuRef.current &&
        !featuresMenuRef.current.contains(e.target as Node)
      ) {
        setShowFeaturesMenu(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleNotification = async () => {
    if (!notificationGranted) {
      const granted = await requestNotificationPermission();
      setNotificationGranted(granted);
      if (granted) playChime('info');
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Title Typography - Cleaned up without class unit text */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 ring-1 ring-black/5 dark:ring-white/10">
            <BookMarked className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm xs:text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
                作業統整管理系統
              </h1>
              {currentUser && (
                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border leading-tight shrink-0 ${
                    isAdmin
                      ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800'
                      : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800'
                  }`}
                >
                  {isAdmin ? <Shield className="w-3 h-3 text-purple-500" /> : <UserIcon className="w-3 h-3 text-blue-500" />}
                  <span>{isAdmin ? '管理員' : '一般學員'}</span>
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              <span>{currentClock}</span>
            </div>
          </div>
        </div>

        {/* Action Controls - Mobile-friendly & Streamlined */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Primary Action Button: 新增作業 */}
          <button
            id="navbar-add-assignment-btn"
            type="button"
            onClick={onOpenAddModal}
            className="btn-press inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">新增作業</span>
            <span className="xs:hidden">新增</span>
          </button>

          {/* Quick Cloud Sync / Refresh Button */}
          <button
            id="navbar-cloud-sync-btn"
            type="button"
            onClick={handleRefresh}
            disabled={isSyncing}
            className={`btn-press p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isSyncing
                ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/70'
            }`}
            title={isSyncing ? '同步中...' : '重新整理同步'}
            aria-label="重新整理同步"
          >
            <RotateCw
              className={`w-4 h-4 transition-transform duration-700 ${
                isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''
              }`}
            />
          </button>

          {/* Quick Dark Mode Toggle */}
          <button
            id="navbar-dark-mode-toggle"
            type="button"
            onClick={onToggleDarkMode}
            className="btn-press p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-all cursor-pointer shadow-2xs"
            title={isDarkMode ? '切換為淺色模式' : '切換為深色模式'}
            aria-label="切換深淺模式"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12 text-slate-700" />
            )}
          </button>

          {/* Consolidated Features Dropdown Menu (功能選單下拉按鈕) */}
          <div className="relative" ref={featuresMenuRef}>
            <button
              id="navbar-features-menu-btn"
              type="button"
              onClick={() => {
                setShowFeaturesMenu(!showFeaturesMenu);
                setShowUserMenu(false);
              }}
              className={`btn-press inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                showFeaturesMenu
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/10'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs'
              }`}
              title="開啟系統與管理功能選單"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">功能選單</span>
              <span className="sm:hidden text-xs">功能</span>
              <ChevronDown
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-200 ${
                  showFeaturesMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Backdrop for Mobile */}
            {showFeaturesMenu && (
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs sm:hidden transition-opacity duration-150"
                onClick={() => setShowFeaturesMenu(false)}
              />
            )}

            {/* Dropdown Menu Popover */}
            {showFeaturesMenu && (
              <div className="fixed inset-x-3 top-18 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-64 max-w-sm ml-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800">
                {/* Section 1: 課表與功能 */}
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    常用功能
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFeaturesMenu(false);
                      handleRefresh();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                  >
                    <RotateCw
                      className={`w-4 h-4 text-blue-500 shrink-0 ${
                        isSyncing ? 'animate-spin' : ''
                      }`}
                    />
                    <div className="flex-1">
                      <div>重新同步</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        更新最新作業與課表
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFeaturesMenu(false);
                      onOpenSchedule();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1">
                      <div>全週課表系統</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        檢視各節教室與授課教官
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotification();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bell
                        className={`w-4 h-4 shrink-0 ${
                          notificationGranted ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <div>作業期限提醒</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {notificationGranted ? '已啟用即時通知' : '點擊啟用瀏覽器通知'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        notificationGranted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {notificationGranted ? '已開啟' : '關閉'}
                    </span>
                  </button>
                </div>

                {/* Section 2: 資料備份與復原 */}
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    資料管理
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeaturesMenu(false);
                      onOpenBackupRestore();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                  >
                    <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex-1">
                      <div>資料備份與復原</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        匯出或還原課表與作業 JSON
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFeaturesMenu(false);
                      onClearAllAssignments();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="flex-1">
                      <div>清空作業清單</div>
                      <div className="text-[10px] text-rose-400/80 font-normal">
                        清除所有已登記的作業
                      </div>
                    </div>
                  </button>
                </div>

                {/* Section 3: 管理員專用 (只有管理員顯示) */}
                {isAdmin && (
                  <div className="py-1">
                    <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      管理員專區
                    </div>
                    {onOpenClassOverview && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeaturesMenu(false);
                          onOpenClassOverview();
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                      >
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div className="flex-1">
                          <div>全班作業繳交進度總表</div>
                          <div className="text-[10px] text-purple-500/80 font-normal">
                            檢視所有學員與各作業繳交矩陣
                          </div>
                        </div>
                      </button>
                    )}
                    {onOpenUserManagement && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeaturesMenu(false);
                          onOpenUserManagement();
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div className="flex-1">
                          <div>帳號建立與管理</div>
                          <div className="text-[10px] text-purple-500/80 font-normal">
                            新增學員與管理員帳號
                          </div>
                        </div>
                      </button>
                    )}
                    {onOpenAuditLogs && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeaturesMenu(false);
                          onOpenAuditLogs();
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                      >
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="flex-1">
                          <div>系統安全稽核日誌</div>
                          <div className="text-[10px] text-indigo-500/80 font-normal">
                            查看系統安全操作紀錄
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Account Dropdown Menu */}
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                id="navbar-user-menu-btn"
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowFeaturesMenu(false);
                }}
                className={`btn-press flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-purple-50/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/80 hover:bg-purple-100'
                    : 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/80 hover:bg-blue-100'
                }`}
                title="個人帳號設定"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold ${
                    isAdmin ? 'bg-purple-600' : 'bg-blue-600'
                  }`}
                >
                  {isAdmin ? 'A' : (currentUser.displayName ? currentUser.displayName.slice(0, 1) : currentUser.username.slice(0, 2))}
                </div>
                <span className="hidden md:inline max-w-[80px] truncate">
                  {currentUser.displayName || currentUser.username}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden xs:inline" />
              </button>

              {/* Backdrop for Mobile */}
              {showUserMenu && (
                <div
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs sm:hidden transition-opacity duration-150"
                  onClick={() => setShowUserMenu(false)}
                />
              )}

              {/* User Dropdown Popover */}
              {showUserMenu && (
                <div className="fixed inset-x-3 top-18 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-56 max-w-sm ml-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.displayName}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      帳號：{currentUser.username} ({isAdmin ? '管理員' : '一般學員'})
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenChangePassword();
                      }}
                      className="w-full px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                      <span>修改密碼</span>
                    </button>

                    {/* In-App PWA Install in menu */}
                    <div className="px-3 py-1">
                      <PWAInstallButton />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>登出系統</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
