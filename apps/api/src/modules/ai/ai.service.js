/**
 * Central AIService. All AI calls MUST go through this service.
 * Handles OpenAI API, token tracking, logging, caching, and governance.
 */

import crypto from "node:crypto";
import { z } from "zod";
import { OPENAI_MODEL, AI_LIMITS } from "./ai.model.js";
import { structuredJSONResponse, tokenEstimator } from "./ai.openai.js";
import { buildPrompt, ensureTenantContext, isDisallowedQuery, redactPIIInObject, sanitizePrompt } from "./ai.rules.js";
import AIExecutionLog from "#db/models/AIExecutionLog.model.js";
import AIUsage from "#db/models/AIUsage.model.js";
import AIInsight from "#db/models/AIInsight.model.js";
import AuditLog from "#db/models/AuditLog.model.js";
import { logger } from "#api/utils/logger.js";
import { config } from "#api/config/env.js";
import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Validates minimum response contract from AI model.
// Example: { status: "ok", data: {}, explanation: "why", reasoning: "how" }
const baseResponseSchema = z.object({
  status: z.string(),
  data: z.any().optional(),
  explanation: z.string(),
  reasoning: z.string(),
  tokensUsed: z.number().optional(),
  modelVersion: z.string().optional()
});

/**
 * Build a JSON schema for AI responses.
 * Example: buildResponseSchema({ type: "object", properties: { summary: { type: "string" }}})
 */
const buildResponseSchema = (dataSchema) => {
  return {
    type: "object",
    properties: {
      status: { type: "string" },
      data: dataSchema || { type: "object" },
      explanation: { type: "string" },
      reasoning: { type: "string" }
    },
    required: ["status", "explanation", "reasoning"]
  };
};

/**
 * Get current month key for usage tracking.
 * Example: "202602"
 */
const getMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
};

/**
 * Hash input payload for cache keying.
 * Example: hashInput({ tenantId, prompt, contextData })
 */
const hashInput = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

/**
 * Track AI usage by tenant/month.
 * Example: trackUsage({ tenantId, userId, type: "report.dsr", tokensUsed: 512 })
 */
