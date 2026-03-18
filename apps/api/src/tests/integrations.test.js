import { initTestApp, closeTestApp, createAuthCookie } from "./testUtils.js";
import {
  Integration,
  IntegrationCredential,
  IntegrationResource,
  Role,
  Tenant,
  TenantMembership,
  User
} from "#db/models/index.js";

let request;
let tenant;
let user;
let authCookie;

const seedUser = async () => {
  const role = await Role.create({ name: `role-${Math.random()}`, permissions: [] });
  tenant = await Tenant.create({ name: "Integration Tenant", slug: `tenant-${Date.now()}` });
  user = await User.create({
    name: "Integration User",
    email: `integration-${Date.now()}@example.com`,
    auth: { passwordHash: "hash" }
  });
  await TenantMembership.create({
    tenantId: tenant._id,
    userId: user._id,
    roleId: role._id,
    status: "active"
  });
  authCookie = await createAuthCookie({ userId: user._id, sessionId: "sess-int" });
};

beforeAll(async () => {
  const app = await initTestApp();
  request = app.request;
});

afterAll(async () => {
  await closeTestApp();
});

test("integrations list/get/patch sanitizes config and updates safe fields", async () => {
  await seedUser();
  const integration = await Integration.create({
    tenantId: tenant._id,
    type: "github",
    name: "GitHub",
    status: "inactive",
    config: {
      oauth: { state: "secret", expiresAt: new Date(Date.now() + 10000) },
      access_token: "token-123",
      safe: { displayName: "Old" }
    }
  });

  const listRes = await request
    .get("/v1/integrations")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));
  expect(listRes.status).toBe(200);
  const listItem = listRes.body?.data?.find((item) => item.id === String(integration._id));
  expect(listItem).toBeTruthy();
  expect(listItem.config?.oauth).toBeUndefined();
  expect(listItem.config?.access_token).toBeUndefined();

  const getRes = await request
    .get("/v1/integrations/github")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));
  expect(getRes.status).toBe(200);
  expect(getRes.body?.data?.config?.oauth).toBeUndefined();

  const patchRes = await request
    .patch("/v1/integrations/github")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      status: "active",
      config: { safe: { displayName: "New Name" } }
    });
  expect(patchRes.status).toBe(200);
  expect(patchRes.body?.data?.status).toBe("active");
  expect(patchRes.body?.data?.config?.safe?.displayName).toBe("New Name");
});

test("credentials list excludes credentialEncrypted", async () => {
  await seedUser();
  const integration = await Integration.create({
    tenantId: tenant._id,
    type: "github",
    name: "GitHub",
    status: "active"
  });

  await IntegrationCredential.create({
    tenantId: tenant._id,
    integrationId: integration._id,
    kind: "oauth_access_token",
    credentialEncrypted: JSON.stringify({ access_token: "secret" })
  });

  const res = await request
    .get("/v1/integrations/github/credentials")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(res.status).toBe(200);
  expect(res.body?.data?.[0]?.credentialEncrypted).toBeUndefined();
  expect(res.body?.data?.[0]?.kind).toBe("oauth_access_token");
});

test("oauth callback with wrong state fails", async () => {
  await seedUser();
  await Integration.create({
    tenantId: tenant._id,
    type: "github",
    name: "GitHub",
    status: "inactive",
    config: { oauth: { state: "expected", expiresAt: new Date(Date.now() + 10000) } }
  });

  const res = await request
    .get("/v1/integrations/github/oauth/callback?code=abc&state=wrong")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id));

  expect(res.status).toBe(400);
});

test("enable repo creates integration resource", async () => {
  await seedUser();
  await Integration.create({
    tenantId: tenant._id,
    type: "github",
    name: "GitHub",
    status: "active"
  });

  const res = await request
    .post("/v1/integrations/github/resources/repos/enable")
    .set("Cookie", authCookie)
    .set("x-tenant-id", String(tenant._id))
    .send({
      repoId: "123",
      name: "repo",
      fullName: "octo/repo",
      ownerLogin: "octo",
      defaultBranch: "main",
      trackedBranches: ["main", "develop", "main"]
    });

  expect(res.status).toBe(200);
  const resource = await IntegrationResource.findOne({
    tenantId: tenant._id,
    externalId: "123"
  });
  expect(resource).toBeTruthy();
  expect(resource.metadata?.trackedBranches?.length).toBe(2);
});
