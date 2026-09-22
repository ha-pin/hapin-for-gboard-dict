#!/usr/bin/env -S node --import tsx

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const UPSTREAM_COMMIT = "27d3cab2b02b39857fe872c9a3b5bbbd9122f597";
const FILES = [
  "src/hapin_arabic_basic.dict.yaml",
  "src/hapin_arabic_basic_3000.extend.dict.yaml",
  "src/hapin_mixed_cyrillic_basic.dict.yaml",
  "src/hapin_mixed_cyrillic_basic_3000.extend.dict.yaml",
  "src/hapin_emoji.dict.yaml",
  "LICENSE",
] as const;

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fail(message: string): never {
  throw new Error(message);
}

function parseArguments(argv: readonly string[]): { checkout: string; destination: string } {
  const checkout = argv[0];
  if (checkout === undefined) {
    fail("usage: sync_upstream.ts CHECKOUT [--destination DIR]");
  }
  if (argv.length === 1) {
    return { checkout, destination: "vendor/rime-cloverpinyin" };
  }
  if (argv.length === 3 && argv[1] === "--destination" && argv[2] !== undefined) {
    return { checkout, destination: argv[2] };
  }
  return fail("usage: sync_upstream.ts CHECKOUT [--destination DIR]");
}

try {
  const { checkout, destination } = parseArguments(process.argv.slice(2));
  const actualCommit = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actualCommit !== UPSTREAM_COMMIT) {
    fail(`upstream is at ${actualCommit}, expected pinned commit ${UPSTREAM_COMMIT}`);
  }

  for (const relativeName of FILES) {
    const source = resolve(checkout, relativeName);
    const target = resolve(destination, relativeName);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }

  const lines = [
    "Source: https://github.com/ha-pin/rime-cloverpinyin\n",
    `Commit: ${UPSTREAM_COMMIT}\n`,
    "\nSHA-256:\n",
    ...FILES.map(
      (relativeName) =>
        `${digest(resolve(destination, relativeName))}  ${relativeName}\n`,
    ),
  ];
  writeFileSync(resolve(destination, "UPSTREAM.txt"), lines.join(""), "utf8");
  console.log(`Vendored ${FILES.length} files in ${destination}`);
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
