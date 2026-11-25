import { Bot, Check, Copy, ShieldAlert, User } from 'lucide-react';
import type { ChatExchange } from '../lib/assistantClient.ts';

interface AssistantReplyCardProps {
  exchange: ChatExchange;
  copied: boolean;
  onCopy: (exchange: ChatExchange) => void;
}

/**
 * Renders a user question paired with the structured, fact-grounded assistant response.
 */
export function AssistantReplyCard({
  exchange,
  copied,
  onCopy,
}: AssistantReplyCardProps) {
  return (
    <div className="space-y-3">
      {/* User Question */}
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-2xl rounded-xl bg-[#102A43] px-4 py-3 text-sm text-white">
          {exchange.question}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[#102A43]">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {/* Assistant Structured Reply */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#102A43]">
              AIRWISE Family Guidance
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-600">
              Engine:{' '}
              {exchange.reply.source === 'gemini-4-hydrogen'
                ? 'Gemini AI + Live Context'
                : 'Verified Rule Engine'}
            </span>
            <button
              type="button"
              onClick={() => onCopy(exchange)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap shrink-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#102A43]">{exchange.reply.summary}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-[#F4F8FB] p-4">
            <h4 className="text-xs font-bold text-[#102A43]">Measured Facts</h4>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {exchange.reply.measuredFacts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-[#F4F8FB] p-4">
            <h4 className="text-xs font-bold text-[#102A43]">Contextual Estimates</h4>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {exchange.reply.contextualEstimates.map((est, idx) => (
                <li key={idx}>{est}</li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-600">What Action to Take</dt>
            <dd className="mt-0.5 text-sm text-[#102A43]">{exchange.reply.recommendation.what}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">Why It Matters</dt>
            <dd className="mt-0.5 text-sm text-slate-700">{exchange.reply.recommendation.why}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">When to Act</dt>
            <dd className="mt-0.5 text-sm text-slate-700">{exchange.reply.recommendation.when}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">Expected Benefits</dt>
            <dd className="mt-0.5 text-sm text-slate-700">{exchange.reply.recommendation.expectedBenefits}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">Estimated Environmental Impact</dt>
            <dd className="mt-0.5 text-sm text-slate-700">{exchange.reply.recommendation.estimatedImpact}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">Confidence & Limitations</dt>
            <dd className="mt-0.5 text-sm text-slate-600">
              {exchange.reply.recommendation.confidenceAndLimitations}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-[#102A43]">Practical Next Steps</h4>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-700">
            {exchange.reply.actionSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
          <span>{exchange.reply.disclaimer}</span>
        </p>
      </article>
    </div>
  );
}
