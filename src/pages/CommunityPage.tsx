import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Shield, Users } from 'lucide-react';
import { COMMUNITY_CHALLENGES, type CommunityChallenge } from '../data/presets.ts';
import type { EnvironmentalSnapshot } from '../types/airwise.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { downloadTextFile } from '../lib/download.ts';
import { escapeXml } from '../lib/format.ts';
import { useTabNavigation } from '../hooks/useTabNavigation.ts';

interface CommunityPageProps {
  snapshot: EnvironmentalSnapshot;
  joinedChallengeIds: string[];
  onToggleJoinChallenge: (id: string) => void;
}

type ChallengeFilter = 'All' | CommunityChallenge['category'];
type CardTheme = 'smog' | 'transit' | 'noburn';

const CHALLENGE_FILTERS: readonly ChallengeFilter[] = [
  'All',
  'Transport',
  'Energy',
  'Indoor',
  'Neighborhood',
];

const CARD_THEMES: readonly CardTheme[] = ['smog', 'transit', 'noburn'];
const CARD_THEME_LABELS: Record<CardTheme, string> = {
  smog: 'Winter Smog',
  transit: 'Clean Commute',
  noburn: 'Zero Burning',
};

export function CommunityPage({
  snapshot,
  joinedChallengeIds,
  onToggleJoinChallenge,
}: CommunityPageProps) {
  const [cardTheme, setCardTheme] = useState<CardTheme>('smog');
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('All');
  const [copied, setCopied] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const challengeTabs = useTabNavigation(
    CHALLENGE_FILTERS,
    challengeFilter,
    setChallengeFilter
  );
  const cardTabs = useTabNavigation(CARD_THEMES, cardTheme, setCardTheme);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const collectiveWeeklyKg = COMMUNITY_CHALLENGES.reduce((sum, c) => {
    const joinedBonus = joinedChallengeIds.includes(c.id) ? 1 : 0;
    return sum + (c.participantsCount + joinedBonus) * c.estimatedWeeklyCo2SavedKgPerHome;
  }, 0);

  const personalWeeklyKg = COMMUNITY_CHALLENGES.reduce((sum, c) => {
    return sum + (joinedChallengeIds.includes(c.id) ? c.estimatedWeeklyCo2SavedKgPerHome : 0);
  }, 0);

  const maxWeeklyKg = COMMUNITY_CHALLENGES.reduce(
    (sum, c) => sum + c.estimatedWeeklyCo2SavedKgPerHome,
    0
  );
  const personalProgressPct =
    maxWeeklyKg > 0 ? Math.min(100, Math.round((personalWeeklyKg / maxWeeklyKg) * 100)) : 0;

  const visibleChallenges =
    challengeFilter === 'All'
      ? COMMUNITY_CHALLENGES
      : COMMUNITY_CHALLENGES.filter((c) => c.category === challengeFilter);

  const awarenessTemplates: Record<CardTheme, { headline: string; body: string }> = {
    smog: {
      headline: 'Protect Family Lungs During High-AQI Hours',
      body: `Current regional AQI in ${snapshot.location.name} is ${snapshot.cpcbAqi ?? 'elevated'} (${snapshot.cpcbCategory}). Shift vigorous workouts indoors, vent kitchen cooking fumes, and avoid burning dry leaves or incense.`,
    },
    transit: {
      headline: 'One Car-Light Week Saves Real Neighborhood Emissions',
      body: 'Shifting 36 km of solo driving to metro or bus avoids ~4.5 kg CO2e every week—and reduces roadside NO2 outside schools and residential streets.',
    },
    noburn: {
      headline: 'Zero Open Burning = Cleaner Mornings for Everyone',
      body: 'Composting garden leaves instead of burning eliminates dense local PM2.5 smoke while preventing ~0.70 kg CO2e per kg of diverted organic waste.',
    },
  };

  const activeCard = awarenessTemplates[cardTheme];

  async function handleCopyCardText() {
    const text = `${activeCard.headline}\n\n${activeCard.body}\n\nShared via AIRWISE AI (Privacy-Safe Community Card — no personal address shared).`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setLiveStatus('Awareness card text copied to clipboard.');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setLiveStatus('Clipboard access unavailable in this browser context.');
    }
  }

  function handleDownloadSvgCard() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="440" viewBox="0 0 800 440">
      <rect width="800" height="440" rx="24" fill="#102A43"/>
      <rect x="36" y="36" width="728" height="368" rx="16" fill="#173859" stroke="#38BDF8" stroke-opacity="0.35"/>
      <text x="64" y="88" fill="#20C997" font-family="sans-serif" font-size="16" font-weight="700">AIRWISE AI · COMMUNITY AWARENESS CARD</text>
      <foreignObject x="64" y="108" width="672" height="84">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#FFFFFF;font-family:sans-serif;font-size:26px;font-weight:700;line-height:1.25;">${escapeXml(activeCard.headline)}</div>
      </foreignObject>
      <foreignObject x="64" y="200" width="672" height="140">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#E2E8F0;font-family:sans-serif;font-size:18px;line-height:1.5;">${escapeXml(activeCard.body)}</div>
      </foreignObject>
      <text x="64" y="372" fill="#CBD5E1" font-family="sans-serif" font-size="14">City-level summary (${escapeXml(snapshot.location.name)}) · No personal location or identity shared</text>
    </svg>`;
    downloadTextFile(svg, `airwise-awareness-${cardTheme}.svg`, 'image/svg+xml');
    setLiveStatus(`Downloaded SVG awareness card for ${CARD_THEME_LABELS[cardTheme]}.`);
  }

  function handleToggleChallenge(chal: CommunityChallenge, currentlyJoined: boolean) {
    onToggleJoinChallenge(chal.id);
    setLiveStatus(
      currentlyJoined
        ? `Left challenge: ${chal.title}.`
        : `Joined challenge: ${chal.title}.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveStatus}
      </div>

      {/* Privacy Guarantee + Collective Impact */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Collective Community Impact">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-600">Estimated Collective Weekly Savings</p>
          <p className="mt-1 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
            {(collectiveWeeklyKg / 1000).toFixed(2)} t CO2e
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Modeled from active challenge participants × weekly habit factors
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-600">Your Active Weekly Challenges</p>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
              {personalWeeklyKg.toFixed(1)} kg/wk
            </span>
          </div>
          <p className="mt-1 font-mono text-3xl font-bold text-[#102A43] tabular-nums">
            {joinedChallengeIds.length} / {COMMUNITY_CHALLENGES.length}
          </p>
          <ProgressBar
            value={personalProgressPct}
            label="Weekly challenge CO2e contribution"
            className="mt-2.5"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#102A43]">
            <Shield className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>Community Privacy Safeguard</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            AIRWISE AI never publishes precise coordinates, home addresses, or user names. Challenge participation stays stored locally on your device.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="h-52 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:col-span-5 lg:h-auto">
          <SafeImage
            src="/src/assets/images/community_clean_air_1794844257865.jpg"
            alt="Neighborhood residents planting trees and cycling together in a sunlit park"
            fallbackTitle="Neighborhood Clean Air Action"
          />
        </div>
        <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <p className="text-xs font-semibold text-emerald-700">Educational Clean Air Campaign</p>
          <h2 className="mt-1 font-display text-lg font-bold text-[#102A43]">
            Neighborhood Clean-Air Drives Without Compromising Privacy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Coordinated local habits—carpooling school runs, zero open leaf burning, and cutting peak electricity demand—reduce shared neighborhood particulate pollution while protecting sensitive residents.
          </p>
        </div>
      </section>

      {/* Weekly Challenges */}
      <section aria-label="Weekly Community Challenges">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-[#102A43]">
            Weekly Neighborhood & Household Challenges
          </h2>
          <div
            className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1"
            role="tablist"
            aria-label="Filter challenges by category"
          >
            {CHALLENGE_FILTERS.map((cat, index) => {
              const active = challengeFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  {...challengeTabs.getTabProps(cat, index, 'community-challenges')}
                  onClick={() => setChallengeFilter(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                    active ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          {...challengeTabs.getPanelProps('community-challenges')}
          aria-label={`${challengeFilter} neighborhood challenges`}
        >
          {visibleChallenges.map((chal) => {
            const joined = joinedChallengeIds.includes(chal.id);
            return (
              <article key={chal.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-[#102A43]">{chal.category}</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {chal.participantsCount + (joined ? 1 : 0)} homes
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-bold text-[#102A43]">
                    {chal.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">{chal.goalDescription}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
                    {chal.actionChecklist.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    ~{chal.estimatedWeeklyCo2SavedKgPerHome} kg CO2e/wk per home
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleChallenge(chal, joined)}
                    aria-pressed={joined}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                      joined
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                        : 'bg-[#102A43] text-white hover:bg-[#1a3f63]'
                    }`}
                  >
                    {joined ? 'Joined Challenge' : 'Join Challenge'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Shareable Awareness Card Builder */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Shareable Environmental Awareness Card
            </h2>
            <p className="text-xs text-slate-600">
              Generate a clean city-level summary card for housing society or school groups (zero personal data).
            </p>
          </div>
          <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Awareness card theme">
            {CARD_THEMES.map((theme, index) => (
              <button
                key={theme}
                type="button"
                {...cardTabs.getTabProps(theme, index, 'awareness-card-theme')}
                onClick={() => setCardTheme(theme)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                  cardTheme === theme ? 'bg-white text-[#102A43] shadow-xs' : 'text-slate-600 hover:text-[#102A43]'
                }`}
              >
                {CARD_THEME_LABELS[theme]}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-4 rounded-xl bg-[#102A43] p-6 text-white"
          {...cardTabs.getPanelProps('awareness-card-theme')}
          aria-label={activeCard.headline}
        >
          <p className="text-xs font-semibold text-[#20C997]">AIRWISE AI · COMMUNITY ACTION</p>
          <h3 className="mt-2 font-display text-xl font-bold">{activeCard.headline}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200">{activeCard.body}</p>
          <p className="mt-4 text-[11px] text-slate-300">
            Privacy-safe city summary ({snapshot.location.name}) · No street address or user identity included
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCopyCardText()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span>{copied ? 'Copied Text' : 'Copy Message'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvgCard}
            className="inline-flex items-center gap-2 rounded-lg bg-[#102A43] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Download Shareable SVG Card</span>
          </button>
        </div>
      </section>
    </div>
  );
}
