import { getRequest } from "@tanstack/react-start/server";

export type PublicCatalogVideo = {
  id: string;
  code: string;
  title: string;
  sourceChannel: string;
  track: string | null;
  themes?: string[];
  tags?: string[];
  insightReviewStatus: "approved" | "unmapped";
  publishedAt: string;
  durationSeconds: number;
  youtubeId: string;
};

type CatalogPayload = { records: PublicCatalogVideo[] };
type InsightPayload = { records: Record<string, unknown> };

let catalogPromise: Promise<CatalogPayload> | undefined;
let insightsPromise: Promise<InsightPayload> | undefined;

async function loadAsset<T>(path: string): Promise<T> {
  const request = getRequest();
  const response = await fetch(new URL(path, request.url));
  if (!response.ok) throw new Error(`Public projection unavailable: ${response.status}`);
  return response.json() as Promise<T>;
}

export function loadPublicCatalog() {
  catalogPromise ??= loadAsset<CatalogPayload>("/atlas-public-catalog.json");
  return catalogPromise;
}

export function loadPublicInsights() {
  insightsPromise ??= loadAsset<InsightPayload>("/talk-insights.json");
  return insightsPromise;
}

export function videoThemes(video: PublicCatalogVideo) {
  return [...new Set(video.themes ?? (video.track ? [video.track] : []))];
}

export function videoTags(video: PublicCatalogVideo) {
  return [...new Set(video.tags ?? [])];
}

export function videoYear(video: PublicCatalogVideo) {
  return new Date(video.publishedAt).getUTCFullYear();
}

export function videoDuration(video: PublicCatalogVideo) {
  const minutes = Math.floor(video.durationSeconds / 60);
  const seconds = video.durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
