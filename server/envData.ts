import type {
  CityLocation,
  DailyForecastPoint,
  EnvironmentalSnapshot,
  HourlyPoint,
  PollutantReadings,
} from '../src/types/airwise.ts';
import {
  calculateCpcbAqi,
  calculateUsAqiFromParticulates,
  calculateWhoRatios,
  getCpcbCategory,
  sanitizeMeasurement,
} from '../src/lib/aqi.ts';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../src/data/presets.ts';

interface CacheEntry {
  snapshot: EnvironmentalSnapshot;
  expiresAt: number;
}

interface OpenMeteoAirQualityPayload {
  current?: {
    time?: string;
    pm10?: number;
    pm2_5?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    us_aqi?: number;
  };
  hourly?: {
    time?: string[];
    pm10?: Array<number | null>;
    pm2_5?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

interface OpenMeteoWeatherPayload {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    visibility?: Array<number | null>;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
  };
}

export const MAX_ENV_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;
const snapshotCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<EnvironmentalSnapshot>>();

/**
 * Clears cached environmental snapshots and pending in-flight requests (test utility).
 */
export function clearEnvCacheForTests(): void {
  snapshotCache.clear();
  inFlightRequests.clear();
}

/**
 * Maps WMO weather interpretation codes to human-readable atmospheric summaries.
 */
export function weatherCodeToSummary(code: unknown): string {
  if (typeof code !== 'number' || !Number.isFinite(code)) return 'Observed conditions';
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog or mist';
  if (code >= 51 && code <= 67) return 'Rain / drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed sky';
}

/**
 * Normalizes raw Open-Meteo pollutant fields and converts carbon monoxide from µg/m³ to mg/m³.
 */
export function parseCurrentPollutants(
  currentAq: NonNullable<OpenMeteoAirQualityPayload['current']> | Record<string, never>
): PollutantReadings {
  const coRawUg = sanitizeMeasurement(currentAq.carbon_monoxide, 100000);
  return {
    pm25: sanitizeMeasurement(currentAq.pm2_5, 2500),
    pm10: sanitizeMeasurement(currentAq.pm10, 3500),
    no2: sanitizeMeasurement(currentAq.nitrogen_dioxide, 2000),
    so2: sanitizeMeasurement(currentAq.sulphur_dioxide, 3000),
    co: coRawUg !== null ? Math.round((coRawUg / 1000) * 100) / 100 : null,
    o3: sanitizeMeasurement(currentAq.ozone, 1500),
  };
}

/**
 * Finds atmospheric visibility (km) from the weather hourly array closest to the reference timestamp.
 */
export function findNearestVisibilityKm(
  wxTimes: string[],
  visMetersList: Array<number | null>,
  nowMs = Date.now()
): number | null {
  if (visMetersList.length === 0) return null;

  let nearestIdx = Math.min(visMetersList.length - 1, Math.floor(visMetersList.length / 2));
  let minDiff = Infinity;
  for (let i = 0; i < wxTimes.length; i++) {
    const ts = Date.parse(wxTimes[i]);
    if (!Number.isNaN(ts)) {
      const diff = Math.abs(ts - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }
  }

  const visMeters = sanitizeMeasurement(visMetersList[nearestIdx], 100000);
  return visMeters !== null ? Math.round((visMeters / 1000) * 10) / 10 : null;
}

/**
 * Inserts a cache entry into a bounded Map, pruning expired entries first and evicting oldest FIFO on overflow.
 */
export function setBoundedCacheEntry<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  key: string,
  entry: T,
  maxEntries = MAX_ENV_CACHE_ENTRIES,
  now = Date.now()
): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  if (cache.size >= maxEntries) {
    for (const [k, existing] of cache) {
      if (existing.expiresAt <= now) {
        cache.delete(k);
      }
    }
    while (cache.size >= maxEntries) {
      const oldestKey = cache.keys().next().value;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }
  cache.set(key, entry);
}

function buildHourlySeries(
  aqJson: OpenMeteoAirQualityPayload,
  wxJson: OpenMeteoWeatherPayload | null,
  nowMs: number
): HourlyPoint[] {
  const times = aqJson.hourly?.time ?? [];
  const wxTimes = wxJson?.hourly?.time ?? [];
  const wxIndexMap = new Map<string, number>();
  wxTimes.forEach((t, i) => wxIndexMap.set(t, i));

  const hourly: HourlyPoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const ts = Date.parse(t);
    if (Number.isNaN(ts)) continue;
    if (ts < nowMs - 24 * 3600 * 1000 || ts > nowMs + 24 * 3600 * 1000) continue;

    const pm25 = sanitizeMeasurement(aqJson.hourly?.pm2_5?.[i], 2500);
    const pm10 = sanitizeMeasurement(aqJson.hourly?.pm10?.[i], 3500);
    const hCpcb = calculateCpcbAqi({
      pm25,
      pm10,
      no2: null,
      so2: null,
      co: null,
      o3: null,
    });
    const wxIdx = wxIndexMap.get(t);
    const tempC =
      wxIdx !== undefined ? sanitizeMeasurement(wxJson?.hourly?.temperature_2m?.[wxIdx], 65) : null;
    const windKmh =
      wxIdx !== undefined ? sanitizeMeasurement(wxJson?.hourly?.wind_speed_10m?.[wxIdx], 250) : null;

    hourly.push({
      time: t,
      label: t.slice(11, 16),
      pm25,
      pm10,
      cpcbAqi: hCpcb.aqi,
      usAqi: sanitizeMeasurement(aqJson.hourly?.us_aqi?.[i], 500),
      temperatureC: tempC,
      windSpeedKmh: windKmh,
      isForecast: ts > nowMs,
    });
  }

