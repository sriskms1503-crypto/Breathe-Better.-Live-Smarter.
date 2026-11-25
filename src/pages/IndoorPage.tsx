import { useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, ShieldCheck, Square, Wind } from 'lucide-react';
import type { EnvironmentalSnapshot, IndoorRoomTask } from '../types/airwise.ts';
import { findOptimalVentilationWindow } from '../lib/exposure.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { useTabNavigation } from '../hooks/useTabNavigation.ts';

interface IndoorPageProps {
  snapshot: EnvironmentalSnapshot;
  tasks: IndoorRoomTask[];
  onToggleTask: (id: string) => void;
}

const ROOM_FILTERS: ReadonlyArray<'All' | IndoorRoomTask['room']> = [
  'All',
  'Bedroom',
  'Living room',
  'Kitchen',
  "Children's room",
  'Workspace',
];

export function IndoorPage({ snapshot, tasks, onToggleTask }: IndoorPageProps) {
  const [selectedRoom, setSelectedRoom] = useState<'All' | IndoorRoomTask['room']>('All');

  const { getTabProps, getPanelProps } = useTabNavigation(
    ROOM_FILTERS,
    selectedRoom,
    setSelectedRoom
  );

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const outdoorAqi = snapshot.cpcbAqi ?? 120;
  const safeToVentilate = outdoorAqi <= 100;
  const ventilationPlan = useMemo(() => findOptimalVentilationWindow(snapshot), [snapshot]);

  const visibleTasks = useMemo(
    () => (selectedRoom === 'All' ? tasks : tasks.filter((t) => t.room === selectedRoom)),
    [tasks, selectedRoom]
  );

  return (
    <div className="space-y-6">
      <span className="sr-only" aria-live="polite">
        {completedCount} of {tasks.length} indoor air actions completed ({progressPct}%)
      </span>

      {/* Ventilation & Purifier Summary */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Wind className="h-4 w-4" aria-hidden="true" />
            <span>Ventilation Decision Engine · {snapshot.location.name}</span>
          </div>
          <h2 className="mt-2 font-display text-xl font-bold text-[#102A43]">
            {safeToVentilate
              ? 'Cross-ventilation is currently suitable'
              : 'Keep exterior windows sealed against outdoor particulates'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {safeToVentilate
              ? `Outdoor CPCB AQI is ${outdoorAqi} (${snapshot.cpcbCategory}). Opening opposite windows for 15–20 minutes helps dilute indoor CO2 and cooking fumes without bringing in heavy smog.`
              : `Outdoor CPCB AQI is ${outdoorAqi} (${snapshot.cpcbCategory}). Leaving windows open draws fine PM2.5 indoors. Rely on mechanical HEPA filtration, range hood exhaust while cooking, and damp microfiber cleaning.`}
          </p>
          <p className="mt-2.5 rounded-lg bg-[#F4F8FB] px-3 py-2 text-xs text-[#102A43]">
            <strong>Best Forecast Window ({ventilationPlan.windowLabel}):</strong>{' '}
            {ventilationPlan.guidance}
          </p>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div>
                <p className="font-semibold">Scientific Note on Indoor Plants</p>
                <p className="mt-0.5">
                  Indoor houseplants support wellbeing, but controlled chamber studies show plants alone cannot remove dangerous PM2.5 particulates or winter smog at realistic home air-exchange rates. Use true HEPA filtration and source control instead.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Home Protection Progress
            </h2>
            <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-4xl font-bold text-[#102A43] tabular-nums">
            {progressPct}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {completedCount} of {tasks.length} indoor air actions completed
          </p>
          <ProgressBar
            value={progressPct}
            label="Indoor air protection progress"
            heightClass="h-2.5"
            className="mt-3"
          />

          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-600">Target Indoor Humidity</dt>
              <dd className="font-mono font-semibold text-[#102A43]">40% – 55% RH</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Pre-Filter Vacuuming</dt>
              <dd className="font-mono font-semibold text-[#102A43]">Every 14 Days</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Indoor Combustion Rule</dt>
              <dd className="font-semibold text-[#102A43]">Zero Incense / Candles</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* HD Indoor Visual & Room Filter Tabs */}
      <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4">
          <SafeImage
            src="/src/assets/images/family_clean_home_1794843520942.jpg"
            alt="Sunlit indoor living room with HEPA air purifier near window"
            fallbackTitle="Indoor Air Filtration Zone"
          />
        </div>
        <div className="sm:col-span-8">
          <h3 className="font-display text-sm font-bold text-[#102A43]">
            Room-by-Room Clean Air Execution
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Select a room below to review tailored filtration, ventilation, damp cleaning, and humidity guidance along with practical limitations.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter checklist by room">
            {ROOM_FILTERS.map((room, idx) => {
              const active = selectedRoom === room;
              const tabProps = getTabProps(room, idx, 'indoor-room');
              return (
                <button
                  key={room}
                  type="button"
                  {...tabProps}
                  onClick={() => setSelectedRoom(room)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                    active ? 'bg-[#102A43] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {room}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Room-by-Room Checklist */}
      <div
        {...getPanelProps('indoor-room')}
        className="space-y-3"
        aria-label={`${selectedRoom} indoor air tasks`}
      >
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onToggleTask(task.id)}
                aria-label={`Toggle ${task.title}`}
                aria-pressed={task.completed}
                className="mt-0.5 shrink-0 rounded p-0.5 text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                {task.completed ? (
                  <CheckSquare className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Square className="h-5 w-5 text-slate-500" aria-hidden="true" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-[#102A43]">{task.room}</span>
                  <span aria-hidden="true">·</span>
                  <span>{task.completed ? 'Completed' : 'Action Recommended'}</span>
                </div>
                <h3
                  className={`mt-1 font-display text-base font-bold ${
                    task.completed ? 'text-slate-500 line-through' : 'text-[#102A43]'
                  }`}
                >
                  {task.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-700">{task.guidance}</p>

                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-slate-600">Why It Matters: </span>
                    <span className="text-slate-700">{task.whyItMatters}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Limitation: </span>
                    <span className="text-slate-600">{task.limitation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
