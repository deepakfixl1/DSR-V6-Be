import dotenv from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRootEnvPath = resolve(__dirname, "../../../../.env");
dotenv.config({ path: repoRootEnvPath });

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const sameSiteFromEnv = z.preprocess((value) => {
  if (typeof value === "string") return value.toLowerCase();
  return value;
}, z.enum(["strict", "lax", "none"]));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WS_PORT: z.coerce.number().int().positive().default(4001),
  APP_NAME: z.string().min(1).default("dsr-api"),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
  LANDING_PAGE_URL: z.string().url().optional(),
  TENANT_PLATFORM_URL: z.string().url().optional(),
  SUPER_ADMIN_URL: z.string().url().optional(),
  SUPER_ADMIN_PUBLIC_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum([
      "fatal",
      "error",
      "warn",
      "info",
      "http",
      "verbose",
      "debug",
      "trace",
      "silly",
      "silent"
    ])
    .default("info"),
  CORS_ORIGIN: z.string().min(1).optional(),
  MONGODB_URI: z.string().min(1),
  MONGODB_URI_STANDARD: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().min(1),
  QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_EXPIRY: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRY: z.string().min(1).default("7d"),
  JWT_REFRESH_COOKIE_NAME: z.string().min(1).default("refreshToken"),
  JWT_REFRESH_COOKIE_HTTP_ONLY: booleanFromEnv.default(true),
  JWT_REFRESH_COOKIE_SECURE: booleanFromEnv.default(false),
  JWT_REFRESH_COOKIE_SAME_SITE: sameSiteFromEnv.default("strict"),
  JWT_REFRESH_COOKIE_MAX_AGE: z.coerce.number().int().positive().default(604800000),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_OAUTH_CALLBACK_URL: z.string().url().optional(),
  GITHUB_OAUTH_SCOPES: z.string().min(1).optional()
});

const rawEnv = {
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI ?? process.env.mongodb_uri,
  MONGODB_URI_STANDARD: process.env.MONGODB_URI_STANDARD ?? process.env.mongodb_uri_standard,
  REDIS_URL: process.env.REDIS_URL ?? process.env.redis_url,
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? process.env.jwt_access_secret,
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? process.env.jwt_refresh_secret,
  JWT_ACCESS_EXPIRY:
    process.env.JWT_ACCESS_EXPIRY ?? process.env.JWT_EXPIRES_IN ?? process.env.jwt_access_expiry,
  JWT_REFRESH_EXPIRY:
    process.env.JWT_REFRESH_EXPIRY ?? process.env.jwt_refresh_expiry ?? "7d",
  JWT_REFRESH_COOKIE_NAME:
    process.env.JWT_REFRESH_COOKIE_NAME ?? process.env.jwt_refresh_cookie_name,
  JWT_REFRESH_COOKIE_HTTP_ONLY:
    process.env.JWT_REFRESH_COOKIE_HTTP_ONLY ?? process.env.jwt_refresh_cookie_http_only,
  JWT_REFRESH_COOKIE_SECURE:
    process.env.JWT_REFRESH_COOKIE_SECURE ?? process.env.jwt_refresh_cookie_secure,
  JWT_REFRESH_COOKIE_SAME_SITE:
    process.env.JWT_REFRESH_COOKIE_SAME_SITE ?? process.env.jwt_refresh_cookie_same_site,
  JWT_REFRESH_COOKIE_MAX_AGE:
    process.env.JWT_REFRESH_COOKIE_MAX_AGE ?? process.env.jwt_refresh_cookie_max_age,
  SMTP_HOST: process.env.SMTP_HOST ?? process.env.smtp_host,
  SMTP_PORT: process.env.SMTP_PORT ?? process.env.smtp_port,
  SMTP_SECURE: process.env.SMTP_SECURE ?? process.env.smtp_secure,
  SMTP_USER: process.env.SMTP_USER ?? process.env.smtp_user,
  SMTP_PASS: process.env.SMTP_PASS ?? process.env.smtp_pass,
  SMTP_FROM: process.env.SMTP_FROM ?? process.env.smtp_from,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? process.env.openai_api_key,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? process.env.openai_model,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? process.env.openai_base_url,
  QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY ?? process.env.queue_concurrency,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL ?? process.env.app_public_url,
  LANDING_PAGE_URL: process.env.LANDING_PAGE_URL ?? process.env.landing_page_url,
  TENANT_PLATFORM_URL: process.env.TENANT_PLATFORM_URL ?? process.env.tenant_platform_url,
  SUPER_ADMIN_URL: process.env.SUPER_ADMIN_URL ?? process.env.super_admin_url,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? process.env.cors_origin,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? process.env.stripe_secret_key,
  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET ?? process.env.stripe_webhook_secret ?? "",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? process.env.github_client_id,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? process.env.github_client_secret,
  GITHUB_OAUTH_CALLBACK_URL:
    process.env.GITHUB_OAUTH_CALLBACK_URL ?? process.env.github_oauth_callback_url,
  GITHUB_OAUTH_SCOPES: process.env.GITHUB_OAUTH_SCOPES ?? process.env.github_oauth_scopes
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const { fieldErrors } = parsed.error.flatten();
  throw new Error(`Invalid environment variables: ${JSON.stringify(fieldErrors)}`);
}

