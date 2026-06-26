#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const runner = path.join(root, "scripts/drain-ready-queue-runner.mjs");
const fakeAgent = path.join(root, "scripts/fake-agent.mjs");
const baseEnv = sanitizedEnv();

const cases = [
  {
    name: "continues after session complete and stops when queue is empty",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_SESSION_COMPLETE,DRAIN_QUEUE_EMPTY",
    },
    maxIterations: "5",
    expectedStatus: 0,
    expectedOutput: "DRAIN_QUEUE_EMPTY",
  },
  {
    name: "stops successfully when queue is empty",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_QUEUE_EMPTY",
    },
    maxIterations: "5",
    expectedStatus: 0,
    expectedOutput: "DRAIN_QUEUE_EMPTY",
  },
  {
    name: "exits non-zero when human input is needed",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_NEEDS_HUMAN",
    },
    maxIterations: "5",
    expectedStatus: 2,
    expectedOutput: "DRAIN_NEEDS_HUMAN",
  },
  {
    name: "exits non-zero on abort sentinel",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_ABORT",
    },
    maxIterations: "5",
    expectedStatus: 2,
    expectedOutput: "DRAIN_ABORT",
  },
  {
    name: "exits non-zero when no sentinel is printed",
    env: {
      FAKE_AGENT_SENTINELS: "NONE",
    },
    maxIterations: "5",
    expectedStatus: 2,
    expectedOutput: "No drain sentinel found",
  },
  {
    name: "exits non-zero when child exits non-zero",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_QUEUE_EMPTY",
      FAKE_AGENT_EXIT_CODE: "7",
    },
    maxIterations: "5",
    expectedStatus: 7,
    expectedOutput: "agent process exited with code 7",
  },
  {
    name: "respects max iterations",
    env: {
      FAKE_AGENT_SENTINELS: "DRAIN_SESSION_COMPLETE",
    },
    maxIterations: "2",
    expectedStatus: 2,
    expectedOutput: "MAX_ITERATIONS reached",
  },
];

for (const testCase of cases) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "drain-runner-test-"));
  const stateFile = path.join(tmpDir, "fake-agent-state.json");
  const result = spawnSync(process.execPath, [runner], {
    cwd: root,
    env: {
      ...baseEnv,
      AGENT_MODE: "fake",
      AGENT_BIN: process.execPath,
      FAKE_AGENT_SCRIPT: fakeAgent,
      FAKE_AGENT_STATE_FILE: stateFile,
      MAX_ITERATIONS: testCase.maxIterations,
      ...testCase.env,
    },
    encoding: "utf8",
  });

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(
    result.status,
    testCase.expectedStatus,
    `${testCase.name}\nexpected exit ${testCase.expectedStatus}, got ${result.status}\n${output}`,
  );
  assert.match(
    output,
    new RegExp(escapeRegExp(testCase.expectedOutput)),
    `${testCase.name}\nmissing output: ${testCase.expectedOutput}\n${output}`,
  );
}

const dryRun = spawnSync(process.execPath, [runner], {
  cwd: root,
  env: {
    ...baseEnv,
    DRY_RUN: "true",
    AGENT_MODE: "codex-exec",
    AGENT_BIN: "codex",
  },
  encoding: "utf8",
});

const dryRunOutput = `${dryRun.stdout}${dryRun.stderr}`;
assert.equal(dryRun.status, 0, dryRunOutput);
assert.match(
  dryRunOutput,
  /codex -a never exec -s danger-full-access/,
  dryRunOutput,
);
assert.match(
  dryRunOutput,
  /Read commands\/drain-ready-queue\.md and carry out its instruction exactly once\./,
  dryRunOutput,
);

const claudeDryRun = spawnSync(process.execPath, [runner], {
  cwd: root,
  env: {
    ...baseEnv,
    DRY_RUN: "true",
    AGENT_MODE: "claude-print",
    AGENT_BIN: "claude",
  },
  encoding: "utf8",
});

const claudeDryRunOutput = `${claudeDryRun.stdout}${claudeDryRun.stderr}`;
assert.equal(claudeDryRun.status, 0, claudeDryRunOutput);
assert.match(
  claudeDryRunOutput,
  /claude -p --permission-mode bypassPermissions/,
  claudeDryRunOutput,
);
assert.match(
  claudeDryRunOutput,
  /Do not execute \/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1 as a shell command or filesystem path\./,
  claudeDryRunOutput,
);

console.log("drain-ready-queue runner fake-agent tests passed");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizedEnv() {
  const env = { ...process.env };

  for (const key of Object.keys(env)) {
    if (key.startsWith("CODEX_")) {
      delete env[key];
    }
  }

  return env;
}
