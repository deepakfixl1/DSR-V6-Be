/**
 * Report Reminder Scheduler.
 * Runs on a periodic interval to:
 *  1. Send in-app + email reminders before report deadlines (based on ReportPenaltyPolicy.reminders).
 *  2. After deadline + grace period, auto-create ReportPenaltyLog if autoApplyPenalty=true.
 *
 * Designed to be called from the report.worker.js on a 60-second interval.
 */

import mongoose from "mongoose";
import { ReportPenaltyPolicy, ReportPenaltyLog, WorkReport, TenantMembership, User } from "#db/models/index.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
import { enqueueReportDueReminderEmail, enqueuePenaltyAppliedEmail } from "#infra/queue/email.queue.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { config } from "#api/config/env.js";
import { logger } from "#api/utils/logger.js";

const LOCK_TTL = 55; // seconds — slightly under 60s interval
const env = config.app.env;
const ENV_SHORT = { development: "dev", dev: "dev", test: "stg", production: "prod", prod: "prod" };
const normalizeEnv = (e) => ENV_SHORT[(e || "").toLowerCase()] || "dev";

const reminderLockKey = () =>
  `${normalizeEnv(env)}:lock:_:reminder-scheduler:main`;

const reminderSentKey = (workReportId, minutesBefore) =>
  `${normalizeEnv(env)}:reminder:sent:${workReportId}:${minutesBefore}`;

const penaltyCreatedKey = (workReportId) =>
  `${normalizeEnv(env)}:penalty:auto:${workReportId}`;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolves employee User + TenantMembership from a WorkReport.
 * Returns null if any lookup fails.
 */
async function resolveEmployee(report) {
  const membership = await TenantMembership.findById(report.employeeMemberId)
    .select("userId tenantId")
    .lean();
  if (!membership) return null;

  const user = await User.findById(membership.userId)
    .select("name email")
    .lean();
  if (!user) return null;

  return { membership, user };
}

/**
 * Builds a frontend submit link for the given report.
 */
function buildSubmitLink(report) {
  const base = config.app.frontendUrl || "http://localhost:5175";
  return `${base}/work-reports/${report._id}`;
}

// ── Main scheduler ─────────────────────────────────────────────────────────