const env = parsed.data;

// CORS: use CORS_ORIGIN if set, else derive from LANDING_PAGE_URL, TENANT_PLATFORM_URL, SUPER_ADMIN_URL
const corsOriginRaw =
  env.CORS_ORIGIN ??
  [
    env.SUPER_ADMIN_URL ?? "http://localhost:5174",
    env.TENANT_PLATFORM_URL ?? "http://localhost:5175",
    env.LANDING_PAGE_URL ?? "http://localhost:5176",
  ]
    .filter(Boolean)
    .join(",");

export const config = Object.freeze({
  app: {
    name: env.APP_NAME,
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    port: env.PORT,
    wsPort: env.WS_PORT,
    logLevel: env.LOG_LEVEL,
    publicUrl: env.APP_PUBLIC_URL,
    landingPageUrl: env.LANDING_PAGE_URL ?? "http://localhost:5176",
    tenantPlatformUrl: env.TENANT_PLATFORM_URL ?? "http://localhost:5175",
    superAdminUrl: env.SUPER_ADMIN_URL ?? env.SUPER_ADMIN_PUBLIC_URL ?? "http://localhost:5174",
    superAdminPublicUrl: env.SUPER_ADMIN_URL ?? env.SUPER_ADMIN_PUBLIC_URL ?? env.APP_PUBLIC_URL,
  },
  cors: {
    origin:
      corsOriginRaw === "*"
        ? true
        : corsOriginRaw.split(",").map((o) => o.trim()).filter(Boolean),
  },
  mongo: {
    // Use standard URI when SRV fails (e.g. DNS/ECONNREFUSED). Get it from Atlas: Connect → Drivers → "Standard connection string".
    uri: env.MONGODB_URI_STANDARD ?? env.MONGODB_URI
  },
  redis: {
    url: env.REDIS_URL
  },
  queue: {
    concurrency: env.QUEUE_CONCURRENCY
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
    refreshCookie: {
      name: env.JWT_REFRESH_COOKIE_NAME,
      httpOnly: env.JWT_REFRESH_COOKIE_HTTP_ONLY,
      secure: env.JWT_REFRESH_COOKIE_SECURE,
      sameSite: env.JWT_REFRESH_COOKIE_SAME_SITE,
      maxAge: env.JWT_REFRESH_COOKIE_MAX_AGE
    },
    secret: env.JWT_ACCESS_SECRET,
    expiresIn: env.JWT_ACCESS_EXPIRY
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? ""
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID ?? "",
    clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    oauthCallbackUrl: env.GITHUB_OAUTH_CALLBACK_URL ?? "",
    oauthScopes: env.GITHUB_OAUTH_SCOPES ?? "repo read:org user:email"
  },
  ai: {
    openaiApiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL
  }
});
