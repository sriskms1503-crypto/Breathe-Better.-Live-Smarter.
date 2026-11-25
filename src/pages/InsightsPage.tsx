import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Download, Info, Table, TrendingDown, TrendingUp, Wind } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EnvironmentalSnapshot } from '../types/airwise.ts';
import { analyzePollutionInsights } from '../lib/recommendations.ts';
import { buildCsvString, downloadTextFile } from '../lib/download.ts';
import { slugifyCity } from '../lib/format.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import { AccessibleHourlyTable } from '../components/AccessibleHourlyTable.tsx';

interface InsightsPageProps {
  snapshot: EnvironmentalSnapshot;
}

export function InsightsPage({ snapshot }: InsightsPageProps) {
  const [showTable, setShowTable] = useState(false);
  const insights = useMemo(() => analyzePollutionInsights(snapshot), [snapshot]);

  const chartData = useMemo(
    () =>
      snapshot.hourly.map((h) => ({
        label: h.label,
        cpcbAqi: h.cpcbAqi,
        windSpeedKmh: h.windSpeedKmh,
        phase: h.isForecast ? 'Forecast' : 'Observed',
      })),
    [snapshot.hourly]
  );

  function handleExportDispersionCsv() {
    const csv = buildCsvString(
      ['Time Window', 'Phase', 'CPCB AQI', 'Wind Speed (km/h)'],
      chartData.map((row) => [
        row.label,
        row.phase,
        row.cpcbAqi ?? '',
        row.windSpeedKmh ?? '',
      ])
    );
    downloadTextFile(
      csv,
      `airwise-dispersion-${slugifyCity(snapshot.location.name)}.csv`,
      'text/csv;charset=utf-8'
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
        <p>
          <strong>Data Transparency:</strong> These insights are computed directly from observed hourly measurements and meteorological forecast provider feeds ({snapshot.provider}). AIRWISE AI does not claim a proprietary machine-learning forecasting model.
        </p>
      </div>

      {/* Insight Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Pollution Pattern Highlights">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Short-Term Trend</p>
          <div className="mt-2 flex items-center gap-2">
            {insights.trendDirection === 'Rising' ? (
              <TrendingUp className="h-5 w-5 text-red-600" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            )}
            <span className="font-display text-xl font-bold text-[#102A43]">
              {insights.trendDirection}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
            {insights.trendDeltaPercent !== null
              ? `${insights.trendDeltaPercent > 0 ? '+' : ''}${insights.trendDeltaPercent}% next 6h vs recent 6h`
              : 'Insufficient hourly series'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Peak Pollution Window</p>
          <div className="mt-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <span className="font-mono text-sm font-bold text-[#102A43] tabular-nums">
              {insights.peakWindow}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Highest PM2.5 in 48h window</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Cleanest Air Window</p>
          <div className="mt-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <span className="font-mono text-sm font-bold text-[#102A43] tabular-nums">
              {insights.cleanestWindow}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Preferred time for brief ventilation</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Atmospheric Stagnation Risk</p>
          <div className="mt-2 flex items-center gap-2">
            <Wind className="h-5 w-5 text-sky-700" aria-hidden="true" />
            <span className="font-display text-xl font-bold text-[#102A43]">
              {insights.stagnationRisk}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Wind {snapshot.weather.windSpeedKmh ?? 'N/A'} km/h · RH {snapshot.weather.humidityPercent ?? 'N/A'}%
          </p>
        </div>
      </section>

      {/* Forecast & Dispersion Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Hourly CPCB AQI & Wind Dispersion Correlation ({snapshot.location.name})
            </h2>
            <p className="text-xs text-slate-600">
              Compares modeled/observed CPCB AQI against 10m wind speed (km/h) across past 24h and next 24h forecast
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportDispersionCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <Table className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showTable ? 'Hide Data Table' : 'Accessible Table'}</span>
            </button>
          </div>
        </div>

        <figure className="mt-4">
          <div
            className="h-72 w-full"
            role="img"
            aria-label={`Dual-axis line chart comparing hourly CPCB AQI and wind speed in km/h for ${snapshot.location.name}. Short-term trend is ${insights.trendDirection} with ${insights.stagnationRisk} stagnation risk.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} minTickGap={24} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#102A43' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#0369A1' }} unit=" km/h" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpcbAqi"
                  name="CPCB AQI"
                  stroke="#102A43"
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="windSpeedKmh"
                  name="Wind Speed (km/h)"
                  stroke="#0284C7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">
            Hourly CPCB AQI and wind dispersion correlation across {chartData.length} hourly points. Toggle Accessible Table for numeric values.
          </figcaption>
        </figure>

        {showTable && <AccessibleHourlyTable rows={chartData} mode="dispersion" />}
      </section>

      {/* Weather Pattern & Preventive Actions */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:h-full">
            <SafeImage
              src="/src/assets/images/winter_smog_city_1794844257921.jpg"
              alt="Urban skyline under calm winter morning haze and atmospheric inversion"
              fallbackTitle="Winter Smog & Temperature Inversion"
            />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-[#102A43]">
              Weather-Driven Smog & Temperature Inversion Pattern
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{insights.weatherExplanation}</p>
            {snapshot.pollutants.pm25 !== null && snapshot.pollutants.pm10 !== null && snapshot.pollutants.pm10 > 0 && (
              <p className="mt-2.5 text-xs text-slate-600">
                <strong>Fine-to-Coarse Ratio (PM2.5 / PM10):</strong>{' '}
                <span className="font-mono font-semibold text-[#102A43]">
                  {(snapshot.pollutants.pm25 / snapshot.pollutants.pm10).toFixed(2)}
                </span>{' '}
                —{' '}
                {snapshot.pollutants.pm25 / snapshot.pollutants.pm10 >= 0.55
                  ? 'Dominated by fine combustion particulates (traffic exhaust, heating, biomass smoke).'
                  : 'Elevated coarse dust fraction (road resuspension, construction, or windblown dust).'}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-[#102A43]">
              Preventive Actions for Upcoming Windows
            </h3>
            <ul className="mt-2.5 list-disc space-y-2 pl-4 text-sm text-slate-700">
              <li>Schedule outdoor errands or brief ventilation near the cleanest window ({insights.cleanestWindow}).</li>
              <li>Close bedroom and living-room windows ahead of evening rush hours ({insights.peakWindow}).</li>
              <li>Prepare N95/FFP2 masks and verify HEPA pre-filters whenever stagnation risk is Moderate or High.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
