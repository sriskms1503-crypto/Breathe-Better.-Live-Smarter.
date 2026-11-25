import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AirQualityQuerySchema,
  AssistantRequestSchema,
  hasUnsafeObjectKeys,
  LocationSearchQuerySchema,
} from './src/lib/validation.ts';
import { fetchLiveEnvironmentalSnapshot, searchLocations } from './server/envData.ts';
import { generateAssistantAdvice } from './server/geminiAssistant.ts';
import { PRESET_CITIES } from './src/data/presets.ts';
import { isCoordinateInIndia } from './src/lib/aqi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Sliding-window per-IP rate limiter with expired-bucket pruning & bounded size
const MAX_RATE_BUCKETS = 1000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function pruneRateBuckets(now: number) {
  for (const [k, v] of rateBuckets) {
    if (v.resetAt <= now) {
      rateBuckets.delete(k);
    }
  }
  while (rateBuckets.size >= MAX_RATE_BUCKETS) {
    const oldestKey = rateBuckets.keys().next().value;
    if (!oldestKey) break;
    rateBuckets.delete(oldestKey);
  }
}

export function clearRateLimitBucketsForTests() {
  rateBuckets.clear();
}

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      if (rateBuckets.size >= MAX_RATE_BUCKETS) {
        pruneRateBuckets(now);
      }
      const resetAt = now + windowMs;
      rateBuckets.set(key, { count: 1, resetAt });
      res.setHeader('RateLimit-Limit', String(maxRequests));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - 1)));
      res.setHeader('RateLimit-Reset', String(Math.ceil(windowMs / 1000)));
      return next();
    }

    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count >= maxRequests) {
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        error: 'Too many requests. Please wait a few seconds before trying again.',
      });
    }

    bucket.count += 1;
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    return next();
  };
}

function isAllowedOrigin(origin: string, req: Request): boolean {
  let normalizedOrigin: string;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    normalizedOrigin = parsed.origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
  ]);
  const appUrl = process.env.APP_URL;
  if (appUrl && appUrl !== 'MY_APP_URL') {
    allowedOrigins.add(appUrl.replace(/\/$/, ''));
  }
  const host = req.headers.host;
  if (host) {
    allowedOrigins.add(`https://${host}`);
    allowedOrigins.add(`http://${host}`);
  }
  return allowedOrigins.has(normalizedOrigin);
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // Defense-in-depth security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Origin-Agent-Cluster', '?1');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self)');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (req.path.startsWith('/api')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('Cache-Control', 'no-store');
    } else if (isProduction) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
      );
    } else {
      res.setHeader(
        'Content-Security-Policy',
        "object-src 'none'; base-uri 'self'; form-action 'self'"
      );
    }
    next();
  });

  // Restrictive CORS & CSRF origin enforcement for state-changing API calls
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
      const allowed = isAllowedOrigin(origin, req);
      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      } else if (req.path.startsWith('/api') && req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(403).json({ error: 'Cross-origin request blocked by security policy.' });
      }
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  });

  // Strict Content-Type & prototype pollution guards for /api routes
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json.' });
    }
    if (req.body && typeof req.body === 'object' && hasUnsafeObjectKeys(req.body)) {
      return res.status(400).json({ error: 'Invalid object keys in request payload.' });
    }
    return next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AIRWISE AI',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/locations/search', rateLimit(40, 60_000), async (req, res) => {
    const parsed = LocationSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid search query.',
      });
    }
    const results = await searchLocations(parsed.data.q);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ results });
  });

  app.get('/api/air-quality', rateLimit(60, 60_000), async (req, res) => {
    const parsed = AirQualityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Valid latitude and longitude coordinates are required.',
      });
    }

    const { lat, lon, name, region, country, countryCode, timezone } = parsed.data;
    const presetMatch = PRESET_CITIES.find(
      (c) => Math.abs(c.latitude - lat) < 0.05 && Math.abs(c.longitude - lon) < 0.05
    );

    const inIndia = countryCode?.toUpperCase() === 'IN' || isCoordinateInIndia(lat, lon);
    const location = presetMatch ?? {
      id: `coord-${lat.toFixed(2)}-${lon.toFixed(2)}`,
      name: name ?? `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      region: region ?? 'Selected Area',
      country: country ?? (inIndia ? 'India' : 'Selected Region'),
      countryCode: countryCode ?? (inIndia ? 'IN' : 'XX'),
      latitude: lat,
      longitude: lon,
      timezone: timezone ?? 'auto',
      isIndia: inIndia,
    };

    const snapshot = await fetchLiveEnvironmentalSnapshot(location);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ snapshot });
  });

  app.post('/api/assistant', rateLimit(20, 60_000), async (req, res) => {
    const parsed = AssistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid assistant request payload.',
      });
    }

    const reply = await generateAssistantAdvice(parsed.data);
    return res.json({ reply });
  });

  // Explicit 404 JSON for unknown API routes (prevents SPA HTML fallback on /api/*)
  app.use('/api', (_req, res) => {
    return res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Malformed JSON, oversized payload & safe error handler (never leaks stack traces)
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const typedErr = err as { status?: number; type?: string } | undefined;
    if (typedErr?.type === 'entity.too.large' || typedErr?.status === 413) {
      return res.status(413).json({ error: 'Request payload exceeds the 32KB limit.' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON request body.' });
    }
    if (err) {
      return res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
    return next();
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const httpServer = http.createServer(app);
  let viteServer: { close: () => Promise<void> } | null = null;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    viteServer = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down AIRWISE AI server...`);
    try {
      await viteServer?.close();
    } catch {
      // Ignore Vite close errors during shutdown
    }
    httpServer.close(() => {
      process.exit(0);
    });
    httpServer.closeAllConnections?.();
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`Failed to start AIRWISE AI server on port ${PORT}:`, err.message);
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AIRWISE AI server listening on http://localhost:${PORT}`);
  });
}

// Only start listening when executed as entrypoint, not when imported by integration tests
const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMainModule) {
  startServer();
}
