import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCarbonImpact, EMISSION_FACTORS } from './impact.ts';

test('calculateCarbonImpact applies Baseline - Alternative formula accurately', () => {
  const res = calculateCarbonImpact({
    carKmReplacedByTransitPerWeek: 50,
    carKmCarpoolPerWeek: 0,
    carKmReplacedByWalkCyclePerWeek: 10,
    electricitySavedKwhPerWeek: 10,
    ledBulbsReplacedCount: 0,
    wasteReducedKgPerWeek: 0,
    gridRegion: 'INDIA',
    householdSize: 2,
  });

  const expectedTransitSavings = 50 * (EMISSION_FACTORS.CAR_PETROL_KG_PER_KM - EMISSION_FACTORS.PUBLIC_TRANSIT_KG_PER_KM);
  const expectedActiveSavings = 10 * EMISSION_FACTORS.CAR_PETROL_KG_PER_KM;
  const expectedPowerSavings = 10 * EMISSION_FACTORS.GRID_INDIA_KG_PER_KWH;
  const expectedWeekly = Math.round((expectedTransitSavings + expectedActiveSavings + expectedPowerSavings) * 100) / 100;

  assert.equal(res.weeklySavingsKg, expectedWeekly);
  assert.equal(res.weeklySavingsKg, Math.round((res.weeklyBaselineKg - res.weeklyAlternativeKg) * 100) / 100);
  assert.ok(res.annualSavingsKg > res.monthlySavingsKg);
  assert.ok(res.exposureVsCarbonNote.includes('personal exposure reduction'));
});

test('calculateCarbonImpact clamps negative inputs and respects global grid region', () => {
  const resIndia = calculateCarbonImpact({
    carKmReplacedByTransitPerWeek: -20,
    carKmCarpoolPerWeek: 0,
    carKmReplacedByWalkCyclePerWeek: 0,
    electricitySavedKwhPerWeek: 10,
    ledBulbsReplacedCount: 0,
    wasteReducedKgPerWeek: 0,
    gridRegion: 'INDIA',
    householdSize: 0,
  });

  const resGlobal = calculateCarbonImpact({
    carKmReplacedByTransitPerWeek: 0,
    carKmCarpoolPerWeek: 0,
    carKmReplacedByWalkCyclePerWeek: 0,
    electricitySavedKwhPerWeek: 10,
    ledBulbsReplacedCount: 0,
    wasteReducedKgPerWeek: 0,
    gridRegion: 'GLOBAL',
    householdSize: 1,
  });

  assert.equal(resIndia.weeklySavingsKg, 7.16);
  assert.equal(resGlobal.weeklySavingsKg, 4.75);
  assert.equal(resIndia.perPersonAnnualSavingsKg, resIndia.annualSavingsKg);
});
