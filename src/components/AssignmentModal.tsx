import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Paperclip,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  Assignment,
  Subject,
  Priority,
  AssignmentStatus,
  SubmissionType,
  Subtask,
  AttachmentItem,
  CourseEntry,
} from '../types';
import { SUBMISSION_LABELS, PRIORITY_LABELS } from '../lib/constants';
import { formatDateForInput } from '../lib/dateUtils';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: Assignment) => void;
  subjects: Subject[];
  courses?: CourseEntry[];
  initialData?: Assignment | null;
  prefillData?: {
    title?: string;
    subjectId?: string;
    notes?: string;
    description?: string;
  } | null;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  courses = [],
  initialData,
  prefillData,
}) => {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 'course-cs-prog');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<AssignmentStatus>('todo');

  // Optional Advanced section state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submissionType, setSubmissionType] = useState<SubmissionType>('classroom');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSubjectId(initialData.subjectId);
      setDescription(initialData.description || '');
      setDeadline(initialData.deadline);
      setPriority(initialData.priority || 'medium');
      setStatus(initialData.status || 'todo');
      setSubmissionType(initialData.submissionType || 'classroom');
      setNotes(initialData.notes || '');
      setSubtasks(initialData.subtasks || []);
      setAttachments(initialData.attachments || initialData.driveAttachments || []);

      // If existing assignment has subtasks or attachments, auto-expand advanced
      if ((initialData.subtasks && initialData.subtasks.length > 0) ||
          (initialData.attachments && initialData.attachments.length > 0) ||
          (initialData.notes && initialData.notes.trim().length > 0)) {
        setShowAdvanced(true);
      } else {
        setShowAdvanced(false);
      }
    } else {
      // Default: Tomorrow at 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);

      setTitle(prefillData?.title || '');
      setSubjectId(prefillData?.subjectId || subjects[0]?.id || 'course-cs-prog');
      setDescription(prefillData?.description || '');
      setDeadline(formatDateForInput(tomorrow));
      setPriority('medium');
      setStatus('todo');
      setSubmissionType('classroom');
      setNotes(prefillData?.notes || '');
      setSubtasks([]);
      setAttachments([]);
      setShowAdvanced(false);
    }
    setShowAddAttachment(false);
  }, [initialData, prefillData, isOpen, subjects]);

  if (!isOpen) return null;

  const setQuickDeadline = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    setDeadline(formatDateForInput(d));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSt: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskText.trim(),
      isCompleted: false,
    };
    setSubtasks([...subtasks, newSt]);
    setNewSubtaskText('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const item: AttachmentItem = {
      id: `att-${Date.now()}`,
      name: newAttachmentName.trim(),
      url: newAttachmentUrl.trim() || '#',
    };
    setAttachments([...attachments, item]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setShowAddAttachment(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignmentToSave: Assignment = {
      id: initialData?.id || `asg-${Date.now()}`,
      title: title.trim(),
      subjectId,
      description: description.trim(),
      deadline,
      priority,
      status,
      submissionType,
      subtasks,
      attachments,
      driveAttachments: attachments,
      estimatedMinutes: initialData?.estimatedMinutes || 60,
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(assignmentToSave);
    onClose();
  };

  // Find selected subject info for display
  const currentSubject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        id="assignment-modal"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] modal-panel"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? '編輯作業' : '新增作業'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                選擇對應課程名稱與截止時間
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl btn-press cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Simplified & High Efficiency */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 1. 課程名稱 (下拉選單對應課程名稱) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              課程名稱 (下拉選單) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="modal-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer transition-all"
              >
                <optgroup label="課表對應課程" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {s.name} ({s.code})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* 2. 作業名稱 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              作業名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              id="modal-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：程式上機練習 (一)、課本 P.30 習題"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white transition-all"
            />
          </div>

          {/* 3. 繳交期限 (含快速晶片按鈕) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                繳交期限 <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 hidden sm:inline">快捷:</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(24)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  明天
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(72)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  3天後
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(168)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  下週
                </button>
              </div>
            </div>
            <input
              id="modal-deadline-input"
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white transition-all"
            />
          </div>

          {/* 4. 作業內容與備註說明 (簡化單一欄位) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              作業說明 / 題目規範 (選填)
            </label>
            <textarea
              id="modal-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="填寫題號範圍、評分要求、上課筆記或注意事項..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white resize-none transition-all"
            />
          </div>

          {/* 5. 優先級 (直覺晶片式單選按鈕) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              優先級
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  priority === 'high'
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🔥</span>
                <span>高優先</span>
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  priority === 'medium'
                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>⚡</span>
                <span>中等</span>
              </button>
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  priority === 'low'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🌱</span>
                <span>低優先</span>
              </button>
            </div>
          </div>

          {/* 6. 目前狀態 (編輯時快速切換) */}
          {initialData && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                目前狀態
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(['todo', 'in_progress', 'completed', 'submitted'] as AssignmentStatus[]).map((st) => {
                  const labels: Record<AssignmentStatus, string> = {
                    todo: '待辦',
                    in_progress: '進行中',
                    completed: '已完成',
                    submitted: '已繳交',
                  };
                  const isCur = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-1.5 rounded-lg font-medium border text-center transition-all cursor-pointer ${
                        isCur
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {labels[st]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. 進階選項折疊區塊 (不干擾一般操作，需要時展開) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1 transition-colors cursor-pointer"
            >
              <span>進階設定 (繳交方式、步驟清單、參考連結)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                {/* 繳交方式 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    繳交方式
                  </label>
                  <select
                    value={submissionType}
                    onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    {Object.entries(SUBMISSION_LABELS).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 步驟拆解清單 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    步驟拆解清單 (Checklist)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      placeholder="輸入子步驟..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-medium rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      加入
                    </button>
                  </div>
                  {subtasks.length > 0 && (
                    <div className="space-y-1">
                      {subtasks.map((st, idx) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700 text-xs"
                        >
                          <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                          <span className="flex-1 text-slate-800 dark:text-slate-200">{st.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 外部連結 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-blue-500" />
                      參考連結附件
                    </label>
                    {!showAddAttachment && (
                      <button
                        type="button"
                        onClick={() => setShowAddAttachment(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        新增連結
                      </button>
                    )}
                  </div>
                  {showAddAttachment && (
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mb-2">
                      <input
                        type="text"
                        placeholder="附件名稱 (例如：第四章講義筆記)"
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      />
                      <input
                        type="url"
                        placeholder="網址 (例如：https://...)"
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddAttachment(false)}
                          className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          className="px-2.5 py-0.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                        >
                          加入
                        </button>
                      </div>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{att.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                            className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
            >
              取消
            </button>
            <button
              id="modal-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 btn-press cursor-pointer"
            >
              {initialData ? '儲存變更' : '確認新增作業'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
