export interface HourlyTableRow {
  label: string;
  phase: string;
  pm25?: number | null;
  pm10?: number | null;
  cpcbAqi: number | null;
  windSpeedKmh?: number | null;
}

interface AccessibleHourlyTableProps {
  rows: HourlyTableRow[];
  mode: 'particulates' | 'dispersion';
  caption?: string;
}

export function AccessibleHourlyTable({
  rows,
  mode,
  caption = 'Hourly environmental readings',
}: AccessibleHourlyTableProps) {
  return (
    <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Time</th>
            <th scope="col" className="px-3 py-2 font-semibold">Phase</th>
            {mode === 'particulates' ? (
              <>
                <th scope="col" className="px-3 py-2 text-right font-semibold">PM2.5 (µg/m³)</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">PM10 (µg/m³)</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">CPCB AQI</th>
              </>
            ) : (
              <>
                <th scope="col" className="px-3 py-2 text-right font-semibold">CPCB AQI</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Wind (km/h)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
          {rows.map((row, idx) => (
            <tr key={`${row.label}-${idx}`} className="hover:bg-slate-50/80">
              <th scope="row" className="px-3 py-1.5 font-normal text-slate-800">{row.label}</th>
              <td className="px-3 py-1.5 font-sans text-slate-700">{row.phase}</td>
              {mode === 'particulates' ? (
                <>
                  <td className="px-3 py-1.5 text-right">{row.pm25 ?? 'N/A'}</td>
                  <td className="px-3 py-1.5 text-right">{row.pm10 ?? 'N/A'}</td>
                  <td className="px-3 py-1.5 text-right">{row.cpcbAqi ?? 'N/A'}</td>
                </>
              ) : (
                <>
                  <td className="px-3 py-1.5 text-right">{row.cpcbAqi ?? 'N/A'}</td>
                  <td className="px-3 py-1.5 text-right">{row.windSpeedKmh ?? 'N/A'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
