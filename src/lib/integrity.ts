/**
 * Data Integrity & Cryptographic Hash Protection
 * 保持資料完整性防止不正常更改，以 SHA-256 Hash 加密簽章保護，後台靜默校驗無提示
 */

// Secret salt for internal HMAC-like tamper protection
const INTEGRITY_SALT = 'MIL_98TH_SECURE_HASH_SALT_2026_INTEGRITY';

/**
 * Standard SHA-256 implementation in pure TypeScript / JavaScript.
 * Runs synchronously without blocking or requiring async/await,
 * ensuring seamless compatibility with localStorage getter/setter pipelines.
 */
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeWords: number[] = [];
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < ascii[lengthProperty]; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - ((i % 4) * 8));
  }

  for (let block = 0; block < words.length; block += 16) {
    const w = words.slice(block, block + 16);
    const oldHash = [...hash];

    for (i = 0; i < 64; i++) {
      let i2 = i + block;
      let w15 = w[i - 15];
      let w2 = w[i - 2];

      let a = hash[0];
      let e = hash[4];
      let temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i] || 0
            : ((w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0));

      let temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, e, hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      let b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Calculates a cryptographic SHA-256 hash digest for any payload string or object.
 */
export function computeHash(data: unknown): string {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  return sha256Sync(INTEGRITY_SALT + '::' + jsonStr);
}

/**
 * Computes a standard exportable checksum for backup files.
 */
export function computeExportChecksum(data: unknown): string {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  return sha256Sync('BACKUP_VERIFY::' + jsonStr);
}

/**
 * Verifies if payload matches provided checksum.
 */
export function verifyExportChecksum(data: unknown, expectedChecksum: string): boolean {
  if (!expectedChecksum) return false;
  const actual = computeExportChecksum(data);
  return actual.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Stores data alongside its cryptographic SHA-256 integrity hash and maintains a shadow backup
 * for silent recovery if corrupted/tampered.
 */
export function saveWithIntegrity<T>(storageKey: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    const hash = computeHash(serialized);

    localStorage.setItem(storageKey, serialized);
    localStorage.setItem(`${storageKey}_integrity_hash`, hash);
    // Keep silent recovery snapshot
    localStorage.setItem(`${storageKey}_shadow_snapshot`, serialized);
  } catch (err) {
    console.error(`Failed to save data with integrity for ${storageKey}:`, err);
  }
}

/**
 * Loads data and validates cryptographic hash integrity.
 * If tampered or hash mismatch:
 * - Silently restores from valid shadow snapshot or returns default data.
 * - Does NOT popup annoying hints to the user.
 */
export function loadWithIntegrity<T>(
  storageKey: string,
  fallbackValue: T,
  onTamperDetected?: (details: string) => void
): T {
  try {
    const raw = localStorage.getItem(storageKey);
    const storedHash = localStorage.getItem(`${storageKey}_integrity_hash`);

    if (!raw) {
      // Initialize fresh with integrity
      saveWithIntegrity(storageKey, fallbackValue);
      return fallbackValue;
    }

    // Verify cryptographic Hash (missing hash also indicates tampering)
    const calculatedHash = computeHash(raw);

    if (!storedHash || calculatedHash !== storedHash) {
      // Data was abnormally modified or tampered with!
      // Silently try recovery from shadow snapshot if storedHash is present and matches shadow
      const shadow = localStorage.getItem(`${storageKey}_shadow_snapshot`);
      if (storedHash && shadow && computeHash(shadow) === storedHash) {
        // Shadow is clean, silently self-heal
        localStorage.setItem(storageKey, shadow);
        if (onTamperDetected) {
          onTamperDetected(`資料庫 ${storageKey} 偵測到異常更改，已靜默自安全快照復原完整性。`);
        }
        return JSON.parse(shadow);
      }

      // If shadow was also tampered or missing, restore fallback and re-hash silently
      if (onTamperDetected) {
        onTamperDetected(`資料庫 ${storageKey} 完整性雜湊校驗失敗，已由系統安全重置。`);
      }
      saveWithIntegrity(storageKey, fallbackValue);
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading integrity data for ${storageKey}:`, err);
    return fallbackValue;
  }
}

/**
 * Removes an integrity-protected key and its hash/shadow artifacts from localStorage.
 */
export function removeWithIntegrity(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_integrity_hash`);
    localStorage.removeItem(`${storageKey}_shadow_snapshot`);
  } catch (err) {
    console.error(`Failed to remove integrity data for ${storageKey}:`, err);
  }
}

/**
 * Validates and sanitizes an external URL, strictly allowing only http: and https: protocols.
 * Returns null for empty, malformed, or dangerous protocols (e.g. javascript:, data:, vbscript:).
 */
export function sanitizeHttpUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#') return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Escapes and protects a CSV cell value against spreadsheet formula injection (CWE-1236).
 */
export function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

/**
 * Generates a cryptographically secure random password using Web Crypto API (no Math.random).
 */
export function generateSecurePassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const targetLen = Math.max(8, length);
  const maxValidByte = 256 - (256 % charset.length);
  let result = '';

  const buf = new Uint8Array(targetLen * 2);
  while (result.length < targetLen) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && result.length < targetLen; i++) {
      if (buf[i] < maxValidByte) {
        result += charset.charAt(buf[i] % charset.length);
      }
    }
  }
  return result;
}

/**
 * Triggers a client-side JSON file download via Blob ObjectURL (avoids data: URIs).
 */
export function downloadJsonFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
