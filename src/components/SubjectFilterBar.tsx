import React from 'react';
import {
  List,
  Kanban,
  Calendar as CalendarIcon,
  PieChart,
  CalendarDays,
  Search,
  ArrowUpDown,
  X,
  BookOpen,
} from 'lucide-react';
import { Subject, ViewMode } from '../types';

interface SubjectFilterBarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'all' | 'pending' | 'done';
  onStatusFilterChange: (s: 'all' | 'pending' | 'done') => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  sortBy: 'deadline' | 'priority' | 'subject';
  onSortByChange: (s: 'deadline' | 'priority' | 'subject') => void;
  subjectCounts: Record<string, number>;
  totalCount: number;
}

export const SubjectFilterBar: React.FC<SubjectFilterBarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  subjectCounts,
  totalCount,
}) => {
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="mb-6 space-y-3">
      {/* Top Filter and Controls Bar - Multi-platform responsive */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        {/* Left Side: Search & Subject Dropdown Menu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="assignment-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜尋作業名稱、說明內容..."
              className="w-full pl-9 pr-8 py-2.5 sm:py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                title="清除搜尋"
              >
                ✕
              </button>
            )}
          </div>

          {/* Subject Dropdown Menu (將科目選擇用成下拉選單) */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="relative inline-flex items-center w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <select
                id="subject-dropdown-select"
                value={selectedSubjectId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onSelectSubject(val ? val : null);
                }}
                className={`w-full sm:w-auto pl-8 pr-8 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer appearance-none bg-no-repeat bg-[right_0.65rem_center] bg-[length:1em_1em] ${
                  selectedSubjectId
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/10'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/70 dark:hover:bg-slate-700/60'
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                }}
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  全部課程 ({totalCount} 筆作業)
                </option>
                <optgroup label="各課程清單" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {subjects.map((subj) => {
                    const count = subjectCounts[subj.id] || 0;
                    return (
                      <option key={subj.id} value={subj.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {subj.name} ({subj.code}) • {count} 筆
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            {/* Clear Subject Filter Tag if selected */}
            {selectedSubjectId && selectedSubject && (
              <button
                type="button"
                onClick={() => onSelectSubject(null)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                title="重設為全部課程"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedSubject.color }}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSubject.name}</span>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Status Tabs, Sort Dropdown & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Tabs */}
            <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex-1 sm:flex-initial justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => onStatusFilterChange('all')}
                className={`btn-press flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer text-center ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                全部 ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('pending')}
                className={`btn-press flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer text-center ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                待繳交
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('done')}
                className={`btn-press flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer text-center ${
                  statusFilter === 'done'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                已完成
              </button>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="assignment-sort-select"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="text-xs bg-transparent border-0 text-slate-700 dark:text-slate-200 font-medium py-1.5 pr-6 pl-1 rounded-lg focus:ring-0 cursor-pointer transition-colors duration-150"
              >
                <option value="deadline" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">期限排序</option>
                <option value="priority" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">優先等級</option>
                <option value="subject" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">課程名稱</option>
              </select>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60 justify-around sm:justify-start">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`btn-press p-1.5 sm:p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="清單檢視"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              className={`btn-press p-1.5 sm:p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="看板檢視"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              className={`btn-press p-1.5 sm:p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="行事曆檢視"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('schedule')}
              className={`btn-press p-1.5 sm:p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                viewMode === 'schedule'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="全週課表系統"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('subjects')}
              className={`btn-press p-1.5 sm:p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                viewMode === 'subjects'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs ring-1 ring-blue-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="課程統計面板"
            >
              <PieChart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
