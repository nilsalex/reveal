const { execSync } = require("node:child_process");

let commitHash = "unknown";
let buildTime = "";

try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // git not available (e.g. Vercel build environment)
  commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
}
buildTime = new Date().toISOString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
};
module.exports = nextConfig;
