import assert from "node:assert/strict";
import {
  hasNewerAppBuild,
  isAppBuildInfo,
} from "../src/features/app-update/appUpdateModel.ts";

const currentBuild = {
  buildId: "1.0.0-abc12345-2026-07-25T10:00:00.000Z",
  builtAt: "2026-07-25T10:00:00.000Z",
  commit: "abc12345",
  version: "1.0.0",
};
const nextBuild = {
  ...currentBuild,
  buildId: "1.0.0-def67890-2026-07-25T11:00:00.000Z",
  builtAt: "2026-07-25T11:00:00.000Z",
  commit: "def67890",
};

assert.equal(isAppBuildInfo(currentBuild), true);
assert.equal(isAppBuildInfo({ ...currentBuild, buildId: "" }), false);
assert.equal(isAppBuildInfo({ ...currentBuild, commit: null }), false);
assert.equal(hasNewerAppBuild(currentBuild, null), false);
assert.equal(hasNewerAppBuild(currentBuild, currentBuild), false);
assert.equal(hasNewerAppBuild(currentBuild, nextBuild), true);

console.log("App update model tests passed.");
