/**
 * Converts the captured png into webp and dispatches them per target repository:
 * tests/screenshots/out/{docs,about}/<target path>.webp
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import sharp from 'sharp';
import {screenshots} from './manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, 'out');
const WEBP_QUALITY = 100;
/** The captures are taken at 2x for sharp text, but nobody needs images wider than that */
const MAX_WIDTH = 2000;

let count = 0;
for (const definition of screenshots) {
  const source = path.join(out, 'png', `${definition.id}.png`);
  if (!fs.existsSync(source)) continue; // Not captured (SCREENSHOT_ONLY or failure)

  for (const target of definition.targets) {
    // Generated images live in a `generated` subfolder, next to the manual ones
    const generatedPath = target.repo === 'docs'
      ? path.join(path.dirname(target.path), 'generated', path.basename(target.path))
      : path.join('generated', target.path);
    const destination = path.join(out, target.repo, `${generatedPath}.webp`);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    await sharp(source).resize({width: MAX_WIDTH, withoutEnlargement: true}).webp({quality: WEBP_QUALITY, smartSubsample: true}).toFile(destination);
    count++;
  }
}

fs.rmSync(path.join(out, 'png'), {recursive: true, force: true});
console.log(`${count} webp image(s) generated in ${out}`);
