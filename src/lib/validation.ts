import { z } from 'zod';

export const LocationSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim())
    .pipe(
      z
        .string()
        .min(2, 'Enter at least 2 characters to search a city or area.')
        .max(80, 'Location query is too long.')
    ),
});

export const AirQualityQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  name: z.string().trim().min(1).max(100).optional(),
  region: z.string().trim().max(100).optional(),
  country: z.string().trim().max(80).optional(),
  countryCode: z.string().trim().max(10).optional(),
  timezone: z.string().trim().max(80).optional(),
});

export const HouseholdGroupSchema = z.enum([
  'adults',
  'children',
  'olderAdults',
  'respiratorySensitivities',
  'outdoorWorkers',
  'fitnessEnthusiasts',
  'workFromHome',
  'dailyCommuters',
]);

export const CityLocationSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  area: z.string().max(120).optional(),
  region: z.string().min(1).max(120),
  country: z.string().min(1).max(80),
  countryCode: z.string().min(1).max(10),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  timezone: z.string().min(1).max(80),
  isIndia: z.boolean(),
});

export const FamilyProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  groups: z.array(HouseholdGroupSchema).max(8),
  preferredStandard: z.enum(['CPCB', 'US_EPA']),
  hasPurifier: z.boolean(),
  gridRegion: z.enum(['INDIA', 'GLOBAL']),
});

export const CarbonCalculatorInputSchema = z.object({
  carKmReplacedByTransitPerWeek: z.number().finite().min(0).max(5000),
  carKmCarpoolPerWeek: z.number().finite().min(0).max(5000),
  carKmReplacedByWalkCyclePerWeek: z.number().finite().min(0).max(5000),
  electricitySavedKwhPerWeek: z.number().finite().min(0).max(5000),
  ledBulbsReplacedCount: z.number().finite().min(0).max(200),
  wasteReducedKgPerWeek: z.number().finite().min(0).max(500),
  gridRegion: z.enum(['INDIA', 'GLOBAL']),
  householdSize: z.number().int().min(1).max(20),
});

export const AlertPreferencesSchema = z.object({
  severeAqi: z.boolean(),
  risingPm25: z.boolean(),
  forecastAlerts: z.boolean(),
  ventilationWindows: z.boolean(),
  filterMaintenance: z.boolean(),
  sustainabilityGoals: z.boolean(),
});

export const PersistedStateSchema = z.object({
  locationId: z.string().max(100).optional(),
  customLocation: CityLocationSchema.optional(),
  profile: FamilyProfileSchema.optional(),
  completedTaskIds: z.array(z.string().max(60)).max(50).optional(),
  completedRoutinePeriods: z.array(z.enum(['Morning', 'Afternoon', 'Evening', 'Night'])).max(4).optional(),
  adoptedHabitIds: z.array(z.string().max(60)).max(50).optional(),
  joinedChallengeIds: z.array(z.string().max(60)).max(50).optional(),
  readAlertIds: z.array(z.string().max(60)).max(50).optional(),
  calcInput: CarbonCalculatorInputSchema.optional(),
  alertPrefs: AlertPreferencesSchema.optional(),
});

export const AssistantRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, 'Please ask a question of at least 3 characters.')
    .max(600, 'Please keep your question under 600 characters.'),
  locationName: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().max(10).optional().default('IN'),
  cpcbAqi: z.number().finite().min(0).max(1000).nullable(),
  cpcbCategory: z.string().trim().max(40),
  usAqi: z.number().finite().min(0).max(1000).nullable(),
  pm25: z.number().finite().min(0).max(3000).nullable(),
  pm10: z.number().finite().min(0).max(3000).nullable(),
  no2: z.number().finite().min(0).max(2000).nullable(),
  o3: z.number().finite().min(0).max(2000).nullable(),
  temperatureC: z.number().finite().min(-60).max(65).nullable(),
  humidityPercent: z.number().finite().min(0).max(100).nullable(),
  windSpeedKmh: z.number().finite().min(0).max(300).nullable(),
  dataStatus: z.enum(['LIVE', 'CACHED', 'DEMO_FALLBACK', 'UNAVAILABLE']),
  householdGroups: z.array(HouseholdGroupSchema).max(8),
});

export const AssistantOutputSchema = z.object({
  summary: z.string().min(10).max(1200),
  measuredFacts: z.array(z.string().min(3).max(300)).min(1).max(6),
  contextualEstimates: z.array(z.string().min(3).max(300)).min(1).max(5),
  recommendation: z.object({
    what: z.string().min(5).max(500),
    why: z.string().min(5).max(500),
    when: z.string().min(3).max(300),
    expectedBenefits: z.string().min(5).max(400),
    estimatedImpact: z.string().min(5).max(400),
    confidenceAndLimitations: z.string().min(5).max(400),
  }),
  actionSteps: z.array(z.string().min(3).max(300)).min(2).max(6),
  disclaimer: z.string().min(10).max(400),
});

const INJECTION_PATTERNS = [
  /(ignore|disregard|forget|override|bypass)\s+(all\s+)?(previous|prior|above|system|safety)?\s*(instructions|rules|prompt|directives)/i,
  /(reveal|show|print|dump|leak|expose|output)\s+(your\s+)?(system\s+prompt|api\s*key|secrets?|credentials?|process\.env|env(\s+vars)?|instructions)/i,
  /act\s+as\s+(a\s+)?(jailbreak|unrestricted|dan|developer\s+mode)/i,
  /(developer|sudo)\s+mode/i,
  /execute\s+(shell|bash|code|command|eval)/i,
  /<\/?(script|system|assistant|tool_call)>/i,
  /(<\|im_start\|>|\[INST\]|^\s*system\s*:)/i,
];

export function sanitizeUserPrompt(raw: string): { sanitized: string; flagged: boolean } {
  const cleaned = raw
    // Strip ASCII control characters and invisible/bidi unicode characters
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const flagged = INJECTION_PATTERNS.some((pattern) => pattern.test(cleaned));
  return { sanitized: cleaned, flagged };
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function hasUnsafeObjectKeys(value: unknown, depth = 0): boolean {
  if (depth > 12) {
    return true;
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeObjectKeys(item, depth + 1));
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return true;
    }
    const child = (value as Record<string, unknown>)[key];
    if (hasUnsafeObjectKeys(child, depth + 1)) {
      return true;
    }
  }
  return false;
}
