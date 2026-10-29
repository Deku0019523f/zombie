#!/usr/bin/env node
// Convertit un modèle GLB animé (ex. Meshy AI) en planche PNG de sprites pour le jeu.
// Usage : node tools/render-glb.mjs modele.glb --anim Walking --frames 4 --out assets/sprites/walker.png
// Options : --cell 192x256  --elev 25  --yaw 0  --view 2.1  --center 0.9  --tex 1024
//           --tint 1,1,1  --sat 1  --no-inplace   (--list pour lister les animations)
// Prérequis : Node ≥ 18 + Playwright (Chromium). Aucune autre dépendance.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const model = args.find((a) => !a.startsWith('--') && /\.glb$/i.test(a));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!model) { console.error('Usage : node tools/render-glb.mjs modele.glb --anim Walking --frames 4 --out sortie.png'); process.exit(1); }

const [cellW, cellH] = opt('cell', '192x256').split('x').map(Number);
const options = {
  model: '/model.glb',
  anim: opt('anim', 'Walking'),
  frames: Number(opt('frames', 4)),
  cellW, cellH,
  elev: Number(opt('elev', 25)),
  yaw: Number(opt('yaw', 0)),
  viewH: Number(opt('view', 2.1)),
  centerY: Number(opt('center', 0.9)),
  texSize: Number(opt('tex', 1024)),
  tint: opt('tint', '1,1,1').split(',').map(Number),
  sat: Number(opt('sat', 1)),
  inPlace: !args.includes('--no-inplace'),
};
const out = opt('out', 'sprite.png');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/model.glb')) { res.writeHead(200, { 'Content-Type': 'model/gltf-binary' }); fs.createReadStream(model).pipe(res); }
  else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(path.join(here, 'render-glb.html')).pipe(res); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { ({ chromium } = createRequire(import.meta.url)(path.join(process.env.npm_config_prefix || '/usr/lib/node_modules', 'playwright'))); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('Erreur page :', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const r = await page.evaluate((o) => window.renderSheet(o), options);
  if (args.includes('--list')) console.log('Animations :', r.animations.join(', '));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  console.log(`OK ${out} — ${options.frames} images ${cellW}x${cellH}, animation « ${options.anim} » (${r.duration.toFixed(2)} s). Animations du modèle : ${r.animations.join(', ')}`);
} finally { await browser.close(); server.close(); }
