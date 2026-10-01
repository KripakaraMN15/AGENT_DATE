/**
 * AgentDate Data Store
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EvidenceItem {
  claim: string;
  source: 'linkedin' | 'instagram' | string;
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

export interface Person {
  id: string;
  name?: string;
  headline?: string;
  bio?: string;
  about?: string;
  location?: string;
  currentPosition?: string;
  avatarUrl?: string;
  gender?: string | null;
  datingPreferences?: {
    preferredGenders?: string[];
  };
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

export interface DatingConversationTurn {
  speaker: 'A' | 'B';
  speakerName?: string;
  message: string;
  timestamp?: string;
}

export interface CompatibilityResult {
  score: number;
  sharedInterests: string[];
  strongAlignment: string[];
  potentialDifferences: string[];
  summary: string;
  evidence: EvidenceItem[];
}

export interface DateSession {
  id: string;
  personAId: string;
  personBId: string;
  personA: {
    id: string;
    name: string;
  };
  personB: {
    id: string;
    name: string;
  };
  status: 'pending' | 'in_progress' | 'completed';
  conversation: DatingConversationTurn[];
  compatibility: CompatibilityResult;
  createdAt: string;
}

export interface RankingEntry {
  id: string;
  personAId: string;
  personBId: string;
  score: number;
  matchReason?: string;
  updatedAt: string;
}

export interface CandidateMatch {
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

export interface DirectedCompatibilityEvaluation {
  personId: string;
  candidateId: string;
  compatibilityScore: number;
  sharedInterests: string[];
  strongAlignment: string[];
  potentialDifferences: string[];
  chemistrySummary: string;
  evidence: EvidenceItem[];
  datingSessionId: string;
  createdAt: string;
}

export interface PersistentSnapshotData {
  people: Person[];
  dateSessions?: DateSession[];
  candidatesByPerson?: Record<string, CandidateMatch[]>;
  directedEvaluations?: Record<string, DirectedCompatibilityEvaluation>;
  rankings?: RankingEntry[];
  updatedAt?: string;
}

class DataStore {
  private people: Map<string, Person> = new Map();
  private dateSessionsByPair: Map<string, DateSession> = new Map();
  private dateSessionsById: Map<string, DateSession> = new Map();
  private rankings: RankingEntry[] = [];
  private candidatesByPerson: Map<string, CandidateMatch[]> = new Map();
  private directedEvaluations: Map<string, DirectedCompatibilityEvaluation> = new Map();
  private snapshotFilePath: string;
  private isFirestoreMode = false;

  constructor() {
    this.snapshotFilePath = path.resolve(__dirname, 'challengeSnapshot.json');
    // Pre-load from local JSON snapshot during instantiation so server always has valid bootstrap state immediately
    this.loadSnapshot();
  }

  /**
   * Initializes the persistent backing store asynchronously.
   * If PERSISTENCE_MODE=firestore, loads required records from Firestore and populates in-memory maps.
   * If connection/auth issues occur, gracefully falls back to JSON persistence mode.
   */
  async initialize(): Promise<void> {
    this.isFirestoreMode = process.env.PERSISTENCE_MODE === 'firestore';

    if (this.isFirestoreMode) {
      console.log('[DataStore] Initializing in Firestore mode...');
      try {
        const { db } = await import('./firebase');
        
        // 1. Hydrate People
        const peopleSnap = await db.collection('people').get();
        this.people.clear();
        for (const doc of peopleSnap.docs) {
          const person = doc.data() as Person;
          this.people.set(person.id, person);
        }

        // 2. Hydrate Dating Sessions
        const sessSnap = await db.collection('datingSessions').get();
        this.dateSessionsByPair.clear();
        this.dateSessionsById.clear();
        for (const doc of sessSnap.docs) {
          const sess = doc.data() as DateSession;
          const key = [sess.personAId, sess.personBId].sort().join('::');
          this.dateSessionsByPair.set(key, sess);
          this.dateSessionsById.set(sess.id, sess);
        }

        // 3. Hydrate Directed Evaluations
        const evalSnap = await db.collection('directedEvaluations').get();
        this.directedEvaluations.clear();
        for (const doc of evalSnap.docs) {
          const evalItem = doc.data() as DirectedCompatibilityEvaluation;
          const key = `${evalItem.personId}::${evalItem.candidateId}`;
          this.directedEvaluations.set(key, evalItem);
        }

        // 4. Hydrate Candidate Matches
        const matchesSnap = await db.collection('candidateMatches').get();
        this.candidatesByPerson.clear();
        for (const doc of matchesSnap.docs) {
          const match = doc.data() as CandidateMatch;
          if (!this.candidatesByPerson.has(match.personId)) {
            this.candidatesByPerson.set(match.personId, []);
          }
          this.candidatesByPerson.get(match.personId)!.push(match);
        }

        // 5. Rebuild Rankings from active compatibility sessions
        this.rebuildRankingsFromSessions();

        console.log('[AgentDate] Hydration from Firestore complete!');
        console.log(`[AgentDate] Loaded ${this.people.size} people`);
        console.log(`[AgentDate] Loaded ${this.getAllCandidates().length} candidate matches`);
        console.log(`[AgentDate] Loaded ${this.dateSessionsById.size} dating sessions`);
        console.log(`[AgentDate] Loaded ${this.directedEvaluations.size} directed evaluations`);
        return;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[DataStore] FATAL: Firestore initialization/authentication failed in production environment!');
          throw err;
        }
        console.warn(`[DataStore] Firestore permission/connection issue (${err?.message || err}). Falling back to local JSON persistence.`);
        this.isFirestoreMode = false;
        this.loadSnapshot();
      }
    } else {
      console.log('[DataStore] Initializing in local JSON persistence mode...');
    }
  }

  private rebuildRankingsFromSessions() {
    this.rankings = [];
    for (const session of this.dateSessionsById.values()) {
      if (session.compatibility && typeof session.compatibility.score === 'number') {
        const rankingEntry: RankingEntry = {
          id: session.id,
          personAId: session.personAId,
          personBId: session.personBId,
          score: session.compatibility.score,
          matchReason: session.compatibility.summary,
          updatedAt: session.createdAt || new Date().toISOString(),
        };
        const existingIdx = this.rankings.findIndex(
          (r) =>
            (r.personAId === session.personAId && r.personBId === session.personBId) ||
            (r.personAId === session.personBId && r.personBId === session.personAId)
        );
        if (existingIdx >= 0) {
          this.rankings[existingIdx] = rankingEntry;
        } else {
          this.rankings.push(rankingEntry);
        }
      }
    }
    this.rankings.sort((a, b) => b.score - a.score);
  }

  /**
   * Loads persisted challenge snapshot from disk
   */
  private loadSnapshot(): void {
    try {
      if (fs.existsSync(this.snapshotFilePath)) {
        const raw = fs.readFileSync(this.snapshotFilePath, 'utf-8');
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          
          // Support both array of people and structured object
          const peopleList: Person[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed.people) ? parsed.people : [];
          
          for (const person of peopleList) {
            if (person && person.id) {
              this.people.set(person.id, person);
            }
          }

          if (!Array.isArray(parsed) && parsed.dateSessions && Array.isArray(parsed.dateSessions)) {
            for (const sess of parsed.dateSessions) {
              if (sess && sess.id) {
                const key = [sess.personAId, sess.personBId].sort().join('::');
                this.dateSessionsByPair.set(key, sess);
                this.dateSessionsById.set(sess.id, sess);
              }
            }
          }

          if (!Array.isArray(parsed) && parsed.candidatesByPerson && typeof parsed.candidatesByPerson === 'object') {
            for (const [pid, list] of Object.entries(parsed.candidatesByPerson)) {
              if (Array.isArray(list)) {
                this.candidatesByPerson.set(pid, list as CandidateMatch[]);
              }
            }
          }

          if (!Array.isArray(parsed) && parsed.directedEvaluations && typeof parsed.directedEvaluations === 'object') {
            for (const [pairKey, evalItem] of Object.entries(parsed.directedEvaluations)) {
              if (evalItem && typeof evalItem === 'object') {
                this.directedEvaluations.set(pairKey, evalItem as DirectedCompatibilityEvaluation);
              }
            }
          }

          if (!Array.isArray(parsed) && Array.isArray(parsed.rankings)) {
            this.rankings = parsed.rankings;
          }

          console.log(`Loaded ${this.people.size} persisted challenge profiles (${this.directedEvaluations.size} directed evaluations)`);
          return;
        }
      }
    } catch (err) {
      console.warn(`[DataStore] Failed to load challengeSnapshot.json:`, err);
    }
    console.log(`Loaded ${this.people.size} persisted challenge profiles`);
  }

  /**
   * Persists snapshot data to disk
   */
  public saveSnapshot(): void {
    try {
      const candidatesObj: Record<string, CandidateMatch[]> = {};
      for (const [pid, list] of this.candidatesByPerson.entries()) {
        candidatesObj[pid] = list;
      }

      const directedEvalObj: Record<string, DirectedCompatibilityEvaluation> = {};
      for (const [key, evalItem] of this.directedEvaluations.entries()) {
        directedEvalObj[key] = evalItem;
      }

      const snapshot: PersistentSnapshotData = {
        people: Array.from(this.people.values()),
        dateSessions: Array.from(this.dateSessionsById.values()),
        candidatesByPerson: candidatesObj,
        directedEvaluations: directedEvalObj,
        rankings: this.rankings,
        updatedAt: new Date().toISOString(),
      };

      const dir = path.dirname(this.snapshotFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.snapshotFilePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[DataStore] Failed to write challengeSnapshot.json:`, err);
    }
  }

  // People
  getAllPeople(): Person[] {
    return Array.from(this.people.values());
  }

  getPersonById(id: string): Person | undefined {
    return this.people.get(id);
  }

  addPerson(person: Person): Person {
    this.people.set(person.id, person);
    if (this.isFirestoreMode) {
      import('./firebase').then(({ db }) => {
        db.collection('people').doc(person.id).set(person)
          .catch(err => console.error('[Firestore] Error saving person doc:', err));
      });
    } else {
      this.saveSnapshot();
    }
    return person;
  }

  // Date Sessions
  getDateSession(personAId: string, personBId: string): DateSession | undefined {
    const key = [personAId, personBId].sort().join('::');
    return this.dateSessionsByPair.get(key);
  }

  getDateSessionById(id: string): DateSession | undefined {
    return this.dateSessionsById.get(id);
  }

  getAllDateSessions(): DateSession[] {
    return Array.from(this.dateSessionsById.values());
  }

  saveDateSession(session: DateSession): DateSession {
    const key = [session.personAId, session.personBId].sort().join('::');
    this.dateSessionsByPair.set(key, session);
    this.dateSessionsById.set(session.id, session);

    if (session.compatibility && typeof session.compatibility.score === 'number') {
      const rankingEntry: RankingEntry = {
        id: session.id,
        personAId: session.personAId,
        personBId: session.personBId,
        score: session.compatibility.score,
        matchReason: session.compatibility.summary,
        updatedAt: session.createdAt || new Date().toISOString(),
      };
      const existingIdx = this.rankings.findIndex(
        (r) =>
          (r.personAId === session.personAId && r.personBId === session.personBId) ||
          (r.personAId === session.personBId && r.personBId === session.personAId)
      );
      if (existingIdx >= 0) {
        this.rankings[existingIdx] = rankingEntry;
      } else {
        this.rankings.push(rankingEntry);
      }
      this.rankings.sort((a, b) => b.score - a.score);
    }

    if (this.isFirestoreMode) {
      import('./firebase').then(({ db }) => {
        db.collection('datingSessions').doc(session.id).set(session)
          .catch(err => console.error('[Firestore] Error saving datingSession doc:', err));
      });
    } else {
      this.saveSnapshot();
    }
    return session;
  }

  // Rankings
  getRankings(): RankingEntry[] {
    return [...this.rankings];
  }

  setRankings(rankings: RankingEntry[]): void {
    this.rankings = rankings;
    this.saveSnapshot();
  }

  // Directed Compatibility Evaluations (Phase 5C)
  saveDirectedEvaluation(evalItem: DirectedCompatibilityEvaluation): void {
    const key = `${evalItem.personId}::${evalItem.candidateId}`;
    this.directedEvaluations.set(key, evalItem);
    if (this.isFirestoreMode) {
      import('./firebase').then(({ db }) => {
        db.collection('directedEvaluations').doc(key).set(evalItem)
          .catch(err => console.error('[Firestore] Error saving directedEvaluation doc:', err));
      });
    } else {
      this.saveSnapshot();
    }
  }

  getDirectedEvaluation(personId: string, candidateId: string): DirectedCompatibilityEvaluation | undefined {
    const key = `${personId}::${candidateId}`;
    return this.directedEvaluations.get(key);
  }

  getDirectedEvaluationsForPerson(personId: string): DirectedCompatibilityEvaluation[] {
    const list: DirectedCompatibilityEvaluation[] = [];
    for (const [key, evalItem] of this.directedEvaluations.entries()) {
      if (key.startsWith(`${personId}::`)) {
        list.push(evalItem);
      }
    }
    return list;
  }

  getAllDirectedEvaluations(): DirectedCompatibilityEvaluation[] {
    return Array.from(this.directedEvaluations.values());
  }

  // Candidate Matches
  setCandidatesForPerson(personId: string, candidates: CandidateMatch[]): void {
    this.candidatesByPerson.set(personId, candidates);
    if (this.isFirestoreMode) {
      import('./firebase').then(({ db }) => {
        const batch = db.batch();
        for (const match of candidates) {
          const docId = `${personId}__${match.candidateId}`;
          const docRef = db.collection('candidateMatches').doc(docId);
          batch.set(docRef, match);
        }
        batch.commit().catch(err => console.error('[Firestore] Error committing candidateMatches batch:', err));
      });
    } else {
      this.saveSnapshot();
    }
  }

  getCandidatesForPerson(personId: string): CandidateMatch[] {
    return this.candidatesByPerson.get(personId) || [];
  }

  getAllCandidates(): CandidateMatch[] {
    const all: CandidateMatch[] = [];
    for (const list of this.candidatesByPerson.values()) {
      all.push(...list);
    }
    return all;
  }

  getFirestoreStatus(): { active: boolean; isFirestoreMode: boolean } {
    return {
      active: this.isFirestoreMode && this.people.size > 0,
      isFirestoreMode: this.isFirestoreMode,
    };
  }
}

export const store = new DataStore();

