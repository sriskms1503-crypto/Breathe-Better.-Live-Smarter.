import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AlertPreferences,
  CityLocation,
  EnvironmentalSnapshot,
  FamilyProfile,
  IndoorRoomTask,
  LifestyleAlternative,
  PageId,
  SmartAlert,
} from '../types/airwise.ts';
import { buildDemoFallbackSnapshot, PRESET_CITIES } from '../data/presets.ts';
import {
  buildSmartAlerts,
  getInitialIndoorChecklist,
  getInitialLifestyleAlternatives,
} from '../lib/recommendations.ts';
import type { CarbonCalculatorInput } from '../lib/impact.ts';
import { calculateCarbonImpact } from '../lib/impact.ts';
import { fetchAirQualitySnapshot } from '../lib/airQualityClient.ts';
import { hasUnsafeObjectKeys, PersistedStateSchema } from '../lib/validation.ts';

const STORAGE_KEY = 'airwise_ai_state_v1';

export const DEFAULT_PROFILE: FamilyProfile = {
  householdSize: 3,
  groups: ['adults', 'children', 'dailyCommuters'],
  preferredStandard: 'CPCB',
  hasPurifier: true,
  gridRegion: 'INDIA',
};

export const DEFAULT_CALC_INPUT: CarbonCalculatorInput = {
  carKmReplacedByTransitPerWeek: 30,
  carKmCarpoolPerWeek: 16,
  carKmReplacedByWalkCyclePerWeek: 8,
  electricitySavedKwhPerWeek: 10,
  ledBulbsReplacedCount: 4,
  wasteReducedKgPerWeek: 3,
  gridRegion: 'INDIA',
  householdSize: 3,
};

export const DEFAULT_ALERT_PREFS: AlertPreferences = {
  severeAqi: true,
  risingPm25: true,
  forecastAlerts: true,
  ventilationWindows: true,
  filterMaintenance: true,
  sustainabilityGoals: true,
};

const VALID_PAGES: readonly PageId[] = [
  'landing',
  'dashboard',
  'assistant',
  'routine',
  'indoor',
  'sustainability',
  'calculator',
  'insights',
  'community',
  'notifications',
  'settings',
];

interface PersistedState {
  locationId?: string;
  customLocation?: CityLocation;
  profile?: FamilyProfile;
  completedTaskIds?: string[];
  completedRoutinePeriods?: Array<'Morning' | 'Afternoon' | 'Evening' | 'Night'>;
  adoptedHabitIds?: string[];
  joinedChallengeIds?: string[];
  readAlertIds?: string[];
  calcInput?: CarbonCalculatorInput;
  alertPrefs?: AlertPreferences;
}

/**
 * Safely parses and validates serialized localStorage state, rejecting prototype-pollution keys.
 */
