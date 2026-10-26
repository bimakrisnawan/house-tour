// Blender build output -> public/assets (ADR 0002, 0003).
//   GLB per tier: meshopt geometry, WebP textures capped at 1024 / 2048 / 4096 px (lo / md / hi)
//   lightmaps: WebP at 1024, 2048 and 4096 px (4k for ultra only); reflection panoramas; floor plan; scene.json manifest
// Usage: node scripts/build-assets.mjs [blender_out_dir]   (default: ../../blender/rumah/web/out)
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = process.argv[2] ?? fileURLToPath(new URL('../../../blender/rumah/web/out', import.meta.url));
const renders = fileURLToPath(new URL('../../../blender/rumah/render/v3', import.meta.url));
const out = join(root, 'public', 'assets');
const cli = join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const TIERS = { lo: 1024, md: 2048, hi: 4096 };
const LM = { '1k': 1024, '2k': 2048, '4k': 4096 };
const mb = (p) => (statSync(p).size / 1e6).toFixed(2);

rmSync(out, { recursive: true, force: true });
const scene = { variants: {}, env: { dalam: 'env/dalam.webp', luar: 'env/luar.webp', langit: 'env/langit.webp' }, plan: 'denah.webp' };

for (const variant of ['renovasi', 'eksisting']) {
  const dir = join(src, variant);
  if (!existsSync(join(dir, 'manifest.json'))) throw new Error(`missing ${dir}/manifest.json: run build_web.py -- ${variant}`);
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (m.quick) console.warn(`WARNING ${variant}: quick (low quality) bake`);
  mkdirSync(join(out, variant), { recursive: true });
  for (const [tier, size] of Object.entries(TIERS)) {
    const file = join(out, variant, `${tier}.glb`);
    // palette/join off: materials and nodes carry light groups and interaction extras; TEXCOORD_1 (lightmap UV) is
    // used by no glTF material, so attribute pruning must stay off or the lightmap UVs are dropped
    execFileSync(process.execPath, [cli, 'optimize', join(dir, 'rumah.glb'), file, '--compress', 'meshopt',
      '--texture-compress', 'webp', '--texture-size', String(size), '--simplify', 'false', '--palette', 'false',
      '--join', 'false', '--flatten', 'false', '--prune-attributes', 'false'], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`${variant}/${tier}.glb ${mb(file)} MB`);
  }
  for (const [name, size] of Object.entries(LM)) {
    mkdirSync(join(out, variant, 'lm', name), { recursive: true });
    for (const atlas of Object.values(m.lightmaps)) {
      for (const f of atlas.files) {
        await sharp(join(dir, f)).resize({ width: size, withoutEnlargement: true })
          .webp({ quality: 90, smartSubsample: true }).toFile(join(out, variant, 'lm', name, f.replace(/\.png$/, '.webp')));
      }
    }
  }
  scene.variants[variant] = { lightmaps: m.lightmaps, groups: m.groups };
}

mkdirSync(join(out, 'env'), { recursive: true });
for (const n of ['dalam', 'luar', 'langit']) {
  await sharp(join(src, 'renovasi', `env_${n}.png`)).webp({ quality: 85 }).toFile(join(out, 'env', `${n}.webp`));
}
await sharp(join(renders, '11_denah_atas.png')).webp({ quality: 82 }).toFile(join(out, 'denah.webp'));
writeFileSync(join(out, 'scene.json'), JSON.stringify(scene));
// detect-gpu benchmark data served from our own origin (CSP connect-src 'self', no CDN)
cpSync(join(root, 'node_modules', '@pmndrs', 'detect-gpu', 'dist', 'benchmarks'), join(root, 'public', 'benchmarks'), { recursive: true });
console.log('scene.json written');
