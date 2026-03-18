import mongoose from "mongoose";
import { DeadlinePolicy } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export async function createPolicy({ tenantId, actorId, payload, meta }) {
  const policy = await DeadlinePolicy.create({
    tenantId: toObjectId(tenantId),
    name: payload.name,
    description: payload.description ?? "",
    reportType: payload.reportType,
    deadline: payload.deadline,
    lockAfterDeadline: payload.lockAfterDeadline ?? true,
    allowExtensionRequest: payload.allowExtensionRequest ?? true,
    gracePeriodMinutes: payload.gracePeriodMinutes ?? 0,
    status: payload.status ?? "active",
    createdBy: actorId ? toObjectId(actorId) : null,
  });

  await recordAudit({
    tenantId, actorId,
    entityType: "deadline_policy", entityId: policy._id,
    action: "create", after: policy.toObject(), meta,
  });

  return policy.toObject();
}

export async function listPolicies({ tenantId, query = {} }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const filter = { tenantId: toObjectId(tenantId) };
  if (query.status) filter.status = query.status;
  if (query.reportType) filter.reportType = query.reportType;

  const [docs, total] = await Promise.all([
    DeadlinePolicy.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    DeadlinePolicy.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getPolicy({ tenantId, id }) {
  const policy = await DeadlinePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) }).lean();
  if (!policy) throw ApiError.notFound("Deadline policy not found");
  return policy;
}

export async function updatePolicy({ tenantId, id, payload, actorId, meta }) {
  const policy = await DeadlinePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("Deadline policy not found");

  const before = policy.toObject();
  const updatable = ["name", "description", "reportType", "deadline", "lockAfterDeadline", "allowExtensionRequest", "gracePeriodMinutes", "status"];
  for (const key of updatable) {
    if (payload[key] !== undefined) policy[key] = payload[key];
  }
  await policy.save();

  await recordAudit({
    tenantId, actorId,
    entityType: "deadline_policy", entityId: policy._id,
    action: "update", before, after: policy.toObject(), meta,
  });

  return policy.toObject();
}

export async function deletePolicy({ tenantId, id, actorId, meta }) {
  const policy = await DeadlinePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("Deadline policy not found");

  const before = policy.toObject();
  if (typeof policy.softDelete === "function") {
    await policy.softDelete(actorId);
  } else {
    await policy.deleteOne();
  }

  await recordAudit({
    tenantId, actorId,
    entityType: "deadline_policy", entityId: policy._id,
    action: "delete", before, after: null, meta,
  });

  return { success: true };
}

export async function togglePolicy({ tenantId, id, actorId, meta }) {
  const policy = await DeadlinePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("Deadline policy not found");

  const before = policy.toObject();
  policy.status = policy.status === "active" ? "paused" : "active";
  await policy.save();

  await recordAudit({
    tenantId, actorId,
    entityType: "deadline_policy", entityId: policy._id,
    action: "toggle", before, after: policy.toObject(), meta,
  });

  return policy.toObject();
}

/**
 * Returns the next upcoming deadline for the given reportType in a tenant.
 * Used by the frontend countdown widget.
 */
export async function getNextDeadline({ tenantId, reportType }) {
  const policies = await DeadlinePolicy.find({
    tenantId: toObjectId(tenantId),
    reportType,
    status: "active",
    deletedAt: null,
  }).lean();

  if (!policies.length) return null;

  const now = new Date();
  let earliest = null;
  let matchedPolicy = null;

  for (const policy of policies) {
    const deadline = computeNextDeadline(policy.deadline, now);
    if (!deadline) continue;
    if (!earliest || deadline < earliest) {
      earliest = deadline;
      matchedPolicy = policy;
    }
  }

  if (!earliest) return null;

  return {
    deadline: earliest.toISOString(),
    policyName: matchedPolicy.name,
    gracePeriodMinutes: matchedPolicy.gracePeriodMinutes ?? 0,
    timezone: matchedPolicy.deadline?.timezone ?? "Asia/Kolkata",
    reportType,
  };
}

/**
 * Compute the next upcoming deadline moment after `now` for the given config.
 * Returns a Date or null.
 */
