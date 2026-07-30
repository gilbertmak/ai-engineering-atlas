export type Track =
  | "System Design"
  | "Data & Eval"
  | "Reliability"
  | "Observability"
  | "Safety & Control"
  | "Deployment";

export type Video = {
  id: string;
  code: string;
  title: string;
  sourceChannel: string;
  track: Track | null;
  tracks?: Track[];
  themes?: Track[];
  themeClassification?: ThemeClassification | null;
  transcript?: TranscriptSummary;
  evidence?: TranscriptEvidence[];
  publishedAt: string;
  durationSeconds: number;
  youtubeId: string;
  contentStatus?: "editorial_track_synthesis" | "metadata_only";
};

export type ThemeClassification = {
  source: "approved_local_metadata" | "approved_local_transcript";
  basis: "metadata_review" | "transcript_evidence_review";
  reviewedAt: string;
  reviewerVersion: string;
};

export type TranscriptSummary = {
  status:
    "not_requested" | "acquired" | "unavailable" | "restricted" | "failed" | "stale" | "superseded";
  availability: "available" | "unavailable" | "restricted" | "unknown";
  sourceUrl: string;
  provider: string;
  sourceType: "youtube_caption" | "approved_transcript";
  retrievedAt: string;
  acquisitionRunId: string;
  locale: string;
  sourceVersion: string;
  availabilityCheckedAt: string;
  termsBasis: string;
  rightsBasis: string;
  redistributionAllowed: boolean;
  attributionRequired: boolean;
  reviewedAt: string | null;
  digest: string;
  reviewStatus: "approved" | "pending" | "rejected";
  attributionEligible: boolean;
};

export type TranscriptEvidence = {
  evidenceId: string;
  videoId: string;
  text: string;
  timestampSeconds: number;
  transcriptDigest: string;
  status: "approved" | "retracted" | "superseded";
  reviewedAt: string;
  reviewerVersion: string;
  speaker: string | null;
  speakerAttributionEligible: boolean;
};

export function videoTracks(video: Pick<Video, "track" | "tracks">): Track[] {
  return [...new Set([...(video.tracks ?? []), ...(video.track ? [video.track] : [])])];
}

export function videoThemes(video: Pick<Video, "track" | "tracks" | "themes">): Track[] {
  return [...new Set(video.themes ?? videoTracks(video))];
}

export const TRACKS: { code: string; name: Track; token: string }[] = [
  { code: "01", name: "System Design", token: "track-1" },
  { code: "02", name: "Data & Eval", token: "track-2" },
  { code: "03", name: "Reliability", token: "track-3" },
  { code: "04", name: "Observability", token: "track-4" },
  { code: "05", name: "Safety & Control", token: "track-5" },
  { code: "06", name: "Deployment", token: "track-6" },
];

const VERIFIED_AT = "2026-07-14T00:00:00+08:00";

