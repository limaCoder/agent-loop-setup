---
name: drain-ready-issues
description: Sequentially drain Linear Ready for Agent issues end-to-end by composing take-next-issue, execute-ready-issue, PR merge, workspace/thread rollover, and the next issue handoff. Use when the user wants autonomous backlog draining, issue-by-issue execution, Conductor workspace-per-issue execution, or a goal that keeps working until no eligible ready-for-agent issues remain.
metadata:
  author: marioaulima
  version: '1.0.0'
---

# Drain Ready Issues

## Quick start

```txt
/goal Use drain-ready-issues with RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true to sequentially complete all eligible Linear ready-for-agent issues. Stop when no eligible issue remains or a stop condition requires human input.
```

This skill is the **outer orchestrator**. It does not implement features directly. It repeatedly delegates exactly one issue to `take-next-issue` and `execute-ready-issue`, then owns the post-PR merge, Linear `Done` transition, workspace/thread rollover, and next-issue continuation.

## Scope

- Work sequentially: one issue, one branch, one PR, one merge at a time.
- Respect optional arguments: `RUN_CONTEXT=local|conductor`, `WORKSPACE_MODE=same-thread|per-issue`, `MAX_ISSUES=<number>`, and `MERGE=true|false`.
- Use `take-next-issue` as the only issue selector and claimer.
- Use GitHub/PR tooling as the source of truth for PR state, checks, reviews, and mergeability.
- Prefer a fresh thread or workspace per issue when the host supports it; in Conductor, create a new workspace per issue instead of reusing the merged workspace.
- Never pick `ready-for-human`, `needs-atdd`, `needs-info`, `wontfix`, blocked, already-claimed, or already-open-PR issues.

## MAX_ISSUES and runner mode

`MAX_ISSUES=1` is the recommended mode for an external fresh-session queue runner. In that mode, this skill must complete at most one issue in the current agent session.

When `MAX_ISSUES` is reached:

- Stop successfully after the current issue.
- Do not continue to the next issue in the same thread or process.
- Print `DRAIN_SESSION_COMPLETE` as the final line.

This is not a queue-drained condition. It means this session completed its allowed work and the external runner may spawn a fresh clean session with the same command.

In local runner mode, do not attempt to create a new thread yourself. Stop with `DRAIN_SESSION_COMPLETE`; the runner owns fresh-session creation.

## Loop

1. Initialize completed count to `0`.
1. Confirm the local tree is clean before selecting work. If dirty, print `DRAIN_ABORT` and stop.
1. Run `take-next-issue`.
1. If no eligible issue exists, print `DRAIN_QUEUE_EMPTY` and stop.
1. If an issue was claimed, continue with the claimed issue instead of asking the user to paste the handoff.
1. Run `execute-ready-issue` for the claimed issue and follow its ATDD plan, required commands, and stop conditions exactly.
1. If execution moves the issue to `Needs Human`, print `DRAIN_NEEDS_HUMAN` and stop.
1. If execution opens or updates a PR and moves the issue to `PR Open`, identify the PR URL/number and verify its checks.
1. Wait for required checks to finish. Poll at reasonable intervals; do not busy-loop.
1. Merge only when all required checks are green, the PR is mergeable, there are no blocking reviews, and there are no unresolved merge conflicts.
1. After a successful merge, move the Linear issue to `Done` and add a comment with the merged PR URL and merge commit/SHA when available.
1. Increment completed count.
1. If completed count is greater than or equal to `MAX_ISSUES`, print `DRAIN_SESSION_COMPLETE` and stop.
1. If running in a normal local checkout, return to the default branch and refresh it:

```bash
git checkout main
git pull origin main
```

1. Repeat from the clean-tree check.

## Conductor workspace mode

When running inside Conductor:

- Treat one workspace as one issue/branch/PR lifecycle.
- After merge, do not keep draining inside the completed workspace.
- Create the next workspace directly from the repository's configured base branch/latest `origin/main`.
- Start the new workspace with the same agent harness selected for the current run, whether Claude or Codex.
- Send the new workspace this instruction: `Use drain-ready-issues to continue draining eligible Linear ready-for-agent issues.`
- Stop only if Conductor workspace creation is unavailable to the agent; print `DRAIN_ABORT` and report that the required workspace-control capability is missing. Do not ask the user to create the workspace manually.

## Stop conditions

Stop immediately and do not claim more work if:

- There is no eligible `ready-for-agent` issue: print `DRAIN_QUEUE_EMPTY`.
- The current session reaches `MAX_ISSUES`: print `DRAIN_SESSION_COMPLETE`.
- `execute-ready-issue` moves the issue to `Needs Human`: print `DRAIN_NEEDS_HUMAN`.
- The working tree is dirty with unrelated changes: print `DRAIN_ABORT`.
- `take-next-issue` cannot safely claim an issue: print `DRAIN_ABORT`.
- Required checks fail or cannot be run: print `DRAIN_ABORT`.
- CI fails, times out repeatedly, or requires unavailable credentials: print `DRAIN_ABORT`.
- The PR has blocking reviews, unresolved conflicts, branch protection that prevents merge, or manual approval requirements: print `DRAIN_ABORT`.
- Merge succeeds but `main` cannot be checked out or pulled cleanly: print `DRAIN_ABORT`.
- Running in Conductor requires a new workspace but workspace creation is unavailable to the agent: print `DRAIN_ABORT`.
- Linear or GitHub tooling is unavailable: print `DRAIN_ABORT`.

## Output

Every drain run must end by printing exactly one of these sentinel lines. The sentinel must be the final line of the run so an external runner can parse it.

```txt
DRAIN_QUEUE_EMPTY
```

Meaning: `take-next-issue` found no eligible `ready-for-agent` issue.

Runner behavior: stop the queue runner successfully.

```txt
DRAIN_SESSION_COMPLETE
```

Meaning: this session completed the allowed number of issues, usually one because `MAX_ISSUES=1`.

Runner behavior: spawn a new clean agent session with the same command.

```txt
DRAIN_NEEDS_HUMAN
```

Meaning: execution hit a stop condition that requires human input.

Runner behavior: stop and report.

```txt
DRAIN_ABORT
```

Meaning: infrastructure, tool, Git, GitHub, Linear, CI, merge, or local environment failed in a way that should not continue automatically.

Runner behavior: stop and report.
