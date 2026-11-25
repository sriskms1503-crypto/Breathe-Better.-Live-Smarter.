import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../data/presets.ts';
import { fetchAirQualitySnapshot, searchCityLocations } from './airQualityClient.ts';

test('fetchAirQualitySnapshot returns server snapshot, handles incomplete payload, and throws on HTTP error', async () => {
  const delhi = PRESET_CITIES[0];
  const expectedSnapshot = buildDemoFallbackSnapshot(delhi);
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ snapshot: expectedSnapshot }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const liveSnap = await fetchAirQualitySnapshot(delhi);
    assert.equal(liveSnap.location.id, delhi.id);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const fallbackSnap = await fetchAirQualitySnapshot(
      delhi,
      undefined,
      'Custom incomplete reason'
    );
    assert.equal(fallbackSnap.dataStatus, 'DEMO_FALLBACK');
    assert.equal(fallbackSnap.statusMessage, 'Custom incomplete reason');

    globalThis.fetch = (async () =>
      new Response('Bad Gateway', { status: 502 })) as typeof fetch;

    await assert.rejects(() => fetchAirQualitySnapshot(delhi), /HTTP 502/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('searchCityLocations unwraps search results and handles error responses cleanly', async () => {
  const delhi = PRESET_CITIES[0];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ results: [delhi] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const ok = await searchCityLocations('Delhi');
    assert.equal(ok.error, undefined);
    assert.equal(ok.results.length, 1);
    assert.equal(ok.results[0].name, delhi.name);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'Enter at least 2 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const bad = await searchCityLocations('a');
    assert.deepEqual(bad.results, []);
    assert.equal(bad.error, 'Enter at least 2 characters.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
