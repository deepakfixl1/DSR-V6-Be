import { config } from "#api/config/env.js";

export const jwtConfig = Object.freeze({
  secret: config.jwt.accessSecret,
  expiresIn: config.jwt.accessExpiry,
  access: {
    secret: config.jwt.accessSecret,
    expiresIn: config.jwt.accessExpiry
  },
  refresh: {
    secret: config.jwt.refreshSecret,
    expiresIn: config.jwt.refreshExpiry,
    cookie: config.jwt.refreshCookie
  }
});
