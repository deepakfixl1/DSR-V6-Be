import { ApiError } from "#api/utils/ApiError.js";
import { config } from "#api/config/env.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_AGENT = "dsr-api";
const MAX_REPO_PAGES = 5;
const MAX_COMMIT_PAGES = 3;

const ensureGitHubConfig = () => {
  const { clientId, clientSecret, oauthCallbackUrl } = config.github || {};
  if (!clientId || !clientSecret || !oauthCallbackUrl) {
    throw ApiError.serviceUnavailable("GitHub OAuth is not configured");
  }
  return { clientId, clientSecret, oauthCallbackUrl };
};

const buildUrlWithQuery = (baseUrl, query) => {
  const url = new URL(baseUrl);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const parseLinkHeader = (linkHeader) => {
  if (!linkHeader) return {};
  const links = {};
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const [urlPart, relPart] = part.split(";");
    if (!urlPart || !relPart) continue;
    const url = urlPart.trim().replace(/^<|>$/g, "");
    const relMatch = relPart.match(/rel="([^"]+)"/);
    if (relMatch) links[relMatch[1]] = url;
  }
  return links;
};

export const buildAuthorizeUrl = ({ state }) => {
  const { clientId, oauthCallbackUrl } = ensureGitHubConfig();
  const scope = config.github?.oauthScopes || "repo read:org user:email";
  const url = buildUrlWithQuery("https://github.com/login/oauth/authorize", {
    client_id: clientId,
    redirect_uri: oauthCallbackUrl,
    scope,
    state
  });
  return url.toString();
};

export const exchangeCodeForToken = async ({ code }) => {
  const { clientId, clientSecret, oauthCallbackUrl } = ensureGitHubConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: oauthCallbackUrl
  });

  const response = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw ApiError.serviceUnavailable("GitHub OAuth token exchange failed", {
      status: response.status,
      message: payload.error_description || payload.error
    });
  }

  if (!payload.access_token) {
    throw ApiError.serviceUnavailable("GitHub OAuth token missing in response");
  }

  return payload;
};

export const apiRequest = async ({ token, method = "GET", url, query, body }) => {
  const targetUrl = buildUrlWithQuery(url, query);
  const response = await fetch(targetUrl, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw ApiError.serviceUnavailable("GitHub API request failed", {
      status: response.status,
      message: data?.message || response.statusText
    });
  }

  return { data, headers: response.headers };
};

export const getViewer = async ({ token }) => {
  const { data } = await apiRequest({ token, url: `${GITHUB_API_BASE}/user` });
  return data;
};

export const listRepos = async ({ token }) => {
  let url = `${GITHUB_API_BASE}/user/repos`;
  const repos = [];
  let page = 0;

  while (url && page < MAX_REPO_PAGES) {
    page += 1;
    const { data, headers } = await apiRequest({
      token,
      url,
      query: { per_page: 100, sort: "updated" }
    });
    if (Array.isArray(data)) repos.push(...data);
    const links = parseLinkHeader(headers.get("link"));
    url = links.next || null;
  }

  return repos;
};

export const listCommits = async ({ token, owner, repo, branch, since, until }) => {
  let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`;
  const commits = [];
  let page = 0;

  while (url && page < MAX_COMMIT_PAGES) {
    page += 1;
    const { data, headers } = await apiRequest({
      token,
      url,
      query: {
        sha: branch,
        since,
        until,
        per_page: 100
      }
    });
    if (Array.isArray(data)) commits.push(...data);
    const links = parseLinkHeader(headers.get("link"));
    url = links.next || null;
  }

  return commits;
};
