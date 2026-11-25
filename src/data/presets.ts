import type { CityLocation, EnvironmentalSnapshot } from '../types/airwise.ts';
import {
  calculateCpcbAqi,
  calculateUsAqiFromParticulates,
  calculateWhoRatios,
  getCpcbCategory,
} from '../lib/aqi.ts';

export const PRESET_CITIES: CityLocation[] = [
  {
    id: 'delhi-in',
    name: 'New Delhi',
    area: 'Central & NCR Monitoring Grid',
    region: 'Delhi NCR',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  },
  {
    id: 'bengaluru-in',
    name: 'Bengaluru',
    area: 'Indiranagar & Urban Corridor',
    region: 'Karnataka',
    country: 'India',
    countryCode: 'IN',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  },
  {
    id: 'mumbai-in',
    name: 'Mumbai',
    area: 'Bandra Kurla & Coastal Belt',
    region: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  },
  {
    id: 'kolkata-in',
    name: 'Kolkata',
    area: 'Ballygunge & Victoria Basin',
    region: 'West Bengal',
    country: 'India',
    countryCode: 'IN',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  },
  {
    id: 'chennai-in',
    name: 'Chennai',
    area: 'Velachery & Coastal Bay',
    region: 'Tamil Nadu',
    country: 'India',
    countryCode: 'IN',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    isIndia: true,
  },
  {
    id: 'london-gb',
    name: 'London',
    area: 'Greater London',
    region: 'England',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    isIndia: false,
  },
  {
    id: 'tokyo-jp',
    name: 'Tokyo',
    area: 'Chiyoda Metro',
    region: 'Kanto',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    isIndia: false,
  },
  {
    id: 'singapore-sg',
    name: 'Singapore',
    area: 'Central Catchment',
    region: 'Central',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
    isIndia: false,
  },
  {
    id: 'sanfrancisco-us',
    name: 'San Francisco',
    area: 'Bay Area',
    region: 'California',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    isIndia: false,
  },
];

export interface CommunityChallenge {
  id: string;
  title: string;
  category: 'Transport' | 'Energy' | 'Indoor' | 'Neighborhood';
  goalDescription: string;
  participantsCount: number;
  estimatedWeeklyCo2SavedKgPerHome: number;
  actionChecklist: string[];
}

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: 'chal-transit',
    title: 'Car-Light Commute Week',
    category: 'Transport',
    goalDescription: 'Replace at least 3 solo car or two-wheeler trips this week with metro, bus, or carpooling.',
    participantsCount: 418,
    estimatedWeeklyCo2SavedKgPerHome: 4.5,
    actionChecklist: [
      'Identify 3 trips under 12 km reachable via transit',
      'Coordinate one neighbor/colleague carpool',
      'Log kilometers shifted in the Carbon Calculator',
    ],
  },
  {
    id: 'chal-power',
    title: 'Peak-Hour Electricity Trim',
    category: 'Energy',
    goalDescription: 'Cut household standby power and shift cooling setpoints to 24–25°C for 7 consecutive days.',
    participantsCount: 612,
    estimatedWeeklyCo2SavedKgPerHome: 7.1,
    actionChecklist: [
      'Switch off idle desktop monitors, routers, and chargers overnight',
      'Clean AC mesh filters for efficient airflow',
      'Swap remaining halogen/CFL bulbs for 9W LEDs',
    ],
  },
  {
    id: 'chal-notrip',
    title: 'Zero Unnecessary Errand Loops',
    category: 'Transport',
    goalDescription: 'Consolidate grocery, pharmacy, and parcel errands into one single weekly route.',
    participantsCount: 289,
    estimatedWeeklyCo2SavedKgPerHome: 1.9,
    actionChecklist: [
      'Keep a shared family errand list',
      'Walk short neighborhood errands when outdoor AQI <= 100',
    ],
  },
  {
    id: 'chal-indoor',
    title: 'Smoke-Free Clean Bedroom Initiative',
    category: 'Indoor',
    goalDescription: 'Eliminate indoor incense, candles, and dry sweeping for 7 days to cut household PM2.5.',
    participantsCount: 534,
    estimatedWeeklyCo2SavedKgPerHome: 0.4,
    actionChecklist: [
      'Use damp microfiber mopping instead of dry brooms',
      'Run kitchen exhaust hood during all frying/sautéing',
      'Keep bedrooms sealed during evening traffic peaks',
    ],
  },
  {
    id: 'chal-cleanhood',
    title: 'No-Burn Neighborhood Cleanliness Drive',
    category: 'Neighborhood',
    goalDescription: 'Organize building or block-level leaf composting and report open waste burning to civic authorities.',
    participantsCount: 194,
    estimatedWeeklyCo2SavedKgPerHome: 3.5,
    actionChecklist: [
      'Separate dry garden leaves for community mulch/compost',
      'Share zero-burn awareness cards with housing society groups',
    ],
  },
];

