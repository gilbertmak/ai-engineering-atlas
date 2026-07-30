import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  type CatalogManifest,
  type CatalogVideo,
} from "@/lib/atlas-catalog";

export type CatalogLoadResult = {
  records: readonly CatalogVideo[];
  manifest: CatalogManifest;
  source: "public_snapshot";
};

/**
 * The reviewed public snapshot is bundled with the Lovable build so the Atlas
 * does not depend on a private filesystem projection or an unauthenticated
 * runtime catalog endpoint.
 */
export async function loadAtlasCatalog(): Promise<CatalogLoadResult> {
  return {
    records: LAST_KNOWN_GOOD_CATALOG,
    manifest: ATLAS_CATALOG_MANIFEST,
    source: "public_snapshot",
  };
}
