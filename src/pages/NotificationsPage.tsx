import { useState } from 'react';
import { Bell, CheckCheck, SlidersHorizontal } from 'lucide-react';
import type { AlertPreferences, PageId, SmartAlert } from '../types/airwise.ts';
import { formatSafeTime } from '../lib/format.ts';
import { filterAlertsByPreferences } from '../lib/recommendations.ts';
import { ALERT_SEVERITY_STYLES } from '../lib/statusStyles.ts';

interface NotificationsPageProps {
  alerts: SmartAlert[];
  preferences: AlertPreferences;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onUpdatePreferences: (next: AlertPreferences) => void;
  onNavigate: (page: PageId) => void;
}

export function NotificationsPage({
  alerts,
  preferences,
  onMarkRead,
  onMarkAllRead,
  onUpdatePreferences,
  onNavigate,
}: NotificationsPageProps) {
  const [statusMessage, setStatusMessage] = useState('');

  function togglePref(key: keyof AlertPreferences, label: string) {
    const nextValue = !preferences[key];
    onUpdatePreferences({ ...preferences, [key]: nextValue });
    setStatusMessage(`${label} ${nextValue ? 'enabled' : 'muted'}.`);
  }

  function handleMarkRead(alert: SmartAlert) {
    onMarkRead(alert.id);
    setStatusMessage(`Marked "${alert.title}" as read.`);
  }

  function handleMarkAllRead() {
    onMarkAllRead();
    setStatusMessage('All visible alerts marked as read.');
  }

  const prefItems: Array<{ key: keyof AlertPreferences; label: string; description: string }> = [
    {
      key: 'severeAqi',
      label: 'Severe & Poor AQI Threshold Alerts',
      description: 'Notify when CPCB AQI exceeds 200 (Poor) or 300 (Very Poor / Severe).',
    },
    {
      key: 'risingPm25',
      label: 'Rising PM2.5 Trend Warnings',
      description: 'Alert when next 6-hour forecast indicates >25% PM2.5 surge.',
    },
    {
      key: 'forecastAlerts',
      label: 'Daily Smog Outlook Summaries',
      description: 'Highlight upcoming poor air days from meteorological feeds.',
    },
    {
      key: 'ventilationWindows',
      label: 'Safe Cross-Ventilation Windows',
      description: 'Notify when outdoor AQI drops to <= 100 for safe indoor air exchange.',
    },
    {
      key: 'filterMaintenance',
      label: 'HEPA & Range Hood Maintenance',
      description: 'Periodic reminders to vacuum pre-filters and inspect kitchen exhaust.',
    },
    {
      key: 'sustainabilityGoals',
      label: 'Weekly Sustainability Goal Check-Ins',
      description: 'Gentle weekly prompt to log low-emission commute or power savings.',
    },
  ];

  const enabledAlerts = filterAlertsByPreferences(alerts, preferences);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <section className="space-y-4 lg:col-span-7" aria-label="Active Alerts">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#102A43]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Active Environmental Alerts ({enabledAlerts.length})
            </h2>
          </div>
          {enabledAlerts.some((a) => !a.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#102A43] hover:bg-slate-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <CheckCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        {enabledAlerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No active alerts match your current notification filters.
          </div>
        ) : (
          enabledAlerts.map((alert) => {
            const sevStyle = ALERT_SEVERITY_STYLES[alert.severity];

            return (
              <article
                key={alert.id}
                className={`rounded-xl border p-5 transition-colors ${
                  alert.read ? 'border-slate-200 bg-slate-50/60' : 'border-slate-300 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sevStyle}`}>
                    {alert.severity}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600">
                    {formatSafeTime(alert.timestamp)}
                  </span>
                </div>

                <h3 className="mt-2 font-display text-base font-bold text-[#102A43]">{alert.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{alert.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate(alert.targetPage)}
                    className="rounded-lg bg-[#102A43] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                  >
                    {alert.actionLabel}
                  </button>
                  {!alert.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(alert)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Alert Configuration */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5" aria-label="Notification Rules">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <SlidersHorizontal className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-[#102A43]">
            Configurable Alert Rules
          </h2>
        </div>

        <div className="mt-4 space-y-4">
          {prefItems.map((item) => {
            const checked = preferences[item.key];
            return (
              <label key={item.key} className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <span className="block text-sm font-semibold text-[#102A43]">{item.label}</span>
                  <span className="block text-xs text-slate-600">{item.description}</span>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePref(item.key, item.label)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
