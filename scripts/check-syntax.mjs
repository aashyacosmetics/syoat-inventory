import vm from "node:vm";
import { readProjectFile } from "./source-analysis.mjs";

const files = ["Code.gs", "syoat-app.js"];
let failed = false;

for (const file of files) {
  try {
    new vm.Script(readProjectFile(file), { filename: file });
    console.log(`OK  ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${file}`);
    console.error(error.message);
  }
}

if (failed) process.exitCode = 1;
