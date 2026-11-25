import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import type { EnvironmentalSnapshot } from '../types/airwise.ts';
import { formatSafeDateTime, formatSafeTime } from '../lib/format.ts';

interface DataStatusBannerProps {
  snapshot: EnvironmentalSnapshot;
  loading: boolean;
  onRefresh: () => void;
}

export function DataStatusBanner({ snapshot, loading, onRefresh }: DataStatusBannerProps) {
  const isInitialConnecting =
    loading && snapshot.statusMessage.startsWith('Connecting to live');
  const isDemo = !isInitialConnecting && snapshot.dataStatus === 'DEMO_FALLBACK';
  const isUnavailable = !isInitialConnecting && snapshot.dataStatus === 'UNAVAILABLE';
  const isCached = !isInitialConnecting && snapshot.dataStatus === 'CACHED';

  const formattedMeasured = formatSafeDateTime(snapshot.measuredAt);
  const formattedUpdated = formatSafeTime(snapshot.lastSuccessfulUpdate);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isDemo || isUnavailable
          ? 'border-amber-300 bg-amber-50/90 text-amber-950'
          : 'border-slate-200 bg-white text-[#102A43]'
      }`}
      role="region"
      aria-label="Environmental Data Provenance"
    >
      <div className="flex items-start gap-3">
        {isInitialConnecting ? (
          <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
        ) : isDemo || isUnavailable ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        ) : isCached ? (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        )}
        <div className="space-y-0.5 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
            <span className="font-semibold">
              {isInitialConnecting
                ? 'FETCHING LIVE ENVIRONMENTAL DATA'
                : isDemo
                  ? 'DEMO DATA (Live Feed Unavailable)'
                  : isUnavailable
                    ? 'DATA UNAVAILABLE'
                    : isCached
                      ? 'LIVE FEED (Recent Cache)'
                      : 'LIVE ENVIRONMENTAL DATA'}
            </span>
            <span className="text-slate-700">— {snapshot.stationLabel}</span>
          </div>
          <p className="text-xs text-slate-600">
            {snapshot.statusMessage} Provider: {snapshot.provider}. Observation:{' '}
            <span className="font-mono tabular-nums">{formattedMeasured}</span> · Synced:{' '}
            <span className="font-mono tabular-nums">{formattedUpdated}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#102A43] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] disabled:opacity-50 whitespace-nowrap shrink-0"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
      </button>
    </div>
  );
}
