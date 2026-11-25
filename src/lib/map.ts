import type { CityLocation } from '../types/airwise.ts';

export type MapRegionMode = 'INDIA' | 'WORLD';
export type LabelAnchor = 'left' | 'right';

export interface ProjectedStationPin {
  station: CityLocation;
  x: number;
  y: number;
  labelAnchor: LabelAnchor;
}

const PIN_LABEL_ANCHORS: Record<string, Record<MapRegionMode, LabelAnchor>> = {
  'delhi-in': { INDIA: 'right', WORLD: 'left' },
  'bengaluru-in': { INDIA: 'left', WORLD: 'left' },
  'mumbai-in': { INDIA: 'left', WORLD: 'left' },
  'kolkata-in': { INDIA: 'right', WORLD: 'right' },
  'chennai-in': { INDIA: 'right', WORLD: 'right' },
  'london-gb': { INDIA: 'right', WORLD: 'right' },
  'tokyo-jp': { INDIA: 'left', WORLD: 'left' },
  'singapore-sg': { INDIA: 'left', WORLD: 'left' },
  'sanfrancisco-us': { INDIA: 'right', WORLD: 'right' },
};

export function projectMapCoords(
  lat: number,
  lon: number,
  regionMode: MapRegionMode
): { x: number; y: number } {
  if (regionMode === 'INDIA') {
    // Bounds: lon 66..96, lat 6..36 -> keep y within [10%, 78%] so pins clear bottom bar
    const x = ((lon - 66) / (96 - 66)) * 80 + 10;
    const y = ((36 - lat) / (36 - 6)) * 68 + 10;
    return {
      x: Math.round(Math.max(8, Math.min(92, x)) * 10) / 10,
      y: Math.round(Math.max(10, Math.min(78, y)) * 10) / 10,
    };
  }

  // World equirectangular: lon -140..155, lat -25..65 -> keep y within [12%, 76%]
  const x = ((lon + 140) / 295) * 84 + 8;
  const y = ((65 - lat) / 90) * 64 + 12;
  return {
    x: Math.round(Math.max(8, Math.min(92, x)) * 10) / 10,
    y: Math.round(Math.max(12, Math.min(76, y)) * 10) / 10,
  };
}

export function getMapStationsForMode(
  presetCities: CityLocation[],
  currentLocation: CityLocation,
  regionMode: MapRegionMode
): ProjectedStationPin[] {
  const worldHubIds = new Set([
    'delhi-in',
    'london-gb',
    'tokyo-jp',
    'singapore-sg',
    'sanfrancisco-us',
  ]);

  const baseStations =
    regionMode === 'INDIA'
      ? presetCities.filter((c) => c.isIndia)
      : presetCities.filter((c) => worldHubIds.has(c.id));

  const includeCurrent =
    !baseStations.some((s) => s.id === currentLocation.id) &&
    (regionMode === 'WORLD' || currentLocation.isIndia);

  const combined = includeCurrent ? [...baseStations, currentLocation] : baseStations;

  return combined.map((station) => {
    const { x, y } = projectMapCoords(station.latitude, station.longitude, regionMode);
    const configuredAnchor = PIN_LABEL_ANCHORS[station.id]?.[regionMode];
    const labelAnchor: LabelAnchor =
      configuredAnchor ?? (x > 65 ? 'left' : 'right');
    return {
      station,
      x,
      y,
      labelAnchor,
    };
  });
}
