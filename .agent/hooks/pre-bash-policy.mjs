#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";

const input = JSON.parse(await readStdin());
const command = input?.tool_input?.command ?? "";

function block(reason) {
  console.error(reason);
  process.exit(2);
}

function runQualityGate() {
  try {
    if (process.env.PRE_BASH_QUALITY_GATE_COMMAND) {
      execSync(process.env.PRE_BASH_QUALITY_GATE_COMMAND, {
        stdio: "inherit",
        cwd: process.cwd(),
        shell: true,
      });
    } else {
      execFileSync("node", [".agent/hooks/quality-gate.mjs"], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
  } catch {
    block("Quality gate failed. Fix checks before opening/updating/merging a PR.");
  }
}

const dangerousPatterns = [
  /\brm\s+-rf\s+(\/|\.)\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-fd\b/,
  /\bgit\s+push\s+--force\b/,
  /\bsudo\b/,
  /\bchmod\s+-R\s+777\b/,
  /\bdd\s+if=/,
  /\bmkfs\b/,
  /\bcurl\b.*\|\s*(sh|bash)\b/,
  /\bwget\b.*\|\s*(sh|bash)\b/,
];

for (const pattern of dangerousPatterns) {
  if (pattern.test(command)) {
    block(`Blocked dangerous command by repo policy: ${command}`);
  }
}

if (/\bgh\s+pr\s+(create|merge)\b/.test(command)) {
  runQualityGate();
}

process.exit(0);

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data || "{}"));
  });
}
