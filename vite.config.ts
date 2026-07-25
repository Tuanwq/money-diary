import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

type AppBuildInfo = {
  buildId: string;
  builtAt: string;
  commit: string;
  version: string;
};

function getGitCommit() {
  const vercelCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

  if (vercelCommit) return vercelCommit.slice(0, 8);

  try {
    return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

function createBuildInfo(): AppBuildInfo {
  const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8")
  ) as { version?: string };
  const builtAt = new Date().toISOString();
  const commit = getGitCommit();
  const version = packageJson.version ?? "0.0.0";

  return {
    buildId: `${version}-${commit}-${builtAt}`,
    builtAt,
    commit,
    version,
  };
}

function appVersionPlugin(buildInfo: AppBuildInfo): Plugin {
  const source = `${JSON.stringify(buildInfo, null, 2)}\n`;

  return {
    name: "money-diary-app-version",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/app-version.json") {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({
        fileName: "app-version.json",
        source,
        type: "asset",
      });
    },
  };
}

const buildInfo = createBuildInfo();

export default defineConfig({
  define: {
    __APP_BUILD_INFO__: JSON.stringify(buildInfo),
  },
  plugins: [
    react(),
    tailwindcss(),
    appVersionPlugin(buildInfo),
  ],
});
