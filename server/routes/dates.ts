import { Router, Request, Response } from 'express';
import { DatesService } from '../services/dates.service';
import { PeopleService } from '../services/people.service';
import { store } from '../data/store';

const router = Router();

/**
 * GET /api/date/completed
 * Returns all completed date sessions
 */
router.get('/completed', (_req: Request, res: Response) => {
  const completed = store.getAllDateSessions();
  res.json({
    count: completed.length,
    data: completed,
  });
});

/**
 * GET /api/date/:personA/:personB
 * Returns date session state and directed compatibility evaluation between personA and personB
 */
router.get('/:personA/:personB', (req: Request, res: Response) => {
  const { personA, personB } = req.params;
  
  const personAData = PeopleService.getPersonById(personA);
  const personBData = PeopleService.getPersonById(personB);

  const directedEvaluation = store.getDirectedEvaluation(personA, personB);
  let session = DatesService.getDateSession(personA, personB);

  if (!session && directedEvaluation?.datingSessionId) {
    session = store.getDateSessionById(directedEvaluation.datingSessionId) || null;
  }

  res.json({
    data: {
      personA: personAData || { id: personA },
      personB: personBData || { id: personB },
      directedEvaluation: directedEvaluation || null,
      session: session || {
        id: `session-${personA}-${personB}`,
        personAId: personA,
        personBId: personB,
        status: 'pending',
        conversation: [],
      },
    },
  });
});

export default router;
