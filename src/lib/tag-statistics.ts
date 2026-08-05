import { ATLAS_TAGS, atlasTagLabel, atlasTagTheme } from "@/data/catalog-taxonomy";
import { videoTags, type AtlasTag, type Track, type Video } from "@/data/videos";

export type TagCount = {
  tag: AtlasTag;
  label: string;
  count: number;
  track: Track;
};

export function catalogTagCounts(videos: readonly Pick<Video, "tags">[]): TagCount[] {
  const counts = new Map<AtlasTag, number>(ATLAS_TAGS.map((tag) => [tag, 0]));
  for (const video of videos) {
    for (const tag of videoTags(video)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return ATLAS_TAGS.map((tag) => ({
    tag,
    count: counts.get(tag) ?? 0,
    label: atlasTagLabel(tag),
    track: atlasTagTheme(tag),
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
