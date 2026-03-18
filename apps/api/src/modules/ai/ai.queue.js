import { Queue, Worker } from "bullmq";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import { AI_JOB_QUEUES } from "./ai.model.js";
import { analyzeProjectRisk, analyzeBurnoutRisk } from "./ai.risk.js";
import { forecastCompletion, forecastCapacity, forecastRevenue } from "./ai.forecast.js";
import { analyzeSecuritySignals, detectDashboardAnomalies } from "./ai.security.js";
import { generateSummary } from "./ai.summary.js";
import { analyzeReportAgainstGoals, getDSRSuggestions, getGoalProgressAnalysis, getPeriodGoalAnalysis } from "../goalAnalysis/goalAnalysis.service.js";
import { listPendingGoals } from "../workGoals/workGoal.service.js";
import WorkReport from "#db/models/WorkReport.model.js";

const buildQueue = (name) =>
  new Queue(name, {
    connection: redisConfig.bullmqConnection
  });

export const aiQueues = Object.freeze({
  riskAnalysis: buildQueue(AI_JOB_QUEUES.riskAnalysis),
  summary: buildQueue(AI_JOB_QUEUES.summary),
  forecast: buildQueue(AI_JOB_QUEUES.forecast),
  suggestion: buildQueue(AI_JOB_QUEUES.suggestion),
  analysis: buildQueue(AI_JOB_QUEUES.analysis),
  securityMonitor: buildQueue(AI_JOB_QUEUES.securityMonitor)
});

export async function enqueueAIJob(queueName, payload, opts = {}) {
  const queue = Object.values(aiQueues).find((q) => q.name === queueName);
  if (!queue) throw new Error(`Unknown AI queue: ${queueName}`);

  const job = await queue.add(queueName, payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
    ...opts
  });

  logger.info({ jobId: job.id, queue: queueName }, "AI job enqueued");
  return job.id;
}

export async function enqueueAISuggestionJob(payload, opts = {}) {
  return enqueueAIJob(AI_JOB_QUEUES.suggestion, payload, opts);
}

export async function enqueueAIAnalysisJob(payload, opts = {}) {
  return enqueueAIJob(AI_JOB_QUEUES.analysis, payload, opts);
}

const createWorker = (name, processor) => {
  const worker = new Worker(
    name,
    async (job) => {
      logger.info({ jobId: job.id, queue: name }, "AI job started");
      const result = await processor(job);
      logger.info({ jobId: job.id, queue: name }, "AI job completed");
      return result;
    },
    {
      connection: redisConfig.bullmqConnection,
      concurrency: 5
    }
  );

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, queue: name, error: error.message }, "AI job failed");
  });

  return worker;
};

export function startAIWorkers() {
  const workers = [];

  workers.push(
    createWorker(AI_JOB_QUEUES.riskAnalysis, async (job) => {
      const { tenantId, projectId, userId, type } = job.data;
      if (type === "burnout") {
        return analyzeBurnoutRisk({ tenantId, userId });
      }
      return analyzeProjectRisk({ tenantId, projectId, userId });
    })
  );

  workers.push(
    createWorker(AI_JOB_QUEUES.summary, async (job) => {
      const { tenantId, userId, entityType, entityId, data } = job.data;
      return generateSummary({ tenantId, userId, entityType, entityId, data });
    })
  );

  workers.push(
    createWorker(AI_JOB_QUEUES.forecast, async (job) => {
      const { tenantId, userId, type } = job.data;
      if (type === "capacity") return forecastCapacity({ tenantId, userId });
      if (type === "revenue") return forecastRevenue({ tenantId, userId });
      return forecastCompletion({ tenantId, userId });
    })
  );

  workers.push(
    createWorker(AI_JOB_QUEUES.securityMonitor, async (job) => {
      const { tenantId, userId, type } = job.data;
      if (type === "dashboard") {
        return detectDashboardAnomalies({ tenantId, userId, metricKey: job.data.metricKey });
      }
      return analyzeSecuritySignals({ tenantId, userId });
    })
  );

  workers.push(
    createWorker(AI_JOB_QUEUES.suggestion, async (job) => {
      const { tenantId, userId, employeeMemberId, type, date } = job.data;
      if (type === "dsr-suggestion") {
        return getDSRSuggestions({ tenantId, userId, employeeMemberId, date: date ? new Date(date) : new Date() });
      }
      if (type === "goal-pending") {
        return listPendingGoals({ tenantId, employeeMemberId });
      }
      return { status: "skipped", reason: "unknown_suggestion_type" };
    })
  );

  workers.push(
    createWorker(AI_JOB_QUEUES.analysis, async (job) => {
      const { tenantId, reportId, reportType, employeeMemberId, periodStart, periodEnd, type } = job.data;
      if (type === "report-analysis") {
        const analysis = await analyzeReportAgainstGoals({ tenantId, reportId });
        await WorkReport.updateOne(
          { _id: reportId, tenantId },
          { $set: { aiAnalysisSnapshot: analysis.summary, updatedAt: new Date() } }
        );
        return analysis;
      }
      if (["weekly-analysis", "monthly-analysis", "quarterly-analysis", "yearly-analysis"].includes(type)) {
        return getPeriodGoalAnalysis({
          tenantId,
          employeeMemberId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          reportType,
        });
      }
      if (type === "goal-progress-analysis") {
        return getGoalProgressAnalysis({ tenantId, goalId: job.data.goalId });
      }
      return { status: "skipped", reason: "unknown_analysis_type" };
    })
  );

  logger.info("AI workers started");
  return workers;
}
