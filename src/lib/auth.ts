import bcrypt from 'bcryptjs';
import { AppUser, SessionUser, UserRole } from '../types';
import { loadWithIntegrity, saveWithIntegrity } from './integrity';
import { logAuditEvent } from './auditLogger';
import {
  saveUserToCloud,
  deleteUserFromCloud,
  subscribeToUsers,
  seedInitialUsersIfEmpty,
  fetchUsersFromCloud,
} from './firebase';

const USERS_STORAGE_KEY = 'hw_auth_users_v2';
const SESSION_STORAGE_KEY = 'hw_auth_session_v2';

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

// Helper to hash password synchronously
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

// Helper to verify password
export function verifyPassword(plainText: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plainText, hash);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// Official Student List (學號與學生姓名，密碼預設為 Aa學號)
export const OFFICIAL_STUDENT_SEEDS: { username: string; displayName: string }[] = [
  { username: '98005', displayName: '余品馬吉' },
  { username: '98015', displayName: '丁學澤' },
  { username: '98043', displayName: '陳威亦' },
  { username: '98058', displayName: '翟益洋' },
  { username: '98066', displayName: '賴宇翔' },
  { username: '98068', displayName: '羅千驊' },
  { username: '98102', displayName: '莊侑憲' },
  { username: '98132', displayName: '鍾禮喧' },
  { username: '98156', displayName: '劉清鋐' },
  { username: '98184', displayName: '謝瑋澤' },
  { username: '98210', displayName: '葉恩齊' },
  { username: '98267', displayName: '陳慧珊' },
  { username: '98271', displayName: '江昕娣' },
  { username: '98402', displayName: '謝昀芳' },
];

let cachedSeedUsers: AppUser[] | null = null;

// Initial seed users with pre-hashed bcrypt values (含 14 位官方學員與系統管理員)
export function getInitialSeedUsers(): AppUser[] {
  if (cachedSeedUsers) {
    return cachedSeedUsers;
  }

  const studentUsers: AppUser[] = OFFICIAL_STUDENT_SEEDS.map((s) => ({
    username: s.username,
    displayName: s.displayName,
    role: 'user',
    passwordHash: hashPassword(`Aa${s.username}`),
    createdAt: '2026-10-19T00:00:00.000Z',
  }));

  const adminUser: AppUser = {
    username: 'Admin',
    displayName: '系統管理員 (Admin)',
    role: 'admin',
    passwordHash: hashPassword('Aa123456789'),
    createdAt: '2026-10-19T00:00:00.000Z',
  };

  cachedSeedUsers = [adminUser, ...studentUsers];
  return cachedSeedUsers;
}

// Load all users from storage with Hash integrity protection
export function loadUsers(): AppUser[] {
  const initial = getInitialSeedUsers();
  const parsed = loadWithIntegrity<AppUser[]>(
    USERS_STORAGE_KEY,
    initial,
    (details) => {
      logAuditEvent({
        category: 'security',
        action: '完整性自動修復',
        level: 'security',
        actor: { username: 'System', displayName: '安全保護引擎', role: 'admin' },
        target: USERS_STORAGE_KEY,
        details,
      });
    }
  );

  // Ensure all seed users exist, and directly replace/update matching/similar accounts
  let modified = false;
  for (const initUser of initial) {
    const existingIndex = parsed.findIndex(
      (u) => u.username.toLowerCase() === initUser.username.toLowerCase()
    );

    if (existingIndex === -1) {
      // 尚未存在，自動新增
      parsed.push(initUser);
      modified = true;
    } else {
      // 已存在雷同帳號：直接替代姓名與初始密碼 (例如 98210 替代為 葉恩齊)
      const current = parsed[existingIndex];
      if (current.displayName !== initUser.displayName) {
        parsed[existingIndex] = {
          ...current,
          displayName: initUser.displayName,
          passwordHash: initUser.passwordHash,
        };
        modified = true;
      }
    }
  }

  if (modified) {
    saveUsers(parsed);
  }
  return parsed;
}

/**
 * 雙向同步雲端帳號至本地快取
 */
