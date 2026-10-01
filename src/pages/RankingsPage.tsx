import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Compass,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
  Target,
  RefreshCw,
  Heart,
  Loader2,
  Users,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import {
  fetchAllFinalRankings,
  fetchAllCandidates,
  fetchPeople,
  generateCandidateMatches,
  runCandidateDates,
  PersonFinalRanking,
  FinalRankingEntry,
  CandidateMatchData,
  PersonData,
  ChallengeDatingResponse
} from '../api/client';

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<'final_rankings' | 'candidates'>('final_rankings');
  const [finalRankings, setFinalRankings] = useState<PersonFinalRanking[]>([]);
  const [candidates, setCandidates] = useState<CandidateMatchData[]>([]);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [expandedRankingId, setExpandedRankingId] = useState<string | null>(null);

  // Batch Runner State (Challenge Dashboard)
  const [runningBatch, setRunningBatch] = useState<boolean>(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<ChallengeDatingResponse | null>(null);
  const [recomputingMatches, setRecomputingMatches] = useState<boolean>(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchAllFinalRankings().catch(() => ({ count: 0, data: [] })),
      fetchAllCandidates().catch(() => ({ count: 0, data: [] })),
      fetchPeople().catch(() => ({ count: 0, data: [] }))
    ])
      .then(([rankingsRes, candidatesRes, peopleRes]) => {
        setFinalRankings(rankingsRes.data || []);
        setCandidates(candidatesRes.data || []);
        setPeople(peopleRes.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute challenge stats
  const totalCandidateMatches = candidates.length || 125;
  const completedEvaluationsSet = new Set<string>();
  finalRankings.forEach((pr) => {
    pr.rankings.forEach((r) => {
      completedEvaluationsSet.add(`${r.personId}::${r.candidateId}`);
    });
  });
  const completedCount = completedEvaluationsSet.size;
  const remainingCount = Math.max(0, totalCandidateMatches - completedCount);

  // Handler to run agent dates with controlled limits
  const handleRunAgentDates = async (limit?: number, personId?: string) => {
    if (runningBatch) return;
    setRunningBatch(true);
    setBatchError(null);

    try {
      const resp = await runCandidateDates({
        limit,
        personId: personId || (selectedPersonFilter !== 'all' ? selectedPersonFilter : undefined),
      });
      setBatchProgress(resp);
      // Reload rankings in-place
      const updatedRankings = await fetchAllFinalRankings();
      setFinalRankings(updatedRankings.data || []);
    } catch (err: any) {
      setBatchError(err.message || 'Failed to run agent speed dates.');
    } finally {
      setRunningBatch(false);
    }
  };

  const handleRecomputeMatches = async () => {
    setRecomputingMatches(true);
    try {
      await generateCandidateMatches();
      const res = await fetchAllCandidates();
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to recompute candidate matches:', err);
    } finally {
      setRecomputingMatches(false);
    }
  };

  // Group candidate matches by personId for Tab 2
  const candidateMatchesByPerson: Record<string, CandidateMatchData[]> = {};
  for (const match of candidates) {
    if (!candidateMatchesByPerson[match.personId]) {
      candidateMatchesByPerson[match.personId] = [];
    }
    candidateMatchesByPerson[match.personId].push(match);
  }

  // Filtered final rankings based on selectedPersonFilter
  const filteredPersonRankings = finalRankings.filter(
    (pr) => selectedPersonFilter === 'all' || pr.personId === selectedPersonFilter
  );

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="border-b border-zinc-800/80 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest mb-2">
            <span>Phase 5C Execution</span>
            <span aria-hidden="true">·</span>
            <span>Agent Dating Compatibility Pipeline</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-zinc-100">
            Agent Dating & Compatibility Rankings
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Multi-round autonomous agent speed dates executed between candidate pairs. Directed rankings sort candidates by post-date evaluated compatibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/dating"
            className="inline-flex items-center gap-2 text-xs font-medium text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-4 py-2.5 rounded-lg border border-pink-500/30 transition-colors"
          >
            <HeartHandshake className="w-4 h-4 text-pink-400" />
            <span>Interactive Speed Date</span>
          </Link>
        </div>
      </div>

      {/* Challenge Dashboard: RUN AGENT DATES (Part 10) */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base text-zinc-100">
                Challenge Dating Dashboard
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Controlled Concurrency = 2 · 6-Turn Agent Dates · Real-Time Factual Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Candidate Matches:</span>
              <span className="text-zinc-200 font-bold">{totalCandidateMatches}</span>
            </div>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">Completed:</span>
              <span className="text-emerald-300 font-bold">{completedCount}</span>
            </div>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">Remaining:</span>
              <span className="text-amber-300 font-bold">{remainingCount}</span>
            </div>
          </div>
        </div>

        {/* Action Controls for Batch Execution */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Safe Small Batch Button (Default) */}
            <button
              onClick={() => handleRunAgentDates(2)}
              disabled={runningBatch || remainingCount === 0}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-300 hover:to-pink-400 px-4 py-2.5 rounded-lg shadow-lg shadow-pink-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                  <span>Executing Dates...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Next 2 Dates</span>
                </>
              )}
            </button>

            {/* Run Selected Person's Dates Button */}
            {selectedPersonFilter !== 'all' && (
              <button
                onClick={() => handleRunAgentDates(5, selectedPersonFilter)}
                disabled={runningBatch}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>Run Selected Person&apos;s Candidates</span>
              </button>
            )}

            {/* Run All Remaining Dates Button */}
            <button
              onClick={() => handleRunAgentDates()}
              disabled={runningBatch || remainingCount === 0}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Run All Remaining ({remainingCount})</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-zinc-500">
            Resumable pipeline: Skipped already-completed pairs automatically.
          </span>
        </div>

        {/* Error Banner */}
        {batchError && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{batchError}</span>
          </div>
        )}

        {/* Batch Execution Results Summary */}
        {batchProgress && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Batch Complete: {batchProgress.successful} Succeeded</span>
              </span>
              <span className="text-zinc-400">
                {batchProgress.alreadyCompleted} Already Evaluated · {batchProgress.failed} Failed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px] font-mono">
              {batchProgress.results.map((res, ri) => (
                <div
                  key={ri}
                  className={`p-2 rounded border truncate ${
                    res.status === 'completed'
                      ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                      : res.status === 'already_completed'
                      ? 'border-zinc-800 text-zinc-400 bg-zinc-900/40'
                      : 'border-rose-500/30 text-rose-300 bg-rose-500/10'
                  }`}
                >
                  <div className="truncate font-semibold">{res.candidateName || res.candidateId}</div>
                  <div className="text-[10px] uppercase">
                    {res.status === 'completed' ? `Score: ${res.compatibilityScore}%` : res.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('final_rankings')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'final_rankings'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Award className="w-4 h-4 text-pink-400" />
            <span>Final Agent Dating Rankings ({completedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Target className="w-4 h-4 text-amber-400" />
            <span>Candidate Matches (Preliminary)</span>
          </button>
        </div>

        {/* Person Selector Filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 uppercase">Profile:</span>
          <select
            value={selectedPersonFilter}
            onChange={(e) => setSelectedPersonFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 rounded px-3 py-1.5 focus:outline-none focus:border-pink-500"
          >
            <option value="all">All Profiles (25 Subjects)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.id}
              </option>
            ))}
          </select>

          {activeTab === 'candidates' && (
            <button
              onClick={handleRecomputeMatches}
              disabled={recomputingMatches}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${recomputingMatches ? 'animate-spin' : ''}`} />
              <span>Recompute</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Area */}
      {loading ? (
        <div className="p-12 text-center border border-zinc-800/80 rounded-xl bg-zinc-900/20">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto mb-3" />
          <p className="text-xs font-mono text-zinc-400">Loading rankings and candidate evaluations...</p>
        </div>
      ) : activeTab === 'final_rankings' ? (
        /* Tab 1: FINAL AGENT DATING RANKINGS (Part 8) */
        <div className="space-y-8">
          {/* Labeling Callout */}
          <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-500/5 space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>FINAL AGENT DATING RESULT</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              These compatibility scores are directional and generated following autonomous 6-turn agent speed dates evaluated across shared interests, core values alignment, conversational dynamic, and lifestyle goals.
            </p>
          </div>

          {filteredPersonRankings.some((pr) => pr.rankings.length > 0) ? (
            <div className="space-y-8">
              {filteredPersonRankings.map((pr) => {
                if (pr.rankings.length === 0) return null;
                const person = people.find((p) => p.id === pr.personId);

                return (
                  <div
                    key={pr.personId}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 shadow-sm"
                  >
                    {/* Subject Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-pink-400 overflow-hidden shrink-0">
                          {person?.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            pr.personName.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-lg text-zinc-100">
                            {pr.personName}
                          </h3>
                          <span className="text-xs font-mono text-zinc-500">
                            Evaluated Dates: {pr.rankings.length}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-pink-400 bg-pink-500/10 border border-pink-500/30 px-3 py-1 rounded">
                        Directed Ranking
                      </span>
                    </div>

                    {/* Rankings Table / List */}
                    <div className="space-y-3">
                      {pr.rankings.map((item) => {
                        const isExpanded = expandedRankingId === `${item.personId}::${item.candidateId}`;

                        return (
                          <div
                            key={item.candidateId}
                            className="rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-pink-500/40 transition-all overflow-hidden"
                          >
                            {/* Summary Row: Rank | Person | Compatibility | Key Alignment */}
                            <div
                              onClick={() =>
                                setExpandedRankingId(isExpanded ? null : `${item.personId}::${item.candidateId}`)
                              }
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/40 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <span className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 font-display font-bold text-sm text-pink-400 flex items-center justify-center shrink-0">
                                  #{item.rank}
                                </span>

                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-400 overflow-hidden shrink-0">
                                    {item.candidateAvatar ? (
                                      <img src={item.candidateAvatar} alt={item.candidateName} className="w-full h-full object-cover" />
                                    ) : (
                                      item.candidateName?.charAt(0) || '#'
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-display font-semibold text-sm text-zinc-100">
                                      {item.candidateName || item.candidateId}
                                    </h4>
                                    <p className="text-[11px] font-mono text-zinc-500 truncate max-w-xs">
                                      {item.candidateHeadline || 'Candidate Peer'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-6">
                                {/* Key Alignment Preview */}
                                <div className="hidden md:block max-w-sm text-left">
                                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                                    Key Alignment:
                                  </span>
                                  <p className="text-xs text-zinc-300 font-mono truncate">
                                    {item.strongAlignment && item.strongAlignment.length > 0
                                      ? item.strongAlignment.join(' · ')
                                      : item.sharedInterests.join(', ')}
                                  </p>
                                </div>

                                {/* Compatibility Score Badge */}
                                <div className="text-right shrink-0">
                                  <span className="text-[9px] font-mono uppercase text-pink-400 font-bold block">
                                    Final Compatibility
                                  </span>
                                  <span className="font-display font-bold text-xl text-pink-300">
                                    {item.compatibilityScore}%
                                  </span>
                                </div>

                                <div className="text-zinc-500">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details View */}
                            {isExpanded && (
                              <div className="px-6 pb-6 pt-2 border-t border-zinc-800/80 bg-zinc-900/30 space-y-4">
                                {/* Chemistry Summary */}
                                {item.chemistrySummary && (
                                  <div>
                                    <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                                      Chemistry Evaluation Summary:
                                    </span>
                                    <p className="text-xs text-zinc-200 leading-relaxed font-mono bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                                      {item.chemistrySummary}
                                    </p>
                                  </div>
                                )}

                                {/* Alignment & Differences Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                  {/* Strong Alignment */}
                                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                                      Strong Alignment Points:
                                    </span>
                                    {item.strongAlignment && item.strongAlignment.length > 0 ? (
                                      <ul className="space-y-1 text-zinc-300">
                                        {item.strongAlignment.map((pt, pti) => (
                                          <li key={pti} className="flex items-start gap-1">
                                            <span className="text-emerald-400 shrink-0">✓</span>
                                            <span>{pt}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-zinc-600">None noted</span>
                                    )}
                                  </div>

                                  {/* Potential Differences */}
                                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                                    <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                                      Potential Growth Areas & Differences:
                                    </span>
                                    {item.potentialDifferences && item.potentialDifferences.length > 0 ? (
                                      <ul className="space-y-1 text-zinc-300">
                                        {item.potentialDifferences.map((diff, diffi) => (
                                          <li key={diffi} className="flex items-start gap-1">
                                            <span className="text-amber-400 shrink-0">△</span>
                                            <span>{diff}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-zinc-600">None noted</span>
                                    )}
                                  </div>
                                </div>

                                {/* Grounded Evidence Quotes */}
                                {item.evidence && item.evidence.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                                      Supporting Evidence from Conversation:
                                    </span>
                                    <div className="space-y-1.5 text-xs font-mono">
                                      {item.evidence.map((ev, evi) => (
                                        <div key={evi} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-0.5">
                                          <div className="text-pink-300 font-medium">{ev.claim}</div>
                                          <div className="text-zinc-400 text-[11px] italic leading-relaxed">
                                            &quot;{ev.evidence}&quot;
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Link to Actual Dating Transcript */}
                                <div className="pt-2 flex items-center justify-end gap-3">
                                  <Link
                                    to={`/date/${item.personId}/${item.candidateId}`}
                                    className="inline-flex items-center gap-1.5 text-xs font-mono text-pink-300 hover:text-pink-200 bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 rounded transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-pink-400" />
                                    <span>View Dating Transcript</span>
                                    <ExternalLink className="w-3 h-3 text-pink-400" />
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center max-w-2xl mx-auto space-y-4">
              <Award className="w-10 h-10 text-pink-500/60 mx-auto" />
              <h3 className="font-display font-semibold text-lg text-zinc-100">
                No Dating Sessions Evaluated Yet
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                Autonomous agent speed dates have not yet been run for this selection. Click <strong>&quot;Run Next 2 Dates&quot;</strong> in the Challenge Dashboard above to execute autonomous dates with live compatibility evaluations.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Candidate Matches (Preliminary Selection) */
        <div className="space-y-8">
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>CANDIDATE MATCH (PRELIMINARY)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Preliminary candidate scores derived from grounded profile intelligence across Shared Interests (30%), Values (25%), Hobbies (15%), Lifestyle (15%), and Topics (15%). Run agent dates to generate final compatibility rankings.
            </p>
          </div>

          <div className="space-y-8">
            {people
              .filter((p) => selectedPersonFilter === 'all' || p.id === selectedPersonFilter)
              .map((person) => {
                const personCandidates = candidateMatchesByPerson[person.id] || [];

                return (
                  <div
                    key={person.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-400 overflow-hidden shrink-0">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            person.name?.charAt(0) || 'P'
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-lg text-zinc-100">
                            {person.name || person.id}
                          </h3>
                          <span className="text-xs font-mono text-zinc-500">
                            Top 5 Grounded Candidates
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded">
                        Candidate Matches
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {personCandidates.map((cand, ci) => (
                        <div
                          key={cand.candidateId}
                          className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-zinc-500">#{ci + 1} Candidate</span>
                              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                {cand.candidateScore}% Match
                              </span>
                            </div>

                            <h4 className="font-display font-medium text-xs text-zinc-100 truncate">
                              {cand.candidateName || cand.candidateId}
                            </h4>

                            {cand.reasons && cand.reasons.length > 0 && (
                              <ul className="text-[11px] font-mono text-zinc-400 space-y-1">
                                {cand.reasons.slice(0, 2).map((r, ri) => (
                                  <li key={ri} className="truncate">
                                    › {r}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="pt-2 border-t border-zinc-900">
                            <Link
                              to={`/dating?personA=${person.id}&personB=${cand.candidateId}`}
                              className="w-full text-center inline-flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 py-1.5 rounded transition-colors"
                            >
                              <Heart className="w-3 h-3 text-pink-400" />
                              <span>Speed Date</span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
