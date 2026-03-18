/**
 * Fix 403 Forbidden on API routes by syncing Role permissions to the keys
 * the API expects (report.view_all, goal.create, etc.) and optionally
 * ensuring a user has platform admin + tenant membership/owner.
 *
 * Run from backend root:
 *   node scripts/fixPermissionsAndAccess.js
 *   USER_EMAIL=admin@demo.com node scripts/fixPermissionsAndAccess.js
 *   USER_EMAIL=you@example.com TENANT_ID=69a2a1a... node scripts/fixPermissionsAndAccess.js
 *
 * No backend code is changed; only DB (Role, User, TenantMembership) is updated.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from "dotenv";
dotenv.config({ path: resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import { Role, User, TenantMembership } from "#db/models/index.js";
import { ROLE_PERMISSIONS } from "#api/modules/rbac/permissions.js";

const USER_EMAIL = process.env.USER_EMAIL || "admin@demo.com";
const TENANT_ID = process.env.TENANT_ID || null;

// Map masterTenantSetup role names to API permission set.
// API uses: report.view_all, report.submit, goal.create, blocker.create, etc.
const ROLE_TO_API_PERMISSIONS = {
  platform_admin: ["*"],
  tenant_admin: ["*"],
  manager: ROLE_PERMISSIONS["Manager"],
  team_lead: ROLE_PERMISSIONS["Manager"],
  hr_manager: ROLE_PERMISSIONS["Manager"],
  employee: ROLE_PERMISSIONS["Developer"],
  viewer: [
    "template.view",
    "report.view_all",
    "report.submit",
    "goal.create",
    "goal.edit",
    "goal.assign",
    "goal.delete",
    "blocker.create",
    "blocker.assign",
    "blocker.escalate",
    "blocker.resolve",
  ],
};

// Also ensure RBAC seed role names exist with correct permissions (for any code path that uses them)
const RBAC_ROLE_NAMES = Object.keys(ROLE_PERMISSIONS);

async function run() {
  const uri = process.env.MONGODB_URI || process.env.mongodb_uri;
  if (!uri) {
    console.error("Missing MONGODB_URI (or mongodb_uri) in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  try {
    // 1) Sync roles that masterTenantSetup created (snake_case names)
    console.log("1) Syncing Role permissions (masterTenantSetup role names)...");
    for (const [roleName, perms] of Object.entries(ROLE_TO_API_PERMISSIONS)) {
      const res = await Role.updateOne(
        { name: roleName },
        { $set: { permissions: perms } }
      );
      if (res.matchedCount) console.log(`   Updated role "${roleName}" with API permissions.`);
    }

    // 2) Upsert RBAC seed role names (Super Admin, Tenant Admin, Manager, Developer) so they exist
    console.log("\n2) Ensuring RBAC role names have correct permissions...");
    for (const roleName of RBAC_ROLE_NAMES) {
      const perms = ROLE_PERMISSIONS[roleName];
      await Role.updateOne(
        { name: roleName },
        { $set: { name: roleName, permissions: perms } },
        { upsert: true }
      );
      console.log(`   Role "${roleName}" OK.`);
    }

    // 3) Optional: give a user platform admin + ensure membership and owner for a tenant
    const email = USER_EMAIL.trim();
    if (!email) {
      console.log("\n3) Skipping user/membership (no USER_EMAIL).");
      await mongoose.disconnect();
      return;
    }

    const user = await User.findOne({ email }).select("_id email").lean();
    if (!user) {
      console.log(`\n3) User not found: ${email}. Skipping user/membership fix.`);
      await mongoose.disconnect();
      return;
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { isPlatformAdmin: true } }
    );
    console.log(`\n3) Set isPlatformAdmin=true for ${email} (audit route will work).`);

    if (TENANT_ID) {
      const tid = new mongoose.Types.ObjectId(TENANT_ID);
      const membership = await TenantMembership.findOne({
        tenantId: tid,
        userId: user._id,
      }).lean();

      if (membership) {
        await TenantMembership.updateOne(
          { tenantId: tid, userId: user._id },
          { $set: { status: "active", isOwner: true } }
        );
        console.log(`   Set membership for tenant ${TENANT_ID} to active + owner (billing/tasks/members will work).`);
      } else {
        const tenantAdminRole = await Role.findOne({ name: "tenant_admin" }).select("_id").lean();
        if (tenantAdminRole) {
          await TenantMembership.create({
            tenantId: tid,
            userId: user._id,
            roleId: tenantAdminRole._id,
            status: "active",
            isOwner: true,
            joinedAt: new Date(),
          });
          console.log(`   Created active owner membership for tenant ${TENANT_ID}.`);
        } else {
          console.log(`   No tenant_admin role found; could not create membership. Run masterTenantSetup first.`);
        }
      }
    } else {
      const anyMembership = await TenantMembership.findOne({
        userId: user._id,
        status: "active",
      }).lean();
      if (anyMembership) {
        await TenantMembership.updateOne(
          { _id: anyMembership._id },
          { $set: { isOwner: true } }
        );
        console.log(`   Set one membership to owner (tenant ${anyMembership.tenantId}) so billing works.`);
      } else {
        console.log("   No membership found for user. Set TENANT_ID and run again to create one.");
      }
    }

    console.log("\nDone. Reload the app and try the routes again.");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
