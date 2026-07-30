import type { Video } from "./videos";

export type IllustrativeExample = {
  situation: string;
  application: string;
  observableOutcome: string;
};

export type ContentBasis =
  "track_synthesis" | "transcript_backed" | "source_synthesis" | "metadata_only";

export type TalkInsight = {
  claim: string;
  implication: string;
  whenToUse: string;
  caveat: string;
  example: IllustrativeExample;
  contentBasis: ContentBasis;
  timestampSeconds: number | null;
  reviewedAt: string | null;
};

export const TALK_INSIGHTS: Partial<Record<Video["id"], TalkInsight>> = {
  v25: {
    claim:
      "DeepSWE argues that coding benchmarks should use original long-horizon tasks authored by engineers who understand the repositories instead of mining public pull requests. The result is a contamination-resistant evaluation that measures whether an agent can explore a real codebase, implement the objective and produce observable behavior that a verifier can accept.",
    implication:
      "Build evaluation tasks from scratch and separate the agent from the verifier so the benchmark tests engineering ability rather than memorized patches or a preferred implementation. Use realistic prompts, diverse repositories and program-based checks that reward any correct behavior while reducing false positives and false negatives.",
    whenToUse:
      "Use this when comparing coding agents, designing a long-horizon benchmark or deciding whether a new eval is measuring general engineering ability. It is especially useful when existing benchmarks cluster top models together or expose solutions, tests and git history that agents can exploit.",
    caveat:
      "A contamination-resistant benchmark still reflects its task mix, repository pool and verifier design. Track coverage, cost and harness effects before treating one leaderboard as a complete measure of coding capability.",
    example: {
      situation:
        "A coding benchmark is saturated because its tasks and gold patches are public and its tests check implementation details.",
      application:
        "Author fresh tasks with repository maintainers, isolate the verifier and check externally visible behavior rather than private helper names.",
      observableOutcome:
        "Model comparisons become harder to game and more informative about long-horizon engineering performance.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 63,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v21: {
    claim:
      "For production agent workloads, a stateful addressable execution primitive can remove much of the glue needed for persistence, hibernation, resumable streams and cross-client coordination. The deeper design move is to make the agent session itself a durable unit that can be found again after a pause or connection change.",
    implication:
      "Keep the agent loop and its tool connections attached to durable state so clients can reconnect to the same session. Add isolated execution where the workload needs stronger boundaries rather than forcing every tool call into a short-lived request-response path.",
    whenToUse:
      "Use this pattern for long-running tool loops, stateful Model Context Protocol servers or resumable clients. It is also useful when a globally distributed agent needs a stable identity and a clear latency budget across regions.",
    caveat:
      "A stateful primitive still needs isolation, lifecycle controls, observability and a clear recovery policy for failed or abandoned work.",
    example: {
      situation:
        "An agent loses its context when a tool call spans clients, pauses or needs to resume after a connection change.",
      application:
        "Persist the session and its tool connection behind an addressable stateful service, then let clients reconnect to the same agent instance.",
      observableOutcome:
        "A paused or multi-client trajectory can resume from durable state instead of restarting from a blank context.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 244,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v23: {
    claim:
      "Agent reliability starts with explicit state-machine architecture, a small prompt and a command-line build-and-test loop. Making transitions visible turns a growing collection of prompts and tools into a product that people can inspect, change and hand off without relying on a demo.",
    implication:
      "Make state transitions and completion observable while keeping the architecture human-owned. Put repeatable builds and end-to-end tests behind a CLI and continuous integration pipeline so every change has a shared path to evidence.",
    whenToUse:
      "Use this when an agent is becoming a maintained product or when other agents will modify it. It is especially valuable for long-running work where the next person needs to understand the current state and the reason a run stopped.",
    caveat:
      "A state machine and CI make change safer, but they do not replace task-specific evaluation, review or production guardrails.",
    example: {
      situation:
        "A coding agent has grown into a hard-to-test set of prompts, tools and implicit transitions.",
      application:
        "Model the loop as explicit states, trim prompt bloat, expose a CLI and let CI run the same build and end-to-end checks after each change.",
      observableOutcome:
        "A change can be built, tested and reviewed by a person or another coding agent without relying on a manual demo.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 276,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v22: {
    claim:
      "Separate the general agent loop from domain expertise by packaging procedural knowledge as composable skills that can include scripts and tools. Progressive disclosure lets the runtime discover what a skill can do before paying the context cost of loading its full instructions.",
    implication:
      "Skills reduce context pressure and make expertise easier to version, maintain and evaluate. They also provide a clean seam for composing organisation-specific procedures with external Model Context Protocol tools without rebuilding the core loop.",
    whenToUse:
      "Use this when one general agent spans many domains or when prompt and tool instructions are growing faster than the team can review them. It is also a strong fit when several teams need to share organisation-specific ways of working with clear ownership.",
    caveat:
      "Skills still need ownership, versioning, permissions, evaluation and a failure path when the loaded procedure or tool is wrong.",
    example: {
      situation:
        "A general agent repeatedly recreates the same domain procedure and consumes its context window with instructions it rarely needs.",
      application:
        "Store the procedure, scripts and supporting files as a skill, expose lightweight metadata first and load the full skill only when the task requires it.",
      observableOutcome:
        "The agent can add or update a domain capability without growing one monolithic prompt or rebuilding the core loop.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 269,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v18: {
    claim:
      "Agent evaluation must measure interaction with an environment, cost, reliability and task-specific outcomes because static benchmark wins do not describe an open-ended tool loop. A useful evaluation shows whether the system completes the real task under realistic constraints and whether the result is affordable enough to operate.",
    implication:
      "Build multidimensional evaluations with task metrics, realistic trajectories, cost accounting and human or domain-expert review. Treat cost and reliability as first-class outcomes alongside accuracy so a benchmark result cannot hide an unusable system.",
    whenToUse:
      "Use this before deployment and whenever benchmark results conflict with user outcomes. It is essential when an agent can take open-ended actions or call other models and tools because the failure surface is wider than a single model response.",
    caveat:
      "Evaluation metrics must reflect the real task and environment; a broad scorecard can still hide a failure mode if its weights are poorly chosen.",
    example: {
      situation:
        "An agent scores well on a static benchmark but performs poorly on real tasks or becomes too expensive once its tool loop expands.",
      application:
        "Evaluate realistic trajectories with task-specific metrics, cost accounting, human review and reliability checks in addition to benchmark scores.",
      observableOutcome:
        "A release decision shows the quality, cost and failure tradeoffs that a single leaderboard number would conceal.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 470,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v17: {
    claim:
      "Enterprise retrieval-augmented generation succeeds or fails as a system rather than as a model choice. Context handling, domain specialisation, workflow integration, audit trails and attribution determine whether a promising retrieval demo becomes a dependable product.",
    implication:
      "Design for production from the start and get feedback from real users before the architecture hardens. Integrate with existing workflows then validate generated claims with attribution and audit trails so usefulness and trust are tested together.",
    whenToUse:
      "Use this when enterprise data is noisy or the domain requires specialist context. It is the right frame when a retrieval pilot must cross the gap into regulated production usage with visible evidence of quality and operational fit.",
    caveat:
      "Attribution and audit trails improve trust, but they do not fix stale, incomplete or incorrectly scoped source data.",
    example: {
      situation:
        "A retrieval pilot works for a small friendly group but is expected to support thousands of use cases with security and compliance requirements.",
      application:
        "Treat the retrieval pipeline and workflow integration as the product, iterate with real users and add claim attribution and audit evidence before scaling.",
      observableOutcome:
        "The team can see whether the system is useful, trustworthy and operationally viable beyond the pilot audience.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 330,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v04: {
    claim:
      "Use an agent only when task ambiguity and value justify exploratory cost. Otherwise prefer a simpler workflow and design from the agent's actual context and available tools rather than from an abstract promise of autonomy.",
    implication:
      "Assess task complexity, value, error cost, verifiability and budgets before granting autonomy. Limit scope, use read-only access or add human review when errors are costly or hard to discover then expand the boundary only when the evidence supports it.",
    whenToUse:
      "Use this when choosing between a workflow and an agent or when designing a first production version. It gives teams a way to decide how much autonomy a consequential task should receive before implementation effort makes the choice feel inevitable.",
    caveat:
      "The right boundary depends on error cost, reversibility, observability and the quality of the human fallback.",
    example: {
      situation:
        "A team wants to use an agent for a task that is expensive to explore and difficult to verify when it fails.",
      application:
        "Start with a constrained workflow, expose only the tools the task needs and add autonomy only after the critical capabilities and error paths are understood.",
      observableOutcome:
        "The system earns broader autonomy through measured cost, latency, verifiability and failure behaviour instead of a demo impression.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 174,
    reviewedAt: "2026-07-29T00:00:00+08:00",
  },
  v19: {
    claim:
      "Rahul Sengottuvelu uses the bitter lesson to argue that agent scaffolding should leave room for more computation rather than encode every decision as handcrafted logic. His Ramp examples move from deterministic CSV mappings to models that can write code, run verifiers and spend additional compute when that improves generalization.",
    implication:
      "Keep classical code where it gives a clear contract then let the model enter the loop at the points where ambiguity is expensive to enumerate. Parallel attempts plus a concrete unit test or verifier can be cheaper than maintaining a long list of brittle vendor-specific branches.",
    whenToUse:
      "Use this when a team is deciding whether to add another heuristic or let a capable model explore a bounded space. It is especially relevant for messy inputs such as third-party schemas where engineer time is more scarce than moderate inference cost.",
    caveat:
      "More compute does not remove the need for budgets, isolation, verification and a clear failure path when the model produces an unsafe or unusable result.",
    example: {
      situation:
        "A data-import service keeps accumulating special cases for every new partner format.",
      application:
        "Give a constrained agent code execution, a target schema and a verifier then run bounded attempts before falling back to a reviewed mapping.",
      observableOutcome:
        "New formats can be handled by a general strategy while failures remain visible through verifier results and cost limits.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 440,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v24: {
    claim:
      "Pydantic AI and graph-based workflows make agent systems easier to reason about by putting typed data models around the model boundary and explicit structure around multi-step execution. The discussion connects those building blocks to compound systems where several focused components can be observed and tested instead of asking one giant model to do everything.",
    implication:
      "Use typed contracts for inputs and outputs then represent branching work as a graph with clear state transitions. Pair the runtime with traces and programmatic tests so a change in one component does not become an unexplained change in the whole agent.",
    whenToUse:
      "Use this when an agent has more than one meaningful stage or when its outputs feed tools, databases or other services. It is also useful when a team needs a common model for tests, traces and operational debugging across a growing framework.",
    caveat:
      "Graphs and schemas add coordination overhead so they should reflect real boundaries rather than decorate a short linear prompt chain.",
    example: {
      situation:
        "A support agent retrieves account data, reasons over it and then chooses between several actions.",
      application:
        "Define typed models for each stage and connect them as a graph with traceable transitions and explicit tool permissions.",
      observableOutcome:
        "A failed answer can be located to a retrieval, reasoning or action stage instead of being blamed on the entire model call.",
    },
    contentBasis: "source_synthesis",
    timestampSeconds: 617,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v20: {
    claim:
      "Real-world LLM evaluation is a layered feedback system rather than one score from one judge. The talk separates model evaluation from task evaluation then shows how router, component, session, trace and span-level checks help a team find where an application actually went wrong.",
    implication:
      "Start with traces so the team can see the path a request took then attach evaluations that explain the failure at the smallest useful level. Iterate from benchmark design through component development into production monitoring and prefer explanations over a number that cannot tell an engineer what to fix.",
    whenToUse:
      "Use this when an application has routing, function calling or several model and tool steps. It is especially useful when a single end-to-end score is too vague to guide prompt changes or when numeric judges collapse different failure modes into the same result.",
    caveat:
      "A detailed evaluation stack still depends on representative data and calibrated criteria. If the task definition is weak then more levels can make false confidence harder to notice.",
    example: {
      situation:
        "A support router sends a small set of requests to the wrong workflow but the final quality score barely moves.",
      application:
        "Add router and trace-level evaluations with explanations then use the failing cases to revise the routing prompt and regression set.",
      observableOutcome:
        "The team can identify the incorrect branch and measure whether the fix improves the affected slice without masking unrelated regressions.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 484,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v06: {
    claim:
      "Anthropic's prompt-engineering discussion treats prompting as system design rather than a hunt for magic wording. Effective prompts make the task, context, expected structure and escape routes explicit then improve through close reading of outputs and repeated tests across the conditions that matter.",
    implication:
      "Design prompts with the same care as an interface contract and keep the prompt close to the data and behavior it governs. Separate research prompts that seek useful variation from enterprise prompts that need consistency then test ambiguous cases before trusting a successful demo.",
    whenToUse:
      "Use this when a prompt controls a production workflow or when a team is tempted to solve an unclear requirement with another persona instruction. It is also useful for deciding where reasoning detail belongs in testing versus production and for treating jailbreak resistance as part of prompt quality.",
    caveat:
      "Prompt improvements are model and task dependent so a pattern that helps one capability can add noise or cost in another. Preserve a representative test set before adopting a new prompting style.",
    example: {
      situation:
        "A classification prompt works on clean examples but behaves unpredictably on incomplete requests.",
      application:
        "Add explicit context, an unknown path and edge-case tests then compare the result across enterprise and research-style objectives.",
      observableOutcome:
        "The prompt has a predictable response for ambiguity instead of forcing the model to invent a confident answer.",
    },
    contentBasis: "source_synthesis",
    timestampSeconds: 2718,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v08: {
    claim:
      "Robust retrieval-augmented generation is not a vector-search checkbox. The workshop builds a pipeline that combines dense retrieval with keyword search such as BM25, cross-encoder reranking and metadata filtering because different queries need different signals and long context can still lose relevant information.",
    implication:
      "Evaluate retrieval as its own system before tuning generation then choose chunking, score combination and filters against the domain. Keep the retriever precise enough to surface the right evidence while returning enough surrounding context for the model to synthesize a useful answer.",
    whenToUse:
      "Use this when a RAG prototype looks good on friendly questions but fails on identifiers, acronyms, long documents or domain-specific phrasing. It is also useful when adding a vector database has not improved answer quality and the team needs to inspect the retrieval stages directly.",
    caveat:
      "More retrieval stages increase latency and tuning surface area. Measure the end-to-end task outcome because better retrieval metrics do not automatically produce a better final response.",
    example: {
      situation:
        "A technical assistant retrieves semantically similar passages but misses exact error codes and returns too much irrelevant context.",
      application:
        "Blend BM25 with embeddings, rerank the candidates and filter by product metadata before assembling the answer context.",
      observableOutcome:
        "Exact identifiers and domain-relevant passages become easier to retrieve without simply increasing the context window.",
    },
    contentBasis: "source_synthesis",
    timestampSeconds: 878,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v12: {
    claim:
      "Production RAG is a data and evaluation discipline as much as a model integration. The talk moves from ingestion and querying through retrieval and synthesis then shows why chunking, reranking, metadata filters and domain-specific tuning must be measured against the actual application rather than assumed to help.",
    implication:
      "Create separate benchmarks for retrieval and final response quality then use user feedback or labelled examples to improve the weakest stage. Treat smaller retrieval units, richer metadata and tool-oriented document access as design choices that should earn their extra complexity through better task outcomes.",
    whenToUse:
      "Use this when a team is moving from a chat-over-documents demo into a production knowledge workflow. It is especially useful when longer context, more retrieved tokens or a new reranker has increased cost without making answers more reliable.",
    caveat:
      "Advanced retrieval and fine-tuning can improve a narrow domain while making maintenance harder. Keep a simple baseline and compare every change with the same task set and operating budget.",
    example: {
      situation:
        "A document assistant returns fluent answers but users report that the relevant section was never retrieved.",
      application:
        "Score retrieval separately from synthesis then tune chunk size, metadata filters and reranking against the failed questions.",
      observableOutcome:
        "The team can tell whether an improvement came from finding better evidence or from writing a better answer over the same evidence.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 333,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v03: {
    claim:
      "Pydantic's central idea is to make the model boundary look like ordinary typed software instead of a string that must be parsed with hope. Structured prompts, JSON schemas and validators let the application describe the output it needs then turn a validation error into a controlled retry or an explicit failure.",
    implication:
      "Model the prompt, data and behavior together in a reusable type then let downstream code consume a validated object. The same structures can represent query plans, knowledge graphs and modular workflows so language-model output becomes something a classical system can inspect and execute.",
    whenToUse:
      "Use this whenever model output feeds a tool call, API request, database write or another program. It is especially valuable when a team is maintaining regular expressions for JSON or when one output schema is reused across several workflows.",
    caveat:
      "A schema can make failure legible but it cannot make an underspecified task correct. Leave an explicit unknown or escape-hatch path instead of forcing the model to fabricate a value that satisfies the type.",
    example: {
      situation:
        "An extraction service occasionally emits malformed JSON that breaks a downstream request.",
      application:
        "Define a typed response model with field validators and retry only the failed response with the validation feedback.",
      observableOutcome:
        "Malformed output becomes a measured validation event and the downstream service receives a predictable object or a clear failure.",
    },
    contentBasis: "transcript_backed",
    timestampSeconds: 233,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
  v05: {
    claim:
      "Evaluating LLM applications is presented as an engineering practice that combines data selection, automated checks, meaningful metrics and human judgment. The useful question is not whether a model looks impressive in isolation but whether the application behaves well on the tasks and failure modes that matter in production.",
    implication:
      "Build an evaluation set from real application data then compare automated metrics with human review before turning a score into a release gate. Keep the instrumentation close to the model and workflow so failures can be traced back to the input, prompt, model or surrounding code.",
    whenToUse:
      "Use this when a team is starting an evaluation program or when a demo has outpaced its evidence. It gives a practical checklist for deciding what to measure and where human evaluation remains necessary.",
    caveat:
      "No single metric captures every generative failure. A small or unrepresentative evaluation set can make a polished dashboard look more certain than the product really is.",
    example: {
      situation:
        "A summarization feature is approved from a handful of hand-picked examples but users report omissions after launch.",
      application:
        "Collect representative traces, define omission and factuality checks then calibrate automated scores against human review.",
      observableOutcome:
        "The release decision is tied to observed user tasks and known failure modes instead of a demo-only impression.",
    },
    contentBasis: "source_synthesis",
    timestampSeconds: null,
    reviewedAt: "2026-07-30T00:00:00+08:00",
  },
};

export const TALK_INSIGHTS_BY_YOUTUBE_ID = new Map(
  Object.entries(TALK_INSIGHTS).map(([videoId, insight]) => [videoId, insight] as const),
);

export function talkInsightForVideo(video: Pick<Video, "id" | "youtubeId">) {
  return TALK_INSIGHTS[video.id] ?? TALK_INSIGHTS_BY_YOUTUBE_ID.get(video.youtubeId);
}
