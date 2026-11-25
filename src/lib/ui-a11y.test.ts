import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../data/presets.ts';
import { DEFAULT_ALERT_PREFS, DEFAULT_CALC_INPUT, DEFAULT_PROFILE } from '../hooks/useAirwiseState.ts';
import {
  buildDailyRoutine,
  buildSmartAlerts,
  formatDailyRoutineMarkdown,
  getInitialIndoorChecklist,
  getInitialLifestyleAlternatives,
} from './recommendations.ts';
import { createExchangeId, formatAssistantExchangeText } from './assistantClient.ts';
import { CPCB_CATEGORY_SCALE } from './aqi.ts';
import { LandingPage } from '../pages/LandingPage.tsx';
import { DashboardPage } from '../pages/DashboardPage.tsx';
import { AssistantPage } from '../pages/AssistantPage.tsx';
import { RoutinePage } from '../pages/RoutinePage.tsx';
import { IndoorPage } from '../pages/IndoorPage.tsx';
import { SustainabilityPage } from '../pages/SustainabilityPage.tsx';
import { CalculatorPage } from '../pages/CalculatorPage.tsx';
import { InsightsPage } from '../pages/InsightsPage.tsx';
import { CommunityPage } from '../pages/CommunityPage.tsx';
import { NotificationsPage } from '../pages/NotificationsPage.tsx';
import { SettingsPage } from '../pages/SettingsPage.tsx';
import { WorkspaceLayout } from '../components/WorkspaceLayout.tsx';
import { AirQualityMap } from '../components/AirQualityMap.tsx';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { DataStatusBanner } from '../components/DataStatusBanner.tsx';
import { AqiStatusBadge } from '../components/AqiBadge.tsx';
import { AccessibleHourlyTable } from '../components/AccessibleHourlyTable.tsx';
import { RecommendationCard } from '../components/RecommendationCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { ExposureSimulatorCard } from '../components/ExposureSimulatorCard.tsx';
import { CityComparisonCard } from '../components/CityComparisonCard.tsx';
import { AssistantReplyCard } from '../components/AssistantReplyCard.tsx';

const noop = () => {};

test('All 11 application pages render cleanly with semantic landmarks, ARIA roles, and zero unsafe output', () => {
  const delhi = buildDemoFallbackSnapshot(PRESET_CITIES[0]);
  const tokyo = buildDemoFallbackSnapshot(PRESET_CITIES.find((c) => c.id === 'tokyo-jp')!);
  const unavailableSnap = {
    ...tokyo,
    dataStatus: 'UNAVAILABLE' as const,
    cpcbAqi: null,
    usAqi: null,
    pollutants: { pm25: null, pm10: null, no2: null, so2: null, co: null, o3: null },
    weather: {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKmh: null,
      visibilityKm: null,
      weatherSummary: 'Unavailable',
    },
    hourly: [],
    daily: [],
  };

  const indoorTasks = getInitialIndoorChecklist();
  const alternatives = getInitialLifestyleAlternatives();
  const alerts = buildSmartAlerts(delhi);

  const renderedPages = [
    renderToStaticMarkup(createElement(LandingPage, { snapshot: delhi, onNavigate: noop })),
    renderToStaticMarkup(
      createElement(DashboardPage, {
        snapshot: delhi,
        profile: DEFAULT_PROFILE,
        loading: false,
        indoorProgressPercent: 50,
        sustainabilityScore: 28,
        weeklyCo2SavedKg: 15.2,
        onSelectLocation: noop,
        onRefresh: noop,
        onNavigate: noop,
      })
    ),
    renderToStaticMarkup(
      createElement(DashboardPage, {
        snapshot: unavailableSnap,
        profile: { ...DEFAULT_PROFILE, preferredStandard: 'US_EPA' },
        loading: false,
        indoorProgressPercent: 0,
        sustainabilityScore: 0,
        weeklyCo2SavedKg: 0,
        onSelectLocation: noop,
        onRefresh: noop,
        onNavigate: noop,
      })
    ),
    renderToStaticMarkup(createElement(AssistantPage, { snapshot: delhi, profile: DEFAULT_PROFILE })),
    renderToStaticMarkup(
      createElement(RoutinePage, {
        snapshot: delhi,
        profile: DEFAULT_PROFILE,
        completedPeriods: ['Morning'],
        onTogglePeriod: noop,
        onNavigate: noop,
      })
    ),
    renderToStaticMarkup(createElement(IndoorPage, { snapshot: delhi, tasks: indoorTasks, onToggleTask: noop })),
    renderToStaticMarkup(
      createElement(SustainabilityPage, { snapshot: delhi, alternatives, onToggleAdopted: noop })
    ),
    renderToStaticMarkup(
      createElement(CalculatorPage, { input: DEFAULT_CALC_INPUT, onChangeInput: noop, onResetInput: noop })
    ),
    renderToStaticMarkup(createElement(InsightsPage, { snapshot: delhi })),
    renderToStaticMarkup(
      createElement(CommunityPage, { snapshot: delhi, joinedChallengeIds: ['chal-transit'], onToggleJoinChallenge: noop })
    ),
    renderToStaticMarkup(
      createElement(NotificationsPage, {
        alerts,
        preferences: DEFAULT_ALERT_PREFS,
        onMarkRead: noop,
        onMarkAllRead: noop,
        onUpdatePreferences: noop,
        onNavigate: noop,
      })
    ),
    renderToStaticMarkup(
      createElement(SettingsPage, {
        profile: DEFAULT_PROFILE,
        calcInput: DEFAULT_CALC_INPUT,
        alertPrefs: DEFAULT_ALERT_PREFS,
        onUpdateProfile: noop,
        onImportPreferences: noop,
        onClearAllData: noop,
      })
    ),
  ];

  for (const html of renderedPages) {
    assert.ok(html.length > 200);
    assert.equal(html.includes('[object Object]'), false);
    assert.equal(html.includes('javascript:'), false);
  }

  const dashboardCpcb = renderedPages[1];
  assert.ok(dashboardCpcb.includes('Preferred Standard: Indian CPCB NAQI'));
  assert.ok(dashboardCpcb.includes('Personal PM2.5 Exposure Mitigation Estimate'));
  assert.ok(dashboardCpcb.includes('Optimal 2-Hour Ventilation Window'));
  assert.ok(dashboardCpcb.includes('<figcaption'));

  const dashboardUsEpa = renderedPages[2];
  assert.ok(dashboardUsEpa.includes('Preferred Standard: US EPA AQI'));
  assert.ok(dashboardUsEpa.includes('role="status"'));

  const routineHtml = renderedPages[4];
  assert.ok(routineHtml.includes('role="progressbar"'));

  const indoorHtml = renderedPages[5];
  assert.ok(indoorHtml.includes('role="tablist"'));
  assert.ok(indoorHtml.includes('role="tabpanel"'));

  const calculatorHtml = renderedPages[7];
  assert.ok(calculatorHtml.includes('aria-valuetext'));
  assert.ok(calculatorHtml.includes('Export CSV'));
  assert.ok(calculatorHtml.includes('<th scope="row"'));

  const settingsHtml = renderedPages[11];
  assert.ok(settingsHtml.includes('Preferred AQI Standard'));
});

