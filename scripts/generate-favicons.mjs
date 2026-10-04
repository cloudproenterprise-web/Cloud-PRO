import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SVG_SOURCE = path.join(PUBLIC_DIR, 'favicon.svg');

async function generateAll() {
  console.log('[FAVICON GENERATOR] Reading source SVG:', SVG_SOURCE);
  const svgBuffer = fs.readFileSync(SVG_SOURCE);

  const targets = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'favicon.png', size: 192 },
  ];

  // 1. Generate PNGs in public/
  for (const t of targets) {
    const outPath = path.join(PUBLIC_DIR, t.name);
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outPath);
    console.log(` ✓ Created ${t.name} (${t.size}x${t.size})`);
  }

  // 2. Generate true multi-resolution binary favicon.ico (16, 32, 48, 64)
  const f16 = path.join(PUBLIC_DIR, 'favicon-16x16.png');
  const f32 = path.join(PUBLIC_DIR, 'favicon-32x32.png');
  const f48 = path.join(PUBLIC_DIR, 'favicon-48x48.png');
  const icoPath = path.join(PUBLIC_DIR, 'favicon.ico');

  try {
    execSync(`convert "${f16}" "${f32}" "${f48}" "${icoPath}"`, { stdio: 'inherit' });
    console.log(' ✓ Created true multi-resolution binary favicon.ico (16, 32, 48)');
  } catch (err) {
    console.warn('ImageMagick convert failed, copying 32x32 as fallback:', err);
    fs.copyFileSync(f32, icoPath);
  }

  // 3. Create site.webmanifest
  const manifest = {
    name: 'Cloud PRO Enterprise Panel',
    short_name: 'CloudPRO',
    description: 'Cloud PRO Reseller Hosting & Server Management Panel',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1120',
    theme_color: '#005dbd',
    icons: [
      {
        src: '/android-chrome-192x192.png?v=cpro-master',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png?v=cpro-master',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon.svg?v=cpro-master',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };

  fs.writeFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(' ✓ Created site.webmanifest and manifest.json');

  // 4. Mirror all generated assets to dist/ and public_html/ so all routes match identically
  const mirrorDirs = [
    DIST_DIR,
    path.join(ROOT_DIR, 'public_html'),
    path.join(ROOT_DIR, 'public_html', 'assets'),
    path.join(ROOT_DIR, 'public_html', 'uploads'),
  ];

  const filesToCopy = [
    'favicon.ico',
    'favicon.svg',
    'favicon.png',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon-48x48.png',
    'favicon-96x96.png',
    'apple-touch-icon.png',
    'apple-touch-icon-180x180.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'site.webmanifest',
    'manifest.json',
    'logo.svg',
  ];

  for (const dir of mirrorDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const f of filesToCopy) {
      const srcFile = path.join(PUBLIC_DIR, f);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(dir, f));
      }
    }
    console.log(` ✓ Mirrored favicons to ${path.relative(ROOT_DIR, dir)}/`);
  }

  console.log('[FAVICON GENERATOR] All favicons successfully generated and synced!');
}

generateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
