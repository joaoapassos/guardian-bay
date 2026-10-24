import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";
import { stageEligibility } from "./stage-gate.mjs";

const lease = labLease();
const target = Number(process.argv[2]);
const path = join(labDirectory, "sustained-stages.json");
const records = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
const result = stageEligibility(target, records, {
  runId: lease.runId,
  profileId: "representative-v1",
  buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
});
writeFileSync(
  `docs/validation/epic13-stage-${target}.json`,
  `${JSON.stringify({ ...result, runId: lease.runId, trafficSent: 0, note: "Preflight only; diagnostic 20-second runs do not qualify as sustained approval" }, null, 2)}\n`,
);
console.info(JSON.stringify(result));
if (!result.eligible) process.exitCode = 2;
