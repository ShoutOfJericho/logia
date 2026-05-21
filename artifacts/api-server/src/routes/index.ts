import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lexiconRouter from "./lexicon";
import passagesRouter from "./passages";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lexiconRouter);
router.use(passagesRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);

export default router;
