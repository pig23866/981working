import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  User,
  Calendar,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Plus,
  BookOpen,
  Coffee,
  Sun,
  Moon,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { CourseEntry, SchedulePeriod, CurrentClassStatus } from '../types';
import {
  SCHEDULE_PERIODS,
  SCHEDULE_HEADER_INFO,
  getCurrentClassStatus,
} from '../lib/scheduleData';

interface CurrentClassBannerProps {
  courses: CourseEntry[];
  onOpenFullSchedule: () => void;
  onQuickAddAssignment?: (courseName: string, classroom: string, teacher: string) => void;
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六', '日'];

export const CurrentClassBanner: React.FC<CurrentClassBannerProps> = ({
  courses,
  onOpenFullSchedule,
  onQuickAddAssignment,
}) => {
  // Live tick state
  const [liveTick, setLiveTick] = useState(0);

  // Time simulation state for testing & previewing different classes
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simDay, setSimDay] = useState<number>(1); // 1 = Mon
  const [simPeriod, setSimPeriod] = useState<number>(1); // 1 = Period 1

  // Periodic live update every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Compute status
  const currentStatus: CurrentClassStatus = React.useMemo(() => {
    if (simulationMode) {
      const p = SCHEDULE_PERIODS.find((sp) => sp.period === simPeriod) || SCHEDULE_PERIODS[0];
      // simulate at midpoint of the period
      const midMinutes = p.startMinutes + 15;
      return getCurrentClassStatus(courses, simDay, midMinutes);
    }
    return getCurrentClassStatus(courses);
  }, [courses, simulationMode, simDay, simPeriod, liveTick]);

  const {
    state,
    currentClass,
    currentPeriod,
    nextClass,
    nextPeriod,
    remainingMinutesInCurrent,
    minutesUntilNext,
    dayOfWeek,
  } = currentStatus;

