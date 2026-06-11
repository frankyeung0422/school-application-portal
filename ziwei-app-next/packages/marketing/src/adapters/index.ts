import type { ChannelAdapter } from '../types';
import { facebookAdapter } from './facebook';
import { instagramAdapter } from './instagram';
import { threadsAdapter } from './threads';

export { facebookAdapter, instagramAdapter, threadsAdapter };

/**
 * Channel adapters.
 *   - fb, ig, threads:  IMPLEMENTED (Meta Graph)
 *   - tiktok, yt-shorts, xhs: stubs, need each platform's OAuth + content rules
 */

export const tiktokAdapter: ChannelAdapter = {
  name: 'tiktok',
  async publish(post) {
    throw new Error(`tiktokAdapter.publish: pending OAuth wiring. post=${post.id}`);
  },
  async checkConnection() { return { ok: false, details: 'not implemented' }; },
};

export const ytShortsAdapter: ChannelAdapter = {
  name: 'yt-shorts',
  async publish(post) {
    throw new Error(`ytShortsAdapter.publish: pending OAuth wiring. post=${post.id}`);
  },
  async checkConnection() { return { ok: false, details: 'not implemented' }; },
};

export const xhsAdapter: ChannelAdapter = {
  name: 'xhs',
  async publish(post) {
    throw new Error(`xhsAdapter.publish: pending OAuth wiring. post=${post.id}`);
  },
  async checkConnection() { return { ok: false, details: 'not implemented' }; },
};

export const adapters: Record<string, ChannelAdapter> = {
  fb: facebookAdapter,
  ig: instagramAdapter,
  threads: threadsAdapter,
  tiktok: tiktokAdapter,
  'yt-shorts': ytShortsAdapter,
  xhs: xhsAdapter,
};
