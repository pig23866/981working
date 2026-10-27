import React from 'react';
import { Assignment, Subject, AssignmentStatus, AssignmentProgress, UserRole } from '../types';
import { STATUS_LABELS } from '../lib/constants';
import { AssignmentCard } from './AssignmentCard';
import { Plus } from 'lucide-react';

interface BoardViewProps {
  assignments: Assignment[];
  subjects: Subject[];
  userProgressMap?: Map<string, AssignmentProgress>;
  currentUserRole?: UserRole;
  completedCountMap?: Record<string, number>;
  totalStudentsCount?: number;
  onOpenProgressModal?: (assignment: Assignment) => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AssignmentStatus) => void;
  onToggleSubtask: (assignmentId: string, subtaskId: string) => void;
  onAddNewWithStatus?: (status: AssignmentStatus) => void;
}

const COLUMNS: { status: AssignmentStatus; label: string; headerBg: string; border: string }[] = [
  { status: 'todo', label: '待辦作業 (未開始)', headerBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
  { status: 'in_progress', label: '進行中 (處理中)', headerBg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/50' },
  { status: 'completed', label: '已完成 (待送出)', headerBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/50' },
  { status: 'submitted', label: '已繳交 (完成存檔)', headerBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-900/50' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  assignments,
  subjects,
  userProgressMap,
  currentUserRole,
  completedCountMap,
  totalStudentsCount,
  onOpenProgressModal,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  onAddNewWithStatus,
}) => {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colAssignments = assignments.filter((a) => {
          const personalStatus = userProgressMap?.get(a.id)?.status || 'todo';
          return personalStatus === col.status;
        });

        return (
          <div
            key={col.status}
            id={`board-column-${col.status}`}
            className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${col.headerBg}`}>
                  {col.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{colAssignments.length}</span>
              </div>

              {onAddNewWithStatus && (
                <button
                  type="button"
                  onClick={() => onAddNewWithStatus(col.status)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="在此欄位新增作業"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {colAssignments.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-xs">
                  目前沒有此狀態之作業
                </div>
              ) : (
                colAssignments.map((asg) => (
                  <AssignmentCard
                    key={asg.id}
                    assignment={asg}
                    subject={subjectMap.get(asg.subjectId)}
                    userProgress={userProgressMap?.get(asg.id)}
                    currentUserRole={currentUserRole}
                    completedCount={completedCountMap ? completedCountMap[asg.id] : undefined}
                    totalStudentsCount={totalStudentsCount}
                    onOpenProgressModal={onOpenProgressModal ? () => onOpenProgressModal(asg) : undefined}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onToggleSubtask={onToggleSubtask}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