// Exact YouTube titles and channels captured by scripts/verify-video-sources.ts.
// This is the public, reachable source catalog. It is deliberately separate
// from rejected legacy records so an unavailable source cannot leak into UI.
const VERIFIED_VIDEOS: Video[] = [
  {
    id: "v25",
    code: "aie-025",
    title: "DeepSWE: A Contamination-Resistant Coding Benchmark — James Shi, Datacurve",
    sourceChannel: "AI Engineer",
    track: "Data & Eval",
    publishedAt: "2026-07-26T11:10:56-07:00",
    durationSeconds: 1054,
    youtubeId: "Yk87oUPVaxU",
  },
  {
    id: "v21",
    code: "aie-021",
    title: "Why Eval++ Is the Next Great Compute Primitive — Sunil Pai & Matt Carey, Cloudflare",
    sourceChannel: "AI Engineer",
    track: "Data & Eval",
    publishedAt: "2026-06-08T06:00:13-07:00",
    durationSeconds: 1490,
    youtubeId: "SKDJo2CopRs",
  },
  {
    id: "v23",
    code: "aie-023",
    title: "Don't Build Slop (4 Levels of AI Agent Maturity) - Ara Khan, Cline",
    sourceChannel: "AI Engineer",
    track: "Reliability",
    publishedAt: "2026-05-19T08:00:06-07:00",
    durationSeconds: 1131,
    youtubeId: "yUmS-F9IX90",
  },
  {
    id: "v22",
    code: "aie-022",
    title: "Don't Build Agents, Build Skills Instead – Barry Zhang & Mahesh Murag, Anthropic",
    sourceChannel: "AI Engineer",
    track: "System Design",
    publishedAt: "2025-12-08T09:30:06-08:00",
    durationSeconds: 982,
    youtubeId: "CEvIs9y1uog",
  },
  {
    id: "v18",
    code: "aie-018",
    title: "Building and evaluating AI Agents\u00a0—\u00a0Sayash Kapoor, AI Snake Oil",
    sourceChannel: "AI Engineer",
    track: "Data & Eval",
    publishedAt: "2025-04-17T09:00:06-07:00",
    durationSeconds: 1199,
    youtubeId: "d5EltXhbcfA",
  },
  {
    id: "v17",
    code: "aie-017",
    title: "RAG Agents in Prod: 10 Lessons We Learned —\u00a0Douwe Kiela, creator of RAG",
    sourceChannel: "AI Engineer",
    track: "Reliability",
    publishedAt: "2025-04-10T12:47:37-07:00",
    durationSeconds: 1016,
    youtubeId: "kPL-6-9MVyA",
  },
  {
    id: "v04",
    code: "aie-004",
    title: "How We Build Effective Agents: Barry Zhang, Anthropic",
    sourceChannel: "AI Engineer",
    track: "System Design",
    publishedAt: "2025-04-04T11:46:36-07:00",
    durationSeconds: 909,
    youtubeId: "D7_ipDqhtwk",
  },
  {
    id: "v19",
    code: "aie-019",
    title: "Rethinking how we Scaffold AI Agents - Rahul Sengottuvelu, Ramp",
    sourceChannel: "AI Engineer",
    track: "System Design",
    publishedAt: "2025-03-19T10:09:54-07:00",
    durationSeconds: 992,
    youtubeId: "-rsTkYgnNzM",
  },
  {
    id: "v24",
    code: "aie-024",
    title: "Agent Engineering with Pydantic + Graphs — with Samuel Colvin, CEO of Pydantic Logfire",
    sourceChannel: "Latent Space",
    track: "Reliability",
    publishedAt: "2025-02-06T14:58:45-08:00",
    durationSeconds: 3735,
    youtubeId: "7wwWRph3Jls",
  },
  {
    id: "v20",
    code: "aie-020",
    title: "Lessons from the Trenches: Building LLM Evals That Work IRL: Aparna Dhinkaran",
    sourceChannel: "AI Engineer",
    track: "Data & Eval",
    publishedAt: "2025-02-06T01:24:01-08:00",
    durationSeconds: 1129,
    youtubeId: "nbZzSC5A6hs",
  },
  {
    id: "v06",
    code: "aie-006",
    title: "AI prompt engineering: A deep dive",
    sourceChannel: "Anthropic",
    track: "Reliability",
    publishedAt: "2024-09-05T10:00:19-07:00",
    durationSeconds: 4602,
    youtubeId: "T9aRN5JkmL8",
  },
  {
    id: "v08",
    code: "aie-008",
    title: "Beyond the Basics of Retrieval for Augmenting Generation (w/ Ben Clavié)",
    sourceChannel: "Hamel Husain",
    track: "Reliability",
    publishedAt: "2024-06-15T14:59:49-07:00",
    durationSeconds: 2925,
    youtubeId: "0nA5QG3087g",
  },
  {
    id: "v12",
    code: "aie-012",
    title: "Building Production-Ready RAG Applications: Jerry Liu",
    sourceChannel: "AI Engineer",
    track: "Reliability",
    publishedAt: "2023-11-15T11:46:23-08:00",
    durationSeconds: 1114,
    youtubeId: "TRjq7t2Ms5I",
  },
  {
    id: "v03",
    code: "aie-003",
    title: "Pydantic is all you need: Jason Liu",
    sourceChannel: "AI Engineer",
    track: "Reliability",
    publishedAt: "2023-11-01T09:27:08-07:00",
    durationSeconds: 1075,
    youtubeId: "yj-wSRJwrrc",
  },
  {
    id: "v05",
    code: "aie-005",
    title: "Evaluating LLM-based Applications // Josh Tobin // LLMs in Prod Conference Part 2",
    sourceChannel: "MLOps.community",
    track: "Data & Eval",
    publishedAt: "2023-07-12T02:55:55-07:00",
    durationSeconds: 2990,
    youtubeId: "r-HUnht-Gns",
  },
];

export const VIDEOS = [...VERIFIED_VIDEOS].sort(
  (a, b) =>
    Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.youtubeId.localeCompare(b.youtubeId),
);

export const SOURCE_CATALOG_VERIFIED_AT = VERIFIED_AT;

export function videoYear(video: Video) {
  return new Date(video.publishedAt).getUTCFullYear();
}

export function videoDuration(video: Video) {
  const hours = Math.floor(video.durationSeconds / 3600);
  const minutes = Math.floor((video.durationSeconds % 3600) / 60);
  const seconds = video.durationSeconds % 60;
  return [hours || null, minutes, seconds]
    .filter((part): part is number => part !== null)
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join(":");
}

export function videoPublishedDate(video: Video) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(video.publishedAt));
}
