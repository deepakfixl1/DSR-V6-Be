/**
 * seedSuperAdmins.js
 * ──────────────────────────────────────────────────────────────────────────
 * Seeds platform admin users and their platform-scoped roles.
 * These users can log in to the Super Admin Control Tower.
 *
 * Run from the backend/ directory:
 *   node scripts/seedSuperAdmins.js
 *
 * Idempotent — safe to re-run. Existing users get their passwords refreshed.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { resolve, dirname } from "path";
import { fileURLToPath }  from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Load env before anything else ────────────────────────────────────────
import dotenv from "dotenv";
dotenv.config({ path: resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

// ── Direct model imports ───────────────────────────────────────────────────
import {
  User,
  Role,
  Tenant,
  TenantMembership,
} from "#db/models/index.js";

// ── Config ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const DEFAULT_PASS  = "Admin@123";

// ── Logger ────────────────────────────────────────────────────────────────
const log = {
  phase : (n, title) => console.log(`\n${"═".repeat(60)}\n  Phase ${n}: ${title}\n${"═".repeat(60)}`),
  ok    : (msg) => console.log(`  ✅  ${msg}`),
  skip  : (msg) => console.log(`  ⏭   ${msg}`),
  info  : (msg) => console.log(`  ℹ️   ${msg}`),
  warn  : (msg) => console.warn(`  ⚠️   ${msg}`),
  err   : (msg, e) => console.error(`  ❌  ${msg}`, e?.message || e),
};

// ── DB Connect ────────────────────────────────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.mongodb_uri;
  if (!uri) throw new Error("MONGODB_URI not set in backend/.env");
  log.info(`Connecting: ${uri.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  log.ok("MongoDB connected");
}

// ── Platform Roles (short names) ───────────────────────────────────────────
const PLATFORM_ROLES = [
  {
    name        : "super_admin",
    description : "Full platform access — tenants, billing, security, system config, and destructive operations",
    isPlatformRole: true,
    permissions : ["*"],
  },
  {
    name        : "billing_admin",
    description : "Manage subscription plans, invoices, refunds, and tenant billing lifecycle",
    isPlatformRole: true,
    permissions : [
      "billing:read", "billing:create", "billing:update", "billing:delete",
      "plan:read", "plan:create", "plan:update", "plan:delete",
      "subscription:read", "subscription:update", "subscription:cancel",
      "tenant:read", "audit:read",
    ],
  },
  {
    name        : "security_admin",
    description : "Security policies, audit log oversight, MFA enforcement, and threat response",
    isPlatformRole: true,
    permissions : [
      "audit:read", "audit:export",
      "user:read", "user:disable", "user:unlock",
      "tenant:read",
      "security:read", "security:update",
      "mfa:manage", "session:revoke",
    ],
  },
  {
    name        : "support_admin",
    description : "Assist tenants — view memberships, impersonate, manage tickets, and basic user edits",
    isPlatformRole: true,
    permissions : [
      "tenant:read",
      "user:read", "user:update",
      "member:read", "member:manage",
      "billing:read",
      "audit:read",
      "support:read", "support:update",
    ],
  },
  {
    name        : "readonly_admin",
    description : "View-only access to all platform data — tenants, billing, audit, and reports",
    isPlatformRole: true,
    permissions : [
      "tenant:read",
      "user:read",
      "billing:read",
      "plan:read",
      "audit:read",
      "role:read",
      "report:read",
    ],
  },
];

// ── Platform Admin Users ──────────────────────────────────────────────────
const ADMIN_USERS = [
  {
    label    : "Super Admin",
    email    : "superadmin@admin.com",
    name     : "Super Admin",
    password : DEFAULT_PASS,
    roleName : "super_admin",
    color    : "#3b82f6",
  },
  {
    label    : "Billing Admin",
    email    : "billing@admin.com",
    name     : "Billing Admin",
    password : DEFAULT_PASS,
    roleName : "billing_admin",
    color    : "#10b981",
  },
  {
    label    : "Security Admin",
    email    : "security@admin.com",
    name     : "Security Admin",
    password : DEFAULT_PASS,
    roleName : "security_admin",
    color    : "#ef4444",
  },
  {
    label    : "Support Admin",
    email    : "support@admin.com",
    name     : "Support Admin",
    password : DEFAULT_PASS,
    roleName : "support_admin",
    color    : "#f59e0b",
  },
  {
    label    : "Read-only Admin",
    email    : "readonly@admin.com",
    name     : "Readonly Admin",
    password : DEFAULT_PASS,
    roleName : "readonly_admin",
    color    : "#6b7280",
  },
  {
    label    : "Platform Admin (demo)",
    email    : "platformadmin@demo.com",
    name     : "Platform Admin",
    password : DEFAULT_PASS,
    roleName : "super_admin",
    color    : "#8b5cf6",
  },
];

// ── Phase 0a: Remove Duplicate Roles ────────────────────────────────────────
async function removeDuplicateRoles() {
  log.phase("0a", "Remove Duplicate Roles");
  const roles = await Role.find({}).lean();
  const byName = {};
  for (const r of roles) {
    if (!byName[r.name]) byName[r.name] = [];
    byName[r.name].push(r);
  }

  let removed = 0;
  for (const [name, group] of Object.entries(byName)) {
    if (group.length <= 1) continue;
    const [keep, ...dupes] = group.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const dupIds = dupes.map((d) => d._id);

    for (const dupId of dupIds) {
      await User.updateMany({ platformRoleId: dupId }, { $set: { platformRoleId: keep._id } });
      await TenantMembership.updateMany({ roleId: dupId }, { $set: { roleId: keep._id } });
      await Role.deleteOne({ _id: dupId });
      removed++;
    }
    log.ok(`Resolved duplicates for "${name}": kept 1, removed ${dupes.length}`);
  }
  if (removed === 0) log.skip("No duplicate roles found");
}

// ── Phase 0b: Remove Old Platform Roles (long names) ────────────────────────
const OLD_PLATFORM_NAMES = [
  "platform_super_admin",
  "platform_billing_admin",
  "platform_security_admin",
  "platform_support_admin",
  "platform_readonly_admin",
];

async function removeOldPlatformRoles() {
  log.phase("0b", "Remove Old Platform Roles (migrate to short names)");
  for (const oldName of OLD_PLATFORM_NAMES) {
    const oldRole = await Role.findOne({ name: oldName });
    if (!oldRole) continue;
    const newName = oldName.replace("platform_", "");
    const newRole = await Role.findOne({ name: newName });
    if (newRole) {
      await User.updateMany({ platformRoleId: oldRole._id }, { $set: { platformRoleId: newRole._id } });
      await Role.deleteOne({ _id: oldRole._id });
      log.ok(`Migrated refs from "${oldName}" → "${newName}", deleted old role`);
    } else {
      await Role.updateOne({ _id: oldRole._id }, { $set: { name: newName } });
      log.ok(`Renamed "${oldName}" → "${newName}"`);
    }
  }
}

// ── Phase 1b: Remove Stale Platform Roles (legacy "Platform X" names only) ───
// Only delete roles whose names start with "Platform " (legacy pattern).
// Do NOT delete Owner, Manager, etc. — those are tenant roles.
async function removeStalePlatformRoles(roleMap) {
  log.phase("1b", "Remove Stale Platform Roles (legacy 'Platform X' duplicates)");
  const superAdminRole = roleMap?.super_admin;
  if (!superAdminRole) {
    log.skip("super_admin not in roleMap");
    return;
  }

  const allPlatform = await Role.find({ isPlatformRole: true }).lean();
  const toDelete = allPlatform.filter((r) => r.name.startsWith("Platform "));
  if (toDelete.length === 0) {
    log.skip("No stale platform roles to remove");
    return;
  }

  for (const role of toDelete) {
    await User.updateMany(
      { platformRoleId: role._id },
      { $set: { platformRoleId: superAdminRole._id } }
    );
    await Role.deleteOne({ _id: role._id });
    log.ok(`Removed stale platform role: "${role.name}"`);
  }
}

// ── Phase 0c: Fix Subscription Index Migration ─────────────────────────────
// The stripeSubscriptionId field had `default: null` + `unique: true` + `sparse: true`.
// In modern MongoDB, explicitly-null values ARE indexed, causing dup-key errors when
// creating multiple tenants. Unset null values so the sparse index skips them.
async function fixSubscriptionIndex() {
  log.phase("0c", "Subscription Index Migration");
  const db = mongoose.connection.db;
  const coll = db.collection("subscriptions");

  const result = await coll.updateMany(
    { stripeSubscriptionId: null },
    { $unset: { stripeSubscriptionId: "" } }
  );
  if (result.modifiedCount > 0) {
    log.ok(`Unset null stripeSubscriptionId on ${result.modifiedCount} subscription(s)`);
  } else {
    log.skip("No null stripeSubscriptionId values to fix");
  }
}

// ── Seed Roles ────────────────────────────────────────────────────────────
async function seedRoles() {
  log.phase(1, "Platform Roles");
  const roleMap = {};

  for (const def of PLATFORM_ROLES) {
    const existing = await Role.findOne({ name: def.name });
    if (existing) {
      await Role.updateOne({ _id: existing._id }, {
        $set: {
          description   : def.description,
          isPlatformRole: def.isPlatformRole,
          permissions   : def.permissions,
        },
      });
      log.skip(`Role "${def.name}" exists — updated`);
      roleMap[def.name] = existing;
    } else {
      roleMap[def.name] = await Role.create(def);
      log.ok(`Created role: ${def.name}`);
    }
  }

  return roleMap;
}

// ── Seed Users ────────────────────────────────────────────────────────────
async function seedUsers(roleMap) {
  log.phase(2, "Platform Admin Users");
  const userMap = {};

  for (const def of ADMIN_USERS) {
    const email        = def.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(def.password, BCRYPT_ROUNDS);

    const roleId = roleMap[def.roleName]?._id ?? null;
    const existing = await User.findOne({ email });
    if (existing) {
      await User.updateOne({ _id: existing._id }, {
        $set: {
          name            : def.name,
          isPlatformAdmin : true,
          platformRoleId  : roleId,
          "auth.passwordHash": passwordHash,
          "auth.passwordAlgo": "bcrypt",
          status          : "active",
          emailVerified   : true,
        },
      });
      log.skip(`${def.label} (${email}) exists — refreshed`);
      userMap[email] = existing;
    } else {
      const created = await User.create({
        email,
        name            : def.name,
        isPlatformAdmin : true,
        platformRoleId  : roleId,
        auth            : { passwordHash, passwordAlgo: "bcrypt" },
        status          : "active",
        emailVerified   : true,
      });
      log.ok(`Created: ${def.label} (${email})`);
      userMap[email] = created;
    }
  }

  return userMap;
}

// ── Phase 2b: Ensure Owner role exists (for tenant memberships) ─────────────
async function ensureOwnerRole() {
  const existing = await Role.findOne({ name: "Owner" });
  if (existing) {
    log.skip("Owner role exists");
    return;
  }
  await Role.create({
    name: "Owner",
    description: "Tenant owner with full access",
    isPlatformRole: true,
    permissions: [],
  });
  log.ok("Created Owner role for tenant memberships");
}

// ── Phase 3: Add Admins to All Existing Tenants ───────────────────────────
// Platform admins need TenantMembership records to use the admin portal's
// tenant management features (list, view detail, settings, etc.).
// This ensures all platform admins are owners of every tenant.
async function addAdminsToTenants(userMap) {
  log.phase(3, "Tenant Memberships for Platform Admins");

  // Get the Owner role
  const ownerRole = await Role.findOne({ name: "Owner" }).lean();
  if (!ownerRole) {
    log.warn("Owner role not found — skipping tenant membership seeding");
    return;
  }

  const allTenants = await Tenant.find({ deletedAt: null }).lean();
  if (!allTenants.length) {
    log.skip("No tenants found — skipping");
    return;
  }

  log.info(`Found ${allTenants.length} tenant(s) — adding platform admins as owners`);

  for (const tenant of allTenants) {
    for (const def of ADMIN_USERS) {
      const email = def.email.toLowerCase().trim();
      const user  = userMap[email] || await User.findOne({ email }).lean();
      if (!user) continue;

      const existing = await TenantMembership.findOne({
        tenantId: tenant._id,
        userId  : user._id,
      });

      if (existing) {
        log.skip(`  ${email} already in ${tenant.slug}`);
      } else {
        await TenantMembership.create({
          tenantId  : tenant._id,
          userId    : user._id,
          roleId    : ownerRole._id,
          status    : "active",
          joinedAt  : new Date(),
          isOwner   : true,
          invitedBy : user._id,
        });
        log.ok(`  Added ${email} → ${tenant.slug}`);
      }
    }
  }
}

// ── Verify ────────────────────────────────────────────────────────────────
async function verify() {
  log.phase(4, "Verification");
  const admins = await User.find({ isPlatformAdmin: true }).select("email name status").lean();
  const roles  = await Role.find({ isPlatformRole: true }).select("name permissions").lean();

  log.info(`Platform admin users  : ${admins.length}`);
  admins.forEach(u => log.ok(`  ${u.email}  [${u.status}]`));

  log.info(`Platform roles        : ${roles.length}`);
  roles.forEach(r => log.ok(`  ${r.name}  (${r.permissions.length} permissions)`));

  console.log("\n  📋  Login credentials summary:");
  console.log("  ┌──────────────────────────────┬──────────────┐");
  console.log("  │ Email                        │ Password     │");
  console.log("  ├──────────────────────────────┼──────────────┤");
  ADMIN_USERS.forEach(u => {
    const e = u.email.padEnd(28);
    const p = u.password.padEnd(12);
    console.log(`  │ ${e} │ ${p} │`);
  });
  console.log("  └──────────────────────────────┴──────────────┘");
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀  DSR Super Admin Seeder");
  console.log("─".repeat(62));

  try {
    await connectDB();
    await removeDuplicateRoles();
    await removeOldPlatformRoles();
    await fixSubscriptionIndex();
    const roleMap = await seedRoles();
    await removeStalePlatformRoles(roleMap);
    await ensureOwnerRole();
    const userMap = await seedUsers(roleMap);
    await addAdminsToTenants(userMap);
    await verify();

    console.log("\n✅  Seeding complete!\n");
    process.exit(0);
  } catch (err) {
    log.err("Fatal error", err);
    console.error(err);
    process.exit(1);
  }
}

main();
