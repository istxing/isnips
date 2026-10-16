// SVG is the editable source. Render each size directly; never upscale the old 128px PNG.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
let sharp;
try {
  sharp = require(process.env.ISNIPS_SHARP_MODULE || "sharp");
} catch {
  throw new Error(
    "Rendering needs sharp. Install it in the rendering environment or set ISNIPS_SHARP_MODULE to its entry file.",
  );
}
const root = path.resolve(__dirname, "..");
const store = path.join(root, "store-assets");
const master = fs.readFileSync(path.join(__dirname, "icon-master.svg"), "utf8");
const content = master.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
fs.mkdirSync(store, { recursive: true });
const pngOptions = { compressionLevel: 9 };
async function raster(svg, width, height = width, alpha = true) {
  const nativeWidth = Number(svg.match(/<svg[^>]*\bwidth="([\d.]+)"/)[1]);
  let pipeline = sharp(Buffer.from(svg), {
    density: (72 * width * 4) / nativeWidth,
  })
    .resize(width, height, { kernel: sharp.kernel.linear })
    .toColourspace("srgb");
  if (!alpha)
    pipeline = pipeline.flatten({ background: "#dee5d8" }).removeAlpha();
  return pipeline.png(pngOptions).toBuffer();
}
const nestedIcon = (x, y, size) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 128 128">${content}</svg>`;
async function main() {
  for (const size of [16, 32, 48, 128])
    fs.writeFileSync(
      path.join(root, "icons", `icon-${size}.png`),
      await raster(master, size),
    );
  fs.writeFileSync(
    path.join(__dirname, "icon-transparent.png"),
    await raster(master, 128),
  );
  fs.writeFileSync(
    path.join(__dirname, "icon-orange-brand-smooth-99.png"),
    await raster(master, 1024),
  );
  fs.writeFileSync(
    path.join(store, "brand-icon-512.png"),
    await raster(master, 512),
  );
  fs.writeFileSync(
    path.join(store, "brand-icon-1024.png"),
    await raster(master, 1024),
  );
  const storeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${nestedIcon(16, 16, 96)}</svg>`;
  fs.writeFileSync(path.join(store, "store-icon-128.svg"), storeIcon);
  fs.writeFileSync(
    path.join(store, "store-icon-128.png"),
    await raster(storeIcon, 128),
  );

  const small = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
    <rect width="440" height="280" fill="#dee5d8"/>
    <rect x="12" y="12" width="416" height="256" rx="22" fill="#2f4a39"/>
    ${nestedIcon(34, 60, 164)}
    <text x="224" y="158" fill="#dee5d8" font-family="Avenir Next,Helvetica Neue,Arial,sans-serif" font-size="49" font-weight="600" letter-spacing="-1.8">iSnips</text>
  </svg>`;
  const marquee = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560">
    <rect width="1400" height="560" fill="#dee5d8"/>
    <rect x="24" y="24" width="1352" height="512" rx="32" fill="#2f4a39"/>
    ${nestedIcon(156, 104, 352)}
    <text x="596" y="340" fill="#dee5d8" font-family="Avenir Next,Helvetica Neue,Arial,sans-serif" font-size="170" font-weight="600" letter-spacing="-6">iSnips</text>
  </svg>`;
  for (const [name, svg, width, height] of [
    ["promo-small-440x280", small, 440, 280],
    ["promo-marquee-1400x560", marquee, 1400, 560],
  ]) {
    fs.writeFileSync(path.join(store, name + ".svg"), svg);
    fs.writeFileSync(
      path.join(store, name + ".png"),
      await raster(svg, width, height, false),
    );
  }

  // Native-size toolbar icons, plus larger vector-rendered previews on light/dark surfaces.
  const panels = [];
  for (const [left, background] of [
    [0, "#dee5d8"],
    [256, "#202421"],
  ]) {
    panels.push({
      input: await sharp({
        create: { width: 256, height: 288, channels: 4, background },
      })
        .png()
        .toBuffer(),
      left,
      top: 0,
    });
    panels.push({ input: await raster(master, 192), left: left + 32, top: 12 });
    let x = left + 46;
    for (const size of [16, 32, 48]) {
      panels.push({
        input: fs.readFileSync(path.join(root, "icons", `icon-${size}.png`)),
        left: x,
        top: 220,
      });
      x += size + 20;
    }
  }
  const iconPreview = await sharp({
    create: { width: 512, height: 288, channels: 4, background: "#dee5d8" },
  })
    .composite(panels)
    .png()
    .toBuffer();
  fs.writeFileSync(
    path.join(__dirname, "icon-vector-preview.png"),
    iconPreview,
  );
  fs.writeFileSync(path.join(__dirname, "icon-preview.png"), iconPreview);

  const sheet = sharp({
    create: { width: 1000, height: 744, channels: 3, background: "#f6f8f6" },
  });
  const svgTitle = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="744"><g font-family="Arial,sans-serif" fill="#304b39" font-size="18"><text x="24" y="31">Store icon 128 x 128</text><text x="300" y="31">Small promo 440 x 280</text><text x="24" y="325">Marquee promo 1400 x 560</text></g></svg>`;
  fs.writeFileSync(
    path.join(store, "PREVIEW.png"),
    await sheet
      .composite([
        { input: await raster(storeIcon, 128), left: 48, top: 88 },
        {
          input: fs.readFileSync(path.join(store, "promo-small-440x280.png")),
          left: 300,
          top: 44,
        },
        {
          input: await sharp(
            fs.readFileSync(path.join(store, "promo-marquee-1400x560.png")),
          )
            .resize(952, 381)
            .png()
            .toBuffer(),
          left: 24,
          top: 336,
        },
        { input: Buffer.from(svgTitle), left: 0, top: 0 },
      ])
      .png()
      .toBuffer(),
  );
  const files = [
    "store-icon-128.png",
    "brand-icon-512.png",
    "brand-icon-1024.png",
    "promo-small-440x280.png",
    "promo-marquee-1400x560.png",
  ];
  const images = [];
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(store, file));
    const metadata = await sharp(buffer).metadata();
    images.push({
      file,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  }
  fs.writeFileSync(
    path.join(store, "manifest.json"),
    JSON.stringify(
      {
        version: "2.0.0",
        images,
        screenshots: { status: "pending_real_browser_capture", files: [] },
      },
      null,
      2,
    ) + "\n",
  );
  const archive = path.join(store, "isnips-2.0.0-store-assets.zip");
  fs.rmSync(archive, { force: true });
  execFileSync(
    "zip",
    ["-X", "-q", archive, ...files, "README.md", "manifest.json"],
    { cwd: store },
  );
  console.log("Vector icons and store artwork rendered: " + store);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
