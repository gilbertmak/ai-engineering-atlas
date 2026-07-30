import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleAtlasApi } from "../src/lib/atlas-api";
import { loadAtlasCatalog } from "../src/lib/atlas-catalog-client";
import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  createCatalogManifest,
  getCatalogPage,
} from "../src/lib/atlas-catalog";
import { saveDiscoveryCandidateHandoff } from "../scripts/discovery-candidate-handoff";
import { mergeApprovedMetadataCandidates } from "../scripts/publish-discovery-metadata";
import { loadAtlasProjection } from "../src/server/atlas-projection-store";

describe("versioned reviewed Atlas catalog projection", () => {
  test("serves only reviewed last-known-good metadata with a stable version and content hash", () => {
    const page = getCatalogPage({ limit: 50 });
    expect(page.records).toEqual(LAST_KNOWN_GOOD_CATALOG);
    expect(page.manifest).toEqual(ATLAS_CATALOG_MANIFEST);
    expect(page.manifest.contentScope).toBe("reviewed_source_metadata_only");
    expect(page.manifest.publicationStatus).toBe("published");
    expect(page.manifest.reviewStatus).toBe("reviewed");
    expect(page.manifest.lastKnownGood).toBe(true);
  });

  test("filters and pages deterministically without accepting invalid query input", () => {
    const first = getCatalogPage({ track: "Data & Eval", limit: 1 });
    expect(first.records).toHaveLength(1);
    expect(first.records[0]?.track).toBe("Data & Eval");
    expect(first.nextCursor).toBeTruthy();
    const second = getCatalogPage({ track: "Data & Eval", limit: 1, cursor: first.nextCursor! });
    expect(second.records).toHaveLength(1);
    expect(second.records[0]?.id).not.toBe(first.records[0]?.id);
    expect(() => getCatalogPage({ limit: 51 })).toThrow();
    expect(() => getCatalogPage({ track: "Unreviewed" })).toThrow();
  });

  test("read API exposes no candidate queue and supports conditional catalog reads", async () => {
    const request = new Request("https://atlas.example/v1/catalog?limit=1");
    const fallbackProjection = {
      records: LAST_KNOWN_GOOD_CATALOG,
      manifest: ATLAS_CATALOG_MANIFEST,
    };
    const response = (await handleAtlasApi(request, fallbackProjection))!;
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toContain(ATLAS_CATALOG_MANIFEST.projectionVersion);
    const payload = (await response.json()) as { records: unknown[]; manifest: unknown };
    expect(payload.records).toHaveLength(1);
    expect(payload.manifest).toEqual(ATLAS_CATALOG_MANIFEST);

    const cached = (await handleAtlasApi(
      new Request("https://atlas.example/v1/catalog", {
        headers: { "if-none-match": response.headers.get("etag")! },
      }),
      fallbackProjection,
    ))!;
    expect(cached.status).toBe(304);
    expect(
      (
        await handleAtlasApi(
          new Request("https://atlas.example/v1/admin/runs/discovery"),
          fallbackProjection,
        )
      )?.status,
    ).toBe(404);
    expect(
      (
        await handleAtlasApi(
          new Request("https://atlas.example/v1/catalog?limit=999"),
          fallbackProjection,
        )
      )?.status,
    ).toBe(400);
  });

  test("browser client follows every catalog page and rejects a projection that changes mid-read", async () => {
    const records = Array.from({ length: 51 }, (_, index) => ({
      ...LAST_KNOWN_GOOD_CATALOG[index % LAST_KNOWN_GOOD_CATALOG.length]!,
      id: `video-${index}`,
      code: `src-${index}`,
      youtubeId: `${index.toString().padStart(11, "0")}`,
    }));
    const manifest = createCatalogManifest(
      records,
      "2026-07-28T00:00:00Z",
      "atlas-source-catalog-pagination-test",
    );
    const fetchAllPages: typeof fetch = async (input) => {
      const requestUrl = new URL(
        input instanceof Request ? input.url : input.toString(),
        "https://atlas.example",
      );
      return handleAtlasApi(new Request(requestUrl), { records, manifest }) as Promise<Response>;
    };
    const result = await loadAtlasCatalog(fetchAllPages);
    expect(result.source).toBe("api");
    expect(result.records).toHaveLength(51);
    expect(result.records.at(-1)?.id).toBe("video-50");

    let calls = 0;
    const changingProjection: typeof fetch = async (input) => {
      calls += 1;
      const requestUrl = new URL(
        input instanceof Request ? input.url : input.toString(),
        "https://atlas.example",
      );
      const response = (await handleAtlasApi(new Request(requestUrl), {
        records,
        manifest,
      }))!;
      const body = await response.json();
      if (calls === 2) body.manifest.projectionVersion = "changed-mid-read";
      return Response.json(body);
    };
    expect((await loadAtlasCatalog(changingProjection)).source).toBe("last_known_good");
  });
});

