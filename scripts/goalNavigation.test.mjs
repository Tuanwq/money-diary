import assert from "node:assert/strict";
import {
  getGoalScreenPath,
  getNavigationScrollTop,
  getMoneyStateFromPath,
} from "../src/hooks/useAppNavigation.ts";
import { shouldResetAppScroll } from "../src/app/router/routes.ts";
import { isProgressBehind } from "../src/utils/progressStatus.ts";

assert.deepEqual(getMoneyStateFromPath("/money/goals"), {
  page: "goals",
  goalScreen: "menu",
  goalId: undefined,
});
assert.equal(getMoneyStateFromPath("/money/goals/current").goalScreen, "current");
assert.equal(
  getMoneyStateFromPath("/money/goals/movements").goalScreen,
  "balance"
);
assert.deepEqual(getMoneyStateFromPath("/money/goals/secondary/goal-123"), {
  page: "goals",
  goalScreen: "subGoals",
  goalId: "goal-123",
});
assert.deepEqual(
  getMoneyStateFromPath("/money/goals/completed/detail/done-456"),
  {
    page: "goals",
    goalScreen: "completedDetail",
    goalId: "done-456",
  }
);
assert.equal(
  getGoalScreenPath("subGoals", "mục tiêu/1"),
  "/money/goals/secondary/m%E1%BB%A5c%20ti%C3%AAu%2F1"
);
assert.equal(
  getGoalScreenPath("completedDetail", "done-456"),
  "/money/goals/completed/detail/done-456"
);

assert.equal(getMoneyStateFromPath("/money/history").page, "history");
assert.equal(getMoneyStateFromPath("/money/history/journal").page, "history");
assert.equal(getMoneyStateFromPath("/money/history/expenses").page, "expenses");
assert.equal(
  getMoneyStateFromPath("/money/history/balance-checks").page,
  "balanceChecks"
);
assert.equal(getMoneyStateFromPath("/money/expenses").page, "expenses");
assert.equal(
  getMoneyStateFromPath("/money/balance-checks").page,
  "balanceChecks"
);

assert.equal(isProgressBehind(31, 42), true);
assert.equal(isProgressBehind(40, 42), false);

assert.equal(
  getNavigationScrollTop(
    { page: "goals", goalScreen: "subGoals" },
    { page: "goals", goalScreen: "subGoals" },
    860
  ),
  860
);
assert.equal(
  getNavigationScrollTop(
    { page: "goals", goalScreen: "subGoals" },
    { page: "goals", goalScreen: "completed" },
    860
  ),
  0
);
assert.equal(
  getNavigationScrollTop(
    { page: "goals", goalScreen: "subGoals" },
    { page: "goals", goalScreen: "subGoals" },
    860,
    120
  ),
  120
);

assert.equal(
  shouldResetAppScroll(
    { kind: "money", path: "/money/goals/secondary", dayMarkRoute: "today" },
    { kind: "money", path: "/money/goals/secondary/goal-1", dayMarkRoute: "today" }
  ),
  false
);
assert.equal(
  shouldResetAppScroll(
    { kind: "money", path: "/money", dayMarkRoute: "today" },
    { kind: "daymark", path: "/daymark/today", dayMarkRoute: "today" }
  ),
  true
);

console.log("Goal navigation tests passed.");
