import { useMemo } from 'react';
import { Cloud, ShieldCheck, Wind } from 'lucide-react';
import type { EnvironmentalSnapshot, FamilyProfile, PageId } from '../types/airwise.ts';
import { analyzePollutionInsights } from '../lib/recommendations.ts';
import { estimatePersonalExposurePlan, findOptimalVentilationWindow } from '../lib/exposure.ts';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { DataStatusBanner } from '../components/DataStatusBanner.tsx';
import { DashboardAqiSummary } from '../components/DashboardAqiSummary.tsx';
import { PollutantGrid } from '../components/PollutantGrid.tsx';
import { DashboardTrendsSection } from '../components/DashboardTrendsSection.tsx';
import { ExposureSimulatorCard } from '../components/ExposureSimulatorCard.tsx';
import { AirQualityMap } from '../components/AirQualityMap.tsx';
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

/**
 * Primary Air Quality & Environmental Telemetry Dashboard view.
 */
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
  const insights = useMemo(() => analyzePollutionInsights(snapshot), [snapshot]);
  const ventilationPlan = useMemo(() => findOptimalVentilationWindow(snapshot), [snapshot]);
  const exposurePlan = useMemo(
    () => estimatePersonalExposurePlan(snapshot, profile, indoorProgressPercent),
    [snapshot, profile, indoorProgressPercent]
  );

  return (
    <div className="space-y-6">
      <LocationSelector currentLocation={snapshot.location} onSelectLocation={onSelectLocation} />

      <DataStatusBanner snapshot={snapshot} loading={loading} onRefresh={onRefresh} />

      <DashboardAqiSummary
        snapshot={snapshot}
        preferUs={profile.preferredStandard === 'US_EPA'}
      />

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

      <PollutantGrid pollutants={snapshot.pollutants} whoRatios={snapshot.whoRatios} />

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

      <ExposureSimulatorCard
        locationName={snapshot.location.name}
        outdoorPm25={snapshot.pollutants.pm25}
        defaultHepaActive={profile.hasPurifier}
      />

      <DashboardTrendsSection
        snapshot={snapshot}
        categoryDistribution={insights.categoryDistribution}
      />

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
