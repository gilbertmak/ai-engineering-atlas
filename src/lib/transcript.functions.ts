import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TranscriptSegment = { offset: number; duration: number; text: string };
export type TranscriptResult = {
  segments: TranscriptSegment[];
  language?: string;
  source: "youtube" | "none";
  error?: string;
};

// In-memory cache to avoid re-hitting YouTube for the same video.
// Persists for the lifetime of the server instance.
const CACHE = new Map<string, { at: number; value: TranscriptResult }>();
const CACHE_TTL_OK = 1000 * 60 * 60 * 24; // 24h for successful fetches
const CACHE_TTL_ERR = 1000 * 60 * 5; // 5m for failures (retry sooner)

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// Fetches the watch page, extracts a caption track URL from
// ytInitialPlayerResponse, then downloads the XML timedtext and parses it.
async function fetchTranscriptDirect(videoId: string): Promise<TranscriptResult> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const html = await fetch(watchUrl, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
  }).then((r) => r.text());

  // Detect anti-bot / consent walls
  if (/consent\.youtube\.com|captcha|unusual traffic/i.test(html) && !/"captions":/i.test(html)) {
    throw new Error("YouTube requires captcha for this IP right now. Try again later.");
  }

  const m = html.match(/"captions":(\{.*?\}),"videoDetails"/s);
  if (!m) throw new Error("No captions available for this video.");
  let captions: any;
  try {
    captions = JSON.parse(m[1]);
  } catch {
    throw new Error("Could not parse caption metadata.");
  }
  const tracks: any[] = captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) throw new Error("This video has no captions.");
  // Prefer English, then any manual track, then the first (often auto-generated).
  const pick =
    tracks.find((t) => /^en/i.test(t.languageCode) && t.kind !== "asr") ||
    tracks.find((t) => /^en/i.test(t.languageCode)) ||
    tracks.find((t) => t.kind !== "asr") ||
    tracks[0];
  const baseUrl: string = pick.baseUrl;
  const language: string | undefined = pick.languageCode;

  const xml = await fetch(baseUrl, { headers: { "User-Agent": UA } }).then((r) => r.text());
  const segments: TranscriptSegment[] = [];
  const re = /<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const text = decodeHtml(match[3].replace(/<[^>]+>/g, "")).trim();
    if (!text) continue;
    segments.push({
      offset: Number(match[1]),
      duration: Number(match[2] ?? 0),
      text,
    });
  }
  if (segments.length === 0) throw new Error("Transcript was empty.");
  return { segments, source: "youtube", language };
}

export const getTranscript = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ videoId: z.string().min(6) }).parse(data))
  .handler(async ({ data }): Promise<TranscriptResult> => {
    const id = data.videoId;
    const cached = CACHE.get(id);
    if (cached) {
      const ttl = cached.value.source === "youtube" ? CACHE_TTL_OK : CACHE_TTL_ERR;
      if (Date.now() - cached.at < ttl) return cached.value;
    }

    try {
      const value = await fetchTranscriptDirect(id);
      CACHE.set(id, { at: Date.now(), value });
      return value;
    } catch (err: any) {
      const value: TranscriptResult = {
        segments: [],
        source: "none",
        error: err?.message ?? "Transcript unavailable",
      };
      CACHE.set(id, { at: Date.now(), value });
      return value;
    }
  });
