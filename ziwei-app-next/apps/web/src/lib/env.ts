import 'server-only';
import { z } from 'zod';

/**
 * Single source of truth for environment variables.
 * Validated once at boot; missing or malformed vars fail fast with a clear error.
 *
 * Convention: `NEXT_PUBLIC_*` vars are also exposed via a separate publicEnv export
 * so client code never imports this server-only module.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // DB
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Auth
  JWT_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('ziwei_session'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRICE_MONTHLY: z.string().startsWith('price_'),
  STRIPE_PRICE_ANNUAL: z.string().startsWith('price_'),
  STRIPE_PRICE_MASTER: z.string().startsWith('price_'),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().min(0).default(7),

  // AI
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  ANTHROPIC_MODEL_DEFAULT: z.string().default('claude-opus-4-7'),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL_DEFAULT: z.string().default('gemini-2.5-pro'),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  OPENAI_MODEL_DEFAULT: z.string().default('gpt-4o-mini'),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(50),
  AI_PER_REQUEST_BUDGET_USD: z.coerce.number().positive().default(0.5),

  // Email
  SENDGRID_API_KEY: z.string().startsWith('SG.'),
  EMAIL_FROM: z.string(),
  EMAIL_REPLY_TO: z.string().email(),

  // Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Sentry
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Upstash
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Marketing (all optional until P5)
  FACEBOOK_PAGE_ID: z.string().optional(),
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_USER_ID: z.string().optional(),
  THREADS_USER_ID: z.string().optional(),
  TIKTOK_OPEN_ID: z.string().optional(),
  TIKTOK_ACCESS_TOKEN: z.string().optional(),
  YOUTUBE_OAUTH_REFRESH_TOKEN: z.string().optional(),
  XHS_ACCESS_TOKEN: z.string().optional(),
  MARKETING_AUTO_POST: z.coerce.boolean().default(false),
  MARKETING_AUTOPUBLISH: z.coerce.boolean().default(false),

  // Legacy migration
  LEGACY_SQLITE_PATH: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

function parseEnv() {
  // Skip strict validation during `next build` (no runtime keys present yet)
  // or when explicitly disabled. Runtime requests still see real env vars.
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.NEXT_PHASE === 'phase-production-build') {
    return serverSchema.partial().parse(process.env) as z.infer<typeof serverSchema>;
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See server log.');
  }
  return parsed.data;
}

function parsePublicEnv() {
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.NEXT_PHASE === 'phase-production-build') {
    return clientSchema.partial().parse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }) as z.infer<typeof clientSchema>;
  }
  return clientSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

/**
 * Cross-field Stripe sanity checks. Each half passes its own prefix validation
 * but is still silently broken in combination — e.g. a placeholder webhook
 * secret makes every webhook 400, so no subscription ever syncs and paying users
 * get no access; or a live/test key pair that doesn't match. Warn loudly once at
 * boot; never throw, so local dev still boots before `stripe listen` is running.
 */
function stripePreflight(
  serverEnv: Partial<z.infer<typeof serverSchema>>,
  clientEnv: Partial<z.infer<typeof clientSchema>>,
) {
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const sk = serverEnv.STRIPE_SECRET_KEY ?? '';
  const pk = clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const whsec = serverEnv.STRIPE_WEBHOOK_SECRET ?? '';
  const appUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? '';
  const warn = (m: string) => console.warn(`⚠️  [env/stripe] ${m}`);

  if (/placeholder/i.test(whsec) || whsec.length < 20) {
    warn(
      'STRIPE_WEBHOOK_SECRET looks like a placeholder — signature checks will reject every event, ' +
        'so no subscription will sync and paying users get NO access. Run ' +
        '`stripe listen --forward-to localhost:9001/api/stripe/webhook` and paste the printed whsec_.',
    );
  }
  const skLive = sk.startsWith('sk_live_');
  const pkLive = pk.startsWith('pk_live_');
  if (sk && pk && skLive !== pkLive) {
    warn(`Stripe key mode mismatch: secret is ${skLive ? 'LIVE' : 'TEST'} but publishable is ${pkLive ? 'LIVE' : 'TEST'} — use a matching pair.`);
  }
  if (skLive && appUrl.includes('localhost')) {
    warn('Using LIVE Stripe keys against a localhost APP_URL — real charges with localhost redirect URLs. Use TEST keys for local dev.');
  }
}

export const env = parseEnv();
export const publicEnv = parsePublicEnv();
stripePreflight(env, publicEnv);
