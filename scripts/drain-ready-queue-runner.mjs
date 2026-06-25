#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";

const SENTINELS = [
  "DRAIN_QUEUE_EMPTY",
  "DRAIN_SESSION_COMPLETE",
  "DRAIN_NEEDS_HUMAN",
  "DRAIN_ABORT",
];

const DEFAULT_DRAIN_COMMAND =
  "/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1";

const config = {
  agentBin: process.env.AGENT_BIN ?? "codex",
  agentMode: process.env.AGENT_MODE ?? "codex-exec",
  drainCommand: process.env.DRAIN_COMMAND ?? DEFAULT_DRAIN_COMMAND,
  dryRun: process.env.DRY_RUN === "true",
  maxIterations: Number.parseInt(process.env.MAX_ITERATIONS ?? "10", 10),
};

if (!Number.isInteger(config.maxIterations) || config.maxIterations < 1) {
  console.error("MAX_ITERATIONS must be a positive integer.");
  process.exit(2);
}

for (let iteration = 1; iteration <= config.maxIterations; iteration += 1) {
  console.log(`\n[drain-runner] Starting clean agent session ${iteration}.`);
  const prompt = buildPrompt(config.drainCommand);
  const childConfig = buildChildConfig(config, prompt);

  if (config.dryRun) {
    console.log("[drain-runner] DRY_RUN=true; would spawn:");
    console.log(`${childConfig.command} ${childConfig.args.join(" ")}`);
    console.log("\n[drain-runner] Prompt:");
    console.log(prompt);
    process.exit(0);
  }

  const result = await runChild(childConfig.command, childConfig.args);

  if (result.code !== 0) {
    console.error(`[drain-runner] agent process exited with code ${result.code}`);
    process.exit(result.code ?? 2);
  }

  const sentinel = findLastSentinel(result.output);
  if (!sentinel) {
    console.error("[drain-runner] No drain sentinel found in agent output.");
    process.exit(2);
  }

  console.log(`[drain-runner] Final sentinel: ${sentinel}`);

  if (sentinel === "DRAIN_QUEUE_EMPTY") {
    console.log("[drain-runner] Queue is empty; stopping successfully.");
    process.exit(0);
  }

  if (sentinel === "DRAIN_SESSION_COMPLETE") {
    console.log("[drain-runner] Session completed allowed work; spawning next clean session.");
    continue;
  }

  if (sentinel === "DRAIN_NEEDS_HUMAN") {
    console.error("[drain-runner] Drain needs human input; stopping.");
    process.exit(2);
  }

  if (sentinel === "DRAIN_ABORT") {
    console.error("[drain-runner] Drain aborted; stopping.");
    process.exit(2);
  }
}

console.error(`[drain-runner] MAX_ITERATIONS reached (${config.maxIterations}); stopping.`);
process.exit(2);

function buildPrompt(drainCommand) {
  return `You are running one clean agent session for the agent-loop-setup queue runner.

Invoke this command exactly once:
${drainCommand}

Rules:
- Let take-next-issue select/claim work.
- Do not query Linear outside the skill.
- Do not pick work manually.
- Respect MAX_ISSUES=1.
- After the command prints one of DRAIN_QUEUE_EMPTY, DRAIN_SESSION_COMPLETE, DRAIN_NEEDS_HUMAN, or DRAIN_ABORT, stop immediately.
- Do not start another issue in this session.
- The external runner will spawn the next clean session.`;
}

function buildChildConfig({ agentBin, agentMode }, prompt) {
  if (agentMode === "codex-exec") {
    return {
      command: agentBin,
      args: ["exec", prompt],
    };
  }

  if (agentMode === "claude-print") {
    return {
      command: agentBin,
      args: ["-p", prompt],
    };
  }

  if (agentMode === "fake") {
    return {
      command: agentBin,
      args: [process.env.FAKE_AGENT_SCRIPT ?? path.join("scripts", "fake-agent.mjs"), prompt],
    };
  }

  console.error(`Unsupported AGENT_MODE: ${agentMode}`);
  process.exit(2);
}

function runChild(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      const text = `[drain-runner] Failed to spawn agent process: ${error.message}\n`;
      output += text;
      process.stderr.write(text);
      resolve({ code: 2, output });
    });

    child.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

function findLastSentinel(output) {
  let found = null;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (SENTINELS.includes(trimmed)) {
      found = trimmed;
    }
  }

  return found;
}
