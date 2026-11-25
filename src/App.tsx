import { Suspense, lazy } from 'react';
import { useAirwiseState } from './hooks/useAirwiseState.ts';
import { WorkspaceLayout } from './components/WorkspaceLayout.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';

const AssistantPage = lazy(() =>
  import('./pages/AssistantPage.tsx').then((m) => ({ default: m.AssistantPage }))
);
const RoutinePage = lazy(() =>
  import('./pages/RoutinePage.tsx').then((m) => ({ default: m.RoutinePage }))
);
const IndoorPage = lazy(() =>
  import('./pages/IndoorPage.tsx').then((m) => ({ default: m.IndoorPage }))
);
const SustainabilityPage = lazy(() =>
  import('./pages/SustainabilityPage.tsx').then((m) => ({ default: m.SustainabilityPage }))
);
const CalculatorPage = lazy(() =>
  import('./pages/CalculatorPage.tsx').then((m) => ({ default: m.CalculatorPage }))
);
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage.tsx').then((m) => ({ default: m.InsightsPage }))
);
const CommunityPage = lazy(() =>
  import('./pages/CommunityPage.tsx').then((m) => ({ default: m.CommunityPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage.tsx').then((m) => ({ default: m.NotificationsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage }))
);

export default function App() {
  const state = useAirwiseState();

  if (state.activePage === 'landing') {
    return (
      <ErrorBoundary onReset={() => state.navigate('dashboard')}>
        <LandingPage snapshot={state.snapshot} onNavigate={state.navigate} />
      </ErrorBoundary>
    );
  }

  return (
    <WorkspaceLayout
      activePage={state.activePage}
      onNavigate={state.navigate}
      location={state.location}
      unreadAlertsCount={state.unreadAlertsCount}
    >
      <ErrorBoundary onReset={() => state.navigate('dashboard')}>
        <Suspense
          fallback={
            <div
              className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600"
              role="status"
            >
              Loading module...
            </div>
          }
        >
          {state.activePage === 'dashboard' && (
            <DashboardPage
              snapshot={state.snapshot}
              profile={state.profile}
              loading={state.loadingFeed}
              indoorProgressPercent={state.indoorProgressPercent}
              sustainabilityScore={state.sustainabilityScore}
              weeklyCo2SavedKg={state.weeklyCo2SavedKg}
              onSelectLocation={state.setLocation}
              onRefresh={state.refreshFeed}
              onNavigate={state.navigate}
            />
          )}

          {state.activePage === 'assistant' && (
            <AssistantPage snapshot={state.snapshot} profile={state.profile} />
          )}

          {state.activePage === 'routine' && (
            <RoutinePage
              snapshot={state.snapshot}
              profile={state.profile}
              completedPeriods={state.completedRoutinePeriods}
              onTogglePeriod={state.toggleRoutinePeriod}
              onNavigate={state.navigate}
            />
          )}

          {state.activePage === 'indoor' && (
            <IndoorPage
              snapshot={state.snapshot}
              tasks={state.indoorTasks}
              onToggleTask={state.toggleIndoorTask}
            />
          )}

          {state.activePage === 'sustainability' && (
            <SustainabilityPage
              snapshot={state.snapshot}
              alternatives={state.alternatives}
              onToggleAdopted={state.toggleAdoptedHabit}
            />
          )}

          {state.activePage === 'calculator' && (
            <CalculatorPage
              input={state.calcInput}
              onChangeInput={state.setCalcInput}
              onResetInput={state.resetCalcInput}
            />
          )}

          {state.activePage === 'insights' && <InsightsPage snapshot={state.snapshot} />}

          {state.activePage === 'community' && (
            <CommunityPage
              snapshot={state.snapshot}
              joinedChallengeIds={state.joinedChallenges}
              onToggleJoinChallenge={state.toggleJoinChallenge}
            />
          )}

          {state.activePage === 'notifications' && (
            <NotificationsPage
              alerts={state.alerts}
              preferences={state.alertPrefs}
              onMarkRead={state.markAlertRead}
              onMarkAllRead={state.markAllAlertsRead}
              onUpdatePreferences={state.setAlertPrefs}
              onNavigate={state.navigate}
            />
          )}

          {state.activePage === 'settings' && (
            <SettingsPage
              profile={state.profile}
              calcInput={state.calcInput}
              alertPrefs={state.alertPrefs}
              onUpdateProfile={state.updateProfile}
              onImportPreferences={state.importPreferences}
              onClearAllData={state.handleClearAllData}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </WorkspaceLayout>
  );
}
