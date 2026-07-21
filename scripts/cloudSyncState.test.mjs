import assert from "node:assert/strict";
import { getCloudRenderState } from "../src/hooks/cloudSyncState.ts";

const initialWithoutData = getCloudRenderState({
  cloudLoaded: false,
  hadLocalDataAtMount: false,
  syncStatus: "Đang tải và gộp dữ liệu...",
  userId: "user-1",
});
assert.equal(initialWithoutData.isCloudLoading, true);
assert.equal(initialWithoutData.cloudLoadError, null);

const initialWithLocalData = getCloudRenderState({
  cloudLoaded: false,
  hadLocalDataAtMount: true,
  syncStatus: "Đang đồng bộ...",
  userId: "user-1",
});
assert.equal(initialWithLocalData.isCloudLoading, false);
assert.equal(initialWithLocalData.hasDashboardData, true);

const backgroundRefresh = getCloudRenderState({
  cloudLoaded: true,
  hadLocalDataAtMount: false,
  syncStatus: "Đang đồng bộ...",
  userId: "user-1",
});
assert.equal(backgroundRefresh.isCloudLoading, false);
assert.equal(backgroundRefresh.cloudLoadError, null);

const backgroundError = getCloudRenderState({
  cloudLoaded: true,
  hadLocalDataAtMount: false,
  syncStatus: "Chưa thể đồng bộ",
  userId: "user-1",
});
assert.equal(backgroundError.isCloudLoading, false);
assert.equal(backgroundError.cloudLoadError, null);

const initialError = getCloudRenderState({
  cloudLoaded: false,
  hadLocalDataAtMount: false,
  syncStatus: "Lỗi tải dữ liệu cloud",
  userId: "user-1",
});
assert.equal(initialError.isCloudLoading, false);
assert.match(initialError.cloudLoadError ?? "", /Không thể gộp dữ liệu cloud/);

console.log("Cloud sync render-state tests passed.");
