import type { TalkInsight } from "@/data/talk-insights";

type TalkInsightRecord = Pick<TalkInsight, "claim" | "implication" | "whenToUse" | "caveat" | "example" | "contentBasis" | "timestampSeconds" | "reviewedAt">;

let recordsPromise: Promise<Record<string, TalkInsightRecord>> | undefined;

async function loadRecords() {
  if (!recordsPromise) {
    recordsPromise = fetch("/talk-insights.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load approved insights: ${response.status}`);
        return response.json() as Promise<{ records: Record<string, TalkInsightRecord> }>;
      })
      .then((payload) => payload.records);
  }
  return recordsPromise;
}

export async function loadTalkInsight(video: Pick<{ id: string; youtubeId: string }, "id" | "youtubeId">) {
  const records = await loadRecords();
  return records[video.id] ?? records[`youtube-${video.youtubeId}`];
}