export function parsePersistedStateJson(raw: string | null): PersistedState {
  if (!raw || raw.length > 64 * 1024) return {};
  try {
    const json: unknown = JSON.parse(raw);
    if (hasUnsafeObjectKeys(json)) return {};
    const parsed = PersistedStateSchema.safeParse(json);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function loadPersistedState(): PersistedState {
  try {
    return parsePersistedStateJson(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function isValidPageId(value: string): value is PageId {
  return VALID_PAGES.some((page) => page === value);
}

function parseHashPage(): PageId | null {
  const hash = window.location.hash.replace('#', '');
  return isValidPageId(hash) ? hash : null;
}

export function useAirwiseState() {
  const initialPersisted = useMemo(() => loadPersistedState(), []);

  const [activePage, setActivePage] = useState<PageId>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return 'dashboard';
    return parseHashPage() ?? 'landing';
  });

  const [location, setLocation] = useState<CityLocation>(() => {
    if (initialPersisted.customLocation) return initialPersisted.customLocation;
    if (initialPersisted.locationId) {
      return PRESET_CITIES.find((c) => c.id === initialPersisted.locationId) ?? PRESET_CITIES[0];
    }
    return PRESET_CITIES[0];
  });

  const [snapshot, setSnapshot] = useState<EnvironmentalSnapshot>(() =>
    buildDemoFallbackSnapshot(location, 'Connecting to live environmental telemetry...')
  );
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);

  const [profile, setProfile] = useState<FamilyProfile>(
    initialPersisted.profile ?? DEFAULT_PROFILE
  );
  const [indoorTasks, setIndoorTasks] = useState<IndoorRoomTask[]>(() => {
    const doneSet = new Set(initialPersisted.completedTaskIds ?? []);
    return getInitialIndoorChecklist().map((t) => ({ ...t, completed: doneSet.has(t.id) }));
  });
  const [alternatives, setAlternatives] = useState<LifestyleAlternative[]>(() => {
    const adoptedSet = new Set(initialPersisted.adoptedHabitIds ?? ['alt-transit']);
    return getInitialLifestyleAlternatives().map((a) => ({ ...a, adopted: adoptedSet.has(a.id) }));
  });
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>(
    initialPersisted.joinedChallengeIds ?? ['chal-transit']
  );
  const [calcInput, setCalcInput] = useState<CarbonCalculatorInput>(
    initialPersisted.calcInput ?? DEFAULT_CALC_INPUT
  );
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences>(
    initialPersisted.alertPrefs ?? DEFAULT_ALERT_PREFS
  );
  const [completedRoutinePeriods, setCompletedRoutinePeriods] = useState<
    Array<'Morning' | 'Afternoon' | 'Evening' | 'Night'>
  >(initialPersisted.completedRoutinePeriods ?? []);
  const [readAlertIds, setReadAlertIds] = useState<string[]>(initialPersisted.readAlertIds ?? []);

  const fetchControllerRef = useRef<AbortController | null>(null);

  const fetchSnapshot = useCallback(async (targetLoc: CityLocation) => {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setLoadingFeed(true);
    try {
      const nextSnapshot = await fetchAirQualitySnapshot(targetLoc, controller.signal);
      if (!controller.signal.aborted) {
        setSnapshot(nextSnapshot);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setSnapshot(buildDemoFallbackSnapshot(targetLoc));
    } finally {
      if (!controller.signal.aborted) {
        setLoadingFeed(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot(location);
    return () => {
      fetchControllerRef.current?.abort();
    };
  }, [location, fetchSnapshot]);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseHashPage();
      if (next) setActivePage(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const persistedPayload = useMemo<PersistedState>(
    () => ({
      locationId: location.id,
      customLocation: location,
      profile,
      completedTaskIds: indoorTasks.filter((t) => t.completed).map((t) => t.id),
      completedRoutinePeriods,
      adoptedHabitIds: alternatives.filter((a) => a.adopted).map((a) => a.id),
      joinedChallengeIds: joinedChallenges,
      readAlertIds,
      calcInput,
      alertPrefs,
    }),
    [
      location,
      profile,
      indoorTasks,
      completedRoutinePeriods,
      alternatives,
      joinedChallenges,
      readAlertIds,
      calcInput,
      alertPrefs,
    ]
  );

  const latestPayloadRef = useRef<PersistedState>(persistedPayload);
  latestPayloadRef.current = persistedPayload;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestPayloadRef.current));
      } catch {
        // Ignore storage quota errors
      }
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [persistedPayload]);

  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestPayloadRef.current));
      } catch {
        // Ignore storage quota errors
      }
    };
  }, []);

  const navigate = useCallback((page: PageId) => {
    setActivePage(page);
    const targetHash = page === 'landing' ? '' : `#${page}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(
        null,
        '',
        targetHash || window.location.pathname + window.location.search
      );
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const alerts: SmartAlert[] = useMemo(() => {
    const readSet = new Set(readAlertIds);
    return buildSmartAlerts(snapshot).map((a) => ({
      ...a,
      read: readSet.has(a.id),
    }));
  }, [snapshot, readAlertIds]);

  const unreadAlertsCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const indoorProgressPercent = useMemo(() => {
    const done = indoorTasks.filter((t) => t.completed).length;
    return indoorTasks.length > 0 ? Math.round((done / indoorTasks.length) * 100) : 0;
  }, [indoorTasks]);

  const sustainabilityScore = useMemo(() => {
    const adopted = alternatives.filter((a) => a.adopted).length;
    return alternatives.length > 0 ? Math.round((adopted / alternatives.length) * 100) : 0;
  }, [alternatives]);

  const calcResult = useMemo(() => calculateCarbonImpact(calcInput), [calcInput]);

  const handleClearAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(PRESET_CITIES[0]);
    setProfile(DEFAULT_PROFILE);
    setIndoorTasks(getInitialIndoorChecklist());
    setCompletedRoutinePeriods([]);
    setAlternatives(getInitialLifestyleAlternatives());
    setJoinedChallenges([]);
    setCalcInput(DEFAULT_CALC_INPUT);
    setAlertPrefs(DEFAULT_ALERT_PREFS);
    setReadAlertIds([]);
  }, []);

  const updateProfile = useCallback((next: FamilyProfile) => {
    setProfile(next);
    setCalcInput((prev) => ({
      ...prev,
      gridRegion: next.gridRegion,
      householdSize: next.householdSize,
    }));
  }, []);

  const importPreferences = useCallback(
    (imported: {
      profile?: FamilyProfile;
      calcInput?: CarbonCalculatorInput;
      alertPrefs?: AlertPreferences;
    }) => {
      if (imported.profile) setProfile(imported.profile);
      if (imported.calcInput) setCalcInput(imported.calcInput);
      if (imported.alertPrefs) setAlertPrefs(imported.alertPrefs);
    },
    []
  );

  const refreshFeed = useCallback(() => {
    void fetchSnapshot(location);
  }, [fetchSnapshot, location]);

  const toggleIndoorTask = useCallback((id: string) => {
    setIndoorTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const toggleAdoptedHabit = useCallback((id: string) => {
    setAlternatives((prev) =>
      prev.map((a) => (a.id === id ? { ...a, adopted: !a.adopted } : a))
    );
  }, []);

  const toggleJoinChallenge = useCallback((id: string) => {
    setJoinedChallenges((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const resetCalcInput = useCallback(() => setCalcInput(DEFAULT_CALC_INPUT), []);

  const toggleRoutinePeriod = useCallback(
    (period: 'Morning' | 'Afternoon' | 'Evening' | 'Night') => {
      setCompletedRoutinePeriods((prev) =>
        prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period]
      );
    },
    []
  );

  const markAlertRead = useCallback((id: string) => {
    setReadAlertIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setReadAlertIds(alerts.map((a) => a.id));
  }, [alerts]);

  return {
    activePage,
    navigate,
    location,
    setLocation,
    snapshot,
    loadingFeed,
    refreshFeed,
    profile,
    updateProfile,
    indoorTasks,
    toggleIndoorTask,
    alternatives,
    toggleAdoptedHabit,
    joinedChallenges,
    toggleJoinChallenge,
    calcInput,
    setCalcInput,
    resetCalcInput,
    alertPrefs,
    setAlertPrefs,
    completedRoutinePeriods,
    toggleRoutinePeriod,
    alerts,
    unreadAlertsCount,
    markAlertRead,
    markAllAlertsRead,
    indoorProgressPercent,
    sustainabilityScore,
    weeklyCo2SavedKg: calcResult.weeklySavingsKg,
    importPreferences,
    handleClearAllData,
  };
}
