/**
 * ============================================================
 * MASTER TENANT SETUP SCRIPT — DSR-V5
 * ============================================================
 * Bootstraps a complete tenant with:
 *   Phase 1 : PlanCatalog (global plans)
 *   Phase 2 : Roles (global RBAC roles + permissions)
 *   Phase 3 : Tenant creation
 *   Phase 4 : Users (ALL users created with tenant awareness)
 *   Phase 5 : TenantMemberships (ALL users linked to tenant)
 *   Phase 6 : TenantSettings + TenantFeatures
 *   Phase 7 : Permissions (tenant-scoped granular keys)
 *   Phase 8 : ReportTemplates (DSR / WSR / Monthly / Quarterly)
 *   Phase 9 : ReportSchedules
 *   Phase 10: Sample ReportRun (queued)
 *   Phase 11: Departments + user-department assignments
 *   Phase 12: Verification summary
 *
 * ⚡ Idempotent — safe to run multiple times.
 * ⚡ Self-contained — loads .env directly, no API chain dependency.
 *
 * Usage (run from backend/ directory):
 *   node scripts/masterTenantSetup.js
 *   TENANT_SLUG=myco node scripts/masterTenantSetup.js
 * ============================================================
 */

// ─── STEP 0: Load .env BEFORE anything that needs env vars ──
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dns from "node:dns";
import dotenv from "dotenv";

// Fix: Windows system DNS (IPv6) can't resolve MongoDB SRV records via c-ares
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
// Script lives at backend/scripts/ — .env is one level up at backend/.env
dotenv.config({ path: resolve(__dirname, "../.env") });

// ─── STEP 1: Remaining imports (models are env-var-free) ────
import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

import {
  Tenant,
  User,
  Role,
  Permission,
  TenantMembership,
  TenantSettings,
  TenantFeature,
  PlanCatalog,
  ReportTemplate,
  ReportSchedule,
  ReportRun,
  Department,
} from "#db/models/index.js";

// ─── CONFIG ────────────────────────────────────────────────
const TENANT_SLUG     = process.env.TENANT_SLUG || "demo-corp";
const TENANT_NAME     = process.env.TENANT_NAME || "Demo Corp";
const BCRYPT_ROUNDS   = 12;
const DEFAULT_PASS    = "Password@123";

// ─── UTILS ─────────────────────────────────────────────────
const log = {
  phase: (n, title) => console.log(`\n${"═".repeat(60)}\n  Phase ${n}: ${title}\n${"═".repeat(60)}`),
  ok:    (msg) => console.log(`  ✅  ${msg}`),
  skip:  (msg) => console.log(`  ⏭   ${msg}`),
  info:  (msg) => console.log(`  ℹ️   ${msg}`),
  err:   (msg, e) => console.error(`  ❌  ${msg}`, e?.message || e),
};

async function upsert(Model, query, data, label) {
  const existing = await Model.findOne(query);
  if (existing) {
    log.skip(`${label} already exists`);
    return existing;
  }
  const doc = await Model.create(data);
  log.ok(`Created ${label}`);
  return doc;
}

