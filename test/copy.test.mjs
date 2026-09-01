// Words on the page: how they are set and what they claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CSS = await readFile(new URL("../app/css/style.css", import.meta.url), "utf8");

test("labels are set in sentence case, never forced to capitals", () => {
  assert.doesNotMatch(CSS, /text-transform:\s*uppercase/);
});
