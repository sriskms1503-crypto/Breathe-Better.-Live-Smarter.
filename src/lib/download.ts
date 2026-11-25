import { escapeCsvCell } from './format.ts';

/**
 * Sanitizes a download filename to remove path separators, traversal sequences, and control chars.
 */
export function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/]+/g, '_')
    .replace(/\.\.+/g, '.')
    .trim();
  return cleaned || 'airwise-export.txt';
}

/**
 * Builds an RFC-4180 compliant CSV string with spreadsheet formula-injection protection.
 */
export function buildCsvString(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const dataLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Triggers a safe client-side file download from in-memory text content
 * and defers object URL revocation to prevent premature cleanup in Safari/Firefox.
 */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const safeName = sanitizeFilename(filename);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
