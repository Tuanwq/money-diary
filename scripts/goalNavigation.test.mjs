import assert from "node:assert/strict";
import {
  getGoalScreenPath,
  getMoneyStateFromPath,
} from "../src/hooks/useAppNavigation.ts";

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

console.log("Goal navigation tests passed.");
