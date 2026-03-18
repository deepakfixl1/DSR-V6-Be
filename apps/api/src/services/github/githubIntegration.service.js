import { Integration, IntegrationCredential, IntegrationResource, IntegrationSyncState } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";

const GITHUB_TYPE = "github";
const TOKEN_KIND = "oauth_access_token";

export const ensureGitHubIntegration = async (tenantId) => {
  const existing = await Integration.findOne({ tenantId, type: GITHUB_TYPE });
  if (existing) return existing;
  return Integration.create({
    tenantId,
    type: GITHUB_TYPE,
    name: "GitHub",
    status: "inactive",
    config: {},
    metadata: {}
  });
};

export const getGitHubToken = async (tenantId) => {
  const integration = await Integration.findOne({ tenantId, type: GITHUB_TYPE });
  if (!integration) {
    throw ApiError.notFound("GitHub integration not found");
  }
  const credential = await IntegrationCredential.findOne({
    tenantId,
    integrationId: integration._id,
    kind: TOKEN_KIND
  });
  if (!credential?.credentialEncrypted) {
    throw ApiError.notFound("GitHub access token not found");
  }
  let parsed;
  try {
    parsed = JSON.parse(credential.credentialEncrypted);
  } catch {
    throw ApiError.serviceUnavailable("GitHub credential is invalid");
  }
  if (!parsed?.access_token) {
    throw ApiError.serviceUnavailable("GitHub access token missing");
  }
  return { token: parsed.access_token, integration };
};

export const upsertRepoResource = async ({
  tenantId,
  integrationId,
  repoId,
  name,
  fullName,
  ownerLogin,
  defaultBranch,
  trackedBranches
}) => {
  return IntegrationResource.findOneAndUpdate(
    {
      tenantId,
      integrationId,
      provider: "github",
      resourceType: "repo",
      externalId: String(repoId)
    },
    {
      $set: {
        name,
        isEnabled: true,
        metadata: {
          fullName,
          ownerLogin,
          defaultBranch,
          trackedBranches
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const updateRepoTrackedBranches = async ({ tenantId, integrationId, repoId, trackedBranches }) => {
  const resource = await IntegrationResource.findOne({
    tenantId,
    integrationId,
    provider: "github",
    resourceType: "repo",
    externalId: String(repoId),
    isEnabled: true
  });
  if (!resource) {
    throw ApiError.notFound("Enabled GitHub repo resource not found");
  }
  resource.metadata = {
    ...(resource.metadata || {}),
    trackedBranches
  };
  await resource.save();
  return resource;
};

export const listEnabledRepoResources = async ({ tenantId, integrationId }) => {
  return IntegrationResource.find({
    tenantId,
    integrationId,
    provider: "github",
    resourceType: "repo",
    isEnabled: true
  }).sort({ name: 1 });
};

export const ensureSyncState = async ({ tenantId, integrationId, resourceId, branch }) => {
  return IntegrationSyncState.findOneAndUpdate(
    { tenantId, integrationId, resourceId, branch: branch ?? null },
    { $setOnInsert: { status: "ok" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const updateSyncStateSuccess = async ({
  tenantId,
  integrationId,
  resourceId,
  branch,
  lastCommitSha,
  lastCommitAt,
  lastRunAt
}) => {
  return IntegrationSyncState.findOneAndUpdate(
    { tenantId, integrationId, resourceId, branch: branch ?? null },
    {
      $set: {
        lastCommitSha: lastCommitSha ?? null,
        lastCommitAt: lastCommitAt ?? null,
        lastRunAt: lastRunAt ?? new Date(),
        status: "ok",
        error: null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const updateSyncStateError = async ({
  tenantId,
  integrationId,
  resourceId,
  branch,
  error,
  lastRunAt
}) => {
  return IntegrationSyncState.findOneAndUpdate(
    { tenantId, integrationId, resourceId, branch: branch ?? null },
    {
      $set: {
        lastRunAt: lastRunAt ?? new Date(),
        status: "error",
        error
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
