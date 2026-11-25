import type { EnvironmentalSnapshot, FamilyProfile } from '../types/airwise.ts';

export interface VentilationWindowPlan {
  suitability: 'Suitable' | 'Brief Only' | 'Mechanical Filtration Only' | 'Insufficient Data';
  windowLabel: string;
  avgAqi: number | null;
  avgPm25: number | null;
  avgWindKmh: number | null;
  guidance: string;
  limitation: string;
}

export interface PersonalExposureEstimate {
  estimatedReductionPercentRange: [number, number];
  protectionTier: 'Strong Protection' | 'Moderate Protection' | 'Baseline Vulnerability';
  activeMeasures: string[];
  missingHighImpactActions: string[];
  disclaimer: string;
}

/**
 * Identifies the cleanest continuous 2-hour forecast window from the hourly series
 * to guide safer short-duration cross-ventilation without importing peak smog.
 */
export function findOptimalVentilationWindow(
  snapshot: EnvironmentalSnapshot
): VentilationWindowPlan {
  const forecastSlots = snapshot.hourly.filter(
    (h) => h.isForecast && h.pm25 !== null && h.cpcbAqi !== null
  );
  const candidates =
    forecastSlots.length >= 2
      ? forecastSlots
      : snapshot.hourly.filter((h) => h.pm25 !== null && h.cpcbAqi !== null);

  if (candidates.length === 0) {
    return {
      suitability: 'Insufficient Data',
      windowLabel: 'Hourly forecast unavailable',
      avgAqi: snapshot.cpcbAqi,
      avgPm25: snapshot.pollutants.pm25,
      avgWindKmh: snapshot.weather.windSpeedKmh,
      guidance: 'Check live AQI before opening exterior windows; favor mechanical HEPA filtration when outdoor haze is visible.',
      limitation: 'No hourly particulate forecast points were returned by the telemetry feed.',
    };
  }

  let bestScore = Infinity;
  let bestStart = candidates[0];
  let bestEnd = candidates[Math.min(1, candidates.length - 1)];
  let bestAvgAqi = bestStart.cpcbAqi ?? 0;
  let bestAvgPm25 = bestStart.pm25 ?? 0;
  let bestAvgWind = bestStart.windSpeedKmh ?? snapshot.weather.windSpeedKmh ?? 0;

  const pairCount = candidates.length >= 2 ? candidates.length - 1 : 1;
  for (let i = 0; i < pairCount; i++) {
    const a = candidates[i];
    const b = candidates[Math.min(i + 1, candidates.length - 1)];
    const avgPm25 = ((a.pm25 ?? 0) + (b.pm25 ?? 0)) / 2;
    const avgAqi = Math.round(((a.cpcbAqi ?? 0) + (b.cpcbAqi ?? 0)) / 2);
    const avgWind =
      Math.round((((a.windSpeedKmh ?? 6) + (b.windSpeedKmh ?? 6)) / 2) * 10) / 10;

    // Favor lowest PM2.5 slightly adjusted for stronger wind dispersion
    const score = avgPm25 - Math.min(8, avgWind * 0.4);
    if (score < bestScore) {
      bestScore = score;
      bestStart = a;
      bestEnd = b;
      bestAvgAqi = avgAqi;
      bestAvgPm25 = Math.round(avgPm25 * 10) / 10;
      bestAvgWind = avgWind;
    }
  }

  const windowLabel =
    bestStart.label === bestEnd.label ? bestStart.label : `${bestStart.label} – ${bestEnd.label}`;

  if (bestAvgAqi <= 100) {
    return {
      suitability: 'Suitable',
      windowLabel,
      avgAqi: bestAvgAqi,
      avgPm25: bestAvgPm25,
      avgWindKmh: bestAvgWind,
      guidance: `Best natural cross-ventilation window is ${windowLabel} (projected CPCB AQI ~${bestAvgAqi}, wind ${bestAvgWind} km/h). Open opposite windows for 15–20 minutes to refresh indoor CO2.`,
      limitation: 'Avoid street-facing windows if heavy local traffic passes outside your building during this window.',
    };
  }

  if (bestAvgAqi <= 150) {
    return {
      suitability: 'Brief Only',
      windowLabel,
      avgAqi: bestAvgAqi,
      avgPm25: bestAvgPm25,
      avgWindKmh: bestAvgWind,
      guidance: `Cleanest upcoming window is ${windowLabel} (projected CPCB AQI ~${bestAvgAqi}). Limit natural ventilation to 5–10 minutes only if rooms feel stuffy, then run HEPA filtration.`,
      limitation: 'Moderate outdoor particulates still raise indoor PM2.5 when windows stay open beyond brief air exchange.',
    };
  }

  return {
    suitability: 'Mechanical Filtration Only',
    windowLabel,
    avgAqi: bestAvgAqi,
    avgPm25: bestAvgPm25,
    avgWindKmh: bestAvgWind,
    guidance: `Even the cleanest upcoming window (${windowLabel}) remains elevated at CPCB AQI ~${bestAvgAqi}. Keep exterior windows latched and rely on closed-door HEPA filtration and range-hood exhaust.`,
    limitation: 'Prolonged window sealing can elevate indoor CO2; use filtered fresh-air intake if available.',
  };
}

