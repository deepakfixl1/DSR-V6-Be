import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import mongoose from "mongoose";

let mongoServer;
let app;
let request;

const ensureEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = process.env.PORT || "0";
  process.env.WS_PORT = process.env.WS_PORT || "0";
  process.env.APP_NAME = process.env.APP_NAME || "dsr-api-test";
  process.env.APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.example.com";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
  process.env.SMTP_SECURE = process.env.SMTP_SECURE || "false";
  process.env.SMTP_USER = process.env.SMTP_USER || "user";
  process.env.SMTP_PASS = process.env.SMTP_PASS || "pass";
  process.env.SMTP_FROM = process.env.SMTP_FROM || "test@example.com";
};

export const initTestApp = async () => {
  ensureEnv();
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  const { connectMongo } = await import("#db/connection/mongoose.js");
  await connectMongo({ uri: process.env.MONGODB_URI });

  const { buildApp } = await import("#api/app/app.js");
  app = buildApp();
  request = supertest(app);

  return { app, request };
};

export const closeTestApp = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
};

export const createAuthCookie = async ({ userId, sessionId }) => {
  const { signAccessToken } = await import("#api/modules/auth/auth.tokens.js");
  const token = signAccessToken({ userId, sessionId, jti: "test-jti" });
  return `access_token=${token}`;
};
