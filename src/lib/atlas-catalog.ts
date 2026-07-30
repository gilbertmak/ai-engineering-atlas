import publicCatalog from "@/data/atlas-public-catalog.json";
import type { Track, Video } from "@/data/videos";

export type InsightReviewStatus = "approved" | "unmapped";

export type CatalogVideo = Video & {
  track: Track | null;
  tracks: Track[];
  themes: Track[];
  insightReviewStatus: InsightReviewStatus;
};

export type CatalogManifest = {
  projectionVersion: string;
  generatedAt: string;
  sourceCatalogVerifiedAt: string;
  contentScope: string;
  publicationStatus: "published";
  reviewStatus: string;
  recordCount: number;
  contentHash: string;
  lastKnownGood: true;
};

export const ATLAS_CATALOG_MANIFEST = publicCatalog.manifest as CatalogManifest;
export const LAST_KNOWN_GOOD_CATALOG =
  publicCatalog.records as readonly CatalogVideo[];

