const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'src/pages/Hardware.tsx');

if (!fs.existsSync(target)) {
  console.log('Hardware.tsx not found.');
  process.exit(0);
}

const before = fs.readFileSync(target, 'utf8');
let after = before;

const replacements = [
  ['<span><strong>Branch</strong><small>Branch device scope</small></span>', '<span><strong>Branch</strong></span>'],
  ['<span><strong>Statistics</strong><small>Hardware operational views</small></span>', '<span><strong>Statistics</strong></span>'],
];

for (const [from, to] of replacements) {
  after = after.split(from).join(to);
}

after = after
  .replace(/<small[^>]*>\s*Branch\s+device\s+scope\s*<\/small>/g, '')
  .replace(/<small[^>]*>\s*Hardware\s+operational\s+views\s*<\/small>/g, '')
  .replace(/<span>\s*<strong>Branch<\/strong>\s*<\/span>/g, '<span><strong>Branch</strong></span>')
  .replace(/<span>\s*<strong>Statistics<\/strong>\s*<\/span>/g, '<span><strong>Statistics</strong></span>');

if (after !== before) {
  fs.writeFileSync(target, after, 'utf8');
  console.log('Removed Hardware sidebar tab helper text.');
} else {
  console.log('No Hardware sidebar helper text found.');
}
