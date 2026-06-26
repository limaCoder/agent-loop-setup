# Agent Loop Setup

A reusable agentic coding workflow for turning product ideas into safely executable issues, pull requests, and human-reviewable changes.

This repository contains a project-level setup for working with coding agents such as Claude Code and Codex using:

* reusable agent skills
* Linear issue workflow conventions
* ATDD-driven issue preparation
* Claude/Codex hooks
* local safety gates
* PR review briefings
* human-in-the-loop stop conditions

The goal is to make agent work less like “vibe coding” and more like a controlled engineering loop.

## What this repo is

This repo is not an application.

It is a portable setup that can be copied into another software project to give coding agents a structured workflow.

It defines:

```txt
Idea
→ Planning
→ ATDD plan
→ Ready for Agent
→ Claimed by Agent
→ Implemented
→ PR with briefing
→ Human review
→ Done
```

The main idea is that agents should not freely pick work, guess product behavior, or silently open vague PRs.

Instead, they should operate inside a loop with:

* clear issue states
* explicit acceptance criteria
* ATDD plans
* required commands
* stop conditions
* PR briefings
* local hooks and quality gates

## Credits and inspirations

This setup builds on top of ideas, workflows, and agent skills from other engineers in the agentic coding ecosystem.

### Matt Pocock

This repo follows the agent-skill style popularized by Matt Pocock’s `skills` project.

Matt’s skills influenced the structure of this repository, especially the idea that agents should use small, focused, reusable skills instead of relying only on one large global instruction file.

The proprietary skills in this repo were designed to be created with Matt Pocock’s `write-a-skill` skill.

This setup is intended to work well alongside Matt-style skills such as:

* `grill-with-docs`
* `to-prd`
* `to-issues`
* `diagnose`

In this workflow, Matt-style planning skills can be used before the proprietary execution loop:

```txt
grill-with-docs
→ to-prd
→ to-issues
→ atdd-plan-for-issue
→ take-next-issue
→ execute-ready-issue
→ open-pr-with-briefing
```

### Flagrare

This repo also draws inspiration from Flagrare’s agent skills and testing philosophy.

Special thanks to Flagrare, who is also a friend, for the ideas behind:

* `codebase-explore`
* `testing-philosophy`
* `atdd-plan`

This repository’s proprietary `atdd-plan-for-issue` skill is directly inspired by Flagrare’s `atdd-plan`, but adapted to an issue-tracker workflow.

The difference is:

```txt
Flagrare's atdd-plan
→ plans acceptance-test-driven implementation

This repo's atdd-plan-for-issue
→ enriches an existing tracker issue with an ATDD execution plan,
   required commands, labels, and stop conditions before the issue
   can be moved to Ready for Agent
```

The `testing-philosophy` skill is treated as a normative reference for test strategy.

It informs decisions such as:

* which test level to use
* when integration tests are preferable
* when unit tests are enough
* what should be mocked
* what should not be mocked
* how to avoid implementation-detail tests
* how to avoid coverage theater

The `codebase-explore` skill is treated as the preferred way to inspect a repository before creating ATDD plans or executing issues.

### Proprietary layer in this repo

The skills in this repo are not intended to replace Matt Pocock’s or Flagrare’s skills.

They form a proprietary workflow layer on top of them.

The main additions are:

* Linear-specific issue status and label flow
* conservative `Ready for Agent` gating
* issue-level ATDD enrichment
* claim/lock workflow for one agent at a time
* execution loop with explicit stop conditions
* PR briefing artifact generation
* Claude/Codex hook integration
* local safety and quality gates

In short:

```txt
Matt Pocock skills
→ planning and skill-writing primitives

Flagrare skills
→ codebase exploration, testing philosophy, ATDD and PR inspiration

This repo
→ an opinionated end-to-end issue-to-PR agent loop
```

## Repository structure

