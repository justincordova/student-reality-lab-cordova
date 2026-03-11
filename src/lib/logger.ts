import "server-only";
import winston from "winston";
import path from "path";
import fs from "fs";
import { env } from "@/lib/env";

const IS_PROD = env.NODE_ENV === "production";
const IS_TEST = env.NODE_ENV === "test";
const IS_VERCEL = process.env.VERCEL === "1";

const LOG_LEVEL = env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");
const LOG_DIR = env.LOG_DIR ?? path.join(process.cwd(), "logs");

// ─── Levels ──────────────────────────────────────────────────────────────────

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
});

// ─── Formats ─────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "secret",
  "apikey",
  "api_key",
  "apikey",
  "api-key",
  "session",
  "cookie",
  "csrf",
  "xsrf",
  "jwt",
  "bearer",
  "auth",
  "credit",
  "card",
  "ssn",
  "social",
  "pin",
  "otp",
  "2fa",
  "mfa",
  "private",
  "key",
  "secretkey",
  "secret_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "hf_token",
  "hf-token",
  "hftoken",
  "logo_dev_token",
  "logo-dev-token",
  "logodevtokens",
]);

// Mutates in-place to preserve Winston's internal Symbol properties (e.g. Symbol(level)).
// Handles nested objects and arrays of objects.
const redactInPlace = (obj: Record<string, unknown>): void => {
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      obj[key] = "[REDACTED]";
    } else if (Array.isArray(obj[key])) {
      for (const item of obj[key] as unknown[]) {
        if (item && typeof item === "object") {
          redactInPlace(item as Record<string, unknown>);
        }
      }
    } else if (obj[key] && typeof obj[key] === "object") {
      redactInPlace(obj[key] as Record<string, unknown>);
    }
  }
};

const redact = winston.format((info) => {
  redactInPlace(info as unknown as Record<string, unknown>);
  return info;
});

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const hasMeta = Object.keys(meta).length > 0;
    const metaStr = hasMeta ? `\n${JSON.stringify(meta, null, 2)}` : "";
    return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ""}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Transports ──────────────────────────────────────────────────────────────

let logsDirCreated = false;

const ensureLogsDir = () => {
  if (logsDirCreated) return;
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    logsDirCreated = true;
  } catch (err) {
    console.error(`Failed to create logs directory at ${LOG_DIR}:`, err);
  }
};

const buildTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat }),
  ];

  // Skip file logging on Vercel (serverless, no write access)
  if (IS_PROD && !IS_VERCEL) {
    ensureLogsDir();

    transports.push(
      // Errors only — small, fast to scan
      new winston.transports.File({
        filename: path.join(LOG_DIR, "error.log"),
        level: "error",
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 5,
      }),
      // Everything
      new winston.transports.File({
        filename: path.join(LOG_DIR, "combined.log"),
        format: fileFormat,
        maxsize: 20 * 1024 * 1024, // 20 MB
        maxFiles: 10,
      })
    );
  }

  return transports;
};

const buildExceptionHandlers = (): winston.transport[] => {
  if (!IS_PROD || IS_VERCEL) return [];
  ensureLogsDir();
  return [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "exceptions.log"),
      format: fileFormat,
    }),
  ];
};

const buildRejectionHandlers = (): winston.transport[] => {
  if (!IS_PROD || IS_VERCEL) return [];
  ensureLogsDir();
  return [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "rejections.log"),
      format: fileFormat,
    }),
  ];
};

// ─── Logger ──────────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels,
  silent: IS_TEST,
  // redact() runs before any transport so sensitive keys are scrubbed from
  // both console and file output, including stdout captured in production.
  format: winston.format.combine(redact(), winston.format.errors({ stack: true })),
  transports: buildTransports(),
  exceptionHandlers: buildExceptionHandlers(),
  rejectionHandlers: buildRejectionHandlers(),
});

// ─── Child logger factory ─────────────────────────────────────────────────────
// Usage: const log = childLogger("auth"); log.info("user signed in");

export const childLogger = (service: string) => {
  if (!service || typeof service !== "string") {
    return logger.child({ service: "unknown" });
  }
  if (service.length > 50) {
    return logger.child({ service: service.slice(0, 50) });
  }
  return logger.child({ service });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const logError = (message: string, error?: unknown, meta?: Record<string, unknown>) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(message, { error: err, ...meta });
};

export const logHttp = (method: string, url: string, status?: number, duration?: number) => {
  logger.http(`${method} ${url}`, { status, duration });
};

export default logger;
