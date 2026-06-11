import { Card, CardContent } from '@/components/ui';

interface Section {
  heading: string;
  body: string;
}

/**
 * Parses AI output containing 【section title】 markers into a list of sections.
 * Each `【...】` opens a new section; everything until the next `【...】` (or EOF)
 * is the body. Trims and drops empties. Pre-content before the first marker is
 * returned as an unnamed "preamble" section if non-empty.
 */
export function parseReadingSections(raw: string): { preamble: string; sections: Section[] } {
  if (!raw) return { preamble: '', sections: [] };

  // Strip leading markdown headers (## / **) the model sometimes still emits.
  const cleaned = raw
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1');

  // Match 【...】 — captures the heading text. Splitting at each marker yields
  // alternating [body, heading, body, heading, ...] starting with whatever
  // comes before the first marker.
  const parts = cleaned.split(/【\s*([^】]+?)\s*】/);
  const preamble = (parts[0] ?? '').trim();

  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts[i] ?? '').trim();
    const body = (parts[i + 1] ?? '').trim();
    if (heading) sections.push({ heading, body });
  }
  return { preamble, sections };
}

/** Render a single body string with paragraph breaks. */
function Body({ text }: { text: string }) {
  if (!text) return <p className="text-[var(--color-fg-subtle)] italic text-sm">（此段暫無內容）</p>;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[var(--color-paper-ink)] leading-[1.85] mb-3 last:mb-0 whitespace-pre-line">
          {p}
        </p>
      ))}
    </>
  );
}

/**
 * Renders AI reading text as a stack of paper-style cards, one per
 * `【section】` heading. Falls back to a single block when no markers exist.
 */
export function ReadingSections({
  raw,
  emptyHint = '尚無內容',
}: {
  raw: string;
  emptyHint?: string;
}) {
  if (!raw) {
    return (
      <Card variant="paper" padding="xl">
        <CardContent>
          <p className="text-[var(--color-paper-ink)] italic">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  const { preamble, sections } = parseReadingSections(raw);

  // No 【】 markers found — render the whole thing as one card.
  if (sections.length === 0) {
    return (
      <Card variant="paper" padding="xl">
        <CardContent>
          <Body text={raw.trim()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {preamble && (
        <Card variant="paper" padding="lg">
          <CardContent>
            <Body text={preamble} />
          </CardContent>
        </Card>
      )}
      {sections.map((s, i) => (
        <Card key={i} variant="paper" padding="lg">
          <CardContent>
            <h3 className="font-display text-xl text-[var(--color-gold-bright)] mb-3 border-b border-[var(--color-gold)]/30 pb-2">
              {s.heading}
            </h3>
            <Body text={s.body} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