```txt
.
├── AGENTS.md
├── CLAUDE.md
├── .agent/
│   ├── hooks/
│   │   ├── pre-bash-policy.mjs
│   │   ├── pre-file-edit-policy.mjs
│   │   ├── post-edit-format.mjs
│   │   ├── post-edit-tracker.mjs
│   │   ├── quality-gate.mjs
│   │   └── stop-reminder.mjs
│   └── state/
│       └── .gitkeep
├── .claude/
│   └── settings.json
├── .codex/
│   └── hooks.json
├── docs/
│   └── agents/
│       ├── domain.md
│       ├── issue-tracker.md
│       └── triage-labels.md
├── commands/
│   └── drain-ready-queue.md
├── scripts/
│   ├── drain-ready-queue-runner.mjs
│   ├── fake-agent.mjs
│   ├── test-drain-ready-queue-runner.mjs
│   └── test-pre-bash-policy.mjs
└── skills/
    ├── atdd-plan-for-issue/
    ├── drain-ready-issues/
    ├── execute-ready-issue/
    ├── open-pr-with-briefing/
    ├── setup-test-suite/
    └── take-next-issue/
```

## Core workflow

The workflow is built around Linear, but the concepts can be adapted to another issue tracker. Use setup-matt-pocock-skills from https://www.skills.sh/mattpocock/skills/setup-matt-pocock-skills to change the issue tracker.

Below is the list of statuses and labels to create in your issue tracker:

### Statuses

```txt
Backlog
Planning
Ready for Agent
Active
Needs Human
PR Open
Done
Canceled
Duplicate
```

### Labels

```txt
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix

needs-atdd
requires-briefing
frontend
ui
db-migration
risky
external-service
auth
```

Status answers:

```txt
Where is this issue in the workflow?
```

Labels answer:

```txt
What kind of decision, risk, or execution context applies?
```

## Skills

This repo contains proprietary skills that sit on top of upstream inspiration from Matt Pocock and Flagrare.

Some skills are expected to exist in the broader agent environment and are referenced by this workflow:

```txt
External / upstream skills:
- grill-with-docs
- to-prd
- to-issues
- diagnose
- codebase-explore
- testing-philosophy
```

This repo provides the project-specific execution loop:

```txt
Proprietary skills in this repo:
- setup-test-suite
- atdd-plan-for-issue
- take-next-issue
- execute-ready-issue
- open-pr-with-briefing
- drain-ready-issues
```

The proprietary skills are designed to be conservative: they should prefer stopping and asking for help over inventing product behavior, bypassing checks, or expanding scope.

### `setup-test-suite`

Sets up a repository’s baseline unit and integration test infrastructure.

Use when a repo has missing, weak, broken, or unconfigured test tooling.

It should be used once per repo, or when test infrastructure needs repair.

It is not for feature-specific tests inside normal issue execution.

### `atdd-plan-for-issue`

Turns an existing issue with acceptance criteria into an agent-ready issue.

It adds:

* `## ATDD plan`
* `### Test surface`
* `### Acceptance tests`
* `### Required commands`
* `## Stop conditions`

It uses the project’s testing philosophy to decide the right test level and what should or should not be mocked.

It does not implement tests or production code.

### `take-next-issue`

Selects and claims exactly one issue.

It only claims issues that are:

```txt
Status: Ready for Agent
Label: ready-for-agent
No label: needs-atdd
No label: needs-info
No label: ready-for-human
No label: wontfix
Not blocked
Not already claimed
Not linked to an open PR
```

On success, it:

1. validates the issue
2. creates/switches to a branch
3. moves the issue to `Active`
4. adds a claim comment
5. prints a `/goal` command for the executor

It does not implement code.

### `execute-ready-issue`

Implements exactly one already-claimed issue.

It expects:

```txt
Status: Active
Branch: agent/<issue-key>-<short-slug>
Acceptance criteria
ATDD plan
Required commands
Stop conditions
```

It implements the issue, runs required checks, and hands off to `open-pr-with-briefing`.

On success:

```txt
Active → PR Open
```

On blocker:

```txt
Active → Needs Human
```

It does not pick another issue, merge PRs, or mark issues as Done.

### `open-pr-with-briefing`

Opens or updates a PR and creates a human-readable review briefing.

The briefing explains:

* what problem was solved
* what behavior changed
* how it works now
* implementation decisions
* how to review
* how to manually QA
* what was verified
* risks and non-goals

It creates a self-contained HTML artifact at:

```txt
docs/pr-briefings/<issue-key-or-branch-slug>.html
```

It owns:

```txt
Active → PR Open
```

It does not implement feature code or merge PRs.

### `drain-ready-issues`

Runs the outer queue-drain loop by composing `take-next-issue`, `execute-ready-issue`, PR checks/merge, and Linear `Done`.

It does not select issues directly. `take-next-issue` remains the only issue selector and claimer.

Manual single-session drain:

