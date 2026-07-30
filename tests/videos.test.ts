import { describe, expect, test } from "bun:test";

import { TRACKS, VIDEOS, videoDuration, videoYear } from "../src/data/videos";
import { talkInsightForVideo } from "../src/data/talk-insights";

describe("verified video catalog", () => {
  test("uses six unique tracks", () => {
    expect(TRACKS).toHaveLength(6);
    expect(new Set(TRACKS.map((track) => track.name)).size).toBe(6);
    expect(new Set(TRACKS.map((track) => track.code)).size).toBe(6);
  });

  test("contains only complete, unique source records", () => {
    expect(VIDEOS).toHaveLength(15);
    expect(new Set(VIDEOS.map((video) => video.id)).size).toBe(VIDEOS.length);
    expect(new Set(VIDEOS.map((video) => video.code)).size).toBe(VIDEOS.length);
    expect(new Set(VIDEOS.map((video) => video.youtubeId)).size).toBe(VIDEOS.length);
    const knownTracks = new Set(TRACKS.map((track) => track.name));

    for (const video of VIDEOS) {
      expect(video.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(video.title.trim()).not.toBe("");
      expect(video.sourceChannel.trim()).not.toBe("");
      expect(video.durationSeconds).toBeGreaterThan(0);
      expect(videoDuration(video)).toMatch(/^(?:\d+:)?\d{1,2}:\d{2}$/);
      expect(knownTracks.has(video.track)).toBe(true);
      expect(Number.isNaN(Date.parse(video.publishedAt))).toBe(false);
      expect(Date.parse(video.publishedAt)).toBeLessThanOrEqual(Date.now());
      expect(videoYear(video)).toBe(new Date(video.publishedAt).getUTCFullYear());
    }
  });

  test("is deterministically sorted by YouTube publication date, latest first", () => {
    expect(VIDEOS).toEqual(
      [...VIDEOS].sort(
        (a, b) =>
          Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
          a.youtubeId.localeCompare(b.youtubeId),
      ),
    );
    expect(VIDEOS[0]?.youtubeId).toBe("Yk87oUPVaxU");
  });

  test("does not publish the unrelated legacy Zig source", () => {
    expect(VIDEOS.some((video) => video.youtubeId === "kxT8-C1vmd4")).toBe(false);
  });

  test("restores reviewed insights for the Atlas videos", () => {
    const deepSwe = VIDEOS.find((video) => video.youtubeId === "Yk87oUPVaxU");
    const insight = deepSwe && talkInsightForVideo(deepSwe);

    expect(insight?.contentBasis).toBe("transcript_backed");
    expect(insight?.timestampSeconds).toBe(63);
    expect(insight?.claim).toContain("contamination-resistant");
  });
});
