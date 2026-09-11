import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { minify } from 'terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'assets', 'js');
const output = join(root, 'js-dist', 'assets', 'js');

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findJavaScriptFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(file);
  }

  return files;
}

async function processJavaScript(file) {
  const relativePath = relative(source, file);
  const target = join(output, relativePath);
  const code = await readFile(file, 'utf8');
  const minified = await minify(code, {
    compress: true,
    mangle: true,
    format: { comments: false },
  });
  if (!minified.code) throw new Error(`Terser returned empty output for ${relativePath}`);

  const obfuscated = JavaScriptObfuscator.obfuscate(minified.code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: false,
    sourceMap: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
  });

  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, obfuscated.getObfuscatedCode(), 'utf8');
  console.log(`Processed ${relativePath}`);
}

if (process.argv.includes('--clean')) await rm(join(root, 'js-dist'), { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = await findJavaScriptFiles(source);
await Promise.all(files.map(processJavaScript));
console.log(`Generated ${files.length} files in js-dist/assets/js/`);
