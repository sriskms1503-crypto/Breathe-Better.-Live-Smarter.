import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Wind } from 'lucide-react';
import type { AqiCategory } from '../types/airwise.ts';
import { getCpcbCategoryMeta } from '../lib/aqi.ts';

interface AqiStatusBadgeProps {
  category: AqiCategory;
  aqi: number | null;
  standardLabel?: string;
}

export function AqiStatusBadge({ category, aqi, standardLabel = 'CPCB NAQI' }: AqiStatusBadgeProps) {
  const meta = getCpcbCategoryMeta(category);

  const Icon =
    category === 'Good'
      ? CheckCircle2
      : category === 'Satisfactory'
        ? Wind
        : category === 'Moderate'
          ? Info
          : category === 'Poor'
            ? AlertTriangle
            : ShieldAlert;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${meta.bgTintClass} ${meta.textClass} ${meta.borderClass}`}
      role="status"
      aria-label={`${standardLabel} ${aqi ?? 'Unavailable'}, Category ${category}, ${meta.accessibleSymbol}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-semibold whitespace-nowrap">{category}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span className="font-mono text-xs tabular-nums whitespace-nowrap">
        {aqi !== null ? `${aqi} (${meta.rangeLabel})` : 'N/A'}
      </span>
    </div>
  );
}