test('Shared navigation, map, provenance banner, badges, tables, progress bar, and SafeImage components uphold a11y and XSS guards', () => {
  const delhi = buildDemoFallbackSnapshot(PRESET_CITIES[0]);

  const layoutHtml = renderToStaticMarkup(
    createElement(WorkspaceLayout, {
      activePage: 'dashboard',
      onNavigate: noop,
      location: delhi.location,
      unreadAlertsCount: 3,
      children: createElement('div', null, 'Workspace body'),
    })
  );
  assert.ok(layoutHtml.includes('Skip to workspace content'));
  assert.ok(layoutHtml.includes('aria-current="page"'));
  assert.ok(layoutHtml.includes('3 unread alerts'));

  const mapIndia = renderToStaticMarkup(
    createElement(AirQualityMap, {
      currentLocation: PRESET_CITIES[0],
      cpcbAqi: 240,
      cpcbCategory: 'Poor',
      onSelectLocation: noop,
    })
  );
  assert.ok(mapIndia.includes('role="tablist"'));
  assert.ok(mapIndia.includes('aria-pressed="true"'));

  const selectorHtml = renderToStaticMarkup(
    createElement(LocationSelector, {
      currentLocation: PRESET_CITIES[0],
      onSelectLocation: noop,
    })
  );
  assert.ok(selectorHtml.includes('role="search"'));
  assert.ok(selectorHtml.includes('aria-live="polite"'));
  assert.ok(selectorHtml.includes('Use My Location'));

  for (const dataStatus of ['LIVE', 'CACHED', 'DEMO_FALLBACK', 'UNAVAILABLE'] as const) {
    const banner = renderToStaticMarkup(
      createElement(DataStatusBanner, {
        snapshot: { ...delhi, dataStatus },
        loading: false,
        onRefresh: noop,
      })
    );
    assert.ok(banner.includes('Environmental Data Provenance'));
  }

  for (const cat of CPCB_CATEGORY_SCALE) {
    const badge = renderToStaticMarkup(
      createElement(AqiStatusBadge, { category: cat.name, aqi: 125 })
    );
    assert.ok(badge.includes('role="status"'));
    assert.ok(badge.includes(cat.name));
  }

  const particulatesTable = renderToStaticMarkup(
    createElement(AccessibleHourlyTable, {
      rows: [{ label: '09:00', phase: 'Observed', pm25: 55, pm10: 95, cpcbAqi: 92 }],
      mode: 'particulates',
    })
  );
  assert.ok(particulatesTable.includes('<th scope="row"'));
  assert.ok(particulatesTable.includes('PM2.5 (µg/m³)'));

  const dispersionTable = renderToStaticMarkup(
    createElement(AccessibleHourlyTable, {
      rows: [{ label: '14:00', phase: 'Forecast', cpcbAqi: 120, windSpeedKmh: 11 }],
      mode: 'dispersion',
    })
  );
  assert.ok(dispersionTable.includes('<th scope="row"'));
  assert.ok(dispersionTable.includes('Wind (km/h)'));

  const clampedHighBar = renderToStaticMarkup(
    createElement(ProgressBar, { value: 145, label: 'Test clamped progress' })
  );
  assert.ok(clampedHighBar.includes('aria-valuenow="100"'));
  const clampedLowBar = renderToStaticMarkup(
    createElement(ProgressBar, { value: Number.NaN, label: 'Test NaN progress' })
  );
  assert.ok(clampedLowBar.includes('aria-valuenow="0"'));

  const recCard = renderToStaticMarkup(
    createElement(RecommendationCard, {
      item: {
        id: 'r1',
        title: 'Run HEPA filter',
        priority: 'Urgent',
        what: 'Turn on bedroom HEPA.',
        why: 'Reduces PM2.5 dose.',
        when: 'Overnight',
        expectedBenefits: 'Cleaner breathing air',
        estimatedImpact: 'Up to 45% indoor reduction',
        confidenceAndLimitations: 'Depends on door sealing.',
        factBasis: 'PM2.5 110 µg/m³',
      },
    })
  );
  assert.ok(recCard.includes('Urgent Priority'));

  const boundaryOk = renderToStaticMarkup(
    createElement(ErrorBoundary, { children: createElement('p', null, 'Healthy child') })
  );
  assert.ok(boundaryOk.includes('Healthy child'));

  // SafeImage must block unsafe schemes (javascript:, http://) and fall back cleanly
  const blockedJsImg = renderToStaticMarkup(
    createElement(SafeImage, {
      src: 'javascript:alert(1)',
      alt: 'Blocked unsafe URI',
      fallbackTitle: 'Verified Fallback Visual',
    })
  );
  assert.equal(blockedJsImg.includes('<img'), false);
  assert.equal(blockedJsImg.includes('javascript:'), false);
  assert.ok(blockedJsImg.includes('Verified Fallback Visual'));

  const blockedHttpImg = renderToStaticMarkup(
    createElement(SafeImage, {
      src: 'http://insecure.example/photo.jpg',
      alt: 'Blocked plain http URI',
      fallbackTitle: 'HTTPS Enforced Fallback',
    })
  );
  assert.equal(blockedHttpImg.includes('<img'), false);
  assert.ok(blockedHttpImg.includes('HTTPS Enforced Fallback'));

  const simulatorHtml = renderToStaticMarkup(
    createElement(ExposureSimulatorCard, {
      locationName: delhi.location.name,
      outdoorPm25: delhi.pollutants.pm25,
      defaultHepaActive: true,
    })
  );
  assert.ok(simulatorHtml.includes('Interactive 24-Hour Personal PM2.5 Dose Simulator'));
  assert.ok(simulatorHtml.includes('role="progressbar"'));

  const compareHtml = renderToStaticMarkup(
    createElement(CityComparisonCard, { primarySnapshot: delhi })
  );
  assert.ok(compareHtml.includes('Live City-to-City Benchmark Comparison'));
  assert.ok(compareHtml.includes('Benchmark City'));

  const exchange = {
    id: createExchangeId(),
    question: 'Should we run HEPA overnight?',
    reply: {
      summary: 'Yes, run HEPA overnight with sealed windows.',
      measuredFacts: ['PM2.5 is elevated'],
      contextualEstimates: ['HEPA lowers bedroom PM2.5 significantly'],
      recommendation: {
        what: 'Run HEPA on medium fan speed',
        why: 'Reduces overnight inhalation',
        when: 'All night',
        expectedBenefits: 'Lower particulate load',
        estimatedImpact: '40-65% indoor reduction',
        confidenceAndLimitations: 'Depends on room door sealing.',
      },
      actionSteps: ['Close exterior window', 'Run purifier'],
      disclaimer: 'Indicative guidance only.',
      source: 'rule-engine-fallback' as const,
    },
  };
  assert.ok(exchange.id.length >= 10);
  const replyCardHtml = renderToStaticMarkup(
    createElement(AssistantReplyCard, { exchange, copied: false, onCopy: noop })
  );
  assert.ok(replyCardHtml.includes('Verified Rule Engine'));
  assert.ok(formatAssistantExchangeText(exchange, 'New Delhi').includes('Run HEPA on medium fan speed'));

  const slots = buildDailyRoutine(delhi, DEFAULT_PROFILE);
  const routineMd = formatDailyRoutineMarkdown(delhi, DEFAULT_PROFILE, slots);
  assert.ok(routineMd.includes('# AIRWISE AI — Daily Clean-Air Routine (New Delhi)'));
});
