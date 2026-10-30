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

let count = 0;
for (const definition of screenshots) {
  const source = path.join(out, 'png', `${definition.id}.png`);
  if (!fs.existsSync(source)) continue; // Not captured (SCREENSHOT_ONLY or failure)

  for (const target of definition.targets) {
    const destination = path.join(out, target.repo, `${target.path}.webp`);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    await sharp(source).webp({quality: WEBP_QUALITY, smartSubsample: true}).toFile(destination);
    count++;
  }
}

fs.rmSync(path.join(out, 'png'), {recursive: true, force: true});
console.log(`${count} webp image(s) generated in ${out}`);