const trackUsage = async ({ tenantId, userId, type, feature, tokensUsed }) => {
  const monthKey = getMonthKey();
  const now = new Date();
  try {
    await AIUsage.findOneAndUpdate(
      { tenantId, monthKey },
      {
        $inc: { tokensUsed, requestCount: 1 },
        $set: { userId, type, feature, date: now }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.error("Failed to track AI usage", { error: error.message, tenantId, type });
  }
};

/**
 * Validate cache expiry.
 * Example: isCacheValid({ expiresAt: new Date(Date.now() + 1000) }) -> true
 */
const isCacheValid = (record) => {
  if (!record) return false;
  if (!record.expiresAt) return true;
  return new Date(record.expiresAt).getTime() > Date.now();
};

/**
 * Standard error response.
 * Example: buildDefaultResponse({ status: "error", explanation: "...", reasoning: "..." })
 */
const buildDefaultResponse = ({ status, explanation, reasoning }) => ({
  status,
  data: null,
  explanation,
  reasoning,
  tokensUsed: 0,
  modelVersion: config.ai?.model || OPENAI_MODEL
});

/**
 * Main AI execution method
 * Example:
 * executeAI({
 *   tenantId,
 *   userId,
 *   type: "chat.workspace-assistant",
 *   feature: "ai.assistant",
 *   prompt: "Summarize blockers",
 *   contextData: { tasks: [] },
 *   schema: { type: "object", properties: { status: { type: "string" } } }
 * })
 */
export async function executeAI({
  tenantId,
  userId,
  type,
  feature = null,
  prompt,
  contextData = {},
  schema = null,
  metadata = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  storeInsight = false,
  entityType = null,
  entityId = null,
  force = false
}) {
  const startTime = Date.now();

  if (!tenantId || !userId || !type || !prompt) {
    throw new Error("Missing required parameters: tenantId, userId, type, prompt");
  }
  const sanitizedPrompt = sanitizePrompt(prompt);

  /**
   * Log early exits (refused/insufficient_data) for governance traceability.
   * Example: logEarlyReturn({ status: "refused", explanation: "...", reasoning: "..." })
   */
  const logEarlyReturn = async ({ status, explanation, reasoning }) => {
    await AIExecutionLog.create({
      tenantId,
      userId,
      type,
      feature,
      inputHash: null,
      prompt: sanitizedPrompt,
      responseText: null,
      responseJson: { status, data: null, explanation, reasoning },
      model: config.ai?.model || OPENAI_MODEL,
      status: "failed",
      tokensUsed: 0,
      durationMs: 0,
      latency: 0,
      metadata
    });
  };
  if (isDisallowedQuery(sanitizedPrompt)) {
    const response = buildDefaultResponse({
      status: "refused",
      explanation: "Query outside allowed enterprise scope",
      reasoning: "Request matched a disallowed category"
    });
    await logEarlyReturn(response);
    return response;
  }

  const contextCheck = ensureTenantContext({ contextData });
  if (!contextCheck.allowed) {
    const response = buildDefaultResponse({
      status: "insufficient_data",
      explanation: "Tenant context data is required",
      reasoning: "No structured tenant data provided"
    });
    await logEarlyReturn(response);
    return response;
  }

  const inputHash = hashInput({
    tenantId,
    userId,
    type,
    feature,
    prompt: sanitizedPrompt,
    contextData,
    schema
  });

  if (!force) {
    const cachedExecution = await AIExecutionLog.findOne({
      tenantId,
      inputHash,
      feature,
      status: "success"
    })
      .sort({ createdAt: -1 })
      .lean();

    if (cachedExecution && isCacheValid(cachedExecution)) {
      await AIExecutionLog.create({
        tenantId,
        userId,
        type,
        feature,
        inputHash,
        prompt: sanitizedPrompt,
        responseText: cachedExecution.responseText,
        responseJson: cachedExecution.responseJson,
        model: cachedExecution.model,
        status: "cached",
        tokensUsed: 0,
        durationMs: 0,
        latency: 0,
        metadata
      });

      return {
        success: true,
        status: "cached",
        data: cachedExecution.responseJson || cachedExecution.responseText,
        explanation: "Cached response",
        reasoning: "Input hash matched cached execution",
        tokensUsed: 0,
        modelVersion: cachedExecution.model || config.ai?.model || OPENAI_MODEL,
        executionLogId: cachedExecution._id,
        inputHash
      };
    }

    if (storeInsight) {
      const cachedInsight = await AIInsight.findOne({
        tenantId,
        inputHash,
        type
      })
        .sort({ createdAt: -1 })
        .lean();

      if (cachedInsight && isCacheValid(cachedInsight)) {
        return {
          success: true,
          status: "cached",
          data: cachedInsight.data || cachedInsight.insight,
          explanation: cachedInsight.explanation || "Cached insight",
          reasoning: "Input hash matched cached insight",
          tokensUsed: cachedInsight.tokensUsed || 0,
          modelVersion: cachedInsight.modelVersion || config.ai?.model || OPENAI_MODEL,
          executionLogId: null,
          inputHash
        };
      }
    }
  }

  const fullPrompt = buildPrompt({ query: sanitizedPrompt, contextData });
  const responseSchema = buildResponseSchema(schema);

  let responseJson = null;
  let tokensUsed = 0;
  let status = "success";
  let errorMessage = null;
  let responseText = null;
  let attempts = 0;

  while (attempts < 2 && !responseJson) {
    try {
      const result = await structuredJSONResponse({
        prompt: fullPrompt,
        schema: responseSchema
      });
      responseJson = result.data;
      tokensUsed = result.usageMetadata?.totalTokenCount || tokenEstimator(fullPrompt);
      if (tokensUsed > AI_LIMITS.maxTokensPerRequest) {
        throw new Error("Token limit exceeded");
      }
      responseText = JSON.stringify(responseJson);
      baseResponseSchema.parse(responseJson);
    } catch (error) {
      attempts += 1;
      if (attempts >= 2) {
        status = "failed";
        errorMessage = error.message;
      }
    }
  }

  const durationMs = Date.now() - startTime;

  const redacted = responseJson ? redactPIIInObject(responseJson) : null;

  const executionLog = await AIExecutionLog.create({
    tenantId,
    userId,
    type,
    feature,
    inputHash,
    prompt: sanitizedPrompt,
    responseText: responseText,
    responseJson: redacted,
    model: config.ai?.model || OPENAI_MODEL,
    status: status === "success" ? "success" : "failed",
    tokensUsed: tokensUsed || 0,
    durationMs,
    latency: durationMs,
    metadata,
    explainability: metadata.explainability || {},
    error: errorMessage,
    expiresAt: cacheTtlMs ? new Date(Date.now() + cacheTtlMs) : null
  });

  await trackUsage({ tenantId, userId, type, feature, tokensUsed: tokensUsed || 0 });

  await AuditLog.create({
    tenantId,
    userId,
    action: "ai.request",
    resourceType: "ai",
    resourceId: executionLog._id,
    diff: { type, feature, status }
  });

  if (status === "failed") {
    logger.error("AI execution failed", { type, error: errorMessage });
    return buildDefaultResponse({
      status: "error",
      explanation: "AI execution failed",
      reasoning: errorMessage || "Unknown error"
    });
  }

  if (storeInsight) {
    await AIInsight.create({
      tenantId,
      userId,
      entityType,
      entityId,
      type,
      inputHash,
      data: redacted,
      insight: redacted,
      tokensUsed: tokensUsed || 0,
      explanation: redacted?.explanation || null,
      modelVersion: config.ai?.model || OPENAI_MODEL,
      createdByAI: true,
      expiresAt: cacheTtlMs ? new Date(Date.now() + cacheTtlMs) : null,
      metadata
    });
  }

  return {
    success: true,
    status: redacted?.status || "ok",
    data: redacted?.data ?? redacted,
    explanation: redacted?.explanation || "AI response",
    reasoning: redacted?.reasoning || "Generated using tenant data",
    tokensUsed: tokensUsed || 0,
    modelVersion: config.ai?.model || OPENAI_MODEL,
    executionLogId: executionLog._id,
    inputHash
  };
}

/**
 * Check if tenant has exceeded AI quota
 * Example: checkAIQuota(tenantId, { maxAITokensPerMonth: 10000 })
 */
export async function checkAIQuota(tenantId, planLimits) {
  const monthKey = getMonthKey();
  const maxTokens = planLimits?.maxAITokensPerMonth ?? 0;

  const usage = await AIUsage.findOne({ tenantId, monthKey });

  if (!usage) {
    return { allowed: true, remaining: maxTokens };
  }

  const remaining = maxTokens - usage.tokensUsed;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    used: usage.tokensUsed
  };
}
