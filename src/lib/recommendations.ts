import type {
  AqiCategory,
  EnvironmentalSnapshot,
  FamilyProfile,
  HouseholdGroup,
  IndoorRoomTask,
  LifestyleAlternative,
  RoutineSlot,
  SmartAlert,
  StructuredRecommendation,
} from '../types/airwise.ts';
import { CPCB_CATEGORY_SCALE } from './aqi.ts';

const HOUSEHOLD_LABELS: Record<HouseholdGroup, string> = {
  adults: 'Adults',
  children: 'Children',
  olderAdults: 'Older adults',
  respiratorySensitivities: 'Respiratory sensitivities',
  outdoorWorkers: 'Outdoor workers',
  fitnessEnthusiasts: 'Fitness enthusiasts',
  workFromHome: 'Work from home',
  dailyCommuters: 'Daily commuters',
};

export function formatHouseholdGroups(groups: HouseholdGroup[]): string {
  if (!groups.length) return 'General household';
  return groups.map((g) => HOUSEHOLD_LABELS[g] ?? g).join(', ');
}

export function buildDailyRoutine(
  snapshot: EnvironmentalSnapshot,
  profile: FamilyProfile
): RoutineSlot[] {
  const aqi = snapshot.cpcbAqi ?? 120;
  const category = snapshot.cpcbCategory;
  const wind = snapshot.weather.windSpeedKmh ?? 8;
  const hasChildren = profile.groups.includes('children');
  const hasOlder = profile.groups.includes('olderAdults');
  const hasSensitive = profile.groups.includes('respiratorySensitivities');
  const isCommuter = profile.groups.includes('dailyCommuters');
  const isFitness = profile.groups.includes('fitnessEnthusiasts');
  const isOutdoorWorker = profile.groups.includes('outdoorWorkers');

  const highRisk = aqi > 200;
  const elevated = aqi > 100 && aqi <= 200;

  const morningSuitability = highRisk
    ? 'Avoid Outdoor Exposure'
    : elevated || hasSensitive || hasChildren || hasOlder
      ? 'Caution'
      : 'Suitable';

  const afternoonSuitability = aqi > 300
    ? 'Avoid Outdoor Exposure'
    : aqi > 150 || (wind < 6 && aqi > 100)
      ? 'Caution'
      : 'Suitable';

  const eveningSuitability = aqi > 200 ? 'Avoid Outdoor Exposure' : elevated ? 'Caution' : 'Suitable';

  const morningActions: StructuredRecommendation[] = [
    {
      id: 'morning-check',
      title: highRisk ? 'Move morning exercise indoors' : 'Time morning outdoor activity carefully',
      priority: highRisk ? 'Urgent' : elevated ? 'High' : 'Low',
      what: highRisk
        ? 'Replace morning outdoor walks, jogging, or playground time with indoor stretching or low-dust home workouts.'
        : elevated
          ? `Limit vigorous outdoor exertion${hasChildren || hasSensitive ? ' especially for children and respiratory-sensitive members' : ''}; keep walks to tree-lined side streets away from main roads.`
          : 'Proceed with normal outdoor walking or light exercise while checking hourly changes.',
      why: `Morning surface inversions and cool temperatures (${snapshot.weather.temperatureC !== null ? `${snapshot.weather.temperatureC}°C` : 'calm air'}) often trap fine particulates near ground level before daytime solar warming disperses them.`,
      when: 'Between 06:00 and 09:30 local time.',
      expectedBenefits: highRisk
        ? 'Significantly lowers inhaled PM2.5 dose during deep breathing.'
        : 'Reduces peak roadside particulate intake during morning rush hour.',
      estimatedImpact: 'Exercise increases breathing volume 3–6x; shifting indoors during Poor+ AQI cuts active PM2.5 inhalation substantially.',
      confidenceAndLimitations: 'High confidence for exposure reduction; exact indoor PM2.5 depends on window sealing and filtration.',
      factBasis: `Current CPCB AQI is ${snapshot.cpcbAqi ?? 'unavailable'} (${category}), PM2.5 is ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³.`,
    },
  ];

  if (isFitness && (highRisk || elevated)) {
    morningActions.push({
      id: 'morning-fitness',
      title: 'Adapt athletic training intensity',
      priority: 'High',
      what: 'Use indoor cycling, mobility, or strength sessions instead of outdoor tempo runs.',
      why: 'High ventilation rates during cardio bypass nasal filtration and draw fine particulates deeper into airways.',
      when: 'During your planned morning workout window.',
      expectedBenefits: 'Preserves cardiovascular training consistency while avoiding acute airway irritation.',
      estimatedImpact: 'Avoids elevated particulate deposition associated with vigorous outdoor exertion.',
      confidenceAndLimitations: 'Guidance based on standard public-health exercise advisories; consult a physician if you experience symptoms.',
      factBasis: `Dominant pollutant: ${snapshot.dominantPollutant}.`,
    });
  }

  const afternoonActions: StructuredRecommendation[] = [
    {
      id: 'afternoon-commute',
      title: isCommuter || isOutdoorWorker ? 'Use lower-traffic commute corridors' : 'Plan midday errands efficiently',
      priority: highRisk ? 'High' : 'Moderate',
      what: isCommuter
        ? 'Use metro/rail or closed-cabin public transit where available, combine errands into one trip, and avoid idling in congested intersections.'
        : 'Schedule essential outdoor errands during midday dispersion windows rather than peak traffic hours.',
      why: `Wind speed is ${wind} km/h. Road corridors carry elevated NO2 and fresh tailpipe particulates compared to residential blocks.`,
      when: '12:00 to 16:00 local time (usually better vertical mixing than dawn/dusk).',
      expectedBenefits: 'Lowers both personal traffic exhaust exposure and per-trip tailpipe emissions.',
      estimatedImpact: 'Combining errands and choosing transit cuts per-km commute CO2e by ~65% while reducing roadside NO2 exposure.',
      confidenceAndLimitations: 'Midday dispersion is typical but can vary during winter temperature inversions or dust events.',
      factBasis: `Wind speed ${wind} km/h; NO2 reading ${snapshot.pollutants.no2 ?? 'N/A'} µg/m³.`,
    },
  ];

  if (isOutdoorWorker && aqi > 150) {
    afternoonActions.push({
      id: 'afternoon-worker',
      title: 'Wear a well-fitting particulate respirator (N95/FFP2)',
      priority: 'Urgent',
      what: 'Use a properly fitted N95/FFP2 mask during prolonged outdoor work and take scheduled breaks indoors when feasible.',
      why: 'Cloth or loose surgical masks do not seal tightly against fine PM2.5 particulates.',
      when: 'Throughout outdoor shifts whenever AQI exceeds 150.',
      expectedBenefits: 'Significantly reduces inhaled particulate matter when outdoor presence is unavoidable.',
      estimatedImpact: 'Properly sealed N95 respirators filter >=95% of test particulates under standard fit conditions.',
      confidenceAndLimitations: 'Real-world protection drops if facial seal is compromised; replace masks when damp or soiled.',
      factBasis: `CPCB AQI ${aqi} (${category}).`,
    });
  }

  const eveningActions: StructuredRecommendation[] = [
    {
      id: 'evening-ventilation',
      title: aqi <= 100 ? 'Cross-ventilate living spaces briefly' : 'Keep windows closed & dampen dust',
      priority: highRisk ? 'High' : 'Moderate',
      what: aqi <= 100
        ? 'Open opposite windows for 15–25 minutes before evening traffic peaks to refresh indoor CO2 and cooking odors.'
        : 'Keep exterior windows and door gaps sealed; use damp mopping instead of dry sweeping and run kitchen exhaust during cooking.',
      why: aqi <= 100
        ? 'Outdoor air is within Good/Satisfactory bounds, making natural cross-ventilation effective for lowering indoor CO2 and VOCs.'
        : 'Evening cooling and rush-hour traffic typically push PM2.5 upward; dry sweeping resuspends settled dust.',
      when: '17:30 to 20:30 local time.',
      expectedBenefits: aqi <= 100
        ? 'Refreshes indoor oxygen/CO2 balance without elevating indoor PM2.5.'
        : 'Prevents outdoor smog ingress and indoor dust resuspension.',
      estimatedImpact: 'Damp cleaning + range hood venting prevents sharp indoor PM2.5 spikes during dinner prep.',
      confidenceAndLimitations: 'If indoor CO2 rises in sealed rooms, brief targeted ventilation or mechanical filtered air intake is needed.',
      factBasis: `Outdoor PM2.5 is ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³.`,
    },
  ];

  const nightActions: StructuredRecommendation[] = [
    {
      id: 'night-bedroom',
      title: profile.hasPurifier ? 'Run bedroom HEPA purifier on sleep mode' : 'Prepare clean-air sleep zone',
      priority: highRisk || hasChildren || hasOlder ? 'High' : 'Moderate',
      what: profile.hasPurifier
        ? 'Set your HEPA purifier to continuous quiet/sleep speed with bedroom doors closed and avoid burning incense or candles.'
        : 'Keep bedroom windows latched during overnight smog hours, wipe bedside surfaces with a damp cloth, and maintain 40–55% relative humidity.',
      why: 'Households spend 7–9 continuous hours in bedrooms overnight while ambient winter smog frequently peaks between midnight and 07:00.',
      when: '21:30 until morning wake-up.',
      expectedBenefits: 'Supports cleaner overnight breathing environment for children, older adults, and sensitive individuals.',
      estimatedImpact: 'Maintaining a clean-air bedroom provides 8 hours of reduced particulate exposure daily.',
      confidenceAndLimitations: 'True HEPA filtration captures particulates (PM2.5/PM10) but not gases (NO2/CO) unless equipped with sufficient activated carbon.',
      factBasis: `Outdoor humidity ${snapshot.weather.humidityPercent ?? 'N/A'}%; tomorrow forecast peak is tracked in Insights.`,
    },
  ];

  return [
    {
      period: 'Morning',
      timeWindow: '06:00 – 11:00',
      airSuitability: morningSuitability,
      summary: highRisk
        ? 'Elevated morning pollution risk — keep exercise and children indoors.'
        : elevated
          ? 'Moderate morning particulates — favor low-traffic corridors.'
          : 'Favorable morning air — good window for outdoor movement.',
      actions: morningActions,
    },
    {
      period: 'Afternoon',
      timeWindow: '11:00 – 17:00',
      airSuitability: afternoonSuitability,
      summary:
        wind >= 10
          ? 'Stronger afternoon breeze aids dispersion; still avoid heavy traffic corridors.'
          : 'Light winds limit dispersion — minimize roadside idling and combine trips.',
      actions: afternoonActions,
    },
    {
      period: 'Evening',
      timeWindow: '17:00 – 21:30',
      airSuitability: eveningSuitability,
      summary:
        aqi <= 100
          ? 'Suitable for brief cross-ventilation before late-evening traffic.'
          : 'Keep home sealed against evening smog buildup; vent kitchen cooking fumes.',
      actions: eveningActions,
    },
    {
      period: 'Night',
      timeWindow: '21:30 – 06:00',
      airSuitability: highRisk ? 'Avoid Outdoor Exposure' : 'Caution',
      summary: 'Protect overnight sleep air quality and check tomorrow’s AQI forecast.',
      actions: nightActions,
    },
  ];
}

