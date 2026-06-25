#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const hook = path.join(root, ".agent/hooks/pre-bash-policy.mjs");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-bash-policy-test-"));
const gateLog = path.join(tmpDir, "quality-gate.log");
const fakeGate = path.join(tmpDir, "fake-quality-gate.mjs");

fs.writeFileSync(
  fakeGate,
  `#!/usr/bin/env node
import fs from "node:fs";
fs.appendFileSync(${JSON.stringify(gateLog)}, "gate\\n");
`,
);

const cases = [
  {
    name: "gh pr create runs quality gate",
    command: "gh pr create --title test",
    expectedStatus: 0,
    expectedGateRuns: 1,
  },
  {
    name: "gh pr merge runs quality gate",
    command: "gh pr merge 123 --squash",
    expectedStatus: 0,
    expectedGateRuns: 1,
  },
  {
    name: "git reset hard is blocked",
    command: "git reset --hard HEAD",
    expectedStatus: 2,
    expectedGateRuns: 0,
  },
  {
    name: "git clean fd is blocked",
    command: "git clean -fd",
    expectedStatus: 2,
    expectedGateRuns: 0,
  },
  {
    name: "git push force is blocked",
    command: "git push --force origin main",
    expectedStatus: 2,
    expectedGateRuns: 0,
  },
  {
    name: "git checkout main is allowed",
    command: "git checkout main",
    expectedStatus: 0,
    expectedGateRuns: 0,
  },
  {
    name: "git pull origin main is allowed",
    command: "git pull origin main",
    expectedStatus: 0,
    expectedGateRuns: 0,
  },
];

for (const testCase of cases) {
  fs.rmSync(gateLog, { force: true });
  const result = spawnSync(process.execPath, [hook], {
    cwd: root,
    input: JSON.stringify({ tool_input: { command: testCase.command } }),
    env: {
      ...process.env,
      PRE_BASH_QUALITY_GATE_COMMAND: `${process.execPath} ${fakeGate}`,
    },
    encoding: "utf8",
  });

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(
    result.status,
    testCase.expectedStatus,
    `${testCase.name}\nexpected exit ${testCase.expectedStatus}, got ${result.status}\n${output}`,
  );

  const gateRuns = fs.existsSync(gateLog)
    ? fs.readFileSync(gateLog, "utf8").trim().split("\n").filter(Boolean)
        .length
    : 0;
  assert.equal(
    gateRuns,
    testCase.expectedGateRuns,
    `${testCase.name}\nexpected ${testCase.expectedGateRuns} gate run(s), got ${gateRuns}\n${output}`,
  );
}

console.log("pre-bash policy tests passed");
