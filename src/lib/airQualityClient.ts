import { buildDemoFallbackSnapshot } from '../data/presets.ts';
import type { CityLocation, EnvironmentalSnapshot } from '../types/airwise.ts';

/**
 * Queries the backend atmospheric feed for a city/coordinate pair and safely
 * unwraps the response snapshot, falling back to an explicitly labeled demo
 * snapshot on network failure or incomplete responses.
 */
export async function fetchAirQualitySnapshot(
  location: CityLocation,
  signal?: AbortSignal,
  fallbackReason?: string
): Promise<EnvironmentalSnapshot> {
  const qs = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    name: location.name,
    region: location.region,
    country: location.country,
    countryCode: location.countryCode,
    timezone: location.timezone,
  });

  const res = await fetch(`/api/air-quality?${qs.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as { snapshot?: EnvironmentalSnapshot };
  if (data.snapshot && typeof data.snapshot === 'object') {
    return data.snapshot;
  }

  return buildDemoFallbackSnapshot(location, fallbackReason);
}

/**
 * Searches matching global/Indian cities via the backend geocoding proxy.
 */
export async function searchCityLocations(
  query: string,
  signal?: AbortSignal
): Promise<{ results: CityLocation[]; error?: string }> {
  const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  const data = (await res.json()) as { results?: CityLocation[]; error?: string };
  if (!res.ok) {
    return { results: [], error: data.error ?? 'Search failed.' };
  }
  return {
    results: Array.isArray(data.results) ? data.results : [],
  };
}