export async function processReminderSchedule() {
  const redis = getRedisClient();
  const now = new Date();

  // Acquire global distributed lock — skip if already running
  const lockAcquired = await redis.set(reminderLockKey(), "locked", {
    NX: true,
    EX: LOCK_TTL
  });
  if (!lockAcquired) {
    logger.debug("Reminder scheduler lock held, skipping tick");
    return;
  }

  try {
    logger.info("Report reminder scheduler tick started");

    // Load all active penalty policies
    const policies = await ReportPenaltyPolicy.find({ status: "active" }).lean();
    if (!policies.length) return;

    // Group policies by tenantId + reportType for efficient lookup
    const policyMap = new Map();
    for (const policy of policies) {
      const key = `${policy.tenantId}:${policy.reportType}`;
      // If multiple policies per type, use first active one found
      if (!policyMap.has(key)) policyMap.set(key, policy);
    }

    // Find WorkReports that are still DRAFT and have a submissionDeadline set
    // Window: up to 24 hours in future (for reminders) or up to 24 hours in past (for penalties)
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const draftReports = await WorkReport.find({
      status: "DRAFT",
      submissionDeadline: { $gte: windowStart, $lte: windowEnd }
    })
      .select("_id tenantId employeeMemberId reportType submissionDeadline")
      .lean();

    logger.info({ count: draftReports.length }, "Draft reports in reminder window");

    for (const report of draftReports) {
      const policyKey = `${report.tenantId}:${report.reportType}`;
      const policy = policyMap.get(policyKey);
      if (!policy) continue;

      const deadline = new Date(report.submissionDeadline);
      const minutesToDeadline = (deadline.getTime() - now.getTime()) / (60 * 1000);

      // ── 1. Send reminder notifications ────────────────────────────────
      if (minutesToDeadline > 0 && policy.reminders?.length) {
        for (const reminder of policy.reminders) {
          const { minutesBefore, channels = ["IN_APP", "EMAIL"] } = reminder;

          // Fire if we're within [minutesBefore - 1, minutesBefore + 1] minutes of the deadline
          if (Math.abs(minutesToDeadline - minutesBefore) > 1.5) continue;

          // Check Redis dedup key (TTL = minutesBefore * 2 minutes)
          const dedupKey = reminderSentKey(String(report._id), minutesBefore);
          const alreadySent = await redis.exists(dedupKey);
          if (alreadySent) continue;

          const employee = await resolveEmployee(report);
          if (!employee) continue;

          const submitLink = buildSubmitLink(report);
          const deadlineStr = deadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

          // In-app notification
          if (channels.includes("IN_APP")) {
            await createNotification({
              userId: employee.membership.userId,
              memberId: employee.membership._id,
              tenantId: report.tenantId,
              scope: "user",
              type: "REPORT_DUE_REMINDER",
              title: `${report.reportType} Report Due Soon`,
              body: `Your ${report.reportType} report is due in ~${minutesBefore} minutes (${deadlineStr}).`,
              link: submitLink,
              priority: minutesBefore <= 30 ? "high" : "normal",
              payload: { reportId: String(report._id), reportType: report.reportType, minutesBefore }
            }).catch((err) => logger.warn({ err }, "Failed to create in-app reminder notification"));
          }

          // Email notification
          if (channels.includes("EMAIL") && employee.user.email) {
            await enqueueReportDueReminderEmail({
              to: employee.user.email,
              employeeName: employee.user.name,
              reportType: report.reportType,
              deadlineTime: deadlineStr,
              submitLink
            }).catch((err) => logger.warn({ err }, "Failed to enqueue reminder email"));
          }

          // Mark as sent (expire after 2 * minutesBefore minutes so it doesn't repeat)
          await redis.set(dedupKey, "1", { EX: Math.max(120, minutesBefore * 2 * 60) });
          logger.info(
            { reportId: report._id, reportType: report.reportType, minutesBefore },
            "Sent report due reminder"
          );
        }
      }

      // ── 2. Auto-apply penalty after deadline + grace period ───────────
      if (minutesToDeadline < 0 && policy.autoApplyPenalty && policy.penaltyType !== "none") {
        const gracePassed =
          Math.abs(minutesToDeadline) >= (policy.gracePeriodMinutes || 0);
        if (!gracePassed) continue;

        // Dedup — only create one penalty log per report
        const penaltyKey = penaltyCreatedKey(String(report._id));
        const alreadyCreated = await redis.exists(penaltyKey);
        if (alreadyCreated) continue;

        // Check if penalty log already exists in DB
        const existing = await ReportPenaltyLog.findOne({
          workReportId: report._id,
          tenantId: report.tenantId
        }).lean();
        if (existing) {
          await redis.set(penaltyKey, "1", { EX: 7 * 24 * 3600 });
          continue;
        }

        const employee = await resolveEmployee(report);
        if (!employee) continue;

        const penaltyLog = await ReportPenaltyLog.create({
          tenantId: report.tenantId,
          employeeId: employee.membership.userId,
          memberId: employee.membership._id,
          workReportId: report._id,
          policyId: policy._id,
          reportType: report.reportType,
          penaltyType: policy.penaltyType,
          deductionFraction: policy.penaltyType === "salary_deduction" ? policy.deductionFraction : null,
          description: policy.customPenaltyDescription || null,
          missedDeadline: deadline,
          status: "applied",
          appliedAt: now,
          autoApplied: true
        });

        // Notify employee
        const penaltyDescription = buildPenaltyDescription(policy);
        await createNotification({
          userId: employee.membership.userId,
          memberId: employee.membership._id,
          tenantId: report.tenantId,
          scope: "user",
          type: "REPORT_PENALTY_APPLIED",
          title: `Penalty Applied: Missed ${report.reportType} Report`,
          body: penaltyDescription,
          priority: "high",
          payload: {
            reportId: String(report._id),
            penaltyLogId: String(penaltyLog._id),
            reportType: report.reportType
          }
        }).catch((err) => logger.warn({ err }, "Failed to send penalty notification"));

        if (employee.user.email) {
          await enqueuePenaltyAppliedEmail({
            to: employee.user.email,
            employeeName: employee.user.name,
            reportType: report.reportType,
            penaltyDescription,
            missedDeadline: deadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          }).catch((err) => logger.warn({ err }, "Failed to enqueue penalty email"));
        }

        await redis.set(penaltyKey, "1", { EX: 7 * 24 * 3600 });
        logger.info(
          { reportId: report._id, penaltyLogId: penaltyLog._id, reportType: report.reportType },
          "Auto-applied report penalty"
        );
      }
    }

    logger.info("Report reminder scheduler tick completed");
  } catch (err) {
    logger.error({ err }, "Error in report reminder scheduler");
  }
}

function buildPenaltyDescription(policy) {
  switch (policy.penaltyType) {
    case "warning":
      return "A formal warning has been issued for missing your report deadline.";
    case "salary_deduction": {
      const frac = policy.deductionFraction || 0.25;
      const label =
        frac === 1 ? "full day" : frac >= 0.5 ? "half day" : `${frac * 100}%`;
      return `A ${label} salary deduction has been applied for missing your report deadline.`;
    }
    case "custom":
      return policy.customPenaltyDescription || "A custom penalty has been applied.";
    default:
      return "A penalty has been applied for missing your report deadline.";
  }
}

/**
 * Starts the reminder scheduler on a given interval.
 * @param {number} intervalMs - milliseconds between ticks (default 60000)
 * @returns {NodeJS.Timeout}
 */
export function startReminderScheduler(intervalMs = 60_000) {
  // Run immediately on startup, then on interval
  processReminderSchedule().catch((err) =>
    logger.error({ err }, "Initial reminder scheduler run failed")
  );
  return setInterval(() => {
    processReminderSchedule().catch((err) =>
      logger.error({ err }, "Reminder scheduler tick failed")
    );
  }, intervalMs);
}
