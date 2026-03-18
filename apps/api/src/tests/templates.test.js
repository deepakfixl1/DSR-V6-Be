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
  tenant = await Tenant.create({ name: "Acme", slug: `acme-${Date.now()}` });
  user = await User.create({
    name: "Test User",
    email: `user-${Date.now()}@example.com`,
    auth: { passwordHash: "hash" },
  });
  await TenantMembership.create({
    tenantId: tenant._id,
    userId: user._id,
    roleId: role._id,
    status: "active",
  });
  authCookie = await createAuthCookie({ userId: user._id, sessionId: "sess-1" });
};

beforeAll(async () => {
  const app = await initTestApp();
  request = app.request;
});

afterAll(async () => {
  await closeTestApp();
});

test("publish validates scoring expression", async () => {
  await seedUser(["template.create", "template.publish", "template.view"]);

  const createRes = await request
    .post("/api/templates")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      name: "Daily Status",
      code: "DSR",
      type: "daily",
      targetAudience: "team",
      scoringConfig: { enabled: true, maxScore: 100, calculationLogic: "1 + * 2" },
      sections: [
        {
          sectionId: "s1",
          title: "Section",
          fields: [
            { fieldId: "f1", label: "Score", type: "core.number", required: true },
          ],
        },
      ],
    });

  const templateId = createRes.body?.data?._id;
  const publishRes = await request
    .post(`/api/templates/${templateId}/publish`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(publishRes.status).toBe(400);
});

test("clone creates new draft version+1", async () => {
  await seedUser(["template.create", "template.publish", "template.view"]);

  const createRes = await request
    .post("/api/templates")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      name: "Weekly Report",
      code: "WSR",
      type: "weekly",
      targetAudience: "team",
      scoringConfig: { enabled: false },
      sections: [],
    });

  const templateId = createRes.body?.data?._id;
  await request
    .post(`/api/templates/${templateId}/publish`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  const cloneRes = await request
    .post("/api/templates/WSR/clone")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(cloneRes.status).toBe(201);
  expect(cloneRes.body.data.status).toBe("draft");
  expect(cloneRes.body.data.version).toBe(2);
});

test("rbac denies unauthorized publish", async () => {
  await seedUser(["template.create", "template.view"]);

  const createRes = await request
    .post("/api/templates")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      name: "Monthly Report",
      code: "MSR",
      type: "monthly",
      targetAudience: "team",
      sections: [],
    });

  const templateId = createRes.body?.data?._id;
  const publishRes = await request
    .post(`/api/templates/${templateId}/publish`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(publishRes.status).toBe(403);
});
