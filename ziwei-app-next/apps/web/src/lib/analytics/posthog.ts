import { PostHog } from 'posthog-node';
import { publicEnv } from '@/lib/env';

/**
 * PostHog client — used for server-side event tracking.
 * Client-side uses posthog-js loaded in the root layout (lazy import).
 *
 * Event taxonomy — keep in sync with PostHog dashboards:
 *   page_view, chart_calculated, sample_viewed, paywall_shown,
 *   register_started, register_completed, trial_started, subscription_started,
 *   subscription_canceled, chart_shared, referral_sent, referral_redeemed,
 *   daily_email_opened, daily_email_clicked, streak_milestone, ai_call
 */

let _posthog: PostHog | null = null;

function getPostHog(): PostHog | null {
  if (!publicEnv.NEXT_PUBLIC_POSTHOG_KEY || !publicEnv.NEXT_PUBLIC_POSTHOG_HOST) return null;
  if (_posthog) return _posthog;
  _posthog = new PostHog(publicEnv.NEXT_PUBLIC_POSTHOG_KEY, {
    host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1, // flush each event immediately in serverless
    flushInterval: 0,
  });
  return _posthog;
}

export type EventName =
  | 'page_view'
  | 'chart_calculated'
  | 'sample_viewed'
  | 'paywall_shown'
  | 'register_started'
  | 'register_completed'
  | 'trial_started'
  | 'subscription_started'
  | 'subscription_canceled'
  | 'chart_shared'
  | 'referral_sent'
  | 'referral_redeemed'
  | 'daily_email_opened'
  | 'daily_email_clicked'
  | 'streak_milestone'
  | 'ai_call';

export async function trackEvent(
  userId: string | null,
  event: EventName,
  properties?: Record<string, unknown>,
) {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture({
    distinctId: userId ?? 'anonymous',
    event,
    properties,
  });
  await ph.flush();
}

export async function identifyUser(userId: string, properties: Record<string, unknown>) {
  const ph = getPostHog();
  if (!ph) return;
  ph.identify({ distinctId: userId, properties });
  await ph.flush();
}

export async function shutdownPostHog() {
  if (_posthog) await _posthog.shutdown();
}
