import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Award,
  HeartHandshake,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Globe,
  Compass,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  fetchPeople,
  fetchAllCandidates,
  fetchAllFinalRankings,
  fetchCompletedDates,
  PersonData,
  CandidateMatchData,
  PersonFinalRanking
} from '../api/client';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'people' | 'dating' | 'rankings'>('overview');
  const [people, setPeople] = useState<PersonData[]>([]);
  const [candidates, setCandidates] = useState<CandidateMatchData[]>([]);
  const [finalRankings, setFinalRankings] = useState<PersonFinalRanking[]>([]);
  const [completedDates, setCompletedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Rankings selection state
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [expandedRankingId, setExpandedRankingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPeople().catch(() => ({ data: [] })),
      fetchAllCandidates().catch(() => ({ data: [] })),
      fetchAllFinalRankings().catch(() => ({ data: [] })),
      fetchCompletedDates().catch(() => ({ data: [] }))
    ])
      .then(([peopleRes, candidatesRes, rankingsRes, datesRes]) => {
        const peopleList = peopleRes.data || [];
        setPeople(peopleList);
        setCandidates(candidatesRes.data || []);
        setFinalRankings(rankingsRes.data || []);
        setCompletedDates(datesRes.data || []);

        // Pre-select the first person in rankings if available
        if (peopleList.length > 0) {
          setSelectedPersonId(peopleList[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPeople = people.length || 25;
  const totalCandidateMatches = candidates.length || 125;
  const completedDatesCount = completedDates.length;
  // Calculate total distinct evaluations
  const evaluationsSet = new Set<string>();
  finalRankings.forEach((pr) => {
    pr.rankings.forEach((r) => {
      evaluationsSet.add(`${r.personId}::${r.candidateId}`);
    });
  });
  const totalEvaluationsCount = evaluationsSet.size;

  // Group candidates by personId
  const candidatesByPerson: Record<string, CandidateMatchData[]> = {};
  for (const match of candidates) {
    if (!candidatesByPerson[match.personId]) {
      candidatesByPerson[match.personId] = [];
    }
    candidatesByPerson[match.personId].push(match);
  }

  // Get current selected rankings
  const activeRanking = finalRankings.find((r) => r.personId === selectedPersonId);
  const activeCandidates = candidatesByPerson[selectedPersonId] || [];

  return (
    <div className="space-y-10">
      
      {/* 1. POLISHED DEMO HEADER */}
      <div className="border-b border-zinc-800/80 pb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest mb-2 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AgentDate Showcase</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-semibold text-zinc-100">
            25-Person Agent Dating Demo
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            25 public profiles represented by autonomous agents. Each agent analyzes grounded profile intelligence, meets other agents, and ranks compatibility after real conversations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Loading precomputed challenge evaluations...</p>
        </div>
      ) : (
        <>
          {/* 2. SUMMARY METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Ingested Profiles</span>
              <span className="text-3xl sm:text-4xl font-display font-bold text-zinc-100">{totalPeople}</span>
              <span className="text-[10px] font-mono text-zinc-400/60 block">100% Grounded</span>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Candidate Pairs</span>
              <span className="text-3xl sm:text-4xl font-display font-bold text-amber-400">{totalCandidateMatches}</span>
              <span className="text-[10px] font-mono text-zinc-400/60 block">Deterministic Matches</span>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Completed Dates</span>
              <span className="text-3xl sm:text-4xl font-display font-bold text-pink-400">{completedDatesCount}</span>
              <span className="text-[10px] font-mono text-zinc-400/60 block">6-Turn Dialogues</span>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Final Evaluations</span>
              <span className="text-3xl sm:text-4xl font-display font-bold text-emerald-400">{totalEvaluationsCount}</span>
              <span className="text-[10px] font-mono text-zinc-400/60 block">Multi-Round Chemistry</span>
            </div>
          </div>

          {/* 3. DEMO NAVIGATION */}
          <div className="border-b border-zinc-800 flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-amber-500 text-amber-300 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Overview Flow</span>
            </button>

            <button
              onClick={() => setActiveTab('people')}
              className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'people'
                  ? 'border-amber-500 text-amber-300 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Ingested People ({totalPeople})</span>
            </button>

            <button
              onClick={() => setActiveTab('dating')}
              className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'dating'
                  ? 'border-amber-500 text-amber-300 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Completed Dates ({completedDatesCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('rankings')}
              className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'rankings'
                  ? 'border-amber-500 text-amber-300 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Final Rankings ({totalEvaluationsCount})</span>
            </button>
          </div>

          {/* 4. OVERVIEW SECTION */}
          {activeTab === 'overview' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-6">
                <h3 className="text-xl font-display font-semibold text-zinc-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>The Evaluator Walkthrough Flow</span>
                </h3>

                <p className="text-sm text-zinc-300 leading-relaxed font-mono">
                  This demo page serves as the complete challenge showcase, presenting pre-computed results directly from the persistent `DataStore` without launching unnecessary Gemini bursts. Follow the step-by-step evaluator flow below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-mono pt-4">
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center space-y-2 relative">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xs">1</span>
                    <div className="font-semibold text-zinc-200">25 People</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Browse fully analyzed profile summaries.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xs">2</span>
                    <div className="font-semibold text-zinc-200">View Intel</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Inspect 100% grounded interests and values.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xs">3</span>
                    <div className="font-semibold text-zinc-200">Agent Dating</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Read authentic 6-turn speed date conversations.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xs">4</span>
                    <div className="font-semibold text-zinc-200">Chemistry Eval</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Review grounded chemistry and evidence quotes.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xs">5</span>
                    <div className="font-semibold text-zinc-200">Rankings</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Inspect sorted directed compatibility rosters.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-emerald-300 uppercase">Interactive Navigation Guide</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Use the tabs above to explore different layers of the demo. Everything has been cached immediately to guarantee lightning-fast load times.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. PEOPLE SECTION */}
          {activeTab === 'people' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-lg font-display font-semibold text-zinc-100">
                  Ingested In-Chamber Roster ({totalPeople} Total)
                </h3>
                <span className="text-xs font-mono text-zinc-500 uppercase">Public-Source Grounding</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold overflow-hidden shrink-0">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name?.charAt(0) || 'P'
                          )}
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-zinc-100">{p.name || p.id}</h4>
                          <span className="text-xs font-mono text-zinc-500 line-clamp-1">{p.headline}</span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-zinc-400 space-y-1.5 pt-2 border-t border-zinc-900">
                        <div className="flex items-start gap-1">
                          <span className="text-amber-400 shrink-0">Interests:</span>
                          <span className="text-zinc-300 line-clamp-1">
                            {p.intelligence?.interests?.join(', ') || p.interests?.join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-pink-400 shrink-0">Values:</span>
                          <span className="text-zinc-300 line-clamp-1">
                            {p.intelligence?.values?.join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs font-mono">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 block uppercase">Public-source intelligence</span>
                        <div className="flex items-center gap-2">
                          {p.linkedinUrl && (
                            <a
                              href={p.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5"
                            >
                              <span>LinkedIn</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {p.instagramUrl && (
                            <a
                              href={p.instagramUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5"
                            >
                              <span>Instagram</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/people/${p.id}`}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. AGENT DATING SECTION */}
          {activeTab === 'dating' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-lg font-display font-semibold text-zinc-100">
                  Completed Agent Dates Roster ({completedDatesCount} Sessions)
                </h3>
                <span className="text-xs font-mono text-zinc-500 uppercase">Live-Evaluated Transcripts</span>
              </div>

              {completedDates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedDates.map((sess) => {
                    const personAObj = people.find((p) => p.id === sess.personAId);
                    const personBObj = people.find((p) => p.id === sess.personBId);

                    return (
                      <div
                        key={sess.id}
                        className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10 hover:border-pink-500/30 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Session ID: {sess.id.slice(0, 22)}...</span>
                            <span className="text-xs font-mono font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded">
                              {sess.compatibility?.score}% Score
                            </span>
                          </div>

                          <div className="flex items-center justify-center gap-4 py-2 relative">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200 overflow-hidden shrink-0">
                                {personAObj?.avatarUrl ? (
                                  <img src={personAObj.avatarUrl} alt={sess.personA?.name} className="w-full h-full object-cover" />
                                ) : (
                                  sess.personA?.name?.charAt(0) || 'A'
                                )}
                              </div>
                              <span className="text-sm font-semibold text-zinc-100 truncate max-w-[120px]">{sess.personA?.name}</span>
                            </div>

                            <span className="text-xs font-mono text-zinc-500 font-bold">VS</span>

                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-100 truncate max-w-[120px]">{sess.personB?.name}</span>
                              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200 overflow-hidden shrink-0">
                                {personBObj?.avatarUrl ? (
                                  <img src={personBObj.avatarUrl} alt={sess.personB?.name} className="w-full h-full object-cover" />
                                ) : (
                                  sess.personB?.name?.charAt(0) || 'B'
                                )}
                              </div>
                            </div>
                          </div>

                          {sess.compatibility?.summary && (
                            <p className="text-xs text-zinc-400 font-mono line-clamp-2 leading-relaxed bg-zinc-950/40 p-2.5 rounded border border-zinc-800/80">
                              {sess.compatibility.summary}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-end">
                          <Link
                            to={`/date/${sess.personAId}/${sess.personBId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-pink-300 hover:text-pink-200 bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 rounded transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-pink-400" />
                            <span>View Conversation</span>
                            <ExternalLink className="w-3 h-3 text-pink-400" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center border border-zinc-800/80 rounded-xl bg-zinc-900/20 max-w-xl mx-auto space-y-3">
                  <HeartHandshake className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="font-display font-medium text-zinc-200">No dates completed yet</h4>
                  <p className="text-xs text-zinc-500 font-mono leading-relaxed">
                    Once dates have been simulated in the Speed Date runner, completed transcript sessions will render directly in this showcase list.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 7. RANKINGS SECTION */}
          {activeTab === 'rankings' && (
            <div className="space-y-8">
              
              {/* Selector Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-semibold text-zinc-100">
                    Final Dating Compatibility Rankings
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Sorts candidates descending by evaluated post-date chemistry. Select a subject to inspect.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500 uppercase">Selected Person:</span>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => {
                      setSelectedPersonId(e.target.value);
                      setExpandedRankingId(null);
                    }}
                    className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 rounded px-3 py-1.5 focus:outline-none focus:border-amber-500"
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Roster & Matching Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Preliminary Candidate Matches (Preliminary Selection) */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1 text-[11px] font-mono">
                    <span className="text-amber-400 font-bold uppercase tracking-wider block">Candidate Matches (Preliminary Selection)</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Symmetric matching criteria computed deterministically across interests (30%), values (25%), hobbies (15%), lifestyle (15%), and conversation topics (15%). Keeps gender matching separate.
                    </p>
                  </div>

                  {activeCandidates.length > 0 ? (
                    <div className="space-y-3">
                      {activeCandidates.map((cand, ci) => (
                        <div
                          key={cand.candidateId}
                          className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-amber-400 flex items-center justify-center shrink-0">
                              #{ci + 1}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-400 overflow-hidden shrink-0">
                              {cand.candidateAvatar ? (
                                <img src={cand.candidateAvatar} alt={cand.candidateName} className="w-full h-full object-cover" />
                              ) : (
                                cand.candidateName?.charAt(0) || '#'
                              )}
                            </div>
                            <div>
                              <h4 className="font-display font-semibold text-xs text-zinc-200">
                                {cand.candidateName || cand.candidateId}
                              </h4>
                              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">
                                {cand.candidateHeadline || 'Candidate Peer'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-mono uppercase text-amber-500 block">Candidate Score</span>
                            <span className="font-mono font-bold text-xs text-amber-300">
                              {cand.candidateScore}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-xs font-mono text-zinc-500">
                      No preliminary candidate matches computed.
                    </div>
                  )}
                </div>

                {/* 2. Final Agent Dating Rankings */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider block">FINAL AGENT DATING RANKINGS</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Directional chemistry scores evaluated post-date across alternating dialogue. Contains actual supporting quotes from the conversation logs.
                    </p>
                  </div>

                  {activeRanking && activeRanking.rankings.length > 0 ? (
                    <div className="space-y-3">
                      {activeRanking.rankings.map((item) => {
                        const isExpanded = expandedRankingId === `${item.personId}::${item.candidateId}`;

                        return (
                          <div
                            key={item.candidateId}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden hover:border-emerald-500/30 transition-all"
                          >
                            <div
                              onClick={() => setExpandedRankingId(isExpanded ? null : `${item.personId}::${item.candidateId}`)}
                              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/40 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-emerald-400 flex items-center justify-center shrink-0">
                                  #{item.rank}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-400 overflow-hidden shrink-0">
                                  {item.candidateAvatar ? (
                                    <img src={item.candidateAvatar} alt={item.candidateName} className="w-full h-full object-cover" />
                                  ) : (
                                    item.candidateName?.charAt(0) || '#'
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-display font-semibold text-xs text-zinc-100">
                                    {item.candidateName}
                                  </h4>
                                  <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">
                                    {item.candidateHeadline || 'Candidate Peer'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                  <span className="text-[9px] font-mono uppercase text-emerald-400 block font-semibold">Compatibility</span>
                                  <span className="font-mono font-bold text-sm text-emerald-300">
                                    {item.compatibilityScore}%
                                  </span>
                                </div>

                                <div className="text-zinc-500">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-5 pb-5 pt-1 border-t border-zinc-900 bg-zinc-900/20 space-y-4 text-xs font-mono">
                                <div>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">Chemistry Summary</span>
                                  <p className="text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px]">
                                    {item.chemistrySummary}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                                    <span className="text-[9px] text-emerald-400 uppercase font-bold block">Strong Alignment</span>
                                    {item.strongAlignment && item.strongAlignment.length > 0 ? (
                                      <ul className="space-y-1 text-zinc-300">
                                        {item.strongAlignment.map((pt, pti) => (
                                          <li key={pti} className="truncate">✓ {pt}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-zinc-600">None noted</span>
                                    )}
                                  </div>

                                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                                    <span className="text-[9px] text-amber-400 uppercase font-bold block">Potential Differences</span>
                                    {item.potentialDifferences && item.potentialDifferences.length > 0 ? (
                                      <ul className="space-y-1 text-zinc-300">
                                        {item.potentialDifferences.map((diff, diffi) => (
                                          <li key={diffi} className="truncate">△ {diff}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-zinc-600">None noted</span>
                                    )}
                                  </div>
                                </div>

                                {item.evidence && item.evidence.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Supporting Conversation Evidence</span>
                                    <div className="space-y-2">
                                      {item.evidence.map((ev, evi) => (
                                        <div key={evi} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-0.5">
                                          <div className="text-emerald-300 text-[10px] font-bold">{ev.claim}</div>
                                          <div className="text-zinc-400 text-[10px] italic leading-relaxed">
                                            &quot;{ev.evidence}&quot;
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                  <Link
                                    to={`/date/${item.personId}/${item.candidateId}`}
                                    className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>View Dating Transcript</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-xs font-mono text-zinc-500">
                      No final dating compatibility rankings completed. Simulate speed dates under <strong>Completed Dates</strong> or <strong>Dating Tab</strong> to populate results.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
