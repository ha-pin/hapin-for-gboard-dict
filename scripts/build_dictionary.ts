#!/usr/bin/env -S node --import tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { strToU8, zipSync } from "fflate";

export const HEADER =
  "# Gboard Dictionary version:2\n" +
  "# Gboard Dictionary format:shortcut\tword\tlanguage_tag\tpos_tag\n";

const ARABIC_FILES = [
  "hapin_arabic_basic.dict.yaml",
  "hapin_arabic_basic_3000.extend.dict.yaml",
] as const;

const CYRILLIC_FILES = [
  "hapin_mixed_cyrillic_basic.dict.yaml",
  "hapin_mixed_cyrillic_basic_3000.extend.dict.yaml",
] as const;

const EMOJI_FILES = ["hapin_emoji.dict.yaml"] as const;

export const DEFAULT_LANGUAGE_TAGS = ["zh-CN", "zh-TW"] as const;

export interface Entry {
  shortcut: string;
  word: string;
  languageTag: string;
  posTag: string;
}

interface Arguments {
  sourceDir: string;
  outputDir: string;
  languageTags: string[];
}

export function readRimeEntries(path: string): Array<[word: string, code: string]> {
  const entries: Array<[string, string]> = [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/u);
  let inData = false;

  for (const [index, line] of lines.entries()) {
    if (!inData) {
      if (line.trim() === "...") {
        inData = true;
      }
      continue;
    }
    if (line.length === 0 || line.trimStart().startsWith("#")) {
      continue;
    }

    const fields = line.split("\t");
    const word = fields[0];
    const code = fields[1];
    if (!word || !code) {
      throw new Error(`${path}:${index + 1}: invalid Rime entry`);
    }
    if (/[	\r\n]/u.test(word + code)) {
      throw new Error(`${path}:${index + 1}: tabs/newlines are not supported`);
    }
    entries.push([word, code]);
  }

  if (!inData) {
    throw new Error(`${path}: Rime data marker (...) is missing`);
  }
  return entries;
}

function addEntries(
  destination: Entry[],
  sourceDir: string,
  filenames: readonly string[],
  expectedPrefix: "u" | "v",
  languageTag: string,
): void {
  for (const filename of filenames) {
    for (const [word, shortcut] of readRimeEntries(resolve(sourceDir, filename))) {
      if (!shortcut.startsWith(expectedPrefix)) {
        throw new Error(
          `${filename}: shortcut ${JSON.stringify(shortcut)} does not start with ${JSON.stringify(expectedPrefix)}`,
        );
      }
      destination.push({ shortcut, word, languageTag, posTag: "" });
    }
  }
}

function buildEntriesForLanguage(sourceDir: string, languageTag: string): Entry[] {
  const entries: Entry[] = [];
  addEntries(entries, sourceDir, ARABIC_FILES, "u", languageTag);
  addEntries(entries, sourceDir, CYRILLIC_FILES, "v", languageTag);

  const emojiEntries: Entry[] = [];
  addEntries(emojiEntries, sourceDir, EMOJI_FILES, "u", languageTag);
  entries.push(...emojiEntries);
  entries.push(
    ...emojiEntries.map((entry) => ({
      ...entry,
      shortcut: `v${entry.shortcut.slice(1)}`,
    })),
  );

  return entries;
}

export function buildEntries(
  sourceDir: string,
  languageTags: readonly string[] = DEFAULT_LANGUAGE_TAGS,
): Entry[] {
  if (languageTags.length === 0) {
    throw new Error("at least one language tag is required");
  }
  for (const languageTag of languageTags) {
    if (/[\t\r\n]/u.test(languageTag)) {
      throw new Error("language tag cannot contain tabs or newlines");
    }
  }

  const seen = new Set<string>();
  return languageTags.flatMap((languageTag) =>
    buildEntriesForLanguage(sourceDir, languageTag),
  ).filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function serialize(entries: readonly Entry[]): Uint8Array {
  const rows = entries.map(
    ({ shortcut, word, languageTag, posTag }) =>
      `${shortcut}\t${word}\t${languageTag}\t${posTag}\n`,
  );
  return strToU8(HEADER + rows.join(""));
}

export function createDictionaryZip(dictionaryBytes: Uint8Array): Uint8Array {
  return zipSync(
    {
      // ZIP timestamps have no timezone. A local constructor keeps the encoded
      // DOS timestamp identical on developer machines and GitHub Actions.
      "dictionary.txt": [dictionaryBytes, { mtime: new Date(1980, 0, 1, 0, 0, 0) }],
    },
    { level: 9 },
  );
}

export function build(
  sourceDir: string,
  outputDir: string,
  languageTags: readonly string[] = DEFAULT_LANGUAGE_TAGS,
): Readonly<Record<"u" | "v", number>> {
  const entries = buildEntries(sourceDir, languageTags);
  const dictionaryBytes = serialize(entries);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, "dictionary.txt"), dictionaryBytes);
  writeFileSync(
    resolve(outputDir, "PersonalDictionary-hapin.zip"),
    createDictionaryZip(dictionaryBytes),
  );

  return {
    u: entries.filter(({ shortcut }) => shortcut.startsWith("u")).length,
    v: entries.filter(({ shortcut }) => shortcut.startsWith("v")).length,
  };
}

function parseArguments(argv: readonly string[]): Arguments {
  const result: Arguments = {
    sourceDir: "vendor/rime-cloverpinyin/src",
    outputDir: "dist",
    languageTags: [],
  };

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(
        "usage: build_dictionary.ts [--source-dir DIR] [--output-dir DIR] [--language-tag TAG ...]",
      );
    }
    if (flag === "--source-dir") {
      result.sourceDir = value;
    } else if (flag === "--output-dir") {
      result.outputDir = value;
    } else if (flag === "--language-tag") {
      result.languageTags.push(value);
    } else {
      throw new Error(
        "usage: build_dictionary.ts [--source-dir DIR] [--output-dir DIR] [--language-tag TAG ...]",
      );
    }
  }
  if (result.languageTags.length === 0) {
    result.languageTags.push(...DEFAULT_LANGUAGE_TAGS);
  }
  return result;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const counts = build(args.sourceDir, args.outputDir, args.languageTags);
    console.log(
      `Built ${counts.u + counts.v} entries (u: ${counts.u}, v: ${counts.v}) for ${args.languageTags.join(", ")} in ${args.outputDir}`,
    );
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