  return hourly;
}

function buildDailyForecast(
  aqJson: OpenMeteoAirQualityPayload,
  wxJson: OpenMeteoWeatherPayload | null,
  todayStr: string
): DailyForecastPoint[] {
  const times = aqJson.hourly?.time ?? [];
  const dailyMap = new Map<string, number[]>();

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const dayKey = t.slice(0, 10);
    const val = sanitizeMeasurement(aqJson.hourly?.pm2_5?.[i], 2500);
    if (val !== null) {
      const list = dailyMap.get(dayKey) ?? [];
      list.push(val);
      dailyMap.set(dayKey, list);
    }
  }

  const dailyDates = wxJson?.daily?.time ?? Array.from(dailyMap.keys());
  return dailyDates
    .filter((d) => d >= todayStr)
    .slice(0, 3)
    .map((date, idx) => {
      const vals = dailyMap.get(date) ?? [];
      const avgPm25 =
        vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      const maxPm25 = vals.length > 0 ? Math.max(...vals) : null;
      const dCpcb = calculateCpcbAqi({
        pm25: avgPm25,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
      });
      const wxDailyIdx = wxJson?.daily?.time?.indexOf(date) ?? -1;
      return {
        date,
        label: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : date.slice(5),
        avgPm25,
        maxPm25,
        cpcbAqi: dCpcb.aqi,
        category: getCpcbCategory(dCpcb.aqi),
        tempMinC:
          wxDailyIdx >= 0 ? sanitizeMeasurement(wxJson?.daily?.temperature_2m_min?.[wxDailyIdx], 65) : null,
        tempMaxC:
          wxDailyIdx >= 0 ? sanitizeMeasurement(wxJson?.daily?.temperature_2m_max?.[wxDailyIdx], 65) : null,
      };
    });
}

/**
 * Searches matching cities via Open-Meteo geocoding merged and deduplicated with local presets.
 */
