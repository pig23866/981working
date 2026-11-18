/**
 * Centralized HTTP Security Headers (Single Source of Truth)
 * Used by both production Express server (server.ts) and Vite preview/dev (vite.config.ts)
 * Designed to satisfy OWASP ZAP DAST checks with zero High/Medium/Low header alerts.
 */

export const PRODUCTION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self' https://firestore.googleapis.com wss://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'none'",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join('; ');

// Dev server CSP allows Vite HMR inline preamble/styles while keeping all other directives strict
export const DEV_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' ws: wss: https://firestore.googleapis.com wss://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'none'",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join('; ');

const COMMON_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-DNS-Prefetch-Control': 'off',
};

export const PRODUCTION_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': PRODUCTION_CSP,
};

export const DEV_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': DEV_CSP,
};

