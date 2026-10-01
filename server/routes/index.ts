import { Router } from 'express';
import healthRouter from './health';
import peopleRouter from './people';
import datesRouter from './dates';
import datingRouter from './dating';
import rankingsRouter from './rankings';
import matchingRouter from './matching';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/people', peopleRouter);
apiRouter.use('/date', datesRouter);
apiRouter.use('/dating', datingRouter);
apiRouter.use('/rankings', rankingsRouter);
apiRouter.use('/matching', matchingRouter);

export default apiRouter;
