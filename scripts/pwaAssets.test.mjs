import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "public");
const sizes = [48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function assertPngSize(filePath, expectedSize) {
  const png = await readFile(filePath);

  assert.equal(
    png.subarray(1, 4).toString("ascii"),
    "PNG",
    `${filePath} không phải PNG hợp lệ`
  );
  assert.equal(
    png.readUInt32BE(16),
    expectedSize,
    `${filePath} sai chiều rộng`
  );
  assert.equal(
    png.readUInt32BE(20),
    expectedSize,
    `${filePath} sai chiều cao`
  );
}

async function assertAppAssets({
  app,
  expectedName,
  expectedScope,
  expectedStartUrl,
}) {
  const manifestPath = join(publicDir, `${app}.webmanifest`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.equal(manifest.name, expectedName);
  assert.equal(manifest.scope, expectedScope);
  assert.equal(manifest.start_url, expectedStartUrl);

  for (const size of sizes) {
    const iconName =
      app === "daymark"
        ? `${app}-${size}.png`
        : `${app}-v2-${size}.png`;
    await assertPngSize(
      join(publicDir, "icons", iconName),
      size
    );
  }

  for (const size of [192, 512]) {
    const iconName =
      app === "daymark"
        ? `${app}-maskable-${size}.png`
        : `${app}-maskable-v2-${size}.png`;
    await assertPngSize(
      join(publicDir, "icons", iconName),
      size
    );
  }

  const badgeName =
    app === "daymark"
      ? `${app}-badge-96.png`
      : `${app}-badge-v2-96.png`;
  await assertPngSize(
    join(publicDir, "icons", badgeName),
    96
  );
  await assertPngSize(
    join(
      publicDir,
      app === "daymark" ? "favicon-16x16.png" : `${app}-favicon-16x16.png`
    ),
    16
  );
  await assertPngSize(
    join(
      publicDir,
      app === "daymark" ? "favicon-32x32.png" : `${app}-favicon-32x32.png`
    ),
    32
  );
  await assertPngSize(
    join(
      publicDir,
      app === "daymark" ? "apple-touch-icon.png" : `${app}-apple-touch-icon.png`
    ),
    180
  );

  const maskableIcons = manifest.icons.filter(
    (icon) => icon.purpose === "maskable"
  );
  assert.deepEqual(
    maskableIcons.map((icon) => icon.sizes),
    ["192x192", "512x512"]
  );

  const worker = await readFile(join(publicDir, `${app}-sw.js`), "utf8");
  assert.match(worker, new RegExp(`app: "${app === "daymark" ? "daymark" : "money_diary"}"`));
  assert.match(worker, new RegExp(`scopePath: "${expectedScope}"`));
}

await assertAppAssets({
  app: "money-diary",
  expectedName: "Money Diary",
  expectedScope: "/money",
  expectedStartUrl: "/money",
});
await assertAppAssets({
  app: "daymark",
  expectedName: "DayMark",
  expectedScope: "/daymark",
  expectedStartUrl: "/daymark/today",
});

const viteConfig = await readFile(join(rootDir, "vite.config.ts"), "utf8");
assert.doesNotMatch(viteConfig, /VitePWA|manifest\s*:/);

console.log("Separate Money Diary and DayMark PWA assets passed.");
