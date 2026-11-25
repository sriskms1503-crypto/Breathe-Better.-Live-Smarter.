import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Download, RotateCcw, Send } from 'lucide-react';
import type { EnvironmentalSnapshot, FamilyProfile } from '../types/airwise.ts';
import { AqiStatusBadge } from '../components/AqiBadge.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { AssistantReplyCard } from '../components/AssistantReplyCard.tsx';
import {
  askEnvironmentalAssistant,
  createExchangeId,
  formatAssistantExchangeText,
  type ChatExchange,
} from '../lib/assistantClient.ts';
import { downloadTextFile } from '../lib/download.ts';
import { slugifyCity } from '../lib/format.ts';
import { formatHouseholdGroups } from '../lib/recommendations.ts';

interface AssistantPageProps {
  snapshot: EnvironmentalSnapshot;
  profile: FamilyProfile;
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

/**
 * Interactive AI Family Environmental Assistant grounded in current location telemetry and profile.
 */
export function AssistantPage({ snapshot, profile }: AssistantPageProps) {
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      requestAbortRef.current?.abort();
    };
  }, []);

  async function askQuestion(text: string) {
    const clean = text.trim();
    if (clean.length < 3) {
      setErrorMsg('Please enter a question of at least 3 characters.');
      return;
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await askEnvironmentalAssistant(clean, snapshot, profile, controller.signal);
      if (controller.signal.aborted) return;

      if (result.error || !result.reply) {
        setErrorMsg(result.error ?? 'Could not generate advice right now. Please try again.');
        return;
      }

      setExchanges((prev) => [
        ...prev,
        {
          id: createExchangeId(),
          question: clean,
          reply: result.reply!,
        },
      ]);
      setQuestion('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setErrorMsg('Network error reaching the AI assistant endpoint.');
    } finally {
      if (!controller.signal.aborted) {
        setSubmitting(false);
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void askQuestion(question);
  }

  async function handleCopyReply(ex: ChatExchange) {
    const summaryText = formatAssistantExchangeText(ex, snapshot.location.name);
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedId(ex.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  function handleExportSession() {
    const markdown = exchanges
      .map((ex) => formatAssistantExchangeText(ex, snapshot.location.name))
      .join('\n\n---\n\n');
    downloadTextFile(
      markdown,
      `airwise-assistant-${slugifyCity(snapshot.location.name)}.md`,
      'text/markdown;charset=utf-8'
    );
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
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleExportSession}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export Session</span>
              </button>
              <button
                type="button"
                onClick={() => setExchanges([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap shrink-0"
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
            <AssistantReplyCard
              key={ex.id}
              exchange={ex}
              copied={copiedId === ex.id}
              onCopy={(item) => void handleCopyReply(item)}
            />
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
