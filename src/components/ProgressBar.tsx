interface ProgressBarProps {
  value: number;
  label: string;
  heightClass?: string;
  className?: string;
}

/**
 * Accessible horizontal progress bar clamping numeric values to 0–100%.
 */
export function ProgressBar({
  value,
  label,
  heightClass = 'h-2',
  className = '',
}: ProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

  return (
    <div
      className={`${heightClass} w-full overflow-hidden rounded-full bg-slate-100 ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[#20C997] transition-all duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
