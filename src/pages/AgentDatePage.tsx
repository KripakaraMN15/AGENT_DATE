import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Bot,
  HeartHandshake,
  Activity,
  User,
  ArrowRight,
  ArrowLeft,
  Flame,
  Loader2,
  CheckCircle2,
  Award,
  ShieldCheck,
  Play
} from 'lucide-react';
import { fetchDateSession, startAgentDate, DateSessionData } from '../api/client';

export default function AgentDatePage() {
  const { personA, personB } = useParams<{ personA: string; personB: string }>();
  const subjectA = personA || 'subject-a';
  const subjectB = personB || 'subject-b';

  const [dateData, setDateData] = useState<DateSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  const loadSession = () => {
    setLoading(true);
    fetchDateSession(subjectA, subjectB)
      .then((res) => {
        setDateData(res.data);
      })
      .catch(() => {
        setDateData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSession();
  }, [subjectA, subjectB]);

  const handleSimulateDate = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      await startAgentDate(subjectA, subjectB);
      loadSession();
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate agent speed date.');
    } finally {
      setSimulating(false);
    }
  };

  const pA = dateData?.personA;
  const pB = dateData?.personB;
  const session = dateData?.session;
  const directedEval = dateData?.directedEvaluation;

  const score = directedEval?.compatibilityScore ?? session?.compatibility?.score;
  const summary = directedEval?.chemistrySummary ?? session?.compatibility?.summary;
  const sharedInterests = directedEval?.sharedInterests ?? session?.compatibility?.sharedInterests ?? [];
  const strongAlignment = directedEval?.strongAlignment ?? session?.compatibility?.strongAlignment ?? [];
  const potentialDifferences = directedEval?.potentialDifferences ?? session?.compatibility?.potentialDifferences ?? [];
  const evidence = directedEval?.evidence ?? session?.compatibility?.evidence ?? [];

  const hasCompletedDate =
    Boolean(session?.conversation && session.conversation.length > 0 && typeof score === 'number');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/rankings"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rankings & Matchboard</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>Speed Date Pairing</span>
          <span aria-hidden="true">·</span>
          <span className="text-pink-400 font-semibold">{subjectA}</span>
          <span>→</span>
          <span className="text-amber-400 font-semibold">{subjectB}</span>
        </div>
      </div>

      {/* Top Banner & Header */}
      <div className="border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-pink-500 uppercase tracking-widest mb-2">
            <span>Phase 5C Execution</span>
            <span aria-hidden="true">·</span>
            <span>Agent Dating Transcript & Evaluation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-zinc-100">
            Agent Dating Conversation & Chemistry
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Multi-turn autonomous dialogue between independent proxy agents representing two real individuals. Evaluated across shared interests, core values, conversational dynamic, and lifestyle alignment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!hasCompletedDate && (
            <button
              onClick={handleSimulateDate}
              disabled={simulating || loading}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-300 hover:to-pink-400 px-4 py-2.5 rounded-lg shadow-lg shadow-pink-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {simulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Simulating 6-Turn Date...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 fill-current" />
                  <span>Start Autonomous Speed Date</span>
                </>
              )}
            </button>
          )}

          <div className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span>
              Status: {hasCompletedDate ? 'Date Completed' : 'Awaiting Simulation'}
            </span>
          </div>
        </div>
      </div>

      {simError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
          {simError}
        </div>
      )}

      {/* Two Agent Identities Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Versus Divider Badge */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-950 border border-pink-500/40 text-pink-400 items-center justify-center font-display text-xs font-bold shadow-xl">
          VS
        </div>

        {/* Agent A Identity */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 relative overflow-hidden backdrop-blur-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-display font-bold text-xl text-pink-400 overflow-hidden shrink-0">
                {pA?.avatarUrl ? (
                  <img src={pA.avatarUrl} alt={pA.name} className="w-full h-full object-cover" />
                ) : (
                  pA?.name?.charAt(0) || 'A'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Bot className="w-3.5 h-3.5 text-pink-400" />
                  <span>Agent Identity A (Initiator)</span>
                </div>
                <h2 className="text-xl font-display font-semibold text-zinc-100 mt-0.5">
                  {pA?.name || `Agent (${subjectA})`}
                </h2>
                <p className="text-xs font-mono text-zinc-500 truncate max-w-xs">
                  {pA?.headline || pA?.currentPosition || 'Ingested Persona'}
                </p>
              </div>
            </div>

            <Link
              to={`/people/${subjectA}`}
              className="text-xs text-zinc-400 hover:text-pink-300 flex items-center gap-1 font-mono"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-xs font-mono text-zinc-400">
            <div className="p-2 rounded bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">CORE VALUES</span>
              <span className="text-zinc-300 truncate block">
                {pA?.intelligence?.values?.slice(0, 2).join(', ') || 'Grounded in bio'}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">KEY INTERESTS</span>
              <span className="text-pink-400 truncate block">
                {pA?.intelligence?.interests?.slice(0, 2).join(', ') || 'Scraped data'}
              </span>
            </div>
          </div>
        </div>

        {/* Agent B Identity */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 relative overflow-hidden backdrop-blur-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-display font-bold text-xl text-amber-400 overflow-hidden shrink-0">
                {pB?.avatarUrl ? (
                  <img src={pB.avatarUrl} alt={pB.name} className="w-full h-full object-cover" />
                ) : (
                  pB?.name?.charAt(0) || 'B'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>Agent Identity B (Candidate)</span>
                </div>
                <h2 className="text-xl font-display font-semibold text-zinc-100 mt-0.5">
                  {pB?.name || `Agent (${subjectB})`}
                </h2>
                <p className="text-xs font-mono text-zinc-500 truncate max-w-xs">
                  {pB?.headline || pB?.currentPosition || 'Candidate Peer'}
                </p>
              </div>
            </div>

            <Link
              to={`/people/${subjectB}`}
              className="text-xs text-zinc-400 hover:text-amber-300 flex items-center gap-1 font-mono"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-xs font-mono text-zinc-400">
            <div className="p-2 rounded bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">CORE VALUES</span>
              <span className="text-zinc-300 truncate block">
                {pB?.intelligence?.values?.slice(0, 2).join(', ') || 'Grounded in bio'}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-amber-400 truncate block">
                {pB?.intelligence?.interests?.slice(0, 2).join(', ') || 'Scraped data'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Conversation Transcript (2 Columns) & Compatibility Breakdown (1 Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Conversation Dialogue Feed (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-pink-400" />
              <h2 className="font-display font-semibold text-lg text-zinc-100">
                Agent Speed Date Transcript
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {session?.conversation?.length ? `${session.conversation.length} Alternating Turns` : '6-Turn Protocol'}
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto mb-2" />
              <p className="text-xs font-mono text-zinc-500">Loading conversation transcript...</p>
            </div>
          ) : session?.conversation && session.conversation.length > 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 sm:p-6 space-y-4">
              {session.conversation.map((turn, i) => {
                const isSpeakerA = turn.speaker === 'A' || turn.senderId === subjectA;
                const speakerName = turn.speakerName || (isSpeakerA ? pA?.name : pB?.name) || `Speaker ${isSpeakerA ? 'A' : 'B'}`;

                return (
                  <div
                    key={i}
                    className={`flex flex-col space-y-1.5 max-w-[88%] ${
                      isSpeakerA ? 'mr-auto items-start' : 'ml-auto items-end text-right'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 px-1">
                      <span className={isSpeakerA ? 'text-pink-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {speakerName}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">Turn #{i + 1}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isSpeakerA
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-tl-none'
                          : 'bg-pink-500/10 border border-pink-500/30 text-pink-100 rounded-tr-none'
                      }`}
                    >
                      &quot;{turn.message}&quot;
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-pink-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-medium text-zinc-200">
                  Speed Date Not Executed Yet
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed font-mono">
                  Click the button below to initiate an autonomous 6-turn speed date between the AI proxy agents representing these two profiles.
                </p>
              </div>

              <button
                onClick={handleSimulateDate}
                disabled={simulating}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-300 hover:to-pink-400 px-5 py-2.5 rounded-lg shadow-lg cursor-pointer disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>Conducting Date...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Speed Date Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Compatibility Breakdown (1 Column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <h2 className="font-display font-semibold text-lg text-zinc-100">
                Final Compatibility
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">Evaluated Chemistry</span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-6">
            {/* Score Ring */}
            <div className="text-center p-6 rounded-xl bg-zinc-950/80 border border-pink-500/30 shadow-inner space-y-1">
              <div className="text-[10px] font-mono text-pink-400 uppercase tracking-widest font-semibold">
                Post-Date Evaluated Compatibility
              </div>
              <div className="text-5xl font-display font-bold text-pink-300 my-2">
                {score !== undefined ? `${score}%` : '-- %'}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                {score !== undefined
                  ? 'Grounded across 4 core dimensions'
                  : 'Awaiting completed agent date'}
              </p>
            </div>

            {/* Chemistry Summary */}
            {summary && (
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1 text-xs">
                <span className="font-mono text-pink-400 font-semibold block text-[10px] uppercase">
                  Chemistry Summary:
                </span>
                <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                  {summary}
                </p>
              </div>
            )}

            {/* Shared Interests */}
            {sharedInterests.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Shared &amp; Complementary Interests:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sharedInterests.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strong Alignment */}
            {strongAlignment.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5 text-xs font-mono">
                <span className="text-emerald-400 text-[10px] uppercase font-semibold block">
                  Strong Alignment Points:
                </span>
                <ul className="space-y-1 text-zinc-300 text-[11px]">
                  {strongAlignment.map((pt, pti) => (
                    <li key={pti} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential Differences */}
            {potentialDifferences.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5 text-xs font-mono">
                <span className="text-amber-400 text-[10px] uppercase font-semibold block">
                  Potential Differences:
                </span>
                <ul className="space-y-1 text-zinc-300 text-[11px]">
                  {potentialDifferences.map((diff, diffi) => (
                    <li key={diffi} className="flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0">△</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grounded Evidence Quotes */}
            {evidence.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Verifiable Conversation Evidence:
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {evidence.slice(0, 3).map((ev, evi) => (
                    <div key={evi} className="p-2 rounded bg-zinc-950 border border-zinc-800 space-y-0.5">
                      <div className="text-pink-300 text-[10px] font-medium">{ev.claim}</div>
                      <div className="text-zinc-400 text-[10px] italic leading-relaxed">
                        &quot;{ev.evidence}&quot;
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/60">
              <Link
                to="/rankings"
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-zinc-300 hover:text-pink-300 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-pink-400" />
                <span>View Full Final Rankings</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
