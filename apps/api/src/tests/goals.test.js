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
  tenant = await Tenant.create({ name: "Delta", slug: `delta-${Date.now()}` });
  user = await User.create({
    name: "Goal User",
    email: `goal-${Date.now()}@example.com`,
    auth: { passwordHash: "hash" },
  });
  await TenantMembership.create({
    tenantId: tenant._id,
    userId: user._id,
    roleId: role._id,
    status: "active",
  });
  authCookie = await createAuthCookie({ userId: user._id, sessionId: "sess-4" });
};

beforeAll(async () => {
  const app = await initTestApp();
  request = app.request;
});

afterAll(async () => {
  await closeTestApp();
});

test("update key result currentValue", async () => {
  await seedUser(["goal.create", "goal.edit"]);

  const createRes = await request
    .post("/api/goals")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      type: "team",
      ownerId: String(user._id),
      title: "Improve velocity",
      period: {
        type: "quarterly",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
      keyResults: [
        {
          title: "Ship features",
          metricType: "number",
          targetValue: 10,
          currentValue: 2,
          weight: 1,
          autoUpdateFrom: "manual",
        },
      ],
    });

  const goalId = createRes.body?.data?._id;
  const updateRes = await request
    .patch(`/api/goals/${goalId}/key-results/0`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({ currentValue: 5 });

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.data.keyResults[0].currentValue).toBe(5);
});
