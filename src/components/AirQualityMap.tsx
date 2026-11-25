import { useEffect, useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import type { CityLocation } from '../types/airwise.ts';
import { PRESET_CITIES } from '../data/presets.ts';
import { getMapStationsForMode, type MapRegionMode } from '../lib/map.ts';
import { useTabNavigation } from '../hooks/useTabNavigation.ts';

interface AirQualityMapProps {
  currentLocation: CityLocation;
  cpcbAqi: number | null;
  cpcbCategory: string;
  onSelectLocation: (loc: CityLocation) => void;
}

const MAP_MODES: readonly MapRegionMode[] = ['INDIA', 'WORLD'];

export function AirQualityMap({
  currentLocation,
  cpcbAqi,
  cpcbCategory,
  onSelectLocation,
}: AirQualityMapProps) {
  const [regionMode, setRegionMode] = useState<MapRegionMode>(
    currentLocation.isIndia ? 'INDIA' : 'WORLD'
  );

  // Sync map view automatically when user picks a city outside the current region view
  useEffect(() => {
    setRegionMode(currentLocation.isIndia ? 'INDIA' : 'WORLD');
  }, [currentLocation.id, currentLocation.isIndia]);

  const { getTabProps, getPanelProps } = useTabNavigation(
    MAP_MODES,
    regionMode,
    setRegionMode
  );

  const projectedPins = useMemo(
    () => getMapStationsForMode(PRESET_CITIES, currentLocation, regionMode),
    [currentLocation, regionMode]
  );
  const quickStations = useMemo(
    () => (regionMode === 'INDIA' ? PRESET_CITIES.filter((c) => c.isIndia) : PRESET_CITIES),
    [regionMode]
  );

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5"
      aria-label="Interactive Monitoring Station Map"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Interactive Air-Quality Monitoring Map
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Select any monitoring hub pin to inspect live local atmospheric and weather telemetry
          </p>
        </div>

        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          role="tablist"
          aria-label="Map region view"
        >
          {MAP_MODES.map((mode, idx) => {
            const active = regionMode === mode;
            const tabProps = getTabProps(mode, idx, 'map-region');
            return (
              <button
                key={mode}
                type="button"
                {...tabProps}
                onClick={() => setRegionMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                  active ? 'bg-white text-[#102A43] shadow-xs' : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                {mode === 'INDIA' ? 'India Grid' : 'Global View'}
              </button>
            );
          })}
        </div>
      </div>

      <div
        {...getPanelProps('map-region')}
        className="relative mt-4 h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-[#F4F8FB] via-[#EAF3FA] to-[#E6F7F2]"
      >
        {/* Coordinate Graticule & Geographic Silhouette SVG */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[20, 40, 60, 80].map((pos) => (
            <g key={pos}>
              <line x1={pos} y1="0" x2={pos} y2="100" stroke="#CBD5E1" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
              <line x1="0" y1={pos} x2="100" y2={pos} stroke="#CBD5E1" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
            </g>
          ))}
          {regionMode === 'INDIA' ? (
            <path
              d="M 37 11 L 43 13 L 47 24 L 62 28 L 76 26 L 88 28 L 84 37 L 74 36 L 70 41 L 59 52 L 49 62 L 45 71 L 41 74 L 36 69 L 31 57 L 28 48 L 25 40 L 17 39 L 21 31 L 31 23 Z"
              fill="#FFFFFF"
              fillOpacity="0.72"
              stroke="#94A3B8"
              strokeWidth="0.4"
            />
          ) : (
            <g fill="#FFFFFF" fillOpacity="0.72" stroke="#94A3B8" strokeWidth="0.35">
              <path d="M 8 18 L 28 16 L 30 34 L 18 44 L 10 32 Z" />
              <path d="M 44 16 L 60 14 L 62 28 L 46 30 Z" />
              <path d="M 60 22 L 90 22 L 92 48 L 72 56 L 62 42 Z" />
              <path d="M 46 34 L 58 36 L 56 64 L 46 58 Z" />
            </g>
          )}
        </svg>

        {/* Precision Station Markers with Directional Non-Overlapping Labels */}
        {projectedPins.map(({ station, x, y, labelAnchor }) => {
          const isActive = station.id === currentLocation.id;
          return (
            <button
              key={station.id}
              type="button"
              onClick={() => onSelectLocation(station)}
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`Select ${station.name}, ${station.country} (${station.latitude.toFixed(1)}°, ${station.longitude.toFixed(1)}°)`}
              aria-pressed={isActive}
              className={`group absolute -translate-y-1/2 focus-visible:outline-none ${
                labelAnchor === 'left' ? '-translate-x-full pl-2' : 'translate-x-0 pr-2'
              } ${isActive ? 'z-20' : 'z-10 hover:z-30'}`}
            >
              <span
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-xs transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[#38BDF8] ${
                  labelAnchor === 'left' ? 'flex-row-reverse' : 'flex-row'
                } ${
                  isActive
                    ? 'border-[#102A43] bg-[#102A43] text-white'
                    : 'border-slate-300 bg-white/95 text-[#102A43] hover:border-[#38BDF8]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ${
                    isActive
                      ? 'bg-[#20C997] ring-[#20C997]/30'
                      : 'bg-[#38BDF8] ring-[#38BDF8]/25'
                  }`}
                />
                <span className="whitespace-nowrap">{station.name}</span>
                {isActive && (
                  <span className="font-mono text-[10px] text-[#20C997] tabular-nums whitespace-nowrap">
                    {cpcbAqi ?? '—'} · {cpcbCategory}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        <div className="pointer-events-none absolute bottom-2.5 left-3 rounded-md border border-slate-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-mono text-slate-700 tabular-nums">
          Active Station: {currentLocation.name} ({currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°)
        </div>
      </div>

      {/* Accessible Quick Hub Strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Quick hub selector">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Hubs:
        </span>
        {quickStations.map((station) => {
          const isActive = station.id === currentLocation.id;
          return (
            <button
              key={station.id}
              type="button"
              onClick={() => onSelectLocation(station)}
              aria-pressed={isActive}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                isActive
                  ? 'border-[#102A43] bg-[#102A43] text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#38BDF8] hover:bg-white'
              }`}
            >
              {station.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
