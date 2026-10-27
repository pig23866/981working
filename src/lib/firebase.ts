import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDocFromServer,
  Firestore,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Assignment, CourseEntry, Subject, AuditLogEntry, AppUser, AssignmentProgress } from '../types';

// Initialize Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore database with specified firestoreDatabaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as prescribed by Firebase guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently operating in offline mode.');
    }
    return false;
  }
}

// Auto-run test connection on module load
testFirestoreConnection();

// ==========================================
// 1. Assignments Cloud Sync (作業雲端同步模組)
// ==========================================

const ASSIGNMENTS_COLLECTION = 'assignments';

/**
 * 監聽雲端作業即時異動 (Real-time onSnapshot)
 * 當任何裝置新增、修改或刪除作業時，自動即時回傳最新作業陣列
 */
export function subscribeToAssignments(
  onUpdate: (assignments: Assignment[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, ASSIGNMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Assignment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Assignment;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      // Sort by deadline ascending by default
      items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore assignments subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Recursively removes undefined fields from an object so Firestore setDoc does not throw
 * "Unsupported field value: undefined"
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? removeUndefinedFields(item) : item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' && value !== null ? removeUndefinedFields(value) : value;
    }
  }
  return cleaned;
}

/**
 * 儲存或更新單筆作業至雲端 Firestore (自動過濾 undefined 欄位)
 */
export async function saveAssignmentToCloud(assignment: Assignment): Promise<void> {
  try {
    const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignment.id);
    const sanitized = removeUndefinedFields({
      ...assignment,
      description: assignment.description || '',
      notes: assignment.notes || '',
      subtasks: assignment.subtasks || [],
      attachments: assignment.attachments || [],
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.error('Failed to save assignment to Firestore:', err);
  }
}

/**
 * 從雲端 Firestore 刪除單筆作業
 */
export async function deleteAssignmentFromCloud(id: string): Promise<void> {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * 清空雲端所有作業清單
 */
export async function clearAllAssignmentsInCloud(): Promise<void> {
  const colRef = collection(db, ASSIGNMENTS_COLLECTION);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
}

// ==========================================
// 2. Schedule / Courses Cloud Sync (課表同步)
// ==========================================

const SCHEDULE_COLLECTION = 'schedule';

/**
 * 監聽雲端課表即時異動
 */
export function subscribeToSchedule(
  onUpdate: (courses: CourseEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, SCHEDULE_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const items: CourseEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CourseEntry);
      });
      items.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore schedule subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 批次儲存整份課表至雲端 Firestore
 */
export async function saveScheduleToCloud(courses: CourseEntry[]): Promise<void> {
  const colRef = collection(db, SCHEDULE_COLLECTION);
  const existingSnapshot = await getDocs(colRef);
  const batch = writeBatch(db);

  // Remove existing
  existingSnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Write new courses
  courses.forEach((c) => {
    const docRef = doc(db, SCHEDULE_COLLECTION, c.id);
    batch.set(docRef, c);
  });

  await batch.commit();
}

// ==========================================
// 3. Subjects Cloud Sync (課程科目同步)
// ==========================================

const SUBJECTS_COLLECTION = 'subjects';

/**
 * 監聽雲端科目分類即時異動
 */
export function subscribeToSubjects(
  onUpdate: (subjects: Subject[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, SUBJECTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const items: Subject[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Subject);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore subjects subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 批次儲存科目資料至雲端 Firestore
 */
export async function saveSubjectsToCloud(subjects: Subject[]): Promise<void> {
  const colRef = collection(db, SUBJECTS_COLLECTION);
  const existingSnapshot = await getDocs(colRef);
  const batch = writeBatch(db);

  existingSnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  subjects.forEach((s) => {
    const docRef = doc(db, SUBJECTS_COLLECTION, s.id);
    batch.set(docRef, s);
  });

  await batch.commit();
}

// ==========================================
// 4. Audit Logs Cloud Sync (安全日誌雲端串接)
// ==========================================

const AUDIT_LOGS_COLLECTION = 'audit_logs';

/**
 * 寫入單筆安全日誌至雲端 Firestore (過濾 undefined 欄位防報錯)
 */
export async function saveAuditLogToCloud(log: AuditLogEntry): Promise<void> {
  try {
    const docRef = doc(db, AUDIT_LOGS_COLLECTION, log.id);
    const sanitized = removeUndefinedFields({
      id: log.id,
      timestamp: log.timestamp,
      category: log.category,
      action: log.action,
      level: log.level || 'info',
      actor: log.actor || { username: 'System', displayName: 'System', role: 'user' },
      target: log.target || '',
      details: log.details || '',
      hash: log.hash || '',
      metadata: log.metadata || {},
    });
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error('Failed to save audit log to Firestore:', err);
  }
}

/**
 * 監聽雲端日誌即時異動（讓管理員跨裝置即時看見最新日誌）
 */
export function subscribeToAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, AUDIT_LOGS_COLLECTION);
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AuditLogEntry);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore audit logs subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 主動自雲端取得完整日誌列表
 */
export async function fetchAuditLogsFromCloud(): Promise<AuditLogEntry[]> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(300));
    const snapshot = await getDocs(q);
    const items: AuditLogEntry[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as AuditLogEntry);
    });
    return items;
  } catch (err) {
    console.error('Failed to fetch audit logs from Firestore:', err);
    return [];
  }
}

/**
 * 清空雲端所有日誌記錄 (管理員權限)
 */
