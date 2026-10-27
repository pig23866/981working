import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Search,
  Filter,
  Trash2,
  Download,
  Shield,
  ShieldCheck,
  User,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Lock,
  RotateCw,
  Cloud,
} from 'lucide-react';
import { AuditLogEntry, LogCategory, LogLevel, SessionUser } from '../types';
import { loadAuditLogs, clearAuditLogs, exportAuditLogsJSON } from '../lib/auditLogger';
import { subscribeToAuditLogs, fetchAuditLogsFromCloud } from '../lib/firebase';
import { playChime } from '../lib/notifications';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
}

const CATEGORY_MAP: Record<LogCategory, { label: string; bg: string; text: string }> = {
  auth: { label: '身分認證', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
  user: { label: '帳號管理', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
  assignment: { label: '作業變更', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
  schedule: { label: '課表維護', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
  backup: { label: '備份與復原', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300' },
  security: { label: '系統安全', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
};

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load initial local logs
    setLogs(loadAuditLogs());

    // Subscribe to live cloud logs
    const unsubscribe = subscribeToAuditLogs(
      (cloudLogs) => {
        if (cloudLogs.length > 0) {
          setLogs(cloudLogs);
        }
      },
      (err) => {
        console.warn('Real-time audit log sync notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const cloudLogs = await fetchAuditLogsFromCloud();
      if (cloudLogs.length > 0) {
        setLogs(cloudLogs);
      } else {
        setLogs(loadAuditLogs());
      }
      playChime('info');
    } catch (e) {
      console.error('Failed to refresh cloud logs:', e);
      setLogs(loadAuditLogs());
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (!isOpen) return null;

  // Security guard: Only Admin can view logs
  if (currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">權限不足</h3>
          <p className="text-xs text-slate-500 mt-1">此日誌系統僅限系統管理員查閱。</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-semibold"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const handleClearLogs = () => {
    if (!window.confirm('確定要清空所有系統日誌嗎？此操作將會記錄至安全審計日誌。')) {
      return;
    }
    clearAuditLogs({
      username: currentUser.username,
      displayName: currentUser.displayName,
      role: currentUser.role,
    });
    handleManualRefresh();
    playChime('info');
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedCategory !== 'all' && log.category !== selectedCategory) {
      return false;
    }
    if (selectedLevel !== 'all' && log.level !== selectedLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchActor = log.actor.displayName.toLowerCase().includes(q) || log.actor.username.toLowerCase().includes(q);
      const matchTarget = log.target?.toLowerCase().includes(q) || false;
      return matchAction || matchDetails || matchActor || matchTarget;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        id="audit-log-modal"
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  系統安全稽核日誌
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  管理員專屬
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                記錄帳號操作、作業變更、課表維護與系統安全事件
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl btn-press cursor-pointer"
              title="重新整理雲端日誌"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">重新整理</span>
            </button>

            <button
              type="button"
              onClick={() => exportAuditLogsJSON(logs)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl btn-press cursor-pointer"
              title="匯出完整日誌 JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出日誌</span>
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl btn-press cursor-pointer"
              title="清空日誌記錄"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋事件動作、詳細描述、操作者或目標..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 text-slate-900 dark:text-white"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">全部分類 ({logs.length})</option>
            <option value="auth">身分認證 (auth)</option>
            <option value="user">帳號管理 (user)</option>
            <option value="assignment">作業變更 (assignment)</option>
            <option value="schedule">課表維護 (schedule)</option>
            <option value="backup">備份與復原 (backup)</option>
            <option value="security">系統安全 (security)</option>
          </select>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">全部等級</option>
            <option value="info">一般資訊 (info)</option>
            <option value="warn">警示事件 (warn)</option>
            <option value="error">異常錯誤 (error)</option>
            <option value="security">安全審計 (security)</option>
          </select>
        </div>

        {/* Logs List Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                目前尚無符合篩選條件之日誌記錄
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const cat = CATEGORY_MAP[log.category] || {
                label: log.category,
                bg: 'bg-slate-100',
                text: 'text-slate-700',
              };

              const isSecurity = log.level === 'security';
              const isWarn = log.level === 'warn';
              const isError = log.level === 'error';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSecurity
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isWarn
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : isError
                      ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category Badge */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${cat.bg} ${cat.text}`}
                      >
                        {cat.label}
                      </span>

                      {/* Action Title */}
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {log.action}
                      </span>

                      {/* Actor */}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {log.actor.displayName}
                        </span>
                        <span className="font-mono text-[10px]">({log.actor.username})</span>
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono self-end sm:self-auto shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Details Description */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed pl-0.5">
                    {log.details}
                  </p>

                  {/* Target details (不顯示雜湊值) */}
                  {log.target && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400">
                      目標：<strong className="text-slate-700 dark:text-slate-300 font-medium">{log.target}</strong>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <span>目前顯示 {filteredLogs.length} / 共 {logs.length} 筆日誌</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
