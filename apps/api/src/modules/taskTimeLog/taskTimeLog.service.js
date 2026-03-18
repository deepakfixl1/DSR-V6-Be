import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Task, TaskTimeLog } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);
const MAX_DATE = new Date("9999-12-31T23:59:59.999Z");

function assertValidTimeRange(startedAt, endedAt) {
  if (endedAt && endedAt <= startedAt) {
    throw ApiError.badRequest("endedAt must be greater than startedAt");
  }
}

async function getTaskOrThrow(tenantId, taskId) {
  const task = await Task.findOne({
    _id: toObjectId(taskId),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!task) throw ApiError.notFound("Task not found");
  return task;
}

function assertAssignee(task, memberId) {
  if (String(task.assigneeId || "") !== String(memberId)) {
    throw ApiError.forbidden("Only task assignee can log time");
  }
}

async function assertNoOverlap(tenantId, memberId, startedAt, endedAt, excludeTimeLogId = null) {
  const filter = {
    tenantId: toObjectId(tenantId),
    memberId: toObjectId(memberId),
    startedAt: { $lt: endedAt || MAX_DATE },
    $or: [{ endedAt: null }, { endedAt: { $gt: startedAt } }],
  };
  if (excludeTimeLogId) {
    filter._id = { $ne: toObjectId(excludeTimeLogId) };
  }

  const overlap = await TaskTimeLog.findOne(filter).select("_id").lean();
  if (overlap) {
    throw ApiError.conflict("Time log overlaps with an existing entry");
  }
}

async function getMemberOwnedTimeLogOrThrow(tenantId, timeLogId, memberId) {
  const timeLog = await TaskTimeLog.findOne({
    _id: toObjectId(timeLogId),
    tenantId: toObjectId(tenantId),
  });
  if (!timeLog) {
    throw ApiError.notFound("Time log not found");
  }
  if (String(timeLog.memberId) !== String(memberId)) {
    throw ApiError.forbidden("Only assignee can access this time log");
  }
  return timeLog;
}

export async function createTaskTimeLog(tenantId, taskId, memberId, input) {
  const task = await getTaskOrThrow(tenantId, taskId);
  assertAssignee(task, memberId);
  assertValidTimeRange(input.startedAt, input.endedAt);
  await assertNoOverlap(tenantId, memberId, input.startedAt, input.endedAt);

  const timeLog = await TaskTimeLog.create({
    tenantId: toObjectId(tenantId),
    taskId: toObjectId(taskId),
    memberId: toObjectId(memberId),
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
    billable: input.billable ?? false,
    note: input.note ?? null,
  });

  return timeLog.toObject();
}

export async function updateTaskTimeLog(tenantId, timeLogId, memberId, input) {
  const timeLog = await getMemberOwnedTimeLogOrThrow(tenantId, timeLogId, memberId);

  const task = await getTaskOrThrow(tenantId, timeLog.taskId);
  assertAssignee(task, memberId);

  const startedAt = input.startedAt ?? timeLog.startedAt;
  const endedAt = input.endedAt !== undefined ? input.endedAt : timeLog.endedAt;
  assertValidTimeRange(startedAt, endedAt);
  await assertNoOverlap(tenantId, memberId, startedAt, endedAt, timeLogId);

  if (input.startedAt !== undefined) timeLog.startedAt = input.startedAt;
  if (input.endedAt !== undefined) timeLog.endedAt = input.endedAt;
  if (input.billable !== undefined) timeLog.billable = input.billable;
  if (input.note !== undefined) timeLog.note = input.note;

  await timeLog.save();
  return timeLog.toObject();
}

export async function listTaskTimeLogs(tenantId, taskId, memberId, query = {}) {
  const task = await getTaskOrThrow(tenantId, taskId);
  assertAssignee(task, memberId);

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const filter = {
    tenantId: toObjectId(tenantId),
    taskId: toObjectId(taskId),
    memberId: toObjectId(memberId),
  };

  const [docs, total] = await Promise.all([
    TaskTimeLog.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TaskTimeLog.countDocuments(filter),
  ]);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getTaskTimeLogById(tenantId, timeLogId, memberId) {
  const timeLog = await getMemberOwnedTimeLogOrThrow(tenantId, timeLogId, memberId);

  const task = await getTaskOrThrow(tenantId, timeLog.taskId);
  assertAssignee(task, memberId);

  return timeLog.toObject();
}

export async function deleteTaskTimeLog(tenantId, timeLogId, memberId) {
  const timeLog = await getMemberOwnedTimeLogOrThrow(tenantId, timeLogId, memberId);

  const task = await getTaskOrThrow(tenantId, timeLog.taskId);
  assertAssignee(task, memberId);

  await timeLog.deleteOne();
  return { success: true };
}
