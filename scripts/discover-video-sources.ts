import { VIDEOS } from "../src/data/videos";

type Candidate = {
  youtubeId: string;
  title: string;
  channel: string;
  score: number;
};

const stopwords = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "from",
  "how",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function candidateScore(targetTitle: string, speaker: string, title: string, channel: string) {
  const targetTokens = new Set(tokens(targetTitle));
  const candidateTokens = new Set(tokens(title));
  const overlap = [...targetTokens].filter((token) => candidateTokens.has(token)).length;
  const titleScore = targetTokens.size === 0 ? 0 : overlap / targetTokens.size;
  const speakerTokens = tokens(speaker).filter((token) => !["team", "independent"].includes(token));
  const speakerScore = speakerTokens.some((token) => candidateTokens.has(token)) ? 0.2 : 0;
  const channelScore = channel.toLowerCase() === "ai engineer" ? 0.15 : 0;
  return Number(Math.min(1, titleScore + speakerScore + channelScore).toFixed(3));
}

async function oembed(youtubeId: string) {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("url", `https://www.youtube.com/watch?v=${youtubeId}`);
  url.searchParams.set("format", "json");
  const response = await fetch(url);
  if (!response.ok) return null;
  return (await response.json()) as { title?: string; author_name?: string };
}

const requestedCodes = new Set(process.argv.slice(2));
const catalog =
  requestedCodes.size === 0 ? VIDEOS : VIDEOS.filter((video) => requestedCodes.has(video.code));
const discoveries = [];

for (const video of catalog) {
  const query = encodeURIComponent(`${video.title} ${video.sourceChannel} AI Engineer`);
  const response = await fetch(`https://www.youtube.com/results?search_query=${query}`, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const html = await response.text();
  const ids = [
    ...new Set([...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((match) => match[1])),
  ].slice(0, 10);

  const candidates = (
    await Promise.all(
      ids.map(async (youtubeId): Promise<Candidate | null> => {
        const metadata = await oembed(youtubeId);
        if (!metadata?.title || !metadata.author_name) return null;
        return {
          youtubeId,
          title: metadata.title,
          channel: metadata.author_name,
          score: candidateScore(
            video.title,
            video.sourceChannel,
            metadata.title,
            metadata.author_name,
          ),
        };
      }),
    )
  )
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  discoveries.push({
    code: video.code,
    catalogTitle: video.title,
    catalogChannel: video.sourceChannel,
    currentYoutubeId: video.youtubeId,
    candidates,
  });
}

console.log(JSON.stringify(discoveries, null, 2));
