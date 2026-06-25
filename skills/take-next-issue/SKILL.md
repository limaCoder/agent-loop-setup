---
name: take-next-issue
description: Select and claim exactly one Ready for Agent tracker issue, validate that it is execution-ready, move it to Active, prepare the branch, and print the /goal command that will run execute-ready-issue. Do not use to implement code or open PRs.
metadata:
  author: marioaulima
  version: '1.0.0'
---

# Take Next Issue

This skill is a **selector and handoff** skill. It finds the next safe issue, validates it is execution-ready, claims it (moves `Ready for Agent → Active`, prepares the branch, leaves a claim comment), and prints a copy/paste `/goal` command for the user or automation to run next.

It does **not** implement code, edit product files, run feature implementation, or open a PR. Its only side effects are: one branch, one status change, one claim comment, and printed output.

Tracker is Linear via the Linear MCP. See `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`. Use `mcp__claude_ai_Linear__*` tools, never `gh` or shell for issue operations.

## When this skill runs

| | |
|---|---|
| Performs only | the transition `Ready for Agent → Active` |
| Runs before | `/goal ... execute-ready-issue` |
| Picks | exactly one issue |
| On success | branch prepared, issue `Active`, claim comment, printed `/goal` |

**Do not run** when the request is to implement, test, review, or open a PR for an issue — that is `execute-ready-issue`. This skill stops at the handoff.

## Eligible issue criteria

Select an issue only if **all** are true:

```txt
Status: Ready for Agent
Has label: ready-for-agent
Does NOT have label: needs-atdd
Does NOT have label: needs-info
Does NOT have label: ready-for-human
Does NOT have label: wontfix
Does NOT have a linked open PR
Does NOT have an active claim/lock comment from another agent
Blocked by: no unresolved blocker issues — completed blockers do not block
```

If multiple match, choose the **oldest** eligible issue. If the user gave a specific issue key, validate **that issue only**.

## Procedure

### Step 1: Find the candidate

- User gave an issue key → fetch it (`mcp__claude_ai_Linear__get_issue`) and validate that one only.
- Otherwise → `mcp__claude_ai_Linear__list_issues` filtered to `Status: Ready for Agent` + `ready-for-agent`, sorted oldest first. Walk the list and take the first that passes every check below.

### Step 2: Validate eligibility

Reject (skip to next, or stop) if any disqualifier from **Eligible issue criteria** holds: a blocking label, a linked open PR, an unresolved blocker issue, or an active claim comment from another agent.

When checking Linear blocked-by relationships:

1. Fetch each blocker issue, not just the relationship name/key.
2. Treat blockers in a completed terminal state such as `Done`, `Canceled`, or `Duplicate` as resolved.
3. Treat blockers in active or incomplete states such as `Backlog`, `Planning`, `Ready for Agent`, `Active`, `Needs Human`, or `PR Open` as unresolved.
4. Only unresolved blockers disqualify the candidate.

If all blocked-by relationships point to resolved blocker issues, continue validating the candidate instead of skipping it.

### Step 3: Validate required sections

The issue body must contain all of these, and none clearly empty:

```md
## Parent (optional if parent does not exist)
## What to build
## Acceptance criteria
## ATDD plan
### Test surface
### Acceptance tests
### Required commands
## Stop conditions
## Blocked by
```

If any required section is missing or clearly incomplete, **do not claim**:

1. Keep or move the issue to `Planning`.
2. Add or keep the `needs-atdd` label if the ATDD plan is missing.
3. Add a concise comment naming exactly what is missing.
4. Print a short "not execution-ready" message (see Output).

Never silently skip a missing section.

### Step 4: Claim (only a fully valid issue)

1. Confirm the working tree is clean (`git status --porcelain`). If dirty, stop and report — do not claim.
2. Detect the default base branch (`git symbolic-ref refs/remotes/origin/HEAD`, else `main`).
3. Create or switch to a branch from the base:

   ```txt
   agent/<issue-key>-<short-slug>
   ```

   Lowercase the key; slug = 2–4 words from the title. Example: `agent/odi-123-follow-up-scheduler`.
4. Move the issue to `Active` (`mcp__claude_ai_Linear__save_issue` with the `Active` `stateId`).
5. Add a claim comment (`mcp__claude_ai_Linear__save_comment`):

   ```txt
   Claimed for agent execution.
   Branch: agent/<issue-key>-<short-slug>
   Claimed by: <agent/user if known>
   Claimed at: <ISO-8601 timestamp>
   Next step: run execute-ready-issue via /goal
   ```

If an active claim comment already exists, do **not** claim — pick another eligible issue or stop.

### Step 5: Print the handoff

Print exactly this shape (use the real Linear key, e.g. `ODI-123`):

```txt
Claimed <ISSUE-KEY>.
Branch created: agent/<issue-key>-<short-slug>.

Run:
/goal Complete Linear issue <ISSUE-KEY> using execute-ready-issue. Done means PR opened with briefing, checks green, and the issue moved to PR Open. Stop by moving the issue to Needs Human if any stop condition applies.
```

Do **not** run the `/goal` command. Only print it — `/goal` sets a bounded, observable completion condition and keeps the executor working until done/stop.

If the issue carries `risky`, `db-migration`, `external-service`, or `auth`, also print:

```txt
Warning: this issue has risk-sensitive labels. The executor must stop early if any stop condition applies.
```

## Risk labels are claimable

These labels do **not** block selection — claim normally, but the risk warning above applies: `risky`, `db-migration`, `external-service`, `auth`, `frontend`, `ui`, `requires-briefing`.

## No eligible issue

If nothing is eligible, print a concise report and stop. Do **not** create a new issue.

```txt
No Ready for Agent issue is currently eligible.

Blocked counts:
- Missing ATDD:
- Needs info:
- Human-only:
- Blocked:
- Already claimed:
- Already has open PR:
```

Only fill counts that are easy to determine from the tracker; otherwise state the single main reason no issue was selected.

## Not execution-ready output

When the chosen/only issue fails Step 3:

```txt
<ISSUE-KEY> is not execution-ready.
Missing: <list of missing/incomplete sections>.
Left in Planning; needs-atdd applied. Comment added.
Run atdd-plan-for-issue to make it ready.
```

## Must not

- implement code, create tests, or edit production files
- edit the ATDD plan except to report missing sections
- open or merge a PR
- pick more than one issue
- recursively call `execute-ready-issue`
- silently skip missing required sections
- claim issues with `needs-info`, `needs-atdd`, `ready-for-human`, or `wontfix`
- claim issues linked to an open PR
- claim issues blocked by an unresolved issue
- skip issues only because they have blocked-by relationships whose blocker issues are already resolved
- claim issues already actively claimed by another agent
- run the printed `/goal` command

## Loop position

```txt
Backlog → Planning → Ready for Agent → [THIS SKILL] → Active → PR Open → Done
```

This skill prepares the issue for `execute-ready-issue`; it performs only `Ready for Agent → Active`.
