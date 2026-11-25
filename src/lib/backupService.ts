import {
  Assignment,
  AssignmentStatus,
  AttachmentItem,
  AuditLogActor,
  AssignmentsBackupPayload,
  CourseEntry,
  Priority,
  ScheduleBackupPayload,
  SubmissionType,
} from '../types';
import {
  computeExportChecksum,
  downloadJsonFile,
  sanitizeHttpUrl,
  verifyExportChecksum,
} from './integrity';
import { logAuditEvent } from './auditLogger';

const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const VALID_STATUSES: AssignmentStatus[] = ['todo', 'in_progress', 'completed', 'submitted'];
const VALID_SUBMISSIONS: SubmissionType[] = ['classroom', 'online', 'paper', 'email', 'presentation', 'other'];

function sanitizeAttachment(raw: unknown): AttachmentItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name.trim()) return null;
  const safeUrl = sanitizeHttpUrl(typeof obj.url === 'string' ? obj.url : '');
  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id.slice(0, 64) : `att-${Date.now()}`,
    name: obj.name.trim().slice(0, 120),
    url: safeUrl || '#',
    size: typeof obj.size === 'string' ? obj.size.slice(0, 32) : undefined,
  };
}

function sanitizeAssignments(items: unknown[]): Assignment[] {
  const result: Assignment[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !obj.id.trim() || typeof obj.title !== 'string' || !obj.title.trim()) {
      continue;
    }

    const rawAttachments = Array.isArray(obj.attachments)
      ? obj.attachments
      : Array.isArray(obj.driveAttachments)
      ? obj.driveAttachments
      : [];
    const attachments = rawAttachments
      .map(sanitizeAttachment)
      .filter((item): item is AttachmentItem => item !== null);

    const subtasks = Array.isArray(obj.subtasks)
      ? obj.subtasks
          .filter((st): st is Record<string, unknown> => !!st && typeof st === 'object' && typeof (st as Record<string, unknown>).title === 'string')
          .map((st, idx) => ({
            id: typeof st.id === 'string' && st.id ? st.id.slice(0, 64) : `st-${idx}`,
            title: String(st.title).trim().slice(0, 200),
            isCompleted: Boolean(st.isCompleted),
          }))
      : [];

    const nowIso = new Date().toISOString();
    result.push({
      id: obj.id.trim().slice(0, 128),
      title: obj.title.trim().slice(0, 200),
      subjectId: typeof obj.subjectId === 'string' && obj.subjectId ? obj.subjectId.slice(0, 64) : 'course-cs-prog',
      description: typeof obj.description === 'string' ? obj.description.slice(0, 2000) : '',
      deadline: typeof obj.deadline === 'string' && obj.deadline ? obj.deadline.slice(0, 64) : nowIso.slice(0, 16),
      priority: VALID_PRIORITIES.includes(obj.priority as Priority) ? (obj.priority as Priority) : 'medium',
      status: VALID_STATUSES.includes(obj.status as AssignmentStatus) ? (obj.status as AssignmentStatus) : 'todo',
      submissionType: VALID_SUBMISSIONS.includes(obj.submissionType as SubmissionType)
        ? (obj.submissionType as SubmissionType)
        : 'classroom',
      subtasks,
      attachments,
      driveAttachments: attachments,
      estimatedMinutes: typeof obj.estimatedMinutes === 'number' && Number.isFinite(obj.estimatedMinutes) ? obj.estimatedMinutes : 60,
      notes: typeof obj.notes === 'string' ? obj.notes.slice(0, 1000) : '',
      scope: obj.scope === 'personal' ? 'personal' : 'class',
      ownerUsername:
        obj.scope === 'personal' && typeof obj.ownerUsername === 'string'
          ? obj.ownerUsername.trim().toLowerCase().slice(0, 64)
          : undefined,
      createdBy: typeof obj.createdBy === 'string' ? obj.createdBy.trim().slice(0, 64) : undefined,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : nowIso,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : nowIso,
    });
  }
  return result;
}

function sanitizeCourses(items: unknown[]): CourseEntry[] {
  const result: CourseEntry[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    if (
      typeof obj.id !== 'string' ||
      !obj.id.trim() ||
      typeof obj.courseName !== 'string' ||
      !obj.courseName.trim() ||
      typeof obj.dayOfWeek !== 'number' ||
      typeof obj.period !== 'number'
    ) {
      continue;
    }
    if (obj.dayOfWeek < 1 || obj.dayOfWeek > 7 || obj.period < 1 || obj.period > 11) {
      continue;
    }
    result.push({
      id: obj.id.trim().slice(0, 128),
      dayOfWeek: obj.dayOfWeek,
      period: obj.period,
      courseName: obj.courseName.trim().slice(0, 120),
      teacher: typeof obj.teacher === 'string' ? obj.teacher.slice(0, 64) : '',
      classroom: typeof obj.classroom === 'string' ? obj.classroom.slice(0, 64) : '',
      category: typeof obj.category === 'string' ? obj.category.slice(0, 64) : undefined,
      color: typeof obj.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(obj.color) ? obj.color : undefined,
      note: typeof obj.note === 'string' ? obj.note.slice(0, 500) : undefined,
    });
  }
  return result;
}

// -------------------------------------------------------------
// 1. 作業備份與復原 (Assignments Backup & Restore)
// -------------------------------------------------------------

