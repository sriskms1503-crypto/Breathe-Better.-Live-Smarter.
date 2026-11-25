import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../data/presets.ts';
import { estimatePersonalExposurePlan, findOptimalVentilationWindow } from './exposure.ts';
import type { EnvironmentalSnapshot, FamilyProfile } from '../types/airwise.ts';

const BASE_PROFILE: FamilyProfile = {
  householdSize: 3,
  groups: ['adults', 'children', 'dailyCommuters'],
  preferredStandard: 'CPCB',
  hasPurifier: true,
  gridRegion: 'INDIA',
};

test('findOptimalVentilationWindow identifies Suitable, Brief Only, Mechanical Filtration Only, and Insufficient Data', () => {
  const tokyo = buildDemoFallbackSnapshot(PRESET_CITIES.find((c) => c.id === 'tokyo-jp')!);
  const goodPlan = findOptimalVentilationWindow(tokyo);
  assert.equal(goodPlan.suitability, 'Suitable');
  assert.ok(goodPlan.windowLabel.includes('–') || goodPlan.windowLabel.length > 0);
  assert.ok(goodPlan.avgAqi !== null && goodPlan.avgAqi <= 100);

  const delhi = buildDemoFallbackSnapshot(PRESET_CITIES.find((c) => c.id === 'delhi-in')!);
  const severePlan = findOptimalVentilationWindow(delhi);
  assert.equal(severePlan.suitability, 'Mechanical Filtration Only');
  assert.ok(severePlan.guidance.toLowerCase().includes('hepa'));

  const briefSnap: EnvironmentalSnapshot = {
    ...tokyo,
    hourly: [
      {
        time: '2026-01-15T12:00',
        label: '12:00',
        pm25: 66,
        pm10: 95,
        cpcbAqi: 120,
        usAqi: 155,
        temperatureC: 22,
        windSpeedKmh: 10,
        isForecast: true,
      },
      {
        time: '2026-01-15T13:00',
        label: '13:00',
        pm25: 68,
        pm10: 98,
        cpcbAqi: 124,
        usAqi: 158,
        temperatureC: 23,
        windSpeedKmh: 11,
        isForecast: true,
      },
    ],
  };
  const briefPlan = findOptimalVentilationWindow(briefSnap);
  assert.equal(briefPlan.suitability, 'Brief Only');
  assert.equal(briefPlan.windowLabel, '12:00 – 13:00');

  const emptyPlan = findOptimalVentilationWindow({ ...tokyo, hourly: [] });
  assert.equal(emptyPlan.suitability, 'Insufficient Data');
});

test('estimatePersonalExposurePlan computes protection tiers and actionable gaps accurately', () => {
  const delhi = buildDemoFallbackSnapshot(PRESET_CITIES.find((c) => c.id === 'delhi-in')!);

  const strong = estimatePersonalExposurePlan(delhi, BASE_PROFILE, 75);
  assert.equal(strong.protectionTier, 'Strong Protection');
  assert.ok(strong.estimatedReductionPercentRange[0] < strong.estimatedReductionPercentRange[1]);
  assert.ok(strong.activeMeasures.some((m) => m.toLowerCase().includes('hepa')));
  assert.ok(strong.missingHighImpactActions.some((m) => m.toLowerCase().includes('n95')));

  const vulnerable = estimatePersonalExposurePlan(
    delhi,
    { ...BASE_PROFILE, hasPurifier: false, groups: ['adults'] },
    10
  );
  assert.equal(vulnerable.protectionTier, 'Baseline Vulnerability');
  assert.ok(vulnerable.missingHighImpactActions.length >= 2);
});
