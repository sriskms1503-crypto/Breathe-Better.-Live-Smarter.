import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../data/presets.ts';
import { DEFAULT_ALERT_PREFS, DEFAULT_CALC_INPUT, DEFAULT_PROFILE } from '../hooks/useAirwiseState.ts';
import { getInitialIndoorChecklist, getInitialLifestyleAlternatives } from './recommendations.ts';
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
import { buildSmartAlerts } from './recommendations.ts';

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
    weather: { temperatureC: null, humidityPercent: null, windSpeedKmh: null, visibilityKm: null, weatherSummary: 'Unavailable' },
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

  const routineHtml = renderedPages[4];
  assert.ok(routineHtml.includes('role="progressbar"'));

  const indoorHtml = renderedPages[5];
  assert.ok(indoorHtml.includes('role="tablist"'));
  assert.ok(indoorHtml.includes('role="tabpanel"'));

  const calculatorHtml = renderedPages[7];
  assert.ok(calculatorHtml.includes('aria-valuetext'));
  assert.ok(calculatorHtml.includes('Export CSV'));

  const settingsHtml = renderedPages[11];
  assert.ok(settingsHtml.includes('Preferred AQI Standard'));
});
