import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCpcbAqi,
  calculateCpcbSubIndex,
  calculateUsAqiFromParticulates,
  calculateWhoRatios,
  getCpcbCategory,
  getCpcbCategoryMeta,
  getUsAqiCategory,
  isCoordinateInIndia,
  sanitizeMeasurement,
} from './aqi.ts';

test('CPCB NAQI returns all 6 official categories accurately', () => {
  assert.equal(getCpcbCategory(null), 'Satisfactory');
  assert.equal(getCpcbCategory(25), 'Good');
  assert.equal(getCpcbCategory(75), 'Satisfactory');
  assert.equal(getCpcbCategory(150), 'Moderate');
  assert.equal(getCpcbCategory(250), 'Poor');
  assert.equal(getCpcbCategory(350), 'Very Poor');
  assert.equal(getCpcbCategory(450), 'Severe');
});

test('CPCB NAQI computes dominant pollutant across particulates and gaseous pollutants', () => {
  const pmResult = calculateCpcbAqi({
    pm25: 120,
    pm10: 110,
    no2: 35,
    so2: 12,
    co: 1.0,
    o3: 45,
  });
  assert.equal(pmResult.dominantPollutant, 'PM2.5');
  assert.equal(pmResult.category, 'Poor');
  assert.ok(pmResult.aqi !== null && pmResult.aqi >= 201 && pmResult.aqi <= 300);

  const no2Result = calculateCpcbAqi({
    pm25: 15,
    pm10: 30,
    no2: 200,
    so2: 20,
    co: 0.5,
    o3: 40,
  });
  assert.equal(no2Result.dominantPollutant, 'NO2');
  assert.equal(no2Result.category, 'Poor');

  const emptyResult = calculateCpcbAqi({
    pm25: null,
    pm10: null,
    no2: null,
    so2: null,
    co: null,
    o3: null,
  });
  assert.equal(emptyResult.aqi, null);
  assert.equal(emptyResult.dominantPollutant, 'Unavailable');
});

test('CPCB sub-index supports no2, so2, co, o3, >500 clamping, and null/negative bounds', () => {
  assert.equal(calculateCpcbSubIndex('pm25', null), null);
  assert.equal(calculateCpcbSubIndex('pm25', -10), null);
  assert.equal(calculateCpcbSubIndex('pm25', 999), 500);
  assert.equal(calculateCpcbSubIndex('no2', 40), 50);
  assert.equal(calculateCpcbSubIndex('so2', 80), 100);
  assert.equal(calculateCpcbSubIndex('co', 2.0), 100);
  assert.equal(calculateCpcbSubIndex('o3', 168), 200);

  assert.equal(sanitizeMeasurement(-5), null);
  assert.equal(sanitizeMeasurement(99999, 5000), null);
  assert.equal(sanitizeMeasurement(42.37), 42.4);
});

test('US EPA AQI covers all 6 categories and computes complete WHO multiples', () => {
  assert.equal(getUsAqiCategory(null), 'Good');
  assert.equal(getUsAqiCategory(35), 'Good');
  assert.equal(getUsAqiCategory(80), 'Moderate');
  assert.equal(getUsAqiCategory(130), 'Unhealthy for Sensitive Groups');
  assert.equal(getUsAqiCategory(180), 'Unhealthy');
  assert.equal(getUsAqiCategory(250), 'Very Unhealthy');
  assert.equal(getUsAqiCategory(350), 'Hazardous');

  const us = calculateUsAqiFromParticulates(45, 80);
  assert.ok(us.aqi !== null && us.aqi >= 101);
  assert.equal(us.category, 'Unhealthy for Sensitive Groups');
  assert.equal(calculateUsAqiFromParticulates(null, null).aqi, null);

  const ratios = calculateWhoRatios({
    pm25: 45,
    pm10: 90,
    no2: 50,
    so2: 80,
    co: 8,
    o3: 100,
  });
  assert.equal(ratios.pm25Multiple, 3);
  assert.equal(ratios.pm10Multiple, 2);
  assert.equal(ratios.no2Multiple, 2);
  assert.equal(ratios.so2Multiple, 2);
  assert.equal(ratios.coMultiple, 2);
  assert.equal(ratios.o3Multiple, 1);

  const partial = calculateWhoRatios({
    pm25: null,
    pm10: 45,
    no2: null,
    so2: null,
    co: null,
    o3: null,
  });
  assert.equal(partial.pm25Multiple, null);
  assert.equal(partial.pm10Multiple, 1);
  assert.equal(partial.so2Multiple, null);
  assert.equal(partial.coMultiple, null);
});

test('getCpcbCategoryMeta returns metadata for every CPCB category and isCoordinateInIndia checks bounds', () => {
  const categories = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'] as const;
  for (const cat of categories) {
    const meta = getCpcbCategoryMeta(cat);
    assert.equal(meta.category, cat);
    assert.ok(meta.rangeLabel.length > 0);
    assert.ok(meta.healthSummary.length > 10);
  }

  assert.equal(isCoordinateInIndia(28.6139, 77.209), true); // New Delhi
  assert.equal(isCoordinateInIndia(6.5, 68.0), true); // South-west boundary
  assert.equal(isCoordinateInIndia(36.0, 97.5), true); // North-east boundary
  assert.equal(isCoordinateInIndia(35.6762, 139.6503), false); // Tokyo
  assert.equal(isCoordinateInIndia(Number.NaN, 77.2), false);
});
