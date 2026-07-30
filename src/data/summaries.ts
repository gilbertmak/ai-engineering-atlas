import type { Track } from "./videos";

export type IllustrativeExample = {
  situation: string;
  application: string;
  observableOutcome: string;
};

export const TRACK_SUMMARIES: Record<
  Track,
  { claim: string; implication: string; whenToUse: string; caveat: string }
> = {
  "System Design": {
    claim:
      "The interesting design decision in an LLM system is not the model — it's the boundary between the agent's execution loop and the domain-specific expertise it draws on. Keep the loop small, generic, and inspectable; move the knowledge, tools, and policies into versioned skills you can review and swap independently. Systems that survive teams and model upgrades treat orchestration as infrastructure and expertise as content.",
    implication:
      "Treat every capability (a tool call, a retrieval strategy, a domain-specific playbook) as a first-class artifact with a version, an owner, an eval, and a rollback story. The runtime becomes thin — a scheduler for skills — and each skill can evolve, be A/B tested, or be retired without touching the surrounding system. This also makes on-call diagnosable: a regression maps to a specific skill version, not a monolithic prompt no one dares to change.",
    whenToUse:
      "Reach for this pattern once a single agent starts serving multiple domains, once more than one team contributes to prompts, or once you find yourself branching one giant system prompt on user attributes. It is also the right shape when compliance or safety reviewers need to sign off on capabilities in isolation rather than reading a 12-page monolithic prompt.",
    caveat:
      "Every abstraction has a coordination cost. Splitting too early creates ceremony without payoff — three skills owned by one engineer is just three files. Start monolithic, extract a skill only when a real seam has appeared (a second consumer, a distinct owner, a divergent eval), and be honest about which skills are load-bearing versus decorative.",
  },
  "Data & Eval": {
    claim:
      "Evaluation is a product surface, not a notebook artifact. The talks that hold up in production frame evals the way backend engineers frame tests: they are the thing that lets you change the system safely. If you cannot measure a regression, you cannot ship an improvement — you can only ship vibes and hope the next user is generous.",
    implication:
      "Treat eval datasets as living code. Version them, review them in PRs, grow them from real production traces, and gate every deploy on a set of behaviors that matter to the business. Combine cheap heuristic checks with human-labeled slices and LLM-as-judge only where it has itself been calibrated against humans. The output is not a single accuracy number; it's a dashboard of behaviors you refuse to regress.",
    whenToUse:
      "Any time a change to a prompt, model, retrieval pipeline, or tool schema can silently degrade user-facing quality. That is essentially every change in an LLM system. Adopt evals before scaling traffic, before swapping models, and before letting more than one person edit the prompt — retrofitting evals under production pressure is where teams stall.",
    caveat:
      "Bad evals are worse than no evals: they encode false confidence. A benchmark that looks green while users churn is telling you your dataset is off, not that your system is good. Invest in dataset curation, labeled failure modes, and honest sampling from production before chasing more sophisticated scoring — an LLM judge on top of a shallow dataset just launders bad taste into a number.",
  },
  Reliability: {
    claim:
      "Structure is cheaper than parsing. The moment an LLM output feeds another program, free text becomes a liability — you are one unlucky sampling away from a runtime exception, a corrupted row, or a silently wrong tool call. Force the model into schemas the rest of the system can depend on, and reliability stops being a prayer and starts being a property.",
    implication:
      "Wrap every LLM call in typed contracts, validators, and bounded retries. Use structured-output APIs where they exist, function/tool schemas where they don't, and a small validation + repair loop for the edges. Downstream code should never negotiate with the model — it should consume a validated object or fail closed with a legible error you can trace.",
    whenToUse:
      "Any path where an LLM decision drives a tool call, a database write, a workflow branch, or a UI component with fixed props. Also whenever you find yourself writing regex to extract fields out of a completion — that is the signal to move the constraint upstream into the model call itself.",
    caveat:
      "Over-constraining schemas can strangle useful reasoning. If every field is required and every enum is closed, the model will fabricate to satisfy the shape instead of surfacing uncertainty. Leave room for 'unknown', 'needs_human', and short free-text rationale fields — reliability is about predictable failure modes, not fake certainty.",
  },
  Observability: {
    claim:
      "You cannot improve what you cannot see, and in LLM systems 'see' means more than latency and error rate. Prompts, tool spans, retrieved chunks, model versions, user feedback, and eval scores all belong in the same pane as your existing SRE signals. Observability is the difference between debugging a regression in an afternoon and rewriting the prompt on a hunch at 2am.",
    implication:
      "Instrument every LLM call with the inputs, outputs, tool spans, model version, and user or automated feedback tied back to a trace ID. Feed those traces into your eval sets, your error triage, and your product analytics. When quality drops, you should be able to filter to the exact 200 traces that changed and diff them against last week.",
    whenToUse:
      "The moment a system leaves one developer's laptop and starts serving real requests — even internal traffic counts. Retrofitting tracing after an incident is expensive and lossy; the cheapest time to add it is before you need it, and the second-cheapest is right now.",
    caveat:
      "Logging raw prompts and completions creates a PII and IP surface that legal will care about eventually. Bake in redaction, per-tenant retention limits, and access controls from day one. An observability system that leaks user data is a bigger incident than the bug it was meant to help you find.",
  },
  "Safety & Control": {
    claim:
      "Guardrails are a system property, not a model property. No single prompt, classifier, or fine-tune is going to make an agent safe on its own — safety comes from layered checks at the input, the output, and the action boundary, plus the humility to fail closed when any layer is uncertain. Treat it the way you treat security: defense in depth, assumed breach.",
    implication:
      "Combine policy checks, refusal audits, red-team suites, and human-in-the-loop escalation with the same rigor you apply to authz and secrets. Every high-impact action (payments, emails, deletions, external calls) should have an explicit allowlist, a rate limit, and a reversible path. Measure not only what you blocked but what you should have blocked and didn't.",
    whenToUse:
      "Any deployment where the model can take actions with real-world consequences, quote external sources users will trust, or reach users you don't personally know. That includes internal tools once they touch production data — 'it's just for the team' is where most incidents start.",
    caveat:
      "Over-cautious guardrails erode trust and usefulness faster than most teams admit. A model that refuses half of legitimate requests trains users to route around it, which is worse than a permissive system with good audit trails. Measure false positives and user friction alongside missed harms, and be willing to loosen when the data supports it.",
  },
  Deployment: {
    claim:
      "Shipping an LLM feature is a latency, cost, and quality tradeoff — pick two explicitly and design for the third. Every architectural choice, from model selection to caching to prompt length, is a move along that triangle. Teams that try to optimize all three at once end up with a system that is mediocre at all three and expensive to reason about.",
    implication:
      "Route requests across models by task, cache aggressively at the semantic layer, and treat model choice as a runtime concern behind a stable interface. Instrument p50/p95 latency and cost-per-request alongside quality metrics, and set explicit SLOs so tradeoffs are made deliberately rather than accidentally when the bill arrives.",
    whenToUse:
      "Once a prototype needs to serve real traffic under a budget and an SLA rather than a demo audience. The transition from 'it works in the notebook' to 'it works at 100 QPS at a price the business can absorb' is where most projects discover they built for the wrong point on the triangle.",
    caveat:
      "Premature multi-model routing hides bugs and makes evals harder — a regression in one model in one route can look like noise. Prove quality on a single model with clean traces first, then add routing as an escape hatch with its own tests. Complexity in the serving path should be earned, not assumed.",
  },
  Knowledge: {
    claim:
      "Useful context is a product of retrieval design, memory boundaries, and data meaning, not simply a larger prompt. Systems need to distinguish authoritative records from derived memories, then retrieve only the facts and relationships a task can justify.",
    implication:
      "Model the source of truth, ownership, freshness, and relationships explicitly. Combine keyword, semantic, and graph-aware retrieval where each earns its cost, and keep citations or source links available so people can verify the answer.",
    whenToUse:
      "Use this for assistants that must work across documents, long-running cases, knowledge bases, or business entities where a relevant fact without its history, owner, or relationship is not enough.",
    caveat:
      "Memory can preserve stale facts and confident mistakes. Define retention and refresh rules, retain links to the original source, and test retrieval separately from answer quality before adding more storage or graph complexity.",
  },
  "Developer Workflows": {
    claim:
      "Agentic coding changes the flow of engineering work, but it does not remove the need for scoped tasks, reviewable changes, and fast feedback. The most durable workflows give agents bounded repository context and let people retain responsibility for architecture and product decisions.",
    implication:
      "Treat specifications, repository search, tests, pull requests, and review feedback as parts of one controlled loop. Measure whether the workflow reduces rework and review debt, not only whether it produces code more quickly.",
    whenToUse:
      "Use this when teams are introducing coding agents, improving developer experience, or trying to automate repeatable engineering tasks while preserving code ownership and release controls.",
    caveat:
      "More generated code can overwhelm review capacity and hide architectural drift. Start with bounded tasks, explicit acceptance criteria, and reliable tests before expanding autonomy or connecting agents to high-impact workflows.",
  },
  "Models & Training": {
    claim:
      "Model choice and training strategy are engineering decisions with data, evaluation, inference cost, and maintenance consequences. A stronger base model is not automatically the best system when the task, data quality, and serving constraints are poorly understood.",
    implication:
      "Compare base models, post-training, synthetic data, and inference strategies against a representative task suite. Keep training data lineage and holdout evaluation separate, and optimize the smallest model or adaptation that reliably meets the product requirement.",
    whenToUse:
      "Use this when selecting models, planning fine-tuning or post-training, evaluating synthetic data, or deciding whether a capability gap belongs in the model, the context layer, or the surrounding product workflow.",
    caveat:
      "Benchmark gains can be contaminated, narrow, or too expensive to serve. Validate on held-out real tasks, track regressions by slice, and account for latency, reliability, privacy, and energy before treating a model result as a product result.",
  },
};

