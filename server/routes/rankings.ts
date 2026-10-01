import { Router, Request, Response } from 'express';
import { RankingService } from '../services/rankingService';
import { store } from '../data/store';

const router = Router();

/**
 * GET /api/rankings
 * Returns final agent dating rankings for all people
 */
router.get('/', (_req: Request, res: Response) => {
  const allRankings = RankingService.getAllRankings();
  const legacyRankings = store.getRankings();

  res.json({
    count: allRankings.length,
    data: allRankings,
    legacyRankings,
  });
});

/**
 * GET /api/rankings/:personId
 * Returns final agent dating rankings for a specific person
 */
router.get('/:personId', (req: Request, res: Response) => {
  const { personId } = req.params;
  const personRanking = RankingService.getRankingsForPerson(personId);

  res.json(personRanking);
});

export default router;
