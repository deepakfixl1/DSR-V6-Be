import { Router } from "express";
import templateRoutes from "./reportTemplate.routes.js";
import scheduleRoutes from "./reportSchedule.routes.js";
import runRoutes from "./reportRun.routes.js";

const router = Router();

// Mount sub-routes
router.use("/templates", templateRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/", runRoutes);

export default router;
