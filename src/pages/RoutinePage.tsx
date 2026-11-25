import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, Download, SlidersHorizontal } from 'lucide-react';
import type { EnvironmentalSnapshot, FamilyProfile, PageId, RoutineSlot } from '../types/airwise.ts';
import {
  buildDailyRoutine,
  formatDailyRoutineMarkdown,
  formatHouseholdGroups,
} from '../lib/recommendations.ts';
import { downloadTextFile } from '../lib/download.ts';
import { slugifyCity } from '../lib/format.ts';
import { ROUTINE_SUITABILITY_STYLES } from '../lib/statusStyles.ts';
import { RecommendationCard } from '../components/RecommendationCard.tsx';
import { AqiStatusBadge } from '../components/AqiBadge.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { SafeImage } from '../components/SafeImage.tsx';

interface RoutinePageProps {
  snapshot: EnvironmentalSnapshot;
  profile: FamilyProfile;
  completedPeriods: Array<RoutineSlot['period']>;
  onTogglePeriod: (period: RoutineSlot['period']) => void;
  onNavigate: (page: PageId) => void;
}

export function RoutinePage({
  snapshot,
  profile,
  completedPeriods,
  onTogglePeriod,
  onNavigate,
}: RoutinePageProps) {
  const [announcement, setAnnouncement] = useState('');
  const slots = useMemo(() => buildDailyRoutine(snapshot, profile), [snapshot, profile]);
  const progressPct = Math.round((completedPeriods.length / slots.length) * 100);

  function handleExportPlan() {
    const markdown = formatDailyRoutineMarkdown(snapshot, profile, slots);
    downloadTextFile(
      markdown,
      `airwise-daily-routine-${slugifyCity(snapshot.location.name)}.md`,
      'text/markdown;charset=utf-8'
    );
    setAnnouncement(`Downloaded daily routine plan for ${snapshot.location.name} as Markdown.`);
  }

  function handleTogglePeriod(period: RoutineSlot['period'], isDone: boolean) {
    onTogglePeriod(period);
    setAnnouncement(
      isDone
        ? `${period} routine marked incomplete.`
        : `${period} routine marked completed.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4 sm:h-auto">
          <SafeImage
            src="/src/assets/images/hd_morning_urban_park_1795574770595.jpg"
            alt="Sunlit tree-lined urban park promenade with walkers and cyclists at sunrise"
            fallbackTitle="Daily Low-Exposure Routine"
          />
        </div>
        <div className="flex flex-col justify-between gap-4 p-1 sm:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                <span>Dynamic Schedule · {snapshot.location.name}</span>
              </div>
              <h2 className="mt-1 font-display text-lg font-bold text-[#102A43]">
                Morning-to-Night Exposure & Habit Planner
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Adapted to CPCB AQI {snapshot.cpcbAqi ?? 'N/A'}, wind {snapshot.weather.windSpeedKmh ?? 'N/A'} km/h, and household groups:{' '}
                {formatHouseholdGroups(profile.groups)}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <AqiStatusBadge category={snapshot.cpcbCategory} aqi={snapshot.cpcbAqi} />
              <button
                type="button"
                onClick={handleExportPlan}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export Plan</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Household</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Daily Routine Completion</span>
              <span className="font-mono font-semibold text-[#102A43] tabular-nums">
                {completedPeriods.length} / {slots.length} periods ({progressPct}%)
              </span>
            </div>
            <ProgressBar
              value={progressPct}
              label="Daily routine completion progress"
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {slots.map((slot) => {
          const isDone = completedPeriods.includes(slot.period);
          const suitabilityStyle = ROUTINE_SUITABILITY_STYLES[slot.airSuitability];

          return (
            <section
              key={slot.period}
              className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
              aria-label={`${slot.period} Routine`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold text-[#102A43]">{slot.period}</h3>
                    <span className="font-mono text-xs text-slate-600">{slot.timeWindow}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{slot.summary}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${suitabilityStyle}`}>
                    {slot.airSuitability}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePeriod(slot.period, isDone)}
                    aria-pressed={isDone}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                      isDone
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-300 text-[#102A43] hover:bg-slate-50'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    )}
                    <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {slot.actions.map((action) => (
                  <RecommendationCard key={action.id} item={action} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
