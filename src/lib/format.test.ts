import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampFiniteInt,
  clampFiniteNumber,
  escapeCsvCell,
  escapeXml,
  formatSafeDateTime,
  formatSafeTime,
  parseAqiStandard,
  parseGridRegion,
  parseRespiratorGrade,
  slugifyCity,
} from './format.ts';
import { buildCsvString, sanitizeFilename } from './download.ts';

test('formatSafeDateTime and formatSafeTime handle valid and invalid ISO timestamps safely', () => {
  assert.equal(formatSafeDateTime('not-a-date'), 'Time unavailable');
  assert.equal(formatSafeTime('invalid'), '—');

  const validDate = formatSafeDateTime('2026-01-15T10:30:00Z');
  assert.ok(validDate.length > 4 && validDate !== 'Time unavailable');

  const validTime = formatSafeTime('2026-01-15T10:30:00Z');
  assert.ok(validTime.length > 2 && validTime !== '—');
});

test('escapeXml escapes all 5 XML special characters including apostrophes', () => {
  const input = `<tag attr="double" single='quote'>A & B</tag>`;
  assert.equal(
    escapeXml(input),
    '&lt;tag attr=&quot;double&quot; single=&apos;quote&apos;&gt;A &amp; B&lt;/tag&gt;'
  );
});

test('escapeCsvCell handles quoting, nullish values, and spreadsheet formula injection', () => {
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell(undefined), '');
  assert.equal(escapeCsvCell(42), '42');
  assert.equal(escapeCsvCell('Delhi, India'), '"Delhi, India"');
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvCell('line1\nline2'), '"line1\nline2"');

  // Formula-injection neutralizer
  assert.equal(escapeCsvCell('=CMD()'), "'=CMD()");
  assert.equal(escapeCsvCell('+1234'), "'+1234");
  assert.equal(escapeCsvCell('-50'), "'-50");
  assert.equal(escapeCsvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(escapeCsvCell('\t=HYPERLINK()'), "'\t=HYPERLINK()");
});

test('sanitizeFilename strips traversal sequences, slashes, and control characters', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), '._._etc_passwd');
  assert.equal(sanitizeFilename('dir\\subdir/report\u0000.csv'), 'dir_subdir_report.csv');
  assert.equal(sanitizeFilename('   \u0007  '), 'airwise-export.txt');
  assert.equal(sanitizeFilename('airwise-hourly.csv'), 'airwise-hourly.csv');
});

test('buildCsvString and slugifyCity format cleanly', () => {
  const csv = buildCsvString(
    ['Time', 'City', 'Note'],
    [
      ['08:00', 'Delhi, IN', '=1+1'],
      ['09:00', 'Pune', null],
    ]
  );
  assert.equal(csv, 'Time,City,Note\r\n08:00,"Delhi, IN",\'=1+1\r\n09:00,Pune,');
  assert.equal(slugifyCity('New Delhi, India'), 'new-delhi-india');
  assert.equal(slugifyCity('---'), 'location');

  assert.equal(clampFiniteNumber(Number.NaN, 0, 100, 5), 5);
  assert.equal(clampFiniteNumber(-12, 0, 100, 5), 0);
  assert.equal(clampFiniteNumber(250, 0, 100, 5), 100);
  assert.equal(clampFiniteNumber(42.5, 0, 100), 42.5);

  assert.equal(clampFiniteInt(Number.POSITIVE_INFINITY, 1, 20, 3), 3);
  assert.equal(clampFiniteInt(4.6, 1, 20, 1), 5);
  assert.equal(clampFiniteInt(99, 1, 20, 1), 20);
});

test('select option parsers validate allowed values and return safe fallbacks', () => {
  assert.equal(parseGridRegion('GLOBAL'), 'GLOBAL');
  assert.equal(parseGridRegion('INDIA'), 'INDIA');
  assert.equal(parseGridRegion('UNKNOWN', 'GLOBAL'), 'GLOBAL');

  assert.equal(parseAqiStandard('US_EPA'), 'US_EPA');
  assert.equal(parseAqiStandard('CPCB'), 'CPCB');
  assert.equal(parseAqiStandard('INVALID', 'CPCB'), 'CPCB');

  assert.equal(parseRespiratorGrade('surgical'), 'surgical');
  assert.equal(parseRespiratorGrade('none'), 'none');
  assert.equal(parseRespiratorGrade('cloth', 'n95_ffp2'), 'n95_ffp2');
});