function computeNextDeadline(config, now) {
  const { cadence, hour, minute, timezone, dayOfWeek, dayOfMonth } = config;

  const inTZ = (d) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "Asia/Kolkata",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return {
      year: parseInt(p.year),
      month: parseInt(p.month) - 1,
      day: parseInt(p.day),
      hour: parseInt(p.hour),
      minute: parseInt(p.minute),
    };
  };

  const tzNow = inTZ(now);

  const localToUTC = (year, month, day, h, m) => {
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    const str = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:00`;
    const asUtc = new Date(str + "Z");
    const check = inTZ(asUtc);
    const offsetHours = h - check.hour + (m - check.minute) / 60;
    return new Date(asUtc.getTime() - offsetHours * 3600_000);
  };

  if (cadence === "daily") {
    let dl = localToUTC(tzNow.year, tzNow.month, tzNow.day, hour, minute ?? 0);
    if (dl <= now) dl = new Date(dl.getTime() + 86_400_000);
    return dl;
  }

  if (cadence === "weekly") {
    const targetDow = dayOfWeek ?? 1;
    const nowDow = now.getDay();
    let daysAhead = (targetDow - nowDow + 7) % 7;
    if (daysAhead === 0) {
      const dl = localToUTC(tzNow.year, tzNow.month, tzNow.day, hour, minute ?? 0);
      if (dl > now) return dl;
      daysAhead = 7;
    }
    const target = new Date(now.getTime() + daysAhead * 86_400_000);
    const t = inTZ(target);
    return localToUTC(t.year, t.month, t.day, hour, minute ?? 0);
  }

  if (cadence === "monthly") {
    const dom = dayOfMonth ?? 1;
    let dl = localToUTC(tzNow.year, tzNow.month, dom, hour, minute ?? 0);
    if (dl <= now) {
      const next = new Date(tzNow.year, tzNow.month + 1, 1);
      const n = inTZ(next);
      const daysInMonth = new Date(n.year, n.month + 1, 0).getDate();
      const clampedDom = Math.min(dom, daysInMonth);
      dl = localToUTC(n.year, n.month, clampedDom, hour, minute ?? 0);
    }
    return dl;
  }

  return null;
}

/**
 * Core enforcement helper used by workReport.service.js.
 * Returns { blocked: true, policyName } if submission should be blocked,
 * { blocked: false } otherwise.
 */
export async function checkDeadlineForSubmit({ tenantId, reportType, submittedAt }) {
  const policies = await DeadlinePolicy.find({
    tenantId: toObjectId(tenantId),
    reportType,
    status: "active",
    lockAfterDeadline: true,
    deletedAt: null,
  }).lean();

  if (!policies.length) return { blocked: false };

  const now = submittedAt ? new Date(submittedAt) : new Date();

  for (const policy of policies) {
    const deadline = computeLatestDeadline(policy.deadline, now);
    if (!deadline) continue;

    const effectiveDeadline = new Date(deadline.getTime() + (policy.gracePeriodMinutes ?? 0) * 60_000);
    if (now > effectiveDeadline) {
      return {
        blocked: true,
        policyName: policy.name,
        deadline: effectiveDeadline.toISOString(),
        allowExtensionRequest: policy.allowExtensionRequest,
      };
    }
  }

  return { blocked: false };
}

/**
 * Compute the most recent deadline moment before `now` for the given config.
 * Returns a Date or null.
 */
function computeLatestDeadline(config, now) {
  const { cadence, hour, minute, timezone, dayOfWeek, dayOfMonth } = config;

  // We work in wall-clock terms by parsing ISO strings in the target timezone.
  // Using Intl is safer than manual offset math.
  const inTZ = (d) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "Asia/Kolkata",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return {
      year: parseInt(p.year),
      month: parseInt(p.month) - 1, // 0-indexed
      day: parseInt(p.day),
      hour: parseInt(p.hour),
      minute: parseInt(p.minute),
      dow: d.getDay(), // JS getDay is UTC — override below
    };
  };

  const tzNow = inTZ(now);

  // Build a UTC Date from a local wall-clock date in the target timezone.
  const localToUTC = (year, month, day, h, m) => {
    // Create a string that looks like local time, then let Date parse it assuming UTC,
    // then subtract the TZ offset.
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    const str = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:00`;
    const asUtc = new Date(str + "Z");
    // Get the UTC time that corresponds to `str` in the target timezone by
    // checking what local time str+Z gives in that timezone, then adjusting.
    const check = inTZ(asUtc);
    const offsetHours = h - check.hour + (m - check.minute) / 60;
    return new Date(asUtc.getTime() - offsetHours * 3600_000);
  };

  if (cadence === "daily") {
    // Today's deadline in local tz
    let dl = localToUTC(tzNow.year, tzNow.month, tzNow.day, hour, minute ?? 0);
    // If that's in the future, use yesterday's
    if (dl > now) dl = new Date(dl.getTime() - 86_400_000);
    return dl;
  }

  if (cadence === "weekly") {
    const targetDow = dayOfWeek ?? 1; // Monday default
    // Find most recent occurrence of targetDow
    const nowDow = new Date(now).getDay(); // local day of week is close enough
    let daysBack = (nowDow - targetDow + 7) % 7;
    if (daysBack === 0) {
      // Same day — check if time has passed
      const dl = localToUTC(tzNow.year, tzNow.month, tzNow.day, hour, minute ?? 0);
      if (dl > now) daysBack = 7; // last week
      else return dl;
    }
    const target = new Date(now.getTime() - daysBack * 86_400_000);
    const t = inTZ(target);
    return localToUTC(t.year, t.month, t.day, hour, minute ?? 0);
  }

  if (cadence === "monthly") {
    const dom = dayOfMonth ?? 1;
    // Try this month
    let dl = localToUTC(tzNow.year, tzNow.month, dom, hour, minute ?? 0);
    if (dl > now) {
      // Go to previous month
      const prev = new Date(tzNow.year, tzNow.month, 0); // last day of prev month
      const p = inTZ(prev);
      const clampedDom = Math.min(dom, prev.getDate());
      dl = localToUTC(p.year, p.month, clampedDom, hour, minute ?? 0);
    }
    return dl;
  }

  return null;
}