/**
 * Estimates transparent household personal PM2.5 inhalation mitigation range
 * based on active indoor safeguards and household profile.
 */
export function estimatePersonalExposurePlan(
  snapshot: EnvironmentalSnapshot,
  profile: FamilyProfile,
  indoorChecklistProgressPercent: number
): PersonalExposureEstimate {
  const aqi = snapshot.cpcbAqi ?? 120;
  const activeMeasures: string[] = [];
  const missingHighImpactActions: string[] = [];

  let minReduction = 8;
  let maxReduction = 15;

  if (profile.hasPurifier) {
    activeMeasures.push('Indoor HEPA air purifier active in sleeping/living zone');
    minReduction += 25;
    maxReduction += 38;
  } else {
    missingHighImpactActions.push('Run a properly sized true-HEPA purifier in the primary bedroom');
  }

  if (indoorChecklistProgressPercent >= 50) {
    activeMeasures.push(
      `Indoor source control & cleaning habits (${indoorChecklistProgressPercent}% checklist completed)`
    );
    minReduction += 10;
    maxReduction += 18;
  } else {
    missingHighImpactActions.push(
      'Complete bedroom sealing, zero-incense, and damp-mopping tasks in Indoor Optimizer'
    );
  }

  if (aqi > 150) {
    activeMeasures.push('Shifting vigorous exercise indoors during Poor/Severe outdoor AQI');
    minReduction += 12;
    maxReduction += 18;
  } else {
    activeMeasures.push('Timed outdoor activity during lower-traffic dispersion hours');
    minReduction += 5;
    maxReduction += 10;
  }

  if (profile.groups.includes('dailyCommuters') || profile.groups.includes('outdoorWorkers')) {
    if (aqi > 150) {
      missingHighImpactActions.push(
        'Use well-fitted N95/FFP2 respirator and closed-cabin transit on high-AQI commutes'
      );
    }
  }

  const clampedMin = Math.min(75, minReduction);
  const clampedMax = Math.min(88, Math.max(clampedMin + 8, maxReduction));

  const protectionTier: PersonalExposureEstimate['protectionTier'] =
    clampedMax >= 65
      ? 'Strong Protection'
      : clampedMax >= 40
        ? 'Moderate Protection'
        : 'Baseline Vulnerability';

  return {
    estimatedReductionPercentRange: [clampedMin, clampedMax],
    protectionTier,
    activeMeasures,
    missingHighImpactActions,
    disclaimer:
      'Indicative exposure-reduction estimate based on indoor filtration and behavioral studies; actual personal reduction depends on room airtightness, CADR sizing, and outdoor duration.',
  };
}
