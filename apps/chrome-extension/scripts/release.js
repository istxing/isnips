const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { checkPackage } = require("./check-release");
const base = path.resolve(__dirname, "..");
for (const name of [
  "ISNIPS_MANIFEST_KEY",
  "ISNIPS_OAUTH_CLIENT_ID",
  "ISNIPS_NAME_SUFFIX",
]) {
  if (process.env[name]?.trim())
    throw new Error("Release refuses development override: " + name);
}
execFileSync(process.execPath, ["build.js"], { cwd: base, stdio: "inherit" });
const result = checkPackage(path.join(base, "dist"), { official: true });
const output = path.join(base, "release");
fs.mkdirSync(output, { recursive: true });
const archive = path.join(output, "isnips-" + result.version + ".zip");
fs.rmSync(archive, { force: true });
execFileSync("zip", ["-X", "-q", "-r", archive, "."], {
  cwd: path.join(base, "dist"),
  stdio: "inherit",
});
execFileSync("unzip", ["-t", archive], { stdio: "pipe" });
const sha256 = crypto
  .createHash("sha256")
  .update(fs.readFileSync(archive))
  .digest("hex");
fs.writeFileSync(
  archive + ".sha256",
  sha256 + "  " + path.basename(archive) + "\n",
);
fs.writeFileSync(
  path.join(output, "package-report.json"),
  JSON.stringify(
    { ...result, archive: path.basename(archive), sha256 },
    null,
    2,
  ) + "\n",
);
console.log("Release package: " + archive + "\nSHA-256: " + sha256);
