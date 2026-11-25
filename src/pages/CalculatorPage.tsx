import { useMemo, useState } from 'react';
import { Download, Info, RotateCcw, Table } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateCarbonImpact, type CarbonCalculatorInput } from '../lib/impact.ts';
import { buildCsvString, downloadTextFile } from '../lib/download.ts';
import { clampFiniteInt, clampFiniteNumber, parseGridRegion } from '../lib/format.ts';
import { SafeImage } from '../components/SafeImage.tsx';

interface CalculatorPageProps {
  input: CarbonCalculatorInput;
  onChangeInput: (next: CarbonCalculatorInput) => void;
  onResetInput: () => void;
}

const SHORT_CATEGORY_NAMES: Record<string, string> = {
  transit: 'Transit',
  carpool: 'Carpool',
  active: 'Walk/Cycle',
  electricity: 'Power',
  led: 'LEDs',
  waste: 'Waste',
};

type SliderNumericKey =
  | 'carKmReplacedByTransitPerWeek'
  | 'carKmCarpoolPerWeek'
  | 'carKmReplacedByWalkCyclePerWeek'
  | 'electricitySavedKwhPerWeek';

interface SliderFieldConfig {
  id: string;
  key: SliderNumericKey;
  label: string;
  unit: string;
  unitDescription: string;
  min: number;
  max: number;
  step: number;
  accentClass: string;
}

const SLIDER_FIELDS: ReadonlyArray<SliderFieldConfig> = [
  {
    id: 'calc-transit',
    key: 'carKmReplacedByTransitPerWeek',
    label: 'Car km replaced by public transit / week',
    unit: 'km',
    unitDescription: 'kilometers per week',
    min: 0,
    max: 250,
    step: 2,
    accentClass: 'accent-[#102A43]',
  },
  {
    id: 'calc-carpool',
    key: 'carKmCarpoolPerWeek',
    label: 'Solo driving shifted to carpool / week',
    unit: 'km',
    unitDescription: 'kilometers per week',
    min: 0,
    max: 200,
    step: 2,
    accentClass: 'accent-[#102A43]',
  },
  {
    id: 'calc-active',
    key: 'carKmReplacedByWalkCyclePerWeek',
    label: 'Car km replaced by walking/cycling / week',
    unit: 'km',
    unitDescription: 'kilometers per week',
    min: 0,
    max: 100,
    step: 1,
    accentClass: 'accent-[#20C997]',
  },
  {
    id: 'calc-kwh',
    key: 'electricitySavedKwhPerWeek',
    label: 'Electricity consumption reduced / week',
    unit: 'kWh',
    unitDescription: 'kilowatt-hours per week',
    min: 0,
    max: 100,
    step: 1,
    accentClass: 'accent-[#38BDF8]',
  },
];

