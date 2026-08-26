import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("STUCO Hours Desk product surface is present", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Keep opportunities/);
  assert.match(page, /25-hour limit/);
  assert.match(page, /MANDATORY STUCO Meeting/);
  assert.match(page, /Copy email/);
  assert.doesNotMatch(page, /codex-preview/);
});