export function getInitialIndoorChecklist(): IndoorRoomTask[] {
  return [
    {
      id: 'bed-1',
      room: 'Bedroom',
      title: 'Run true-HEPA purifier or seal drafty window gaps overnight',
      guidance: 'Close bedroom doors and windows during high-AQI nights; place purifier 30–50 cm from walls.',
      whyItMatters: 'You spend ~33% of your day sleeping in one room; continuous overnight filtration lowers cumulative PM2.5 dose.',
      limitation: 'HEPA filters trap particles (PM2.5/allergens) but do not remove CO2 or gaseous VOCs without activated carbon + fresh air.',
      completed: false,
    },
    {
      id: 'bed-2',
      room: 'Bedroom',
      title: 'Wash bedding weekly & damp-wipe bedside surfaces',
      guidance: 'Avoid shaking sheets indoors; wipe headboards and floors with a damp microfiber cloth.',
      whyItMatters: 'Reduces resuspended coarse dust (PM10) and settled allergens without aerosolizing particles.',
      limitation: 'Dust control does not address outdoor fine smoke entering through unsealed vents.',
      completed: false,
    },
    {
      id: 'liv-1',
      room: 'Living room',
      title: 'Eliminate indoor incense, scented candles, and tobacco smoke',
      guidance: 'Switch to zero-combustion fragrance-free habits indoors, especially during winter smog.',
      whyItMatters: 'A single burning incense stick or candle can spike indoor PM2.5 above severe outdoor smog levels in minutes.',
      limitation: 'Eliminating combustion prevents new spikes but does not clean existing outdoor PM2.5 infiltration.',
      completed: false,
    },
    {
      id: 'liv-2',
      room: 'Living room',
      title: 'Cross-ventilate only when outdoor AQI <= 100 (or PM2.5 < 35 µg/m³)',
      guidance: 'Open opposite windows for 15–20 min during midday cleaner air windows; close before evening traffic.',
      whyItMatters: 'Prevents indoor CO2 buildup while avoiding letting heavy outdoor smog inside.',
      limitation: 'In prolonged Severe AQI episodes (>300), un-filtered ventilation brings in hazardous particulates.',
      completed: false,
    },
    {
      id: 'kit-1',
      room: 'Kitchen',
      title: 'Run externally vented range hood before & 15 min after cooking',
      guidance: 'Use back burners under the hood, cover pans while boiling/frying, and avoid charring oils.',
      whyItMatters: 'High-heat frying and gas combustion produce intense indoor PM2.5 and NO2 peaks.',
      limitation: 'Recirculating hoods without external ducts only trap grease and fail to remove NO2 or ultrafine particles.',
      completed: false,
    },
    {
      id: 'kit-2',
      room: 'Kitchen',
      title: 'Keep indoor humidity between 40% and 55% to prevent mold',
      guidance: 'Fix leaking pipes promptly, wipe condensation, and vent steam outdoors.',
      whyItMatters: 'Excess humidity (>60%) promotes mold spores and dust mites; overly dry air (<30%) irritates airways.',
      limitation: 'Dehumidification prevents biological growth but does not filter combustion soot.',
      completed: false,
    },
    {
      id: 'kid-1',
      room: "Children's room",
      title: 'Prioritize clean-air zone & soft-toy dust control',
      guidance: 'Store plush toys in closed bins, wet-mop floors daily during high smog, and inspect HVAC/purifier pre-filters monthly.',
      whyItMatters: 'Children breathe faster per kg of body weight than adults and have developing lungs.',
      limitation: 'Indoor measures protect home hours only; coordinate with school indoor air practices too.',
      completed: false,
    },
    {
      id: 'wrk-1',
      room: 'Workspace',
      title: 'Schedule HVAC/purifier filter inspection & avoid ozone-generating devices',
      guidance: 'Vacuum washable pre-filters every 2 weeks, replace HEPA cartridges per manufacturer hours, and never use ionizers/ozone purifiers.',
      whyItMatters: 'Clogged filters drop Clean Air Delivery Rate (CADR), while ozone generators create lung-irritating ozone.',
      limitation: 'Filter replacement intervals shorten during heavy winter smog seasons.',
      completed: false,
    },
  ];
}

