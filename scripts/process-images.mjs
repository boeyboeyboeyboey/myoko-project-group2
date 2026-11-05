// Generic responsive image pipeline. Re-runnable: node scripts/process-images.mjs [group ...]
// Add entries to JOBS for later stages. Outputs <name>-<w>.webp/.jpg, <name>-blur.webp and manifest.json per outDir.
import sharp from "sharp";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const JOBS = [
  {
    group: "hero",
    outDir: "public/media/hero",
    widths: [1280, 1920, 2560],
    quality: 78,
    items: [
      { name: "winter", src: "media-raw/commons/imori-winter-aligned.jpg" },
      { name: "green", src: "media-raw/commons/imori-summer-aligned.jpg" },
    ],
  },
  {
    // Home "Why Myoko in summer" proof cards. HEIC originals in ../Myoko Media were converted
    // to JPEG with macOS: sips -s format jpeg "<in>.HEIC" --out media-raw/home/<name>.jpg
    group: "home",
    outDir: "public/media/home",
    widths: [480, 800, 1200],
    quality: 76,
    items: [
      { name: "nojiri-kayaks", src: "media-raw/home/nojiri-kayaks.jpg" },
      { name: "naena-falls", src: "media-raw/home/naena-falls.jpg" },
    ],
  },
  {
    // Package card/banner photos (public domain / CC BY 2.0 Commons, see media-raw/commons/CREDITS-commons.md)
    group: "packages",
    outDir: "public/media/packages",
    widths: [480, 800, 1200],
    quality: 76,
    items: [
      { name: "slow", src: "media-raw/commons/green-3.jpg" },
      { name: "best", src: "media-raw/commons/green-4.jpg" },
    ],
  },
  {
    // Itinerary day-card photos (see media-raw/commons/CREDITS-commons.md)
    group: "itinerary",
    outDir: "public/media/itinerary",
    widths: [480, 800, 1200], // PackagePhoto always requests 480/800/1200
    quality: 76,
    items: [
      { name: "station", src: "media-raw/commons/joetsu-myoko-e7.jpg" },
      { name: "station-out", src: "media-raw/commons/joetsu-myoko-station-2.jpg" },
    ],
  },
];

const only = process.argv.slice(2);
for (const job of JOBS) {
  if (only.length && !only.includes(job.group)) continue;
  await mkdir(job.outDir, { recursive: true });
  const manifest = {};
  for (const item of job.items) {
    const meta = await sharp(item.src).metadata();
    const entry = { width: meta.width, height: meta.height, aspect: meta.width / meta.height, sizes: [] };
    for (const w of job.widths) {
      const width = Math.min(w, meta.width); // never upscale
      const base = sharp(item.src).rotate().resize({ width, withoutEnlargement: true });
      const webp = path.join(job.outDir, `${item.name}-${w}.webp`);
      const jpg = path.join(job.outDir, `${item.name}-${w}.jpg`);
      await base.clone().webp({ quality: job.quality, effort: 5 }).toFile(webp);
      await base.clone().jpeg({ quality: job.quality, mozjpeg: true }).toFile(jpg);
      const [sw, sj] = await Promise.all([stat(webp), stat(jpg)]);
      entry.sizes.push({ w: width, webpKB: Math.round(sw.size / 1024), jpgKB: Math.round(sj.size / 1024) });
      console.log(`${item.name}-${w}: webp ${Math.round(sw.size / 1024)}KB  jpg ${Math.round(sj.size / 1024)}KB`);
    }
    const blur = await sharp(item.src).rotate().resize({ width: 24 }).blur(1.2).webp({ quality: 50 }).toBuffer();
    await writeFile(path.join(job.outDir, `${item.name}-blur.webp`), blur);
    entry.blurDataURI = `data:image/webp;base64,${blur.toString("base64")}`;
    manifest[item.name] = entry;
  }
  await writeFile(path.join(job.outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}
