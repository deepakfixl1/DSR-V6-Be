import { Router } from "express";
import crypto from "crypto";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { ApiError } from "#api/utils/ApiError.js";
import {
  sanitizeError,
  normalizeTrackedBranches
} from "#api/utils/integration.utils.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  getViewer,
  listRepos,
  listCommits
} from "#api/services/github/github.service.js";
import {
  ensureGitHubIntegration,
  getGitHubToken,
  upsertRepoResource,
  updateRepoTrackedBranches,
  listEnabledRepoResources,
  ensureSyncState,
  updateSyncStateSuccess,
  updateSyncStateError
} from "#api/services/github/githubIntegration.service.js";
import { IntegrationCredential, IntegrationResource } from "#db/models/index.js";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TZ = "Asia/Kolkata";

const getIstWindow = () => {
  const now = new Date();
  const tzNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = now.getTime() - tzNow.getTime();
  const startLocal = new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate(), 0, 0, 0, 0);
  const start = new Date(startLocal.getTime() + offsetMs);
  const end = new Date(tzNow.getTime() + offsetMs);
  return { start, end };
};

const getRepoOwnerAndName = (resource) => {
  const fullName = resource.metadata?.fullName;
  if (fullName && fullName.includes("/")) {
    const [owner, repo] = fullName.split("/");
    return { owner, repo };
  }
  return {
    owner: resource.metadata?.ownerLogin,
    repo: resource.name
  };
};

