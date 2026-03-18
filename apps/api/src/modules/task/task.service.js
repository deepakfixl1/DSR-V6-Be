import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Department, Task, TenantMembership } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

async function assertDepartmentInTenant(tenantId, departmentId) {
  const department = await Department.findOne({
    _id: toObjectId(departmentId),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!department) {
    throw ApiError.badRequest("departmentId must belong to this tenant");
  }
}

async function assertAssigneeInTenant(tenantId, assigneeId) {
  if (!assigneeId) return;
  const membership = await TenantMembership.findOne({
    _id: toObjectId(assigneeId),
    tenantId: toObjectId(tenantId),
    status: "active",
  }).lean();
  if (!membership) {
    throw ApiError.badRequest("assigneeId must be an active member of this tenant");
  }
}

export async function createTask(tenantId, input) {
  const tenantObjectId = toObjectId(tenantId);
  await assertDepartmentInTenant(tenantObjectId, input.departmentId);
  if (input.assigneeId) {
    await assertAssigneeInTenant(tenantObjectId, input.assigneeId);
  }

  const task = await Task.create({
    tenantId: tenantObjectId,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    priority: input.priority ?? "medium",
    assigneeId: input.assigneeId ? toObjectId(input.assigneeId) : null,
    departmentId: toObjectId(input.departmentId),
    projectId: input.projectId ? toObjectId(input.projectId) : null,
    dueAt: input.dueAt ?? null,
    completedAt: input.completedAt ?? null,
    metadata: input.metadata ?? {},
  });

  return task.toObject();
}

export async function updateTask(tenantId, taskId, input) {
  const tenantObjectId = toObjectId(tenantId);

  const task = await Task.findOne({
    _id: toObjectId(taskId),
    tenantId: tenantObjectId,
  });
  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (input.departmentId !== undefined) {
    await assertDepartmentInTenant(tenantObjectId, input.departmentId);
    task.departmentId = toObjectId(input.departmentId);
  }

  if (input.assigneeId !== undefined) {
    if (input.assigneeId) {
      await assertAssigneeInTenant(tenantObjectId, input.assigneeId);
      task.assigneeId = toObjectId(input.assigneeId);
    } else {
      task.assigneeId = null;
    }
  }

  if (input.projectId !== undefined) {
    task.projectId = input.projectId ? toObjectId(input.projectId) : null;
  }
  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.status !== undefined) task.status = input.status;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.dueAt !== undefined) task.dueAt = input.dueAt;
  if (input.completedAt !== undefined) task.completedAt = input.completedAt;
  if (input.metadata !== undefined) task.metadata = input.metadata;

  await task.save();
  return task.toObject();
}

export async function listTasks(tenantId, query = {}) {
  const tenantObjectId = toObjectId(tenantId);
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter = { tenantId: tenantObjectId };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assigneeId) filter.assigneeId = toObjectId(query.assigneeId);
  if (query.departmentId) filter.departmentId = toObjectId(query.departmentId);
  if (query.projectId) filter.projectId = toObjectId(query.projectId);
  if (query.search) {
    filter.$or = [{ title: { $regex: query.search, $options: "i" } }];
  }

  const [docs, total] = await Promise.all([
    Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getTaskById(tenantId, taskId) {
  const task = await Task.findOne({
    _id: toObjectId(taskId),
    tenantId: toObjectId(tenantId),
  }).lean();

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  return task;
}

export async function deleteTask(tenantId, taskId, actorMemberId) {
  const task = await Task.findOne({
    _id: toObjectId(taskId),
    tenantId: toObjectId(tenantId),
  });
  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  task.deletedAt = new Date();
  task.deletedBy = toObjectId(actorMemberId);
  await task.save();

  return { success: true };
}
