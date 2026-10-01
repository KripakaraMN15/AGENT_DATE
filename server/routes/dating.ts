import { Router, Request, Response } from 'express';
import { AgentDatingService } from '../services/agentDating';
import { ChallengeDatingService } from '../services/challengeDating';
import { store } from '../data/store';

const router = Router();

/**
 * POST /api/dating/run-candidates
 * Runs autonomous agent speed dates for candidate matches.
 * Supports optional personId and optional limit.
 * Concurrency controlled at 2. Resumable.
 */
router.post('/run-candidates', async (req: Request, res: Response) => {
  try {
    const { personId, limit } = req.body || {};
    const parsedLimit = typeof limit === 'number' ? limit : undefined;

    console.log(`[POST /api/dating/run-candidates] Invoked with personId: ${personId || 'ALL'}, limit: ${limit ?? 'UNLIMITED'}`);

    const result = await ChallengeDatingService.runCandidateDates({
      personId: typeof personId === 'string' && personId.trim() ? personId.trim() : undefined,
      limit: parsedLimit,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[POST /api/dating/run-candidates] Error:', error);
    res.status(500).json({
      error: 'Failed to run candidate dates.',
      details: error?.message || String(error),
    });
  }
});

/**
 * POST /api/dating/start
 * Initiates an agent-to-agent speed dating session between Person A and Person B
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { personAId = '', personBId = '' } = req.body || {};

    if (!personAId || !personBId) {
      res.status(400).json({
        error: 'Validation failed: Both personAId and personBId are required.',
      });
      return;
    }

    if (personAId === personBId) {
      res.status(400).json({
        error: 'Validation failed: Person A and Person B cannot be the same person.',
      });
      return;
    }

    const personA = store.getPersonById(personAId);
    const personB = store.getPersonById(personBId);

    if (!personA) {
      res.status(404).json({ error: `Person A not found (ID: ${personAId})`, id: personAId });
      return;
    }

    if (!personB) {
      res.status(404).json({ error: `Person B not found (ID: ${personBId})`, id: personBId });
      return;
    }

    console.log(`[POST /api/dating/start] Initiating agent date between ${personA.name} and ${personB.name}`);

    const session = await AgentDatingService.startDatingSession(personAId, personBId);

    res.json(session);
  } catch (error: any) {
    console.error('[POST /api/dating/start] Error during agent dating session:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during the agent dating session.',
      details: error?.message || String(error),
    });
  }
});

/**
 * GET /api/dating/:id
 * Retrieves a completed dating session by session ID or person pair ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  let session = store.getDateSessionById(id);

  // Fallback: If id is formatted as personAId::personBId or personAId-personBId
  if (!session && id.includes('-')) {
    const parts = id.split('-');
    if (parts.length >= 2) {
      session = store.getDateSession(parts[0], parts[1]);
    }
  }

  if (!session) {
    res.status(404).json({ error: `Date session not found (ID: ${id})`, id });
    return;
  }

  res.json(session);
});

export default router;
