import { useMemo } from 'react';
import type { EnvironmentalSnapshot, PollutantReadings } from '../types/airwise.ts';
import { WHO_2021_GUIDELINES } from '../lib/aqi.ts';

interface PollutantGridProps {
  pollutants: PollutantReadings;
  whoRatios: EnvironmentalSnapshot['whoRatios'];
}

/**
 * Displays measured/modeled pollutant concentrations alongside WHO 2021 health benchmark ratios.
 */
export function PollutantGrid({ pollutants, whoRatios }: PollutantGridProps) {
  const pollutantsList = useMemo(
    () => [
      {
        key: 'PM2.5',
        value: pollutants.pm25,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.pm25_24h,
        ratio: whoRatios.pm25Multiple,
      },
      {
        key: 'PM10',
        value: pollutants.pm10,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.pm10_24h,
        ratio: whoRatios.pm10Multiple,
      },
      {
        key: 'NO2',
        value: pollutants.no2,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.no2_24h,
        ratio: whoRatios.no2Multiple,
      },
      {
        key: 'SO2',
        value: pollutants.so2,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.so2_24h,
        ratio: whoRatios.so2Multiple ?? null,
      },
      {
        key: 'CO',
        value: pollutants.co,
        unit: 'mg/m³',
        whoLimit: WHO_2021_GUIDELINES.co_24h,
        ratio: whoRatios.coMultiple ?? null,
      },
      {
        key: 'O3',
        value: pollutants.o3,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.o3_8h,
        ratio: whoRatios.o3Multiple,
      },
    ],
    [pollutants, whoRatios]
  );

  return (
    <section aria-label="Pollutant Concentrations">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-[#102A43]">
          Measured & Modeled Pollutant Breakdown
        </h2>
        <span className="text-xs text-slate-600">Compared against WHO 2021 24h/8h guidelines</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pollutantsList.map((p) => {
          const exceedsWho = p.ratio !== null && p.ratio > 1;
          return (
            <div key={p.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-[#102A43]">{p.key}</span>
                <span>{p.unit}</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
                {p.value !== null ? p.value : 'N/A'}
              </p>
              <p className={`mt-1 text-[11px] ${exceedsWho ? 'font-medium text-amber-900' : 'text-slate-600'}`}>
                WHO: {p.whoLimit} {p.unit}
                {p.ratio !== null ? ` (${p.ratio}x)` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
