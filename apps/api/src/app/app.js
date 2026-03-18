import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "#api/config/env.js";
import { requestLoggerMiddleware } from "#api/utils/logger.js";
import { createContainer } from "#api/app/container.js";
import { createRoutes } from "#api/routes/index.js";
import { createBillingWebhookRoutes } from "#api/modules/billing/billing.webhook.routes.js";
import { notFoundMiddleware } from "#api/middlewares/notFound.middleware.js";
import { errorMiddleware } from "#api/middlewares/error.middleware.js";
import { createRateLimiter } from "#api/middlewares/rateLimit.middleware.js";
import { sanitizeInput } from "#api/middlewares/sanitize.middleware.js";

export const buildApp = () => {
  const app = express();
  const container = createContainer();

  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(createRateLimiter());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use("/billing/webhook", createBillingWebhookRoutes());
  app.use(express.json());
  app.use(sanitizeInput());

  app.use(createRoutes(container));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export const app = buildApp();