  // Format today's date info
  const now = new Date();
  const dayName = DAY_NAMES[simulationMode ? simDay : dayOfWeek];
  const currentTimeDisplay = simulationMode
    ? `${currentPeriod?.startTime} ~ ${currentPeriod?.endTime} (預覽)`
    : `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div
      id="current-class-banner"
      className="mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-700/60 overflow-hidden relative"
    >
      {/* Background Decorative Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-700/80 relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              課堂即時動態
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              星期{dayName} • {currentTimeDisplay} • 追蹤現在與下節教室位置
            </p>
          </div>
        </div>

        {/* Action Controls & Simulator Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Quick Simulation / Preview Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-300 max-w-full">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] text-slate-400 shrink-0">時段：</span>
            <select
              value={simulationMode ? `${simDay}-${simPeriod}` : 'live'}
              onChange={(e) => {
                if (e.target.value === 'live') {
                  setSimulationMode(false);
                } else {
                  const [d, p] = e.target.value.split('-').map(Number);
                  setSimDay(d);
                  setSimPeriod(p);
                  setSimulationMode(true);
                }
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-hidden cursor-pointer max-w-[130px] sm:max-w-none truncate"
            >
              <option value="live" className="bg-slate-900 text-white">
                🔴 即時系統時間 (Live)
              </option>
              <optgroup label="週一 (數位電路 / 資訊安全 / 計算機程式)" className="bg-slate-900 text-white">
                <option value="1-1">週一 第1節 (08:00 數位電路設計)</option>
                <option value="1-4">週一 第4節 (11:10 資訊安全導論)</option>
                <option value="1-5">週一 第5節 (14:00 計算機程式)</option>
                <option value="1-7">週一 第7節 (16:00 體能活動)</option>
              </optgroup>
              <optgroup label="週二 (英文 / 資訊安全 / 計算機網路)" className="bg-slate-900 text-white">
                <option value="2-1">週二 第1節 (08:00 英文(三))</option>
                <option value="2-3">週二 第3節 (10:10 資訊安全導論)</option>
                <option value="2-5">週二 第5節 (14:00 計算機網路)</option>
                <option value="2-8">週二 第8節 (17:00 計算機程式)</option>
              </optgroup>
              <optgroup label="週三 (憲法與立國精神 / 自習 / 通識選修)" className="bg-slate-900 text-white">
                <option value="3-1">週三 第1節 (08:00 中華民國憲法)</option>
                <option value="3-4">週三 第4節 (11:10 自習時間)</option>
                <option value="3-5">週三 第5節 (14:00 通識選修)</option>
              </optgroup>
              <optgroup label="週四 (車輛原理 / 基本教練 / 裝備保養)" className="bg-slate-900 text-white">
                <option value="4-1">週四 第1節 (08:00 車輛原理)</option>
                <option value="4-5">週四 第5節 (14:00 基本教練)</option>
                <option value="4-8">週四 第8節 (17:00 裝備保養)</option>
              </optgroup>
              <optgroup label="週五 (軍事倫理學 / 體育 / 社團活動)" className="bg-slate-900 text-white">
                <option value="5-1">週五 第1節 (08:00 軍事倫理學)</option>
                <option value="5-3">週五 第3節 (10:10 體育課)</option>
                <option value="5-5">週五 第5節 (14:00 社團活動)</option>
              </optgroup>
            </select>
          </div>

          {/* Open Full Weekly Timetable Button */}
          <button
            id="banner-open-full-schedule-btn"
            type="button"
            onClick={onOpenFullSchedule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 btn-press cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>全週課表</span>
          </button>
        </div>
      </div>

      {/* Main Dual Cards Grid: CURRENT CLASS vs NEXT CLASS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* CARD 1: 現在甚麼課 在哪裡上課 */}
        <div
          id="current-class-card"
          className="bg-slate-800/90 hover:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-md flex flex-col justify-between card-lift"
        >
          <div>
            {/* Top Status Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                現在課堂 (CURRENT)
              </span>

              {state === 'in_class' && currentPeriod && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  第 {currentPeriod.period} 節課進行中
                </span>
              )}
              {state === 'in_break' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Coffee className="w-3 h-3" />
                  下課休息中
                </span>
              )}
              {state === 'before_school' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  晨間準備上課
                </span>
              )}
              {state === 'after_school' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  晚間自修/作息
                </span>
              )}
              {state === 'weekend' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  週末放假休閒
                </span>
              )}
            </div>

            {/* Course Title & Primary Info */}
            {state === 'in_class' && currentClass ? (
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {currentClass.courseName}
                </h3>

                {/* WHERE: Prominent Classroom Badge */}
                <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-5 h-5 font-bold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-emerald-300/80">上課地點 / 教室</span>
                    <span className="text-base sm:text-lg font-extrabold text-white truncate block">
                      {currentClass.classroom}
                    </span>
                  </div>
                </div>

                {/* Teacher & Period Details */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-slate-700/60 px-2.5 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>教官/教師：</span>
                    <span className="font-bold text-white">{currentClass.teacher || '學校安排'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-700/60 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>時間：</span>
                    <span className="font-semibold text-white">
                      {currentPeriod?.startTime} ~ {currentPeriod?.endTime}
                    </span>
                  </div>
                  {currentClass.category && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-[11px] text-slate-300">
                      {currentClass.category}
                    </span>
                  )}
                </div>

                {/* Progress & Countdown */}
                {remainingMinutesInCurrent !== undefined && (
                  <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/50 text-xs flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      距離下課還剩
                    </span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      約 {remainingMinutesInCurrent} 分鐘
                    </span>
                  </div>
                )}
              </div>
            ) : state === 'in_break' ? (
              <div className="space-y-3 py-2">
                <div className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-400" />
                  目前為下課休息時間
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  請把握時間稍作休息、整理隨堂講義筆記，並確認下一節上課教室。
                </p>
                {minutesUntilNext !== undefined && (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs flex items-center justify-between text-amber-200">
                    <span>距離下一節上課鈴響：</span>
                    <span className="font-extrabold text-amber-400 text-sm">
                      {minutesUntilNext} 分鐘
                    </span>
                  </div>
                )}
              </div>
            ) : state === 'before_school' ? (
              <div className="space-y-3 py-2">
                <div className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  早晨整備時段（尚未正式上課）
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  今日第一節課將於 08:00 開始，請確認攜帶教材筆記，提早出發至指定教室就位。
                </p>
                {minutesUntilNext !== undefined && (
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-xs flex items-center justify-between text-blue-200">
                    <span>距離第一節上課還剩：</span>
                    <span className="font-extrabold text-blue-400 text-sm">
                      約 {Math.floor(minutesUntilNext / 60) > 0 ? `${Math.floor(minutesUntilNext / 60)} 小時 ` : ''}
                      {minutesUntilNext % 60} 分鐘
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <div className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  本日正課已全部結束
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  19:00~21:50 為指揮官運用時間或晚自習。可妥善安排作業複習、預習明日課程進度。
                </p>
              </div>
            )}
          </div>

          {/* Bottom Card Quick Action */}
          {currentClass && onQuickAddAssignment && (
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">課堂作業隨手記：</span>
              <button
                type="button"
                onClick={() =>
                  onQuickAddAssignment(
                    currentClass.courseName,
                    currentClass.classroom,
                    currentClass.teacher
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 btn-press cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>登記這門課的新作業</span>
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: 下一節甚麼課 在哪裡上課 */}
        <div
          id="next-class-card"
          className="bg-slate-800/90 hover:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-md flex flex-col justify-between card-lift"
        >
          <div>
            {/* Top Status Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                下一節預告 (NEXT CLASS)
              </span>

              {nextPeriod && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  第 {nextPeriod.period} 節 ({nextPeriod.startTime})
                </span>
              )}
            </div>

            {/* Next Course Title & Info */}
            {nextClass ? (
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {nextClass.courseName}
                </h3>

                {/* WHERE: Prominent Classroom Badge */}
                <div className="bg-blue-950/60 border border-blue-500/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-5 h-5 font-bold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-blue-300/80">下一節上課地點 / 教室</span>
                    <span className="text-base sm:text-lg font-extrabold text-white truncate block">
                      {nextClass.classroom}
                    </span>
                  </div>
                </div>

                {/* Teacher & Period Details */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-slate-700/60 px-2.5 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>教官/教師：</span>
                    <span className="font-bold text-white">{nextClass.teacher || '學校安排'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-700/60 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>時間：</span>
                    <span className="font-semibold text-white">
                      {nextPeriod?.startTime} ~ {nextPeriod?.endTime}
                    </span>
                  </div>
                </div>

                {/* Location Change Notice if different from current */}
                {currentClass && currentClass.classroom !== nextClass.classroom && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      注意更換教室：需從 <b>{currentClass.classroom}</b> 移動至 <b>{nextClass.classroom}</b>，請提早出發！
                    </span>
                  </div>
                )}

                {/* Countdown to Next Class */}
                {minutesUntilNext !== undefined && (
                  <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/50 text-xs flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      距離上課尚餘
                    </span>
                    <span className="font-extrabold text-blue-400 text-sm">
                      約 {Math.floor(minutesUntilNext / 60) > 0 ? `${Math.floor(minutesUntilNext / 60)} 小時 ` : ''}
                      {minutesUntilNext % 60} 分鐘
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="text-base font-bold text-slate-200">
                  下一節無接續正課
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  今日後續已無常規排課，或已進入隊部自習時間。可查閱全週課表掌握明日課程安排。
                </p>
              </div>
            )}
          </div>

          {/* Bottom Card Quick Action */}
          {nextClass && onQuickAddAssignment && (
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">預先準備作業：</span>
              <button
                type="button"
                onClick={() =>
                  onQuickAddAssignment(
                    nextClass.courseName,
                    nextClass.classroom,
                    nextClass.teacher
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 btn-press cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>預記這門課作業</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
