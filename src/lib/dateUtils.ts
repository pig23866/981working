import { UrgencyInfo, UrgencyLevel, AssignmentStatus } from '../types';

export function getUrgencyInfo(deadlineStr: string, status: AssignmentStatus): UrgencyInfo {
  if (status === 'completed' || status === 'submitted') {
    return {
      level: 'done',
      label: status === 'submitted' ? '已繳交' : '已完成',
      diffHours: 0,
      diffDays: 0,
      timeRemainingText: status === 'submitted' ? '作業已送出' : '已完成任務',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
    };
  }

  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.floor(overdueHours / 24);
    let overdueText = '';
    if (overdueDays > 0) {
      overdueText = `已逾期 ${overdueDays} 天`;
    } else {
      overdueText = `已逾期 ${Math.max(1, Math.floor(overdueHours))} 小時`;
    }

    return {
      level: 'overdue',
      label: '已逾期',
      diffHours,
      diffDays,
      timeRemainingText: overdueText,
      colorClass: 'text-red-700',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
    };
  }

  // Today (within 24 hours and is today or <= 18h)
  const isSameDay = now.toDateString() === deadline.toDateString();
  if (isSameDay || diffHours <= 16) {
    const hours = Math.floor(diffHours);
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      level: 'today',
      label: '今日截止',
      diffHours,
      diffDays: 0,
      timeRemainingText: `倒數 ${hours} 小時 ${mins} 分鐘`,
      colorClass: 'text-amber-800',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-300',
    };
  }

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = tomorrow.toDateString() === deadline.toDateString();
  if (isTomorrow || diffHours <= 40) {
    return {
      level: 'tomorrow',
      label: '明日截止',
      diffHours,
      diffDays: 1,
      timeRemainingText: `剩餘約 ${Math.ceil(diffHours / 24)} 天 (${Math.round(diffHours)} 小時)`,
      colorClass: 'text-orange-700',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
    };
  }

  // Soon (within 3 days)
  if (diffDays <= 3) {
    return {
      level: 'soon',
      label: '即將截止',
      diffHours,
      diffDays,
      timeRemainingText: `剩餘 ${diffDays} 天`,
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
    };
  }

  // Normal
  return {
    level: 'normal',
    label: `剩餘 ${diffDays} 天`,
    diffHours,
    diffDays,
    timeRemainingText: `還有 ${diffDays} 天`,
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
  };
}

export function formatDateTimeDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][d.getDay()];
    return `${month}月${date}日 (${dayOfWeek}) ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

export function formatDateForInput(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function isDatePast(dateStr: string): boolean {
  try {
    return new Date(dateStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

