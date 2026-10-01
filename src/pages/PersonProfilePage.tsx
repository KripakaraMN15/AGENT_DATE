import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Heart,
  Sparkles,
  Briefcase,
  ExternalLink,
  Flame,
  Globe,
  Code,
  FileJson,
  MapPin,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Compass,
  AlertCircle,
  Users,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';
import {
  fetchPerson,
  fetchPeople,
  analyzePersonIntelligence,
  startAgentDate,
  fetchPersonRankings,
  PersonData,
  AgentDatingSession,
  FinalRankingEntry
} from '../api/client';

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<PersonData | null>(null);
  const [personRankings, setPersonRankings] = useState<FinalRankingEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // All ingested people list for selecting Candidate B
  const [allPeople, setAllPeople] = useState<PersonData[]>([]);

  // LLM Intelligence Analysis Trigger State
  const [analyzingIntelligence, setAnalyzingIntelligence] = useState<boolean>(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Agent Dating Session State
  const [selectedCandidateBId, setSelectedCandidateBId] = useState<string>('');
  const [simulatingDate, setSimulatingDate] = useState<boolean>(false);
  const [dateSession, setDateSession] = useState<AgentDatingSession | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Helper to safely render strings in React children
  const safeText = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      return val.name || val.title || val.companyName || val.text || JSON.stringify(val);
    }
    return String(val);
  };

  const loadPerson = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchPerson(id),
      fetchPersonRankings(id).catch(() => ({ personId: id, personName: id, rankings: [] }))
    ])
      .then(([personRes, rankingsRes]) => {
        setPerson(personRes.data);
        setPersonRankings(rankingsRes.rankings || []);
        setError(false);
      })
      .catch(() => {
        setError(true);
        setPerson(null);
        setPersonRankings([]);
      })
      .finally(() => setLoading(false));
  };

  const loadAllPeople = () => {
    fetchPeople()
      .then((res) => {
        setAllPeople(res.data || []);
        // Pre-select first candidate that is not current person
        if (res.data && res.data.length > 0) {
          const other = res.data.find((p) => p.id !== id);
          if (other) setSelectedCandidateBId(other.id);
        }
      })
      .catch(() => setAllPeople([]));
  };

  useEffect(() => {
    loadPerson();
    loadAllPeople();
  }, [id]);

  const handleRunIntelligence = async () => {
    if (!id) return;
    setAnalyzingIntelligence(true);
    setIntelligenceError(null);

    try {
      const res = await analyzePersonIntelligence(id);
      setPerson(res.data);
    } catch (err: any) {
      setIntelligenceError(err.message || 'Failed to analyze person intelligence via Gemini.');
    } finally {
      setAnalyzingIntelligence(false);
    }
  };

  const handleStartAgentDate = async () => {
    if (!id || !selectedCandidateBId) return;
    setSimulatingDate(true);
    setDateError(null);

    try {
      const session = await startAgentDate(id, selectedCandidateBId);
      setDateSession(session);
    } catch (err: any) {
      setDateError(err.message || 'Agent speed date simulation failed.');
    } finally {
      setSimulatingDate(false);
    }
  };

  const profileId = id || 'unspecified-id';
  const intel = person?.intelligence;
  const otherCandidates = allPeople.filter((p) => p.id !== profileId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/people"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ingestion Registry</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>Subject ID</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400/90">{profileId}</span>
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {person?.avatarUrl ? (
              <img
                src={person.avatarUrl}
                alt={safeText(person.name)}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700/80 flex items-center justify-center font-display text-2xl font-bold text-amber-400 shrink-0 shadow-lg">
                {person?.name ? safeText(person.name).charAt(0) : 'S'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                <span>{loading ? 'Fetching...' : error ? 'Placeholder Profile Schema' : 'Verified Subject'}</span>
                <span aria-hidden="true">·</span>
                <span className={intel ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                  {intel ? 'Gemini 3.8 Intelligence Active' : 'Ingested Scraper Data'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-zinc-100">
                {safeText(person?.name) || `Subject ${profileId}`}
              </h1>
              {person?.headline && (
                <p className="mt-1 text-xs font-mono text-amber-400/90">
                  {safeText(person.headline)}
                </p>
              )}
              {person?.location && (
                <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{safeText(person.location)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunIntelligence}
              disabled={analyzingIntelligence}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {analyzingIntelligence ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analyzing Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{intel ? 'Re-analyze Intelligence' : 'Analyze Person Intelligence'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <FileJson className="w-4 h-4 text-amber-400" />
              <span>{showRawJson ? 'Hide Source Data' : 'sourceData'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Control: Agent-to-Agent Dating Selector */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/30 space-y-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-display font-semibold text-base">
            <Flame className="w-5 h-5" />
            <span>Agent-to-Agent Speed Dating Simulator</span>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded">
            Phase 4 Test Control
          </span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Select another ingested subject from the registry. The system will create two independent, private AI agents to conduct a multi-turn dating conversation and evaluate compatibility.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <div className="w-full sm:w-auto flex-1">
            <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
              Select Candidate B
            </label>
            {otherCandidates.length > 0 ? (
              <select
                value={selectedCandidateBId}
                onChange={(e) => setSelectedCandidateBId(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg border border-zinc-700 p-2.5 focus:border-amber-500 focus:outline-none font-mono"
              >
                {otherCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id} ({c.headline || c.currentPosition || 'Ingested Subject'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-amber-400/90">
                No other ingested subjects found in registry. Ingest another profile to test multi-turn dating!
              </div>
            )}
          </div>

          <button
            onClick={handleStartAgentDate}
            disabled={simulatingDate || !selectedCandidateBId}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all cursor-pointer shadow-md"
          >
            {simulatingDate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Simulating 6-Turn Agent Date...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-zinc-950" />
                <span>Start Agent Speed Date</span>
              </>
            )}
          </button>
        </div>

        {dateError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* Completed Dating Session Inspector View */}
      {dateSession && (
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-6 shadow-2xl">
          
          {/* Compatibility Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Completed Agent Speed Date</span>
              </div>
              <h2 className="text-xl font-display font-semibold text-zinc-100">
                {dateSession.personA.name} <span className="text-zinc-500">&</span> {dateSession.personB.name}
              </h2>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/90 px-5 py-3 rounded-xl border border-zinc-800">
              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-400 uppercase">Compatibility Score</div>
                <div className="text-xs font-mono text-emerald-400">Grounded Match Evaluator</div>
              </div>
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-2xl text-amber-400 shadow-inner">
                {dateSession.compatibility.score}%
              </div>
            </div>
          </div>

          {/* Conversation Transcript */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-zinc-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Agent Date Conversation Transcript (6 Alternating Turns)</span>
              </h3>
              <span className="text-xs font-mono text-zinc-500">Autonomous Agent Dialogue</span>
            </div>

            <div className="space-y-3 bg-zinc-900/40 p-4 sm:p-6 rounded-xl border border-zinc-800/80 max-h-[420px] overflow-y-auto">
              {dateSession.conversation.map((turn, i) => {
                const isA = turn.speaker === 'A';
                return (
                  <div
                    key={i}
                    className={`flex flex-col space-y-1 max-w-[85%] ${
                      isA ? 'mr-auto items-start' : 'ml-auto items-end text-right'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 px-1">
                      <span className={isA ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {turn.speakerName || (isA ? dateSession.personA.name : dateSession.personB.name)}
                      </span>
                      <span>· Turn #{i + 1}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isA
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-tr-none'
                      }`}
                    >
                      "{turn.message}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compatibility Evaluation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Summary & Shared Interests */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase block">Chemistry Summary</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {dateSession.compatibility.summary}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block">Shared Interests</span>
                <div className="flex flex-wrap gap-2">
                  {dateSession.compatibility.sharedInterests.map((item, idx) => (
                    <span key={idx} className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Alignments & Differences */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase block">Strong Alignment Points</span>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {dateSession.compatibility.strongAlignment.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Potential Growth/Differences</span>
                <ul className="space-y-1 text-xs text-zinc-400 font-mono">
                  {dateSession.compatibility.potentialDifferences.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-zinc-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Evidence Items */}
          {dateSession.compatibility.evidence && dateSession.compatibility.evidence.length > 0 && (
            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <span className="text-xs font-mono text-zinc-400 uppercase block">Compatibility Evidence Items</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dateSession.compatibility.evidence.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-amber-300 font-medium">{ev.claim}</span>
                      <span className="text-[10px] uppercase text-zinc-500">{ev.source}</span>
                    </div>
                    <p className="text-zinc-400 font-mono text-[11px] leading-relaxed">
                      "{ev.evidence}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {intelligenceError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{intelligenceError}</span>
        </div>
      )}

      {/* Raw sourceData Debug Inspector */}
      {showRawJson && (
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span>Raw Apify Scraper Output (sourceData)</span>
            </div>
            <span className="text-zinc-500 text-[11px]">Server Debug Payload</span>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96">
            {JSON.stringify(person?.sourceData || { message: 'No sourceData recorded' }, null, 2)}
          </pre>
        </div>
      )}

      {/* Final Dating Rankings Section (Part 9) */}
      {personRankings.length > 0 && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-pink-400" />
              <h2 className="font-display font-semibold text-lg text-zinc-100">
                Final Dating Rankings ({personRankings.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-pink-400 bg-pink-500/10 border border-pink-500/30 px-3 py-1 rounded">
              Directional Agent Speed Date Results
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personRankings.map((rk) => (
              <div
                key={rk.candidateId}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-pink-500/40 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 font-bold text-xs text-pink-400 flex items-center justify-center shrink-0">
                        #{rk.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden shrink-0">
                        {rk.candidateAvatar ? (
                          <img src={rk.candidateAvatar} alt={rk.candidateName} className="w-full h-full object-cover" />
                        ) : (
                          rk.candidateName?.charAt(0) || '#'
                        )}
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-xs text-zinc-100">
                          {rk.candidateName}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[130px] block">
                          {rk.candidateHeadline || 'Candidate'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono uppercase text-pink-400 font-bold block">
                        Compatibility
                      </span>
                      <span className="font-display font-bold text-base text-pink-300">
                        {rk.compatibilityScore}%
                      </span>
                    </div>
                  </div>

                  {rk.chemistrySummary && (
                    <p className="text-[11px] font-mono text-zinc-400 line-clamp-2 leading-relaxed bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80">
                      {rk.chemistrySummary}
                    </p>
                  )}

                  {rk.strongAlignment && rk.strongAlignment.length > 0 && (
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                        Key Alignment:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rk.strongAlignment.slice(0, 2).map((al, ali) => (
                          <span key={ali} className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[140px]">
                            {al}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                  <Link
                    to={`/people/${rk.candidateId}`}
                    className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                  >
                    Profile →
                  </Link>

                  <Link
                    to={`/date/${id}/${rk.candidateId}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-pink-300 hover:text-pink-200 bg-pink-500/10 border border-pink-500/30 px-2.5 py-1 rounded"
                  >
                    <span>View Dating Conversation</span>
                    <ExternalLink className="w-3 h-3 text-pink-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left Column (Needs, Values, Conversation Topics, Evidence) & Right Column (Hobbies, Interests, Lifestyle, Career) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Intelligence Highlights & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Relationship Needs */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-lg text-zinc-100">1. Relationship Needs</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">Grounded Intelligence</span>
            </div>

            {intel?.needs && intel.needs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {intel.needs.map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-200 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{safeText(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800 text-xs font-mono text-zinc-500">
                {intel ? 'No explicit relationship needs observed in source data.' : 'Run Person Intelligence analysis to extract grounded relationship needs.'}
              </div>
            )}
          </section>

          {/* Section 2: Core Values & Personality */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-lg text-zinc-100">2. Values & Personality Traits</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">Behavioral Intelligence</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2">Core Values</span>
                {intel?.values && intel.values.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.values.map((v, i) => (
                      <span key={i} className="text-xs font-medium text-amber-300 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
                        {safeText(v)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-zinc-500">No explicit core values extracted.</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2">Personality Observations</span>
                {intel?.personality && intel.personality.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.personality.map((pItem, i) => (
                      <span key={i} className="text-xs font-mono text-zinc-300 bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-700/60">
                        {safeText(pItem)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-zinc-500">No personality observations recorded.</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Conversation Topics for Agent Dating */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-lg text-zinc-100">3. Dating Conversation Topics</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">Agent Starter Prompts</span>
            </div>

            {intel?.conversationTopics && intel.conversationTopics.length > 0 ? (
              <div className="space-y-2">
                {intel.conversationTopics.map((topic, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-200 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[11px] flex items-center justify-center shrink-0">
                      #{i + 1}
                    </span>
                    <span>{safeText(topic)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800 text-xs font-mono text-zinc-500">
                Run intelligence analysis to generate conversation topics for agent speed dating.
              </div>
            )}
          </section>

          {/* Section 4: Evidence & Source Grounding */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display font-semibold text-lg text-zinc-100">4. Evidence & Source Grounding</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">Verifiable Claims</span>
            </div>

            {intel?.evidence && intel.evidence.length > 0 ? (
              <div className="space-y-3">
                {intel.evidence.map((ev, i) => (
                  <div key={i} className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-300 font-medium">{safeText(ev.claim)}</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 uppercase text-[10px]">
                        {safeText(ev.source)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono leading-relaxed bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80">
                      "{safeText(ev.evidence)}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800 text-xs font-mono text-zinc-500">
                No grounded evidence claims cataloged.
              </div>
            )}
          </section>

        </div>

        {/* Right 1 Column: Hobbies, Interests, Lifestyle, Career */}
        <div className="space-y-6">
          
          {/* Hobbies */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-base text-zinc-100">Hobbies</h2>
              </div>
            </div>

            {intel?.hobbies && intel.hobbies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {intel.hobbies.map((h, i) => (
                  <span key={i} className="text-xs font-mono text-zinc-200 bg-zinc-800/90 px-2.5 py-1 rounded border border-zinc-700">
                    {safeText(h)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500">No explicit hobbies observed in profile content.</p>
            )}
          </section>

          {/* Interests */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-base text-zinc-100">Interests</h2>
              </div>
            </div>

            {(intel?.interests && intel.interests.length > 0) || (person?.interests && person.interests.length > 0) ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...(intel?.interests || []), ...(person?.interests || [])])).map((item, i) => (
                  <span key={i} className="text-xs font-mono text-zinc-300 bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-700/60">
                    {safeText(item)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500">No interests extracted.</p>
            )}
          </section>

          {/* Lifestyle */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-base text-zinc-100">Lifestyle Signals</h2>
              </div>
            </div>

            {(intel?.lifestyle && intel.lifestyle.length > 0) || (person?.lifestyle && person.lifestyle.length > 0) ? (
              <div className="space-y-2 text-xs font-mono text-zinc-300">
                {Array.from(new Set([...(intel?.lifestyle || []), ...(person?.lifestyle || [])])).map((l, i) => (
                  <div key={i} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    {safeText(l)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500">No lifestyle signals found.</p>
            )}
          </section>

          {/* Career & Experience */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-base text-zinc-100">Career History</h2>
              </div>
            </div>

            {person?.career && person.career.length > 0 ? (
              <div className="space-y-3">
                {person.career.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
                    <div className="text-xs font-semibold text-zinc-100">{safeText(c.title) || 'Role'}</div>
                    {c.company && <div className="text-[11px] font-mono text-amber-400">{safeText(c.company)}</div>}
                    {c.duration && <div className="text-[10px] font-mono text-zinc-500">{safeText(c.duration)}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500">No career history recorded.</p>
            )}
          </section>

          {/* Source Links */}
          <section className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-semibold text-base text-zinc-100">Source Links</h2>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400 font-mono">LinkedIn:</span>
                {person?.linkedinUrl ? (
                  <a
                    href={person.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono truncate max-w-[160px]"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-zinc-600 font-mono">[No Link]</span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400 font-mono">Instagram:</span>
                {person?.instagramUrl ? (
                  <a
                    href={person.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono truncate max-w-[160px]"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-zinc-600 font-mono">[No Link]</span>
                )}
              </div>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}
