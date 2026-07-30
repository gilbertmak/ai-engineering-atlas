import type { Track } from "@/data/videos";

export type TopicClassificationInput = {
  title: string;
  description?: string;
  transcript?: string;
};

const TOPIC_RULES: Array<{ track: Track; patterns: RegExp[] }> = [
  {
    track: "System Design",
    patterns: [
      /\bagents?\b/i,
      /\barchitect(?:ure|ing)?\b/i,
      /\borchestrat(?:e|ion)\b/i,
      /\bworkflows?\b/i,
      /\bskills?\b/i,
      /\bmcp\b/i,
      /\bmodel context protocol\b/i,
    ],
  },
  {
    track: "Data & Eval",
    patterns: [
      /\bevals?\b/i,
      /\bevaluat(?:e|ion|ing)\b/i,
      /\bbenchmarks?\b/i,
      /\bllm[- ]as[- ](?:a[- ])?judge\b/i,
      /\bsynthetic data\b/i,
      /\bdatasets?\b/i,
      /\btraining data\b/i,
    ],
  },
  {
    track: "Reliability",
    patterns: [
      /\breliab(?:le|ility)\b/i,
      /\bstructured outputs?\b/i,
      /\bpydantic\b/i,
      /\bretriev(?:al|e)\b/i,
      /\brag\b/i,
      /\bhallucinat(?:e|ion)\b/i,
      /\bproduction[- ]ready\b/i,
      /\bquality\b/i,
    ],
  },
  {
    track: "Observability",
    patterns: [
      /\bobservability\b/i,
      /\btrac(?:e|es|ing)\b/i,
      /\btelemetry\b/i,
      /\bmonitor(?:ing)?\b/i,
      /\blogging\b/i,
      /\blogfire\b/i,
      /\breplay\b/i,
    ],
  },
  {
    track: "Safety & Control",
    patterns: [
      /\bsafety\b/i,
      /\bsecure\b/i,
      /\bsecurity\b/i,
      /\bguardrails?\b/i,
      /\bgovernance\b/i,
      /\bprivacy\b/i,
      /\bred[- ]team\b/i,
      /\bhuman[- ]in[- ]the[- ]loop\b/i,
    ],
  },
  {
    track: "Deployment",
    patterns: [
      /\bdeploy(?:ment|ing)?\b/i,
      /\binference\b/i,
      /\bserving\b/i,
      /\bscal(?:e|ing)\b/i,
      /\blatency\b/i,
      /\bcosts?\b/i,
      /\bperformance\b/i,
      /\binfrastructure\b/i,
      /\bproduction\b/i,
      /\bship(?:ping)?\b/i,
    ],
  },
];

export function classifyVideoTopics(input: TopicClassificationInput): Track[] {
  const text = [input.title, input.description, input.transcript].filter(Boolean).join("\n");
  return TOPIC_RULES.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(
    ({ track }) => track,
  );
}
