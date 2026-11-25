import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, Lock, Trash2, Upload, Users } from 'lucide-react';
import type { AlertPreferences, FamilyProfile, HouseholdGroup } from '../types/airwise.ts';
import type { CarbonCalculatorInput } from '../lib/impact.ts';
import { downloadTextFile } from '../lib/download.ts';
import { clampFiniteInt, parseAqiStandard, parseGridRegion } from '../lib/format.ts';
import { hasUnsafeObjectKeys, PersistedStateSchema } from '../lib/validation.ts';

interface SettingsPageProps {
  profile: FamilyProfile;
  calcInput?: CarbonCalculatorInput;
  alertPrefs?: AlertPreferences;
  onUpdateProfile: (next: FamilyProfile) => void;
  onImportPreferences?: (data: {
    profile?: FamilyProfile;
    calcInput?: CarbonCalculatorInput;
    alertPrefs?: AlertPreferences;
  }) => void;
  onClearAllData: () => void;
}

const GROUP_OPTIONS: Array<{ id: HouseholdGroup; label: string; hint: string }> = [
  { id: 'adults', label: 'Adults', hint: 'General everyday exposure & transit guidance' },
  { id: 'children', label: 'Children', hint: 'Stricter outdoor play & classroom air thresholds' },
  { id: 'olderAdults', label: 'Older adults', hint: 'Prioritizes calm indoor rest during smog episodes' },
  {
    id: 'respiratorySensitivities',
    label: 'People with respiratory sensitivities',
    hint: 'Early precaution triggers at Moderate AQI levels',
  },
  { id: 'outdoorWorkers', label: 'Outdoor workers', hint: 'Respirator & break scheduling guidance' },
  { id: 'fitnessEnthusiasts', label: 'Fitness enthusiasts', hint: 'Cardio intensity & indoor workout shifts' },
  { id: 'workFromHome', label: 'Work-from-home individuals', hint: 'Workspace airflow & midday window tips' },
  { id: 'dailyCommuters', label: 'Daily commuters', hint: 'Low-traffic routing & closed-cabin transit advice' },
];

export function SettingsPage({
  profile,
  calcInput,
  alertPrefs,
  onUpdateProfile,
  onImportPreferences,
  onClearAllData,
}: SettingsPageProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  function showStatus(text: string, isError = false) {
    setStatusMessage({ text, isError });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), 3500);
  }

  function toggleGroup(group: HouseholdGroup) {
    const exists = profile.groups.includes(group);
    const groups = exists
      ? profile.groups.filter((g) => g !== group)
      : [...profile.groups, group];
    onUpdateProfile({ ...profile, groups });
  }

  function handleExportPreferences() {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'AIRWISE AI stores only non-sensitive household preferences locally.',
      profile,
      ...(calcInput ? { calcInput } : {}),
      ...(alertPrefs ? { alertPrefs } : {}),
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      'airwise-preferences.json',
      'application/json'
    );
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 32 * 1024) {
      showStatus('Preferences file is too large (max 32 KB).', true);
      return;
    }
    try {
      const raw = await file.text();
      const json: unknown = JSON.parse(raw);
      if (hasUnsafeObjectKeys(json)) {
        showStatus('Rejected file containing unsafe object keys.', true);
        return;
      }
      const parsed = PersistedStateSchema.safeParse(json);
      if (!parsed.success || (!parsed.data.profile && !parsed.data.calcInput && !parsed.data.alertPrefs)) {
        showStatus('Invalid AIRWISE preferences JSON format.', true);
        return;
      }
      onImportPreferences?.({
        profile: parsed.data.profile,
        calcInput: parsed.data.calcInput,
        alertPrefs: parsed.data.alertPrefs,
      });
      showStatus('Preferences safely validated and restored.');
    } catch {
      showStatus('Could not parse preferences JSON file.', true);
    }
  }

  function handleConfirmClear() {
    onClearAllData();
    setConfirmClear(false);
    showStatus('Local preferences reset to defaults.');
  }

  return (
    <div className="space-y-6">
      {/* Voluntary Household Profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Voluntary Household Protection Profile
            </h2>
            <p className="text-xs text-slate-600">
              Select applicable groups to personalize your Daily Routine and AI Assistant guidance. No names, ages, or medical records are collected.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GROUP_OPTIONS.map((opt) => {
            const active = profile.groups.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                  active ? 'border-[#102A43] bg-[#F4F8FB]' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleGroup(opt.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                />
                <div>
                  <span className="block text-sm font-semibold text-[#102A43]">{opt.label}</span>
                  <span className="block text-xs text-slate-600">{opt.hint}</span>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="pref-size" className="block text-xs font-semibold text-slate-600">
              Household Size
            </label>
            <input
              id="pref-size"
              type="number"
              min={1}
              max={20}
              value={profile.householdSize}
              onChange={(e) => {
                onUpdateProfile({
                  ...profile,
                  householdSize: clampFiniteInt(Number(e.target.value), 1, 20, 1),
                });
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            />
          </div>

          <div>
            <label htmlFor="pref-standard" className="block text-xs font-semibold text-slate-600">
              Preferred AQI Standard
            </label>
            <select
              id="pref-standard"
              value={profile.preferredStandard}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  preferredStandard: parseAqiStandard(e.target.value, profile.preferredStandard),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <option value="CPCB">India CPCB NAQI (0–500)</option>
              <option value="US_EPA">US EPA AQI (0–500)</option>
            </select>
          </div>

          <div>
            <label htmlFor="pref-grid" className="block text-xs font-semibold text-slate-600">
              Electricity Grid Region
            </label>
            <select
              id="pref-grid"
              value={profile.gridRegion}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  gridRegion: parseGridRegion(e.target.value, profile.gridRegion),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <option value="INDIA">India (CEA 0.716 kg CO2e/kWh)</option>
              <option value="GLOBAL">Global Average (0.475 kg CO2e/kWh)</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={profile.hasPurifier}
                onChange={(e) => onUpdateProfile({ ...profile, hasPurifier: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              />
              <span className="text-xs font-semibold text-[#102A43]">Home uses HEPA purifier</span>
            </label>
          </div>
        </div>
      </section>

      {/* Privacy & Local Data Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Lock className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-[#102A43]">
            Privacy, Data Ownership & Security Controls
          </h2>
        </div>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
          <li>
            <strong>No unnecessary personal data:</strong> AIRWISE AI never requires accounts, phone numbers, exact street addresses, or medical records.
          </li>
          <li>
            <strong>Permission-based location:</strong> Browser geolocation is only requested when you explicitly click &ldquo;Use My Location&rdquo;.
          </li>
          <li>
            <strong>Server-side AI & API handling:</strong> All Gemini AI and environmental feed requests execute on the backend server; API keys are never exposed to the browser.
          </li>
          <li>
            <strong>Local-only preferences:</strong> Your household group selections, indoor checklist progress, and calculator inputs stay in your browser&apos;s local storage.
          </li>
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleExportPreferences}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export Local Preferences (JSON)</span>
          </button>

          {onImportPreferences && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void handleImportFile(e)}
                className="sr-only"
                aria-label="Import AIRWISE preferences JSON file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Import Preferences (JSON)</span>
              </button>
            </>
          )}

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Clear Local Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmClear}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                Cancel
              </button>
            </div>
          )}

          {statusMessage && (
            <span
              className={`text-xs font-semibold ${
                statusMessage.isError ? 'text-red-700' : 'text-emerald-700'
              }`}
              role={statusMessage.isError ? 'alert' : 'status'}
            >
              {statusMessage.text}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
