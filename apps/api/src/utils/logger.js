import winston from "winston";
import { config } from "#api/config/env.js";

const levelMap = {
  fatal: "error",
  trace: "debug"
};

const normalizedLevel = levelMap[config.app.logLevel] ?? config.app.logLevel;

const baseLogger = winston.createLogger({
  level: normalizedLevel === "silent" ? "error" : normalizedLevel,
  silent: normalizedLevel === "silent",
  defaultMeta: {
    env: config.app.env
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const parseArgs = (args) => {
  if (args.length === 0) return { message: "" };

  if (args.length === 1) {
    const first = args[0];
    if (typeof first === "string") return { message: first };
    if (first instanceof Error) {
      return {
        message: first.message,
        err: {
          name: first.name,
          message: first.message,
          stack: first.stack
        }
      };
    }
    if (first && typeof first === "object") {
      return {
        message: first.message ?? "log",
        ...first
      };
    }
    return { message: String(first) };
  }

  const [first, second] = args;
  if (first && typeof first === "object" && typeof second === "string") {
    return { message: second, ...first };
  }
  if (typeof first === "string" && second && typeof second === "object") {
    return { message: first, ...second };
  }
  return {
    message: args.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join(" ")
  };
};

const logWithLevel = (level, ...args) => {
  baseLogger.log(level, parseArgs(args));
};

export const logger = Object.freeze({
  error: (...args) => logWithLevel("error", ...args),
  warn: (...args) => logWithLevel("warn", ...args),
  info: (...args) => logWithLevel("info", ...args),
  http: (...args) => logWithLevel("http", ...args),
  debug: (...args) => logWithLevel("debug", ...args)
});

export const requestLoggerMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "http";
    logWithLevel(
      level,
      `HTTP ${req.method} ${req.originalUrl}`,
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip
      }
    );
  });
  next();
};
