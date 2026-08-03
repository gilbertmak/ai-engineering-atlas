export type NumberedInsightText = {
  lead: string;
  points: string[];
};

/**
 * Extracts editorial numbered points without treating the periods in
 * timestamps, decimals or abbreviations as list boundaries.
 *
 * Insight copy commonly uses a short lead followed by `1.`, `2.` and `3.`
 * points. Keeping that structure in the renderer lets the modal expose the
 * relationship as a real nested ordered list instead of flattening it into a
 * misleading sentence list.
 */
export function parseNumberedInsightText(body: string): NumberedInsightText {
  const matches: Array<{ markerStart: number; contentStart: number }> = [];
  const marker = /(^|[,:;.\n]\s*)(\d+)\.\s+(?=[A-Za-z])/g;

  for (const match of body.matchAll(marker)) {
    const fullMatch = match[0];
    const delimiter = match[1] ?? "";
    const matchStart = match.index ?? 0;
    const markerStart = matchStart + delimiter.length;
    matches.push({
      markerStart,
      contentStart: matchStart + fullMatch.length,
    });
  }

  if (!matches.length) return { lead: body.trim(), points: [] };

  const lead = body.slice(0, matches[0]!.markerStart).trim();
  const points = matches.map((current, index) => {
    const next = matches[index + 1];
    return body.slice(current.contentStart, next?.markerStart ?? body.length).trim();
  });

  return { lead, points };
}

export function splitInsightSentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((point) => point.trim())
    .filter(Boolean);
}
