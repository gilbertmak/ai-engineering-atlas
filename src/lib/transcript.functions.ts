import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TranscriptSegment = { offset: number; duration: number; text: string };

export const getTranscript = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ videoId: z.string().min(6) }).parse(data))
  .handler(async ({ data }): Promise<{ segments: TranscriptSegment[]; language?: string; source: "youtube" | "none"; error?: string }> => {
    try {
      // Dynamic import so the package is only loaded server-side
      const mod = await import("youtube-transcript");
      const YoutubeTranscript = (mod as any).YoutubeTranscript ?? (mod as any).default?.YoutubeTranscript;
      if (!YoutubeTranscript) throw new Error("transcript module unavailable");
      const raw = await YoutubeTranscript.fetchTranscript(data.videoId);
      const segments: TranscriptSegment[] = raw.map((r: any) => ({
        offset: Number(r.offset ?? 0) / (r.offset && r.offset > 1000 ? 1000 : 1),
        duration: Number(r.duration ?? 0),
        text: String(r.text ?? "").replace(/&amp;#39;/g, "'").replace(/&amp;quot;/g, '"').replace(/&amp;/g, "&"),
      }));
      return { segments, source: "youtube" };
    } catch (err: any) {
      return { segments: [], source: "none", error: err?.message ?? "Transcript unavailable" };
    }
  });