// ─── DB CONNECTION (direct — no logger chain) ───────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.mongodb_uri;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Make sure backend/.env exists and contains MONGODB_URI."
    );
  }
  log.info(`Connecting to MongoDB: ${uri.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 5,
  });
  console.log("  ✅  MongoDB connected.\n");
}

// ═══════════════════════════════════════════════════════════
// PHASE 1: PLAN CATALOG
// ═══════════════════════════════════════════════════════════
async function seedPlans() {
  log.phase(1, "PlanCatalog — Subscription Plans");

  const plans = [
    {
      planCode: "free",
      name: "Free",
      stripePriceId: "price_free_placeholder",
      isActive: true,
      features: {
        rbac: true, auditLogs: false, apiAccess: true,
        automationWorkers: false, advancedSecurity: false, sso: false,
      },
      limits: {
        maxUsers: 3, maxStorageGB: 1, maxApiCallsPerMonth: 5000,
        auditLogRetentionDays: 7, maxAITokensPerMonth: 5000, maxAIReportsPerMonth: 10,
      },
    },
    {
      planCode: "starter",
      name: "Starter",
      stripePriceId: "price_starter_placeholder",
      isActive: true,
      features: {
        rbac: true, auditLogs: true, apiAccess: true,
        automationWorkers: false, advancedSecurity: false, sso: false,
      },
      limits: {
        maxUsers: 10, maxStorageGB: 5, maxApiCallsPerMonth: 20000,
        auditLogRetentionDays: 30, maxAITokensPerMonth: 50000, maxAIReportsPerMonth: 50,
      },
    },
    {
      planCode: "pro",
      name: "Pro",
      stripePriceId: "price_pro_placeholder",
      isActive: true,
      features: {
        rbac: true, auditLogs: true, apiAccess: true,
        automationWorkers: true, advancedSecurity: true, sso: false,
      },
      limits: {
        maxUsers: 50, maxStorageGB: 50, maxApiCallsPerMonth: 100000,
        auditLogRetentionDays: 90, maxAITokensPerMonth: 200000, maxAIReportsPerMonth: 200,
      },
    },
    {
      planCode: "enterprise",
      name: "Enterprise",
      stripePriceId: "price_enterprise_placeholder",
      isActive: true,
      features: {
        rbac: true, auditLogs: true, apiAccess: true,
        automationWorkers: true, advancedSecurity: true, sso: true,
      },
      limits: {
        maxUsers: 500, maxStorageGB: 500, maxApiCallsPerMonth: 1000000,
        auditLogRetentionDays: 365, maxAITokensPerMonth: 1000000, maxAIReportsPerMonth: 9999,
      },
    },
  ];

  const results = {};
  for (const p of plans) {
    results[p.planCode] = await upsert(
      PlanCatalog, { planCode: p.planCode }, p, `Plan: ${p.name}`
    );
  }
  return results;
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: ROLES (global RBAC)
// ═══════════════════════════════════════════════════════════
async function seedRoles() {
  log.phase(2, "Roles — Global RBAC with Permission Strings");

  // ⚠️  IMPORTANT: permissions include BOTH colon-notation (legacy) AND
  //     dot-notation required by rbac.middleware.js route guards
  //     (requirePermission / requireAnyPermission).  Without dot-notation keys,
  //     every non-owner user gets 403 on /api/reports, /api/goals, /api/blockers.
  const roleDefs = [
    {
      name: "platform_admin",
      description: "Full platform administration — God mode",
      isPlatformRole: true,
      permissions: ["*"],
    },
    {
      name: "tenant_admin",
      description: "Full control over a tenant — settings, members, billing",
      isPlatformRole: false,
      permissions: [
        // colon-notation (legacy / other middleware)
        "tenant:read", "tenant:update",
        "user:read", "user:invite", "user:update", "user:disable",
        "member:read", "member:manage",
        "role:read", "role:assign",
        "permission:read", "permission:manage",
        "task:create", "task:read", "task:update", "task:delete",
        "report:create", "report:read", "report:run", "report:export", "report:approve",
        "report_template:create", "report_template:read", "report_template:update", "report_template:delete",
        "report_schedule:create", "report_schedule:read", "report_schedule:update", "report_schedule:delete",
        "settings:read", "settings:update",
        "feature:read", "feature:manage",
        "audit:read",
        "ai:read", "ai:use",
        "billing:read", "billing:manage",
        // dot-notation — required by rbac.middleware.js route guards
        "report.view_all", "report.submit", "report.approve", "report.reject", "report.export",
        "goal.create", "goal.edit", "goal.assign", "goal.delete",
        "blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve",
        "template.create", "template.edit", "template.publish", "template.delete", "template.view",
      ],
    },
    {
      name: "manager",
      description: "Department / team manager with elevated report and task access",
      isPlatformRole: false,
      permissions: [
        // colon-notation
        "user:read", "member:read",
        "task:create", "task:read", "task:update",
        "report:create", "report:read", "report:run", "report:export", "report:approve",
        "report_template:read",
        "report_schedule:read", "report_schedule:create", "report_schedule:update",
        "ai:read", "ai:use",
        "audit:read",
        // dot-notation
        "report.view_all", "report.submit", "report.approve", "report.reject", "report.export",
        "goal.create", "goal.edit", "goal.assign",
        "blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve",
        "template.view",
      ],
    },
    {
      name: "team_lead",
      description: "Leads a team, submits & reviews reports",
      isPlatformRole: false,
      permissions: [
        // colon-notation
        "user:read", "member:read",
        "task:create", "task:read", "task:update",
        "report:create", "report:read", "report:run", "report:export",
        "report_template:read",
        "report_schedule:read",
        "ai:read", "ai:use",
        // dot-notation
        "report.view_all", "report.submit", "report.export",
        "goal.create", "goal.edit",
        "blocker.create", "blocker.assign",
        "template.view",
      ],
    },
    {
      name: "employee",
      description: "Standard employee — task worker, submits own reports",
      isPlatformRole: false,
      permissions: [
        // colon-notation
        "task:create", "task:read", "task:update",
        "report:create", "report:read",
        "report_template:read",
        "ai:read",
        // dot-notation
        "report.submit", "report.view_all",
        "goal.create",
        "blocker.create",
        "template.view",
      ],
    },
    {
      name: "hr_manager",
      description: "HR — user and performance access",
      isPlatformRole: false,
      permissions: [
        // colon-notation
        "user:read", "user:invite",
        "member:read",
        "task:read",
        "report:read", "report:run", "report:export",
        "report_template:read",
        "audit:read",
        "ai:read", "ai:use",
        // dot-notation
        "report.view_all", "report.export",
        "goal.create", "goal.edit", "goal.assign",
        "blocker.create", "blocker.assign",
        "template.view",
      ],
    },
    {
      name: "viewer",
      description: "Read-only access to reports and tasks",
      isPlatformRole: false,
      permissions: [
        // colon-notation
        "task:read",
        "report:read",
        "report_template:read",
        // dot-notation
        "report.view_all",
        "goal.create",    // minimum needed to list goals (route: requireAnyPermission([goal.*]))
        "blocker.create", // minimum needed to list blockers
        "template.view",
      ],
    },
  ];

  const roles = {};
  for (const def of roleDefs) {
    const existing = await Role.findOne({ name: def.name });
    if (existing) {
      // Always refresh permissions so dot-notation keys are added on re-runs
      await Role.updateOne({ name: def.name }, {
        $set: {
          permissions: def.permissions,
          description: def.description,
          isPlatformRole: def.isPlatformRole,
        },
      });
      log.ok(`Role: ${def.name} — permissions refreshed (${def.permissions.length} keys)`);
      roles[def.name] = await Role.findOne({ name: def.name });
    } else {
      roles[def.name] = await Role.create(def);
      log.ok(`Created Role: ${def.name}`);
    }
  }
  return roles;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: TENANT
// ═══════════════════════════════════════════════════════════
async function seedTenant(plans) {
  log.phase(3, "Tenant — Organization");

  const proPlan = plans["pro"];
  const tenant = await upsert(
    Tenant,
    { slug: TENANT_SLUG },
    {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      status: "active",
      planId: proPlan?._id ?? null,
      metadata: { setupBy: "masterTenantSetup", version: "2.0" },
    },
    `Tenant: ${TENANT_NAME} (${TENANT_SLUG})`
  );

  log.info(`Tenant ID: ${tenant._id}`);
  return tenant;
}

// ═══════════════════════════════════════════════════════════
// PHASE 4: USERS
// ═══════════════════════════════════════════════════════════
async function seedUsers() {
  log.phase(4, "Users — Platform Accounts");

  const userDefs = [
    // Platform-level accounts
    {
      label: "Platform Admin",
      email: "platformadmin@demo.com",
      name: "Platform Admin",
      isPlatformAdmin: true,
      password: "Admin@123",
    },
    // Tenant-level accounts
    {
      label: "Tenant Admin",
      email: "admin@demo.com",
      name: "Admin User",
      isPlatformAdmin: false,
      password: "Admin@123",
    },
    {
      label: "Manager",
      email: "manager@demo.com",
      name: "Sarah Manager",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
    {
      label: "Team Lead",
      email: "teamlead@demo.com",
      name: "Tom Lead",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
    {
      label: "Employee 1",
      email: "alice@demo.com",
      name: "Alice Worker",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
    {
      label: "Employee 2",
      email: "bob@demo.com",
      name: "Bob Worker",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
    {
      label: "HR Manager",
      email: "hr@demo.com",
      name: "HR Manager",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
    {
      label: "Viewer",
      email: "viewer@demo.com",
      name: "View Only",
      isPlatformAdmin: false,
      password: DEFAULT_PASS,
    },
  ];

  const users = {};
  for (const def of userDefs) {
    const email        = def.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(def.password, BCRYPT_ROUNDS);

    const existing = await User.findOne({ email });
    if (existing) {
      // Refresh password & ensure user is active
      await User.updateOne({ _id: existing._id }, {
        $set: {
          name: def.name,
          isPlatformAdmin: def.isPlatformAdmin,
          "auth.passwordHash": passwordHash,
          "auth.passwordAlgo": "bcrypt",
          status: "active",
          emailVerified: true,
        },
      });
      log.skip(`User ${email} exists — refreshed password`);
      users[def.label] = await User.findOne({ email });
    } else {
      users[def.label] = await User.create({
        email,
        name: def.name,
        isPlatformAdmin: def.isPlatformAdmin,
        auth: { passwordHash, passwordAlgo: "bcrypt" },
        status: "active",
        emailVerified: true,
      });
      log.ok(`Created User: ${def.label} (${email})`);
    }
  }

  return users;
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: TENANT MEMBERSHIPS
// ALL users (including Platform Admin) get linked to the tenant
// ═══════════════════════════════════════════════════════════
async function seedMemberships(tenant, users, roles) {
  log.phase(5, "TenantMemberships — Linking ALL Users to Tenant");

  const adminUser = users["Tenant Admin"];

  // Every user gets a tenant membership and tenantId association
  const memberships = [
    // Platform Admin is also a member so they have a tenantId context
    { userLabel: "Platform Admin", roleKey: "platform_admin", isOwner: false },
    // Tenant owner
    { userLabel: "Tenant Admin",   roleKey: "tenant_admin",   isOwner: true  },
    { userLabel: "Manager",        roleKey: "manager",        isOwner: false },
    { userLabel: "Team Lead",      roleKey: "team_lead",      isOwner: false },
    { userLabel: "Employee 1",     roleKey: "employee",       isOwner: false },
    { userLabel: "Employee 2",     roleKey: "employee",       isOwner: false },
    { userLabel: "HR Manager",     roleKey: "hr_manager",     isOwner: false },
    { userLabel: "Viewer",         roleKey: "viewer",         isOwner: false },
  ];

  const results = {};
  for (const m of memberships) {
    const user = users[m.userLabel];
    const role = roles[m.roleKey];

    if (!user || !role) {
      log.err(`Missing user (${m.userLabel}) or role (${m.roleKey}) — skipping`);
      continue;
    }

    const query = { tenantId: tenant._id, userId: user._id };
    const existing = await TenantMembership.findOne(query);
    if (existing) {
      // Update role in case it changed
      await TenantMembership.updateOne(query, {
        $set: { roleId: role._id, status: "active" },
      });
      log.skip(`Membership for ${m.userLabel} exists — ensured active`);
      results[m.userLabel] = await TenantMembership.findOne(query);
    } else {
      results[m.userLabel] = await TenantMembership.create({
        tenantId: tenant._id,
        userId: user._id,
        roleId: role._id,
        status: "active",
        joinedAt: new Date(),
        invitedBy: adminUser._id,
        isOwner: m.isOwner,
      });
      log.ok(`Membership: ${m.userLabel} (${user.email}) → ${m.roleKey}  [tenantId: ${tenant._id}]`);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// PHASE 6: TENANT SETTINGS + FEATURES
// ═══════════════════════════════════════════════════════════
async function seedTenantSettingsAndFeatures(tenant) {
  log.phase(6, "TenantSettings + TenantFeatures");

  const settings = [
    { key: "branding.companyName",      value: TENANT_NAME,    category: "branding" },
    { key: "branding.primaryColor",     value: "#2563EB",      category: "branding" },
    { key: "branding.logoUrl",          value: "",             category: "branding" },
    { key: "general.timezone",          value: "Asia/Kolkata", category: "general" },
    { key: "general.locale",            value: "en-IN",        category: "general" },
    { key: "general.currency",          value: "INR",          category: "general" },
    { key: "general.dateFormat",        value: "DD/MM/YYYY",   category: "general" },
    { key: "report.defaultFormat",      value: "PDF",          category: "report" },
    { key: "report.includeBranding",    value: true,           category: "report" },
    { key: "report.defaultTimezone",    value: "Asia/Kolkata", category: "report" },
    { key: "notification.emailEnabled", value: true,           category: "notification" },
    { key: "notification.inAppEnabled", value: true,           category: "notification" },
    { key: "security.mfaRequired",      value: false,          category: "security" },
    { key: "security.sessionTTLDays",   value: 7,              category: "security" },
    { key: "limits.maxUsers",           value: 50,             category: "limits" },
    { key: "limits.maxStorageGB",       value: 50,             category: "limits" },
  ];

  for (const s of settings) {
    const query = { tenantId: tenant._id, key: s.key };
    if (await TenantSettings.findOne(query)) {
      log.skip(`Setting "${s.key}" exists`);
    } else {
      await TenantSettings.create({ ...s, tenantId: tenant._id });
      log.ok(`Setting: ${s.key} = ${JSON.stringify(s.value)}`);
    }
  }

  const features = [
    { featureKey: "reporting",             enabled: true,  config: { formats: ["PDF", "XLSX", "CSV"] } },
    { featureKey: "ai_reports",            enabled: true,  config: { provider: "gemini" } },
    { featureKey: "report_scheduling",     enabled: true,  config: {} },
    { featureKey: "audit_logs",            enabled: true,  config: { retentionDays: 90 } },
    { featureKey: "rbac",                  enabled: true,  config: {} },
    { featureKey: "mfa",                   enabled: true,  config: {} },
    { featureKey: "api_access",            enabled: true,  config: { rateLimit: 100000 } },
    { featureKey: "integrations",          enabled: false, config: {} },
    { featureKey: "automation_workers",    enabled: true,  config: {} },
    { featureKey: "advanced_security",     enabled: true,  config: {} },
    { featureKey: "sso",                   enabled: false, config: {} },
    { featureKey: "webhooks",              enabled: false, config: {} },
    { featureKey: "performance_snapshots", enabled: true,  config: {} },
  ];

  for (const f of features) {
    const query = { tenantId: tenant._id, featureKey: f.featureKey };
    if (await TenantFeature.findOne(query)) {
      log.skip(`Feature "${f.featureKey}" exists`);
    } else {
      await TenantFeature.create({ ...f, tenantId: tenant._id });
      log.ok(`Feature: ${f.featureKey} = ${f.enabled ? "ENABLED" : "DISABLED"}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PHASE 7: PERMISSIONS (tenant-scoped granular keys)
// ═══════════════════════════════════════════════════════════
async function seedPermissions(tenant) {
  log.phase(7, "Permissions — Tenant-Scoped Granular RBAC Keys");

  const permDefs = [
    { key: "tenant:read",            name: "View Tenant",             resource: "tenant",          action: "read" },
    { key: "tenant:update",          name: "Update Tenant",           resource: "tenant",          action: "update" },
    { key: "user:read",              name: "View Users",              resource: "user",            action: "read" },
    { key: "user:invite",            name: "Invite Users",            resource: "user",            action: "invite" },
    { key: "user:update",            name: "Update Users",            resource: "user",            action: "update" },
    { key: "user:disable",           name: "Disable Users",           resource: "user",            action: "disable" },
    { key: "member:read",            name: "View Members",            resource: "member",          action: "read" },
    { key: "member:manage",          name: "Manage Members",          resource: "member",          action: "manage" },
    { key: "role:read",              name: "View Roles",              resource: "role",            action: "read" },
    { key: "role:assign",            name: "Assign Roles",            resource: "role",            action: "assign" },
    { key: "permission:read",        name: "View Permissions",        resource: "permission",      action: "read" },
    { key: "permission:manage",      name: "Manage Permissions",      resource: "permission",      action: "manage" },
    { key: "task:create",            name: "Create Tasks",            resource: "task",            action: "create" },
    { key: "task:read",              name: "View Tasks",              resource: "task",            action: "read" },
    { key: "task:update",            name: "Update Tasks",            resource: "task",            action: "update" },
    { key: "task:delete",            name: "Delete Tasks",            resource: "task",            action: "delete" },
    { key: "report:create",          name: "Create Reports",          resource: "report",          action: "create" },
    { key: "report:read",            name: "View Reports",            resource: "report",          action: "read" },
    { key: "report:run",             name: "Run Reports",             resource: "report",          action: "run" },
    { key: "report:export",          name: "Export Reports",          resource: "report",          action: "export" },
    { key: "report:approve",         name: "Approve Reports",         resource: "report",          action: "approve" },
    { key: "report:delete",          name: "Delete Reports",          resource: "report",          action: "delete" },
    { key: "report_template:create", name: "Create Report Templates", resource: "report_template", action: "create" },
    { key: "report_template:read",   name: "View Report Templates",   resource: "report_template", action: "read" },
    { key: "report_template:update", name: "Update Report Templates", resource: "report_template", action: "update" },
    { key: "report_template:delete", name: "Delete Report Templates", resource: "report_template", action: "delete" },
    { key: "report_schedule:create", name: "Create Schedules",        resource: "report_schedule", action: "create" },
    { key: "report_schedule:read",   name: "View Schedules",          resource: "report_schedule", action: "read" },
    { key: "report_schedule:update", name: "Update Schedules",        resource: "report_schedule", action: "update" },
    { key: "report_schedule:delete", name: "Delete Schedules",        resource: "report_schedule", action: "delete" },
    { key: "settings:read",          name: "View Settings",           resource: "settings",        action: "read" },
    { key: "settings:update",        name: "Update Settings",         resource: "settings",        action: "update" },
    { key: "feature:read",           name: "View Features",           resource: "feature",         action: "read" },
    { key: "feature:manage",         name: "Manage Features",         resource: "feature",         action: "manage" },
    { key: "audit:read",             name: "View Audit Logs",         resource: "audit",           action: "read" },
    { key: "ai:read",                name: "View AI Reports",         resource: "ai",              action: "read" },
    { key: "ai:use",                 name: "Use AI Features",         resource: "ai",              action: "use" },
    { key: "billing:read",           name: "View Billing",            resource: "billing",         action: "read" },
    { key: "billing:manage",         name: "Manage Billing",          resource: "billing",         action: "manage" },
  ];

  for (const p of permDefs) {
    const query = { tenantId: tenant._id, key: p.key };
    if (await Permission.findOne(query)) {
      log.skip(`Permission "${p.key}" exists`);
    } else {
      await Permission.create({ ...p, tenantId: tenant._id });
      log.ok(`Permission: ${p.key}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PHASE 8: REPORT TEMPLATES
// ═══════════════════════════════════════════════════════════
async function seedReportTemplates(tenant, users) {
  log.phase(8, "ReportTemplates — DSR / WSR / Monthly / Quarterly");

  const adminUser = users["Tenant Admin"];
  const tenantId  = tenant._id;
  const createdBy = adminUser._id;

  const templates = [
    {
      code: "DSR_STANDARD",
      name: "Daily Status Report",
      description: "Standard daily status report capturing task activity, blockers, and completion rates.",
      reportType: "DSR",
      departmentScope: "ALL",
      sections: [
        {
          key: "summary",
          title: "Day Summary",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: {}, metrics: [{ count: 1 }] },
          view: { type: "KPI" },
        },
        {
          key: "tasks_completed",
          title: "Tasks Completed Today",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: { status: "done" }, sort: { updatedAt: -1 }, limit: 50 },
          view: { type: "TABLE", columns: [{ key: "title", label: "Task" }, { key: "assignee", label: "Assignee" }, { key: "updatedAt", label: "Completed At", format: "datetime" }] },
        },
        {
          key: "tasks_inprogress",
          title: "Tasks In Progress",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: { status: "in_progress" }, sort: { priority: -1 }, limit: 50 },
          view: { type: "TABLE", columns: [{ key: "title", label: "Task" }, { key: "assignee", label: "Assignee" }, { key: "priority", label: "Priority" }] },
        },
        {
          key: "blockers",
          title: "Blockers & Risks",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: { status: "blocked" }, limit: 20 },
          view: { type: "LIST" },
        },
        {
          key: "audit_trail",
          title: "Activity Audit",
          enabled: true,
          source: { module: "audit", entity: "AuditLog", baseFilters: {}, sort: { createdAt: -1 }, limit: 100 },
          view: { type: "TABLE", columns: [{ key: "action", label: "Action" }, { key: "actor", label: "By" }, { key: "createdAt", label: "Time", format: "datetime" }] },
        },
      ],
      outputDefaults: { formats: ["PDF", "XLSX"], timezone: "Asia/Kolkata", locale: "en-IN", currency: "INR", includeBranding: true },
      access: { minPermission: "report:read" },
      status: "active",
    },
    {
      code: "WSR_STANDARD",
      name: "Weekly Status Report",
      description: "Weekly aggregated report with task throughput, team performance, and planning metrics.",
      reportType: "WSR",
      departmentScope: "ALL",
      sections: [
        {
          key: "week_kpis",
          title: "Week KPIs",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: {}, metrics: [{ totalTasks: 1 }, { completedTasks: 1 }, { blockedTasks: 1 }] },
          view: { type: "KPI" },
        },
        {
          key: "tasks_by_status",
          title: "Tasks by Status",
          enabled: true,
          source: { module: "tasks", entity: "Task", groupBy: { status: 1 }, metrics: [{ count: 1 }] },
          view: { type: "CHART", chart: { type: "bar", xKey: "status", yKey: "count" } },
        },
        {
          key: "team_performance",
          title: "Team Performance",
          enabled: true,
          source: { module: "tasks", entity: "Task", groupBy: { assigneeId: 1 }, metrics: [{ tasksCompleted: 1 }, { avgTimeToComplete: 1 }] },
          view: { type: "TABLE" },
        },
        {
          key: "upcoming_next_week",
          title: "Planned for Next Week",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: { status: "todo" }, sort: { dueDate: 1 }, limit: 50 },
          view: { type: "TABLE" },
        },
        {
          key: "risks_escalations",
          title: "Risks & Escalations",
          enabled: true,
          source: { module: "tasks", entity: "Task", baseFilters: { priority: "critical" }, limit: 20 },
          view: { type: "LIST" },
        },
      ],
      outputDefaults: { formats: ["PDF", "XLSX", "CSV"], timezone: "Asia/Kolkata", locale: "en-IN", currency: "INR", includeBranding: true },
      access: { minPermission: "report:read" },
      status: "active",
    },
    {
      code: "MONTHLY_EXEC",
      name: "Monthly Executive Report",
      description: "Monthly executive summary with OKR tracking, headcount, and performance snapshots.",
      reportType: "MONTHLY",
      departmentScope: "ALL",
      sections: [
        {
          key: "executive_summary",
          title: "Executive Summary",
          enabled: true,
          source: { module: "tasks", entity: "Task", metrics: [{ totalCompleted: 1 }, { totalCreated: 1 }, { completionRate: 1 }] },
          view: { type: "KPI" },
        },
        {
          key: "department_breakdown",
          title: "Department Breakdown",
          enabled: true,
          source: { module: "tasks", entity: "Task", groupBy: { departmentId: 1 }, metrics: [{ count: 1 }, { completionRate: 1 }] },
          view: { type: "CHART", chart: { type: "pie", nameKey: "department", valueKey: "completionRate" } },
        },
        {
          key: "performance_snapshots",
          title: "Performance Snapshots",
          enabled: true,
          source: { module: "performance", entity: "PerformanceSnapshot", baseFilters: {}, sort: { snapshotAt: -1 }, limit: 200 },
          view: { type: "TABLE" },
        },
        {
          key: "ai_insights",
          title: "AI Insights",
          enabled: true,
          source: { module: "ai", entity: "AIInsight", baseFilters: {}, sort: { createdAt: -1 }, limit: 10 },
          view: { type: "TEXT" },
        },
      ],
      outputDefaults: { formats: ["PDF", "XLSX"], timezone: "Asia/Kolkata", locale: "en-IN", currency: "INR", includeBranding: true },
      access: { minPermission: "report:read" },
      status: "active",
    },
    {
      code: "QUARTERLY_REVIEW",
      name: "Quarterly Review Report",
      description: "Quarterly deep-dive: OKRs, financials summary, headcount, and AI recommendations.",
      reportType: "QUARTERLY",
      departmentScope: "ALL",
      sections: [
        {
          key: "okr_summary",
          title: "OKR Summary",
          enabled: true,
          source: { module: "tasks", entity: "Task", groupBy: { objective: 1 }, metrics: [{ progress: 1 }] },
          view: { type: "TABLE" },
        },
        {
          key: "ai_recommendations",
          title: "AI Recommendations",
          enabled: true,
          source: { module: "ai", entity: "AIRecommendation", baseFilters: { status: "active" }, sort: { priority: -1 }, limit: 20 },
          view: { type: "LIST" },
        },
        {
          key: "headcount_summary",
          title: "Headcount & Team Summary",
          enabled: true,
          source: { module: "membership", entity: "TenantMembership", baseFilters: { status: "active" }, groupBy: { roleId: 1 }, metrics: [{ count: 1 }] },
          view: { type: "CHART", chart: { type: "bar", xKey: "role", yKey: "count" } },
        },
        {
          key: "productivity_trend",
          title: "Productivity Trend",
          enabled: true,
          source: { module: "performance", entity: "PerformanceSnapshot", groupBy: { weekNumber: 1 }, metrics: [{ avgScore: 1 }] },
          view: { type: "CHART", chart: { type: "line", xKey: "week", yKey: "avgScore" } },
        },
      ],
      outputDefaults: { formats: ["PDF"], timezone: "Asia/Kolkata", locale: "en-IN", currency: "INR", includeBranding: true },
      access: { minPermission: "report:read" },
      status: "active",
    },
  ];

  const results = {};
  for (const t of templates) {
    const query = { tenantId, code: t.code };
    const existing = await ReportTemplate.findOne(query);
    if (existing) {
      log.skip(`ReportTemplate "${t.code}" exists`);
      results[t.code] = existing;
    } else {
      results[t.code] = await ReportTemplate.create({ ...t, tenantId, createdBy });
      log.ok(`ReportTemplate: ${t.code} — ${t.name}`);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// PHASE 9: REPORT SCHEDULES
// ═══════════════════════════════════════════════════════════
async function seedReportSchedules(tenant, templates, users) {
  log.phase(9, "ReportSchedules — Automated Report Cadences");

  const adminUser = users["Tenant Admin"];
  const tenantId  = tenant._id;
  const createdBy = adminUser._id;

  const tomorrow9AM = new Date();
  tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
  tomorrow9AM.setHours(9, 0, 0, 0);

  const scheduleDefs = [
    {
      name: "Daily Status Report — All Teams",
      templateCode: "DSR_STANDARD",
      cadence: "DAILY",
      timezone: "Asia/Kolkata",
      runAt: { hour: 18, minute: 0 },
      scope: { type: "TENANT" },
      delivery: {
        channels: ["IN_APP", "EMAIL"],
        recipients: { emails: ["admin@demo.com", "manager@demo.com"], userIds: [] },
        subjectTemplate: "Daily Status Report — {{date}}",
      },
      output: { formats: ["PDF", "XLSX"], includeBranding: true },
    },
    {
      name: "Weekly Status Report — Monday Morning",
      templateCode: "WSR_STANDARD",
      cadence: "WEEKLY",
      timezone: "Asia/Kolkata",
      runAt: { hour: 8, minute: 0 },
      weekday: 1,
      scope: { type: "TENANT" },
      delivery: {
        channels: ["IN_APP", "EMAIL"],
        recipients: { emails: ["admin@demo.com", "manager@demo.com", "teamlead@demo.com"], userIds: [] },
        subjectTemplate: "Weekly Status Report — Week {{week}}, {{year}}",
      },
      output: { formats: ["PDF", "CSV"], includeBranding: true },
    },
    {
      name: "Monthly Executive Report — 1st of Month",
      templateCode: "MONTHLY_EXEC",
      cadence: "MONTHLY",
      timezone: "Asia/Kolkata",
      runAt: { hour: 9, minute: 0 },
      dayOfMonth: 1,
      scope: { type: "TENANT" },
      delivery: {
        channels: ["IN_APP", "EMAIL"],
        recipients: { emails: ["admin@demo.com"], userIds: [] },
        subjectTemplate: "Monthly Executive Report — {{month}} {{year}}",
      },
      output: { formats: ["PDF"], includeBranding: true },
    },
    {
      name: "Quarterly Review — First Day of Quarter",
      templateCode: "QUARTERLY_REVIEW",
      cadence: "QUARTERLY",
      timezone: "Asia/Kolkata",
      runAt: { hour: 9, minute: 0 },
      scope: { type: "TENANT" },
      delivery: {
        channels: ["IN_APP", "EMAIL"],
        recipients: { emails: ["admin@demo.com", "manager@demo.com"], userIds: [] },
        subjectTemplate: "Quarterly Review — Q{{quarter}} {{year}}",
      },
      output: { formats: ["PDF"], includeBranding: true },
    },
  ];

  for (const def of scheduleDefs) {
    const tmpl = templates[def.templateCode];
    if (!tmpl) {
      log.err(`Template "${def.templateCode}" not found — skipping schedule "${def.name}"`);
      continue;
    }

    const query = { tenantId, templateId: tmpl._id, name: def.name };
    if (await ReportSchedule.findOne(query)) {
      log.skip(`Schedule "${def.name}" exists`);
    } else {
      const { templateCode, ...scheduleData } = def;
      await ReportSchedule.create({
        ...scheduleData,
        tenantId,
        templateId: tmpl._id,
        status: "active",
        nextRunAt: tomorrow9AM,
        createdBy,
      });
      log.ok(`Schedule: ${def.name} (${def.cadence})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PHASE 10: SAMPLE REPORT RUN
// ═══════════════════════════════════════════════════════════
async function seedSampleReportRun(tenant, templates, users) {
  log.phase(10, "Sample ReportRun — Demo Queued Run");

  const adminUser  = users["Tenant Admin"];
  const dsrTemplate = templates["DSR_STANDARD"];

  if (!dsrTemplate) {
    log.err("DSR_STANDARD template not found — skipping sample run");
    return;
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const query = {
    tenantId: tenant._id,
    templateId: dsrTemplate._id,
    "period.from": yesterday,
    "period.to": endOfYesterday,
  };

  if (await ReportRun.findOne(query)) {
    log.skip("Sample ReportRun for yesterday already exists");
    return;
  }

  await ReportRun.create({
    tenantId: tenant._id,
    templateId: dsrTemplate._id,
    scheduleId: null,
    period: {
      from: yesterday,
      to: endOfYesterday,
      label: `DSR — ${yesterday.toDateString()}`,
    },
    scopeSnapshot: { type: "TENANT" },
    outputs: [],
    dataSummary: {},
    status: "queued",
    job: { queue: "reports", jobId: `seed-dsr-${Date.now()}`, attempts: 0 },
    triggeredBy: adminUser._id,
    triggerType: "manual",
  });

  log.ok("Sample ReportRun created (status: queued)");
}

// ═══════════════════════════════════════════════════════════
// PHASE 11: DEPARTMENTS + USER-DEPARTMENT ASSIGNMENTS
// ═══════════════════════════════════════════════════════════
async function seedDepartments(tenant, memberships, templates) {
  log.phase(11, "Departments — Create & Assign Users to Departments");

  const tenantId = tenant._id;
  const dsrTemplate = templates["DSR_STANDARD"];

  // ── Department definitions ──────────────────────────────
  const deptDefs = [
    { name: "Engineering",      slug: "engineering",       type: "IT",        description: "Software engineering and IT operations" },
    { name: "Human Resources",  slug: "human-resources",   type: "HR",        description: "HR, recruitment, and people operations" },
    { name: "Sales",            slug: "sales",             type: "SALES",     description: "Sales and business development" },
    { name: "Marketing",        slug: "marketing",         type: "MARKETING", description: "Marketing, brand, and communications" },
  ];

  const departments = {};
  for (const def of deptDefs) {
    const query = { tenantId, slug: def.slug };
    const existing = await Department.findOne(query);
    if (existing) {
      log.skip(`Department "${def.name}" exists`);
      departments[def.slug] = existing;
    } else {
      departments[def.slug] = await Department.create({
        ...def,
        tenantId,
        status: "ACTIVE",
        templateId: dsrTemplate?._id ?? null,
      });
      log.ok(`Department: ${def.name} (${def.type})`);
    }
  }

  // ── User → Department assignments ────────────────────────
  // Map: userLabel → department slug
  // - manager, alice (Employee 1), bob (Employee 2), viewer → Engineering
  // - hr → Human Resources
  // - teamlead → Sales
  // - Tenant Admin, Platform Admin → null (tenant-wide roles, no department needed)
  const assignments = [
    { userLabel: "Manager",       deptSlug: "engineering" },
    { userLabel: "Employee 1",    deptSlug: "engineering" },
    { userLabel: "Employee 2",    deptSlug: "engineering" },
    { userLabel: "Viewer",        deptSlug: "engineering" },
    { userLabel: "Team Lead",     deptSlug: "sales" },
    { userLabel: "HR Manager",    deptSlug: "human-resources" },
    // Tenant Admin and Platform Admin are tenant-wide — no department
  ];

  for (const { userLabel, deptSlug } of assignments) {
    const membership = memberships[userLabel];
    const dept = departments[deptSlug];

    if (!membership || !dept) {
      log.err(`Missing membership (${userLabel}) or department (${deptSlug}) — skipping`);
      continue;
    }

    const currentDeptId = membership.departmentId ? String(membership.departmentId) : null;
    const targetDeptId = String(dept._id);

    if (currentDeptId === targetDeptId) {
      log.skip(`${userLabel} already assigned to ${dept.name}`);
    } else {
      await TenantMembership.updateOne(
        { _id: membership._id },
        { $set: { departmentId: dept._id } }
      );
      log.ok(`${userLabel} → ${dept.name}`);
    }
  }

  // ── Set department managers ────────────────────────────
  // Engineering manager = Manager's membership
  // HR manager = HR Manager's membership
  if (memberships["Manager"] && departments["engineering"]) {
    await Department.updateOne(
      { _id: departments["engineering"]._id },
      { $set: { managerId: memberships["Manager"]._id } }
    );
    log.ok(`Engineering department manager → Sarah Manager`);
  }
  if (memberships["HR Manager"] && departments["human-resources"]) {
    await Department.updateOne(
      { _id: departments["human-resources"]._id },
      { $set: { managerId: memberships["HR Manager"]._id } }
    );
    log.ok(`Human Resources department manager → HR Manager`);
  }

  return departments;
}

// ═══════════════════════════════════════════════════════════
// PHASE 12: VERIFICATION — confirm everything is in the DB
// ═══════════════════════════════════════════════════════════
async function verifySetup(tenant) {
  log.phase(12, "Verification — Confirming DB State");

  const tenantId = tenant._id;

  const [
    userCount,
    membershipCount,
    memberships,
    roleCount,
    permCount,
    settingsCount,
    featureCount,
    templateCount,
    scheduleCount,
    runCount,
    deptCount,
    departments,
  ] = await Promise.all([
    User.countDocuments(),
    TenantMembership.countDocuments({ tenantId }),
    TenantMembership.find({ tenantId }).populate("userId", "email name isPlatformAdmin").populate("roleId", "name").populate("departmentId", "name slug"),
    Role.countDocuments(),
    Permission.countDocuments({ tenantId }),
    TenantSettings.countDocuments({ tenantId }),
    TenantFeature.countDocuments({ tenantId }),
    ReportTemplate.countDocuments({ tenantId }),
    ReportSchedule.countDocuments({ tenantId }),
    ReportRun.countDocuments({ tenantId }),
    Department.countDocuments({ tenantId }),
    Department.find({ tenantId }).lean(),
  ]);

  console.log(`\n  📊 DB Counts for Tenant "${TENANT_NAME}" (${tenantId}):`);
  console.log(`     Users (global)  : ${userCount}`);
  console.log(`     Memberships     : ${membershipCount}  ← all users have tenantId via this`);
  console.log(`     Roles           : ${roleCount}`);
  console.log(`     Permissions     : ${permCount}`);
  console.log(`     Settings        : ${settingsCount}`);
  console.log(`     Features        : ${featureCount}`);
  console.log(`     ReportTemplates : ${templateCount}`);
  console.log(`     ReportSchedules : ${scheduleCount}`);
  console.log(`     ReportRuns      : ${runCount}`);
  console.log(`     Departments     : ${deptCount}`);

  console.log(`\n  🏢 Departments:`);
  for (const d of departments) {
    console.log(`     ${String(d.name).padEnd(20)} (${d.type})  [id: ${d._id}]`);
  }

  console.log(`\n  👥 Users with Tenant Membership (tenantId: ${tenantId}):`);
  for (const m of memberships) {
    const u = m.userId;
    const r = m.roleId;
    const d = m.departmentId;
    const deptName = d?.name ?? "— none —";
    console.log(`     ${String(u?.email || "???").padEnd(32)} → ${String(r?.name || "???").padEnd(16)}  dept: ${deptName.padEnd(20)}  [membershipId: ${m._id}]`);
  }

  const missingMemberships = await User.find({
    _id: { $nin: memberships.map((m) => m.userId?._id) },
  }).select("email name");

  if (missingMemberships.length > 0) {
    console.log(`\n  ⚠️  Users WITHOUT tenant membership:`);
    for (const u of missingMemberships) {
      console.log(`     ${u.email} — no tenantId link yet`);
    }
  } else {
    log.ok("All users have a tenant membership (tenantId linked)");
  }

  // Check for department-scoped users without department assignment
  const deptScopedRoles = new Set(["employee", "manager", "team_lead"]);
  const noDeptUsers = memberships.filter((m) => {
    const roleName = m.roleId?.name?.toLowerCase();
    return deptScopedRoles.has(roleName) && !m.departmentId;
  });
  if (noDeptUsers.length > 0) {
    console.log(`\n  ⚠️  Department-scoped users WITHOUT department:`);
    for (const m of noDeptUsers) {
      console.log(`     ${m.userId?.email} (${m.roleId?.name}) — will be BLOCKED by departmentScope middleware`);
    }
  } else {
    log.ok("All department-scoped users have a department assigned");
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           DSR-V5  Master Tenant Setup Script                 ║
║           Tenant : ${TENANT_NAME.padEnd(40)}║
║           Slug   : ${TENANT_SLUG.padEnd(40)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  try {
    await connectDB();

    const plans       = await seedPlans();
    const roles       = await seedRoles();
    const tenant      = await seedTenant(plans);
    const users       = await seedUsers();
    const memberships = await seedMemberships(tenant, users, roles);
                        await seedTenantSettingsAndFeatures(tenant);
                        await seedPermissions(tenant);
    const templates   = await seedReportTemplates(tenant, users);
                        await seedReportSchedules(tenant, templates, users);
                        await seedSampleReportRun(tenant, templates, users);
                        await seedDepartments(tenant, memberships, templates);
                        await verifySetup(tenant);

    console.log(`
${"═".repeat(62)}
  ✅  MASTER SETUP COMPLETE — DSR-V5

  Tenant   : ${TENANT_NAME}
  Slug     : ${TENANT_SLUG}
  Tenant ID: ${tenant._id}

  👤 Login Credentials
  ─────────────────────────────────────────────────────────────
  Platform Admin : platformadmin@demo.com   / Admin@123
  Tenant Admin   : admin@demo.com           / Admin@123
  Manager        : manager@demo.com         / Password@123
  Team Lead      : teamlead@demo.com        / Password@123
  Employee 1     : alice@demo.com           / Password@123
  Employee 2     : bob@demo.com             / Password@123
  HR Manager     : hr@demo.com              / Password@123
  Viewer         : viewer@demo.com          / Password@123

  📋 What was set up
  ─────────────────────────────────────────────────────────────
  • 4 PlanCatalog entries (free / starter / pro / enterprise)
  • 7 Global Roles (platform_admin, tenant_admin, manager…)
  • 1 Tenant   → ${TENANT_SLUG}
  • 8 Users    → all linked to tenant via TenantMembership
  • 8 TenantMemberships (Platform Admin NOW included)
  • 16 TenantSettings
  • 13 TenantFeatures
  • 39 Permissions (tenant-scoped)
  • 4 ReportTemplates (DSR / WSR / Monthly / Quarterly)
  • 4 ReportSchedules (Daily / Weekly / Monthly / Quarterly)
  • 1 Sample ReportRun (queued)
  • 4 Departments (Engineering, HR, Sales, Marketing)

  🏢 Department Assignments
  ─────────────────────────────────────────────────────────────
  • Engineering  → manager, alice, bob, viewer
  • HR           → hr
  • Sales        → teamlead
  • Marketing    → (unassigned)
  • admin, platformadmin → no department (tenant-wide roles)

  💡 Note: "tenantId" for a user is stored in TenantMembership
     (not on the User document) — this is the correct multi-
     tenant architecture. Every user above has a membership row
     with tenantId = ${tenant._id}
${"═".repeat(62)}
    `);

  } catch (err) {
    console.error("\n❌ SETUP FAILED:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    console.log("🔌 MongoDB disconnected.");
  }
}

main();
