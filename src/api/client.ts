/**
 * AgentDate API Client
 */

export interface HealthResponse {
  status: string;
}

export interface EvidenceItem {
  claim: string;
  source: 'linkedin' | 'instagram' | 'conversation' | 'profileA' | 'profileB' | string;
  evidence: string;
}

export interface PersonIntelligence {
  needs: string[];
  hobbies: string[];
  interests: string[];
  values: string[];
  lifestyle: string[];
  personality: string[];
  conversationTopics: string[];
  datingPreferences: string[];
  evidence: EvidenceItem[];
  analyzedAt?: string;
  error?: string;
}

export interface PersonData {
  id: string;
  name?: string;
  headline?: string;
  bio?: string;
  about?: string;
  location?: string;
  currentPosition?: string;
  avatarUrl?: string;
  career?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
    location?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    dates?: string;
  }>;
  interests?: string[];
  hobbies?: string[];
  lifestyle?: string[];
  needs?: string[];
  linkedinUrl?: string;
  instagramUrl?: string;
  sourceData?: {
    linkedin?: any;
    instagram?: any;
    errors?: string[];
  };
  intelligence?: PersonIntelligence;
  agent?: {
    name?: string;
    personalityTraits?: string[];
    status?: string;
  };
  sourceLinks?: {
    linkedin?: string;
    instagram?: string;
  };
  createdAt?: string;
}

export interface AgentDatingSession {
  id: string;
  personA: {
    id: string;
    name: string;
  };
  personB: {
    id: string;
    name: string;
  };
  conversation: Array<{
    speaker: 'A' | 'B';
    speakerName?: string;
    message: string;
    timestamp?: string;
  }>;
  compatibility: {
    score: number;
    sharedInterests: string[];
    strongAlignment: string[];
    potentialDifferences: string[];
    summary: string;
    evidence: EvidenceItem[];
  };
  createdAt?: string;
}

export interface DateSessionData {
  personA: PersonData;
  personB: PersonData;
  directedEvaluation?: {
    personId: string;
    candidateId: string;
    compatibilityScore: number;
    sharedInterests: string[];
    strongAlignment: string[];
    potentialDifferences: string[];
    chemistrySummary: string;
    evidence: EvidenceItem[];
    datingSessionId: string;
    createdAt?: string;
  } | null;
  session: {
    id: string;
    personAId: string;
    personBId: string;
    status: 'pending' | 'in_progress' | 'completed';
    conversation: Array<{
      speaker?: 'A' | 'B';
      speakerName?: string;
      senderId?: string;
      message: string;
      timestamp?: string;
      turnNumber?: number;
    }>;
    compatibility?: {
      score?: number;
      sharedInterests?: string[];
      strongAlignment?: string[];
      potentialDifferences?: string[];
      summary?: string;
      evidence?: EvidenceItem[];
      pros?: string[];
      cons?: string[];
    };
  };
}

export interface RankingItem {
  id: string;
  personAId: string;
  personBId: string;
  score: number;
  matchReason?: string;
  updatedAt: string;
}

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchPeople(): Promise<{ data: PersonData[]; count: number }> {
  const res = await fetch(`${API_BASE}/people`);
  if (!res.ok) throw new Error(`Failed to fetch people: ${res.status}`);
  return res.json();
}

export async function fetchSeedList(): Promise<{ data: Array<{ name: string; linkedinUrl: string; instagramUrl: string }>; count: number }> {
  const res = await fetch(`${API_BASE}/people/seed-list`);
  if (!res.ok) throw new Error(`Failed to fetch seed list: ${res.status}`);
  return res.json();
}

export async function fetchPerson(id: string): Promise<{ data: PersonData }> {
  const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch person ${id}: ${res.status}`);
  return res.json();
}

export async function analyzePerson(linkedinUrl: string, instagramUrl: string): Promise<{ message: string; data: PersonData }> {
  const res = await fetch(`${API_BASE}/people/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ linkedinUrl, instagramUrl }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Analysis failed with status ${res.status}`);
  }
  return payload;
}

export async function analyzePersonIntelligence(id: string): Promise<{ message: string; data: PersonData }> {
  const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Intelligence analysis failed with status ${res.status}`);
  }
  return payload;
}

export async function startAgentDate(personAId: string, personBId: string): Promise<AgentDatingSession> {
  const res = await fetch(`${API_BASE}/dating/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ personAId, personBId }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Agent dating failed with status ${res.status}`);
  }
  return payload;
}

export async function fetchDatingSession(id: string): Promise<AgentDatingSession> {
  const res = await fetch(`${API_BASE}/dating/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch dating session ${id}: ${res.status}`);
  return res.json();
}

export async function fetchDateSession(personA: string, personB: string): Promise<{ data: DateSessionData }> {
  const res = await fetch(`${API_BASE}/date/${encodeURIComponent(personA)}/${encodeURIComponent(personB)}`);
  if (!res.ok) throw new Error(`Failed to fetch date session: ${res.status}`);
  return res.json();
}