export function CalculatorPage({ input, onChangeInput, onResetInput }: CalculatorPageProps) {
  const [showChartTable, setShowChartTable] = useState(false);
  const result = useMemo(() => calculateCarbonImpact(input), [input]);

  function updateField<K extends keyof CarbonCalculatorInput>(key: K, value: CarbonCalculatorInput[K]) {
    onChangeInput({ ...input, [key]: value });
  }

  const chartData = useMemo(
    () =>
      result.breakdown.map((b) => ({
        name: SHORT_CATEGORY_NAMES[b.id] ?? b.label,
        Baseline: b.baselineKgPerWeek,
        Alternative: b.alternativeKgPerWeek,
        Saved: b.savingsKgPerWeek,
      })),
    [result.breakdown]
  );

  function handleExportCsv() {
    const csv = buildCsvString(
      ['Category', 'Emission Factor Summary', 'Baseline (kg CO2e/wk)', 'Alternative (kg CO2e/wk)', 'Net Saved (kg CO2e/wk)'],
      result.breakdown.map((row) => [
        row.label,
        row.factorSummary,
        row.baselineKgPerWeek,
        row.alternativeKgPerWeek,
        row.savingsKgPerWeek,
      ])
    );
    downloadTextFile(csv, 'airwise-carbon-impact-breakdown.csv', 'text/csv;charset=utf-8');
  }

  return (
    <div className="space-y-6">
      {/* HD Clean Energy & Transit Banner */}
      <section className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4">
          <SafeImage
            src="/src/assets/images/hd_clean_energy_home_1795574770360.jpg"
            alt="Residential rooftop solar panels and clean neighborhood commute"
            fallbackTitle="Household Clean Energy & Carbon Model"
          />
        </div>
        <div className="sm:col-span-8">
          <h2 className="font-display text-sm font-bold text-[#102A43]">
            Household Carbon Impact & Co-Benefit Estimator
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Adjust weekly travel, electricity, lighting, and waste habits to inspect transparent baseline vs. low-emission CO2e savings across India CEA and IEA Global grid emission factors.
          </p>
        </div>
      </section>

      {/* Top KPI Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Calculated CO2e Savings">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Daily Savings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
            {result.dailySavingsKg.toFixed(2)} kg
          </p>
          <p className="mt-1 text-[11px] text-slate-600">CO2e / day</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Weekly Savings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {result.weeklySavingsKg.toFixed(2)} kg
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Baseline {result.weeklyBaselineKg} − Alt {result.weeklyAlternativeKg}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Monthly Savings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
            {result.monthlySavingsKg.toFixed(1)} kg
          </p>
          <p className="mt-1 text-[11px] text-slate-600">30-day projection</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Annual Household Impact</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#102A43] tabular-nums">
            {result.annualSavingsKg.toFixed(0)} kg
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {result.perPersonAnnualSavingsKg.toFixed(0)} kg/member · {result.community100HomesAnnualTonnes.toFixed(1)} t per 100 homes
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Interactive Controls */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5" aria-label="Habit Inputs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Weekly Habit Inputs
            </h2>
            <button
              type="button"
              onClick={onResetInput}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            {SLIDER_FIELDS.map((field) => {
              const value = input[field.key];
              return (
                <div key={field.id}>
                  <label htmlFor={field.id} className="flex justify-between font-medium text-[#102A43]">
                    <span>{field.label}</span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      {value} {field.unit}
                    </span>
                  </label>
                  <input
                    id={field.id}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    aria-valuetext={`${value} ${field.unitDescription}`}
                    onChange={(e) =>
                      updateField(
                        field.key,
                        clampFiniteNumber(Number(e.target.value), field.min, field.max, 0)
                      )
                    }
                    className={`mt-1.5 w-full ${field.accentClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]`}
                  />
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calc-led" className="block text-xs font-semibold text-slate-600">
                  LED bulbs upgraded
                </label>
                <input
                  id="calc-led"
                  type="number"
                  min={0}
                  max={200}
                  value={input.ledBulbsReplacedCount}
                  onChange={(e) => {
                    updateField('ledBulbsReplacedCount', clampFiniteNumber(Number(e.target.value), 0, 200, 0));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label htmlFor="calc-waste" className="block text-xs font-semibold text-slate-600">
                  Waste reduced (kg/wk)
                </label>
                <input
                  id="calc-waste"
                  type="number"
                  min={0}
                  max={500}
                  value={input.wasteReducedKgPerWeek}
                  onChange={(e) => {
                    updateField('wasteReducedKgPerWeek', clampFiniteNumber(Number(e.target.value), 0, 500, 0));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label htmlFor="calc-region" className="block text-xs font-semibold text-slate-600">
                  Grid Emission Factor
                </label>
                <select
                  id="calc-region"
                  value={input.gridRegion}
                  onChange={(e) => updateField('gridRegion', parseGridRegion(e.target.value, input.gridRegion))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                >
                  <option value="INDIA">India CEA (0.716 kg/kWh)</option>
                  <option value="GLOBAL">IEA Global (0.475 kg/kWh)</option>
                </select>
              </div>
              <div>
                <label htmlFor="calc-household" className="block text-xs font-semibold text-slate-600">
                  Household Members
                </label>
                <input
                  id="calc-household"
                  type="number"
                  min={1}
                  max={20}
                  value={input.householdSize}
                  onChange={(e) => {
                    updateField('householdSize', clampFiniteInt(Number(e.target.value), 1, 20, 1));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Chart & Methodology */}
        <section className="space-y-5 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[#102A43]">
                  Baseline vs. Low-Emission Alternative (Weekly kg CO2e)
                </h2>
                <p className="text-xs text-slate-600">
                  Formula: Estimated CO2e Savings = Baseline Emissions − Alternative Emissions (±{result.uncertaintyRangePercent}% uncertainty band)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChartTable((v) => !v)}
                aria-expanded={showChartTable}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <Table className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{showChartTable ? 'Chart View' : 'Table View'}</span>
              </button>
            </div>

            {!showChartTable ? (
              <figure className="mt-4">
                <div
                  className="h-64 w-full"
                  role="img"
                  aria-label={`Bar chart comparing weekly baseline emissions (${result.weeklyBaselineKg} kg CO2e) against low-emission alternatives (${result.weeklyAlternativeKg} kg CO2e).`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" interval={0} tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" kg" />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Baseline" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Alternative" fill="#20C997" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <figcaption className="sr-only">
                  Weekly emissions across 6 household categories totaling {result.weeklySavingsKg.toFixed(2)} kg CO2e saved per week.
                </figcaption>
              </figure>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">
                    Comparison of baseline and alternative weekly CO2e emissions by category
                  </caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Baseline (kg)</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Alternative (kg)</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Net Saved (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chartData.map((item) => (
                      <tr key={item.name}>
                        <th scope="row" className="px-3 py-2 font-medium text-[#102A43]">{item.name}</th>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{item.Baseline}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{item.Alternative}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                          {item.Saved}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#102A43]">
                Transparent Factor Breakdown (Weekly kg CO2e)
              </h3>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  Transparent CO2e emission factor breakdown by household habit category
                </caption>
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">Category</th>
                    <th scope="col" className="py-2 px-2 text-right font-semibold">Baseline</th>
                    <th scope="col" className="py-2 px-2 text-right font-semibold">Alternative</th>
                    <th scope="col" className="py-2 pl-2 text-right font-semibold">Net Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.breakdown.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="py-2 pr-3 font-normal text-left">
                        <div className="font-medium text-[#102A43]">{row.label}</div>
                        <div className="text-[11px] text-slate-600">{row.factorSummary}</div>
                      </th>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{row.baselineKgPerWeek}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{row.alternativeKgPerWeek}</td>
                      <td className="py-2 pl-2 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {row.savingsKgPerWeek}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Assumptions & Carbon vs Exposure Note */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-display text-sm font-bold text-[#102A43]">
            Assumptions & Uncertainty Disclosure
          </h3>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-xs text-slate-600">
            {result.assumptions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5 text-xs text-[#102A43]">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
            <div>
              <h3 className="font-display text-sm font-bold">
                Carbon Reduction vs. Personal Exposure Reduction
              </h3>
              <p className="mt-1.5 leading-relaxed text-slate-700">{result.exposureVsCarbonNote}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
