// Turn pairwise SAME verdicts into products. Pure; tests/cluster.test.ts.
//
// Plain transitive closure is dangerous: A≈B at 0.8 and B≈C at 0.8 does not
// make A≈C, and one bad edge can glue two products into one. So membership is
// anchored: each cluster has an anchor (the offer with the most confident
// edges), and an offer joins only through a direct SAME edge to that anchor.
// Offers without such an edge start their own product. Confidence of a member
// is its edge to the anchor; the anchor itself is 1.

export interface SameEdge {
  a: number;
  b: number;
  confidence: number;
}

export interface Cluster {
  anchor: number;
  members: { offerId: number; confidence: number }[];
}

export const MIN_EDGE_CONFIDENCE = 0.6;

export function clusterOffers(offerIds: number[], edges: SameEdge[]): Cluster[] {
  const adj = new Map<number, Map<number, number>>();
  for (const id of offerIds) adj.set(id, new Map());
  for (const e of edges) {
    if (e.confidence < MIN_EDGE_CONFIDENCE) continue;
    if (!adj.has(e.a) || !adj.has(e.b) || e.a === e.b) continue;
    const prevA = adj.get(e.a)!.get(e.b) ?? 0;
    adj.get(e.a)!.set(e.b, Math.max(prevA, e.confidence));
    adj.get(e.b)!.set(e.a, Math.max(prevA, e.confidence));
  }

  // Strongest hubs anchor first; ties break on lower id for determinism.
  const strength = (id: number) => [...adj.get(id)!.values()].reduce((s, c) => s + c, 0);
  const order = [...offerIds].sort((x, y) => strength(y) - strength(x) || x - y);

  const assigned = new Set<number>();
  const clusters: Cluster[] = [];
  for (const anchor of order) {
    if (assigned.has(anchor)) continue;
    assigned.add(anchor);
    const members = [{ offerId: anchor, confidence: 1 }];
    const neighbours = [...adj.get(anchor)!.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]);
    for (const [id, conf] of neighbours) {
      if (assigned.has(id)) continue;
      assigned.add(id);
      members.push({ offerId: id, confidence: conf });
    }
    clusters.push({ anchor, members });
  }
  return clusters;
}