export function buildDemoFallbackSnapshot(
  location: CityLocation,
  reason = 'Live environmental provider unreachable. Displaying labeled offline demonstration snapshot.'
): EnvironmentalSnapshot {
  // Deterministic illustrative baseline keyed to city characteristics so demo fallback stays realistic & honest
  const basePm25 = location.id === 'delhi-in' ? 118 : location.isIndia ? 62 : 18;
  const basePm10 = location.id === 'delhi-in' ? 198 : location.isIndia ? 96 : 31;
  const pollutants = {
    pm25: basePm25,
    pm10: basePm10,
    no2: location.isIndia ? 38 : 22,
    so2: location.isIndia ? 14 : 6,
    co: location.isIndia ? 1.1 : 0.4,
    o3: location.isIndia ? 42 : 54,
  };

  const cpcb = calculateCpcbAqi(pollutants);
  const us = calculateUsAqiFromParticulates(pollutants.pm25, pollutants.pm10);
  const now = new Date();

  const hourly = Array.from({ length: 24 }, (_, idx) => {
    const dt = new Date(now.getTime() + (idx - 12) * 3600 * 1000);
    const diurnal = Math.sin((idx / 24) * Math.PI * 2) * 0.18 + 1;
    const pm25 = Math.round(basePm25 * diurnal * 10) / 10;
    const pm10 = Math.round(basePm10 * diurnal * 10) / 10;
    const hCpcb = calculateCpcbAqi({ ...pollutants, pm25, pm10 });
    const hUs = calculateUsAqiFromParticulates(pm25, pm10);
    return {
      time: dt.toISOString(),
      label: dt.toISOString().slice(11, 16),
      pm25,
      pm10,
      cpcbAqi: hCpcb.aqi,
      usAqi: hUs.aqi,
      temperatureC: location.isIndia ? 21 + Math.round(Math.sin(idx / 4) * 5) : 14 + Math.round(Math.sin(idx / 4) * 4),
      windSpeedKmh: location.id === 'delhi-in' ? 5 : 11,
      isForecast: idx >= 12,
    };
  });

  const daily = [0, 1, 2].map((offset) => {
    const dt = new Date(now.getTime() + offset * 86400 * 1000);
    const factor = offset === 0 ? 1 : offset === 1 ? 1.06 : 0.92;
    const avgPm25 = Math.round(basePm25 * factor * 10) / 10;
    const maxPm25 = Math.round(avgPm25 * 1.25 * 10) / 10;
    const dCpcb = calculateCpcbAqi({ ...pollutants, pm25: avgPm25 });
    return {
      date: dt.toISOString().slice(0, 10),
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dt.toISOString().slice(5, 10),
      avgPm25,
      maxPm25,
      cpcbAqi: dCpcb.aqi,
      category: getCpcbCategory(dCpcb.aqi),
      tempMinC: location.isIndia ? 16 : 9,
      tempMaxC: location.isIndia ? 27 : 18,
    };
  });

  return {
    location,
    dataStatus: 'DEMO_FALLBACK',
    statusMessage: reason,
    stationLabel: `${location.name} Offline Demonstration Reference`,
    provider: 'AIRWISE Offline Fallback (Not Live Telemetry)',
    measuredAt: now.toISOString(),
    lastSuccessfulUpdate: now.toISOString(),
    pollutants,
    weather: {
      temperatureC: location.isIndia ? 22 : 15,
      humidityPercent: location.id === 'delhi-in' ? 72 : 58,
      windSpeedKmh: location.id === 'delhi-in' ? 5.2 : 11.4,
      visibilityKm: location.id === 'delhi-in' ? 2.4 : 9.5,
      weatherSummary: location.id === 'delhi-in' ? 'Calm haze (Demo)' : 'Partly clear (Demo)',
    },
    cpcbAqi: cpcb.aqi,
    cpcbCategory: cpcb.category,
    dominantPollutant: cpcb.dominantPollutant,
    usAqi: us.aqi,
    usCategory: us.category,
    whoRatios: calculateWhoRatios(pollutants),
    hourly,
    daily,
  };
}
