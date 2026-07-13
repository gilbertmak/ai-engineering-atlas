import { VIDEOS } from "../src/data/videos";

type OEmbedResponse = { title?: string; author_name?: string };
type Result = {
  code: string;
  youtubeId: string;
  ok: boolean;
  status: number;
  differences: string[];
};

async function verify(video: (typeof VIDEOS)[number]): Promise<Result> {
  const source = new URL("https://www.youtube.com/oembed");
  source.searchParams.set("url", `https://www.youtube.com/watch?v=${video.youtubeId}`);
  source.searchParams.set("format", "json");
  const response = await fetch(source, {
    headers: { "user-agent": "ai-engineer-insight-atlas-source-check/2.0" },
  });
  if (!response.ok) {
    return {
      code: video.code,
      youtubeId: video.youtubeId,
      ok: false,
      status: response.status,
      differences: ["source unavailable"],
    };
  }

  const metadata = (await response.json()) as OEmbedResponse;
  const watchResponse = await fetch(`https://www.youtube.com/watch?v=${video.youtubeId}`, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const watchPage = await watchResponse.text();
  const publishedAt = watchPage.match(/"publishDate":"([^"]+)"/)?.[1] ?? "";
  const durationSeconds = Number(watchPage.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? NaN);
  const differences = [
    metadata.title === video.title ? null : `title: ${JSON.stringify(metadata.title)}`,
    metadata.author_name === video.sourceChannel
      ? null
      : `channel: ${JSON.stringify(metadata.author_name)}`,
    publishedAt === video.publishedAt ? null : `publishedAt: ${JSON.stringify(publishedAt)}`,
    durationSeconds === video.durationSeconds ? null : `durationSeconds: ${durationSeconds}`,
  ].filter((difference): difference is string => difference !== null);

  return {
    code: video.code,
    youtubeId: video.youtubeId,
    ok: differences.length === 0,
    status: response.status,
    differences,
  };
}

const results: Result[] = [];
for (let offset = 0; offset < VIDEOS.length; offset += 6) {
  results.push(...(await Promise.all(VIDEOS.slice(offset, offset + 6).map(verify))));
}

const failures = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    { checked: results.length, verified: results.length - failures.length, failures },
    null,
    2,
  ),
);
if (failures.length > 0) process.exitCode = 1;
