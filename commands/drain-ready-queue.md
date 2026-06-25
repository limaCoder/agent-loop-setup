---
description: Start the sequential Linear ready-for-agent drain loop.
argument-hint: [RUN_CONTEXT=local|conductor] [WORKSPACE_MODE=same-thread|per-issue] [MAX_ISSUES=<number>] [MERGE=true|false]
---

Invoke the `drain-ready-issues` skill to sequentially complete eligible Linear `ready-for-agent` issues.

Supported arguments:

- `RUN_CONTEXT=local|conductor`
- `WORKSPACE_MODE=same-thread|per-issue`
- `MAX_ISSUES=<number>`
- `MERGE=true|false`

Interactive/manual drain can omit `MAX_ISSUES`. External fresh-session runners should always pass `MAX_ISSUES=1`.

Runner-safe invocation:

```txt
/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1
```

If this host supports goal mode, set or continue this goal:

```txt
Use the drain-ready-issues skill to sequentially complete eligible Linear ready-for-agent issues with arguments from the user. If no arguments are provided, use RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true for safe manual use. For an external fresh-session runner, use RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1 and stop after exactly one final sentinel. In Conductor, use RUN_CONTEXT=conductor WORKSPACE_MODE=per-issue, create a fresh workspace from latest origin/main after each merged PR when the host supports programmatic workspace creation, and print DRAIN_ABORT if workspace creation is unavailable. Stop when no eligible issue remains, MAX_ISSUES is reached, or a stop condition requires human input.
```

Arguments from the user: `$ARGUMENTS`

Use the explicit arguments from the user instead of the defaults in the goal text. If no arguments are provided, assume `RUN_CONTEXT=local`, `WORKSPACE_MODE=same-thread`, and `MERGE=true`.

End by printing exactly one of:

```txt
DRAIN_QUEUE_EMPTY
DRAIN_SESSION_COMPLETE
DRAIN_NEEDS_HUMAN
DRAIN_ABORT
```
