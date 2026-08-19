import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve(process.cwd(), 'public/icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const targets = [
  { file: 'public/icon.png', size: 512 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/favicon-32x32.png', size: 32 },
  { file: 'public/favicon-16x16.png', size: 16 },
  { file: 'public/favicon.ico', size: 48 },
];

for (const target of targets) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: target.size,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.resolve(process.cwd(), target.file), pngBuffer);
  console.log(`Generated ${target.file} (${target.size}x${target.size})`);
}
