import { store, DateSession } from '../data/store';

export class DatesService {
  static getDateSession(personAId: string, personBId: string): DateSession | null {
    return store.getDateSession(personAId, personBId) || null;
  }

  static createOrGetSession(personAId: string, personBId: string): DateSession {
    const existing = store.getDateSession(personAId, personBId);
    if (existing) return existing;

    const personA = store.getPersonById(personAId);
    const personB = store.getPersonById(personBId);

    const newSession: DateSession = {
      id: `session-${personAId}-${personBId}`,
      personAId,
      personBId,
      personA: {
        id: personAId,
        name: personA?.name || personAId,
      },
      personB: {
        id: personBId,
        name: personB?.name || personBId,
      },
      status: 'pending',
      conversation: [],
      compatibility: {
        score: 75,
        sharedInterests: [],
        strongAlignment: [],
        potentialDifferences: [],
        summary: 'Pending agent dating session.',
        evidence: [],
      },
      createdAt: new Date().toISOString(),
    };
    return store.saveDateSession(newSession);
  }
}