describe("discovery review handoff", () => {
  test("auto-publishes only exact approved metadata as unclassified with no insight", async () => {
    const projection = mergeApprovedMetadataCandidates({
      records: LAST_KNOWN_GOOD_CATALOG,
      approvedChannel: "AI Engineer",
      approvedUploadsPlaylistId: "UU-approved",
      now: "2026-07-28T00:00:00Z",
      candidates: [
        {
          youtubeId: "abcdefghijk",
          title: "Approved new upload",
          channel: "AI Engineer",
          publishedAt: "2026-07-28T00:00:00Z",
          durationSeconds: 60,
          status: "new",
          provenance: {
            method: "youtube-data-api-v3",
            retrievedAt: "2026-07-28T00:00:00Z",
            uploadsPlaylistId: "UU-approved",
          },
        },
        {
          youtubeId: "zyxwvutsrqp",
          title: "Wrong channel",
          channel: "Unapproved",
          publishedAt: "2026-07-28T00:00:00Z",
          durationSeconds: 60,
          status: "new",
          provenance: {
            method: "youtube-data-api-v3",
            retrievedAt: "2026-07-28T00:00:00Z",
            uploadsPlaylistId: "UU-approved",
          },
        },
      ],
    });
    const added = projection.records.find((record) => record.youtubeId === "abcdefghijk")!;
    expect(added).toMatchObject({ track: null, contentStatus: "metadata_only" });
    expect(projection.records.some((record) => record.youtubeId === "zyxwvutsrqp")).toBe(false);
    expect(projection.manifest.projectionVersion).toBe("atlas-source-catalog-2026-07-28");
    expect(projection.manifest).toMatchObject({
      contentScope: "mixed_approved_metadata",
      reviewStatus: "mixed",
      sourceCatalogVerifiedAt: "2026-07-28T00:00:00Z",
    });
    const directory = await mkdtemp(join(tmpdir(), "atlas-projection-"));
    try {
      const path = join(directory, "projection.json");
      await writeFile(path, JSON.stringify(projection), "utf8");
      const persisted = await loadAtlasProjection(path);
      const apiResponse = (await handleAtlasApi(
        new Request("https://atlas.example/v1/catalog?q=Approved%20new%20upload"),
        persisted,
      ))!;
      const apiPayload = (await apiResponse.json()) as {
        records: Array<{ track: unknown; contentStatus: string }>;
      };
      expect(apiPayload.records).toEqual([
        expect.objectContaining({ track: null, contentStatus: "metadata_only" }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("recovers an approved candidate that is known to discovery but missing from publication", () => {
    const projection = mergeApprovedMetadataCandidates({
      records: LAST_KNOWN_GOOD_CATALOG,
      approvedChannel: "AI Engineer",
      approvedUploadsPlaylistId: "UU-approved",
      now: "2026-07-28T00:00:00Z",
      candidates: [
        {
          youtubeId: "recover1234",
          title: "Previously discovered upload",
          channel: "AI Engineer",
          publishedAt: "2026-07-27T00:00:00Z",
          durationSeconds: 60,
          status: "known",
          provenance: {
            method: "youtube-data-api-v3",
            retrievedAt: "2026-07-28T00:00:00Z",
            uploadsPlaylistId: "UU-approved",
          },
        },
      ],
    });
    expect(projection.records.some((record) => record.youtubeId === "recover1234")).toBe(true);
  });

  test("persists candidates only as review_required and rejects malformed input", async () => {
    const directory = await mkdtemp(join(tmpdir(), "atlas-discovery-handoff-"));
    const path = join(directory, "candidates.json");
    try {
      const saved = await saveDiscoveryCandidateHandoff(path, "2026-07-28T00:00:00Z", [
        {
          youtubeId: "abcdefghijk",
          title: "Candidate only",
          channel: "AI Engineer",
          publishedAt: "2026-07-28T00:00:00Z",
          durationSeconds: 60,
          status: "new",
          provenance: {
            method: "youtube-data-api-v3",
            retrievedAt: "2026-07-28T00:00:00Z",
            uploadsPlaylistId: "UU123",
          },
        },
      ]);
      expect(saved.publicationStatus).toBe("review_required");
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(saved);
      await expect(saveDiscoveryCandidateHandoff(path, "not-a-date", [])).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
