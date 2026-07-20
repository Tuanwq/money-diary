import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tempDir = await mkdtemp(join(tmpdir(), "daymark-streak-"));

async function transpileTsFile(sourcePath, targetPath) {
  const source = await ts.sys.readFile(sourcePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;

  await writeFile(
    targetPath,
    output.replace("../../../utils/date", "../../../utils/date.js"),
    "utf8"
  );
}

function task(date, index, status = "pending") {
  return {
    actual_focus_seconds: 0,
    category: "work",
    created_at: `${date}T00:00:${String(index).padStart(2, "0")}`,
    description: null,
    duration_minutes: 60,
    end_time: "10:00",
    id: `${date}-${index}`,
    note: null,
    priority: "medium",
    start_time: "09:00",
    status,
    task_date: date,
    title: `Task ${index}`,
    updated_at: `${date}T00:00:${String(index).padStart(2, "0")}`,
    user_id: "test-user",
  };
}

function tasksFor(date, completed, total) {
  return Array.from({ length: total }, (_, index) =>
    task(date, index, index < completed ? "completed" : "pending")
  );
}

try {
  await writeFile(join(tempDir, "package.json"), '{"type":"module"}', "utf8");
  await writeFile(
    join(tempDir, "src", "placeholder"),
    "",
    "utf8"
  ).catch(async () => {
    await ts.sys.createDirectory(join(tempDir, "src"));
  });
  await ts.sys.createDirectory(join(tempDir, "src", "utils"));
  await ts.sys.createDirectory(join(tempDir, "src", "features"));
  await ts.sys.createDirectory(join(tempDir, "src", "features", "daymark"));
  await ts.sys.createDirectory(
    join(tempDir, "src", "features", "daymark", "utils")
  );

  await transpileTsFile(
    join(rootDir, "src", "utils", "date.ts"),
    join(tempDir, "src", "utils", "date.js")
  );
  await transpileTsFile(
    join(rootDir, "src", "features", "daymark", "utils", "daymarkStreak.ts"),
    join(tempDir, "src", "features", "daymark", "utils", "daymarkStreak.js")
  );

  const {
    buildDailyTaskStatsMap,
    calculateCurrentStreak,
    calculateLongestStreak,
    getDailyTaskStats,
  } = await import(
    pathToFileURL(
      join(tempDir, "src", "features", "daymark", "utils", "daymarkStreak.js")
    ).href
  );

  assert.equal(
    getDailyTaskStats("2026-07-18", tasksFor("2026-07-18", 3, 6), 50, "2026-07-20").status,
    "completed"
  );
  assert.equal(
    getDailyTaskStats("2026-07-18", tasksFor("2026-07-18", 2, 5), 50, "2026-07-20").status,
    "failed"
  );
  assert.equal(
    getDailyTaskStats("2026-07-18", tasksFor("2026-07-18", 3, 5), 50, "2026-07-20").status,
    "completed"
  );
  assert.equal(
    getDailyTaskStats("2026-07-18", tasksFor("2026-07-18", 3, 5), 75, "2026-07-20").status,
    "failed"
  );
  assert.equal(
    getDailyTaskStats("2026-07-20", tasksFor("2026-07-20", 1, 5), 50, "2026-07-20").status,
    "in-progress"
  );
  assert.equal(
    getDailyTaskStats("2026-07-18", [], 50, "2026-07-20").status,
    "empty"
  );

  const streakTasks = [
    ...tasksFor("2026-07-16", 2, 2),
    ...tasksFor("2026-07-17", 0, 2),
    ...tasksFor("2026-07-18", 2, 2),
    ...tasksFor("2026-07-19", 2, 2),
    ...tasksFor("2026-07-20", 0, 2),
  ];
  const statsMap = buildDailyTaskStatsMap(streakTasks, 50, "2026-07-20");
  assert.equal(calculateCurrentStreak(statsMap, "2026-07-20"), 2);
  assert.equal(calculateLongestStreak(statsMap, "2026-07-20"), 2);

  const recalculatedTasks = [
    ...tasksFor("2026-07-18", 2, 2),
    ...tasksFor("2026-07-19", 1, 2),
    ...tasksFor("2026-07-20", 0, 2),
  ];
  const recalculatedStats = buildDailyTaskStatsMap(
    recalculatedTasks,
    75,
    "2026-07-20"
  );
  assert.equal(calculateCurrentStreak(recalculatedStats, "2026-07-20"), 0);

  console.log("DayMark streak tests passed.");
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