export const TRACK_EXAMPLES: Record<Track, IllustrativeExample> = {
  "System Design": {
    situation:
      "An incident-response agent has accumulated one large prompt that mixes orchestration, tool instructions, and team policy.",
    application:
      "Keep the execution loop stable, then extract the incident playbook into a versioned skill with its own owner and eval set.",
    observableOutcome:
      "A regression can be traced to one skill version and rolled back without replacing the surrounding runtime.",
  },
  "Data & Eval": {
    situation:
      "A prompt revision looks better in a demo, but the team cannot tell whether it regresses difficult production cases.",
    application:
      "Build a reviewed golden set from real failure modes and make it a deployment gate alongside deterministic checks.",
    observableOutcome:
      "The release shows which behaviors improved, which regressed, and which slices still need human review.",
  },
  Reliability: {
    situation:
      "A support workflow parses free-text model output before issuing refunds, and malformed fields occasionally reach downstream code.",
    application:
      "Move the contract upstream into a typed schema, validate every response, and fail closed after bounded repair attempts.",
    observableOutcome:
      "Schema failures become measurable events instead of silent data corruption or unpredictable tool calls.",
  },
  Observability: {
    situation:
      "An agent fails intermittently, but logs contain only the user prompt and final answer.",
    application:
      "Capture the model version, retrieved context, decisions, tool spans, and state transitions under one trace identifier.",
    observableOutcome:
      "Engineers can replay the failing path and isolate the changed input, tool response, or model behavior.",
  },
  "Safety & Control": {
    situation:
      "An agent can prepare and execute a high-value transfer through the same unrestricted tool path.",
    application:
      "Separate proposal from execution and gate the action with identity, policy, amount, and explicit approval checks.",
    observableOutcome:
      "The useful proposal is preserved while consequential execution remains reviewable, reversible, and auditable.",
  },
  Deployment: {
    situation:
      "A production assistant meets quality targets but misses its latency and cost budgets during peak traffic.",
    application:
      "Set explicit service-level objectives, measure cost per successful task, and route only proven task classes to smaller models.",
    observableOutcome:
      "Quality, p95 latency, and cost tradeoffs become visible before routing complexity is expanded.",
  },
  Knowledge: {
    situation:
      "A service agent answers from a large document set but cannot explain where a recommendation came from.",
    application:
      "Retrieve a small, source-linked set of current records and preserve entity relationships and freshness metadata.",
    observableOutcome:
      "The agent can give an answer with inspectable support, and operators can identify stale or missing knowledge.",
  },
  "Developer Workflows": {
    situation:
      "A team wants coding agents to speed up routine changes without creating an unreviewable stream of pull requests.",
    application:
      "Give the agent a bounded task, repository context, acceptance checks, and a pull-request review path owned by engineers.",
    observableOutcome:
      "Routine work moves faster while architectural decisions, test evidence, and release accountability remain visible.",
  },
  "Models & Training": {
    situation:
      "A product team sees a promising benchmark result and is considering a fine-tuned model for production.",
    application:
      "Compare it with a smaller baseline on held-out product tasks, then measure quality, latency, and cost by important user slice.",
    observableOutcome:
      "The rollout decision reflects real task value rather than one aggregate benchmark score.",
  },
};
