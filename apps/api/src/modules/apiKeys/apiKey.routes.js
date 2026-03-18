import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import * as controller from "./apiKey.controller.js";
import * as validation from "./apiKey.validation.js";

export const createApiKeyRoutes = () => {
  const router = Router();
  router.use(authenticate());

  router.get("/", validate(validation.listApiKeysSchema), controller.listApiKeys);
  router.post("/", validate(validation.createApiKeySchema), controller.createApiKey);
  router.patch("/:id", validate(validation.updateApiKeySchema), controller.updateApiKey);
  router.delete("/:id", validate(validation.deleteApiKeySchema), controller.deleteApiKey);

  return router;
};
