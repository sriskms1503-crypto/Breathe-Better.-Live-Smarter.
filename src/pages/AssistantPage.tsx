import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Check, Copy, RotateCcw, Send, ShieldAlert, User } from 'lucide-react';
import type {
  AssistantStructuredReply,
  EnvironmentalSnapshot,
  FamilyProfile,
} from '../types/airwise.ts';
import { AqiStatusBadge } from '../components/AqiBadge.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { formatHouseholdGroups } from '../lib/recommendations.ts';

interface AssistantPageProps {
  snapshot: EnvironmentalSnapshot;
  profile: FamilyProfile;
}

interface ChatExchange {
  id: string;
  question: string;
  reply: AssistantStructuredReply;
}

const QUICK_QUESTIONS = [
  'Is it safe for my children to play outside today?',
  'What should my family do during severe smog?',
  'Is morning walking advisable today?',
  'How can I improve my bedroom air quality?',
  'What precautions should elderly family members take?',
  'Should I keep my windows open?',
  'How can I reduce exposure while commuting?',
  'What can I do to reduce my carbon footprint?',
];

export function AssistantPage({ snapshot, profile }: AssistantPageProps) {
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function askQuestion(text: string) {
    const clean = text.trim();
    if (clean.length < 3) {
      setErrorMsg('Please enter a question of at least 3 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clean,
          locationName: `${snapshot.location.name}, ${snapshot.location.country}`,
          countryCode: snapshot.location.countryCode,
          cpcbAqi: snapshot.cpcbAqi,
          cpcbCategory: snapshot.cpcbCategory,
          usAqi: snapshot.usAqi,
          pm25: snapshot.pollutants.pm25,
          pm10: snapshot.pollutants.pm10,
          no2: snapshot.pollutants.no2,
          o3: snapshot.pollutants.o3,
          temperatureC: snapshot.weather.temperatureC,
          humidityPercent: snapshot.weather.humidityPercent,
          windSpeedKmh: snapshot.weather.windSpeedKmh,
          dataStatus: snapshot.dataStatus,
          householdGroups: profile.groups,
        }),
      });

      const data = (await res.json()) as { reply?: AssistantStructuredReply; error?: string };
      if (!res.ok || !data.reply) {
        setErrorMsg(data.error ?? 'Could not generate advice right now. Please try again.');
        return;
      }

      setExchanges((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question: clean,
          reply: data.reply!,
        },
      ]);
      setQuestion('');
    } catch {
      setErrorMsg('Network error reaching the AI assistant endpoint.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void askQuestion(question);
  }

  async function handleCopyReply(ex: ChatExchange) {
    const summaryText = [
      `AIRWISE AI Guidance (${snapshot.location.name})`,
      `Question: ${ex.question}`,
      `Summary: ${ex.reply.summary}`,
      `Action: ${ex.reply.recommendation.what}`,
      `Why: ${ex.reply.recommendation.why}`,
      `When: ${ex.reply.recommendation.when}`,
      `Steps:\n${ex.reply.actionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      `Note: ${ex.reply.disclaimer}`,
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedId(ex.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Context + HD Visual Strip */}
      <section className="grid grid-cols-1 items-stretch gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:col-span-4 sm:h-auto">
          <SafeImage
            src="/src/assets/images/hd_family_air_monitor_1795574770269.jpg"
            alt="Family checking a digital indoor air quality monitor next to a HEPA air purifier"
            fallbackTitle="Family Indoor Air Guidance"
          />
        </div>
        <div className="flex flex-col justify-between gap-3 p-1 sm:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Active Assistant Context · {snapshot.location.name} ({snapshot.dataStatus})
              </p>
              <h2 className="mt-1 font-display text-base font-bold text-[#102A43]">
                Grounded Family Environmental Guidance
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Household profile:{' '}
                <span className="font-semibold text-[#102A43]">
                  {formatHouseholdGroups(profile.groups)}
                </span>
              </p>
            </div>
            <AqiStatusBadge category={snapshot.cpcbCategory} aqi={snapshot.cpcbAqi} />
          </div>
          {exchanges.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setExchanges([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear Conversation</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Quick Action Questions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="Quick Questions">
        <h2 className="font-display text-sm font-bold text-[#102A43]">
          Common Family Air Quality Questions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={submitting}
              onClick={() => void askQuestion(q)}
              className="rounded-lg border border-slate-200 bg-[#F4F8FB] px-3 py-2 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#38BDF8] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Conversation History */}
      <section className="space-y-5" aria-label="Assistant Responses" aria-live="polite">
        {exchanges.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Bot className="mx-auto h-9 w-9 text-emerald-700" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-bold text-[#102A43]">
              Ask about outdoor safety, indoor air, or daily habits
            </h3>
            <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600">
              Select any quick question above or type your own below. Every answer separates measured facts from estimates and explains what to do, why, when, and limitations.
            </p>
          </div>
        ) : (
          exchanges.map((ex) => (
            <div key={ex.id} className="space-y-3">
              {/* User Question */}
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-2xl rounded-xl bg-[#102A43] px-4 py-3 text-sm text-white">
                  {ex.question}
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
                      Engine: {ex.reply.source === 'gemini-4-hydrogen' ? 'Gemini AI + Live Context' : 'Verified Rule Engine'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyReply(ex)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
                    >
                      {copiedId === ex.id ? (
                        <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{copiedId === ex.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#102A43]">{ex.reply.summary}</p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-[#F4F8FB] p-4">
                    <h4 className="text-xs font-bold text-[#102A43]">Measured Facts</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                      {ex.reply.measuredFacts.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-[#F4F8FB] p-4">
                    <h4 className="text-xs font-bold text-[#102A43]">Contextual Estimates</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                      {ex.reply.contextualEstimates.map((est, idx) => (
                        <li key={idx}>{est}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-600">What Action to Take</dt>
                    <dd className="mt-0.5 text-sm text-[#102A43]">{ex.reply.recommendation.what}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Why It Matters</dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{ex.reply.recommendation.why}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">When to Act</dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{ex.reply.recommendation.when}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Expected Benefits</dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{ex.reply.recommendation.expectedBenefits}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Estimated Environmental Impact</dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{ex.reply.recommendation.estimatedImpact}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Confidence & Limitations</dt>
                    <dd className="mt-0.5 text-sm text-slate-600">{ex.reply.recommendation.confidenceAndLimitations}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-[#102A43]">Practical Next Steps</h4>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-700">
                    {ex.reply.actionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                  <span>{ex.reply.disclaimer}</span>
                </p>
              </article>
            </div>
          ))
        )}
      </section>

      {/* Ask Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4"
        aria-label="Ask AI Family Assistant"
      >
        <label htmlFor="assistant-question-input" className="sr-only">
          Ask an air quality or family protection question
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="assistant-question-input"
            type="text"
            maxLength={600}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about air quality in ${snapshot.location.name}, indoor rooms, or commuting...`}
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-[#102A43] placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/30"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102A43] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>{submitting ? 'Analyzing...' : 'Ask Assistant'}</span>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-600">
          <span>Questions are sanitized server-side and grounded in measured telemetry.</span>
          <span className="font-mono tabular-nums">{question.length}/600</span>
        </div>
        {errorMsg && (
          <p className="mt-2 text-xs font-medium text-red-700" role="alert">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
