import { Router, Request, Response } from 'express';
import { store } from '../data/store';

const router = Router();

/**
 * GET /api/health
 * Returns server and persistence health status
 */
router.get('/', (_req: Request, res: Response) => {
  const fStatus = store.getFirestoreStatus();
  res.json({
    status: 'ok',
    persistenceMode: process.env.PERSISTENCE_MODE || 'json',
    firestore: {
      initialized: fStatus.isFirestoreMode,
      active: fStatus.active,
    }
  });
});

export default router;
