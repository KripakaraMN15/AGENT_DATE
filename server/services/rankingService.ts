import { store, DirectedCompatibilityEvaluation, EvidenceItem } from '../data/store';

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

export class RankingService {
  /**
   * Retrieves final rankings for a specific person based on completed directed dating evaluations
   */
  public static getRankingsForPerson(personId: string): PersonFinalRanking {
    const person = store.getPersonById(personId);
    const personName = person?.name || personId;

    const evaluations = store.getDirectedEvaluationsForPerson(personId);

    // Sort by compatibilityScore descending
    evaluations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const rankings: FinalRankingEntry[] = evaluations.map((evalItem, index) => {
      const candidate = store.getPersonById(evalItem.candidateId);

      return {
        rank: index + 1,
        personId: evalItem.personId,
        candidateId: evalItem.candidateId,
        candidateName: candidate?.name || evalItem.candidateId,
        candidateAvatar: candidate?.avatarUrl,
        candidateHeadline: candidate?.headline,
        compatibilityScore: evalItem.compatibilityScore,
        sharedInterests: evalItem.sharedInterests || [],
        strongAlignment: evalItem.strongAlignment || [],
        potentialDifferences: evalItem.potentialDifferences || [],
        chemistrySummary: evalItem.chemistrySummary || '',
        datingSessionId: evalItem.datingSessionId,
        evidence: evalItem.evidence || [],
        createdAt: evalItem.createdAt,
      };
    });

    return {
      personId,
      personName,
      rankings,
    };
  }

  /**
   * Retrieves final rankings for all people in the store
   */
  public static getAllRankings(): PersonFinalRanking[] {
    const allPeople = store.getAllPeople();
    return allPeople.map((p) => this.getRankingsForPerson(p.id));
  }
}
