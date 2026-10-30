/**
 * Removes from tests/screenshots/out the images that are (almost) the same as the ones already committed
 * in the documentation / about repositories: dates, clocks and other small data changes would otherwise
 * update most of the images at every run and make the pull requests unreadable.
 *
 * pnpm exec tsx tests/screenshots/filter-unchanged.ts --docs ../documentation --about ../narvik-about [--threshold 2]
 *
 * An image is kept when it is new, when its size changed, or when more than `threshold` percent of its pixels differ.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, 'out');

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const docsRepo = arg('docs');
const aboutRepo = arg('about');
const threshold = Number(arg('threshold') ?? 2);

/** Where the images of each output folder live in their repository */
const targets = [
  {folder: 'docs', root: docsRepo && path.join(docsRepo, 'docs')},
  {folder: 'about', root: aboutRepo && path.join(aboutRepo, 'public', 'pics')},
];

/** Percentage of pixels with a visible difference (a channel differing by more than 16/255) */
async function differenceRatio(a: string, b: string): Promise<number | undefined> {
  const [imageA, imageB] = await Promise.all([
    sharp(a).removeAlpha().raw().toBuffer({resolveWithObject: true}),
    sharp(b).removeAlpha().raw().toBuffer({resolveWithObject: true}),
  ]);
  if (imageA.info.width !== imageB.info.width || imageA.info.height !== imageB.info.height) return undefined;

  const channels = imageA.info.channels;
  let different = 0;
  for (let i = 0; i < imageA.data.length; i += channels) {
    for (let c = 0; c < channels; c++) {
      if (Math.abs(imageA.data[i + c]! - imageB.data[i + c]!) > 16) {
        different++;
        break;
      }
    }
  }
  return (different * 100) / (imageA.info.width * imageA.info.height);
}

function listWebp(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listWebp(full) : full.endsWith('.webp') ? [full] : [];
  });
}

let kept = 0;
let removed = 0;
for (const {folder, root} of targets) {
  if (!root) continue;
  const base = path.join(out, folder);

  for (const generated of listWebp(base)) {
    const relative = path.relative(base, generated);
    const existing = path.join(root, relative);

    const ratio = fs.existsSync(existing) ? await differenceRatio(generated, existing) : undefined;
    if (ratio !== undefined && ratio < threshold) {
      fs.rmSync(generated);
      removed++;
      console.log(`unchanged  ${folder}/${relative} (${ratio.toFixed(3)}%)`);
    } else {
      kept++;
      console.log(`UPDATED    ${folder}/${relative} (${ratio === undefined ? 'new or resized' : ratio.toFixed(3) + '%'})`);
    }
  }
}

console.log(`${kept} image(s) to update, ${removed} unchanged (threshold ${threshold}%)`);
