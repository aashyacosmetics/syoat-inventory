import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readProjectFile } from "../scripts/source-analysis.mjs";

for (const file of ["Code.gs", "syoat-app.js"]) {
  test(`${file} parses as JavaScript`, () => {
    assert.doesNotThrow(() => new vm.Script(readProjectFile(file), { filename: file }));
  });
}
