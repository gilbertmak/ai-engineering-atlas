import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverYouTubeCatalog,
  loadDiscoveryState,
  saveDiscoveryState,
} from "../scripts/youtube-discovery";

describe("YouTube Data API uploads discovery", () => {
  test("resolves the channel, paginates uploads, batches metadata, and never calls search", async () => {
    const requests: URL[] = [];
    const fetchImpl = (async (input: string | URL) => {
      const url = new URL(input);
      requests.push(url);
      if (url.pathname.endsWith("/channels"))
        return Response.json({
          items: [{ contentDetails: { relatedPlaylists: { uploads: "UU123" } } }],
        });
      if (url.pathname.endsWith("/playlistItems"))
        return Response.json(
          url.searchParams.has("pageToken")
            ? { items: [{ contentDetails: { videoId: "22222222222" } }] }
            : { items: [{ contentDetails: { videoId: "11111111111" } }], nextPageToken: "next" },
        );
      return Response.json({
        items: (url.searchParams.get("id") ?? "").split(",").map((id) => ({
          id,
          snippet: {
            title: id,
            channelTitle: "AI Engineer",
            publishedAt: "2026-01-01T00:00:00Z",
          },
          contentDetails: { duration: "PT1M" },
        })),
      });
    }) as typeof fetch;
    const result = await discoverYouTubeCatalog({
      apiKey: "server-key",
      knownYoutubeIds: ["11111111111"],
      fetchImpl,
      minimumDelayMs: 0,
      sleep: async () => {},
      now: () => "2026-07-23T00:00:00Z",
    });
    expect(requests.some((url) => url.pathname.endsWith("/search"))).toBe(false);
    expect(requests.filter((url) => url.pathname.endsWith("/channels"))).toHaveLength(1);
    expect(requests.filter((url) => url.pathname.endsWith("/playlistItems"))).toHaveLength(2);
    expect(requests.filter((url) => url.pathname.endsWith("/videos"))).toHaveLength(1);
    expect(result.candidates.map((candidate) => [candidate.youtubeId, candidate.status])).toEqual([
      ["11111111111", "known"],
      ["22222222222", "new"],
    ]);
  });

  test("stops an incremental crawl at its high-water ID and fails without a server key", async () => {
    const fetchImpl = (async (input: string | URL) =>
      new URL(input).pathname.endsWith("/playlistItems")
        ? Response.json({
            items: [
              { contentDetails: { videoId: "newnewnew01" } },
              { contentDetails: { videoId: "oldoldold01" } },
            ],
            nextPageToken: "must-not-follow",
          })
        : Response.json({
            items: [
              {
                id: "newnewnew01",
                snippet: {
                  title: "New",
                  channelTitle: "AI Engineer",
                  publishedAt: "2026-01-01T00:00:00Z",
                },
                contentDetails: { duration: "PT1M" },
              },
            ],
          })) as typeof fetch;
    const result = await discoverYouTubeCatalog({
      apiKey: "server-key",
      uploadsPlaylistId: "UU123",
      highWaterYoutubeId: "oldoldold01",
      fetchImpl,
      minimumDelayMs: 0,
      sleep: async () => {},
    });
    expect(result.candidates.map((candidate) => candidate.youtubeId)).toEqual(["newnewnew01"]);
    await expect(discoverYouTubeCatalog({ apiKey: "" })).rejects.toThrow("YOUTUBE_DATA_API_KEY");
  });

  test("full reconciliation keeps walking past the high-water ID and batches metadata at 50 IDs", async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `video${String(index).padStart(6, "0")}`);
    const requestedBatches: string[][] = [];
    const fetchImpl = (async (input: string | URL) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/playlistItems")) {
        return Response.json({ items: ids.map((videoId) => ({ contentDetails: { videoId } })) });
      }
      const batch = url.searchParams.get("id")!.split(",");
      requestedBatches.push(batch);
      return Response.json({
        items: batch.map((id) => ({
          id,
          snippet: { title: id, channelTitle: "AI Engineer", publishedAt: "2026-01-01T00:00:00Z" },
          contentDetails: { duration: "PT1S" },
        })),
      });
    }) as typeof fetch;

    const result = await discoverYouTubeCatalog({
      apiKey: "server-key",
      uploadsPlaylistId: "UU123",
      highWaterYoutubeId: ids[10],
      full: true,
      knownYoutubeIds: [ids[10]!],
      fetchImpl,
      minimumDelayMs: 0,
      sleep: async () => {},
    });

    expect(requestedBatches.map((batch) => batch.length)).toEqual([50, 1]);
    expect(result.candidates).toHaveLength(51);
    expect(result.candidates[10]?.status).toBe("known");
    expect(result.complete).toBe(true);
  });

  test("paces every API request and retries a transient failure with bounded backoff", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const originalDateNow = Date.now;
    Date.now = () => 1_000;
    try {
      const fetchImpl = (async (input: string | URL) => {
        calls += 1;
        const url = new URL(input);
        if (calls === 1)
          return new Response("over quota", { status: 429, statusText: "Too Many Requests" });
        if (url.pathname.endsWith("/playlistItems")) return Response.json({ items: [] });
        throw new Error(`unexpected request ${url.pathname}`);
      }) as typeof fetch;
      await discoverYouTubeCatalog({
        apiKey: "server-key",
        uploadsPlaylistId: "UU123",
        fetchImpl,
        retries: 2,
        minimumDelayMs: 100,
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
      });
    } finally {
      Date.now = originalDateNow;
    }

    expect(calls).toBe(2);
    // First retry sleeps for exponential backoff; the retried call is then paced too.
    expect(sleeps).toEqual([250, 100]);
  });

  test("retries a recoverable network failure before returning discovery results", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("network unavailable");
      return Response.json({ items: [] });
    }) as typeof fetch;

    const result = await discoverYouTubeCatalog({
      apiKey: "server-key",
      uploadsPlaylistId: "UU123",
      fetchImpl,
      retries: 1,
      minimumDelayMs: 0,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
    });

    expect(calls).toBe(2);
    expect(sleeps).toEqual([250]);
    expect(result.candidates).toEqual([]);
  });

  test("fails closed on permanent API errors without retrying or exposing the configured key", async () => {
    let calls = 0;
    const secret = "do-not-log-this-key";
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("invalid key", { status: 400, statusText: "Bad Request" });
    }) as typeof fetch;

    const result = discoverYouTubeCatalog({
      apiKey: secret,
      uploadsPlaylistId: "UU123",
      fetchImpl,
      retries: 3,
      sleep: async () => {},
    });
    await expect(result).rejects.toThrow("400 Bad Request");
    await expect(result).rejects.not.toThrow(secret);
    expect(calls).toBe(1);
  });

  test("retries a transient network failure", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) throw new Error("socket reset");
      return Response.json({ items: [] });
    }) as typeof fetch;

    await expect(
      discoverYouTubeCatalog({
        apiKey: "server-key",
        uploadsPlaylistId: "UU123",
        fetchImpl,
        retries: 1,
        minimumDelayMs: 0,
        sleep: async () => {},
      }),
    ).resolves.toMatchObject({ candidates: [] });
    expect(calls).toBe(2);
  });

  test("persists a union of previously seen and newly discovered IDs for incremental runs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "youtube-discovery-test-"));
    const statePath = join(directory, "state.json");
    try {
      await saveDiscoveryState(statePath, {
        version: 1,
        uploadsPlaylistId: "UU123",
        knownYoutubeIds: ["old-video", "new-video", "old-video"],
        highWaterYoutubeId: "new-video",
        updatedAt: "2026-07-23T00:00:00Z",
      });
      const loaded = await loadDiscoveryState(statePath);
      const raw = JSON.parse(await readFile(statePath, "utf8"));
      expect(loaded).toEqual({
        version: 1,
        uploadsPlaylistId: "UU123",
        knownYoutubeIds: ["new-video", "old-video"],
        highWaterYoutubeId: "new-video",
        updatedAt: "2026-07-23T00:00:00Z",
      });
      expect(raw.knownYoutubeIds).toEqual(["new-video", "old-video"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
