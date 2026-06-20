const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'src/pages/Hardware.tsx',
  'src/index.css',
];

const replacements = [
  [/hardware-/g, 'ema-'],
  [/Hardware remains as the reference module while other page CSS is cleared\./g, 'EMA module layout reference styles.'],
  [/<small>Branch device scope<\/small>/g, ''],
  [/<small>Hardware operational views<\/small>/g, ''],
];

function normalizeFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { relativePath, skipped: true, changed: false };
  }

  const before = fs.readFileSync(absolutePath, 'utf8');
  let after = before;

  for (const [pattern, replacement] of replacements) {
    after = after.replace(pattern, replacement);
  }

  // Keep domain/data names intact. Only CSS-style prefix names are normalized above.
  // Examples intentionally NOT touched: hardwareInventory, hardwareService, DetailTab = "hardware".

  if (after !== before) {
    fs.writeFileSync(absolutePath, after, 'utf8');
    return { relativePath, skipped: false, changed: true };
  }

  return { relativePath, skipped: false, changed: false };
}

const results = targets.map(normalizeFile);
const changed = results.filter((item) => item.changed).map((item) => item.relativePath);
const skipped = results.filter((item) => item.skipped).map((item) => item.relativePath);

if (changed.length) {
  console.log('Hardware CSS names normalized to ema-* in:');
  changed.forEach((item) => console.log(`- ${item}`));
} else {
  console.log('No hardware-* CSS names found.');
}

if (skipped.length) {
  console.log('Skipped missing files:');
  skipped.forEach((item) => console.log(`- ${item}`));
}
