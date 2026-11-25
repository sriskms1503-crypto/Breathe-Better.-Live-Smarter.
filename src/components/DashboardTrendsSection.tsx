import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Table } from 'lucide-react';
import type { AqiCategory, EnvironmentalSnapshot } from '../types/airwise.ts';
import { buildCsvString, downloadTextFile } from '../lib/download.ts';
import { slugifyCity } from '../lib/format.ts';
import { AccessibleHourlyTable } from './AccessibleHourlyTable.tsx';

interface DashboardTrendsSectionProps {
  snapshot: EnvironmentalSnapshot;
  categoryDistribution: Array<{ category: AqiCategory; hours: number; color: string }>;
}

/**
 * Displays 48-hour PM2.5/PM10 telemetry chart, CSV export, category distribution, and 3-day outlook.
 */
export function DashboardTrendsSection({
  snapshot,
  categoryDistribution,
}: DashboardTrendsSectionProps) {
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);
  const [showDistTable, setShowDistTable] = useState(false);

  const chartData = useMemo(
    () =>
      snapshot.hourly.map((h) => ({
        label: h.label,
        pm25: h.pm25,
        pm10: h.pm10,
        cpcbAqi: h.cpcbAqi,
        phase: h.isForecast ? 'Forecast' : 'Observed',
      })),
    [snapshot.hourly]
  );

  function handleExportCsv() {
    const csv = buildCsvString(
      ['Timestamp', 'Label', 'Phase', 'PM2.5 (ug/m3)', 'PM10 (ug/m3)', 'CPCB AQI', 'US AQI', 'Wind (km/h)'],
      snapshot.hourly.map((h) => [
        h.time,
        h.label,
        h.isForecast ? 'Forecast' : 'Observed',
        h.pm25,
        h.pm10,
        h.cpcbAqi,
        h.usAqi,
        h.windSpeedKmh,
      ])
    );
    downloadTextFile(
      csv,
      `airwise-${slugifyCity(snapshot.location.name)}-48h-telemetry.csv`,
      'text/csv;charset=utf-8'
    );
  }

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label="Pollution Trends and Distribution">
      <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              48-Hour Particulate Trend (Observed + Provider Forecast)
            </h2>
            <p className="text-xs text-slate-600">
              Hourly PM2.5 and PM10 concentrations in µg/m³ ({snapshot.location.name})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAccessibleTable((v) => !v)}
              aria-expanded={showAccessibleTable}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
            >
              <Table className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showAccessibleTable ? 'Hide Data Table' : 'Accessible Table'}</span>
            </button>
          </div>
        </div>

        <figure className="mt-4">
          <figcaption className="sr-only">
            48-hour hourly area chart of PM2.5 and PM10 particulate concentrations in {snapshot.location.name}. Toggle Accessible Table for numeric values.
          </figcaption>
          <div className="h-64 w-full" role="img" aria-label={`48-hour PM2.5 and PM10 chart for ${snapshot.location.name}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" µg" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#CBD5E1',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pm10"
                  name="PM10 (µg/m³)"
                  stroke="#38BDF8"
                  fill="#38BDF8"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="pm25"
                  name="PM2.5 (µg/m³)"
                  stroke="#102A43"
                  fill="#20C997"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {showAccessibleTable && (
          <AccessibleHourlyTable
            rows={chartData}
            mode="particulates"
            caption={`48-hour PM2.5, PM10, and CPCB AQI readings for ${snapshot.location.name}`}
          />
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              AQI Category Distribution
            </h2>
            <p className="text-xs text-slate-600">Hours per CPCB category in 48h window</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDistTable((v) => !v)}
            aria-expanded={showDistTable}
            aria-label="Toggle category distribution table"
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            {showDistTable ? 'Chart' : 'Table'}
          </button>
        </div>

        {showDistTable ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Hours spent in each CPCB AQI category over 48 hours</caption>
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {categoryDistribution.map((row) => (
                  <tr key={row.category}>
                    <th scope="row" className="px-3 py-1.5 font-sans font-medium text-[#102A43]">{row.category}</th>
                    <td className="px-3 py-1.5 text-right">{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <figure className="mt-4">
            <figcaption className="sr-only">
              Bar chart showing total hours spent in each Indian CPCB AQI category across the 48-hour window.
            </figcaption>
            <div className="h-48 w-full" role="img" aria-label="48-hour CPCB category distribution bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 10, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#102A43' }} width={86} />
                  <Tooltip />
                  <Bar dataKey="hours" name="Hours" radius={[0, 4, 4, 0]}>
                    {categoryDistribution.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        )}

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-[#102A43]">3-Day Daily Outlook</p>
          {snapshot.daily.map((day) => (
            <div key={day.date} className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{day.label}</span>
              <span className="font-mono text-slate-600 tabular-nums">
                {day.avgPm25 !== null ? `${day.avgPm25} µg/m³` : 'N/A'}
              </span>
              <span className="font-semibold text-[#102A43]">{day.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