export function syncUsersFromCloud(cloudUsers: AppUser[]): void {
  if (!cloudUsers || cloudUsers.length === 0) return;
  const localUsers = loadUsers();
  const initialSeeds = getInitialSeedUsers();
  const map = new Map<string, AppUser>();

  // 1. 保留預設必要種子帳號
  initialSeeds.forEach((u) => map.set(u.username.toLowerCase(), u));

  // 2. 載入本地既有帳號
  localUsers.forEach((u) => map.set(u.username.toLowerCase(), u));

  // 3. 雲端最新狀態，若有同名官方學員則確保使用正確的官方姓名
  cloudUsers.forEach((u) => {
    const seed = initialSeeds.find(
      (s) => s.username.toLowerCase() === u.username.toLowerCase()
    );
    if (seed && u.displayName !== seed.displayName) {
      map.set(u.username.toLowerCase(), {
        ...u,
        displayName: seed.displayName,
      });
    } else {
      map.set(u.username.toLowerCase(), u);
    }
  });

  saveUsers(Array.from(map.values()));
}

/**
 * 確保所有 14 位學員與管理員帳號皆已同步至 Cloud Firestore
 */
export async function ensureSeedUsersSyncedToCloud(): Promise<void> {
  try {
    const seeds = getInitialSeedUsers();
    for (const u of seeds) {
      await saveUserToCloud(u);
    }
  } catch (err) {
    console.warn('Notice ensuring seed users in cloud:', err);
}
}

/**
 * 完整雙向同步：從雲端拉取最新帳號，並將本地獨有的帳號補充推送到雲端
 */
export async function syncUsersWithCloud(externalCloudUsers?: AppUser[]): Promise<{
  totalUsers: number;
  uploadedToCloud: number;
}> {
  try {
    const cloudUsers = externalCloudUsers || (await fetchUsersFromCloud());
    const localUsers = loadUsers();
    const map = new Map<string, AppUser>();

    // 1. 預設種子帳號
    getInitialSeedUsers().forEach((u) => map.set(u.username.toLowerCase(), u));
    // 2. 本機帳號
    localUsers.forEach((u) => map.set(u.username.toLowerCase(), u));
    // 3. 雲端帳號
    if (cloudUsers && cloudUsers.length > 0) {
      cloudUsers.forEach((u) => map.set(u.username.toLowerCase(), u));
    }

    const merged = Array.from(map.values());
    saveUsers(merged);

    // 4. 若本機有但雲端資料庫尚未存在的帳號，自動補上傳
    let uploadedToCloud = 0;
    if (cloudUsers) {
      const cloudUsernames = new Set(cloudUsers.map((u) => u.username.toLowerCase()));
      for (const user of merged) {
        if (!cloudUsernames.has(user.username.toLowerCase())) {
          await saveUserToCloud(user);
          uploadedToCloud++;
        }
      }
    }

    return { totalUsers: merged.length, uploadedToCloud };
  } catch (err) {
    console.error('Failed to sync users bidirectionally with cloud:', err);
    return { totalUsers: loadUsers().length, uploadedToCloud: 0 };
  }
}

/**
 * 強制將目前本機所有帳號一次性上傳至 Cloud Firestore 資料庫備份
 */
export async function pushAllLocalUsersToCloud(): Promise<{ uploaded: number; failed: number }> {
  const users = loadUsers();
  let uploaded = 0;
  let failed = 0;
  for (const u of users) {
    const ok = await saveUserToCloud(u);
    if (ok) uploaded++;
    else failed++;
  }
  return { uploaded, failed };
}

// 系統啟動時自動嘗試雲端同步帳號資料庫 (若為空則種子初始化)
(async () => {
  try {
    const cloudUsers = await fetchUsersFromCloud();
    if (cloudUsers && cloudUsers.length > 0) {
      syncUsersFromCloud(cloudUsers);
    } else {
      await seedInitialUsersIfEmpty(getInitialSeedUsers());
      // 同步本地既有帳號至雲端
      await pushAllLocalUsersToCloud();
    }
  } catch (err) {
    console.warn('Startup cloud users synchronization notice:', err);
  }
})();

const ATTEMPTS_STORAGE_KEY = 'hw_auth_login_attempts_v2';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptRecord {
  failedCount: number;
  lockedUntil?: number;
  lastAttemptAt: number;
}

