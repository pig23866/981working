export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string; // Tailwind color token or hex
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentBg: string;
  icon: string;
}

export type Priority = 'high' | 'medium' | 'low';

export type AssignmentStatus = 'todo' | 'in_progress' | 'completed' | 'submitted';

export type SubmissionType = 'classroom' | 'online' | 'paper' | 'email' | 'presentation' | 'other';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
  size?: string;
}

// Backward-compatibility alias
export type DriveAttachment = AttachmentItem;

export interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  deadline: string; // ISO 8601 string: YYYY-MM-DDTHH:mm
  priority: Priority;
  status: AssignmentStatus;
  submissionType: SubmissionType;
  subtasks: Subtask[];
  driveAttachments?: AttachmentItem[];
  attachments?: AttachmentItem[];
  estimatedMinutes?: number;
  reminderMinutesBefore?: number;
  reminderTriggered?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type UrgencyLevel = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' | 'done';

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  diffHours: number;
  diffDays: number;
  timeRemainingText: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export type ViewMode = 'list' | 'board' | 'calendar' | 'subjects' | 'schedule';

// Timetable / Schedule Types
export interface SchedulePeriod {
  period: number; // 1 ~ 11
  name: string; // e.g. "(一)", "(二)"
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  startMinutes: number; // minutes from midnight (08:00 -> 480)
  endMinutes: number; // minutes from midnight (08:50 -> 530)
}

export interface CourseEntry {
  id: string;
  dayOfWeek: number; // 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri)
  period: number; // 1 to 11
  courseName: string; // e.g. "(必)數位電路設計"
  teacher: string; // e.g. "吳順裕"
  classroom: string; // e.g. "資訊系302教室"
  category?: string; // e.g. "專業必修", "軍事訓練", "通識"
  color?: string;
  note?: string;
}

export interface CurrentClassStatus {
  state: 'in_class' | 'in_break' | 'before_school' | 'after_school' | 'weekend';
  currentClass: CourseEntry | null;
  currentPeriod: SchedulePeriod | null;
  nextClass: CourseEntry | null;
  nextPeriod: SchedulePeriod | null;
  remainingMinutesInCurrent?: number;
  minutesUntilNext?: number;
  dayOfWeek: number; // 1-7
  isSimulation: boolean;
  simulatedTimeStr?: string;
}

// Authentication & Role Types
export type UserRole = 'admin' | 'user';

export interface AppUser {
  username: string; // '98210' | 'Admin' | custom
  displayName: string;
  role: UserRole;
  passwordHash: string; // bcrypt hash
  createdAt?: string;
  lastLoginAt?: string;
}

export interface SessionUser {
  username: string;
  displayName: string;
  role: UserRole;
}

// Audit Log Types (日誌系統 - 僅管理員可查看)
export type LogLevel = 'info' | 'warn' | 'error' | 'security';
export type LogCategory = 'auth' | 'assignment' | 'schedule' | 'backup' | 'security' | 'user';

export interface AuditLogActor {
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  category: LogCategory;
  action: string;
  level: LogLevel;
  actor: AuditLogActor;
  target?: string;
  details: string;
  metadata?: Record<string, unknown>;
  hash: string; // Cryptographic integrity hash (SHA-256)
}

// Backup & Restore Types (備份與復原系統：作業備份 & 課表備份)
export interface AssignmentsBackupPayload {
  version: string;
  type: 'assignments_backup';
  exportedAt: string;
  exportedBy: string;
  assignmentCount: number;
  assignments: Assignment[];
  checksum: string;
}

export interface ScheduleBackupPayload {
  version: string;
  type: 'schedule_backup';
  exportedAt: string;
  exportedBy: string;
  courseCount: number;
  courses: CourseEntry[];
  checksum: string;
}

// Personal Assignment Progress (個人獨立作業完成進度)
export interface AssignmentProgress {
  id: string; // Format: `${assignmentId}_${username.toLowerCase()}`
  assignmentId: string;
  username: string;
  displayName: string;
  status: AssignmentStatus; // 'todo' | 'in_progress' | 'completed' | 'submitted'
  completedAt?: string;
  updatedAt: string;
}

