import { useMemo, useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import {
  simulateDailyExposureDose,
  type RespiratorGrade,
} from '../lib/exposure.ts';
import { clampFiniteNumber, parseRespiratorGrade } from '../lib/format.ts';
import { ProgressBar } from './ProgressBar.tsx';

interface ExposureSimulatorCardProps {
  locationName: string;
  outdoorPm25: number | null;
  defaultHepaActive: boolean;
}

const RESPIRATOR_OPTIONS: ReadonlyArray<{ id: RespiratorGrade; label: string }> = [
  { id: 'none', label: 'No Mask (Baseline)' },
  { id: 'surgical', label: 'Surgical Mask' },
  { id: 'n95_ffp2', label: 'N95 / FFP2 Respirator' },
];

/**
 * Interactive 24-hour PM2.5 inhalation dose simulator comparing an unmitigated
 * baseline against user-configured outdoor time, respirator grade, window sealing, and HEPA filtration.
 */
export function ExposureSimulatorCard({
  locationName,
  outdoorPm25,
  defaultHepaActive,
}: ExposureSimulatorCardProps) {
  const [outdoorHours, setOutdoorHours] = useState(2);
  const [respirator, setRespirator] = useState<RespiratorGrade>('n95_ffp2');
  const [indoorHepaActive, setIndoorHepaActive] = useState(defaultHepaActive);
  const [windowsSealed, setWindowsSealed] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  const result = useMemo(
    () =>
      simulateDailyExposureDose({
        outdoorPm25,
        outdoorHoursPerDay: outdoorHours,
        respirator,
        indoorHepaActive,
        windowsSealed,
      }),
    [outdoorPm25, outdoorHours, respirator, indoorHepaActive, windowsSealed]
  );

  function handleReset() {
    setOutdoorHours(2);
    setRespirator('n95_ffp2');
    setIndoorHepaActive(defaultHepaActive);
    setWindowsSealed(true);
    setAnnouncement('Daily PM2.5 exposure simulator reset to default settings.');
  }

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      aria-label="Interactive Daily PM2.5 Exposure Simulator"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Interactive 24-Hour Personal PM2.5 Dose Simulator
            </h2>
            <p className="text-xs text-slate-600">
              Modeled for {locationName} using outdoor PM2.5 of{' '}
              <span className="font-mono font-semibold text-[#102A43] tabular-nums">
                {result.outdoorPm25Used} µg/m³
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <div>
            <label
              htmlFor="sim-outdoor-hours"
              className="flex justify-between text-xs font-semibold text-[#102A43]"
            >
              <span>Daily Outdoor Exposure Duration</span>
              <span className="font-mono tabular-nums">{outdoorHours} hrs / day</span>
            </label>
            <input
              id="sim-outdoor-hours"
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={outdoorHours}
              aria-valuetext={`${outdoorHours} outdoor hours per day`}
              onChange={(e) =>
                setOutdoorHours(clampFiniteNumber(Number(e.target.value), 0, 12, 2))
              }
              className="mt-1.5 w-full accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            />
          </div>

          <div>
            <label
              htmlFor="sim-respirator"
              className="block text-xs font-semibold text-[#102A43]"
            >
              Outdoor Respirator / Mask Selection
            </label>
            <select
              id="sim-respirator"
              value={respirator}
              onChange={(e) => setRespirator(parseRespiratorGrade(e.target.value, respirator))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              {RESPIRATOR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-[#102A43] hover:bg-slate-50">
              <input
                type="checkbox"
                checked={indoorHepaActive}
                onChange={(e) => setIndoorHepaActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              />
              <span>Indoor True-HEPA Purifier</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-[#102A43] hover:bg-slate-50">
              <input
                type="checkbox"
                checked={windowsSealed}
                onChange={(e) => setWindowsSealed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              />
              <span>Windows Sealed During Smog</span>
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-[#F4F8FB] p-4 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Estimated 24h Dose Reduction
            </span>
            <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
              −{result.reductionPercent}% · {result.protectionTier}
            </span>
          </div>

          <ProgressBar
            value={result.reductionPercent}
            label="Estimated daily PM2.5 inhalation reduction"
          />

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <span className="block text-[11px] text-slate-600">Unmitigated</span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-slate-700 tabular-nums">
                {result.unmitigatedDailyDoseUg} µg
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <span className="block text-[11px] text-slate-600">Protected Dose</span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-emerald-700 tabular-nums">
                {result.protectedDailyDoseUg} µg
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <span className="block text-[11px] text-slate-600">Effective Avg</span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-[#102A43] tabular-nums">
                {result.effectiveAveragePm25} µg/m³
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">
            Effective 24-hour mean equals{' '}
            <span className="font-mono font-semibold text-[#102A43] tabular-nums">
              {result.who24hMultipleEquivalent}x
            </span>{' '}
            of WHO 24h benchmark (15 µg/m³). {result.assumptionsNote}
          </p>
        </div>
      </div>
    </section>
  );
}