```txt
/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true
```

Fresh-session-per-issue runner mode requires `MAX_ISSUES=1`:

```txt
/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1
```

The drain command must end with exactly one sentinel:

```txt
DRAIN_QUEUE_EMPTY
DRAIN_SESSION_COMPLETE
DRAIN_NEEDS_HUMAN
DRAIN_ABORT
```

Sentinel meanings:

* `DRAIN_QUEUE_EMPTY`: `take-next-issue` found no eligible issue; stop successfully.
* `DRAIN_SESSION_COMPLETE`: the current session completed its allowed work; spawn the next clean session.
* `DRAIN_NEEDS_HUMAN`: execution hit a human-input stop condition; stop and report.
* `DRAIN_ABORT`: infrastructure, tool, Git, GitHub, Linear, CI, merge, or local environment failed; stop and report.

## Fresh-session queue runner

The local runner exists only to create a real context boundary between issues. It does not query Linear, does not choose work, and does not replace `take-next-issue`.

The spawned agent must interpret the repo command from `commands/drain-ready-queue.md`. It should not try to run `/drain-ready-queue ...` as a literal shell command path.

The runner also strips inherited `CODEX_*` environment variables before spawning each child session so a fresh non-interactive run does not accidentally inherit the current Codex desktop/session harness.

Run the default Codex fresh-session-per-issue loop:

```bash
node scripts/drain-ready-queue-runner.mjs
```

Limit iterations:

```bash
MAX_ITERATIONS=5 node scripts/drain-ready-queue-runner.mjs
```

The default mode uses:

```txt
codex exec -a never -s danger-full-access "<prompt>"
```

This is intentional: the spawned session needs to create branches, write `.git/index.lock`, run hooks, and merge when allowed. If you need a tighter setup for debugging, override it with `AGENT_APPROVAL` and `AGENT_SANDBOX`.

Claude can be used with a one-shot print mode:

```bash
AGENT_MODE=claude-print AGENT_BIN=claude node scripts/drain-ready-queue-runner.mjs
```

The runner uses:

```txt
claude -p --permission-mode bypassPermissions "<prompt>"
```

If your local Claude setup still blocks required writes, enable the stronger mode:

```bash
CLAUDE_SKIP_PERMISSIONS=true AGENT_MODE=claude-print AGENT_BIN=claude node scripts/drain-ready-queue-runner.mjs
```

That adds:

```txt
--dangerously-skip-permissions
```

Claude command flags may need local adjustment depending on the installed CLI. Do not use resume or continue modes for this runner.

Validate without calling Codex, Claude, Linear, GitHub, or any real LLM:

```bash
FAKE_AGENT_SENTINELS=DRAIN_SESSION_COMPLETE,DRAIN_QUEUE_EMPTY \
AGENT_MODE=fake \
AGENT_BIN=node \
FAKE_AGENT_SCRIPT=scripts/fake-agent.mjs \
node scripts/drain-ready-queue-runner.mjs
```

Run the offline validation suite:

```bash
node scripts/test-drain-ready-queue-runner.mjs
node scripts/test-pre-bash-policy.mjs
```

## Hooks

Hooks live in `.agent/hooks` and are registered for Claude and Codex.

### Claude

Claude hooks are configured in:

```txt
.claude/settings.json
```

### Codex

Codex hooks are configured in:

```txt
.codex/hooks.json
```

After copying this setup into a repo, open Codex and run:

```txt
/hooks
```

Then review and trust the project hooks.

## Hook behavior

### `pre-bash-policy.mjs`

Runs before Bash commands.

Blocks dangerous or out-of-scope commands such as:

* `git reset --hard`
* `git clean -fd`
* `git push --force`
* `rm -rf /`
* `sudo`
* `curl | sh`
* `wget | sh`

It also runs the quality gate before `gh pr create` and `gh pr merge`.

### `pre-file-edit-policy.mjs`

Blocks edits to sensitive files such as:

* `.env`
* `.npmrc`
* `.pypirc`
* `.netrc`
* SSH keys
* `.pem`
* `.key`
* `secrets/`

### `post-edit-format.mjs`

Runs after file edits only if the target repo has a `package.json` with a `fix` script.

If the fix script uses Ultracite, it runs:

```txt
fix --skip=correctness/noUnusedImports
```

Otherwise it runs the repo’s normal `fix` script.

If no `fix` script exists, it exits silently.