function loadLoginAttempts(): Record<string, LoginAttemptRecord> {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLoginAttempts(data: Record<string, LoginAttemptRecord>): void {
  try {
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save login attempts:', e);
  }
}

// Check if an account is currently locked due to brute-force attacks
export function checkAccountLockout(username: string): { isLocked: boolean; remainingMinutes: number } {
  const attempts = loadLoginAttempts();
  const record = attempts[username.toLowerCase()];
  if (!record || !record.lockedUntil) {
    return { isLocked: false, remainingMinutes: 0 };
  }

  const now = Date.now();
  if (now < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { isLocked: true, remainingMinutes };
  }

  // Lockout expired, reset count
  delete attempts[username.toLowerCase()];
  saveLoginAttempts(attempts);
  return { isLocked: false, remainingMinutes: 0 };
}

// Record a failed login attempt
function recordFailedAttempt(username: string): { isLocked: boolean; remainingAttempts: number; remainingMinutes: number } {
  const attempts = loadLoginAttempts();
  const key = username.toLowerCase();
  const now = Date.now();
  const current = attempts[key] || { failedCount: 0, lastAttemptAt: now };

  current.failedCount += 1;
  current.lastAttemptAt = now;

  if (current.failedCount >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    attempts[key] = current;
    saveLoginAttempts(attempts);
    return { isLocked: true, remainingAttempts: 0, remainingMinutes: 15 };
  }

  attempts[key] = current;
  saveLoginAttempts(attempts);
  return {
    isLocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - current.failedCount,
    remainingMinutes: 0,
  };
}

// Reset failed login attempts on successful login
function resetFailedAttempts(username: string): void {
  const attempts = loadLoginAttempts();
  const key = username.toLowerCase();
  if (attempts[key]) {
    delete attempts[key];
    saveLoginAttempts(attempts);
  }
}

// Save all users to storage with Hash integrity protection
export function saveUsers(users: AppUser[]): void {
  saveWithIntegrity(USERS_STORAGE_KEY, users);
}

// Authenticate user with bcrypt and Brute-Force Defense (防暴力破解引擎)
export function loginUser(
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: SessionUser; error?: string } {
  const cleanUsername = usernameInput.trim();
  if (!cleanUsername) {
    return { success: false, error: '請輸入帳號' };
  }
  if (!passwordInput) {
    return { success: false, error: '請輸入密碼' };
  }

  // 1. Check Brute-Force Account Lockout
  const lockout = checkAccountLockout(cleanUsername);
  if (lockout.isLocked) {
    logAuditEvent({
      category: 'security',
      action: '防暴力破解攔截',
      level: 'security',
      actor: { username: cleanUsername, displayName: '未知連線', role: 'user' },
      details: `帳號「${cleanUsername}」已被安全系統鎖定，已自動阻擋登入請求 (剩餘 ${lockout.remainingMinutes} 分鐘)。`,
    });
    return {
      success: false,
      error: `該帳號因連續密碼錯誤次數過多已被安全鎖定，請於 ${lockout.remainingMinutes} 分鐘後再試。`,
    };
  }

  const users = loadUsers();
  const found = users.find(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (!found) {
    const attempt = recordFailedAttempt(cleanUsername);
    logAuditEvent({
      category: 'auth',
      action: '登入失敗 (帳號不存在)',
      level: 'warn',
      actor: { username: cleanUsername, displayName: '未知使用者', role: 'user' },
      details: `嘗試登入未登記之帳號「${cleanUsername}」。`,
    });
    return { success: false, error: '帳號不存在，請確認輸入是否正確' };
  }

  // 2. Verify password with bcrypt
  const isMatch = verifyPassword(passwordInput, found.passwordHash);
  if (!isMatch) {
    const attempt = recordFailedAttempt(found.username);

    if (attempt.isLocked) {
      logAuditEvent({
        category: 'security',
        action: '觸發防暴力破解鎖定',
        level: 'security',
        actor: { username: found.username, displayName: found.displayName, role: found.role },
        details: `帳號「${found.username}」連續輸入密碼錯誤達到 ${MAX_FAILED_ATTEMPTS} 次，系統已自動鎖定該帳號 15 分鐘。`,
      });
      return {
        success: false,
        error: `連續密碼錯誤達 ${MAX_FAILED_ATTEMPTS} 次！為防範密碼暴力破解，該帳號已啟動安全保護鎖定 15 分鐘。`,
      };
    }

    logAuditEvent({
      category: 'auth',
      action: '登入失敗 (密碼錯誤)',
      level: 'warn',
      actor: { username: found.username, displayName: found.displayName, role: found.role },
      details: `帳號「${found.username}」密碼驗證不符 (剩餘 ${attempt.remainingAttempts} 次機會)。`,
    });

    return {
      success: false,
      error: `密碼錯誤，請重新輸入 (剩餘 ${attempt.remainingAttempts} 次嘗試機會，超過將鎖定帳號 15 分鐘)`,
    };
  }

  // 3. Login success: clear attempt tracking
  resetFailedAttempts(found.username);

  // Update last login
  found.lastLoginAt = new Date().toISOString();
  saveUsers(users);
  saveUserToCloud(found).catch(() => {});

  const sessionUser: SessionUser = {
    username: found.username,
    displayName: found.displayName,
    role: found.role,
  };

  saveCurrentSession(sessionUser);

  logAuditEvent({
    category: 'auth',
    action: '登入成功',
    level: 'info',
    actor: sessionUser,
    details: `${sessionUser.role === 'admin' ? '系統管理員' : '一般學員'}「${sessionUser.displayName}」成功登入系統。`,
  });

  return { success: true, user: sessionUser };
}

// Change password for a user
export function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string,
  isAdminOverride = false,
  operatorActor?: SessionUser
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '新密碼長度至少需要 4 碼' };
  }

  const users = loadUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: '查無此使用者帳號' };
  }

  const user = users[index];

  // If not admin override, check old password
  if (!isAdminOverride) {
    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return { success: false, error: '目前舊密碼不正確' };
    }
  }

  // Hash new password using bcrypt
  user.passwordHash = hashPassword(newPassword);
  users[index] = user;
  saveUsers(users);

  // Sync updated credentials to Cloud Firestore
  saveUserToCloud(user).catch(() => {});

  const actor = operatorActor || {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  logAuditEvent({
    category: 'auth',
    action: isAdminOverride ? '管理員重設密碼' : '修改密碼',
    level: 'info',
    actor,
    target: user.username,
    details: isAdminOverride
      ? `管理員「${actor.displayName}」重設了「${user.username}」的密碼。`
      : `使用者「${user.displayName}」自行更新了密碼。`,
  });

  return { success: true };
}

