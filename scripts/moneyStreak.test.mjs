import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tempDir = await mkdtemp(join(tmpdir(), "money-streak-"));
const ts = await loadTypeScript();

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

    return (
      await import(
        pathToFileURL(
          join(
            pnpmDirectory,
            typescriptDirectory,
            "node_modules",
            "typescript",
            "lib",
            "typescript.js"
          )
        ).href
      )
    ).default;
  }
}

async function transpile(sourcePath, targetPath, replacements = []) {
  const source = await readFile(sourcePath, "utf8");
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;

  replacements.forEach(([from, to]) => {
    output = output.replaceAll(from, to);
  });
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, output, "utf8");
}

const settings = {
  orderPrice: 13500,
  join2Price: 20900,
  join3Price: 31135,
  join4Price: 40000,
  join5Price: 50000,
  hubShortPrice: 9000,
  includeExtraOrderReward: true,
  includeSundayReward: true,
  streakRestoredDates: [],
};

function shift(date, id, overrides = {}) {
  return {
    id,
    date,
    hubType: "HUB_3",
    shiftName: "10:00 - 13:00",
    order: 1,
    joins: [],
    isWellDone: true,
    isHubShort: false,
    extraIncome: 0,
    note: "",
    createdAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

try {
  await writeFile(join(tempDir, "package.json"), '{"type":"module"}', "utf8");
  await transpile(
    join(rootDir, "src", "utils", "date.ts"),
    join(tempDir, "src", "utils", "date.js")
  );
  await transpile(
    join(rootDir, "src", "constants", "hanoiHub.ts"),
    join(tempDir, "src", "constants", "hanoiHub.js")
  );
  await transpile(
    join(rootDir, "src", "utils", "hubIncome.ts"),
    join(tempDir, "src", "utils", "hubIncome.js"),
    [["../constants/hanoiHub", "../constants/hanoiHub.js"]]
  );
  await transpile(
    join(
      rootDir,
      "src",
      "features",
      "money-diary",
      "streak",
      "moneyStreak.ts"
    ),
    join(
      tempDir,
      "src",
      "features",
      "money-diary",
      "streak",
      "moneyStreak.js"
    ),
    [
      ["../../../utils/date", "../../../utils/date.js"],
      ["../../../utils/hubIncome", "../../../utils/hubIncome.js"],
    ]
  );

  const { calculateMoneyStreak, isHubEntryQualifiedForStreak, restoreMoneyStreakDate } =
    await import(
      pathToFileURL(
        join(
          tempDir,
          "src",
          "features",
          "money-diary",
          "streak",
          "moneyStreak.js"
        )
      ).href
    );

  assert.equal(
    isHubEntryQualifiedForStreak(
      shift("2026-07-20", "manual-only", { order: 0, extraIncome: 500000 }),
      settings
    ),
    false,
    "Thu nhập phụ không được kích hoạt streak"
  );
  assert.equal(
    isHubEntryQualifiedForStreak(
      shift("2026-07-20", "reward-only", { order: 15 }),
      { ...settings, orderPrice: 0 }
    ),
    false,
    "Tiền thưởng vượt mốc không được tự kích hoạt streak"
  );

  const duplicateDay = calculateMoneyStreak(
    [shift("2026-07-19", "a"), shift("2026-07-19", "b")],
    settings,
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(duplicateDay.currentStreak, 1, "Mỗi ngày chỉ cộng một streak");
  assert.equal(duplicateDay.todayStatus, "incomplete");

  const ongoing = calculateMoneyStreak(
    [shift("2026-07-18", "a"), shift("2026-07-19", "b")],
    settings,
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(ongoing.currentStreak, 2, "Hôm nay chưa xong vẫn giữ streak hôm qua");

  const oneMissEntries = [
    shift("2026-07-18", "a"),
    shift("2026-07-20", "b"),
  ];
  const oneMiss = calculateMoneyStreak(
    oneMissEntries,
    settings,
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(oneMiss.eligibleRestoreDate, "2026-07-19");
  assert.equal(oneMiss.dayStatuses["2026-07-19"], "missed");

  const restoredSettings = restoreMoneyStreakDate(
    oneMissEntries,
    settings,
    "2026-07-19",
    new Date("2026-07-20T12:00:00")
  );
  assert.ok(restoredSettings);
  const restored = calculateMoneyStreak(
    oneMissEntries,
    restoredSettings,
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(restored.currentStreak, 3);
  assert.equal(restored.dayStatuses["2026-07-19"], "restored");
  assert.equal(restored.restoreCredits, 4);
  assert.equal(restored.restoreLimit, 5);

  const twoMisses = calculateMoneyStreak(
    [shift("2026-07-18", "a"), shift("2026-07-21", "b")],
    settings,
    new Date("2026-07-22T12:00:00")
  );
  assert.equal(twoMisses.eligibleRestoreDate, "2026-07-20");

  const firstContinuousRestore = restoreMoneyStreakDate(
    [shift("2026-07-18", "a"), shift("2026-07-21", "b")],
    settings,
    "2026-07-20",
    new Date("2026-07-22T12:00:00")
  );
  assert.ok(firstContinuousRestore);
  const afterFirstContinuousRestore = calculateMoneyStreak(
    [shift("2026-07-18", "a"), shift("2026-07-21", "b")],
    firstContinuousRestore,
    new Date("2026-07-22T12:00:00")
  );
  assert.equal(afterFirstContinuousRestore.eligibleRestoreDate, "2026-07-19");

  let continuousSettings = settings;
  const continuousEntries = [shift("2026-07-15", "continuous-anchor")];
  const expectedContinuousDates = [
    "2026-07-21",
    "2026-07-20",
    "2026-07-19",
    "2026-07-18",
    "2026-07-17",
  ];
  expectedContinuousDates.forEach((date) => {
    const continuousSummary = calculateMoneyStreak(
      continuousEntries,
      continuousSettings,
      new Date("2026-07-22T12:00:00")
    );
    assert.equal(continuousSummary.eligibleRestoreDate, date);
    continuousSettings = restoreMoneyStreakDate(
      continuousEntries,
      continuousSettings,
      date,
      new Date("2026-07-22T12:00:00")
    );
    assert.ok(continuousSettings);
  });
  const exhaustedContinuous = calculateMoneyStreak(
    continuousEntries,
    continuousSettings,
    new Date("2026-07-22T12:00:00")
  );
  assert.equal(exhaustedContinuous.restoreCredits, 0);
  assert.equal(exhaustedContinuous.eligibleRestoreDate, null);
  assert.equal(exhaustedContinuous.currentStreak, 5);

  const olderGap = calculateMoneyStreak(
    [
      shift("2026-07-18", "a"),
      shift("2026-07-20", "b"),
      shift("2026-07-21", "c"),
    ],
    settings,
    new Date("2026-07-22T12:00:00")
  );
  assert.equal(olderGap.eligibleRestoreDate, "2026-07-19");

  const noCredits = calculateMoneyStreak(
    oneMissEntries,
    {
      ...settings,
      streakRestoredDates: [
        "2026-07-01",
        "2026-07-05",
        "2026-07-09",
        "2026-07-13",
        "2026-07-17",
      ],
    },
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(noCredits.restoreCredits, 0);
  assert.equal(noCredits.eligibleRestoreDate, null);

  const refreshedNextMonth = calculateMoneyStreak(
    [shift("2026-07-31", "month-boundary")],
    {
      ...settings,
      streakRestoredDates: [
        "2026-07-01",
        "2026-07-05",
        "2026-07-09",
        "2026-07-13",
        "2026-07-17",
      ],
    },
    new Date("2026-08-01T12:00:00")
  );
  assert.equal(
    refreshedNextMonth.restoreCredits,
    5,
    "Sang tháng mới phải tự khôi phục đủ 5 lượt"
  );
  assert.equal(refreshedNextMonth.restoreLimit, 5);

  const recalculated = calculateMoneyStreak(
    [shift("2026-07-20", "only")],
    settings,
    new Date("2026-07-20T12:00:00")
  );
  assert.equal(recalculated.currentStreak, 1, "Xóa ca quá khứ phải tính lại từ lịch sử");

  console.log("Money Diary streak tests passed.");
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
