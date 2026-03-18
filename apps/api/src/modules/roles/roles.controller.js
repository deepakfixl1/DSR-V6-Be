/**
 * Roles controller. Returns all roles for invite/assign UI.
 */

import { Role } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";

/**
 * GET /roles — list all roles (tenant + platform). Used for invite/change-role dropdowns.
 */
export async function listRoles(req, res, next) {
  try {
    const roles = await Role.find({})
      .select("_id name description isPlatformRole permissions")
      .sort({ isPlatformRole: -1, name: 1 })
      .lean();
    return res.status(200).json(roles);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /roles/:id — get role by ID with permissions. Super admin only (for role simulation).
 */
export async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;
    const role = await Role.findById(id)
      .select("_id name description isPlatformRole permissions")
      .lean();
    if (!role) {
      return next(ApiError.notFound("Role not found"));
    }
    return res.status(200).json(role);
  } catch (error) {
    return next(error);
  }
}
