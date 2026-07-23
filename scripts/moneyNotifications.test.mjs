import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tempDir = await mkdtemp(join(tmpdir(), "money-notifications-"));
const ts = await loadTypeScript();
const sourceFiles = [
  "src/types.ts",
  "src/utils/date.ts",
  "src/utils/entries.ts",
  "src/utils/goals.ts",
  "src/utils/money.ts",
  "src/utils/progressStatus.ts",
  "src/features/notifications/types.ts",
  "src/features/notifications/config.ts",
  "src/features/notifications/dayMarkNotificationPlan.ts",
  "src/features/notifications/moneyDiaryNotificationPlan.ts",
  "src/features/daymark/types/daymark.ts",
];

async function loadTypeScript() {
  try {
    return (await import("typescript")).default;
  } catch {
    const pnpmDirectory = join(rootDir, "node_modules", ".pnpm");
    const entries = await readdir(pnpmDirectory);
    const typescriptDirectory = entries.find((entry) =>
      entry.startsWith("typescript@")
    );

    if (!typescriptDirectory) throw new Error("Không tìm thấy TypeScript.");

    const moduleUrl = pathToFileURL(
      join(
        pnpmDirectory,
        typescriptDirectory,
        "node_modules",
        "typescript",
        "lib",
        "typescript.js"
      )
    ).href;

    return (await import(moduleUrl)).default;
  }
}

async function transpile(sourceRelativePath) {
  const sourcePath = join(rootDir, sourceRelativePath);
  const targetPath = join(
    tempDir,
    sourceRelativePath.replace(/\.ts$/, ".js")
  );
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  const withExtensions = output.replace(
    /from "(\.{1,2}\/[^"]+?)(?<!\.js)"/g,
    'from "$1.js"'
  );

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, withExtensions, "utf8");
}

const entry = {
  id: "entry-1",
  date: "2026-07-23",
  diary: "",
  income: 100_000,
  receivedMoney: 1_000_000,
  bonusMoney: 20_000,
  orderCount: 1,
  workHours: 1,
  mood: "normal",
  note: "",
  createdAt: "2026-07-23T01:00:00.000Z",
};

const expense = {
  id: "expense-1",
  date: "2026-07-23",
  breakfast: 10_000,
  lunch: 20_000,
  dinner: 0,
  other: 0,
  note: "",
  createdAt: "2026-07-23T02:00:00.000Z",
};

const goals = {
  dailyIncome: 200_000,
  dailyHours: 4,
  weeklyIncome: 1_500_000,
  weeklyHours: 20,
  monthlyIncome: 0,
  monthlyHours: 0,
  bigGoalName: "Z Fold",
  bigGoalTarget: 30_000_000,
  bigGoalSaved: 10_000_000,
  bigGoalDeadline: "2026-08-20",
  bigGoalStartDate: "2026-07-01",
  subGoals: [],
  expenseBudgets: [],
};

try {
  await writeFile(join(tempDir, "package.json"), '{"type":"module"}', "utf8");
  await Promise.all(sourceFiles.map(transpile));

  const planner = await import(
    pathToFileURL(
      join(
        tempDir,
        "src/features/notifications/moneyDiaryNotificationPlan.js"
      )
    ).href
  );
  const config = await import(
    pathToFileURL(
      join(tempDir, "src/features/notifications/config.js")
    ).href
  );
  const dayMarkPlanner = await import(
    pathToFileURL(
      join(
        tempDir,
        "src/features/notifications/dayMarkNotificationPlan.js"
      )
    ).href
  );

  assert.equal(planner.getMoneyDiaryDayIncome(entry), 120_000);

  const totals = planner.getMoneyDiaryPeriodTotals(
    [entry],
    [expense],
    "2026-07-23",
    "2026-07-23"
  );
  assert.deepEqual(totals, {
    expense: 30_000,
    income: 1_120_000,
    net: 1_090_000,
  });

  const jobs = planner.buildMoneyDiaryNotificationPlan({
    balanceChecks: [],
    completedGoals: [],
    entries: [entry],
    expenses: [expense],
    goals,
    now: new Date("2026-07-23T03:00:00.000Z"),
    settings: config.DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS,
    userId: "user-1",
  });

  assert.equal(
    jobs.some(
      (job) =>
        job.notificationType === "daily_entry_reminder" &&
        job.payload.data.date === "2026-07-23"
    ),
    false
  );
  assert.equal(
    jobs.some(
      (job) =>
        job.notificationType === "expense_entry_reminder" &&
        job.payload.data.date === "2026-07-23"
    ),
    false
  );
  assert.equal(
    jobs.some(
      (job) =>
        job.notificationType === "daily_entry_reminder" &&
        job.payload.data.date === "2026-07-24"
    ),
    true
  );

  const targetJob = jobs.find(
    (job) => job.notificationType === "income_target_reminder"
  );
  assert.ok(targetJob);
  assert.match(targetJob.payload.body, /80\.000/);
  assert.doesNotMatch(targetJob.payload.body, /1\.000\.000/);

  const dedupeKeys = jobs.map((job) => job.dedupeKey);
  assert.equal(new Set(dedupeKeys).size, dedupeKeys.length);
  assert.equal(jobs.every((job) => job.appIdentifier === "money_diary"), true);
  assert.equal(jobs.every((job) => job.payload.app === "money_diary"), true);

  const noTargetJobs = planner.buildMoneyDiaryNotificationPlan({
    balanceChecks: [],
    completedGoals: [],
    entries: [entry],
    expenses: [expense],
    goals,
    now: new Date("2026-07-23T03:00:00.000Z"),
    settings: {
      ...config.DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS,
      dailyIncomeTargetEnabled: false,
    },
    userId: "user-1",
  });
  assert.equal(
    noTargetJobs.some(
      (job) => job.notificationType === "income_target_reminder"
    ),
    false
  );

  const dayMarkJobs = dayMarkPlanner.buildDayMarkNotificationPlan({
    now: new Date("2026-07-23T00:00:00.000Z"),
    settings: config.DEFAULT_DAYMARK_NOTIFICATION_SETTINGS,
    tasks: [
      {
        actual_focus_seconds: 0,
        category: "work",
        created_at: "2026-07-23T00:00:00.000Z",
        description: null,
        duration_minutes: 60,
        end_time: "10:00:00",
        id: "task-1",
        note: null,
        priority: "high",
        start_time: "09:00:00",
        status: "pending",
        task_date: "2026-07-23",
        title: "Làm báo cáo",
        updated_at: "2026-07-23T00:00:00.000Z",
        user_id: "user-1",
      },
    ],
    userId: "user-1",
  });
  assert.equal(dayMarkJobs.every((job) => job.appIdentifier === "daymark"), true);
  assert.equal(
    dayMarkJobs.some((job) => job.notificationType === "task_start_reminder"),
    true
  );
  assert.equal(
    dayMarkJobs.some(
      (job) =>
        job.notificationType === "daily_plan_reminder" &&
        job.payload.data.date === "2026-07-24"
    ),
    true
  );
  assert.equal(dayMarkJobs.every((job) => job.payload.app === "daymark"), true);

  console.log("Money Diary and DayMark notification tests passed.");
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
