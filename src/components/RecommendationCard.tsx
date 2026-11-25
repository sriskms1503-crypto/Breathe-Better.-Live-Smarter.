import type { StructuredRecommendation } from '../types/airwise.ts';

interface RecommendationCardProps {
  item: StructuredRecommendation;
}

export function RecommendationCard({ item }: RecommendationCardProps) {
  const priorityStyle =
    item.priority === 'Urgent'
      ? 'bg-red-50 text-red-800 border-red-200'
      : item.priority === 'High'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : item.priority === 'Moderate'
          ? 'bg-sky-50 text-sky-900 border-sky-200'
          : 'bg-emerald-50 text-emerald-900 border-emerald-200';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h3 className="font-display text-base font-semibold text-[#102A43]">{item.title}</h3>
        <span className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${priorityStyle}`}>
          {item.priority} Priority
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-600">What Action to Take</dt>
          <dd className="mt-0.5 text-[#102A43]">{item.what}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-600">Why It Matters</dt>
          <dd className="mt-0.5 text-slate-700">{item.why}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-600">When to Act</dt>
          <dd className="mt-0.5 text-slate-700">{item.when}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-600">Expected Benefits</dt>
          <dd className="mt-0.5 text-slate-700">{item.expectedBenefits}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-600">Estimated Environmental Impact</dt>
          <dd className="mt-0.5 text-slate-700">{item.estimatedImpact}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-600">Confidence & Limitations</dt>
          <dd className="mt-0.5 text-slate-600">{item.confidenceAndLimitations}</dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
        Measured basis: <span className="font-mono text-slate-700">{item.factBasis}</span>
      </p>
    </article>
  );
}
