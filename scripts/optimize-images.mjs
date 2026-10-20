import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const directory = fileURLToPath(new URL('../public/images/', import.meta.url));
for (const filename of await readdir(directory)) {
  if (!/\.jpe?g$/i.test(filename) || filename === 'og-image.jpg') continue;
  const path = join(directory, filename);
  const input = await readFile(path);
  const metadata = await sharp(input).metadata();
  if (input.length <= 600 * 1024 && (metadata.width || 0) <= 2000) {
    console.log(`${filename}: already optimized (${(input.length / 1024).toFixed(0)} KB)`);
    continue;
  }
  let quality = 80;
  let width = 2000;
  let output;
  do {
    output = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (output.length <= 600 * 1024) break;
    if (quality > 65) quality -= 5;
    else width -= 200;
  } while (width >= 1200);
  await writeFile(path, output);
  console.log(`${filename}: ${(input.length / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
}
