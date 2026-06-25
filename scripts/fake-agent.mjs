#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const sequence = (process.env.FAKE_AGENT_SENTINELS ?? "DRAIN_QUEUE_EMPTY")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const stateFile =
  process.env.FAKE_AGENT_STATE_FILE ?? path.join(".agent", "state", "fake-agent-state.json");
const exitCode = Number.parseInt(process.env.FAKE_AGENT_EXIT_CODE ?? "0", 10);

const state = readState(stateFile);
const index = state.invocations;
const sentinel = sequence[Math.min(index, sequence.length - 1)] ?? "DRAIN_QUEUE_EMPTY";

writeState(stateFile, { invocations: index + 1 });

console.log(`[fake-agent] invocation ${index + 1}`);

if (sentinel !== "NONE") {
  console.log(sentinel);
}

process.exit(Number.isInteger(exitCode) ? exitCode : 0);

function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { invocations: 0 };
  }
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
