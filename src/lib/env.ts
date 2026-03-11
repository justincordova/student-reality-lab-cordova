import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).optional(),
  LOG_DIR: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .or(
      z
        .string()
        .url()
        .transform(() => undefined)
    ),
  HF_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_LOGO_DEV_TOKEN: z.string().min(1).optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    process.stderr.write("Invalid environment variables:\n");
    process.stderr.write(z.prettifyError(result.error) + "\n");
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
