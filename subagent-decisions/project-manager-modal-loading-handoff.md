# Project Manager handoff: coordinated modal loading

## Task summary

Review and correct the staged modal render shown in the 30 July screen recording.

## Key facts

- Reviewed insights load through a deferred module after an approved modal opens.
- The real Open on YouTube action previously rendered outside that readiness boundary.
- This made the final action appear before the modal’s principal text.

## Decision

Keep deferred insight loading, show representative text placeholders and a non-interactive action-shaped placeholder, then reveal the insight and real YouTube action together.

## Acceptance and validation

- The real source action is absent while an approved insight is loading.
- The placeholder preserves the final action’s layout without looking operable.
- The loading state remains politely announced.
- Metadata-only modal content remains immediate.
- Eval validation, typecheck and production build pass.

## Risks

- Long insight content can still make the modal grow beyond the placeholder height.
- Slow-network visual validation should be repeated on the deployed Lovable revision.
