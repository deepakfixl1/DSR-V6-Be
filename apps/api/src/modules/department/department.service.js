import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Department, ReportTemplate, TenantMembership } from "#db/models/index.js";

const toObjectId = (v) => new mongoose.Types.ObjectId(v);

async function assertMemberInTenant(tenantId, memberId) {
  const member = await TenantMembership.findOne({
    _id: toObjectId(memberId),
    tenantId: toObjectId(tenantId),
    status: "active",
  }).lean();

  if (!member) {
    throw ApiError.badRequest("Member must belong to this tenant");
  }
}

async function assertTemplateAccessible(tenantId, templateId) {
  if (!templateId) return;

  const template = await ReportTemplate.findOne({
    _id: toObjectId(templateId),
    $or: [
      { tenantId: toObjectId(tenantId) },
      { templateScope: "system" }
    ]
  }).lean();

  if (!template) {
    throw ApiError.badRequest("Template not accessible for this tenant");
  }
}

/**
 * Ensures a member is not already a manager or head in another department.
 * @param {mongoose.Types.ObjectId} tenantObjectId
 * @param {string} memberId - TenantMembership._id
 * @param {string} excludeDepartmentId - Department being edited (skip this one)
 * @param {'manager'|'head'} role
 */
async function assertNotAssignedElsewhere(tenantObjectId, memberId, excludeDepartmentId, role) {
  const memberObjId = toObjectId(memberId);
  const excludeObjId = toObjectId(excludeDepartmentId);

  const conflict = await Department.findOne({
    tenantId: tenantObjectId,
    _id: { $ne: excludeObjId },
    deletedAt: null,
    $or: [
      { departmentHeadId: memberObjId },
      { managerId: memberObjId },
      { managerIds: memberObjId },
    ]
  }).select("name").lean();

  if (conflict) {
    const label = role === "head" ? "department head" : "manager";
    throw ApiError.conflict(
      `This person is already a ${label} in "${conflict.name}". A department head or manager can only belong to one department.`
    );
  }
}

export async function createDepartment({ tenantId, input, actorMemberId }) {
  const tenantObjectId = toObjectId(tenantId);

  if (input.managerId) {
    await assertMemberInTenant(tenantObjectId, input.managerId);
  }

  if (input.templateId) {
    await assertTemplateAccessible(tenantObjectId, input.templateId);
  }

  const existing = await Department.findOne({
    tenantId: tenantObjectId,
    slug: input.slug,
    deletedAt: null
  }).lean();

  if (existing) {
    throw ApiError.conflict("Department slug already exists");
  }

  const department = await Department.create({
    tenantId: tenantObjectId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    type: input.type,
    status: input.status ?? "ACTIVE",
    managerId: input.managerId ? toObjectId(input.managerId) : null,
    templateId: input.templateId ? toObjectId(input.templateId) : null,
    createdBy: actorMemberId
  });

  return department.toObject();
}

export async function updateDepartment({ tenantId, departmentId, input }) {
  const tenantObjectId = toObjectId(tenantId);

  const department = await Department.findOne({
    _id: toObjectId(departmentId),
    tenantId: tenantObjectId,
    deletedAt: null
  });

  if (!department) {
    throw ApiError.notFound("Department not found");
  }

  if (input.slug && input.slug !== department.slug) {
    const existing = await Department.findOne({
      tenantId: tenantObjectId,
      slug: input.slug,
      _id: { $ne: department._id }
    }).lean();

    if (existing) {
      throw ApiError.conflict("Department slug already exists");
    }

    department.slug = input.slug;
  }

  // ── Department Head ─────────────────────────────────────────────────────
  if (input.departmentHeadId !== undefined) {
    if (input.departmentHeadId) {
      await assertMemberInTenant(tenantObjectId, input.departmentHeadId);
      await assertNotAssignedElsewhere(tenantObjectId, input.departmentHeadId, departmentId, "head");
      department.departmentHeadId = toObjectId(input.departmentHeadId);
    } else {
      department.departmentHeadId = null;
    }
  }

  // ── Multiple Managers ────────────────────────────────────────────────────
  if (Array.isArray(input.managerIds)) {
    for (const mId of input.managerIds) {
      await assertMemberInTenant(tenantObjectId, mId);
      await assertNotAssignedElsewhere(tenantObjectId, mId, departmentId, "manager");
    }
    department.managerIds = input.managerIds.map(toObjectId);
    // Keep legacy managerId in sync with first manager for backward compat
    department.managerId = input.managerIds.length > 0 ? toObjectId(input.managerIds[0]) : null;
  }

  // ── Legacy single managerId ──────────────────────────────────────────────
  if (input.managerId !== undefined && !Array.isArray(input.managerIds)) {
    if (input.managerId) {
      await assertMemberInTenant(tenantObjectId, input.managerId);
      department.managerId = toObjectId(input.managerId);
    } else {
      department.managerId = null;
    }
  }

  if (input.templateId !== undefined) {
    if (input.templateId) {
      await assertTemplateAccessible(tenantObjectId, input.templateId);
      department.templateId = toObjectId(input.templateId);
    } else {
      department.templateId = null;
    }
  }

  if (input.name !== undefined) department.name = input.name;
  if (input.description !== undefined) department.description = input.description;
  if (input.type !== undefined) department.type = input.type;
  if (input.status !== undefined) department.status = input.status;

  await department.save();

  return department.toObject();
}

export async function listDepartments({ tenantId, query }) {
  const tenantObjectId = toObjectId(tenantId);

  const page = Math.max(1, query.page);
  const limit = Math.min(100, query.limit);

  const filter = {
    tenantId: tenantObjectId,
    deletedAt: null
  };

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { slug: { $regex: query.search, $options: "i" } }
    ];
  }

  const docs = await Department.find(filter)
    .populate("managerId", "userId roleId")
    .populate({ path: "managerIds", select: "userId roleId" })
    .populate({ path: "departmentHeadId", select: "userId roleId" })
    .populate("templateId", "name code")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Department.countDocuments(filter);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}

export async function getDepartmentById({ tenantId, departmentId }) {
  const department = await Department.findOne({
    _id: toObjectId(departmentId),
    tenantId: toObjectId(tenantId),
    deletedAt: null
  })
  .populate("managerId")
  .populate({ path: "managerIds", populate: { path: "userId", select: "name email" } })
  .populate({ path: "departmentHeadId", populate: { path: "userId", select: "name email" } })
  .populate("templateId")
  .lean();

  if (!department) {
    throw ApiError.notFound("Department not found");
  }

  return department;
}

export async function deleteDepartment({ tenantId, departmentId, actorMemberId }) {
  const department = await Department.findOne({
    _id: toObjectId(departmentId),
    tenantId: toObjectId(tenantId),
    deletedAt: null
  });

  if (!department) {
    throw ApiError.notFound("Department not found");
  }

  department.deletedAt = new Date();
  department.deletedBy = toObjectId(actorMemberId);

  await department.save();

  return { success: true };
}