export function getInitialLifestyleAlternatives(): LifestyleAlternative[] {
  return [
    {
      id: 'alt-transit',
      category: 'Transport',
      title: 'Shift daily solo car/two-wheeler trips to metro or bus',
      currentHabit: 'Solo motorized commute (~12 km/day, 5 days/week = 60 km)',
      recommendedAlternative: 'Use metro rail or public bus for 3 of 5 weekly commutes (36 km/week)',
      estimatedReductionKgPerWeek: 4.46,
      methodology: 'Baseline (36 km × 0.192 kg CO2e/km) − Transit (36 km × 0.068 kg CO2e/km)',
      assumptions: 'Medium petrol passenger vehicle baseline; blended urban metro/bus factor (DEFRA 2024).',
      confidenceLevel: 'High',
      adopted: false,
    },
    {
      id: 'alt-errands',
      category: 'Transport',
      title: 'Batch multiple neighborhood errands into one consolidated trip',
      currentHabit: '3 separate short car errands/week (~15 km total cold-start driving)',
      recommendedAlternative: 'Combine errands into 1 planned loop or walk/cycle short legs when AQI <= 100',
      estimatedReductionKgPerWeek: 1.92,
      methodology: '10 km avoided driving × 0.192 kg CO2e/km (excludes extra cold-start inefficiency)',
      assumptions: 'Assumes avoiding 10 km of stop-and-go urban driving weekly.',
      confidenceLevel: 'Moderate',
      adopted: false,
    },
    {
      id: 'alt-carpool',
      category: 'Transport',
      title: 'Share school or office commutes via 2–3 person carpooling',
      currentHabit: '24 km/week single-occupancy school/work drop-offs',
      recommendedAlternative: 'Coordinate alternating neighbor/colleague carpool',
      estimatedReductionKgPerWeek: 2.30,
      methodology: 'Baseline (24 km × 0.192) − Carpool share (24 km × 0.096)',
      assumptions: '2-person shared occupancy; higher occupancy increases per-person savings.',
      confidenceLevel: 'High',
      adopted: false,
    },
    {
      id: 'alt-led',
      category: 'Energy',
      title: 'Replace legacy bulbs with high-efficiency LED lighting',
      currentHabit: '6 older CFL/incandescent bulbs running 4 hours/day',
      recommendedAlternative: 'Switch to 9W Energy-Star / BEE 5-star LED bulbs',
      estimatedReductionKgPerWeek: 4.81,
      methodology: '6 bulbs × 1.12 kWh saved/week × 0.716 kg CO2e/kWh (India CEA grid)',
      assumptions: '40W average wattage reduction per bulb, 4 hours/day; varies by local grid carbon intensity.',
      confidenceLevel: 'High',
      adopted: false,
    },
    {
      id: 'alt-standby',
      category: 'Energy',
      title: 'Eliminate standby phantom loads & optimize AC/appliance efficiency',
      currentHabit: 'Desktops, TVs, routers, and chargers left idle + AC set at 19°C',
      recommendedAlternative: 'Use smart power strips, set AC to 24–25°C with ceiling fan, choose 5-star appliances',
      estimatedReductionKgPerWeek: 7.16,
      methodology: '10 kWh/week saved × 0.716 kg CO2e/kWh (India CEA weighted grid)',
      assumptions: 'Raising AC setpoint by 2–3°C and cutting standby typically saves 1–1.5 kWh/day in warm months.',
      confidenceLevel: 'Moderate',
      adopted: false,
    },
    {
      id: 'alt-waste',
      category: 'Household',
      title: 'Compost kitchen organics & stop all leaf/trash burning',
      currentHabit: 'Mixed household waste sent to landfill; occasional garden debris burning',
      recommendedAlternative: 'Segregate wet waste for composting, reuse packaging, never burn leaves/waste',
      estimatedReductionKgPerWeek: 3.50,
      methodology: '5 kg/week diverted waste × 0.70 kg CO2e/kg avoided landfill methane + local PM2.5 elimination',
      assumptions: 'Average urban household organic fraction; avoiding open burning immediately prevents toxic local smoke.',
      confidenceLevel: 'Moderate',
      adopted: false,
    },
    {
      id: 'alt-delivery',
      category: 'Household',
      title: 'Consolidate online deliveries & choose low-packaging local refills',
      currentHabit: '4–5 fragmented single-item express deliveries per week',
      recommendedAlternative: 'Bundle weekly household orders into single scheduled delivery slots',
      estimatedReductionKgPerWeek: 1.15,
      methodology: 'Estimated 3 avoided last-mile van/scooter dispatches (~2 km allocated share × 0.192 kg/km)',
      assumptions: 'Indicative range depending on courier fleet type (2-wheeler vs diesel van) and route density.',
      confidenceLevel: 'Indicative',
      adopted: false,
    },
  ];
}

