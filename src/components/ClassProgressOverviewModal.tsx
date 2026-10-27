import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Assignment, AppUser, AssignmentProgress, Subject, AssignmentStatus } from '../types';
import { formatDateTimeDisplay, isDatePast } from '../lib/dateUtils';

interface ClassProgressOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
  students: AppUser[];
  progressList: AssignmentProgress[];
  subjects: Subject[];
  onToggleStudentStatus: (
    assignmentId: string,
    student: AppUser,
    newStatus: AssignmentStatus
  ) => Promise<void> | void;
}

export const ClassProgressOverviewModal: React.FC<ClassProgressOverviewModalProps> = ({
  isOpen,
  onClose,
  assignments,
  students,
  progressList,
  subjects,
  onToggleStudentStatus,
}) => {
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [updatingCellKey, setUpdatingCellKey] = useState<string | null>(null);

  // Filter only regular students (role === 'user')
  const studentList = useMemo(() => {
    return students.filter((u) => u.role === 'user');
  }, [students]);

  // Filter assignments by subject
  const filteredAssignments = useMemo(() => {
    if (selectedSubjectId === 'all') return assignments;
    return assignments.filter((a) => a.subjectId === selectedSubjectId);
  }, [assignments, selectedSubjectId]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return studentList;
    const q = searchStudent.toLowerCase().trim();
    return studentList.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q)
    );
  }, [studentList, searchStudent]);

  // Lookup map: `${assignmentId}_${username.toLowerCase()}` -> AssignmentProgress
  const progressMap = useMemo(() => {
    const map = new Map<string, AssignmentProgress>();
    progressList.forEach((p) => {
      map.set(`${p.assignmentId}_${p.username.toLowerCase()}`, p);
    });
    return map;
  }, [progressList]);

  // Subject Map for fast lookup
  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalStudents = studentList.length;
    const totalAssignments = assignments.length;
    const totalSlots = totalStudents * totalAssignments;

    if (totalSlots === 0) {
      return { totalStudents, totalAssignments, totalCompleted: 0, overallRate: 0, pendingSlots: 0 };
    }

    let completedSlots = 0;
    assignments.forEach((asg) => {
      studentList.forEach((st) => {
        const key = `${asg.id}_${st.username.toLowerCase()}`;
        const p = progressMap.get(key);
        if (p?.status === 'completed' || p?.status === 'submitted') {
          completedSlots++;
        }
      });
    });

    const overallRate = Math.round((completedSlots / totalSlots) * 100);
    const pendingSlots = totalSlots - completedSlots;

    return {
      totalStudents,
      totalAssignments,
      totalCompleted: completedSlots,
      overallRate,
      pendingSlots,
    };
  }, [studentList, assignments, progressMap]);

  // Export to CSV feature
  const handleExportCSV = () => {
    if (studentList.length === 0 || assignments.length === 0) return;

    const headers = ['學號', '學員姓名', '個人完成率(%)', ...assignments.map((a) => `"${a.title.replace(/"/g, '""')}"`)];
    const rows = studentList.map((st) => {
      let stDone = 0;
      const statusCells = assignments.map((asg) => {
        const key = `${asg.id}_${st.username.toLowerCase()}`;
        const p = progressMap.get(key);
        const isDone = p?.status === 'completed' || p?.status === 'submitted';
        if (isDone) {
          stDone++;
          return '已完成';
        }
        if (p?.status === 'in_progress') return '進行中';
        return isDatePast(asg.deadline) ? '逾期未繳' : '待繳交';
      });

      const stRate = assignments.length > 0 ? Math.round((stDone / assignments.length) * 100) : 0;
      return [st.username, `"${st.displayName}"`, stRate, ...statusCells].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `全班作業繳交進度總表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCellClick = async (asg: Assignment, st: AppUser) => {
    const key = `${asg.id}_${st.username.toLowerCase()}`;
    const p = progressMap.get(key);
    const isDone = p?.status === 'completed' || p?.status === 'submitted';
    const nextStatus: AssignmentStatus = isDone ? 'todo' : 'completed';

    setUpdatingCellKey(key);
    try {
      await onToggleStudentStatus(asg.id, st, nextStatus);
    } finally {
      setUpdatingCellKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs modal-backdrop">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden modal-panel"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                  <Users className="w-3.5 h-3.5" />
                  管理員專屬 • 全班繳交進度矩陣
                </span>
                <span className="text-xs text-slate-400 font-medium">即時雲端連線</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                全班作業繳交進度總表
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

          {/* Metrics summary cards */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">全班學員人數</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {stats.totalStudents} <span className="text-xs font-normal text-slate-400">人</span>
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">目前作業項目</span>
              <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
                {stats.totalAssignments} <span className="text-xs font-normal text-slate-400">項</span>
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">全班總繳交率</span>
              <span
                className={`text-lg sm:text-xl font-black ${
                  stats.overallRate >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stats.overallRate >= 50
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {stats.overallRate}%
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">未繳交人次</span>
              <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {stats.pendingSlots} <span className="text-xs font-normal text-slate-400">次</span>
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Filters, Search, Export */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">全部科目 ({assignments.length} 項作業)</option>
                {subjects.map((sub) => {
                  const cnt = assignments.filter((a) => a.subjectId === sub.id).length;
                  return (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({cnt} 項)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Student Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="過濾學員姓名或學號..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 btn-press cursor-pointer"
              title="匯出為 CSV 試算表"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>匯出 CSV</span>
            </button>
          </div>
        </div>

        {/* Matrix Spreadsheet Table */}
        <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-900/40">
          {filteredAssignments.length === 0 || filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">目前無符合條件的作業或學員資料</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-20 shadow-2xs">
                    {/* Sticky Left Header: Student Info */}
                    <th
                      scope="col"
                      className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[200px] border-r border-slate-200 dark:border-slate-700"
                    >
                      學員名單 ({filteredStudents.length} 人)
                    </th>
                    {/* Assignment Column Headers */}
                    {filteredAssignments.map((asg) => {
                      const sub = subjectMap.get(asg.subjectId);
                      // Calculate completed count for this assignment
                      let comp = 0;
                      studentList.forEach((st) => {
                        const key = `${asg.id}_${st.username.toLowerCase()}`;
                        const p = progressMap.get(key);
                        if (p?.status === 'completed' || p?.status === 'submitted') comp++;
                      });
                      const rate = studentList.length > 0 ? Math.round((comp / studentList.length) * 100) : 0;

                      return (
                        <th
                          key={asg.id}
                          scope="col"
                          className="px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[170px] max-w-[200px] border-r border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {sub && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: sub.color }}
                              />
                            )}
                            <span className="truncate text-xs font-bold" title={asg.title}>
                              {asg.title}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal">
                            <span>截止: {asg.deadline.slice(5, 10)}</span>
                            <span
                              className={`font-mono font-bold ${
                                rate === 100
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {comp}/{studentList.length} ({rate}%)
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredStudents.map((st) => {
                    // Calculate personal completion rate
                    let stDone = 0;
                    filteredAssignments.forEach((asg) => {
                      const key = `${asg.id}_${st.username.toLowerCase()}`;
                      const p = progressMap.get(key);
                      if (p?.status === 'completed' || p?.status === 'submitted') stDone++;
                    });
                    const personalRate =
                      filteredAssignments.length > 0
                        ? Math.round((stDone / filteredAssignments.length) * 100)
                        : 0;

                    return (
                      <tr
                        key={st.username}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Sticky Left: Student Name, ID and personal progress bar */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 px-4 py-2.5 border-r border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {st.displayName}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {st.username}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-[11px] font-black font-mono ${
                                  personalRate === 100
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : personalRate >= 50
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {personalRate}%
                              </span>
                              <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    personalRate === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${personalRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Assignment Progress Cells */}
                        {filteredAssignments.map((asg) => {
                          const key = `${asg.id}_${st.username.toLowerCase()}`;
                          const prog = progressMap.get(key);
                          const isDone = prog?.status === 'completed' || prog?.status === 'submitted';
                          const isPast = isDatePast(asg.deadline);
                          const isUpdating = updatingCellKey === key;

                          return (
                            <td
                              key={asg.id}
                              className="px-3 py-2 text-center border-r border-slate-100 dark:border-slate-800 select-none"
                            >
                              <button
                                type="button"
                                onClick={() => handleCellClick(asg, st)}
                                disabled={isUpdating}
                                className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 btn-press cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300'
                                    : prog?.status === 'in_progress'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : isPast
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                    : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-200/80'
                                }`}
                                title={`點擊切換作業「${asg.title}」之完成狀態`}
                              >
                                {isUpdating ? (
                                  <Clock className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                ) : isDone ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>已完成</span>
                                  </>
                                ) : prog?.status === 'in_progress' ? (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>進行中</span>
                                  </>
                                ) : isPast ? (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                    <span>逾期未繳</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">待完成</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> 已完成
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> 逾期未繳
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> 待繳交
            </span>
            <span className="hidden sm:inline text-slate-400 font-light">
              • 點擊表格內任意學員格子可即時切換完成狀態
            </span>
          </div>
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
