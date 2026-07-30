import type { AtlasTag, Track, Video } from "./videos";

/**
 * Conservative metadata tags for the public catalog. They supplement, never
 * replace, the reviewed themes stored in the catalog snapshot. A title that
 * does not match a strong signal remains unassigned rather than being guessed.
 */
const TITLE_THEME_RULES: ReadonlyArray<{ theme: Track; pattern: RegExp }> = [
  {
    theme: "Knowledge",
    pattern:
      /\b(rag|retrieval|context|memory|knowledge|ontolog(?:y|ies)|graph|lakehouse|vector|embeddings?|citation|document search)\b/i,
  },
  {
    theme: "Developer Workflows",
    pattern:
      /\b(coding|codebase|code index|software factor(?:y|ies)|harness|developer workflow|pull request|reviewdebt|vibe[ -]?cod(?:e|ing)|agentic (?:ai )?engineer|ide)\b/i,
  },
  {
    theme: "Models & Training",
    pattern:
      /\b(model|training|post[ -]?training|fine[ -]?tun(?:e|ing)|inference|foundation model|reinforcement learning|\brl\b|synthetic data|scaling laws?|compute)\b/i,
  },
];

const TITLE_TAG_RULES: ReadonlyArray<{ tag: AtlasTag; pattern: RegExp }> = [
  { tag: "rag-retrieval", pattern: /\b(rag|retrieval|embeddings?|vector|document search)\b/i },
  { tag: "context-engineering", pattern: /\b(context|long[- ]context|cache augmented)\b/i },
  { tag: "memory", pattern: /\b(memory|memories)\b/i },
  {
    tag: "knowledge-graphs",
    pattern: /\b(knowledge graph|ontology|ontologies|\bgraph\b|lakehouse)\b/i,
  },
  {
    tag: "agentic-coding",
    pattern:
      /\b(agentic (?:ai )?engineer|coding agent|vibe[ -]?cod(?:e|ing)|codebase|code index)\b/i,
  },
  { tag: "developer-tools", pattern: /\b(developer|ide|pull request|reviewdebt|harness)\b/i },
  { tag: "software-factories", pattern: /\b(software factor(?:y|ies))\b/i },
  {
    tag: "model-training",
    pattern: /\b(training|fine[ -]?tun(?:e|ing)|foundation model|reinforcement learning|\brl\b)\b/i,
  },
  { tag: "post-training", pattern: /\b(post[ -]?training|distillation)\b/i },
  { tag: "synthetic-data", pattern: /\b(synthetic data)\b/i },
  { tag: "inference", pattern: /\b(inference|tokens?|compute|scaling laws?)\b/i },
  { tag: "evals-benchmarks", pattern: /\b(eval(?:s|ing)?|benchmark|leaderboard)\b/i },
  {
    tag: "security-governance",
    pattern: /\b(security|secure|auth|governance|compliance|guardrail)\b/i,
  },
  { tag: "observability", pattern: /\b(observability|tracing|monitoring|anomaly|drift)\b/i },
  {
    tag: "deployment-platform",
    pattern: /\b(deployment|serverless|infrastructure|gpu|platform)\b/i,
  },
  { tag: "multimodal", pattern: /\b(multimodal|video|image|visual)\b/i },
  { tag: "voice-ai", pattern: /\b(voice|speech|audio)\b/i },
  { tag: "product-ux", pattern: /\b(ux|user experience|product)\b/i },
];

export function inferredThemesFromTitle(title: string): Track[] {
  return TITLE_THEME_RULES.filter(({ pattern }) => pattern.test(title)).map(({ theme }) => theme);
}

export function catalogThemes(
  video: Pick<Video, "title" | "track" | "tracks" | "themes">,
): Track[] {
  const reviewedThemes = video.themes ?? [
    ...(video.tracks ?? []),
    ...(video.track ? [video.track] : []),
  ];
  return [...new Set([...reviewedThemes, ...inferredThemesFromTitle(video.title)])];
}

export function catalogTags(video: Pick<Video, "title" | "tags">): AtlasTag[] {
  return [
    ...new Set([
      ...(video.tags ?? []),
      ...TITLE_TAG_RULES.filter(({ pattern }) => pattern.test(video.title)).map(({ tag }) => tag),
    ]),
  ];
}

export function atlasTagLabel(tag: AtlasTag): string {
  return tag.replace(/-/g, " ");
}
