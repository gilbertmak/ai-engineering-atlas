import publicCatalog from "@/data/atlas-public-catalog.json";
import { catalogTags, catalogThemes } from "@/data/catalog-taxonomy";
import type { Track, Video } from "@/data/videos";

export type InsightReviewStatus = "approved" | "unmapped";

export type CatalogVideo = Video & {
  track: Track | null;
  tracks: Track[];
  themes: Track[];
  tags: NonNullable<Video["tags"]>;
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
const RAW_PUBLIC_CATALOG = publicCatalog.records as unknown as readonly CatalogVideo[];

export const LAST_KNOWN_GOOD_CATALOG = RAW_PUBLIC_CATALOG.map((video) => ({
  ...video,
  themes: catalogThemes(video),
  tags: catalogTags(video),
}));
