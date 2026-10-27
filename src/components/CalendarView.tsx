import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Assignment, Subject } from '../types';
import { getUrgencyInfo } from '../lib/dateUtils';

interface CalendarViewProps {
  assignments: Assignment[];
  subjects: Subject[];
  onSelectAssignment: (asg: Assignment) => void;
  onAddNewForDate?: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  assignments,
  subjects,
  onSelectAssignment,
  onAddNewForDate,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  const assignmentsByDate = new Map<string, Assignment[]>();
  assignments.forEach((asg) => {
    try {
      const d = new Date(asg.deadline);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
        .getDate()
        .toString()
        .padStart(2, '0')}`;
      if (!assignmentsByDate.has(key)) {
        assignmentsByDate.set(key, []);
      }
      assignmentsByDate.get(key)!.push(asg);
    } catch {
      // Ignore invalid date
    }
  });

  const todayStr = `${new Date().getFullYear()}-${(new Date().getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`;

  return (
    <div id="calendar-view" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-6 transition-colors">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {year} 年 {month + 1} 月 作業繳交行事曆
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg btn-press cursor-pointer"
          >
            返回今天
          </button>
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded btn-press cursor-pointer"
              title="上個月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded btn-press cursor-pointer"
              title="下個月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((day, idx) => (
          <div
            key={day}
            className={`text-xs font-semibold py-1.5 ${
              idx === 0 || idx === 6 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Leading empty cells */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] p-1 bg-slate-50/40 dark:bg-slate-800/20 rounded-xl border border-slate-100/60 dark:border-slate-800/40 opacity-40" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum
            .toString()
            .padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const dayAssignments = assignmentsByDate.get(dateStr) || [];

          return (
            <div
              key={dateStr}
              className={`min-h-[90px] sm:min-h-[110px] p-1.5 rounded-xl border transition-all flex flex-col justify-between group ${
                isToday
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/40 ring-1 ring-blue-300 dark:ring-blue-700'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dayNum}
                </span>

                {onAddNewForDate && (
                  <button
                    type="button"
                    onClick={() => onAddNewForDate(dateStr)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-opacity cursor-pointer"
                    title="在該日新增作業"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Assignments on this day */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                {dayAssignments.map((asg) => {
                  const subj = subjectMap.get(asg.subjectId);
                  const urgency = getUrgencyInfo(asg.deadline, asg.status);
                  const isOverdue = urgency.level === 'overdue';
                  const isDone = asg.status === 'completed' || asg.status === 'submitted';

                  return (
                    <div
                      key={asg.id}
                      onClick={() => onSelectAssignment(asg)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer btn-press border ${
                        isDone
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 line-through'
                          : isOverdue
                          ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 font-bold'
                          : `${subj?.badgeBg || 'bg-blue-50 text-blue-800'} ${
                              subj?.badgeBorder || 'border-blue-200'
                            }`
                      }`}
                      title={`${asg.title} (${subj?.name}) - 期限: ${asg.deadline}`}
                    >
                      <span className="mr-1">{subj?.code || '作業'}:</span>
                      <span>{asg.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
