import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { strFromU8, unzipSync } from "fflate";

import {
  DEFAULT_LANGUAGE_TAGS,
  HEADER,
  build,
  buildEntries,
  serialize,
  type Entry,
} from "../scripts/build_dictionary.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIR = resolve(ROOT, "vendor/rime-cloverpinyin/src");
const entries = buildEntries(SOURCE_DIR);

function hasEntry(shortcut: string, word: string, candidates: readonly Entry[]): boolean {
  return candidates.some(
    (entry) => entry.shortcut === shortcut && entry.word === word,
  );
}

test("contains the expected text entries and isolates prefixes", () => {
  assert.equal(hasEntry("usalyemyetsez", "سالەمەتسىز", entries), true);
  assert.equal(hasEntry("vsalyemyetsez", "сәлеметсіз", entries), true);
  assert.equal(hasEntry("ugh", "ع", entries), true);
  assert.equal(hasEntry("vgh", "ғ", entries), true);
  assert.equal(
    entries.every(({ shortcut }) => shortcut.startsWith("u") || shortcut.startsWith("v")),
    true,
  );
});

test("makes emoji available in both modes", () => {
  assert.equal(hasEntry("ujurek", "❤", entries), true);
  assert.equal(hasEntry("vjurek", "❤", entries), true);
});

test("produces the expected number of unique entries", () => {
  assert.equal(entries.length, 17384);
  assert.equal(new Set(entries.map((entry) => JSON.stringify(entry))).size, entries.length);
});

test("limits every entry to Simplified and Traditional Chinese", () => {
  assert.deepEqual(
    [...new Set(entries.map(({ languageTag }) => languageTag))].sort(),
    [...DEFAULT_LANGUAGE_TAGS].sort(),
  );
  for (const languageTag of DEFAULT_LANGUAGE_TAGS) {
    assert.equal(
      entries.some(
        (entry) =>
          entry.shortcut === "usalyemyetsez" &&
          entry.word === "سالەمەتسىز" &&
          entry.languageTag === languageTag,
      ),
      true,
    );
  }
});

test("serializes Gboard v2 rows with four columns", () => {
  const text = strFromU8(serialize(entries));
  assert.equal(text.startsWith(HEADER), true);
  const rows = text.split("\n").slice(2, -1);
  assert.equal(rows.length > 0, true);
  assert.equal(rows.every((row) => row.split("\t").length === 4), true);
});

test("builds separate TXT and ZIP files for each Chinese language", () => {
  const outputDir = mkdtempSync(resolve(tmpdir(), "hapin-gboard-"));
  try {
    const results = build(SOURCE_DIR, outputDir);
    assert.deepEqual(
      readdirSync(outputDir).sort(),
      [
        "PersonalDictionary-hapin-zh-CN.zip",
        "PersonalDictionary-hapin-zh-TW.zip",
        "dictionary-zh-CN.txt",
        "dictionary-zh-TW.txt",
      ],
    );
    assert.deepEqual(
      results.map(({ languageTag }) => languageTag),
      [...DEFAULT_LANGUAGE_TAGS],
    );

    for (const result of results) {
      const dictionaryBytes = readFileSync(
        resolve(outputDir, result.dictionaryFilename),
      );
      const rows = dictionaryBytes.toString("utf8").split("\n").slice(2, -1);
      assert.equal(
        rows.every((row) => row.split("\t")[2] === result.languageTag),
        true,
      );

      const archive = unzipSync(readFileSync(resolve(outputDir, result.zipFilename)));
      assert.deepEqual(Object.keys(archive), ["dictionary.txt"]);
      assert.deepEqual(Buffer.from(archive["dictionary.txt"]), dictionaryBytes);
    }
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