export async function seedPeopleDataset(): Promise<{
  total: number;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    name: string;
    personId?: string;
    success: boolean;
    error?: string;
    skipped?: boolean;
  }>;
}> {
  const res = await fetch(`${API_BASE}/people/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Dataset seeding failed with status ${res.status}`);
  }
  return payload;
}

export interface CandidateMatchData {
  personId: string;
  candidateId: string;
  candidateScore: number;
  sharedInterests: string[];
  sharedValues: string[];
  sharedHobbies: string[];
  conversationOverlap: string[];
  reasons: string[];
  candidateName?: string;
  candidateAvatar?: string;
  candidateHeadline?: string;
  eligibilityStatus: 'eligible' | 'ineligible' | 'unknown';
  eligibilityReason?: string;
}

export interface BatchIntelligenceResponse {
  total: number;
  alreadyAnalyzed: number;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    personId: string;
    name: string;
    status: 'already_analyzed' | 'analyzed' | 'failed';
    error?: string;
  }>;
}

export async function analyzeBatchIntelligence(forceReanalyze: boolean = false): Promise<BatchIntelligenceResponse> {
  const res = await fetch(`${API_BASE}/people/analyze-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ forceReanalyze }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Batch intelligence analysis failed with status ${res.status}`);
  }
  return payload;
}

export interface MatchingGenerateResponse {
  message: string;
  people: number;
  pairsEvaluated: number;
  rankingsGenerated: number;
  candidatesPerPerson: number;
  skippedNoIntel: number;
}

export async function generateCandidateMatches(): Promise<MatchingGenerateResponse> {
  const res = await fetch(`${API_BASE}/matching/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Failed to generate candidate matches: ${res.status}`);
  }
  return payload;
}

export async function fetchCandidatesForPerson(personId: string): Promise<{ personId: string; personName?: string; candidates: CandidateMatchData[]; count: number }> {
  const res = await fetch(`${API_BASE}/matching/candidates/${encodeURIComponent(personId)}`);
  if (!res.ok) throw new Error(`Failed to fetch candidates for ${personId}: ${res.status}`);
  return res.json();
}

export async function fetchAllCandidates(): Promise<{ data: CandidateMatchData[]; count: number }> {
  const res = await fetch(`${API_BASE}/matching/all`);
  if (!res.ok) throw new Error(`Failed to fetch all candidates: ${res.status}`);
  return res.json();
}

export async function fetchRankings(): Promise<{ data: RankingItem[]; count: number }> {
  const res = await fetch(`${API_BASE}/rankings`);
  if (!res.ok) throw new Error(`Failed to fetch rankings: ${res.status}`);
  return res.json();
}

export interface FinalRankingEntry {
  rank: number;
  personId: string;
  candidateId: string;
  candidateName?: string;
  candidateAvatar?: string;
  candidateHeadline?: string;
  compatibilityScore: number;
  sharedInterests: string[];
  strongAlignment: string[];
  potentialDifferences: string[];
  chemistrySummary: string;
  datingSessionId: string;
  evidence?: EvidenceItem[];
  createdAt?: string;
}

export interface PersonFinalRanking {
  personId: string;
  personName: string;
  rankings: FinalRankingEntry[];
}

export interface ChallengeDateResultItem {
  personId: string;
  candidateId: string;
  candidateName?: string;
  status: 'already_completed' | 'completed' | 'failed';
  datingSessionId?: string;
  compatibilityScore?: number;
  error?: string;
}

export interface ChallengeDatingResponse {
  totalCandidates: number;
  alreadyCompleted: number;
  processed: number;
  successful: number;
  failed: number;
  results: ChallengeDateResultItem[];
}

export async function runCandidateDates(options: { personId?: string; limit?: number } = {}): Promise<ChallengeDatingResponse> {
  const res = await fetch(`${API_BASE}/dating/run-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Failed to run candidate dates: ${res.status}`);
  }
  return payload;
}

export async function fetchPersonRankings(personId: string): Promise<PersonFinalRanking> {
  const res = await fetch(`${API_BASE}/rankings/${encodeURIComponent(personId)}`);
  if (!res.ok) throw new Error(`Failed to fetch rankings for ${personId}: ${res.status}`);
  return res.json();
}

export async function fetchAllFinalRankings(): Promise<{ count: number; data: PersonFinalRanking[] }> {
  const res = await fetch(`${API_BASE}/rankings`);
  if (!res.ok) throw new Error(`Failed to fetch all final rankings: ${res.status}`);
  return res.json();
}

export async function fetchCompletedDates(): Promise<{ count: number; data: any[] }> {
  const res = await fetch(`${API_BASE}/date/completed`);
  if (!res.ok) throw new Error(`Failed to fetch completed dates: ${res.status}`);
  return res.json();
}
