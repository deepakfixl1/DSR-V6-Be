import { Worker } from "bullmq";
import { config } from "#api/config/env.js";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import { EMAIL_JOB_NAME, EMAIL_QUEUE_NAME } from "#infra/queue/email.queue.js";
import { sendEmail, verifyEmailTransport } from "#infra/email/provider.js";

const worker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    if (job.name !== EMAIL_JOB_NAME) {
      logger.warn({ jobId: job.id, jobName: job.name }, "Skipping unsupported email job");
      return { skipped: true };
    }

    const { to, subject, html, text } = job.data;
    await sendEmail({ to, subject, html, text });
    return { delivered: true };
  },
  {
    connection: redisConfig.bullmqConnection,
    concurrency: config.queue.concurrency
  }
);

worker.on("ready", () => {
  logger.info({ concurrency: config.queue.concurrency }, "Email worker ready");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Email job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Email job failed");
});

const shutdown = async (signal) => {
  logger.info({ signal }, "Email worker shutting down");
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

verifyEmailTransport().catch((error) => {
  logger.error({ err: error }, "SMTP transport verification failed for worker");
  process.exit(1);
});
