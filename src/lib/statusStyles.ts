import type { RoutineSlot, SmartAlert, StructuredRecommendation } from '../types/airwise.ts';

/**
 * Shared accessible Tailwind styling classes for recommendation priority badges.
 */
export const PRIORITY_BADGE_STYLES: Record<StructuredRecommendation['priority'], string> = {
  Urgent: 'bg-red-50 text-red-900 border-red-200',
  High: 'bg-amber-50 text-amber-900 border-amber-200',
  Moderate: 'bg-sky-50 text-sky-900 border-sky-200',
  Low: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

/**
 * Shared accessible Tailwind styling classes for notification alert severity tags.
 */
export const ALERT_SEVERITY_STYLES: Record<SmartAlert['severity'], string> = {
  Critical: 'bg-red-50 text-red-900 border-red-200',
  Warning: 'bg-amber-50 text-amber-900 border-amber-200',
  Advisory: 'bg-sky-50 text-sky-900 border-sky-200',
  Info: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

/**
 * Shared accessible Tailwind styling classes for routine time-slot air suitability labels.
 */
export const ROUTINE_SUITABILITY_STYLES: Record<RoutineSlot['airSuitability'], string> = {
  'Avoid Outdoor Exposure': 'bg-red-50 text-red-900 border-red-200',
  Caution: 'bg-amber-50 text-amber-900 border-amber-200',
  Suitable: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};
