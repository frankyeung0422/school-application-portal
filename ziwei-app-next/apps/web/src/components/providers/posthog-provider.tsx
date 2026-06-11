'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as RawProvider } from 'posthog-js/react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== 'undefined' && KEY && HOST && !(posthog as unknown as { __loaded?: boolean }).__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,        // we capture manually on route change
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: { dom_event_allowlist: ['click', 'submit'] },
  });
  (posthog as unknown as { __loaded?: boolean }).__loaded = true;
}

function PageViewListener() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    if (!KEY) return;
    const url = pathname + (sp.size > 0 ? `?${sp.toString()}` : '');
    posthog.capture('page_view', { $current_url: url });
  }, [pathname, sp]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!KEY || !HOST) return <>{children}</>;
  return (
    <RawProvider client={posthog}>
      <PageViewListener />
      {children}
    </RawProvider>
  );
}
