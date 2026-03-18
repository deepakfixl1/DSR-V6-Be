import { Queue } from "bullmq";
import { logger } from "#api/utils/logger.js";
import { templateSubjects, templates } from "#infra/email/templates.js";

const EMAIL_QUEUE_NAME = "email";
const EMAIL_JOB_NAME = "send-email";

let emailQueue;
let _lastEmailQueueError = 0;

export const createEmailQueue = ({ redisClient, connection }) => {
  if (emailQueue) return emailQueue;

  const conn = { ...connection, maxRetriesPerRequest: null, enableOfflineQueue: false };

  emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection: conn,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  });

  // Throttled error handler — log at most once every 30s to avoid flooding
  emailQueue.on("error", (err) => {
    const now = Date.now();
    if (now - _lastEmailQueueError >= 30_000) {
      _lastEmailQueueError = now;
      logger.warn(`Email queue error (non-fatal): ${err?.message ?? err}`);
    }
  });

  if (redisClient) {
    logger.info("Email queue initialized with shared Redis runtime");
  } else {
    logger.warn("Email queue initialized without shared Redis runtime handle");
  }

  return emailQueue;
};

export const enqueueEmail = async (payload, opts = {}) => {
  if (!emailQueue) {
    throw new Error("Email queue has not been initialized");
  }
  return emailQueue.add(EMAIL_JOB_NAME, payload, opts);
};

export const enqueueTemplatedEmail = async ({ to, templateName, templateArgs = [], subject }, opts = {}) => {
  const templateBuilder = templates[templateName];
  if (!templateBuilder) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const html = templateBuilder(...templateArgs);
  const finalSubject = subject || templateSubjects[templateName] || "Notification";

  return enqueueEmail({ to, subject: finalSubject, html }, opts);
};

export const enqueueForgotPasswordEmail = async ({ to, name, resetLink }, opts = {}) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "forgotPasswordLink",
      templateArgs: [name || "User", resetLink]
    },
    opts
  );
};

export const enqueueEmailVerification = async ({ to, name, verificationLink }, opts = {}) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "emailVerification",
      templateArgs: [name || "User", verificationLink]
    },
    opts
  );
};

/**
 * Enqueues tenant invite email.
 * @param {{ to: string, inviteeName?: string, inviterName: string, tenantName: string, acceptLink: string, expiresInDays?: number }} params
 * @param {object} opts
 * @returns {Promise<import("bullmq").Job>}
 */
export const enqueueTenantInviteEmail = async (
  { to, inviteeName, inviterName, tenantName, acceptLink, expiresInDays = 7 },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "tenantInvite",
      templateArgs: [inviteeName || "User", inviterName, tenantName, acceptLink, expiresInDays]
    },
    opts
  );
};

/**
 * Enqueues platform admin invite email (set password link).
 * @param {{ to: string, inviteeName?: string, inviterName: string, roleName: string, setPasswordLink: string }} params
 * @param {object} opts
 * @returns {Promise<import("bullmq").Job>}
 */
export const enqueuePlatformInviteEmail = async (
  { to, inviteeName, inviterName, roleName, setPasswordLink },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "platformInvite",
      templateArgs: [inviteeName || "User", inviterName, roleName, setPasswordLink]
    },
    opts
  );
};

/**
 * Enqueues tenant-owner invite email (set password link; on accept tenant + owner are created).
 * @param {{ to: string, ownerName?: string, tenantName: string, inviterName: string, setPasswordLink: string, expiresInDays?: number }} params
 * @param {object} opts
 * @returns {Promise<import("bullmq").Job>}
 */
export const enqueueTenantOwnerInviteEmail = async (
  { to, ownerName, tenantName, inviterName, setPasswordLink, expiresInDays = 7 },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "tenantOwnerInvite",
      templateArgs: [ownerName || "User", tenantName, inviterName, setPasswordLink, expiresInDays]
    },
    opts
  );
};

/**
 * Enqueues a report due reminder email.
 * @param {{ to: string, employeeName?: string, reportType: string, deadlineTime: string, submitLink: string }} params
 */
export const enqueueReportDueReminderEmail = async (
  { to, employeeName, reportType, deadlineTime, submitLink },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "reportDueReminder",
      templateArgs: [employeeName || "Team Member", reportType, deadlineTime, submitLink]
    },
    opts
  );
};

/**
 * Enqueues a late submission request notification to manager.
 * @param {{ to: string, managerName?: string, employeeName: string, reportType: string, reason: string, approveLink: string, rejectLink: string }} params
 */
export const enqueueLateSubmissionRequestEmail = async (
  { to, managerName, employeeName, reportType, reason, approveLink, rejectLink },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "lateSubmissionRequestReceived",
      templateArgs: [managerName || "Manager", employeeName, reportType, reason, approveLink, rejectLink]
    },
    opts
  );
};

/**
 * Enqueues a late submission approved email to employee.
 * @param {{ to: string, employeeName?: string, reportType: string, extendedDeadline: string, submitLink: string }} params
 */
export const enqueueLateSubmissionApprovedEmail = async (
  { to, employeeName, reportType, extendedDeadline, submitLink },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "lateSubmissionApproved",
      templateArgs: [employeeName || "Team Member", reportType, extendedDeadline, submitLink]
    },
    opts
  );
};

/**
 * Enqueues a late submission rejected email to employee.
 * @param {{ to: string, employeeName?: string, reportType: string, managerNotes?: string }} params
 */
export const enqueueLateSubmissionRejectedEmail = async (
  { to, employeeName, reportType, managerNotes },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "lateSubmissionRejected",
      templateArgs: [employeeName || "Team Member", reportType, managerNotes || ""]
    },
    opts
  );
};

/**
 * Enqueues a penalty applied email to employee.
 * @param {{ to: string, employeeName?: string, reportType: string, penaltyDescription: string, missedDeadline: string }} params
 */
export const enqueuePenaltyAppliedEmail = async (
  { to, employeeName, reportType, penaltyDescription, missedDeadline },
  opts = {}
) => {
  return enqueueTemplatedEmail(
    {
      to,
      templateName: "penaltyApplied",
      templateArgs: [employeeName || "Team Member", reportType, penaltyDescription, missedDeadline]
    },
    opts
  );
};

export const closeEmailQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = undefined;
  }
};

export { EMAIL_QUEUE_NAME, EMAIL_JOB_NAME };