export const createGitHubIntegrationRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.get(
    "/oauth/start",
    asyncHandler(async (req, res) => {
      const integration = await ensureGitHubIntegration(req.tenantId);
      const state = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
      integration.config = {
        ...(integration.config || {}),
        oauth: { state, expiresAt }
      };
      await integration.save();

      const url = buildAuthorizeUrl({ state });
      res.json({ url });
    })
  );

  router.get(
    "/oauth/callback",
    asyncHandler(async (req, res) => {
      const { code, state } = req.query || {};
      if (!code || !state) {
        throw ApiError.badRequest("Missing code or state");
      }

      const integration = await ensureGitHubIntegration(req.tenantId);
      const oauth = integration.config?.oauth;
      if (!oauth?.state || !oauth?.expiresAt) {
        throw ApiError.badRequest("OAuth state missing");
      }
      if (oauth.state !== state) {
        throw ApiError.badRequest("Invalid OAuth state");
      }
      if (new Date(oauth.expiresAt).getTime() < Date.now()) {
        throw ApiError.badRequest("OAuth state expired");
      }

      const tokenResponse = await exchangeCodeForToken({ code });
      const accessToken = tokenResponse.access_token;

      await IntegrationCredential.findOneAndUpdate(
        {
          tenantId: req.tenantId,
          integrationId: integration._id,
          kind: "oauth_access_token"
        },
        {
          $set: {
            credentialEncrypted: JSON.stringify({ access_token: accessToken }),
            expiresAt: null
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const viewer = await getViewer({ token: accessToken });
      const nextConfig = { ...(integration.config || {}) };
      delete nextConfig.oauth;
      nextConfig.github = {
        userLogin: viewer?.login || null,
        userId: viewer?.id ? String(viewer.id) : null,
        connectedAt: new Date()
      };
      integration.config = nextConfig;
      integration.status = "active";
      await integration.save();

      res.json({ data: { status: "connected" } });
    })
  );

  router.post(
    "/disconnect",
    asyncHandler(async (req, res) => {
      const integration = await ensureGitHubIntegration(req.tenantId);

      await IntegrationCredential.deleteOne({
        tenantId: req.tenantId,
        integrationId: integration._id,
        kind: "oauth_access_token"
      });

      await IntegrationResource.updateMany(
        { tenantId: req.tenantId, integrationId: integration._id, provider: "github" },
        { $set: { isEnabled: false } }
      );

      integration.status = "inactive";
      const nextConfig = { ...(integration.config || {}) };
      delete nextConfig.github;
      delete nextConfig.oauth;
      integration.config = nextConfig;
      await integration.save();

      res.json({ data: { status: "disconnected" } });
    })
  );

  router.get(
    "/repos",
    asyncHandler(async (req, res) => {
      const { token } = await getGitHubToken(req.tenantId);
      const repos = await listRepos({ token });
      const items = repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        ownerLogin: repo.owner?.login,
        private: repo.private,
        defaultBranch: repo.default_branch,
        permissions: repo.permissions
      }));
      res.json({ data: items });
    })
  );

  router.post(
    "/resources/repos/enable",
    asyncHandler(async (req, res) => {
      const { repoId, name, fullName, ownerLogin, defaultBranch, trackedBranches } = req.body || {};
      if (!repoId || !name || !fullName || !ownerLogin || !defaultBranch) {
        throw ApiError.badRequest("Missing required repo fields");
      }
      const integration = await ensureGitHubIntegration(req.tenantId);
      const branches = normalizeTrackedBranches(trackedBranches || [defaultBranch]);
      if (!branches.length) {
        throw ApiError.badRequest("trackedBranches cannot be empty");
      }

      const resource = await upsertRepoResource({
        tenantId: req.tenantId,
        integrationId: integration._id,
        repoId,
        name,
        fullName,
        ownerLogin,
        defaultBranch,
        trackedBranches: branches
      });

      res.json({ data: resource });
    })
  );

  router.patch(
    "/resources/repos/:repoId/branches",
    asyncHandler(async (req, res) => {
      const { trackedBranches } = req.body || {};
      const branches = normalizeTrackedBranches(trackedBranches);
      if (!branches.length) {
        throw ApiError.badRequest("trackedBranches must be a non-empty array");
      }
      const integration = await ensureGitHubIntegration(req.tenantId);
      const resource = await updateRepoTrackedBranches({
        tenantId: req.tenantId,
        integrationId: integration._id,
        repoId: req.params.repoId,
        trackedBranches: branches
      });
      res.json({ data: resource });
    })
  );

  router.get(
    "/resources",
    asyncHandler(async (req, res) => {
      const integration = await ensureGitHubIntegration(req.tenantId);
      const resources = await listEnabledRepoResources({
        tenantId: req.tenantId,
        integrationId: integration._id
      });
      res.json({ data: resources });
    })
  );

  router.get(
    "/commits/today",
    asyncHandler(async (req, res) => {
      const { token, integration } = await getGitHubToken(req.tenantId);
      const { start, end } = getIstWindow();

      let resources = await listEnabledRepoResources({
        tenantId: req.tenantId,
        integrationId: integration._id
      });
      if (req.query.repoId) {
        resources = resources.filter((resource) => resource.externalId === String(req.query.repoId));
      }

      const items = [];
      const errors = [];

      for (const resource of resources) {
        const { owner, repo } = getRepoOwnerAndName(resource);
        if (!owner || !repo) {
          errors.push({
            repoFullName: resource.metadata?.fullName,
            branch: null,
            message: "Repo owner or name missing"
          });
          continue;
        }
        const defaultBranch = resource.metadata?.defaultBranch;
        const tracked = resource.metadata?.trackedBranches;
        const branches = req.query.branch
          ? [String(req.query.branch)]
          : normalizeTrackedBranches(tracked && tracked.length ? tracked : [defaultBranch]);
        if (!branches.length) {
          errors.push({
            repoFullName: resource.metadata?.fullName,
            branch: null,
            message: "No tracked branches configured"
          });
          continue;
        }

        for (const branch of branches) {
          const state = await ensureSyncState({
            tenantId: req.tenantId,
            integrationId: integration._id,
            resourceId: resource._id,
            branch
          });
          try {
            const commits = await listCommits({
              token,
              owner,
              repo,
              branch,
              since: start.toISOString(),
              until: end.toISOString()
            });

            const normalized = commits.map((commit) => ({
              sha: commit.sha,
              messageFirstLine: commit.commit?.message?.split("\n")[0] || "",
              date: commit.commit?.author?.date || commit.commit?.committer?.date || null,
              authorLogin: commit.author?.login || null,
              authorId: commit.author?.id ? String(commit.author.id) : null,
              htmlUrl: commit.html_url,
              repoFullName: resource.metadata?.fullName,
              branch
            }));

            items.push(...normalized);

            const newest = commits[0];
            await updateSyncStateSuccess({
              tenantId: req.tenantId,
              integrationId: integration._id,
              resourceId: resource._id,
              branch,
              lastCommitSha: newest?.sha || state.lastCommitSha,
              lastCommitAt: newest?.commit?.author?.date || state.lastCommitAt,
              lastRunAt: new Date()
            });
          } catch (error) {
            errors.push({
              repoFullName: resource.metadata?.fullName,
              branch,
              message: error?.message || "GitHub fetch failed"
            });
            await updateSyncStateError({
              tenantId: req.tenantId,
              integrationId: integration._id,
              resourceId: resource._id,
              branch,
              error: sanitizeError(error),
              lastRunAt: new Date()
            });
          }
        }
      }

      res.json({
        window: { start: start.toISOString(), end: end.toISOString(), tz: TZ },
        items,
        ...(errors.length ? { errors } : {})
      });
    })
  );

  router.get(
    "/commits/since-last-sync",
    asyncHandler(async (req, res) => {
      const { token, integration } = await getGitHubToken(req.tenantId);
      const { end } = getIstWindow();
      const resources = await listEnabledRepoResources({
        tenantId: req.tenantId,
        integrationId: integration._id
      });

      const results = [];
      const errors = [];

      for (const resource of resources) {
        const { owner, repo } = getRepoOwnerAndName(resource);
        if (!owner || !repo) {
          errors.push({
            repoFullName: resource.metadata?.fullName,
            branch: null,
            message: "Repo owner or name missing"
          });
          continue;
        }
        const defaultBranch = resource.metadata?.defaultBranch;
        const tracked = resource.metadata?.trackedBranches;
        const branches = normalizeTrackedBranches(tracked && tracked.length ? tracked : [defaultBranch]);
        if (!branches.length) {
          errors.push({
            repoFullName: resource.metadata?.fullName,
            branch: null,
            message: "No tracked branches configured"
          });
          continue;
        }

        for (const branch of branches) {
          const state = await ensureSyncState({
            tenantId: req.tenantId,
            integrationId: integration._id,
            resourceId: resource._id,
            branch
          });
          const since = state.lastCommitAt ? new Date(state.lastCommitAt).toISOString() : null;
          try {
            const commits = await listCommits({
              token,
              owner,
              repo,
              branch,
              since,
              until: end.toISOString()
            });
            const normalized = commits.map((commit) => ({
              sha: commit.sha,
              messageFirstLine: commit.commit?.message?.split("\n")[0] || "",
              date: commit.commit?.author?.date || commit.commit?.committer?.date || null,
              authorLogin: commit.author?.login || null,
              authorId: commit.author?.id ? String(commit.author.id) : null,
              htmlUrl: commit.html_url,
              repoFullName: resource.metadata?.fullName,
              branch
            }));

            results.push({
              repoFullName: resource.metadata?.fullName,
              branch,
              items: normalized
            });

            const newest = commits[0];
            await updateSyncStateSuccess({
              tenantId: req.tenantId,
              integrationId: integration._id,
              resourceId: resource._id,
              branch,
              lastCommitSha: newest?.sha || state.lastCommitSha,
              lastCommitAt: newest?.commit?.author?.date || state.lastCommitAt,
              lastRunAt: new Date()
            });
          } catch (error) {
            errors.push({
              repoFullName: resource.metadata?.fullName,
              branch,
              message: error?.message || "GitHub fetch failed"
            });
            await updateSyncStateError({
              tenantId: req.tenantId,
              integrationId: integration._id,
              resourceId: resource._id,
              branch,
              error: sanitizeError(error),
              lastRunAt: new Date()
            });
          }
        }
      }

      res.json({
        window: { end: end.toISOString(), tz: TZ },
        data: results,
        ...(errors.length ? { errors } : {})
      });
    })
  );

  return router;
};
