import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Cloud, Download, Droplets, Eye, ShieldCheck, Table, Thermometer, Wind } from 'lucide-react';
import type { EnvironmentalSnapshot, FamilyProfile, PageId } from '../types/airwise.ts';
import { CPCB_CATEGORY_SCALE, getCpcbCategoryMeta, WHO_2021_GUIDELINES } from '../lib/aqi.ts';
import { analyzePollutionInsights } from '../lib/recommendations.ts';
import { estimatePersonalExposurePlan, findOptimalVentilationWindow } from '../lib/exposure.ts';
import { buildCsvString, downloadTextFile } from '../lib/download.ts';
import { slugifyCity } from '../lib/format.ts';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { DataStatusBanner } from '../components/DataStatusBanner.tsx';
import { AqiStatusBadge } from '../components/AqiBadge.tsx';
import { AirQualityMap } from '../components/AirQualityMap.tsx';
import { AccessibleHourlyTable } from '../components/AccessibleHourlyTable.tsx';
import { SafeImage } from '../components/SafeImage.tsx';

interface DashboardPageProps {
  snapshot: EnvironmentalSnapshot;
  profile: FamilyProfile;
  loading: boolean;
  indoorProgressPercent: number;
  sustainabilityScore: number;
  weeklyCo2SavedKg: number;
  onSelectLocation: (loc: EnvironmentalSnapshot['location']) => void;
  onRefresh: () => void;
  onNavigate: (page: PageId) => void;
}

