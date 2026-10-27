import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  Edit2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { CourseEntry, SchedulePeriod } from '../types';
import {
  SCHEDULE_PERIODS,
  SCHEDULE_HEADER_INFO,
  resetStoredSchedule,
} from '../lib/scheduleData';

interface WeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseEntry[];
  onSaveCourses: (courses: CourseEntry[]) => void;
  onQuickAddAssignment: (courseName: string, classroom: string, teacher: string) => void;
}

const DAYS = [
  { day: 1, label: '星期一', dateStr: '09/07' },
  { day: 2, label: '星期二', dateStr: '09/08' },
  { day: 3, label: '星期三', dateStr: '09/09' },
  { day: 4, label: '星期四', dateStr: '09/10' },
  { day: 5, label: '星期五', dateStr: '09/11' },
];

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({
  isOpen,
  onClose,
  courses,
  onSaveCourses,
  onQuickAddAssignment,
}) => {
  // Mobile day tab filter
  const [activeMobileDay, setActiveMobileDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 5 ? d : 1;
  });

  // Cell selection for detail popover / quick action
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Edit mode for custom course alteration
  const [isEditing, setIsEditing] = useState(false);
  const [editingForm, setEditingForm] = useState<{
    courseName: string;
    teacher: string;
    classroom: string;
  }>({ courseName: '', teacher: '', classroom: '' });

  if (!isOpen) return null;

  // Determine current day & period for active highlight
  const now = new Date();
  const currentJsDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const handleCopyLocation = (loc: string) => {
    navigator.clipboard.writeText(loc);
    setCopiedText(loc);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleStartEdit = (course: CourseEntry) => {
    setSelectedCourse(course);
    setEditingForm({
      courseName: course.courseName,
      teacher: course.teacher,
      classroom: course.classroom,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    const updated = courses.map((c) =>
      c.id === selectedCourse.id
        ? {
            ...c,
            courseName: editingForm.courseName.trim(),
            teacher: editingForm.teacher.trim(),
            classroom: editingForm.classroom.trim(),
          }
        : c
    );

    onSaveCourses(updated);
    setIsEditing(false);
    setSelectedCourse(null);
  };

  const handleResetToDefault = () => {
    if (window.confirm('確定要將課表恢復為預設標準課表？')) {
      const reset = resetStoredSchedule();
      onSaveCourses(reset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs modal-backdrop">
      <div
        id="weekly-schedule-modal"
        className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] modal-panel"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-md">
                {SCHEDULE_HEADER_INFO.school}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {SCHEDULE_HEADER_INFO.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              班級：<b>{SCHEDULE_HEADER_INFO.classUnit}</b> • 導師：<b>{SCHEDULE_HEADER_INFO.advisor}</b> (Office Hour: {SCHEDULE_HEADER_INFO.officeHours})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg btn-press cursor-pointer flex items-center gap-1"
              title="重設為原始預設課表"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">恢復預設課表</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Day Selector Tabs */}
        <div className="md:hidden flex items-center overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 gap-1">
          {DAYS.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => setActiveMobileDay(d.day)}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg whitespace-nowrap btn-press ${
                activeMobileDay === d.day
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Modal Body: The Table */}
        <div className="flex-1 overflow-auto p-3 sm:p-5">
          {/* Desktop & Tablet Full Table */}
          <div className="min-w-[760px] border border-slate-300 dark:border-slate-750 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border-b border-slate-300 dark:border-slate-700">
                  <th className="py-2.5 px-2 w-28 border-r border-slate-300 dark:border-slate-700">節次 / 時間</th>
                  <th className="py-2.5 px-2 w-14 border-r border-slate-300 dark:border-slate-700">項目</th>
                  {DAYS.map((d) => {
                    const isCurrentDay = currentJsDay === d.day;
                    return (
                      <th
                        key={d.day}
                        className={`py-2.5 px-3 border-r last:border-r-0 border-slate-300 dark:border-slate-700 ${
                          isCurrentDay ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 ring-1 ring-blue-400 inset-0' : ''
                        }`}
                      >
                        <div className="font-extrabold text-sm">{d.label}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-normal">
                          {d.dateStr}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {SCHEDULE_PERIODS.map((period) => {
                  const isCurrentTimePeriod =
                    currentMinutes >= period.startMinutes && currentMinutes < period.endMinutes;

                  return (
                    <tr
                      key={period.period}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        period.period === 4 ? 'border-b-2 border-slate-300 dark:border-slate-700' : ''
                      } ${period.period === 8 ? 'border-b-2 border-slate-300 dark:border-slate-700' : ''}`}
                    >
                      {/* Period & Time */}
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-medium">
                        <div className="font-bold text-slate-800 dark:text-white text-xs">{period.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {period.startTime} ~ {period.endTime}
                        </div>
                      </td>

                      {/* Item Labels */}
                      <td className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] text-slate-400 font-medium leading-snug">
                        課目<br />教師<br />教室
                      </td>

                      {/* Course cells for Day 1 ~ Day 5 */}
                      {DAYS.map((d) => {
                        const course = courses.find(
                          (c) => c.dayOfWeek === d.day && c.period === period.period
                        );
                        const isCellActiveNow = currentJsDay === d.day && isCurrentTimePeriod;

                        if (!course) {
                          return (
                            <td
                              key={d.day}
                              className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 text-[11px]"
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={d.day}
                            onClick={() => setSelectedCourse(course)}
                            className={`p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 cursor-pointer transition-all relative group ${
                              isCellActiveNow
                                ? 'bg-amber-100/70 dark:bg-amber-950/60 ring-2 ring-amber-400'
                                : currentJsDay === d.day
                                ? 'bg-blue-50/30 dark:bg-blue-950/30 hover:bg-blue-100/50 dark:hover:bg-blue-900/40'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            {isCellActiveNow && (
                              <span className="absolute -top-1.5 right-1 px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-extrabold shadow-2xs animate-pulse">
                                現正上課
                              </span>
                            )}

                            <div className="font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {course.courseName}
                            </div>

                            {course.teacher && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{course.teacher}</span>
                              </div>
                            )}

                            {course.classroom && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
                                <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[110px]">{course.classroom}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Footnote from official sheet */}
          <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">官方課表備註說明：</p>
              <p>1. 導師：周韻寰 | officehour：星期二第5、6節 | 地點：資訊系館</p>
              <p>2. (九)、(十)、(十一) 節之指揮官運用時間依隊職官發布之操課規定與內務安排為準。</p>
              <p>3. 點選任一課表欄位，可快速登記該門課的作業、複製教室地點或編輯課堂資料。</p>
            </div>
          </div>
        </div>

        {/* Selected Course Quick Action Drawer / Dialog */}
        {selectedCourse && (
          <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                週{DAYS.find((d) => d.day === selectedCourse.dayOfWeek)?.label.slice(2)}
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                  {selectedCourse.courseName}
                  <span className="text-xs font-normal text-slate-400">
                    (第 {selectedCourse.period} 節)
                  </span>
                </h4>
                <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    {selectedCourse.teacher || '學校安排'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {selectedCourse.classroom}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy Classroom */}
              <button
                type="button"
                onClick={() => handleCopyLocation(selectedCourse.classroom)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedText === selectedCourse.classroom ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已複製教室</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>複製教室地點</span>
                  </>
                )}
              </button>

              {/* Edit Course */}
              <button
                type="button"
                onClick={() => handleStartEdit(selectedCourse)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>編輯內容</span>
              </button>

              {/* Quick Add Assignment for this course */}
              <button
                type="button"
                onClick={() => {
                  onQuickAddAssignment(
                    selectedCourse.courseName,
                    selectedCourse.classroom,
                    selectedCourse.teacher
                  );
                  setSelectedCourse(null);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>登記這門課作業</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Edit Form Modal Overlay if user edits a course */}
        {isEditing && selectedCourse && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs modal-backdrop">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 modal-panel">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3">編輯課堂資訊</h4>
              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">課目名稱</label>
                  <input
                    type="text"
                    required
                    value={editingForm.courseName}
                    onChange={(e) => setEditingForm({ ...editingForm, courseName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">授課教師 / 隊職官</label>
                  <input
                    type="text"
                    value={editingForm.teacher}
                    onChange={(e) => setEditingForm({ ...editingForm, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">上課教室 / 地點</label>
                  <input
                    type="text"
                    required
                    value={editingForm.classroom}
                    onChange={(e) => setEditingForm({ ...editingForm, classroom: e.target.value })}
                    placeholder="例如：資訊系302教室、操場"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-press cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl btn-press cursor-pointer"
                  >
                    儲存更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