// Create a new user account (Admin feature)
export function createUser(
  params: {
    username: string;
    displayName: string;
    password: string;
    role: UserRole;
  },
  operatorActor?: SessionUser
): { success: boolean; error?: string; user?: AppUser } {
  const username = params.username.trim();
  const displayName = params.displayName.trim();
  const password = params.password;
  const role = params.role || 'user';

  if (!username) {
    return { success: false, error: '請輸入帳號' };
  }
  if (username.length < 2) {
    return { success: false, error: '帳號長度至少需 2 個字元' };
  }
  if (/\s/.test(username)) {
    return { success: false, error: '帳號不可包含空格' };
  }
  if (!displayName) {
    return { success: false, error: '請輸入姓名或稱謂' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: '密碼長度至少需要 4 碼' };
  }

  const users = loadUsers();
  const exists = users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { success: false, error: `帳號「${username}」已存在，請使用其他帳號名稱` };
  }

  // Hash password using bcrypt
  const newUser: AppUser = {
    username,
    displayName,
    role,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Sync new user to Cloud Firestore
  saveUserToCloud(newUser).catch(() => {});

  logAuditEvent({
    category: 'user',
    action: '建立新帳號',
    level: 'info',
    actor: operatorActor || { username: 'Admin', displayName: '管理員', role: 'admin' },
    target: username,
    details: `建立了新帳號「${displayName} (${username})」，身分：${role === 'admin' ? '系統管理員' : '一般學員'}，密碼已以 bcrypt 雜湊。`,
  });

  return { success: true, user: newUser };
}

// Delete user account (Admin feature)
export function deleteUser(
  usernameToDelete: string,
  currentAdminUsername: string,
  operatorActor?: SessionUser
): { success: boolean; error?: string } {
  const target = usernameToDelete.trim();
  if (!target) {
    return { success: false, error: '請指定欲刪除之帳號' };
  }
  if (target.toLowerCase() === currentAdminUsername.toLowerCase()) {
    return { success: false, error: '無法刪除目前正在登入的管理員帳號' };
  }
  if (target.toLowerCase() === 'admin') {
    return { success: false, error: '系統預設管理員 (Admin) 受系統保護，不可刪除' };
  }

  const users = loadUsers();
  const targetUser = users.find((u) => u.username.toLowerCase() === target.toLowerCase());
  const remaining = users.filter(
    (u) => u.username.toLowerCase() !== target.toLowerCase()
  );

  if (remaining.length === users.length) {
    return { success: false, error: '查無欲刪除之帳號' };
  }

  saveUsers(remaining);

  // Sync deletion to Cloud Firestore
  deleteUserFromCloud(target).catch(() => {});

  logAuditEvent({
    category: 'user',
    action: '刪除帳號',
    level: 'warn',
    actor: operatorActor || { username: currentAdminUsername, displayName: '管理員', role: 'admin' },
    target,
    details: `已移除帳號「${targetUser?.displayName || target} (${target})」。`,
  });

  return { success: true };
}

// Load currently active session
export function loadCurrentSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load session:', e);
    return null;
  }
}

// Save active session
export function saveCurrentSession(user: SessionUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

// Logout session
export function logoutSession(): void {
  saveCurrentSession(null);
}

