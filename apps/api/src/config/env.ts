import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    // Neon provides a direct (non-pooled) URL for migrations and seed scripts.
    // It is optional so local Docker/Postgres setups can keep using DATABASE_URL.
    DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
    // Optional SELECT-only connection used by the public totals endpoint.
    READONLY_DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
    ADMIN_PASSWORD: z
      .string()
      .min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    CAMPAIGN_SLUG: z.string().min(1).default('zahira-college-land-fund'),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
    DB_SYNCHRONIZE: booleanFromString,
    USE_MEMORY_DB: booleanFromString,
    TRUST_PROXY: booleanFromString,
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && env.USE_MEMORY_DB) {
      context.addIssue({
        code: 'custom',
        path: ['USE_MEMORY_DB'],
        message: 'USE_MEMORY_DB cannot be enabled in production.',
      });
    }
    if (env.NODE_ENV === 'production' && env.DB_SYNCHRONIZE) {
      context.addIssue({
        code: 'custom',
        path: ['DB_SYNCHRONIZE'],
        message: 'DB_SYNCHRONIZE cannot be enabled in production.',
      });
    }
    if (env.NODE_ENV === 'production') {
      const origins = env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
      if (
        origins.some((origin) =>
          /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin),
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'CORS_ORIGINS must name the deployed web origin in production.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration - ${details}`);
  }
  return parsed.data;
}
