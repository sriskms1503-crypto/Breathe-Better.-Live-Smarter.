import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_CITIES } from '../data/presets.ts';
import { getMapStationsForMode, projectMapCoords } from './map.ts';

test('India map coordinates stay safely inside canvas bounds above bottom telemetry bar', () => {
  const indianCities = PRESET_CITIES.filter((c) => c.isIndia);
  for (const city of indianCities) {
    const pos = projectMapCoords(city.latitude, city.longitude, 'INDIA');
    assert.ok(pos.x >= 8 && pos.x <= 92, `${city.name} x=${pos.x} out of safe bounds`);
    assert.ok(pos.y >= 10 && pos.y <= 78, `${city.name} y=${pos.y} out of safe bounds`);
  }
});

test('Bengaluru and Chennai use opposite horizontal label anchors to prevent overlap', () => {
  const pins = getMapStationsForMode(PRESET_CITIES, PRESET_CITIES[0], 'INDIA');
  const bengaluru = pins.find((p) => p.station.id === 'bengaluru-in');
  const chennai = pins.find((p) => p.station.id === 'chennai-in');
  assert.ok(bengaluru && chennai);
  assert.equal(bengaluru.labelAnchor, 'left');
  assert.equal(chennai.labelAnchor, 'right');
  assert.ok(chennai.x > bengaluru.x + 5);
});

test('World map selects well-separated global hubs and avoids edge clipping', () => {
  const pins = getMapStationsForMode(PRESET_CITIES, PRESET_CITIES[0], 'WORLD');
  assert.equal(pins.length, 5);
  const tokyo = pins.find((p) => p.station.id === 'tokyo-jp');
  assert.ok(tokyo);
  assert.equal(tokyo.labelAnchor, 'left');
});