export function DashboardPage({
  snapshot,
  profile,
  loading,
  indoorProgressPercent,
  sustainabilityScore,
  weeklyCo2SavedKg,
  onSelectLocation,
  onRefresh,
  onNavigate,
}: DashboardPageProps) {
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);
  const [showDistTable, setShowDistTable] = useState(false);

  const meta = useMemo(() => getCpcbCategoryMeta(snapshot.cpcbCategory), [snapshot.cpcbCategory]);
  const insights = useMemo(() => analyzePollutionInsights(snapshot), [snapshot]);
  const ventilationPlan = useMemo(() => findOptimalVentilationWindow(snapshot), [snapshot]);
  const exposurePlan = useMemo(
    () => estimatePersonalExposurePlan(snapshot, profile, indoorProgressPercent),
    [snapshot, profile, indoorProgressPercent]
  );
  const preferUs = profile.preferredStandard === 'US_EPA';

  const pollutantsList = useMemo(
    () => [
      {
        key: 'PM2.5',
        value: snapshot.pollutants.pm25,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.pm25_24h,
        ratio: snapshot.whoRatios.pm25Multiple,
      },
      {
        key: 'PM10',
        value: snapshot.pollutants.pm10,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.pm10_24h,
        ratio: snapshot.whoRatios.pm10Multiple,
      },
      {
        key: 'NO2',
        value: snapshot.pollutants.no2,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.no2_24h,
        ratio: snapshot.whoRatios.no2Multiple,
      },
      {
        key: 'SO2',
        value: snapshot.pollutants.so2,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.so2_24h,
        ratio: snapshot.whoRatios.so2Multiple ?? null,
      },
      {
        key: 'CO',
        value: snapshot.pollutants.co,
        unit: 'mg/m³',
        whoLimit: WHO_2021_GUIDELINES.co_24h,
        ratio: snapshot.whoRatios.coMultiple ?? null,
      },
      {
        key: 'O3',
        value: snapshot.pollutants.o3,
        unit: 'µg/m³',
        whoLimit: WHO_2021_GUIDELINES.o3_8h,
        ratio: snapshot.whoRatios.o3Multiple,
      },
    ],
    [snapshot.pollutants, snapshot.whoRatios]
  );

  const chartData = useMemo(
    () =>
      snapshot.hourly.map((h) => ({
        label: h.label,
        pm25: h.pm25,
        pm10: h.pm10,
        cpcbAqi: h.cpcbAqi,
        phase: h.isForecast ? 'Forecast' : 'Observed',
      })),
    [snapshot.hourly]
  );

  function handleExportCsv() {
    const csv = buildCsvString(
      ['Timestamp', 'Label', 'Phase', 'PM2.5 (ug/m3)', 'PM10 (ug/m3)', 'CPCB AQI', 'US AQI', 'Wind (km/h)'],
      snapshot.hourly.map((h) => [
        h.time,
        h.label,
        h.isForecast ? 'Forecast' : 'Observed',
        h.pm25,
        h.pm10,
        h.cpcbAqi,
        h.usAqi,
        h.windSpeedKmh,
      ])
    );
    downloadTextFile(
      csv,
      `airwise-${slugifyCity(snapshot.location.name)}-48h-telemetry.csv`,
      'text/csv;charset=utf-8'
    );
  }

  return (
    <div className="space-y-6">
      <LocationSelector currentLocation={snapshot.location} onSelectLocation={onSelectLocation} />

      <DataStatusBanner snapshot={snapshot} loading={loading} onRefresh={onRefresh} />

      {/* HD Telemetry Skyline Visual Header */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12" aria-label="Air Quality Summary">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {preferUs
                  ? `Preferred Standard: US EPA AQI (0–500) · CPCB Dominant Pollutant: ${snapshot.dominantPollutant}`
                  : `Preferred Standard: Indian CPCB NAQI (0–500) · Dominant Pollutant: ${snapshot.dominantPollutant}`}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-4">
                <span className="font-mono text-5xl font-bold tracking-tight text-[#102A43] tabular-nums">
                  {preferUs ? (snapshot.usAqi ?? '—') : (snapshot.cpcbAqi ?? '—')}
                </span>
                {preferUs ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-[#102A43]">
                    <span>{snapshot.usCategory}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-xs text-slate-600">US EPA</span>
                  </div>
                ) : (
                  <AqiStatusBadge category={snapshot.cpcbCategory} aqi={snapshot.cpcbAqi} />
                )}
              </div>
              <p className="mt-3 text-sm text-slate-700">{meta.healthSummary}</p>
            </div>
          </div>

          {/* 6-Category CPCB Reference Bar */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold text-slate-600">Official CPCB / NAQI Categories</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-6">
              {CPCB_CATEGORY_SCALE.map((cat) => {
                const isCurrent = snapshot.cpcbCategory === cat.name;
                return (
                  <div
                    key={cat.name}
                    className={`rounded-md border px-2 py-1.5 ${
                      isCurrent ? 'border-[#102A43] bg-slate-50 font-semibold' : 'border-slate-200'
                    }`}
                  >
                    <div className={`mb-1 h-1.5 w-full rounded-full ${cat.barClass}`} aria-hidden="true" />
                    <div className="text-[#102A43] truncate">{cat.name}</div>
                    <div className="font-mono text-slate-600 tabular-nums">{cat.range}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Standard Comparison & Weather */}
        <div className="grid grid-cols-1 gap-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-sm font-bold text-[#102A43]">
              Index Comparison: CPCB vs US AQI vs WHO
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div
                className={`rounded-lg p-3 ${
                  !preferUs ? 'border border-[#102A43]/30 bg-[#EAF3FA]' : 'bg-[#F4F8FB]'
                }`}
              >
                <span className="block text-[11px] font-medium text-slate-600">Indian CPCB</span>
                <span className="mt-1 block font-mono text-xl font-bold text-[#102A43] tabular-nums">
                  {snapshot.cpcbAqi ?? 'N/A'}
                </span>
                <span className="text-[11px] text-slate-700">{snapshot.cpcbCategory}</span>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  preferUs ? 'border border-[#102A43]/30 bg-[#EAF3FA]' : 'bg-[#F4F8FB]'
                }`}
              >
                <span className="block text-[11px] font-medium text-slate-600">US EPA AQI</span>
                <span className="mt-1 block font-mono text-xl font-bold text-[#102A43] tabular-nums">
                  {snapshot.usAqi ?? 'N/A'}
                </span>
                <span className="text-[11px] leading-tight text-slate-700 block">{snapshot.usCategory}</span>
              </div>
              <div className="rounded-lg bg-[#F4F8FB] p-3">
                <span className="block text-[11px] font-medium text-slate-600">WHO PM2.5</span>
                <span className="mt-1 block font-mono text-xl font-bold text-[#102A43] tabular-nums">
                  {snapshot.whoRatios.pm25Multiple !== null ? `${snapshot.whoRatios.pm25Multiple}x` : 'N/A'}
                </span>
                <span className="text-[11px] text-slate-700">of 15 µg/m³</span>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-slate-600">
              US AQI uses stricter 2024 PM2.5 breakpoints and a 0–500 scale peaking earlier than CPCB NAQI; WHO guidelines represent 24-hour health benchmarks.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#102A43]">Current Weather Context</h2>
              <span className="text-xs text-slate-600">{snapshot.weather.weatherSummary}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-[11px] text-slate-600">Temp</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {snapshot.weather.temperatureC !== null ? `${snapshot.weather.temperatureC}°C` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-700 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-[11px] text-slate-600">Humidity</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {snapshot.weather.humidityPercent !== null ? `${snapshot.weather.humidityPercent}%` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-[11px] text-slate-600">Wind</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {snapshot.weather.windSpeedKmh !== null ? `${snapshot.weather.windSpeedKmh} km/h` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-700 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-[11px] text-slate-600">Visibility</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {snapshot.weather.visibilityKm !== null ? `${snapshot.weather.visibilityKm} km` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HD Regional Station Visual Strip */}
      <section className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4">
          <SafeImage
            src="/src/assets/images/hd_air_monitoring_skyline_1795574770450.jpg"
            alt="Rooftop environmental monitoring station overlooking a sunlit city skyline"
            fallbackTitle="Urban Atmospheric Telemetry"
          />
        </div>
        <div className="sm:col-span-8">
          <p className="text-xs font-semibold text-emerald-700">Station Context · {snapshot.location.name}</p>
          <h2 className="mt-0.5 font-display text-sm font-bold text-[#102A43]">
            Six-Pollutant Telemetry & WHO 2021 Benchmark Ratios
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Concentrations below are retrieved from atmospheric monitoring feeds for {snapshot.location.name} ({snapshot.location.latitude.toFixed(2)}°, {snapshot.location.longitude.toFixed(2)}°) and compared directly with WHO 2021 24-hour and 8-hour health benchmarks.
          </p>
        </div>
      </section>

      {/* 6 Pollutants Grid */}
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

      {/* Household Readiness KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Household Action Metrics">
        <button
          type="button"
          onClick={() => onNavigate('indoor')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-[#38BDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
        >
          <p className="text-xs font-semibold text-slate-600">Indoor Air Checklist Progress</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
            {indoorProgressPercent}%
          </p>
          <p className="mt-1 text-xs text-slate-600">Review bedroom, kitchen & purifier tasks</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('sustainability')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-[#20C997] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
        >
          <p className="text-xs font-semibold text-slate-600">Household Sustainability Score</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
            {sustainabilityScore} / 100
          </p>
          <p className="mt-1 text-xs text-slate-600">Based on adopted low-emission habits</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('calculator')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-[#38BDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
        >
          <p className="text-xs font-semibold text-slate-600">Estimated Weekly Carbon Savings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {weeklyCo2SavedKg.toFixed(1)} kg CO2e
          </p>
          <p className="mt-1 text-xs text-slate-600">Open calculator for annual & community impact</p>
        </button>
      </section>

      {/* Personal Exposure Mitigation & Optimal Ventilation Window */}
      <section
        className="grid grid-cols-1 gap-5 lg:grid-cols-2"
        aria-label="Personal Exposure Reduction and Safe Ventilation Window"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-[#102A43]">
                Personal PM2.5 Exposure Mitigation Estimate
              </h2>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
              −{exposurePlan.estimatedReductionPercentRange[0]}% to{' '}
              {exposurePlan.estimatedReductionPercentRange[1]}% ({exposurePlan.protectionTier})
            </span>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-700">
            {exposurePlan.activeMeasures.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {exposurePlan.missingHighImpactActions.length > 0 && (
            <p className="mt-2.5 text-xs text-amber-900">
              <strong>Next safeguard:</strong> {exposurePlan.missingHighImpactActions[0]}
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-600">{exposurePlan.disclaimer}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-[#102A43]">
                Optimal 2-Hour Ventilation Window
              </h2>
            </div>
            <span className="font-mono text-xs font-bold text-[#102A43] tabular-nums">
              {ventilationPlan.windowLabel} · {ventilationPlan.suitability}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-700">{ventilationPlan.guidance}</p>
          <p className="mt-2 text-[11px] text-slate-600">
            <strong>Limitation:</strong> {ventilationPlan.limitation}
          </p>
        </div>
      </section>

      {/* Charts: PM2.5 & PM10 Historical + Forecast Trend & Category Distribution */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label="Pollution Trends and Distribution">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#102A43]">
                48-Hour Particulate Trend (Observed + Provider Forecast)
              </h2>
              <p className="text-xs text-slate-600">
                Hourly PM2.5 and PM10 concentrations in µg/m³ ({snapshot.location.name})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAccessibleTable((v) => !v)}
                aria-expanded={showAccessibleTable}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
              >
                <Table className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{showAccessibleTable ? 'Hide Data Table' : 'Accessible Table'}</span>
              </button>
            </div>
          </div>

          <figure className="mt-4">
            <figcaption className="sr-only">
              48-hour hourly area chart of PM2.5 and PM10 particulate concentrations in {snapshot.location.name}. Toggle Accessible Table for numeric values.
            </figcaption>
            <div className="h-64 w-full" role="img" aria-label={`48-hour PM2.5 and PM10 chart for ${snapshot.location.name}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" µg" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      borderColor: '#CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pm10"
                    name="PM10 (µg/m³)"
                    stroke="#38BDF8"
                    fill="#38BDF8"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="pm25"
                    name="PM2.5 (µg/m³)"
                    stroke="#102A43"
                    fill="#20C997"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </figure>

          {showAccessibleTable && (
            <AccessibleHourlyTable
              rows={chartData}
              mode="particulates"
              caption={`48-hour PM2.5, PM10, and CPCB AQI readings for ${snapshot.location.name}`}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#102A43]">
                AQI Category Distribution
              </h2>
              <p className="text-xs text-slate-600">Hours per CPCB category in 48h window</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDistTable((v) => !v)}
              aria-expanded={showDistTable}
              aria-label="Toggle category distribution table"
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              {showDistTable ? 'Chart' : 'Table'}
            </button>
          </div>

          {showDistTable ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Hours spent in each CPCB AQI category over 48 hours</caption>
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {insights.categoryDistribution.map((row) => (
                    <tr key={row.category}>
                      <td className="px-3 py-1.5 font-sans text-[#102A43]">{row.category}</td>
                      <td className="px-3 py-1.5 text-right">{row.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 h-48 w-full" role="img" aria-label="48-hour CPCB category distribution bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.categoryDistribution} layout="vertical" margin={{ left: 10, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#102A43' }} width={86} />
                  <Tooltip />
                  <Bar dataKey="hours" name="Hours" radius={[0, 4, 4, 0]}>
                    {insights.categoryDistribution.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-[#102A43]">3-Day Daily Outlook</p>
            {snapshot.daily.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{day.label}</span>
                <span className="font-mono text-slate-600 tabular-nums">
                  {day.avgPm25 !== null ? `${day.avgPm25} µg/m³` : 'N/A'}
                </span>
                <span className="font-semibold text-[#102A43]">{day.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AirQualityMap
        currentLocation={snapshot.location}
        cpcbAqi={snapshot.cpcbAqi}
        cpcbCategory={snapshot.cpcbCategory}
        onSelectLocation={onSelectLocation}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Cloud className="h-4 w-4 text-sky-700" aria-hidden="true" />
          <span>Need tailored family advice for {snapshot.location.name}?</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('routine')}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            View Daily Routine
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="rounded-lg bg-[#102A43] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            Ask AI Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
