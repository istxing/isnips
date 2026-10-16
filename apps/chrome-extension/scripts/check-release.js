const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

function checkPackage(directory, { official = false } = {}) {
  const readJSON = (file) =>
    JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
  const manifest = readJSON("manifest.json");
  const pkg = require("../package.json");
  assert.equal(manifest.manifest_version, 3);
  assert.equal(
    manifest.version,
    pkg.version,
    "Manifest and package versions must match",
  );
  assert.equal(manifest.minimum_chrome_version, "116");
  const id = crypto
    .createHash("sha256")
    .update(Buffer.from(manifest.key, "base64"))
    .digest("hex")
    .slice(0, 32)
    .replace(/[0-9a-f]/g, (c) => String.fromCharCode(97 + parseInt(c, 16)));
  if (official) {
    assert.equal(
      id,
      "bjemnabegidmkbkdepanilbcidpbnpmj",
      "Official extension identity changed",
    );
    assert.equal(
      manifest.oauth2.client_id,
      require("../manifest.json").oauth2.client_id,
    );
    assert.equal(manifest.name, "__MSG_app_name__");
  }
  assert.ok(
    !manifest.permissions.includes("tabs"),
    "Redundant tabs permission must not ship",
  );
  assert.deepEqual(manifest.oauth2.scopes, [
    "https://www.googleapis.com/auth/drive.file",
  ]);
  assert.ok(
    !manifest.content_security_policy.extension_pages.includes("unsafe-eval"),
  );
  const required = [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    manifest.options_page,
    ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap((script) => script.js),
    "library.html",
    "app.js",
    "app.css",
    "sync.js",
    "google-auth.js",
    "google-auth-config.js",
    "clipboard.js",
    "library-data.js",
    "merge.js",
    "privacy.html",
  ];
  for (const file of required)
    assert.ok(
      fs.statSync(path.join(directory, file)).isFile(),
      "Missing " + file,
    );
  let fileCount = 0,
    bytes = 0;
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      assert.ok(!entry.isSymbolicLink(), "No symlinks in the release");
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      fileCount++;
      bytes += fs.statSync(file).size;
      assert.ok(
        !/(?:\.DS_Store|\.map$|\.pem$|\.test\.js$|package(?:-lock)?\.json$)/.test(
          entry.name,
        ),
        "Development file in package: " + file,
      );
      if (file.endsWith(".js"))
        new vm.Script(fs.readFileSync(file, "utf8"), { filename: file });
      if (file.endsWith(".html")) {
        const html = fs.readFileSync(file, "utf8");
        assert.ok(
          !/\son\w+\s*=/i.test(html),
          "Inline event handler violates CSP",
        );
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
        assert.equal(
          ids.length,
          new Set(ids).size,
          "Duplicate DOM id in " + file,
        );
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          if (/^(?:https?:|#)/.test(match[1])) continue;
          assert.ok(
            fs.existsSync(path.resolve(path.dirname(file), match[1])),
            "Broken package link: " + match[1],
          );
        }
        for (const script of html.matchAll(
          /<script([^>]*)>([\s\S]*?)<\/script>/g,
        )) {
          assert.match(
            script[1],
            /src="[^":]+"/,
            "Scripts must be packaged locally",
          );
          assert.equal(script[2].trim(), "", "No inline JavaScript");
        }
      }
    }
  }
  walk(directory);
  for (const [size, file] of Object.entries(manifest.icons)) {
    const png = fs.readFileSync(path.join(directory, file));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), Number(size));
    assert.equal(png.readUInt32BE(20), Number(size));
  }
  const keys = [...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map(
    (m) => m[1],
  );
  for (const locale of fs.readdirSync(path.join(directory, "_locales"))) {
    const messages = readJSON("_locales/" + locale + "/messages.json");
    for (const key of keys)
      assert.ok(
        messages[key]?.message,
        "Missing locale key: " + locale + "/" + key,
      );
    assert.ok(
      messages.app_desc.message.length <= 132,
      "Description exceeds store limit",
    );
  }
  const authSource = fs.readFileSync(
    path.join(directory, "google-auth-config.js"),
    "utf8",
  );
  const authText = authSource.replace(/^\s*\/\/.*$/gm, "").trim();
  const authMatch = authText.match(
    /^globalThis\.ISNIPS_GOOGLE_AUTH\s*=\s*Object\.freeze\(\s*\{\s*(?:"webClientId"|webClientId)\s*:\s*"([^"]*)"\s*,?\s*\}\s*\)\s*;?$/,
  );
  assert.ok(
    authMatch,
    "Only a public web client ID may be packaged in Google auth config",
  );
  const authConfig = { webClientId: authMatch[1] };
  assert.ok(
    authConfig.webClientId === "" ||
      /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(
        authConfig.webClientId,
      ),
    "Invalid web client ID",
  );
  return {
    googleWebAuthConfigured: Boolean(authConfig.webClientId),
    version: manifest.version,
    extensionId: id,
    files: fileCount,
    bytes,
  };
}
if (require.main === module)
  console.log(
    JSON.stringify(
      checkPackage(path.resolve(__dirname, "../dist"), {
        official: process.argv.includes("--official"),
      }),
      null,
      2,
    ),
  );
module.exports = { checkPackage };
