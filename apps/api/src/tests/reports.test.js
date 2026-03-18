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
  tenant = await Tenant.create({ name: "Beta", slug: `beta-${Date.now()}` });
  user = await User.create({
    name: "Report User",
    email: `report-${Date.now()}@example.com`,
    auth: { passwordHash: "hash" },
  });
  await TenantMembership.create({
    tenantId: tenant._id,
    userId: user._id,
    roleId: role._id,
    status: "active",
  });
  authCookie = await createAuthCookie({ userId: user._id, sessionId: "sess-2" });
};

beforeAll(async () => {
  const app = await initTestApp();
  request = app.request;
});

afterAll(async () => {
  await closeTestApp();
});

test("report submit validates required fields and types", async () => {
  await seedUser(["template.create", "template.publish", "template.view", "report.submit"]);

  const createTemplate = await request
    .post("/api/templates")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      name: "Daily Status",
      code: "DSR-REQ",
      type: "daily",
      targetAudience: "individual",
      scoringConfig: { enabled: false },
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

  const templateId = createTemplate.body?.data?._id;
  await request
    .post(`/api/templates/${templateId}/publish`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  const createReport = await request
    .post("/api/reports")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      templateId,
      period: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
      data: { s1: {} },
    });

  const reportId = createReport.body?.data?._id;
  const submitRes = await request
    .post(`/api/reports/${reportId}/submit`)
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(submitRes.status).toBe(400);
});
