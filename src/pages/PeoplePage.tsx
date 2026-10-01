import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ArrowRight,
  Search,
  Sparkles,
  Briefcase,
  GraduationCap,
  Instagram,
  Linkedin,
  Code,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  FileJson,
  MapPin,
  XCircle,
  BrainCircuit,
  Heart,
  Layers,
  Flame,
  RefreshCw,
  Target
} from 'lucide-react';
import {
  fetchPeople,
  analyzePerson,
  fetchSeedList,
  analyzeBatchIntelligence,
  generateCandidateMatches,
  fetchAllCandidates,
  fetchCandidatesForPerson,
  PersonData,
  CandidateMatchData,
  BatchIntelligenceResponse,
  MatchingGenerateResponse
} from '../api/client';

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'profiles' | 'candidates'>('profiles');

  // Candidate Matches State
  const [candidateMatchesByPerson, setCandidateMatchesByPerson] = useState<Record<string, CandidateMatchData[]>>({});
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [generatingMatches, setGeneratingMatches] = useState<boolean>(false);
  const [matchingSummary, setMatchingSummary] = useState<MatchingGenerateResponse | null>(null);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');

  // Form State
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedPerson, setAnalyzedPerson] = useState<PersonData | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Seed Dataset State
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedProgress, setSeedProgress] = useState<{ current: number; total: number; currentPerson?: string }>({
    current: 0,
    total: 25,
  });
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
    results: Array<{ name: string; personId?: string; success: boolean; error?: string; skipped?: boolean }>;
  } | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = useState<boolean>(false);

  // Batch Intelligence State
  const [batchAnalyzing, setBatchAnalyzing] = useState<boolean>(false);
  const [intelProgress, setIntelProgress] = useState<{
    current: number;
    total: number;
    currentPerson?: string;
    successful: number;
    failed: number;
    alreadyAnalyzed: number;
  }>({
    current: 0,
    total: 25,
    successful: 0,
    failed: 0,
    alreadyAnalyzed: 0,
  });
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelResult, setIntelResult] = useState<BatchIntelligenceResponse | null>(null);
  const [showIntelConfirm, setShowIntelConfirm] = useState<boolean>(false);

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

  const loadAllCandidateMatches = () => {
    setLoadingCandidates(true);
    fetchAllCandidates()
      .then((res) => {
        const byPerson: Record<string, CandidateMatchData[]> = {};
        for (const match of res.data || []) {
          if (!byPerson[match.personId]) {
            byPerson[match.personId] = [];
          }
          byPerson[match.personId].push(match);
        }
        setCandidateMatchesByPerson(byPerson);
      })
      .catch((err) => {
        console.warn('Could not load candidate matches:', err);
      })
      .finally(() => setLoadingCandidates(false));
  };

  const loadRegistry = () => {
    setLoading(true);
    fetchPeople()
      .then((res) => {
        setPeople(res.data || []);
      })
      .catch(() => {
        setPeople([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRegistry();
    loadAllCandidateMatches();
  }, []);

  const handleGenerateMatching = async () => {
    setGeneratingMatches(true);
    try {
      const summary = await generateCandidateMatches();
      setMatchingSummary(summary);
      loadAllCandidateMatches();
    } catch (err: any) {
      console.error('Failed to generate candidate matches:', err);
    } finally {
      setGeneratingMatches(false);
    }
  };

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!linkedinUrl.trim() && !instagramUrl.trim()) {
      setAnalysisError('Please enter at least one URL (LinkedIn or Instagram).');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalyzedPerson(null);

    try {
      const res = await analyzePerson(linkedinUrl.trim(), instagramUrl.trim());
      setAnalyzedPerson(res.data);
      loadRegistry();
      loadAllCandidateMatches();
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to analyze profile.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteSeed = async () => {
    if (seeding || batchAnalyzing) return; // Prevent duplicate execution
    setShowSeedConfirm(false);
    setSeeding(true);
    setSeedError(null);
    setSeedResult(null);

    try {
      const seedResp = await fetchSeedList();
      const seedList = seedResp.data;
      const total = seedList.length;

      const peopleResp = await fetchPeople();
      const existingList = peopleResp.data || [];

      setSeedProgress({ current: 0, total, currentPerson: seedList[0]?.name });

      const results: Array<{ name: string; personId?: string; success: boolean; error?: string; skipped?: boolean }> = [];
      let successfulCount = 0;
      let failedCount = 0;

      for (let i = 0; i < seedList.length; i++) {
        const seed = seedList[i];
        setSeedProgress({ current: i, total, currentPerson: seed.name });

        const existingPerson = existingList.find((p) => {
          const nameMatch = p.name?.toLowerCase().trim() === seed.name.toLowerCase().trim();
          const linkedinMatch =
            seed.linkedinUrl &&
            p.linkedinUrl &&
            p.linkedinUrl
              .toLowerCase()
              .includes(
                seed.linkedinUrl
                  .toLowerCase()
                  .replace('https://in.linkedin.com/in/', '')
                  .replace('https://www.linkedin.com/in/', '')
                  .replace('https://sg.linkedin.com/in/', '')
                  .replace('/', '')
              );
          const instagramMatch =
            seed.instagramUrl &&
            p.instagramUrl &&
            p.instagramUrl
              .toLowerCase()
              .includes(seed.instagramUrl.toLowerCase().replace('https://www.instagram.com/', '').replace('/', ''));
          return nameMatch || linkedinMatch || instagramMatch;
        });

        if (existingPerson) {
          results.push({
            name: seed.name,
            personId: existingPerson.id,
            success: true,
            skipped: true,
          });
          successfulCount++;
        } else {
          try {
            const analyzeResp = await analyzePerson(seed.linkedinUrl, seed.instagramUrl);
            results.push({
              name: seed.name,
              personId: analyzeResp.data.id,
              success: true,
            });
            successfulCount++;
          } catch (err: any) {
            console.error(`Failed to ingest ${seed.name}:`, err);
            results.push({
              name: seed.name,
              success: false,
              error: err.message || 'Scraper failed',
            });
            failedCount++;
          }
        }

        setSeedProgress({ current: i + 1, total, currentPerson: i + 1 < total ? seedList[i + 1].name : undefined });
      }

      setSeedResult({
        total,
        processed: results.length,
        successful: successfulCount,
        failed: failedCount,
        results,
      });

      loadRegistry();
    } catch (err: any) {
      setSeedError(err.message || 'Failed to seed dataset.');
    } finally {
      setSeeding(false);
    }
  };

  const handleExecuteBatchIntelligence = async (forceReanalyze: boolean = false) => {
    if (batchAnalyzing || seeding) return; // Prevent duplicate execution
    setShowIntelConfirm(false);
    setBatchAnalyzing(true);
    setIntelError(null);
    setIntelResult(null);

    const total = people.length || 25;
    setIntelProgress({
      current: 0,
      total,
      currentPerson: people[0]?.name || 'Initializing batch intelligence...',
      successful: 0,
      failed: 0,
      alreadyAnalyzed: 0,
    });

    try {
      const resp = await analyzeBatchIntelligence(forceReanalyze);
      setIntelResult(resp);
      setIntelProgress({
        current: resp.total,
        total: resp.total,
        successful: resp.successful,
        failed: resp.failed,
        alreadyAnalyzed: resp.alreadyAnalyzed,
        currentPerson: undefined,
      });

      // Update registry and candidate matches in-place without page reload
      loadRegistry();
      loadAllCandidateMatches();
    } catch (err: any) {
      setIntelError(err.message || 'Failed to complete batch intelligence.');
    } finally {
      setBatchAnalyzing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Page Title Header */}
      <div className="border-b border-zinc-800/80 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest mb-2">
            <span>HarvestAPI Integration</span>
            <span aria-hidden="true">·</span>
            <span>Gemini Intelligence Pipeline</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-zinc-100 text-balance">
            Profile Ingestion & Intelligence
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Ingest public LinkedIn and Instagram profiles using server-side HarvestAPI Apify Actors. Extract grounded intelligence, values, conversation topics, and compute top 5 candidate matches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Prominent Analyze All Profiles Button */}
          <button
            onClick={() => setShowIntelConfirm(true)}
            disabled={batchAnalyzing || seeding || people.length === 0}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2.5 rounded-lg shadow-lg shadow-amber-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>
                  Analyzing ({intelProgress.current} / {intelProgress.total})
                </span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4 text-zinc-950" />
                <span>ANALYZE ALL PROFILES</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowSeedConfirm(true)}
            disabled={seeding || batchAnalyzing}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 rounded-lg border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>
                  Loading ({seedProgress.current} / {seedProgress.total})
                </span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-amber-400" />
                <span>Load Challenge Dataset (25 Profiles)</span>
              </>
            )}
          </button>

          <Link
            to="/people/sample-subject"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 rounded-lg border border-zinc-700 transition-colors"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Sample Profile</span>
          </Link>
        </div>
      </div>

      {/* Confirmation Modal for Batch Intelligence */}
      {showIntelConfirm && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-zinc-900/95 space-y-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 text-amber-400">
            <BrainCircuit className="w-5 h-5 shrink-0" />
            <h3 className="font-display font-semibold text-lg text-zinc-100">
              Run Batch Person Intelligence?
            </h3>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl font-mono">
            Processes all {people.length} profiles with controlled concurrency (3-4 requests) using the grounded Gemini intelligence pipeline. By default, existing valid intelligence is preserved.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleExecuteBatchIntelligence(false)}
              className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Analyze All Profiles
            </button>
            <button
              onClick={() => handleExecuteBatchIntelligence(true)}
              className="text-xs font-mono text-amber-300 hover:text-amber-200 px-4 py-2.5 rounded bg-amber-500/10 border border-amber-500/30 cursor-pointer"
            >
              Force Re-analyze All
            </button>
            <button
              onClick={() => setShowIntelConfirm(false)}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Seed Dataset */}
      {showSeedConfirm && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-zinc-900/90 space-y-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-amber-400">
            <Users className="w-5 h-5 shrink-0" />
            <h3 className="font-display font-semibold text-lg text-zinc-100">
              Load 25-Person Challenge Seed Dataset?
            </h3>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl font-mono">
            This will ingest the verified 25-person challenge dataset (LinkedIn + Instagram) through the server-side HarvestAPI pipeline (<code className="text-amber-400">POST /api/people/analyze</code>). Existing profiles will be preserved.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleExecuteSeed}
              className="text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Start Controlled Ingestion
            </button>
            <button
              onClick={() => setShowSeedConfirm(false)}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Batch Intelligence Active Progress Banner (Part 5) */}
      {batchAnalyzing && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Analyzing Person Intelligence
                </div>
                <p className="text-sm font-medium text-zinc-200 mt-0.5">
                  Controlled concurrency (3-4 requests) with immediate persistence...
                </p>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-amber-400 bg-amber-500/20 px-3.5 py-1.5 rounded-lg border border-amber-500/40">
              {intelProgress.current} / {intelProgress.total}
            </div>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 transition-all duration-300 ease-out"
              style={{ width: `${(intelProgress.current / Math.max(1, intelProgress.total)) * 100}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 pt-1 gap-2">
            {intelProgress.currentPerson ? (
              <p>
                Current: <span className="text-amber-300 font-semibold">{intelProgress.currentPerson}</span>
              </p>
            ) : (
              <p>Processing batch intelligence...</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">Successful: {intelProgress.successful}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400 font-bold">Already Analyzed: {intelProgress.alreadyAnalyzed}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-rose-400 font-bold">Failed: {intelProgress.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Batch Intelligence Completion Banner (Part 5) */}
      {intelResult && (
        <div className="p-6 rounded-2xl border border-emerald-500/40 bg-zinc-900/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-display font-semibold text-lg text-zinc-100">
                INTELLIGENCE COMPLETE
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-200 font-bold">{intelResult.total} Profiles</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-bold">{intelResult.successful} Analyzed</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400 font-bold">{intelResult.alreadyAnalyzed} Already Analyzed</span>
              <span className="text-zinc-600">·</span>
              <span className="text-rose-400 font-bold">{intelResult.failed} Failed</span>
            </div>
          </div>

          {intelResult.failed > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-semibold">
                <XCircle className="w-4 h-4" />
                <span>Analysis Issues ({intelResult.failed})</span>
              </div>
              <div className="space-y-1">
                {intelResult.results
                  .filter((r) => r.status === 'failed')
                  .map((r, idx) => (
                    <div key={idx} className="text-xs font-mono text-rose-300 flex items-center justify-between">
                      <span>{r.name}</span>
                      <span className="text-rose-400/80 text-[11px]">{r.error || 'Failed'}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px] font-mono max-h-48 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800">
            {intelResult.results.map((res, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border truncate flex items-center justify-between gap-1 ${
                  res.status === 'already_analyzed'
                    ? 'border-zinc-800 text-zinc-400 bg-zinc-900/40'
                    : res.status === 'analyzed'
                    ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                    : 'border-rose-500/30 text-rose-300 bg-rose-500/10'
                }`}
              >
                <span className="truncate">{res.name}</span>
                <span className="text-[9px] uppercase font-bold">
                  {res.status === 'already_analyzed' ? 'Existing' : res.status === 'analyzed' ? 'Done' : 'Fail'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seed Dataset Status / Active Progress Banner */}
      {seeding && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                  Batch Ingestion Active
                </div>
                <p className="text-sm font-medium text-zinc-200 mt-0.5">
                  Ingesting verified challenge dataset through server-side HarvestAPI scrapers...
                </p>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
              {seedProgress.current} / {seedProgress.total}
            </div>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 transition-all duration-300 ease-out"
              style={{ width: `${(seedProgress.current / seedProgress.total) * 100}%` }}
            />
          </div>

          {seedProgress.currentPerson && (
            <p className="text-xs font-mono text-zinc-400">
              Current Target: <span className="text-amber-300 font-semibold">{seedProgress.currentPerson}</span>
            </p>
          )}
        </div>
      )}

      {seedError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{seedError}</span>
        </div>
      )}

      {intelError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{intelError}</span>
        </div>
      )}

      {seedResult && (
        <div className="p-6 rounded-2xl border border-emerald-500/40 bg-zinc-900/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-display font-semibold text-lg text-zinc-100">
                {seedResult.processed} people loaded
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{seedResult.successful} Successful</span>
              <span className="text-zinc-500">·</span>
              <span className="text-rose-400 font-bold">{seedResult.failed} Failed</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400">{seedResult.total} Total</span>
            </div>
          </div>

          {seedResult.failed > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-semibold">
                <XCircle className="w-4 h-4" />
                <span>Failed Profiles ({seedResult.failed})</span>
              </div>
              <div className="space-y-1">
                {seedResult.results
                  .filter((r) => !r.success)
                  .map((r, idx) => (
                    <div key={idx} className="text-xs font-mono text-rose-300 flex items-center justify-between">
                      <span>{r.name}</span>
                      <span className="text-rose-400/80 text-[11px]">{r.error || 'Scraper failed'}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px] font-mono max-h-48 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800">
            {seedResult.results.map((res, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border truncate flex items-center justify-between gap-1 ${
                  res.success
                    ? res.skipped
                      ? 'border-zinc-800 text-zinc-400 bg-zinc-900/40'
                      : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                    : 'border-rose-500/30 text-rose-300 bg-rose-500/10'
                }`}
              >
                <span className="truncate">{res.name}</span>
                <span className="text-[9px] uppercase font-bold">
                  {res.success ? (res.skipped ? 'Exist' : 'Done') : 'Fail'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Ingestion Form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-sm relative">
        <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-zinc-100">
                Ingest Profile via HarvestAPI
              </h2>
              <p className="text-xs text-zinc-400">
                Supply public profile URLs for LinkedIn and/or Instagram.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">POST /api/people/analyze</span>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LinkedIn Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-blue-400" />
                <span>LinkedIn Profile URL</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
              />
            </div>

            {/* Instagram Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>Instagram Profile URL</span>
              </label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/username"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
              />
            </div>
          </div>

          {analysisError && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-zinc-500">
              Scrapers run server-side using HarvestAPI Actor (harvestapi/linkedin-profile-scraper)
            </span>

            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Executing HarvestAPI Scrapers...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Analyze Person</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Returned Normalized Profile Display */}
      {analyzedPerson && (
        <div className="rounded-2xl border border-amber-500/40 bg-zinc-900/80 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  Analysis Succeeded
                </span>
                <h3 className="text-xl font-display font-semibold text-zinc-100">
                  {safeText(analyzedPerson.name)}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>{showRawJson ? 'Hide Source Data' : 'Inspect Raw Source Data'}</span>
              </button>

              <Link
                to={`/people/${analyzedPerson.id}`}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
              >
                <span>Full Profile Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Key Normalized Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overview & Bio */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Headline</span>
                <p className="text-sm font-medium text-zinc-200 mt-0.5">
                  {safeText(analyzedPerson.headline) || 'No headline returned'}
                </p>
              </div>

              {analyzedPerson.currentPosition && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Current Position</span>
                  <p className="text-xs font-mono text-amber-400 mt-0.5">
                    {safeText(analyzedPerson.currentPosition)}
                  </p>
                </div>
              )}

              {analyzedPerson.location && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{safeText(analyzedPerson.location)}</span>
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Bio / Summary</span>
                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {safeText(analyzedPerson.bio) || 'No bio returned'}
                </p>
              </div>

              {/* Skills / Interests */}
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Skills & Interests</span>
                {analyzedPerson.interests && analyzedPerson.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analyzedPerson.interests.map((skill, i) => (
                      <span key={i} className="text-[11px] font-mono text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded">
                        {safeText(skill)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600 font-mono">None extracted</span>
                )}
              </div>
            </div>

            {/* Career & Education */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-amber-400" />
                  <span>Work Experience ({analyzedPerson.career?.length || 0})</span>
                </span>
                {analyzedPerson.career && analyzedPerson.career.length > 0 ? (
                  <div className="space-y-2 mt-1">
                    {analyzedPerson.career.slice(0, 3).map((item, i) => (
                      <div key={i} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80 text-xs">
                        <div className="font-medium text-zinc-200">{safeText(item.title) || 'Role'}</div>
                        <div className="text-[11px] text-zinc-400">
                          {safeText(item.company)} {item.duration ? `· ${safeText(item.duration)}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">No career entries extracted</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-amber-400" />
                  <span>Education ({analyzedPerson.education?.length || 0})</span>
                </span>
                {analyzedPerson.education && analyzedPerson.education.length > 0 ? (
                  <div className="space-y-2 mt-1">
                    {analyzedPerson.education.slice(0, 2).map((item, i) => (
                      <div key={i} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80 text-xs">
                        <div className="font-medium text-zinc-200">{safeText(item.school)}</div>
                        <div className="text-[11px] text-zinc-400">
                          {safeText(item.degree) || safeText(item.fieldOfStudy)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">No education entries extracted</p>
                )}
              </div>
            </div>
          </div>

          {/* Raw JSON Source Data Debug Inspector */}
          {showRawJson && (
            <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <Code className="w-4 h-4" />
                <span>sourceData Debug Payload</span>
              </div>
              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96">
                {JSON.stringify(analyzedPerson.sourceData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Registry & Candidate Matches Section */}
      <div className="space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('profiles')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'profiles'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All Profiles ({people.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveView('candidates');
                if (Object.keys(candidateMatchesByPerson).length === 0) {
                  loadAllCandidateMatches();
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'candidates'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
              }`}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>Candidate Matches</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeView === 'profiles' ? (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400">
                  {people.filter((p) => p.intelligence && !p.intelligence.error).length} Analyzed
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">
                  {people.filter((p) => !p.intelligence || p.intelligence.error).length} Pending
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateMatching}
                  disabled={generatingMatches || people.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingMatches ? 'animate-spin' : ''}`} />
                  <span>{generatingMatches ? 'Evaluating 300 Pairs...' : 'Recompute Candidate Matches'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View 1: Subject Profiles List */}
        {activeView === 'profiles' && (
          <div>
            {loading ? (
              <div className="p-8 text-center border border-zinc-800/80 rounded-xl bg-zinc-900/20">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-mono text-zinc-400">Fetching ingested subjects...</p>
              </div>
            ) : people.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {people.map((p) => {
                  const hasIntel = p.intelligence && !p.intelligence.error;
                  return (
                    <div
                      key={p.id}
                      className="group p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-display font-bold text-lg text-amber-400 overflow-hidden">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name || 'Avatar'} className="w-full h-full object-cover" />
                            ) : p.name ? (
                              safeText(p.name).charAt(0)
                            ) : (
                              'P'
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasIntel ? (
                              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Analyzed</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                                Pending Intel
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-display font-semibold text-lg text-zinc-100 group-hover:text-amber-300 transition-colors">
                          {safeText(p.name) || 'Unnamed Subject'}
                        </h3>
                        <p className="mt-1 text-xs text-amber-400/80 font-mono truncate">
                          {safeText(p.headline) || 'No headline'}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                          {safeText(p.bio) || safeText(p.about) || 'No detailed bio recorded yet.'}
                        </p>

                        {/* Grounded Intelligence Preview Badges */}
                        {hasIntel && p.intelligence && (
                          <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-2">
                            {p.intelligence.values && p.intelligence.values.length > 0 && (
                              <div>
                                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Values:</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {p.intelligence.values.slice(0, 2).map((val, vi) => (
                                    <span key={vi} className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                                      {safeText(val)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{p.career?.length || 0} Career</span>
                          <span aria-hidden="true">·</span>
                          <span>{p.interests?.length || 0} Skills</span>
                          {p.sourceLinks?.linkedin && (
                            <>
                              <span aria-hidden="true">·</span>
                              <a
                                href={p.sourceLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-0.5"
                              >
                                <Linkedin className="w-3 h-3" />
                              </a>
                            </>
                          )}
                          {p.sourceLinks?.instagram && (
                            <>
                              <span aria-hidden="true">·</span>
                              <a
                                href={p.sourceLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-400 hover:underline flex items-center gap-0.5"
                              >
                                <Instagram className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                        <Link
                          to={`/people/${p.id}`}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <span>View Profile</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => {
                            setSelectedPersonFilter(p.id);
                            setActiveView('candidates');
                          }}
                          className="text-xs font-mono text-zinc-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Target className="w-3 h-3 text-amber-400" />
                          <span>Candidate Matches</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-xs font-mono text-zinc-500">
                No subjects currently stored in memory. Submit a LinkedIn or Instagram URL above or click &quot;Load Challenge Dataset&quot; to run the HarvestAPI pipeline.
              </div>
            )}
          </div>
        )}

        {/* View 2: Dedicated Candidate Matches Section (Part 11) */}
        {activeView === 'candidates' && (
          <div className="space-y-8">
            {/* Explanatory Banner */}
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                    CANDIDATE MATCH
                  </span>
                  <h3 className="font-display font-semibold text-zinc-100 text-sm">
                    Preliminary Grounded Compatibility Selection
                  </h3>
                </div>
                <div className="text-xs font-mono text-amber-400/90">
                  {matchingSummary ? `${matchingSummary.pairsEvaluated} Unique Pairs Evaluated` : '300 Unique Pairs Evaluated'}
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Candidate scores are deterministically derived from grounded profile intelligence across Shared Interests (30%), Values (25%), Hobbies (15%), Lifestyle (15%), and Conversation Topics (15%). This is labeled strictly as a <strong>CANDIDATE MATCH</strong> score; final dating compatibility is evaluated after autonomous Agent Speed Dating.
              </p>
            </div>

            {/* Filter by Person Dropdown */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 uppercase">Filter Subject:</span>
                <select
                  value={selectedPersonFilter}
                  onChange={(e) => setSelectedPersonFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 rounded px-3 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Subjects (25 Profiles)</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {safeText(p.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-mono text-zinc-500">
                Top 5 Candidates per Person
              </div>
            </div>

            {/* Candidates Grouped by Person */}
            {loadingCandidates ? (
              <div className="p-12 text-center border border-zinc-800 rounded-xl bg-zinc-900/20">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-mono text-zinc-400">Loading candidate matches...</p>
              </div>
            ) : (
              <div className="space-y-10">
                {people
                  .filter((p) => selectedPersonFilter === 'all' || p.id === selectedPersonFilter)
                  .map((person) => {
                    const candidates = candidateMatchesByPerson[person.id] || [];
                    return (
                      <div
                        key={person.id}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6 shadow-sm"
                      >
                        {/* Person Subject Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-400 overflow-hidden shrink-0">
                              {person.avatarUrl ? (
                                <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                              ) : (
                                safeText(person.name).charAt(0) || 'P'
                              )}
                            </div>
                            <div>
                              <h3 className="font-display font-semibold text-lg text-zinc-100">
                                {safeText(person.name)}
                              </h3>
                              <p className="text-xs text-amber-400 font-mono truncate max-w-md">
                                {safeText(person.headline) || 'Challenge Profile Subject'}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1 rounded border border-zinc-800 self-start sm:self-auto">
                            Top 5 Grounded Candidates
                          </span>
                        </div>

                        {/* Top 5 Candidates Cards Grid */}
                        {candidates.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {candidates.map((cand, ci) => (
                              <div
                                key={cand.candidateId}
                                className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                              >
                                <div className="space-y-3">
                                  {/* Candidate Header & Score */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden shrink-0">
                                        {cand.candidateAvatar ? (
                                          <img src={cand.candidateAvatar} alt={cand.candidateName} className="w-full h-full object-cover" />
                                        ) : (
                                          cand.candidateName?.charAt(0) || '#'
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-display font-medium text-xs text-zinc-100 truncate max-w-[120px]">
                                          {cand.candidateName || cand.candidateId}
                                        </h4>
                                        <span className="text-[10px] font-mono text-zinc-500">#{ci + 1} Candidate</span>
                                      </div>
                                    </div>

                                    {/* CANDIDATE MATCH Score Badge */}
                                    <div className="text-right">
                                      <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold block">
                                        CANDIDATE MATCH
                                      </span>
                                      <span className="font-display font-bold text-sm text-amber-400 mt-0.5 block">
                                        {cand.candidateScore}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Shared Interests */}
                                  {cand.sharedInterests && cand.sharedInterests.length > 0 && (
                                    <div>
                                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                        Shared Interests:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {cand.sharedInterests.slice(0, 2).map((si, sii) => (
                                          <span
                                            key={sii}
                                            className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[140px]"
                                          >
                                            {si}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Shared Values */}
                                  {cand.sharedValues && cand.sharedValues.length > 0 && (
                                    <div>
                                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                        Shared Values:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {cand.sharedValues.slice(0, 2).map((sv, svi) => (
                                          <span
                                            key={svi}
                                            className="text-[10px] font-mono bg-amber-500/5 text-amber-300/90 px-1.5 py-0.5 rounded border border-amber-500/20 truncate max-w-[140px]"
                                          >
                                            {sv}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Why They Were Selected */}
                                  {cand.reasons && cand.reasons.length > 0 && (
                                    <div className="pt-2 border-t border-zinc-900">
                                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                                        Why Selected:
                                      </span>
                                      <ul className="space-y-1">
                                        {cand.reasons.slice(0, 2).map((r, ri) => (
                                          <li key={ri} className="text-[11px] font-mono text-zinc-400 leading-snug flex items-start gap-1">
                                            <span className="text-amber-500 shrink-0">›</span>
                                            <span>{r}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Action: Launch Agent Speed Date */}
                                <div className="pt-3 border-t border-zinc-900">
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
                        ) : (
                          <div className="p-4 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800 text-xs font-mono text-zinc-500">
                            No candidate matches computed for this person. Run batch intelligence or click &quot;Recompute Candidate Matches&quot; above.
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
