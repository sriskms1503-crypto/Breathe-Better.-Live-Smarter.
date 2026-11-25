export interface CarbonCalculatorInput {
  carKmReplacedByTransitPerWeek: number;
  carKmCarpoolPerWeek: number;
  carKmReplacedByWalkCyclePerWeek: number;
  electricitySavedKwhPerWeek: number;
  ledBulbsReplacedCount: number;
  wasteReducedKgPerWeek: number;
  gridRegion: 'INDIA' | 'GLOBAL';
  householdSize: number;
}

export interface EmissionBreakdownItem {
  id: string;
  label: string;
  baselineKgPerWeek: number;
  alternativeKgPerWeek: number;
  savingsKgPerWeek: number;
  factorSummary: string;
}

export interface CarbonImpactResult {
  weeklyBaselineKg: number;
  weeklyAlternativeKg: number;
  dailySavingsKg: number;
  weeklySavingsKg: number;
  monthlySavingsKg: number;
  annualSavingsKg: number;
  perPersonAnnualSavingsKg: number;
  community100HomesAnnualTonnes: number;
  uncertaintyRangePercent: number;
  breakdown: EmissionBreakdownItem[];
  assumptions: string[];
  exposureVsCarbonNote: string;
}

/**
 * Documented emission factors:
 * - Passenger car (medium petrol/gasoline average): 0.192 kg CO2e/km (UK DESNZ/DEFRA 2024)
 * - Urban public transit (weighted bus/metro): 0.068 kg CO2e/km (DESNZ/DEFRA 2024 urban blend)
 * - Carpool (2-person occupancy split): 0.096 kg CO2e/km per rider
 * - Walking / Non-motorized cycling: 0.0 kg operational CO2e/km
 * - Grid electricity: 0.716 kg CO2e/kWh (India CEA CO2 Baseline v19) | 0.475 kg CO2e/kWh (IEA Global Avg)
 * - LED upgrade: replacing 60W incandescent / 15W CFL blend (~40W net delta) x 4 hrs/day = 1.12 kWh/week/bulb
 * - Household waste reduction (avoided landfill CH4 + collection): 0.70 kg CO2e/kg (EPA WARM conservative blend)
 */
export const EMISSION_FACTORS = {
  CAR_PETROL_KG_PER_KM: 0.192,
  PUBLIC_TRANSIT_KG_PER_KM: 0.068,
  CARPOOL_2P_KG_PER_KM: 0.096,
  ACTIVE_TRAVEL_KG_PER_KM: 0,
  GRID_INDIA_KG_PER_KWH: 0.716,
  GRID_GLOBAL_KG_PER_KWH: 0.475,
  LED_KWH_SAVED_PER_BULB_WEEK: 1.12,
  WASTE_AVOIDED_KG_CO2E_PER_KG: 0.70,
} as const;

function nonNeg(val: number, max = 5000): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.min(val, max);
}

