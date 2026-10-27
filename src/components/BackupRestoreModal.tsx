import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Calendar,
  BookMarked,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Assignment, CourseEntry, SessionUser } from '../types';
import {
  exportAssignmentsBackup,
  parseAssignmentsBackup,
  exportScheduleBackup,
  parseScheduleBackup,
} from '../lib/backupService';
import { resetStoredSchedule } from '../lib/scheduleData';
import { playChime } from '../lib/notifications';
import { logAuditEvent } from '../lib/auditLogger';
import confetti from 'canvas-confetti';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
  onRestoreAssignments: (restored: Assignment[]) => void;
  courses: CourseEntry[];
  onRestoreCourses: (restored: CourseEntry[]) => void;
  currentUser: SessionUser;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  assignments,
  onRestoreAssignments,
  courses,
  onRestoreCourses,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'assignments' | 'schedule'>('assignments');

  // Assignment restore states
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentPreview, setAssignmentPreview] = useState<{
    exportedAt: string;
    exportedBy: string;
    count: number;
    assignments: Assignment[];
    isChecksumValid: boolean;
  } | null>(null);
  const [assignmentRestoreMode, setAssignmentRestoreMode] = useState<'replace' | 'merge'>('replace');

  // Schedule restore states
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [schedulePreview, setSchedulePreview] = useState<{
    exportedAt: string;
    exportedBy: string;
    count: number;
    courses: CourseEntry[];
    isChecksumValid: boolean;
  } | null>(null);

  // Common feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const assignmentInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ---------------------------------------------------------
  // Handlers for Assignments Backup & Restore
  // ---------------------------------------------------------
  const handleExportAssignments = () => {
    exportAssignmentsBackup(assignments, {
      username: currentUser.username,
      displayName: currentUser.displayName,
      role: currentUser.role,
    });
    playChime('success');
    setSuccessMessage(`已成功下載作業備份檔 (共 ${assignments.length} 筆)。`);
  };

  const handleAssignmentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setSuccessMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    setAssignmentFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseAssignmentsBackup(text);
      if (!parsed.success || !parsed.payload) {
        setErrorMessage(parsed.error || '檔案格式不符');
        setAssignmentPreview(null);
        playChime('urgent');
      } else {
        setAssignmentPreview({
          exportedAt: parsed.payload.exportedAt,
          exportedBy: parsed.payload.exportedBy,
          count: parsed.payload.assignmentCount,
          assignments: parsed.payload.assignments,
          isChecksumValid: parsed.isChecksumValid,
        });
        playChime('info');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestoreAssignments = () => {
    if (!assignmentPreview) return;
    setIsProcessing(true);

    setTimeout(() => {
      let finalAssignments: Assignment[] = [];

      if (assignmentRestoreMode === 'replace') {
        finalAssignments = assignmentPreview.assignments;
      } else {
        // Merge mode: retain existing, append new by ID
        const existingMap = new Map<string, Assignment>(assignments.map((a) => [a.id, a]));
        assignmentPreview.assignments.forEach((asg) => {
          existingMap.set(asg.id, asg);
        });
        finalAssignments = Array.from(existingMap.values());
      }

      onRestoreAssignments(finalAssignments);
      setIsProcessing(false);

      logAuditEvent({
        category: 'backup',
        action: '復原作業資料',
        level: 'info',
        actor: {
          username: currentUser.username,
          displayName: currentUser.displayName,
          role: currentUser.role,
        },
        target: 'Assignments',
        details: `以「${assignmentRestoreMode === 'replace' ? '覆蓋現有' : '合併現有'}」模式復原作業，現共有 ${finalAssignments.length} 筆作業。`,
      });

      playChime('success');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      setSuccessMessage(`作業資料復原成功！目前清單共 ${finalAssignments.length} 筆。`);
      setAssignmentPreview(null);
      setAssignmentFile(null);
      if (assignmentInputRef.current) assignmentInputRef.current.value = '';
    }, 300);
  };

  // ---------------------------------------------------------
  // Handlers for Schedule Backup & Restore
  // ---------------------------------------------------------
  const handleExportSchedule = () => {
    exportScheduleBackup(courses, {
      username: currentUser.username,
      displayName: currentUser.displayName,
      role: currentUser.role,
    });
    playChime('success');
    setSuccessMessage(`已成功下載課表備份檔 (共 ${courses.length} 門課堂)。`);
  };

  const handleScheduleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setSuccessMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    setScheduleFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseScheduleBackup(text);
      if (!parsed.success || !parsed.payload) {
        setErrorMessage(parsed.error || '檔案格式不符');
        setSchedulePreview(null);
        playChime('urgent');
      } else {
        setSchedulePreview({
          exportedAt: parsed.payload.exportedAt,
          exportedBy: parsed.payload.exportedBy,
          count: parsed.payload.courseCount,
          courses: parsed.payload.courses,
          isChecksumValid: parsed.isChecksumValid,
        });
        playChime('info');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestoreSchedule = () => {
    if (!schedulePreview) return;
    setIsProcessing(true);

    setTimeout(() => {
      onRestoreCourses(schedulePreview.courses);
      setIsProcessing(false);

      logAuditEvent({
        category: 'backup',
        action: '復原課表資料',
        level: 'info',
        actor: {
          username: currentUser.username,
          displayName: currentUser.displayName,
          role: currentUser.role,
        },
        target: 'Schedule',
        details: `成功復原課表資料，共 ${schedulePreview.courses.length} 堂課。`,
      });

      playChime('success');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      setSuccessMessage(`課表復原成功！已載入 ${schedulePreview.courses.length} 堂課表資料。`);
      setSchedulePreview(null);
      setScheduleFile(null);
      if (scheduleInputRef.current) scheduleInputRef.current.value = '';
    }, 300);
  };

  const handleResetToDefaultSchedule = () => {
    if (!window.confirm('確定要還原為預設標準課表嗎？此操作將覆蓋現有自訂課表設定。')) {
      return;
    }
    const defaults = resetStoredSchedule();
    onRestoreCourses(defaults);

    logAuditEvent({
      category: 'schedule',
      action: '還原預設課表',
      level: 'info',
      actor: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        role: currentUser.role,
      },
      target: 'Schedule',
      details: '已將課表資料還原為官方預設授課課表。',
    });

    playChime('info');
    setSuccessMessage('已成功還原為官方標準課表！');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        id="backup-restore-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                資料備份與復原系統
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                支援課表與作業各自獨立匯出備份與完整性驗證
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

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-white dark:bg-slate-900 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('assignments');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 btn-press cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>作業資料備份與復原</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('schedule');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 btn-press cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>課表資料備份與復原</span>
          </button>
        </div>

        {/* Feedback Message Bar */}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'assignments' ? (
            /* TAB 1: Assignments Backup & Restore */
            <div className="space-y-6">
              {/* Export Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>匯出作業備份檔案</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      目前系統共有 <strong className="text-blue-600 dark:text-blue-400">{assignments.length}</strong> 筆作業。匯出內容包含作業標題、截止期限、子任務步驟與繳交方式。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAssignments}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-blue-500/25 flex items-center justify-center gap-2 btn-press cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>匯出作業備份 (.json)</span>
                  </button>
                </div>
              </div>

              {/* Restore Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>復原作業備份檔案</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    請選取先前由本系統匯出之作業備份 JSON 檔案進行資料復原。
                  </p>
                </div>

                {/* File picker */}
                <div className="flex items-center gap-3">
                  <input
                    ref={assignmentInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleAssignmentFileSelect}
                    className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950/60 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* File Preview if valid */}
                {assignmentPreview && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span>備份檔案內容預覽</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {assignmentFile?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">作業數量</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {assignmentPreview.count} 筆
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">備份時間</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {new Date(assignmentPreview.exportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 block">匯出者</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                          {assignmentPreview.exportedBy}
                        </span>
                      </div>
                    </div>

                    {/* Restore Mode Options */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        復原方式選擇
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            assignmentRestoreMode === 'replace'
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="asgRestoreMode"
                            value="replace"
                            checked={assignmentRestoreMode === 'replace'}
                            onChange={() => setAssignmentRestoreMode('replace')}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              完全覆蓋現有作業
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              將系統作業完全還原為此備份檔之內容
                            </span>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            assignmentRestoreMode === 'merge'
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="asgRestoreMode"
                            value="merge"
                            checked={assignmentRestoreMode === 'merge'}
                            onChange={() => setAssignmentRestoreMode('merge')}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              合併至現有作業
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              保留現有作業，同時新增備份中的不重複項目
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleConfirmRestoreAssignments}
                        disabled={isProcessing}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs btn-press flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isProcessing ? '復原中...' : '確認執行作業復原'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: Schedule Backup & Restore */
            <div className="space-y-6">
              {/* Export Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>匯出課表備份檔案</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      目前課表共有 <strong className="text-blue-600 dark:text-blue-400">{courses.length}</strong> 門課堂。包含週一至週五各節次之授課科目、教官與教室資訊。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSchedule}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-blue-500/25 flex items-center justify-center gap-2 btn-press cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>匯出課表備份 (.json)</span>
                  </button>
                </div>
              </div>

              {/* Restore Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>復原課表備份檔案</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      選取先前備份之課表 JSON 檔案，或快速還原為官方標準課表。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToDefaultSchedule}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl btn-press flex items-center gap-1.5 cursor-pointer font-medium"
                    title="還原預設官方標準課表"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>還原預設課表</span>
                  </button>
                </div>

                {/* File picker */}
                <div className="flex items-center gap-3">
                  <input
                    ref={scheduleInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleScheduleFileSelect}
                    className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950/60 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* Schedule File Preview */}
                {schedulePreview && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span>課表檔案內容預覽</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {scheduleFile?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">課程堂數</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {schedulePreview.count} 堂課
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">備份時間</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {new Date(schedulePreview.exportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 block">匯出者</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                          {schedulePreview.exportedBy}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleConfirmRestoreSchedule}
                        disabled={isProcessing}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs btn-press flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isProcessing ? '復原中...' : '確認執行課表復原'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold btn-press cursor-pointer"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
