import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ENV_CACHE_ENTRIES,
  clearEnvCacheForTests,
  fetchLiveEnvironmentalSnapshot,
  findNearestVisibilityKm,
  searchLocations,
  setBoundedCacheEntry,
  weatherCodeToSummary,
} from './envData.ts';
import { PRESET_CITIES } from '../src/data/presets.ts';

test('searchLocations merges Open-Meteo results with presets and deduplicates', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [
          {
            id: 12345,
            name: 'New Delhi',
            admin1: 'Delhi',
            country: 'India',
            country_code: 'IN',
            latitude: 28.6139,
            longitude: 77.209,
            timezone: 'Asia/Kolkata',
          },
          {
            id: 99999,
            name: 'Jaipur',
            admin1: 'Rajasthan',
            country: 'India',
            country_code: 'IN',
            latitude: 26.9124,
            longitude: 75.7873,
            timezone: 'Asia/Kolkata',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  try {
    const results = await searchLocations('Delhi');
    assert.ok(results.some((r) => r.name === 'Jaipur'));
    const delhiCount = results.filter((r) => r.name.toLowerCase() === 'new delhi').length;
    assert.equal(delhiCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('searchLocations falls back cleanly to presets on network failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;

  try {
    const results = await searchLocations('Mumbai');
    assert.ok(results.some((r) => r.id === 'mumbai-in'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchLiveEnvironmentalSnapshot parses live feeds, converts CO, caches, and falls back gracefully', async () => {
  clearEnvCacheForTests();
  const originalFetch = globalThis.fetch;
  const now = new Date();
  const isoHour = `${now.toISOString().slice(0, 13)}:00`;
  const pastHour = `${new Date(now.getTime() - 10 * 3600 * 1000).toISOString().slice(0, 13)}:00`;
  const futureHour = `${new Date(now.getTime() + 10 * 3600 * 1000).toISOString().slice(0, 13)}:00`;
  const today = now.toISOString().slice(0, 10);

  const customCity = {
    id: 'test-pune-unique',
    name: 'Pune Test',
    region: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    latitude: 18.5246,
    longitude: 73.8786,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  };

  let fetchCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCalls++;
    const url = String(input);
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({
          current: {
            time: isoHour,
            pm10: 95,
            pm2_5: 52,
            carbon_monoxide: 1200,
            nitrogen_dioxide: 28,
            sulphur_dioxide: 10,
            ozone: 42,
            us_aqi: 142,
          },
          hourly: {
            time: [isoHour],
            pm10: [95],
            pm2_5: [52],
            us_aqi: [142],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        current: {
          temperature_2m: 26,
          relative_humidity_2m: 58,
          wind_speed_10m: 11,
          weather_code: 1,
        },
        hourly: {
          time: [pastHour, isoHour, futureHour],
          temperature_2m: [22, 26, 24],
          wind_speed_10m: [7, 11, 9],
          visibility: [4000, 10000, 15000],
        },
        daily: {
          time: [today],
          temperature_2m_max: [30],
          temperature_2m_min: [20],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const live = await fetchLiveEnvironmentalSnapshot(customCity);
    assert.equal(live.dataStatus, 'LIVE');
    assert.equal(live.pollutants.co, 1.2); // 1200 ug/m3 -> 1.2 mg/m3
    assert.equal(live.weather.visibilityKm, 10); // Picks isoHour nearest now
    assert.equal(live.cpcbCategory, 'Satisfactory');
    assert.equal(fetchCalls, 2);

    // Second call hits server cache without extra network requests
    const cached = await fetchLiveEnvironmentalSnapshot(customCity);
    assert.equal(cached.dataStatus, 'CACHED');
    assert.equal(fetchCalls, 2);

    // Clear cache and verify partial weather failure still returns LIVE air quality data
    clearEnvCacheForTests();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('air-quality-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({
            current: { time: isoHour, pm10: 60, pm2_5: 35, us_aqi: 99 },
            hourly: { time: [isoHour], pm10: [60], pm2_5: [35], us_aqi: [99] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Weather unavailable', { status: 503 });
    }) as typeof fetch;

    const partialLive = await fetchLiveEnvironmentalSnapshot(customCity);
    assert.equal(partialLive.dataStatus, 'LIVE');
    assert.equal(partialLive.weather.temperatureC, null);
    assert.equal(partialLive.weather.visibilityKm, null);

    // Non-finite coordinates fall back safely without throwing or fetching
    const badCoordLoc = { ...PRESET_CITIES[4], latitude: Number.NaN, longitude: 80.29 };
    const badCoordFallback = await fetchLiveEnvironmentalSnapshot(badCoordLoc);
    assert.equal(badCoordFallback.dataStatus, 'DEMO_FALLBACK');

    // Distinct coordinates where upstream returns 503 should produce DEMO_FALLBACK
    clearEnvCacheForTests();
    globalThis.fetch = (async () => new Response('Unavailable', { status: 503 })) as typeof fetch;
    const fallbackLoc = { ...PRESET_CITIES[4], latitude: 12.99, longitude: 80.29 };
    const fallback = await fetchLiveEnvironmentalSnapshot(fallbackLoc);
    assert.equal(fallback.dataStatus, 'DEMO_FALLBACK');
    assert.ok(fallback.statusMessage.includes('demonstration fallback'));
  } finally {
    clearEnvCacheForTests();
    globalThis.fetch = originalFetch;
  }
});

test('fetchLiveEnvironmentalSnapshot coalesces concurrent in-flight requests for the same grid', async () => {
  clearEnvCacheForTests();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCount++;
    await new Promise((r) => setTimeout(r, 20));
    const url = String(input);
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({ current: { pm2_5: 40, pm10: 70, us_aqi: 112 } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 9 } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const target = { ...PRESET_CITIES[0], latitude: 21.15, longitude: 79.09 };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => fetchLiveEnvironmentalSnapshot(target))
    );
    assert.equal(results.length, 8);
    assert.ok(results.every((r) => r.dataStatus === 'LIVE'));
    // 1 air-quality fetch + 1 weather fetch total across 8 concurrent callers
    assert.equal(fetchCount, 2);
  } finally {
    clearEnvCacheForTests();
    globalThis.fetch = originalFetch;
  }
});

test('weatherCodeToSummary, findNearestVisibilityKm, and setBoundedCacheEntry handle all edge cases', () => {
  assert.equal(weatherCodeToSummary(0), 'Clear sky');
  assert.equal(weatherCodeToSummary(2), 'Partly cloudy');
  assert.equal(weatherCodeToSummary(45), 'Fog or mist');
  assert.equal(weatherCodeToSummary(61), 'Rain / drizzle');
  assert.equal(weatherCodeToSummary(73), 'Snow');
  assert.equal(weatherCodeToSummary(81), 'Rain showers');
  assert.equal(weatherCodeToSummary(95), 'Thunderstorm');
  assert.equal(weatherCodeToSummary(42), 'Mixed sky');
  assert.equal(weatherCodeToSummary('bad'), 'Observed conditions');

  const baseMs = Date.parse('2026-01-15T12:00:00Z');
  assert.equal(findNearestVisibilityKm([], [], baseMs), null);
  assert.equal(
    findNearestVisibilityKm(
      ['2026-01-15T06:00:00Z', '2026-01-15T12:15:00Z', '2026-01-15T18:00:00Z'],
      [3000, 8400, 12000],
      baseMs
    ),
    8.4
  );

  // Bounded cache prunes expired entries first and enforces maxEntries cap
  const testCache = new Map<string, { value: number; expiresAt: number }>();
  const now = 10_000;
  setBoundedCacheEntry(testCache, 'expired-1', { value: 1, expiresAt: now - 500 }, 3, now);
  setBoundedCacheEntry(testCache, 'live-1', { value: 2, expiresAt: now + 5000 }, 3, now);
  setBoundedCacheEntry(testCache, 'live-2', { value: 3, expiresAt: now + 5000 }, 3, now);
  setBoundedCacheEntry(testCache, 'live-3', { value: 4, expiresAt: now + 5000 }, 3, now);

  assert.equal(testCache.has('expired-1'), false);
  assert.equal(testCache.size, 3);

  setBoundedCacheEntry(testCache, 'live-4', { value: 5, expiresAt: now + 5000 }, 3, now);
  assert.equal(testCache.has('live-1'), false);
  assert.equal(testCache.has('live-4'), true);
  assert.equal(MAX_ENV_CACHE_ENTRIES, 50);
});
