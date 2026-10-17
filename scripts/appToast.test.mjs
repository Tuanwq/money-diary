import assert from "node:assert/strict";
import test from "node:test";
import { dismissAppToast, getAppToasts, showAppToast } from "../src/components/feedback/appToast.ts";

test("pop-up notifications deduplicate, remain bounded and can be dismissed", () => {
  for (const item of getAppToasts()) dismissAppToast(item.id);
  const first = showAppToast("Không lưu được ảnh.");
  assert.equal(showAppToast("Không lưu được ảnh."), first);
  assert.equal(getAppToasts().length, 1);
  showAppToast("Đã lưu ảnh.", "success");
  showAppToast("Chờ đồng bộ.", "warning");
  showAppToast("Không tải được dữ liệu.");
  assert.equal(getAppToasts().length, 3);
  assert.equal(getAppToasts().some((item) => item.id === first), false);
  const current = getAppToasts()[0];
  dismissAppToast(current.id);
  assert.equal(getAppToasts().some((item) => item.id === current.id), false);
  for (const item of getAppToasts()) dismissAppToast(item.id);
});

test("error pop-up keeps recovery actions available", () => {
  let retries = 0;
  const id = showAppToast("Chưa thể đồng bộ.", "error", {
    actionLabel: "Thử lại", onAction: () => { retries += 1; },
  });
  const toast = getAppToasts().find((item) => item.id === id);
  assert.equal(toast?.actionLabel, "Thử lại");
  toast?.onAction?.();
  assert.equal(retries, 1);
  dismissAppToast(id);
});