export function buildSmartAlerts(snapshot: EnvironmentalSnapshot): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date().toISOString();
  const aqi = snapshot.cpcbAqi;
  const pm25 = snapshot.pollutants.pm25;

  if (aqi !== null && aqi > 300) {
    alerts.push({
      id: 'alert-severe',
      type: 'severe_aqi',
      severity: 'Critical',
      title: `${snapshot.cpcbCategory} Air Quality Alert (CPCB AQI ${aqi})`,
      message: `Outdoor air in ${snapshot.location.name} is ${snapshot.cpcbCategory}. Avoid outdoor exercise, keep windows closed, and prioritize indoor HEPA filtration.`,
      actionLabel: 'Open Daily Routine',
      targetPage: 'routine',
      timestamp: now,
      read: false,
    });
  } else if (aqi !== null && aqi > 200) {
    alerts.push({
      id: 'alert-poor',
      type: 'severe_aqi',
      severity: 'Warning',
      title: `Poor Air Quality Advisory (CPCB AQI ${aqi})`,
      message: `Particulate levels in ${snapshot.location.name} may cause discomfort on prolonged exposure. Children and older adults should limit outdoor exertion.`,
      actionLabel: 'View Family Guidance',
      targetPage: 'assistant',
      timestamp: now,
      read: false,
    });
  }

  // Check rising PM2.5 in next 6 hours from hourly forecast
  const forecastPoints = snapshot.hourly.filter((h) => h.isForecast).slice(0, 6);
  const maxForecastPm25 = forecastPoints.reduce((m, p) => (p.pm25 !== null && p.pm25 > m ? p.pm25 : m), 0);
  if (pm25 !== null && maxForecastPm25 > pm25 * 1.25 && maxForecastPm25 > 45) {
    alerts.push({
      id: 'alert-rising',
      type: 'rising_pm25',
      severity: 'Warning',
      title: 'Forecasted PM2.5 Rise in Next 6 Hours',
      message: `Provider forecast indicates PM2.5 climbing from ${pm25} µg/m³ toward ~${Math.round(maxForecastPm25)} µg/m³. Plan outdoor errands earlier and close windows before evening.`,
      actionLabel: 'Inspect Forecast',
      targetPage: 'insights',
      timestamp: now,
      read: false,
    });
  }

  // Upcoming daily forecast alert (tomorrow / day 3)
  const upcomingPoorDay = snapshot.daily
    .slice(1)
    .find((d) => d.cpcbAqi !== null && d.cpcbAqi > 200);
  if (upcomingPoorDay) {
    alerts.push({
      id: 'alert-forecast',
      type: 'forecast_alert',
      severity: upcomingPoorDay.cpcbAqi! > 300 ? 'Critical' : 'Warning',
      title: `${upcomingPoorDay.label} Outlook: ${upcomingPoorDay.category} Air Expected`,
      message: `Forecasted daily average in ${snapshot.location.name} reaches CPCB AQI ${upcomingPoorDay.cpcbAqi} (${upcomingPoorDay.category}). Plan outdoor errands and filter checks ahead.`,
      actionLabel: 'Review 3-Day Insights',
      targetPage: 'insights',
      timestamp: now,
      read: false,
    });
  }

  // Good ventilation window detection
  if (aqi !== null && aqi <= 100) {
    alerts.push({
      id: 'alert-vent',
      type: 'ventilation_window',
      severity: 'Info',
      title: 'Suitable Cross-Ventilation Window Active',
      message: `Outdoor AQI is ${aqi} (${snapshot.cpcbCategory}). Opening opposite windows for 15–20 minutes can safely refresh indoor air.`,
      actionLabel: 'Indoor Optimizer',
      targetPage: 'indoor',
      timestamp: now,
      read: false,
    });
  }

  alerts.push({
    id: 'alert-filter',
    type: 'filter_maintenance',
    severity: 'Advisory',
    title: 'Monthly Pre-Filter & Exhaust Check',
    message: 'Check purifier pre-filters and kitchen range hood grease traps to maintain airflow efficiency during urban haze episodes.',
    actionLabel: 'Room Checklist',
    targetPage: 'indoor',
    timestamp: now,
    read: false,
  });

  alerts.push({
    id: 'alert-sustain',
    type: 'sustainability_goal',
    severity: 'Info',
    title: 'Weekly Low-Emission Check-In',
    message: 'Log car trips replaced by public transit or energy savings to measure your household CO2e impact.',
    actionLabel: 'Open Calculator',
    targetPage: 'calculator',
    timestamp: now,
    read: false,
  });

  return alerts;
}

