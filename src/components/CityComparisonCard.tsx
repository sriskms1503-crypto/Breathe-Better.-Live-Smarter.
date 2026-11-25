import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { PRESET_CITIES, buildDemoFallbackSnapshot } from '../data/presets.ts';
import type { EnvironmentalSnapshot } from '../types/airwise.ts';
import { compareCitySnapshots, findOptimalVentilationWindow } from '../lib/exposure.ts';
import { fetchAirQualitySnapshot } from '../lib/airQualityClient.ts';

interface CityComparisonCardProps {
  primarySnapshot: EnvironmentalSnapshot;
}

/**
 * Fetches live atmospheric telemetry for a secondary preset city and displays
 * side-by-side CPCB, US EPA, PM2.5, wind dispersion, and ventilation comparisons.
 */
export function CityComparisonCard({ primarySnapshot }: CityComparisonCardProps) {
  const candidateCities = useMemo(
    () => PRESET_CITIES.filter((c) => c.id !== primarySnapshot.location.id),
    [primarySnapshot.location.id]
  );

  const defaultCityId = candidateCities.find((c) => c.id === 'bengaluru-in')?.id ?? candidateCities[0]?.id ?? '';
  const [targetCityId, setTargetCityId] = useState(defaultCityId);
  const [secondarySnapshot, setSecondarySnapshot] = useState<EnvironmentalSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateCities.some((c) => c.id === targetCityId) && candidateCities[0]) {
      setTargetCityId(candidateCities[0].id);
    }
  }, [candidateCities, targetCityId]);

  const targetCity = useMemo(
    () => candidateCities.find((c) => c.id === targetCityId) ?? candidateCities[0],
    [candidateCities, targetCityId]
  );

  useEffect(() => {
    if (!targetCity) return;
    const controller = new AbortController();

    async function loadBenchmark() {
      setLoading(true);
      try {
        const snapshot = await fetchAirQualitySnapshot(
          targetCity,
          controller.signal,
          'Comparison payload incomplete; showing offline reference snapshot.'
        );
        if (!controller.signal.aborted) {
          setSecondarySnapshot(snapshot);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setSecondarySnapshot(
            buildDemoFallbackSnapshot(
              targetCity,
              'Comparison station unreachable; showing offline reference snapshot.'
            )
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBenchmark();
    return () => controller.abort();
  }, [targetCity]);

  const comparison = useMemo(
    () => (secondarySnapshot ? compareCitySnapshots(primarySnapshot, secondarySnapshot) : null),
    [primarySnapshot, secondarySnapshot]
  );

  const primaryVent = useMemo(() => findOptimalVentilationWindow(primarySnapshot), [primarySnapshot]);
  const secondaryVent = useMemo(
    () => (secondarySnapshot ? findOptimalVentilationWindow(secondarySnapshot) : null),
    [secondarySnapshot]
  );

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      aria-label="Live City-to-City Air Quality Comparison"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-sky-700" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Live City-to-City Benchmark Comparison
            </h2>
            <p className="text-xs text-slate-600">
              Compare {primarySnapshot.location.name} side-by-side with another monitored hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="compare-city-select" className="text-xs font-semibold text-slate-600">
            Benchmark City
          </label>
          <select
            id="compare-city-select"
            value={targetCity?.id ?? ''}
            onChange={(e) => setTargetCityId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            {candidateCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.countryCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !secondarySnapshot ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600" role="status">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Fetching benchmark telemetry for {targetCity?.name}...</span>
        </div>
      ) : secondarySnapshot && comparison ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg bg-[#F4F8FB] px-3.5 py-2.5 text-xs font-medium text-[#102A43]">
            {comparison.summaryText}
            {loading ? ' (Refreshing...)' : ''}
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Side-by-side atmospheric comparison between {primarySnapshot.location.name} and {secondarySnapshot.location.name}
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Metric</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {primarySnapshot.location.name}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {secondarySnapshot.location.name}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">Indian CPCB AQI</th>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {primarySnapshot.cpcbAqi ?? '—'} ({primarySnapshot.cpcbCategory})
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {secondarySnapshot.cpcbAqi ?? '—'} ({secondarySnapshot.cpcbCategory})
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                    {comparison.cpcbDelta !== null
                      ? `${comparison.cpcbDelta > 0 ? '+' : ''}${comparison.cpcbDelta}`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">US EPA AQI</th>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {primarySnapshot.usAqi ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {secondarySnapshot.usAqi ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                    {comparison.usAqiDelta !== null
                      ? `${comparison.usAqiDelta > 0 ? '+' : ''}${comparison.usAqiDelta}`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">PM2.5 (µg/m³)</th>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {primarySnapshot.pollutants.pm25 ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {secondarySnapshot.pollutants.pm25 ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                    {comparison.pm25Ratio !== null ? `${comparison.pm25Ratio}x` : '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">Wind Dispersion (km/h)</th>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {primarySnapshot.weather.windSpeedKmh ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {secondarySnapshot.weather.windSpeedKmh ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                    {comparison.windDeltaKmh !== null
                      ? `${comparison.windDeltaKmh > 0 ? '+' : ''}${comparison.windDeltaKmh}`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">Best Ventilation Window</th>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {primaryVent.suitability}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {secondaryVent?.suitability ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {secondarySnapshot.dataStatus}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
