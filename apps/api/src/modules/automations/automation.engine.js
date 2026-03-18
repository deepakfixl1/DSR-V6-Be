/**
 * Automation Engine — Listens to eventBus events, finds matching active rules,
 * evaluates conditions, executes actions, and logs results.
 */

import mongoose from "mongoose";
import { AutomationRule, AutomationRuleLog } from "#db/models/index.js";
import { onEvent } from "#api/modules/events/eventBus.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
import { enqueueEmail } from "#infra/queue/email.queue.js";
import { logger } from "#api/utils/logger.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

// All trigger events the engine listens to
const TRIGGER_EVENTS = [
  "goal.created",
  "goal.updated",
  "goal.deleted",
  "goal.completed",
  "goal.status_changed",
  "report.submitted",
  "report.approved",
  "report.rejected",
  "blocker.created",
  "blocker.escalated",
  "blocker.resolved",
  "member.joined",
  "member.removed",
];

// ─── Condition Evaluator ─────────────────────────────────────────────────────

export function evaluateConditions(conditions, payload) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((cond) => {
    const fieldValue = getNestedValue(payload, cond.field);
    switch (cond.operator) {
      case "eq":
        return fieldValue === cond.value;
      case "neq":
        return fieldValue !== cond.value;
      case "in":
        return Array.isArray(cond.value) ? cond.value.includes(fieldValue) : false;
      case "contains":
        return typeof fieldValue === "string" && fieldValue.includes(String(cond.value));
      case "gt":
        return typeof fieldValue === "number" && fieldValue > Number(cond.value);
      case "lt":
        return typeof fieldValue === "number" && fieldValue < Number(cond.value);
      case "exists":
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  });
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

// ─── Action Executors ────────────────────────────────────────────────────────

async function executeSendEmail(config, eventPayload, tenantId) {
  const to = config.to || "admin";
  const subject = interpolateTemplate(config.subject || "Automation Notification", eventPayload);
  const body = interpolateTemplate(config.body || "An automation rule was triggered.", eventPayload);

  try {
    await enqueueEmail({ to, subject, html: `<p>${body}</p>` });
    return { status: "success" };
  } catch (err) {
    // Email queue might not be available (Redis down)
    logger.warn({ err }, "Automation: send_email failed — email queue may be unavailable");
    return { status: "failed", error: err.message };
  }
}

async function executeSendNotification(config, eventPayload, tenantId) {
  try {
    await createNotification({
      userId: null,
      tenantId: toObjectId(tenantId),
      scope: "tenant",
      type: "automation",
      title: interpolateTemplate(config.title || "Automation Triggered", eventPayload),
      body: interpolateTemplate(config.body || "", eventPayload),
      priority: config.priority || "normal",
      payload: { automationTriggered: true, event: eventPayload },
    });
    return { status: "success" };
  } catch (err) {
    logger.warn({ err }, "Automation: send_notification failed");
    return { status: "failed", error: err.message };
  }
}

async function executeCreateAuditEntry(config, eventPayload, tenantId) {
  try {
    await recordAudit({
      tenantId,
      actorId: null,
      entityType: "automation",
      entityId: null,
      action: config.action || "automation.triggered",
      after: eventPayload,
      meta: { source: "automation_engine" },
    });
    return { status: "success" };
  } catch (err) {
    logger.warn({ err }, "Automation: create_audit_entry failed");
    return { status: "failed", error: err.message };
  }
}

async function executeWebhook(config, eventPayload, tenantId) {
  try {
    const url = config.url;
    if (!url) throw new Error("Webhook URL is required");

    const method = (config.method || "POST").toUpperCase();
    const headers = { "Content-Type": "application/json", ...(config.headers ?? {}) };
    const bodyTemplate = config.bodyTemplate || JSON.stringify(eventPayload);
    const body = interpolateTemplate(bodyTemplate, eventPayload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method,
      headers,
      ...(method !== "GET" ? { body } : {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }
    return { status: "success" };
  } catch (err) {
    logger.warn({ err, url: config.url }, "Automation: webhook failed");
    return { status: "failed", error: err.message };
  }
}

function interpolateTemplate(template, data) {
  if (!template || typeof template !== "string") return template;
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const val = getNestedValue(data, path);
    return val !== undefined && val !== null ? String(val) : "";
  });
}

// ─── Execute Rule (used by both engine listener and manual run) ──────────────

export async function executeRule(rule, eventPayload, tenantId) {
  const start = Date.now();
  const actionsResults = [];

  for (const action of rule.actions) {
    const actionStart = Date.now();
    let result;

    switch (action.type) {
      case "send_email":
        result = await executeSendEmail(action.config, eventPayload, tenantId);
        break;
      case "send_notification":
        result = await executeSendNotification(action.config, eventPayload, tenantId);
        break;
      case "create_audit_entry":
        result = await executeCreateAuditEntry(action.config, eventPayload, tenantId);
        break;
      case "webhook":
        result = await executeWebhook(action.config, eventPayload, tenantId);
        break;
      default:
        result = { status: "failed", error: `Unknown action type: ${action.type}` };
    }

    actionsResults.push({
      type: action.type,
      status: result.status,
      error: result.error ?? null,
      durationMs: Date.now() - actionStart,
    });
  }

  const totalDuration = Date.now() - start;
  const allSuccess = actionsResults.every((a) => a.status === "success");
  const allFailed = actionsResults.every((a) => a.status === "failed");
  const overallStatus = allSuccess ? "success" : allFailed ? "failed" : "partial";

  // Write execution log
  try {
    await AutomationRuleLog.create({
      tenantId: toObjectId(tenantId),
      ruleId: rule._id,
      ruleName: rule.name,
      trigger: {
        event: rule.trigger?.event ?? "manual",
        payload: eventPayload,
      },
      status: overallStatus,
      actionsExecuted: actionsResults,
      durationMs: totalDuration,
      error: allFailed ? actionsResults[0]?.error : null,
    });
  } catch (err) {
    logger.warn({ err, ruleId: rule._id }, "Failed to write automation rule log");
  }

  // Update rule stats
  try {
    await AutomationRule.updateOne(
      { _id: rule._id },
      {
        $set: { lastRunAt: new Date(), lastRunStatus: overallStatus },
        $inc: { runCount: 1 },
      }
    );
  } catch (err) {
    logger.warn({ err, ruleId: rule._id }, "Failed to update rule stats");
  }

  return {
    ruleId: String(rule._id),
    ruleName: rule.name,
    status: overallStatus,
    actionsExecuted: actionsResults,
    durationMs: totalDuration,
  };
}

// ─── Event Listener Registration ─────────────────────────────────────────────

export function registerAutomationHandlers() {
  for (const eventName of TRIGGER_EVENTS) {
    onEvent(eventName, async (payload) => {
      try {
        const tenantId = payload?.tenantId;
        if (!tenantId) {
          logger.warn({ eventName }, "Automation engine: event missing tenantId — skipping");
          return;
        }

        // Find all active rules matching this trigger event for this tenant
        const rules = await AutomationRule.find({
          tenantId: toObjectId(tenantId),
          status: "active",
          "trigger.event": eventName,
          deletedAt: null,
        }).lean();

        if (rules.length === 0) return;

        for (const rule of rules) {
          try {
            // Evaluate conditions
            if (!evaluateConditions(rule.conditions, payload)) {
              logger.debug({ ruleId: rule._id, eventName }, "Automation: conditions not met — skipping");
              continue;
            }

            // Execute
            await executeRule(rule, payload, tenantId);
          } catch (err) {
            logger.warn({ err, ruleId: rule._id, eventName }, "Automation engine: rule execution failed");
          }
        }
      } catch (err) {
        logger.warn({ err, eventName }, "Automation engine: handler error");
      }
    });
  }

  logger.info({ events: TRIGGER_EVENTS.length }, "Automation engine handlers registered");
}