export async function clearAuditLogsInCloud(): Promise<void> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to clear audit logs in Firestore:', err);
  }
}

// ==========================================
// 5. User Accounts Cloud Sync (帳號資料庫同步模組)
// ==========================================

const USERS_COLLECTION = 'users';

/**
 * 寫入或更新單筆使用者帳號至雲端 Firestore (回傳儲存成功與否)
 */
export async function saveUserToCloud(user: AppUser): Promise<boolean> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.username);
    const sanitized = removeUndefinedFields({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || '',
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.error(`Failed to save user ${user.username} to Firestore:`, err);
    return false;
  }
}

/**
 * 批次上傳多組使用者帳號至雲端 Firestore
 */
export async function batchSaveUsersToCloud(users: AppUser[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const user of users) {
    const ok = await saveUserToCloud(user);
    if (ok) success++;
    else failed++;
  }
  return { success, failed };
}

/**
 * 從雲端 Firestore 刪除指定帳號 (回傳刪除成功與否)
 */
export async function deleteUserFromCloud(username: string): Promise<boolean> {
  try {
    const docRef = doc(db, USERS_COLLECTION, username);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Failed to delete user ${username} from Firestore:`, err);
    return false;
  }
}

/**
 * 監聽雲端帳號列表即時異動
 */
export function subscribeToUsers(
  onUpdate: (users: AppUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AppUser);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore users subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 主動從雲端拉取所有使用者帳號
 */
export async function fetchUsersFromCloud(): Promise<AppUser[]> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const items: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as AppUser);
    });
    return items;
  } catch (err) {
    console.error('Failed to fetch users from Firestore:', err);
    return [];
  }
}

/**
 * 首次雲端初始化種子帳號（若雲端為空則自動上傳初始學員與管理員）
 */
export async function seedInitialUsersIfEmpty(seedUsers: AppUser[]): Promise<void> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      for (const u of seedUsers) {
        await saveUserToCloud(u);
      }
    }
  } catch (err) {
    console.warn('Notice seeding users to cloud:', err);
  }
}

// ==========================================
// 6. Assignment Progress Sync (個人作業獨立完成進度)
// ==========================================

const PROGRESS_COLLECTION = 'assignment_progress';

/**
 * 儲存或更新單筆學員作業進度至雲端 Firestore
 */
export async function saveAssignmentProgressToCloud(progress: AssignmentProgress): Promise<boolean> {
  try {
    const docRef = doc(db, PROGRESS_COLLECTION, progress.id);
    const sanitized = removeUndefinedFields({
      id: progress.id,
      assignmentId: progress.assignmentId,
      username: progress.username.toLowerCase(),
      displayName: progress.displayName,
      status: progress.status,
      completedAt: progress.completedAt || '',
      updatedAt: progress.updatedAt || new Date().toISOString(),
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.error(`Failed to save progress ${progress.id} to Firestore:`, err);
    return false;
  }
}

/**
 * 監聽特定學員的所有作業進度 (學員專用)
 */
export function subscribeToUserProgress(
  username: string,
  onUpdate: (progresses: AssignmentProgress[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, PROGRESS_COLLECTION);
  const q = query(colRef, where('username', '==', username.toLowerCase()));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AssignmentProgress[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AssignmentProgress);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore user progress subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 監聽全班所有作業進度 (管理員專用)
 */
export function subscribeToAllProgress(
  onUpdate: (progresses: AssignmentProgress[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, PROGRESS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: AssignmentProgress[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AssignmentProgress);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore all progress subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 主動自雲端取得全體作業進度記錄
 */
export async function fetchAllProgressFromCloud(): Promise<AssignmentProgress[]> {
  try {
    const colRef = collection(db, PROGRESS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const items: AssignmentProgress[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as AssignmentProgress);
    });
    return items;
  } catch (err) {
    console.error('Failed to fetch all progress from Firestore:', err);
    return [];
  }
}

/**
 * 刪除某作業的所有相關學員進度 (當作業被刪除時呼叫)
 */
export async function deleteAssignmentProgressForAssignment(assignmentId: string): Promise<void> {
  try {
    const colRef = collection(db, PROGRESS_COLLECTION);
    const q = query(colRef, where('assignmentId', '==', assignmentId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error(`Failed to delete progress for assignment ${assignmentId}:`, err);
  }
}

// ==========================================
// 7. Global Manual Sync / Refresh (全局手動刷新同步)
// ==========================================

/**
 * 手動主動強制從雲端拉取最新作業、課表、日誌、帳號與進度資料
 */
export async function manualSyncAllData(): Promise<{
  assignments: Assignment[];
  courses: CourseEntry[];
  logs: AuditLogEntry[];
  users: AppUser[];
  progresses: AssignmentProgress[];
}> {
  // Test connection first
  await testFirestoreConnection();

  // Fetch assignments
  const assignSnapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
  const assignments: Assignment[] = [];
  assignSnapshot.forEach((docSnap) => {
    assignments.push(docSnap.data() as Assignment);
  });
  assignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // Fetch schedule
  const schedSnapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
  const courses: CourseEntry[] = [];
  schedSnapshot.forEach((docSnap) => {
    courses.push(docSnap.data() as CourseEntry);
  });
  courses.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);

  // Fetch logs
  const logs = await fetchAuditLogsFromCloud();

  // Fetch users
  const users = await fetchUsersFromCloud();

  // Fetch progress
  const progresses = await fetchAllProgressFromCloud();

  return { assignments, courses, logs, users, progresses };
}