### `post-edit-tracker.mjs`

Tracks whether frontend or UI files were changed.

If frontend-like files are touched, it writes:

```txt
.agent/state/frontend-changed
```

### `quality-gate.mjs`

Runs before PR creation and PR merge.

It checks available repo scripts such as:

* `typecheck`
* `lint`
* `test:unit`
* `test:integration`
* `test`

It also checks:

* no focused tests such as `test.only`
* no `.env` files changed
* PR briefing exists when product files changed
* UI check runs when frontend changes and a script exists

### `stop-reminder.mjs`

At the end of a turn, reminds the agent if frontend/UI changed but no briefing directory exists.

## Installing into a project

Copy the relevant files into the target repo:

```txt
.agent/
.claude/
.codex/
docs/agents/
skills/
AGENTS.md
CLAUDE.md
```

Then make hook scripts executable:

```bash
chmod +x .agent/hooks/*.mjs
```

If using Codex, run:

```txt
/hooks
```

and approve the project hooks.

If using Claude Code, run:

```txt
/hooks
```

and confirm the hooks are visible.

## Recommended first setup

In a new repo, run the setup in this order.

### 1. Install or verify the skills

Make sure these folders exist:

```txt
skills/setup-test-suite
skills/atdd-plan-for-issue
skills/take-next-issue
skills/execute-ready-issue
skills/open-pr-with-briefing
```

Also make sure the external/upstream skills you rely on are available in your agent environment:

```txt
grill-with-docs
to-prd
to-issues
diagnose
codebase-explore
testing-philosophy
```

### 2. Configure Linear conventions

Update:

```txt
docs/agents/issue-tracker.md
docs/agents/triage-labels.md
```

Make sure the team name, statuses, and labels match your Linear workspace.

### 3. Set up test infrastructure

Use:

```txt
setup-test-suite
```

This should configure the baseline unit/integration test commands that later issues will reference under:

```md
### Required commands
```

### 4. Create or refine issues

Use your normal planning flow, usually:

```txt
grill-with-docs
→ to-prd
→ to-issues
```

Then run:

```txt
atdd-plan-for-issue
```

on issues that have acceptance criteria but still need an ATDD plan.

### 5. Claim work

Run:

```txt
take-next-issue
```

It will select one eligible issue and print a `/goal` command.

### 6. Execute work

Copy the printed `/goal` command.

The executor should use:

```txt
execute-ready-issue
```

and finish by opening a PR through:

```txt
open-pr-with-briefing
```

## Expected issue shape

Issues should eventually contain:

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

Optional:

```md
## Parent
```

## Stop conditions

Every agent-ready issue should include concrete stop conditions.

Examples:

```md
Move this issue to `Needs Human` if:
- The expected behavior conflicts with existing product behavior.
- Required environment variables or credentials are missing.
- The database migration would require destructive data changes.
- The external provider behavior cannot be safely mocked.
- The implementation requires a product/design decision not covered by the acceptance criteria.
- Required commands fail for reasons unrelated to this issue.
```

Stop conditions are what keep the agent from guessing.

## Branch convention

Agent branches should use:

```txt
agent/<issue-key>-<short-slug>
```

Example:

```txt
agent/odin-123-follow-up-scheduler
```

## PR briefing convention

PR briefings should be written to:

```txt
docs/pr-briefings/<issue-key-or-branch-slug>.html
```

The briefing should be self-contained and committed with the PR.

It should not depend on external CDNs, fonts, or scripts.

## What this setup intentionally does not do

This repo does not:

* replace CI
* replace human review
* merge PRs automatically
* let agents pick arbitrary work
* encourage broad refactors
* chase coverage percentages
* force E2E tests for every issue
* assume every repo is JavaScript/TypeScript
* assume every repo uses Ultracite

Hooks are local guardrails.

CI should still enforce the final merge policy.

## Philosophy

This setup treats agents as capable executors, not autonomous product owners.

Humans own:

* product judgment
* taste
* prioritization
* ambiguous decisions
* final review
* merge decisions

Agents own:

* executing clearly specified issues
* following ATDD plans
* respecting stop conditions
* running checks
* producing reviewable PRs

The loop is designed to make agent work boring, inspectable, and reversible.

## License

Apache License 2.0.

See [LICENSE](./LICENSE).

This project also includes attribution notices for upstream inspiration in [NOTICE](./NOTICE).
