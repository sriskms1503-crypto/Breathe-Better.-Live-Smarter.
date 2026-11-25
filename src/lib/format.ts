/**
 * Safe formatting and serialization utilities for dates, XML/SVG text, and CSV cells.
 */

export function formatSafeDateTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return 'Time unavailable';
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatSafeTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return '—';
  return new Date(timestamp).toLocaleTimeString(undefined, {
    timeStyle: 'short',
  });
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const FORMULA_TRIGGER_RE = /^[\t\r ]*[=+\-@]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (FORMULA_TRIGGER_RE.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function slugifyCity(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'location';
}

/**
 * Clamps a numeric input to a closed [min, max] range, returning fallback when non-finite.
 */
export function clampFiniteNumber(
  value: number,
  min: number,
  max: number,
  fallback = min
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamps and rounds a numeric input to an integer within [min, max].
 */
export function clampFiniteInt(
  value: number,
  min: number,
  max: number,
  fallback = min
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function parseGridRegion(value: string, fallback: 'INDIA' | 'GLOBAL' = 'INDIA'): 'INDIA' | 'GLOBAL' {
  if (value === 'INDIA' || value === 'GLOBAL') return value;
  return fallback;
}

export function parseAqiStandard(value: string, fallback: 'CPCB' | 'US_EPA' = 'CPCB'): 'CPCB' | 'US_EPA' {
  if (value === 'CPCB' || value === 'US_EPA') return value;
  return fallback;
}

export function parseRespiratorGrade(
  value: string,
  fallback: 'none' | 'surgical' | 'n95_ffp2' = 'n95_ffp2'
): 'none' | 'surgical' | 'n95_ffp2' {
  if (value === 'none' || value === 'surgical' || value === 'n95_ffp2') return value;
  return fallback;
}
