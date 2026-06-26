---
name: execute-ready-issue
description: Implement exactly one already-claimed tracker issue that is in Active status and has acceptance criteria, ATDD plan, required commands, and stop conditions. Use after take-next-issue prints a /goal command. Finish by opening a PR with briefing or moving the issue to Needs Human.
metadata:
  author: marioaulima
  version: '1.0.0'
---

# Execute Ready Issue

This skill is the **implementation executor**. It takes one issue that `take-next-issue` already claimed (moved to `Active`, branch created, `/goal` printed), implements it against its acceptance criteria and ATDD plan, runs the required commands, and then hands off to `open-pr-with-briefing`.

It owns exactly two transitions: `Active → PR Open` (success) and `Active → Needs Human` (blocked). It does **not** pick issues, mark anything `Done`, or merge.

Tracker is Linear via the Linear MCP. See `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`. Use `mcp__claude_ai_Linear__*` tools, never `gh` or shell for issue operations.

## When this skill runs

| | |
|---|---|
| Runs after | `take-next-issue` prints a `/goal` command |
| Expects | `Status: Active`, branch `agent/<issue-key>-<short-slug>` |
| Owns | `Active → PR Open` and `Active → Needs Human` |
| Picks | nothing — operates on the one already-claimed issue |

**Do not run** when asked to select/claim an issue (that is `take-next-issue`), or to mark an issue `Done` (that happens after merge).

## Preconditions

Before implementing anything, validate **all** of these:

```txt
Status: Active
Branch: agent/<issue-key>-<short-slug> (checked out, clean enough to work)
Issue has a claim comment or clear execution context
No linked open PR (unless continuing changes on the same PR)
Has ## Acceptance criteria
Has ## ATDD plan
Has ### Required commands
Has ## Stop conditions
Blocked by: None — can start immediately
```

Required issue sections:

```md
## What to build
## Acceptance criteria
## ATDD plan
### Test surface
### Acceptance tests
### Required commands
## Stop conditions
## Blocked by
```

Optional but useful: `## Parent`, `## UI quality plan`.

If a precondition fails, **do not implement**:

1. Comment on the issue naming exactly what is missing or wrong.
2. Move to `Needs Human` (blocked/ambiguous) or back to `Planning` (missing ATDD/spec).
3. Stop and report.

## Procedure

### Step 1: Load context

1. Read the full issue (`mcp__claude_ai_Linear__get_issue`).
2. Read relevant comments (`mcp__claude_ai_Linear__list_comments`).
3. Read branch + repo state (`git status`, current branch, recent commits).

### Step 2: Build the execution checklist

Derive a checklist from:

- `## Acceptance criteria`
- `## ATDD plan` → `### Test surface`, `### Acceptance tests`, `### Required commands`
- `## Stop conditions`
- labels: `frontend`, `ui`, `auth`, `db-migration`, `external-service`, `risky`

Track it with TodoWrite.

### Step 3: Implement (behavior-first)

```txt
1. Understand the issue contract
2. Identify the affected surface
3. Add/adjust tests from the ATDD plan
4. Implement the smallest production change
5. Run focused checks
6. Iterate until they pass
7. Run the required commands
8. Prepare the PR briefing
9. Open the PR
```

- Write the planned tests first when practical, then production code.
- Keep scope tightly limited to the issue.
- Do **not** rewrite the plan unless it is clearly wrong or impossible — if the ATDD plan is wrong, incomplete, or unsafe, stop and move to `Needs Human`.

### Step 4: Required commands

Run the commands listed under `### Required commands`, using the **actual repo scripts** (not assumed names). Expected types:

```txt
test:unit  test:integration  typecheck  lint  format/check  impeccable detect
```

If a required command is unavailable or broken due to repo setup, stop and move to `Needs Human` — unless the fix is trivial and clearly part of this issue.

### Step 5: UI quality (only if labelled `frontend`, `ui`, or `requires-briefing`)

1. Read relevant product/design docs if present.
2. Use the Impeccable workflow if available; respect the existing design system/components.
3. Avoid visual regressions.
4. For interactive UI validation, use Chrome DevTools MCP first when available to exercise the running app and capture screenshots.
5. If Chrome DevTools MCP is unavailable, use Playwright/browser MCP as the fallback browser automation tooling.
6. Do not assume "Playwright" means the repo's Playwright test suite unless the issue's `### Required commands` or ATDD plan explicitly names a project Playwright command such as `pnpm playwright test` or `pnpm test:e2e`.
7. Capture screenshots, or explain why screenshots are not practical.
8. Add human QA steps to the PR briefing.

If the issue has `ui`, treat visual quality as part of the acceptance criteria.

### Step 6: Hand off

When implementation is complete and checks pass, use `open-pr-with-briefing`. Then:

```txt
Set status: PR Open
Remove label: ready-for-agent (if still present)
Keep context labels for history
```

Do **not** mark the issue `Done`.

## Testing rules

Source of truth is the issue's `### Acceptance tests`. Follow `testing-philosophy` if present.

- Prefer public-surface tests; prefer integration tests for behavior crossing app boundaries; use unit tests for pure logic / isolated decision rules.
- Mock only external boundaries — not internal collaborators.
- No snapshot-only tests as meaningful verification.
- Do not chase coverage percentages or test private details unless unavoidable.

## Risk-sensitive labels

If the issue has `risky`, `db-migration`, `external-service`, or `auth`, be more conservative. Stop **earlier** and move to `Needs Human` if:

- behavior is ambiguous
- credentials are missing
- destructive data changes are required
- migration risk is unclear
- provider behavior cannot be safely mocked
- auth/permission behavior is underspecified
- required commands fail for reasons unrelated to the issue

## Diagnose fallback

For an **unexpected** bug, failing test, or regression during implementation (not ordinary work), use the `diagnose` skill if present:

```txt
reproduce deterministically → minimize → hypothesize → instrument as needed →
fix root cause → add/adjust regression coverage at the correct seam →
remove temporary instrumentation before PR → note root cause in briefing
```

Do not use `diagnose` for ordinary implementation.

## Stop conditions

Always read and obey the issue's `## Stop conditions`. If any applies:

1. Stop implementation.
2. Do not open a PR unless explicitly useful.
3. Move the issue to `Needs Human`.
4. Comment naming the exact stop condition hit, plus concrete next steps.

## Must not

- pick another issue, or recursively re-select work
- modify unrelated features or silently expand scope
- perform broad refactors or change behavior not described in the issue
- add new dependencies without a clear reason
- modify secrets or production data; perform destructive DB ops without approval
- merge PRs or mark the issue `Done`
- ignore failing required commands, bypass hooks/CI, or remove tests to make checks pass

Discovered unrelated problems: document them (comment/follow-up), do not fix unless required for this issue.

## Output — success

```txt
Implemented <ISSUE-KEY>.
PR opened: <PR URL>
Issue moved to: PR Open

Checks run:
- <command>: passed
- <command>: passed

Briefing:
- <path or URL>
```

## Output — blocked

```txt
Stopped <ISSUE-KEY>.
Issue moved to: Needs Human.

Reason:
- <specific stop condition or blocker>

What I tried:
- <brief list>

Needed from human:
- <specific decision/input/access>
```

## Loop position

```txt
Backlog → Planning → Ready for Agent → Active → [THIS SKILL] → PR Open → Done
```

Runs after `take-next-issue`. Owns `Active → PR Open` and `Active → Needs Human`. Does not own `Backlog → Planning`, `Planning → Ready for Agent`, or `PR Open → Done`.
