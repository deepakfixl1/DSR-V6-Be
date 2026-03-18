import { initTestApp, closeTestApp, createAuthCookie } from "./testUtils.js";
import { Role, Tenant, User, TenantMembership } from "#db/models/index.js";

let request;
let tenant;
let user;
let authCookie;

const seedUser = async (permissions) => {
  const role = await Role.create({
    name: `role-${Math.random()}`,
    permissions,
  });
  tenant = await Tenant.create({ name: "Gamma", slug: `gamma-${Date.now()}` });
  user = await User.create({
    name: "Blocker User",
    email: `blocker-${Date.now()}@example.com`,
    auth: { passwordHash: "hash" },
  });
  await TenantMembership.create({
    tenantId: tenant._id,
    userId: user._id,
    roleId: role._id,
    status: "active",
  });
  authCookie = await createAuthCookie({ userId: user._id, sessionId: "sess-3" });
};

beforeAll(async () => {
  const app = await initTestApp();
  request = app.request;
});

afterAll(async () => {
  await closeTestApp();
});

test("blocker escalate increments level and status", async () => {
  await seedUser(["blocker.create", "blocker.escalate"]);

  const createRes = await request
    .post("/api/blockers")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      type: "technical",
      severity: "high",
      title: "API latency",
      description: "Investigate latency spikes",
    });

  const blockerId = createRes.body?.data?._id;
  const escalateRes = await request
    .patch(`/api/blockers/${blockerId}/escalate`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(escalateRes.status).toBe(200);
  expect(escalateRes.body.data.status).toBe("escalated");
  expect(escalateRes.body.data.escalation.level).toBe(1);
});
