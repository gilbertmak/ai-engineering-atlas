import type { AtlasTag, Track, Video } from "./videos";

/**
 * Conservative metadata tags for the public catalog. They supplement, never
 * replace, the reviewed themes stored in the catalog snapshot. Every published
 * record receives one controlled tag, but a generic fallback is used rather
 * than guessing a specialist topic from an ambiguous title.
 */
const THEME_TAGS: Readonly<Record<Track, AtlasTag>> = {
  "System Design": "system-architecture",
  "Data & Eval": "evals-benchmarks",
  Reliability: "reliability-engineering",
  Observability: "observability",
  "Safety & Control": "security-governance",
  Deployment: "deployment-platform",
  Knowledge: "context-engineering",
  "Developer Workflows": "developer-tools",
  "Models & Training": "model-training",
};

const TAG_THEMES: Readonly<Record<AtlasTag, Track>> = {
  "general-ai-engineering": "System Design",
  "system-architecture": "System Design",
  "rag-retrieval": "Knowledge",
  "context-engineering": "Knowledge",
  memory: "Knowledge",
  "knowledge-graphs": "Knowledge",
  "agentic-coding": "Developer Workflows",
  "developer-tools": "Developer Workflows",
  "software-factories": "Developer Workflows",
  "model-training": "Models & Training",
  "post-training": "Models & Training",
  "synthetic-data": "Models & Training",
  inference: "Models & Training",
  "evals-benchmarks": "Data & Eval",
  "security-governance": "Safety & Control",
  "reliability-engineering": "Reliability",
  observability: "Observability",
  "deployment-platform": "Deployment",
  multimodal: "Models & Training",
  "voice-ai": "Models & Training",
  "product-ux": "System Design",
};

export const ATLAS_TAGS = Object.freeze(Object.keys(TAG_THEMES) as AtlasTag[]);

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
  {
    tag: "developer-tools",
    pattern: /\b(developer|ide|pull request|reviewdebt|harness|code|software|copilot|cursor)\b/i,
  },
  { tag: "software-factories", pattern: /\b(software factor(?:y|ies))\b/i },
  {
    tag: "model-training",
    pattern: /\b(training|fine[ -]?tun(?:e|ing)|foundation model|reinforcement learning|\brl\b)\b/i,
  },
  { tag: "post-training", pattern: /\b(post[ -]?training|distillation)\b/i },
  { tag: "synthetic-data", pattern: /\b(synthetic data)\b/i },
  { tag: "inference", pattern: /\b(inference|tokens?|compute|scaling laws?)\b/i },
  {
    tag: "evals-benchmarks",
    pattern: /\b(data|eval(?:s|ing|uation)?|benchmark|leaderboard|judge|testing?)\b/i,
  },
  {
    tag: "security-governance",
    pattern: /\b(security|secure|auth|governance|compliance|guardrail|safety|safe|trust|risk)\b/i,
  },
  {
    tag: "reliability-engineering",
    pattern:
      /\b(reliab(?:ility|le)?|fail(?:ure|ing)?|bug(?:s)?|error(?:s)?|resilien(?:ce|t)|robust)\b/i,
  },
  {
    tag: "observability",
    pattern: /\b(observability|tracing|monitoring|anomaly|drift|profiling|metrics?)\b/i,
  },
  {
    tag: "deployment-platform",
    pattern:
      /\b(deployment|serverless|infrastructure|gpu|cpu|platform|scal(?:e|ing)|latency|serving)\b/i,
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

export function catalogTags(
  video: Pick<Video, "title" | "tags" | "track" | "tracks" | "themes">,
): AtlasTag[] {
  const themeTags = catalogThemes(video).map((theme) => THEME_TAGS[theme]);
  const tags = [
    ...new Set([
      ...(video.tags ?? []),
      ...themeTags,
      ...TITLE_TAG_RULES.filter(({ pattern }) => pattern.test(video.title)).map(({ tag }) => tag),
    ]),
  ];
  return tags.length ? tags : ["general-ai-engineering"];
}

export function atlasTagLabel(tag: AtlasTag): string {
  return tag.replace(/-/g, " ");
}

export function atlasTagTheme(tag: AtlasTag): Track {
  return TAG_THEMES[tag];
}
