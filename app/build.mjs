import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir  = dirname(fileURLToPath(import.meta.url));
const dist = join(dir, 'dist');
mkdirSync(dist, { recursive: true });

console.log('Bundling…');
const result = await build({
  entryPoints: [join(dir, 'src/index.tsx')],
  bundle: true,
  write: false,
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  target: ['es2020', 'chrome100', 'safari15', 'firefox100'],
});

const js   = result.outputFiles[0].text;
const tmpl = readFileSync(join(dir, 'public/index.html'), 'utf8');
const html = tmpl.replace('<!-- BUNDLE -->', `<script type="module">${js}</script>`);

writeFileSync(join(dist, 'index.html'), html);
copyFileSync(join(dir, 'public/sw.js'),       join(dist, 'sw.js'));
copyFileSync(join(dir, 'public/manifest.json'), join(dist, 'manifest.json'));
copyFileSync(join(dir, 'public/icon.svg'),    join(dist, 'icon.svg'));

writeFileSync(join(dist, 'CNAME'),     'app.lifting.quest');
writeFileSync(join(dist, '.nojekyll'), '');

console.log(`✓ dist/index.html  (${(html.length / 1024).toFixed(1)} KB)`);
