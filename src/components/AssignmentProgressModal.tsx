import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  UserX,
  Users,
  Calendar,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { Assignment, AppUser, AssignmentProgress, AssignmentStatus } from '../types';
import { formatDateTimeDisplay, getUrgencyInfo } from '../lib/dateUtils';
import { STATUS_LABELS } from '../lib/constants';

interface AssignmentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  students: AppUser[];
  progressList: AssignmentProgress[];
  onToggleStudentStatus: (
    assignmentId: string,
    student: AppUser,
    newStatus: AssignmentStatus
  ) => Promise<void> | void;
}

export const AssignmentProgressModal: React.FC<AssignmentProgressModalProps> = ({
  isOpen,
  onClose,
  assignment,
  students,
  progressList,
  onToggleStudentStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'completed' | 'pending'>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Filter only student accounts (role === 'user') or include all non-admin
  const studentList = useMemo(() => {
    return students.filter((u) => u.role === 'user');
  }, [students]);

  // Map progress by lowercase username
  const studentProgressMap = useMemo(() => {
    if (!assignment) return new Map<string, AssignmentProgress>();
    const map = new Map<string, AssignmentProgress>();
    progressList
      .filter((p) => p.assignmentId === assignment.id)
      .forEach((p) => {
        map.set(p.username.toLowerCase(), p);
      });
    return map;
  }, [assignment, progressList]);

  // Compute counts
  const { completedStudents, pendingStudents } = useMemo(() => {
    const completed: AppUser[] = [];
    const pending: AppUser[] = [];

    studentList.forEach((st) => {
      const prog = studentProgressMap.get(st.username.toLowerCase());
      const isDone = prog?.status === 'completed' || prog?.status === 'submitted';
      if (isDone) {
        completed.push(st);
      } else {
        pending.push(st);
      }
    });

    return { completedStudents: completed, pendingStudents: pending };
  }, [studentList, studentProgressMap]);

  // Filtered students for display
  const displayStudents = useMemo(() => {
    let list: AppUser[] = [];
    if (filterTab === 'all') {
      list = studentList;
    } else if (filterTab === 'completed') {
      list = completedStudents;
    } else {
      list = pendingStudents;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (st) =>
          st.displayName.toLowerCase().includes(q) ||
          st.username.toLowerCase().includes(q)
      );
    }

    return list;
  }, [studentList, completedStudents, pendingStudents, filterTab, searchQuery]);

  if (!isOpen || !assignment) return null;

  const totalCount = studentList.length;
  const completedCount = completedStudents.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const urgency = getUrgencyInfo(assignment.deadline, assignment.status);

  const handleToggle = async (student: AppUser) => {
    const prog = studentProgressMap.get(student.username.toLowerCase());
    const isDone = prog?.status === 'completed' || prog?.status === 'submitted';
    const nextStatus: AssignmentStatus = isDone ? 'todo' : 'completed';

    setUpdatingUser(student.username);
    try {
      await onToggleStudentStatus(assignment.id, student, nextStatus);
    } finally {
      setUpdatingUser(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs modal-backdrop">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] modal-panel"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  <GraduationCap className="w-3.5 h-3.5" />
                  管理員專用檢視
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  截止：{formatDateTimeDisplay(assignment.deadline)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {assignment.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer shrink-0"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Completion Progress Bar & Summary */}
          <div className="mt-4 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>全班繳交進度</span>
                <span className="text-slate-400 font-normal">
                  (已完成 {completedCount} / 總共 {totalCount} 人)
                </span>
              </div>
              <span
                className={`font-black text-sm ${
                  percentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {percentage}%
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  percentage === 100
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg btn-press cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              全部 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={`px-3 py-1.5 rounded-lg btn-press cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              已完成 ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg btn-press cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              待繳交 ({pendingStudents.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名或學號..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
            />
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {displayStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">沒有符合條件的學員</p>
            </div>
          ) : (
            displayStudents.map((st) => {
              const prog = studentProgressMap.get(st.username.toLowerCase());
              const isDone = prog?.status === 'completed' || prog?.status === 'submitted';
              const isUpdating = updatingUser === st.username;

              return (
                <div
                  key={st.username}
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        st.username.slice(0, 2)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {st.displayName}
                        </p>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {st.username}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {isDone ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span>已完成</span>
                            {prog?.completedAt && (
                              <span className="text-slate-400 font-normal">
                                • {formatDateTimeDisplay(prog.completedAt)}
                              </span>
                            )}
                          </span>
                        ) : prog?.status === 'in_progress' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            進行中
                          </span>
                        ) : (
                          <span className="text-slate-400">尚未完成</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Admin Action Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(st)}
                    disabled={isUpdating}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border btn-press cursor-pointer shrink-0 ${
                      isDone
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40'
                    }`}
                    title={isDone ? '點擊取消完成標記' : '點擊手動標記為已完成'}
                  >
                    {isUpdating ? (
                      <Clock className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : isDone ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>已完成</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>設為完成</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