export function analyzePollutionInsights(snapshot: EnvironmentalSnapshot): {
  trendDirection: 'Rising' | 'Improving' | 'Stable' | 'Insufficient Data';
  trendDeltaPercent: number | null;
  peakWindow: string;
  cleanestWindow: string;
  stagnationRisk: 'High' | 'Moderate' | 'Low';
  weatherExplanation: string;
  categoryDistribution: Array<{ category: AqiCategory; hours: number; color: string }>;
} {
  const valid = snapshot.hourly.filter((h) => h.pm25 !== null && h.cpcbAqi !== null);
  const past = valid.filter((h) => !h.isForecast);
  const future = valid.filter((h) => h.isForecast);

  let trendDirection: 'Rising' | 'Improving' | 'Stable' | 'Insufficient Data' = 'Insufficient Data';
  let trendDeltaPercent: number | null = null;

  if (past.length >= 4 && future.length >= 4) {
    const recentAvg =
      past.slice(-6).reduce((s, p) => s + (p.pm25 ?? 0), 0) / Math.min(6, past.length);
    const nextAvg =
      future.slice(0, 6).reduce((s, p) => s + (p.pm25 ?? 0), 0) / Math.min(6, future.length);
    if (recentAvg > 0) {
      trendDeltaPercent = Math.round(((nextAvg - recentAvg) / recentAvg) * 100);
      if (trendDeltaPercent >= 12) trendDirection = 'Rising';
      else if (trendDeltaPercent <= -12) trendDirection = 'Improving';
      else trendDirection = 'Stable';
    }
  }

  let peakPoint = valid[0];
  let cleanestPoint = valid[0];
  for (const p of valid) {
    if ((p.pm25 ?? 0) > (peakPoint?.pm25 ?? -1)) peakPoint = p;
    if ((p.pm25 ?? 9999) < (cleanestPoint?.pm25 ?? 9999)) cleanestPoint = p;
  }

  const wind = snapshot.weather.windSpeedKmh ?? 8;
  const humidity = snapshot.weather.humidityPercent ?? 60;
  const stagnationRisk: 'High' | 'Moderate' | 'Low' =
    wind < 6 && humidity > 65 ? 'High' : wind < 11 ? 'Moderate' : 'Low';

  const weatherExplanation =
    stagnationRisk === 'High'
      ? `Low wind speeds (${wind} km/h) combined with elevated humidity (${humidity}%) trap urban particulates close to the ground, increasing winter smog persistence.`
      : stagnationRisk === 'Moderate'
        ? `Moderate air movement (${wind} km/h) provides partial dispersion, though rush-hour emissions can still accumulate in street canyons.`
        : `Brisk winds (${wind} km/h) help dilute localized particulates, though upwind regional smoke can still affect readings.`;

  const counts: Record<AqiCategory, number> = {
    Good: 0,
    Satisfactory: 0,
    Moderate: 0,
    Poor: 0,
    'Very Poor': 0,
    Severe: 0,
  };

  for (const h of valid) {
    const a = h.cpcbAqi ?? 0;
    if (a <= 50) counts.Good++;
    else if (a <= 100) counts.Satisfactory++;
    else if (a <= 200) counts.Moderate++;
    else if (a <= 300) counts.Poor++;
    else if (a <= 400) counts['Very Poor']++;
    else counts.Severe++;
  }

  const categoryDistribution = CPCB_CATEGORY_SCALE.map((entry) => ({
    category: entry.name,
    hours: counts[entry.name],
    color: entry.hexColor,
  }));

  return {
    trendDirection,
    trendDeltaPercent,
    peakWindow: peakPoint ? `${peakPoint.label} (~${peakPoint.pm25} µg/m³ PM2.5)` : 'Insufficient data',
    cleanestWindow: cleanestPoint ? `${cleanestPoint.label} (~${cleanestPoint.pm25} µg/m³ PM2.5)` : 'Insufficient data',
    stagnationRisk,
    weatherExplanation,
    categoryDistribution,
  };
}
