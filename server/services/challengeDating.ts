import { store, DirectedCompatibilityEvaluation } from '../data/store';
import { AgentDatingService } from './agentDating';

export interface ChallengeDatingOptions {
  personId?: string;
  limit?: number;
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

export class ChallengeDatingService {
  private static isRunning: boolean = false;

  public static isBatchActive(): boolean {
    return this.isRunning;
  }

  /**
   * Runs autonomous agent speed dates for persisted candidate matches.
   * Directed evaluation: A -> B produces an evaluation from Person A's perspective.
   * Controlled concurrency = 2.
   * Resumable: Skips pairs with existing directed evaluations.
   */
  public static async runCandidateDates(options: ChallengeDatingOptions = {}): Promise<ChallengeDatingResponse> {
    if (this.isRunning) {
      throw new Error('A challenge agent dating batch is currently active. Please wait for it to complete.');
    }

    this.isRunning = true;

    try {
      const allPeople = store.getAllPeople();
      const allCandidateMatches = store.getAllCandidates();

      // Filter candidates based on optional personId
      let targetCandidates = allCandidateMatches;
      if (options.personId) {
        targetCandidates = targetCandidates.filter((c) => c.personId === options.personId);
      }

      const totalCandidates = targetCandidates.length;
      const results: ChallengeDateResultItem[] = [];

      const toProcess: typeof targetCandidates = [];

      for (const match of targetCandidates) {
        if (match.eligibilityStatus === 'ineligible') {
          results.push({
            personId: match.personId,
            candidateId: match.candidateId,
            candidateName: match.candidateName,
            status: 'failed',
            error: 'Ineligible candidate based on explicitly stated dating preferences.',
          });
          continue;
        }

        const existingEval = store.getDirectedEvaluation(match.personId, match.candidateId);
        if (existingEval) {
          results.push({
            personId: match.personId,
            candidateId: match.candidateId,
            candidateName: match.candidateName,
            status: 'already_completed',
            datingSessionId: existingEval.datingSessionId,
            compatibilityScore: existingEval.compatibilityScore,
          });
        } else {
          toProcess.push(match);
        }
      }

      const alreadyCompleted = results.length;

      // Apply optional limit on NEW dates to process
      let candidateQueue = toProcess;
      if (typeof options.limit === 'number' && options.limit > 0) {
        candidateQueue = toProcess.slice(0, options.limit);
      }

      console.log(
        `[ChallengeDating] Total: ${totalCandidates}, Already Completed: ${alreadyCompleted}, Queue to run: ${candidateQueue.length}`
      );

      let successfulCount = 0;
      let failedCount = 0;

      // Helper to execute a single directed agent speed date
      const executeOneDate = async (match: (typeof targetCandidates)[0]) => {
        try {
          console.log(`[ChallengeDating] Launching date: ${match.personId} -> ${match.candidateId}`);

          // Reuses the existing Phase 4 agent dating pipeline
          const session = await AgentDatingService.startDatingSession(match.personId, match.candidateId);

          if (!session || !session.compatibility) {
            throw new Error('Agent dating session finished without a valid compatibility evaluation.');
          }

          // Persist directed compatibility evaluation
          const directedEval: DirectedCompatibilityEvaluation = {
            personId: match.personId,
            candidateId: match.candidateId,
            compatibilityScore: session.compatibility.score,
            sharedInterests: session.compatibility.sharedInterests || [],
            strongAlignment: session.compatibility.strongAlignment || [],
            potentialDifferences: session.compatibility.potentialDifferences || [],
            chemistrySummary: session.compatibility.summary || '',
            evidence: session.compatibility.evidence || [],
            datingSessionId: session.id,
            createdAt: session.createdAt || new Date().toISOString(),
          };

          store.saveDirectedEvaluation(directedEval);
          successfulCount++;

          results.push({
            personId: match.personId,
            candidateId: match.candidateId,
            candidateName: match.candidateName,
            status: 'completed',
            datingSessionId: session.id,
            compatibilityScore: session.compatibility.score,
          });
        } catch (err: any) {
          failedCount++;
          const errMsg = err?.message || String(err);
          console.error(`[ChallengeDating] Date failed for ${match.personId} -> ${match.candidateId}:`, errMsg);

          results.push({
            personId: match.personId,
            candidateId: match.candidateId,
            candidateName: match.candidateName,
            status: 'failed',
            error: errMsg,
          });
        }
      };

      // Process with controlled concurrency = 2
      const CONCURRENCY = 2;
      for (let i = 0; i < candidateQueue.length; i += CONCURRENCY) {
        const batch = candidateQueue.slice(i, i + CONCURRENCY);
        console.log(`[ChallengeDating] Processing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(candidateQueue.length / CONCURRENCY)}...`);
        await Promise.all(batch.map((match) => executeOneDate(match)));
      }

      return {
        totalCandidates,
        alreadyCompleted,
        processed: candidateQueue.length,
        successful: successfulCount,
        failed: failedCount,
        results,
      };
    } finally {
      this.isRunning = false;
    }
  }
}
