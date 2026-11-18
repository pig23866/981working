import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCTION_SECURITY_HEADERS } from './src/lib/securityHeaders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

const app = express();
const port = Number(process.env.PORT) || 3000;

// Hide Express server fingerprint
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Enforce security headers & secure cookie defaults on every response
app.use((req: Request, res: Response, next: NextFunction) => {
  for (const [header, value] of Object.entries(PRODUCTION_SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }

  // Enforce HttpOnly, Secure (over HTTPS), and SameSite=Strict defaults if cookies are ever set
  const originalCookie = res.cookie.bind(res);
  res.cookie = ((name: string, value: unknown, options: express.CookieOptions = {}) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    return originalCookie(name, value, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isHttps,
      ...options,
    });
  }) as typeof res.cookie;

  next();
});

// Reject unexpected HTTP methods for static SPA delivery
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).type('text/plain; charset=utf-8').send('Method Not Allowed');
    return;
  }
  next();
});

// Serve static assets from dist/ (ignoring dotfiles and directory listing)
app.use(
  express.static(distDir, {
    index: false,
    dotfiles: 'ignore',
    fallthrough: true,
    setHeaders: (res, filePath) => {
      const basename = path.basename(filePath);
      if (
        basename === 'index.html' ||
        basename === 'sw.js' ||
        basename === 'manifest.webmanifest' ||
        basename === 'robots.txt'
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// Do not fall back to index.html for dotfiles (/.env, /.git) or missing non-page assets (/sitemap.xml, .js, .css, .json)
app.use((req: Request, res: Response, next: NextFunction) => {
  const cleanPath = req.path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  const hasDotfile = segments.some((seg) => seg.startsWith('.'));
  if (hasDotfile || path.extname(cleanPath)) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).type('text/plain; charset=utf-8').send('Not Found');
    return;
  }
  next();
});

// SPA fallback for HTML navigation routes
app.get('*', (_req: Request, res: Response) => {
  if (!fs.existsSync(indexHtmlPath)) {
    res.status(503).type('text/plain; charset=utf-8').send('Application build not found.');
    return;
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(indexHtmlPath);
});

// Safe error handler that never leaks stack traces
app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('text/plain; charset=utf-8').send('Internal Server Error');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Secure server listening on http://0.0.0.0:${port}`);
});