export function exportAssignmentsBackup(assignments: Assignment[], actor: AuditLogActor): void {
  const checksum = computeExportChecksum(assignments);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const payload: AssignmentsBackupPayload = {
    version: '2.0',
    type: 'assignments_backup',
    exportedAt: now.toISOString(),
    exportedBy: `${actor.displayName} (${actor.username})`,
    assignmentCount: assignments.length,
    assignments,
    checksum,
  };

  const filename = `作業備份_${dateStr}.json`;
  downloadJsonFile(filename, JSON.stringify(payload, null, 2));

  logAuditEvent({
    category: 'backup',
    action: '匯出作業備份',
    level: 'info',
    actor,
    target: filename,
    details: `匯出 ${assignments.length} 筆作業資料，完整性驗證碼：${checksum.substring(0, 8)}...`,
  });
}

export function parseAssignmentsBackup(rawText: string): {
  success: boolean;
  payload?: AssignmentsBackupPayload;
  error?: string;
  isChecksumValid: boolean;
} {
  try {
    const data = JSON.parse(rawText);

    // Legacy direct array format (lacks cryptographic checksum)
    if (Array.isArray(data)) {
      const sanitized = sanitizeAssignments(data);
      const syntheticPayload: AssignmentsBackupPayload = {
        version: '1.0',
        type: 'assignments_backup',
        exportedAt: new Date().toISOString(),
        exportedBy: '原始備份匯入 (未附帶驗證碼)',
        assignmentCount: sanitized.length,
        assignments: sanitized,
        checksum: '',
      };
      return {
        success: true,
        payload: syntheticPayload,
        isChecksumValid: false,
      };
    }

    if (!data || data.type !== 'assignments_backup' || !Array.isArray(data.assignments)) {
      return {
        success: false,
        error: '檔案格式不符：請確認所選檔案為合法的作業備份 JSON 檔案。',
        isChecksumValid: false,
      };
    }

    const isChecksumValid =
      typeof data.checksum === 'string' && verifyExportChecksum(data.assignments, data.checksum);

    if (!isChecksumValid) {
      return {
        success: false,
        error: '備份檔完整性驗證碼 (Checksum) 不符，檔案可能已被竄改或損毀，已基於安全原則拒絕匯入。',
        isChecksumValid: false,
      };
    }

    const sanitized = sanitizeAssignments(data.assignments);
    return {
      success: true,
      payload: {
        ...(data as AssignmentsBackupPayload),
        assignmentCount: sanitized.length,
        assignments: sanitized,
      },
      isChecksumValid: true,
    };
  } catch {
    return {
      success: false,
      error: '檔案解析失敗：檔案內容並非標準 JSON 格式。',
      isChecksumValid: false,
    };
  }
}

// -------------------------------------------------------------
// 2. 課表備份與復原 (Schedule Backup & Restore)
// -------------------------------------------------------------

export function exportScheduleBackup(courses: CourseEntry[], actor: AuditLogActor): void {
  const checksum = computeExportChecksum(courses);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const payload: ScheduleBackupPayload = {
    version: '1.0',
    type: 'schedule_backup',
    exportedAt: now.toISOString(),
    exportedBy: `${actor.displayName} (${actor.username})`,
    courseCount: courses.length,
    courses,
    checksum,
  };

  const filename = `課表備份_${dateStr}.json`;
  downloadJsonFile(filename, JSON.stringify(payload, null, 2));

  logAuditEvent({
    category: 'backup',
    action: '匯出課表備份',
    level: 'info',
    actor,
    target: filename,
    details: `匯出 ${courses.length} 門課堂資料，完整性驗證碼：${checksum.substring(0, 8)}...`,
  });
}

export function parseScheduleBackup(rawText: string): {
  success: boolean;
  payload?: ScheduleBackupPayload;
  error?: string;
  isChecksumValid: boolean;
} {
  try {
    const data = JSON.parse(rawText);

    if (Array.isArray(data)) {
      const sanitized = sanitizeCourses(data);
      const syntheticPayload: ScheduleBackupPayload = {
        version: '1.0',
        type: 'schedule_backup',
        exportedAt: new Date().toISOString(),
        exportedBy: '原始課表匯入 (未附帶驗證碼)',
        courseCount: sanitized.length,
        courses: sanitized,
        checksum: '',
      };
      return {
        success: true,
        payload: syntheticPayload,
        isChecksumValid: false,
      };
    }

    if (!data || data.type !== 'schedule_backup' || !Array.isArray(data.courses)) {
      return {
        success: false,
        error: '檔案格式不符：請確認所選檔案為合法的課表備份 JSON 檔案。',
        isChecksumValid: false,
      };
    }

    const isChecksumValid =
      typeof data.checksum === 'string' && verifyExportChecksum(data.courses, data.checksum);

    if (!isChecksumValid) {
      return {
        success: false,
        error: '課表備份檔完整性驗證碼 (Checksum) 不符，檔案可能已被竄改或損毀，已基於安全原則拒絕匯入。',
        isChecksumValid: false,
      };
    }

    const sanitized = sanitizeCourses(data.courses);
    return {
      success: true,
      payload: {
        ...(data as ScheduleBackupPayload),
        courseCount: sanitized.length,
        courses: sanitized,
      },
      isChecksumValid: true,
    };
  } catch {
    return {
      success: false,
      error: '檔案解析失敗：檔案內容並非標準 JSON 格式。',
      isChecksumValid: false,
    };
  }
}
