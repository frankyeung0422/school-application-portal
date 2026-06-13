"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  tier: "professional" | "clinic";
  className?: string;
  children: React.ReactNode;
  trialDays?: number;
}

/**
 * Initiates Stripe Checkout for a subscription tier.
 *
 * Anonymous users are bounced to /login first; the URL preserves the tier
 * intent so post-login the pricing page CTA still works.
 */
export function CheckoutButton({ tier, className, children, trialDays = 14 }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (status !== "authenticated" || !session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${tier}`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, trialDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.redirect) router.push(json.redirect);
        throw new Error(json.error ?? "Failed to start checkout");
      }
      if (!json.url) throw new Error("No checkout URL returned");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={startCheckout} disabled={loading} className={className}>
        {loading ? "…" : children}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