export function calculateCarbonImpact(input: CarbonCalculatorInput): CarbonImpactResult {
  const transitKm = nonNeg(input.carKmReplacedByTransitPerWeek);
  const carpoolKm = nonNeg(input.carKmCarpoolPerWeek);
  const activeKm = nonNeg(input.carKmReplacedByWalkCyclePerWeek);
  const kwhSaved = nonNeg(input.electricitySavedKwhPerWeek);
  const ledCount = nonNeg(input.ledBulbsReplacedCount, 200);
  const wasteKg = nonNeg(input.wasteReducedKgPerWeek, 500);
  const householdSize = Math.max(1, Math.min(20, Math.round(input.householdSize || 1)));

  const gridFactor =
    input.gridRegion === 'INDIA'
      ? EMISSION_FACTORS.GRID_INDIA_KG_PER_KWH
      : EMISSION_FACTORS.GRID_GLOBAL_KG_PER_KWH;

  const transitBaseline = transitKm * EMISSION_FACTORS.CAR_PETROL_KG_PER_KM;
  const transitAlt = transitKm * EMISSION_FACTORS.PUBLIC_TRANSIT_KG_PER_KM;

  const carpoolBaseline = carpoolKm * EMISSION_FACTORS.CAR_PETROL_KG_PER_KM;
  const carpoolAlt = carpoolKm * EMISSION_FACTORS.CARPOOL_2P_KG_PER_KM;

  const activeBaseline = activeKm * EMISSION_FACTORS.CAR_PETROL_KG_PER_KM;
  const activeAlt = 0;

  const powerBaseline = kwhSaved * gridFactor;
  const powerAlt = 0;

  const ledKwh = ledCount * EMISSION_FACTORS.LED_KWH_SAVED_PER_BULB_WEEK;
  const ledBaseline = ledKwh * gridFactor;
  const ledAlt = 0;

  const wasteBaseline = wasteKg * EMISSION_FACTORS.WASTE_AVOIDED_KG_CO2E_PER_KG;
  const wasteAlt = 0;

  const breakdown: EmissionBreakdownItem[] = [
    {
      id: 'transit',
      label: 'Car trips shifted to public transit',
      baselineKgPerWeek: round2(transitBaseline),
      alternativeKgPerWeek: round2(transitAlt),
      savingsKgPerWeek: round2(transitBaseline - transitAlt),
      factorSummary: '0.192 vs 0.068 kg CO2e/km (DEFRA/DESNZ urban blend)',
    },
    {
      id: 'carpool',
      label: 'Solo driving shifted to 2-person carpool',
      baselineKgPerWeek: round2(carpoolBaseline),
      alternativeKgPerWeek: round2(carpoolAlt),
      savingsKgPerWeek: round2(carpoolBaseline - carpoolAlt),
      factorSummary: '0.192 vs 0.096 kg CO2e/km per rider',
    },
    {
      id: 'active',
      label: 'Short motorized trips shifted to walking/cycling',
      baselineKgPerWeek: round2(activeBaseline),
      alternativeKgPerWeek: 0,
      savingsKgPerWeek: round2(activeBaseline - activeAlt),
      factorSummary: '0.192 vs 0.000 kg operational CO2e/km',
    },
    {
      id: 'electricity',
      label: 'Reduced weekly electricity consumption',
      baselineKgPerWeek: round2(powerBaseline),
      alternativeKgPerWeek: round2(powerAlt),
      savingsKgPerWeek: round2(powerBaseline - powerAlt),
      factorSummary: `${gridFactor} kg CO2e/kWh (${input.gridRegion === 'INDIA' ? 'India CEA v19' : 'IEA Global Avg'})`,
    },
    {
      id: 'led',
      label: 'Efficient LED lighting upgrades',
      baselineKgPerWeek: round2(ledBaseline),
      alternativeKgPerWeek: round2(ledAlt),
      savingsKgPerWeek: round2(ledBaseline - ledAlt),
      factorSummary: `1.12 kWh/week avoided per bulb @ ${gridFactor} kg CO2e/kWh`,
    },
    {
      id: 'waste',
      label: 'Weekly household waste reduction',
      baselineKgPerWeek: round2(wasteBaseline),
      alternativeKgPerWeek: round2(wasteAlt),
      savingsKgPerWeek: round2(wasteBaseline - wasteAlt),
      factorSummary: '0.70 kg CO2e/kg avoided landfill & hauling',
    },
  ];

  const weeklyBaselineKg = round2(breakdown.reduce((acc, item) => acc + item.baselineKgPerWeek, 0));
  const weeklyAlternativeKg = round2(breakdown.reduce((acc, item) => acc + item.alternativeKgPerWeek, 0));
  const weeklySavingsKg = round2(Math.max(0, weeklyBaselineKg - weeklyAlternativeKg));
  const dailySavingsKg = round2(weeklySavingsKg / 7);
  const monthlySavingsKg = round2((weeklySavingsKg / 7) * 30);
  const annualSavingsKg = round2((weeklySavingsKg / 7) * 365);
  const perPersonAnnualSavingsKg = round2(annualSavingsKg / householdSize);
  const community100HomesAnnualTonnes = round2((annualSavingsKg * 100) / 1000);

  return {
    weeklyBaselineKg,
    weeklyAlternativeKg,
    dailySavingsKg,
    weeklySavingsKg,
    monthlySavingsKg,
    annualSavingsKg,
    perPersonAnnualSavingsKg,
    community100HomesAnnualTonnes,
    uncertaintyRangePercent: 18,
    breakdown,
    assumptions: [
      'Formula applied: Estimated CO2e Savings = Baseline Emissions − Alternative Emissions.',
      `Grid electricity emission factor uses ${input.gridRegion === 'INDIA' ? '0.716 kg CO2e/kWh (India CEA weighted grid)' : '0.475 kg CO2e/kWh (IEA global average)'}.`,
      'Car baseline assumes a single-occupancy medium petrol passenger vehicle (0.192 kg CO2e/km); diesel, EV, or SUV baselines vary by ±18–25%.',
      'LED calculation assumes replacing older incandescent/CFL bulbs running 4 hours/day (40W average wattage reduction).',
      'Lifecycle vehicle manufacturing and personal dietary impacts are excluded from operational estimates.',
    ],
    exposureVsCarbonNote:
      'Important distinction: Reducing CO2e emissions helps lower long-term urban air pollution and climate forcing, whereas personal exposure reduction depends on where and when you breathe polluted air (e.g., avoiding busy roads or filtering indoor PM2.5). During Poor or Severe AQI episodes, shift walking/cycling indoors rather than exercising outdoors in heavy smog.',
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
