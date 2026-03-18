import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Department, Role, Task } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

async function isAdminMembership(membership) {
  if (membership?.isOwner) return true;
  if (!membership?.roleId) return false;
  const role = await Role.findById(membership.roleId).select("name").lean();
  return String(role?.name || "").toLowerCase() === "admin";
}

export const requireTaskEditAccess = () => {
  return async (req, _res, next) => {
    try {
      if (!req.membership?._id) {
        return next(ApiError.forbidden("Tenant membership required"));
      }

      const { tenantId, taskId } = req.params;
      const task = await Task.findOne({
        _id: toObjectId(taskId),
        tenantId: toObjectId(tenantId),
      })
        .select("_id departmentId")
        .lean();
      if (!task) {
        return next(ApiError.notFound("Task not found"));
      }

      const isAdmin = await isAdminMembership(req.membership);
      if (isAdmin) {
        req.task = task;
        return next();
      }

      if (!task.departmentId) {
        return next(ApiError.forbidden("Department manager or admin access required"));
      }

      const department = await Department.findOne({
        _id: task.departmentId,
        tenantId: toObjectId(tenantId),
      })
        .select("managerId")
        .lean();
      if (!department) {
        return next(ApiError.badRequest("Task department is invalid"));
      }

      if (String(department.managerId || "") !== String(req.membership._id)) {
        return next(ApiError.forbidden("Department manager or admin access required"));
      }

      req.task = task;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireTaskAssigneeAccess = () => {
  return async (req, _res, next) => {
    try {
      if (!req.membership?._id) {
        return next(ApiError.forbidden("Tenant membership required"));
      }

      const { tenantId, taskId } = req.params;
      const task = await Task.findOne({
        _id: toObjectId(taskId),
        tenantId: toObjectId(tenantId),
      })
        .select("_id assigneeId")
        .lean();
      if (!task) {
        return next(ApiError.notFound("Task not found"));
      }
      if (String(task.assigneeId || "") !== String(req.membership._id)) {
        return next(ApiError.forbidden("Only task assignee can log time"));
      }

      req.task = task;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
