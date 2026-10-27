import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  Paperclip,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckSquare,
  Square,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Assignment, Subject, AssignmentStatus, AssignmentProgress, UserRole } from '../types';
import { getUrgencyInfo, formatDateTimeDisplay } from '../lib/dateUtils';
import { PRIORITY_LABELS, SUBMISSION_LABELS, STATUS_LABELS } from '../lib/constants';
import { playChime } from '../lib/notifications';

interface AssignmentCardProps {
  assignment: Assignment;
  subject?: Subject;
  userProgress?: AssignmentProgress;
  currentUserRole?: UserRole;
  completedCount?: number;
  totalStudentsCount?: number;
  onOpenProgressModal?: () => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AssignmentStatus) => void;
  onToggleSubtask: (assignmentId: string, subtaskId: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  subject,
  userProgress,
  currentUserRole,
  completedCount,
  totalStudentsCount,
  onOpenProgressModal,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Effective status is based on personal progress if available, otherwise default to 'todo'
  const currentStatus: AssignmentStatus = userProgress?.status || 'todo';
  const isAdmin = currentUserRole === 'admin';

  const urgency = getUrgencyInfo(assignment.deadline, currentStatus);
  const priorityInfo = PRIORITY_LABELS[assignment.priority];
  const submissionInfo = SUBMISSION_LABELS[assignment.submissionType] || SUBMISSION_LABELS.other;
  const statusInfo = STATUS_LABELS[currentStatus];

  const totalSubtasks = assignment.subtasks.length;
  const completedSubtasks = assignment.subtasks.filter((st) => st.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleStatusClick = (newStatus: AssignmentStatus) => {
    if (newStatus === 'completed' || newStatus === 'submitted') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      playChime('success');
    }
    onStatusChange(assignment.id, newStatus);
  };

  const isUrgent = urgency.level === 'overdue' || urgency.level === 'today';
  const isDone = currentStatus === 'completed' || currentStatus === 'submitted';
  const attachments = assignment.attachments || assignment.driveAttachments || [];

  return (
    <div
      id={`assignment-card-${assignment.id}`}
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border card-lift ${
        isUrgent
          ? 'border-red-300 dark:border-red-900/70 ring-1 ring-red-200/60 dark:ring-red-900/30'
          : isDone
          ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-slate-50/40 dark:bg-slate-900/50'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header Row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* Subject Badge & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            {subject && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors duration-200 ${subject.badgeBg} ${subject.badgeBorder}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors duration-200 ${priorityInfo.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
              {priorityInfo.label}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md transition-colors duration-200">
              <GraduationCap className="w-3 h-3" />
              {submissionInfo.label}
            </span>
          </div>

          {/* Right Menu Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="btn-press p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(assignment);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  編輯作業
                </button>
                <hr className="my-1 border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(assignment.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2 cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  刪除作業
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className={`text-base font-bold text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
            isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}
          onClick={() => onEdit(assignment)}
        >
          {assignment.title}
        </h3>

        {/* Description */}
        {assignment.description && (
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {assignment.description}
          </p>
        )}

        {/* Deadline & Urgency Reminder Row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${urgency.bgClass} ${urgency.colorClass} ${urgency.borderClass}`}
            >
              {urgency.level === 'overdue' ? (
                <AlertCircle className="w-3.5 h-3.5 animate-bounce" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>{urgency.timeRemainingText}</span>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDateTimeDisplay(assignment.deadline)}
            </span>

            {/* Admin only: completion count button to open student list modal */}
            {isAdmin && onOpenProgressModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProgressModal();
                }}
                className="btn-press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all cursor-pointer shadow-2xs"
                title="點擊查看全班學員完成進度名單"
              >
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>
                  已完成 {completedCount ?? 0} / {totalStudentsCount ?? 0} 人
                </span>
              </button>
            )}
          </div>

          {/* Status Quick Button */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() =>
                handleStatusClick(
                  currentStatus === 'submitted'
                    ? 'todo'
                    : currentStatus === 'completed'
                    ? 'submitted'
                    : currentStatus === 'in_progress'
                    ? 'completed'
                    : 'in_progress'
                )
              }
              className={`btn-press px-2 py-0.5 rounded-md font-medium transition-all duration-200 ${statusInfo.badge} cursor-pointer`}
              title="點擊切換個人狀態"
            >
              {statusInfo.label}
            </button>
          </div>
        </div>

        {/* Subtasks Progress & Interactive Checklist */}
        {totalSubtasks > 0 && (
          <div className="mt-3 bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors duration-200">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
              <span className="font-medium flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                步驟清單 ({completedSubtasks}/{totalSubtasks})
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 transition-colors duration-200">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Subtask items toggle */}
            <div className="mt-2 space-y-1">
              {assignment.subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask(assignment.id, st.id)}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer py-0.5 select-none transition-all duration-150 hover:translate-x-0.5"
                >
                  {st.isCompleted ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-150 scale-105" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150" />
                  )}
                  <span className={`transition-all duration-200 ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mr-1">
              <Paperclip className="w-3 h-3 text-slate-400" />
              附件:
            </span>
            {attachments.map((file) => (
              <a
                key={file.id}
                href={file.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="btn-press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all duration-150 shadow-2xs group/link"
              >
                <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="max-w-[160px] truncate">{file.name}</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/link:text-slate-600 dark:group-hover/link:text-slate-200" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Quick Status Bar on Bottom */}
      <div className="px-4 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="text-[11px]">預估時長: {assignment.estimatedMinutes ? `${assignment.estimatedMinutes} 分鐘` : '未設定'}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStatusClick('todo')}
            className={`btn-press px-2 py-0.5 rounded text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer ${
              currentStatus === 'todo' ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-400'
            }`}
          >
            待辦
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('in_progress')}
            className={`btn-press px-2 py-0.5 rounded text-[11px] hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-150 cursor-pointer ${
              currentStatus === 'in_progress' ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-400'
            }`}
          >
            進行中
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('completed')}
            className={`btn-press px-2 py-0.5 rounded text-[11px] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-150 cursor-pointer ${
              currentStatus === 'completed' ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'text-slate-400'
            }`}
          >
            完成
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('submitted')}
            className={`btn-press px-2 py-0.5 rounded text-[11px] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all duration-150 cursor-pointer ${
              currentStatus === 'submitted' ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-slate-400'
            }`}
          >
            已繳交
          </button>
        </div>
      </div>
    </div>
  );
};
