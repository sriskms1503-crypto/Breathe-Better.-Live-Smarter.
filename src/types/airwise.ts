export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type UsAqiCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export type DataStatus = 'LIVE' | 'CACHED' | 'DEMO_FALLBACK' | 'UNAVAILABLE';

export interface CityLocation {
  id: string;
  name: string;
  area?: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isIndia: boolean;
}

export interface PollutantReadings {
  pm25: number | null; // µg/m³
  pm10: number | null; // µg/m³
  no2: number | null;  // µg/m³
  so2: number | null;  // µg/m³
  co: number | null;   // mg/m³ (converted from µg/m³ when from Open-Meteo)
  o3: number | null;   // µg/m³
}

export interface WeatherReadings {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  visibilityKm: number | null;
  weatherSummary: string;
}

export interface HourlyPoint {
  time: string; // ISO string
  label: string; // Formatted HH:mm or day label
  pm25: number | null;
  pm10: number | null;
  cpcbAqi: number | null;
  usAqi: number | null;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  isForecast: boolean;
}

export interface DailyForecastPoint {
  date: string;
  label: string;
  avgPm25: number | null;
  maxPm25: number | null;
  cpcbAqi: number | null;
  category: AqiCategory;
  tempMinC: number | null;
  tempMaxC: number | null;
}

export interface EnvironmentalSnapshot {
  location: CityLocation;
  dataStatus: DataStatus;
  statusMessage: string;
  stationLabel: string;
  provider: string;
  measuredAt: string; // ISO timestamp
  lastSuccessfulUpdate: string; // ISO timestamp
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  cpcbAqi: number | null;
  cpcbCategory: AqiCategory;
  dominantPollutant: string;
  usAqi: number | null;
  usCategory: UsAqiCategory;
  whoRatios: {
    pm25Multiple: number | null;
    pm10Multiple: number | null;
    no2Multiple: number | null;
    so2Multiple?: number | null;
    coMultiple?: number | null;
    o3Multiple: number | null;
  };
  hourly: HourlyPoint[];
  daily: DailyForecastPoint[];
}

export type HouseholdGroup =
  | 'adults'
  | 'children'
  | 'olderAdults'
  | 'respiratorySensitivities'
  | 'outdoorWorkers'
  | 'fitnessEnthusiasts'
  | 'workFromHome'
  | 'dailyCommuters';

export interface FamilyProfile {
  householdSize: number;
  groups: HouseholdGroup[];
  preferredStandard: 'CPCB' | 'US_EPA';
  hasPurifier: boolean;
  gridRegion: 'INDIA' | 'GLOBAL';
}

export interface StructuredRecommendation {
  id: string;
  title: string;
  priority: 'Urgent' | 'High' | 'Moderate' | 'Low';
  what: string;
  why: string;
  when: string;
  expectedBenefits: string;
  estimatedImpact: string;
  confidenceAndLimitations: string;
  factBasis: string;
}

export interface RoutineSlot {
  period: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  timeWindow: string;
  airSuitability: 'Suitable' | 'Caution' | 'Avoid Outdoor Exposure';
  summary: string;
  actions: StructuredRecommendation[];
}

export interface IndoorRoomTask {
  id: string;
  room: 'Bedroom' | 'Living room' | 'Kitchen' | "Children's room" | 'Workspace';
  title: string;
  guidance: string;
  whyItMatters: string;
  limitation: string;
  completed: boolean;
}

export interface LifestyleAlternative {
  id: string;
  category: 'Transport' | 'Energy' | 'Household';
  title: string;
  currentHabit: string;
  recommendedAlternative: string;
  estimatedReductionKgPerWeek: number;
  methodology: string;
  assumptions: string;
  confidenceLevel: 'High' | 'Moderate' | 'Indicative';
  adopted: boolean;
}

export interface AssistantStructuredReply {
  summary: string;
  measuredFacts: string[];
  contextualEstimates: string[];
  recommendation: {
    what: string;
    why: string;
    when: string;
    expectedBenefits: string;
    estimatedImpact: string;
    confidenceAndLimitations: string;
  };
  actionSteps: string[];
  disclaimer: string;
  source: 'gemini-4-hydrogen' | 'rule-engine-fallback';
}

export interface SmartAlert {
  id: string;
  type: 'severe_aqi' | 'rising_pm25' | 'forecast_alert' | 'ventilation_window' | 'filter_maintenance' | 'sustainability_goal';
  severity: 'Critical' | 'Warning' | 'Advisory' | 'Info';
  title: string;
  message: string;
  actionLabel: string;
  targetPage: PageId;
  timestamp: string;
  read: boolean;
}

export interface AlertPreferences {
  severeAqi: boolean;
  risingPm25: boolean;
  forecastAlerts: boolean;
  ventilationWindows: boolean;
  filterMaintenance: boolean;
  sustainabilityGoals: boolean;
}

export type PageId =
  | 'landing'
  | 'dashboard'
  | 'assistant'
  | 'routine'
  | 'indoor'
  | 'sustainability'
  | 'calculator'
  | 'insights'
  | 'community'
  | 'notifications'
  | 'settings';
