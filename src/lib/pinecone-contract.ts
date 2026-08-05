export const PINECONE_NAMESPACE = "approved-insights-v1";

export type InsightField = "claim" | "implication" | "whenToUse" | "caveat";

export type PineconeTalkMatch = {
  talkId: string;
  score: number;
  matchedField: InsightField;
  matchedOrdinal: number;
  matchedText: string;
};

const FIELDS: readonly InsightField[] = ["claim", "implication", "whenToUse", "caveat"];

export function isInsightField(value: unknown): value is InsightField {
  return typeof value === "string" && FIELDS.includes(value as InsightField);
}
