import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type DiscoveryCandidate = {
  youtubeId: string;
  title: string;
  channel: string;
  publishedAt: string;
  durationSeconds: number;
  status: "known" | "new";
  provenance: { method: "youtube-data-api-v3"; retrievedAt: string; uploadsPlaylistId: string };
};

export type DiscoveryState = {
  version: 1;
  knownYoutubeIds: string[];
  uploadsPlaylistId?: string;
  highWaterYoutubeId?: string;
  updatedAt?: string;
};

type FetchLike = typeof fetch;
type PlaylistResponse = {
  items?: Array<{ contentDetails?: { videoId?: string } }>;
  nextPageToken?: string;
};
type ChannelsResponse = {
  items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
};
type VideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
    contentDetails?: { duration?: string };
  }>;
};
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function parseDuration(value: string | undefined) {
  const match = value?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0;
}

function apiUrl(path: string, apiKey: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

function pacedRequest(
  fetchImpl: FetchLike,
  minimumDelayMs: number,
  sleep: (ms: number) => Promise<void>,
) {
  let lastRequestAt = 0;
  return async <T>(url: URL, retries: number): Promise<T> => {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const elapsed = Date.now() - lastRequestAt;
      if (lastRequestAt && elapsed < minimumDelayMs) await sleep(minimumDelayMs - elapsed);
      lastRequestAt = Date.now();
      try {
        const response = await fetchImpl(url, { headers: { accept: "application/json" } });
        if (response.ok) return (await response.json()) as T;
        const error = new Error(
          `YouTube Data API request failed: ${response.status} ${response.statusText}`,
        );
        if (!RETRYABLE_STATUS.has(response.status)) throw error;
        lastError = error;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const statusText = lastError.message.match(/\b(\d{3})\b/)?.[1];
        const status = statusText ? Number(statusText) : undefined;
        // Network failures have no HTTP status and are retried as transient. API responses
        // outside the explicit retry set fail closed immediately.
        if (attempt === retries || (status !== undefined && !RETRYABLE_STATUS.has(status))) {
          throw lastError;
        }
      }
      await sleep(250 * 2 ** attempt);
    }
    throw lastError ?? new Error("YouTube Data API request failed");
  };
}

export async function discoverYouTubeCatalog({
  apiKey,
  uploadsPlaylistId,
  channelId,
  channelHandle = "aiDotEngineer",
  knownYoutubeIds = [],
  highWaterYoutubeId,
  full = false,
  fetchImpl = fetch,
  retries = 3,
  minimumDelayMs = 250,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now = () => new Date().toISOString(),
}: {
  apiKey: string;
  uploadsPlaylistId?: string;
  channelId?: string;
  channelHandle?: string;
  knownYoutubeIds?: string[];
  highWaterYoutubeId?: string;
  full?: boolean;
  fetchImpl?: FetchLike;
  retries?: number;
  minimumDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => string;
}) {
  if (!apiKey.trim())
    throw new Error(
      "YOUTUBE_DATA_API_KEY is required; never use a VITE_ variable for this secret.",
    );
  const request = pacedRequest(fetchImpl, minimumDelayMs, sleep);
  let resolvedPlaylistId = uploadsPlaylistId;
  if (!resolvedPlaylistId) {
    const params: Record<string, string> = channelId
      ? { part: "contentDetails", id: channelId }
      : { part: "contentDetails", forHandle: channelHandle };
    const channels = await request<ChannelsResponse>(apiUrl("channels", apiKey, params), retries);
    resolvedPlaylistId = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!resolvedPlaylistId)
      throw new Error("Unable to resolve an uploads playlist from the configured YouTube channel.");
  }

  const orderedIds: string[] = [];
  let pageToken: string | undefined;
  let highWaterFound = false;
  do {
    const page = await request<PlaylistResponse>(
      apiUrl("playlistItems", apiKey, {
        part: "contentDetails",
        playlistId: resolvedPlaylistId,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      }),
      retries,
    );
    for (const item of page.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (!id || orderedIds.includes(id)) continue;
      if (!full && highWaterYoutubeId === id) {
        highWaterFound = true;
        break;
      }
      orderedIds.push(id);
    }
    pageToken = highWaterFound ? undefined : page.nextPageToken;
  } while (pageToken);

  const known = new Set(knownYoutubeIds);
  const metadata = new Map<string, NonNullable<VideosResponse["items"]>[number]>();
  for (let offset = 0; offset < orderedIds.length; offset += 50) {
    const ids = orderedIds.slice(offset, offset + 50);
    const page = await request<VideosResponse>(
      apiUrl("videos", apiKey, { part: "snippet,contentDetails", id: ids.join(",") }),
      retries,
    );
    for (const item of page.items ?? []) if (item.id) metadata.set(item.id, item);
  }
  const retrievedAt = now();
  const candidates = orderedIds.flatMap((youtubeId) => {
    const item = metadata.get(youtubeId);
    const title = item?.snippet?.title;
    const channel = item?.snippet?.channelTitle;
    const publishedAt = item?.snippet?.publishedAt;
    return title && channel && publishedAt
      ? [
          {
            youtubeId,
            title,
            channel,
            publishedAt,
            durationSeconds: parseDuration(item.contentDetails?.duration),
            status: known.has(youtubeId) ? ("known" as const) : ("new" as const),
            provenance: {
              method: "youtube-data-api-v3" as const,
              retrievedAt,
              uploadsPlaylistId: resolvedPlaylistId,
            },
          },
        ]
      : [];
  });
  return {
    candidates,
    uploadsPlaylistId: resolvedPlaylistId,
    highWaterYoutubeId: orderedIds[0] ?? highWaterYoutubeId,
    complete: full || !highWaterYoutubeId || !highWaterFound,
  };
}

export async function loadDiscoveryState(path: string): Promise<DiscoveryState> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<DiscoveryState>;
    return {
      version: 1,
      knownYoutubeIds: [...new Set(parsed.knownYoutubeIds ?? [])].sort(),
      uploadsPlaylistId: parsed.uploadsPlaylistId,
      highWaterYoutubeId: parsed.highWaterYoutubeId,
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { version: 1, knownYoutubeIds: [] };
    throw error;
  }
}

export async function saveDiscoveryState(path: string, state: DiscoveryState) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(
    temporary,
    `${JSON.stringify({ ...state, version: 1, knownYoutubeIds: [...new Set(state.knownYoutubeIds)].sort() }, null, 2)}\n`,
    "utf8",
  );
  await rename(temporary, path);
}
