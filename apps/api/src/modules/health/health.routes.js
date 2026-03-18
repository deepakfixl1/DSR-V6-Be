import { Router } from "express";

export const createHealthRoutes = ({ healthController }) => {
  const router = Router();

  router.get("/live", healthController.live);
  router.get("/ready", healthController.ready);

  return router;
};