export async function searchLocations(query: string): Promise<CityLocation[]> {
  const clean = query.trim().toLowerCase();
  const presetMatches = PRESET_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      c.region.toLowerCase().includes(clean) ||
      c.country.toLowerCase().includes(clean)
  );

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=8&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) {
      return presetMatches;
    }
    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        name: string;
        admin1?: string;
        country?: string;
        country_code?: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      }>;
    };

    if (!data.results || !Array.isArray(data.results)) {
      return presetMatches;
    }

    const mapped: CityLocation[] = data.results.map((r) => ({
      id: `om-${r.id}`,
      name: r.name,
      area: r.admin1 ?? undefined,
      region: r.admin1 ?? r.country ?? 'Region',
      country: r.country ?? 'Unknown',
      countryCode: r.country_code ?? 'XX',
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? 'auto',
      isIndia: (r.country_code ?? '').toUpperCase() === 'IN',
    }));

    const seen = new Set<string>();
    const combined: CityLocation[] = [];
    for (const item of [...mapped, ...presetMatches]) {
      const key = `${item.name.toLowerCase()}|${item.countryCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined.slice(0, 8);
  } catch {
    return presetMatches;
  }
}

/**
 * Fetches live atmospheric and meteorological snapshots with caching, request coalescing, and fallback.
 */
export async function fetchLiveEnvironmentalSnapshot(
  location: CityLocation
): Promise<EnvironmentalSnapshot> {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return buildDemoFallbackSnapshot(
      location,
      'Live environmental provider unreachable (Invalid coordinates). Displaying labeled demonstration fallback.'
    );
  }

  const cacheKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.snapshot,
      location,
      dataStatus: cached.snapshot.dataStatus === 'DEMO_FALLBACK' ? 'DEMO_FALLBACK' : 'CACHED',
    };
  }

  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    const shared = await existingInFlight;
    return { ...shared, location };
  }

  const pending = fetchLiveEnvironmentalSnapshotUncached(location, cacheKey);
  inFlightRequests.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

async function fetchLiveEnvironmentalSnapshotUncached(
  location: CityLocation,
  cacheKey: string
): Promise<EnvironmentalSnapshot> {
  try {
    const lat = Number(location.latitude.toFixed(4));
    const lon = Number(location.longitude.toFixed(4));
    const aqUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi` +
      `&hourly=pm10,pm2_5,us_aqi` +
      `&past_days=1&forecast_days=3&timezone=auto`;

    const wxUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&hourly=temperature_2m,wind_speed_10m,visibility` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&past_days=1&forecast_days=3&timezone=auto`;

    const [aqRes, wxRes] = await Promise.all([
      fetch(aqUrl, { signal: AbortSignal.timeout(5500) }),
      fetch(wxUrl, { signal: AbortSignal.timeout(5500) }),
    ]);

    if (!aqRes.ok) {
      throw new Error(`Air quality API returned HTTP ${aqRes.status}`);
    }

    const aqJson = (await aqRes.json()) as OpenMeteoAirQualityPayload;
    const wxJson = wxRes.ok ? ((await wxRes.json()) as OpenMeteoWeatherPayload) : null;

    const currentAq = aqJson.current ?? {};
    const pollutants = parseCurrentPollutants(currentAq);
    const cpcb = calculateCpcbAqi(pollutants);
    const usComputed = calculateUsAqiFromParticulates(pollutants.pm25, pollutants.pm10);
    const usAqi = sanitizeMeasurement(currentAq.us_aqi, 500) ?? usComputed.aqi;

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const measuredAt = currentAq.time ? new Date(currentAq.time).toISOString() : nowIso;

    const hourly = buildHourlySeries(aqJson, wxJson, nowMs);
    const daily = buildDailyForecast(aqJson, wxJson, nowIso.slice(0, 10));
    const visibilityKm = findNearestVisibilityKm(
      wxJson?.hourly?.time ?? [],
      wxJson?.hourly?.visibility ?? [],
      nowMs
    );

    const snapshot: EnvironmentalSnapshot = {
      location,
      dataStatus: 'LIVE',
      statusMessage: 'Live regional air quality and meteorological measurements retrieved.',
      stationLabel: `${location.name} Grid (${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°)`,
      provider: 'Open-Meteo Atmospheric & Weather Feeds (CPCB/EPA Indices Computed)',
      measuredAt,
      lastSuccessfulUpdate: nowIso,
      pollutants,
      weather: {
        temperatureC: sanitizeMeasurement(wxJson?.current?.temperature_2m, 65),
        humidityPercent: sanitizeMeasurement(wxJson?.current?.relative_humidity_2m, 100),
        windSpeedKmh: sanitizeMeasurement(wxJson?.current?.wind_speed_10m, 250),
        visibilityKm,
        weatherSummary: weatherCodeToSummary(wxJson?.current?.weather_code),
      },
      cpcbAqi: cpcb.aqi,
      cpcbCategory: cpcb.category,
      dominantPollutant: cpcb.dominantPollutant,
      usAqi,
      usCategory: usComputed.category,
      whoRatios: calculateWhoRatios(pollutants),
      hourly,
      daily,
    };

    setBoundedCacheEntry(snapshotCache, cacheKey, {
      snapshot,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return snapshot;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return buildDemoFallbackSnapshot(
      location,
      `Live environmental provider unreachable (${message}). Displaying labeled demonstration fallback.`
    );
  }
}
