---
name: atdd-plan-for-issue
description: Add an ATDD plan, required commands, and stop conditions to an existing tracker issue that already has acceptance criteria. Use after to-issues and before moving an issue to Ready for Agent. Do not use to implement tests or production code.
metadata:
  author: marioaulima
  inspired_by:
    - github.com/Flagrare/agent-skills/skills/atdd-plan
  endorsed_by:
    - testing-philosophy
  version: '1.0.0'
---

# ATDD Plan for Issue

This skill **enriches an existing tracker issue** so a later agent can execute it safely. It takes an issue that already has product scope (`## What to build`) and `## Acceptance criteria`, and adds an `## ATDD plan`, `### Required commands`, and `## Stop conditions`.

It is the bridge between `to-issues` (which creates the slice) and `take-next-issue` (which claims a ready issue). It does **not** write tests or production code. Its only output is a richer issue and the correct status/labels.

**REQUIRED BACKGROUND:** invoke `testing-philosophy` before writing the ATDD plan. It defines, layer-agnostically, what a good test is, behavior over implementation, the Testing Trophy, and the e2e floor. Every test-level decision below is its application to issue enrichment; the two are read together.

## When this skill runs

| | |
|---|---|
| Usual input | `Status: Planning`, `Label: needs-atdd` |
| Issue already has | `## What to build`, `## Acceptance criteria` (the product contract) |
| On success | `Status: Ready for Agent`, `+ready-for-agent`, `-needs-atdd` |
| On weak criteria | stays in `Planning`, keeps/adds `needs-info`, leaves a comment |

Tracker is Linear (team `odiniy`) via the Linear MCP. See `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`.

**Do not run** when: the issue has no acceptance criteria yet (send it back through `to-issues`); the issue is already `Ready for Agent`; or the request is to actually implement the tests/code (this skill stops at the plan).

## Procedure

### Step 1: Read the issue

Fetch the issue. Confirm it has `## What to build` and `## Acceptance criteria`. Treat the acceptance criteria as the **product contract**, never invent behavior beyond them. Preserve every existing section verbatim; you are inserting, not rewriting.

### Step 2: Explore just enough codebase

Gather only what the ATDD plan needs. If a `codebase-explore` skill exists, use it; otherwise inspect directly for:

- app type and the **primary public surfaces** (HTTP routes, CLI commands, UI flows, exported API)
- existing **test commands**, framework, and integration-test conventions
- database / ORM, and the test-DB strategy
- env-var conventions and external-service boundaries
- UI / design-system conventions **only if** `frontend`/`ui` labels apply

Do not over-explore. Stop once you can name the surfaces, commands, and boundaries.

### Step 3: Decide if the criteria are testable

If the acceptance criteria are vague, not observable, contradictory, missing important behavior, impossible to test, or depend on a missing product decision, **do not invent behavior**. Instead:

1. Leave the issue in `Planning`.
2. Keep or add `needs-info`; do **not** add `ready-for-agent`.
3. Add a concise comment naming exactly what is missing.
4. Propose specific questions or concrete acceptance-criteria edits.

Then stop. A safe "not ready" beats a confident wrong plan.

### Step 4: Write the ATDD plan into the issue

Insert/update the sections below (see template). Apply `testing-philosophy`:

- Map **every** acceptance criterion to **at least one** test idea.
- Prefer **3–5 acceptance tests** unless the issue is tiny.
- Prefer **public-surface** tests over implementation-detail tests.
- Prefer **integration** tests for behavior that crosses boundaries; use **unit** tests only for pure logic or isolated decision rules.
- **Mock only external boundaries** (network, clock, disk, third-party service). Do **not** mock internal collaborators by default → `Internal collaborators to mock: none`.
- For user-facing work, at least one test exercises the critical happy path end-to-end (not with E2E test suite, but with Chrome DevTools MCP (preferred) or Playwright/browser automation MCP).

### Step 5: Infer required commands

Read the repo's actual scripts/conventions, do not assume JS/TS. List the commands the implementing agent must run (test tiers, typecheck, lint). If commands are missing or unclear, say the repo may need `setup-test-suite` before this issue can be made ready, and treat that as a reason to **not** mark it ready.

### Step 6: Write concrete stop conditions

Adapt to the issue. Stop conditions tell the implementing agent when to bail to `Needs Human` rather than guess. Be specific (see template examples).

### Step 7: Set status and labels (only if safe)

If enriched and safe for agent execution:

```txt
Set status: Ready for Agent
Add label: ready-for-agent
Remove label: needs-atdd
Remove label: needs-info  (if no longer applicable)
```

Add context labels when applicable: `requires-briefing` (default yes for meaningful product changes), `frontend`, `ui` (use Impeccable if available), `db-migration`, `risky`, `external-service`, `auth`.

If the work is better for a human than an agent: add `ready-for-human`; do **not** add `ready-for-agent`; do **not** move to `Ready for Agent`.

`take-next-issue` only claims issues with `Status: Ready for Agent`, `ready-for-agent`, and none of `needs-atdd`/`needs-info`/`ready-for-human`/`wontfix`. Be conservative: when in doubt, leave it not-ready.

## Output issue shape

Preserve existing sections; insert `## ATDD plan` and `## Stop conditions` between `## Acceptance criteria` and `## Blocked by`. Never duplicate `## Acceptance criteria`.

```md
## ATDD plan

### Test surface
- Primary surface:
- Test levels:
- Database strategy:
- External boundaries to mock:
- Internal collaborators to mock: none

### Acceptance tests
1. **[Test name describing behavior, not a method]**
   - Maps to: [which acceptance criterion]
   - Given:
   - When:
   - Then:
   - Level: unit | integration | e2e
   - Notes:

### Required commands
- [actual repo command]

## Stop conditions
Move this issue to `Needs Human` if:
- The expected behavior conflicts with existing product behavior.
- Required environment variables or credentials are missing.
- The database migration would require destructive data changes.
- The external provider behavior cannot be safely mocked.
- The implementation requires a product/design decision not covered by the acceptance criteria.
- Required commands fail for reasons unrelated to this issue.
```

## Core rules

The skill must:

1. Preserve existing issue content. 2. Never duplicate `## Acceptance criteria`. 3. Treat acceptance criteria as the product contract. 4. Map every criterion to ≥1 test idea. 5. Prefer 3–5 acceptance tests unless tiny. 6. Prefer public-surface over implementation-detail tests. 7. Prefer integration tests for cross-boundary behavior. 8. Use unit tests only for pure logic/isolated rules. 9. Mock only external boundaries. 10. Do not mock internal collaborators by default. 11. Add/update `## ATDD plan`. 12. Add/update `## Stop conditions`. 13. Change labels/status only if safe to execute. 14. Do not implement tests. 15. Do not implement production code.

## Anti-patterns: refuse these

- Inventing product behavior not present in the acceptance criteria.
- Marking an issue `Ready for Agent` when criteria are vague, untestable, or blocked on a product decision.
- Snapshot-only verification, or vague tests like "should work".
- One test per function; testing private helpers unless unavoidable.
- Coverage-driven planning or coverage targets as a goal, coverage is a side effect of testing the right behaviors.
- Implementation-detail assertions (mock call counts on collaborators you own, internal state, private fields).
- Mocking internal collaborators instead of only true external boundaries.
- A user-facing issue whose tests never prove the layers connect (missing e2e floor).
- Assuming JS/TS commands; using scripts the repo does not actually define.
- Implementing the tests or production code, this skill stops at the enriched issue.
