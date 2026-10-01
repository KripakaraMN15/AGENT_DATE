import { Router, Request, Response } from 'express';
import { MatchingService } from '../services/matchingService';
import { store } from '../data/store';

const router = Router();

/**
 * POST /api/matching/generate
 * Evaluates pairwise candidate matches for all people with grounded intelligence
 */
router.post('/generate', (_req: Request, res: Response) => {
  try {
    const summary = MatchingService.generateAllCandidateMatches();
    res.json({
      message: 'Candidate matching evaluation generated successfully.',
      ...summary,
    });
  } catch (error: any) {
    console.error('[POST /api/matching/generate] Error:', error);
    res.status(500).json({
      error: 'Failed to generate candidate matches.',
      details: error?.message || String(error),
    });
  }
});

/**
 * GET /api/matching/candidates/:personId
 * Returns top candidate matches for a specific person
 */
router.get('/candidates/:personId', (req: Request, res: Response) => {
  const { personId } = req.params;
  const candidates = MatchingService.getCandidatesForPerson(personId);
  const person = store.getPersonById(personId);

  res.json({
    personId,
    personName: person?.name || personId,
    candidates,
    count: candidates.length,
  });
});

/**
 * GET /api/matching/all
 * Returns all generated candidate matches
 */
router.get('/all', (_req: Request, res: Response) => {
  const allCandidates = store.getAllCandidates();
  res.json({
    data: allCandidates,
    count: allCandidates.length,
  });
});

export default router;
