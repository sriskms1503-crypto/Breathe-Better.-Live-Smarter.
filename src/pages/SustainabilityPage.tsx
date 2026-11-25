import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Info, Leaf } from 'lucide-react';
import type { EnvironmentalSnapshot, LifestyleAlternative } from '../types/airwise.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import { useTabNavigation } from '../hooks/useTabNavigation.ts';

interface SustainabilityPageProps {
  snapshot: EnvironmentalSnapshot;
  alternatives: LifestyleAlternative[];
  onToggleAdopted: (id: string) => void;
}

type HabitCategory = 'All' | 'Transport' | 'Energy' | 'Household';
const HABIT_CATEGORIES: readonly HabitCategory[] = ['All', 'Transport', 'Energy', 'Household'];

export function SustainabilityPage({
  snapshot,
  alternatives,
  onToggleAdopted,
}: SustainabilityPageProps) {
  const [categoryFilter, setCategoryFilter] = useState<HabitCategory>('All');
  const [announcement, setAnnouncement] = useState('');

  const { getTabProps, getPanelProps } = useTabNavigation(
    HABIT_CATEGORIES,
    categoryFilter,
    setCategoryFilter
  );

  const adopted = useMemo(() => alternatives.filter((a) => a.adopted), [alternatives]);
  const totalWeeklyKg = useMemo(
    () => adopted.reduce((s, a) => s + a.estimatedReductionKgPerWeek, 0),
    [adopted]
  );
  const sustainabilityScore =
    alternatives.length > 0 ? Math.min(100, Math.round((adopted.length / alternatives.length) * 100)) : 0;

  const visible = useMemo(
    () =>
      categoryFilter === 'All'
        ? alternatives
        : alternatives.filter((a) => a.category === categoryFilter),
    [alternatives, categoryFilter]
  );

  const outdoorHigh = (snapshot.cpcbAqi ?? 120) > 150;

  function handleToggleHabit(alt: LifestyleAlternative) {
    onToggleAdopted(alt.id);
    setAnnouncement(
      alt.adopted
        ? `${alt.title} removed from adopted household habits.`
        : `${alt.title} marked as adopted. Saving ${alt.estimatedReductionKgPerWeek.toFixed(2)} kg CO2e per week.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Header KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Sustainability Metrics">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Household Sustainability Score</p>
          <p className="mt-1 font-mono text-3xl font-bold text-[#102A43] tabular-nums">
            {sustainabilityScore} / 100
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {adopted.length} of {alternatives.length} low-emission habits active
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Estimated Weekly Reduction</p>
          <p className="mt-1 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
            {totalWeeklyKg.toFixed(2)} kg
          </p>
          <p className="mt-1 text-xs text-slate-600">CO2e from adopted habits</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Projected Annual Savings</p>
          <p className="mt-1 font-mono text-3xl font-bold text-[#102A43] tabular-nums">
            {(totalWeeklyKg * 52).toFixed(0)} kg
          </p>
          <p className="mt-1 text-xs text-slate-600">Based on consistent weekly practice</p>
        </div>
      </section>

      {outdoorHigh && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p>
            <strong>Air Quality Context ({snapshot.location.name}):</strong> Current CPCB AQI is{' '}
            <span className="font-mono">{snapshot.cpcbAqi}</span> ({snapshot.cpcbCategory}). When outdoor pollution is elevated, prioritize closed-cabin public transit or consolidated errands over prolonged unmasked outdoor cycling.
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4">
          <SafeImage
            src="/src/assets/images/sustainable_commute_1794843521630.jpg"
            alt="Electric light-rail tram and shaded urban cycling lane"
            fallbackTitle="Low-Emission Mobility & Energy"
          />
        </div>
        <div className="sm:col-span-8">
          <h2 className="font-display text-sm font-bold text-[#102A43]">
            Practical Low-Emission Alternatives Across Daily Life
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Every recommendation lists your baseline habit, suggested alternative, weekly CO2e reduction, transparent formula, assumptions, and confidence level.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5"
          role="tablist"
          aria-label="Filter sustainability habits"
        >
          {HABIT_CATEGORIES.map((cat, index) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                {...getTabProps(cat, index, 'sustainability-filter')}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                  active ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-600">
          Toggle habits your household is adopting to update your score
        </span>
      </div>

      {/* Alternatives List */}
      <div
        className="space-y-4"
        {...getPanelProps('sustainability-filter')}
        aria-label={`${categoryFilter} sustainability alternatives`}
      >
        {visible.map((alt) => (
          <article key={alt.id} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Leaf className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  <span className="font-semibold text-[#102A43]">{alt.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Confidence: {alt.confidenceLevel}</span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#102A43]">{alt.title}</h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  −{alt.estimatedReductionKgPerWeek.toFixed(2)} kg CO2e/wk
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleHabit(alt)}
                  aria-pressed={alt.adopted}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                    alt.adopted
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-300 bg-white text-[#102A43] hover:bg-slate-50'
                  }`}
                >
                  {alt.adopted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  )}
                  <span>{alt.adopted ? 'Adopted' : 'Adopt Habit'}</span>
                </button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-600">Current Habit</dt>
                <dd className="mt-0.5 text-sm text-slate-700">{alt.currentHabit}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-600">Recommended Alternative</dt>
                <dd className="mt-0.5 text-sm text-[#102A43]">{alt.recommendedAlternative}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-600">Calculation Methodology</dt>
                <dd className="mt-0.5 font-mono text-slate-700">{alt.methodology}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-600">Assumptions & Scope</dt>
                <dd className="mt-0.5 text-slate-600">{alt.assumptions}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
