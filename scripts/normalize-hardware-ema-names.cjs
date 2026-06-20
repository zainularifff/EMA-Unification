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
  [/<small>\s*Branch device scope\s*<\/small>/g, ''],
  [/<small>\s*Hardware operational views\s*<\/small>/g, ''],
  [/<span>\s*<strong>Branch<\/strong>\s*<\/span>/g, '<span><strong>Branch</strong></span>'],
  [/<span>\s*<strong>Statistics<\/strong>\s*<\/span>/g, '<span><strong>Statistics</strong></span>'],
  [/<span>\s*<strong>Branch<\/strong>\s*<small>\s*Branch device scope\s*<\/small>\s*<\/span>/g, '<span><strong>Branch</strong></span>'],
  [/<span>\s*<strong>Statistics<\/strong>\s*<small>\s*Hardware operational views\s*<\/small>\s*<\/span>/g, '<span><strong>Statistics</strong></span>'],
];

const sidebarTabGuardCss = `

/* EMA hardware sidebar tabs: label only, no helper text. */
.ema-module-root .ema-module-sidebar-switcher .setting-btn small {
  display: none !important;
}

.ema-module-root .ema-module-sidebar-switcher .setting-btn > span:last-child {
  display: inline-flex !important;
  align-items: center !important;
  min-width: 0 !important;
}
`;

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

  if (relativePath === 'src/index.css' && !after.includes('EMA hardware sidebar tabs: label only')) {
    after = `${after.trimEnd()}${sidebarTabGuardCss}\n`;
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
  console.log('Hardware UI names normalized in:');
  changed.forEach((item) => console.log(`- ${item}`));
} else {
  console.log('No hardware UI names found.');
}

if (skipped.length) {
  console.log('Skipped missing files:');
  skipped.forEach((item) => console.log(`- ${item}`));
}
