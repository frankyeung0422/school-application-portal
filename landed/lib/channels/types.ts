import type { Channel } from "../types";
import type { RunMode } from "../actions/kinds";
import { UserFacingError } from "../errors";

export interface ListingInput {
  sku: string;
  title: string;
  description: string;
  priceHkdCents: number;
  qty: number;
  imageUrl: string | null;
  productUrl: string;
}

export interface ChannelAvailability {
  ok: boolean;
  reason: string;
  /** Env vars / accounts still missing. */
  missing: string[];
}

/**
 * Write-side counterpart of the read-side PlatformAdapter. In DRY run mode an
 * adapter must not touch the network: it returns a `dry-` id so the whole
 * approve → publish → guard loop can be exercised without a seller account.
 */
export interface ChannelAdapter {
  channel: Channel;
  availability(): ChannelAvailability;
  publish(input: ListingInput, mode: RunMode): Promise<{ externalId: string; url?: string }>;
  updatePrice(externalId: string, priceHkdCents: number, mode: RunMode): Promise<void>;
  delist(externalId: string, mode: RunMode): Promise<void>;
}

export class ChannelUnavailableError extends UserFacingError {}

export function missingEnv(names: string[]): string[] {
  return names.filter((n) => !process.env[n]);
}
