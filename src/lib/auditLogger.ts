import { AuditLogEntry, LogCategory, LogLevel, AuditLogActor } from '../types';
import { computeHash, downloadJsonFile, loadWithIntegrity, saveWithIntegrity } from './integrity';
import { saveAuditLogToCloud, clearAuditLogsInCloud } from './firebase';

const AUDIT_LOGS_STORAGE_KEY = 'hw_audit_logs_v2';
const MAX_LOGS = 500;

function createBootstrapLog(): AuditLogEntry {
  const now = new Date().toISOString();
  return {
    id: 'log-init-001',
    timestamp: now,
    category: 'security',
    action: '日誌系統啟動',
    level: 'info',
    actor: {
      username: 'System',
      displayName: '系統安全核心',
      role: 'admin',
    },
    target: 'AuditLogger',
    details: '系統日誌服務與完整性 Hash 雜湊保護機制已就緒，並已串接雲端 Firestore 資料庫。',
    hash: computeHash('INIT_ROOT_HASH::' + now),
  };
}

/**
 * Loads audit logs from storage with cryptographic integrity verification.
 */
export function loadAuditLogs(): AuditLogEntry[] {
  try {
    const bootstrap = createBootstrapLog();
    let tamperDetails: string | null = null;

    const logs = loadWithIntegrity<AuditLogEntry[]>(
      AUDIT_LOGS_STORAGE_KEY,
      [bootstrap],
      (details) => {
        tamperDetails = details;
      }
    );

    if (tamperDetails) {
      const tamperEntry: AuditLogEntry = {
        id: `log-${Date.now()}-tamper`,
        timestamp: new Date().toISOString(),
        category: 'security',
        action: '日誌完整性修復',
        level: 'security',
        actor: {
          username: 'System',
          displayName: '安全保護引擎',
          role: 'admin',
        },
        target: AUDIT_LOGS_STORAGE_KEY,
        details: tamperDetails,
        hash: computeHash(`TAMPER_RECOVERED::${Date.now()}`),
      };
      const updated = [tamperEntry, ...logs].slice(0, MAX_LOGS);
      saveAuditLogs(updated);
      saveAuditLogToCloud(tamperEntry).catch(() => {});
      return updated;
    }

    return Array.isArray(logs) ? logs : [bootstrap];
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return [];
  }
}

/**
 * Saves audit logs with hash integrity protection.
 */
function saveAuditLogs(logs: AuditLogEntry[]): void {
  const sliced = logs.slice(0, MAX_LOGS);
  saveWithIntegrity(AUDIT_LOGS_STORAGE_KEY, sliced);
}

/**
 * Records an audit log entry with SHA-256 cryptographic chaining
 * and synchronizes immediately to Cloud Firestore.
 */
export function logAuditEvent(params: {
  category: LogCategory;
  action: string;
  level?: LogLevel;
  actor: AuditLogActor;
  target?: string;
  details: string;
  metadata?: Record<string, unknown>;
}): AuditLogEntry {
  const currentLogs = loadAuditLogs();
  const previousHash = currentLogs[0]?.hash || 'GENESIS_HASH';

  const newEntryId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const level = params.level || 'info';

  const entryPayload = {
    id: newEntryId,
    timestamp,
    category: params.category,
    action: params.action,
    level,
    actor: params.actor,
    target: params.target || '',
    details: params.details,
    metadata: params.metadata || {},
    prevHash: previousHash,
  };

  const hash = computeHash(entryPayload);

  const fullEntry: AuditLogEntry = {
    id: newEntryId,
    timestamp,
    category: params.category,
    action: params.action,
    level,
    actor: params.actor,
    target: params.target || '',
    details: params.details,
    metadata: params.metadata || {},
    hash,
  };

  // Prepend to local storage
  saveAuditLogs([fullEntry, ...currentLogs]);

  // Synchronize immediately to Cloud Firestore
  saveAuditLogToCloud(fullEntry).catch((err) => {
    console.warn('Failed to upload audit log to cloud:', err);
  });

  return fullEntry;
}

/**
 * Clears all audit logs (Admin only operation).
 * Leaves a record that logs were cleared by the admin in both local and cloud.
 */
export function clearAuditLogs(adminActor: AuditLogActor): void {
  const clearEntry: AuditLogEntry = {
    id: `log-${Date.now()}-clear`,
    timestamp: new Date().toISOString(),
    category: 'security',
    action: '日誌記錄清除',
    level: 'warn',
    actor: adminActor,
    target: 'AuditLogs',
    details: `管理員「${adminActor.displayName}」執行了清空系統歷史日誌操作。`,
    hash: computeHash(`CLEARED_BY_${adminActor.username}_${Date.now()}`),
  };
  saveAuditLogs([clearEntry]);

  // Clear in Cloud Firestore and record the clear action
  clearAuditLogsInCloud()
    .then(() => {
      saveAuditLogToCloud(clearEntry).catch(() => {});
    })
    .catch((err) => {
      console.warn('Failed to clear cloud audit logs:', err);
    });
}

/**
 * Exports logs as formatted JSON.
 */
export function exportAuditLogsJSON(customLogs?: AuditLogEntry[]): void {
  const logs = customLogs || loadAuditLogs();
  downloadJsonFile(
    `系統安全稽核日誌_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(logs, null, 2)
  );
}
