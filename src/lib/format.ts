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
