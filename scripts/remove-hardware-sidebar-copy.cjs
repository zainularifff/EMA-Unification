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
  ['<button type="button" className="soft-btn d-inline-flex align-items-center gap-1 px-2" onClick={() => handleAddFolder()}><FolderPlus size={13} /> New Branch Path</button>', '<button type="button" className="ema-sidebar-create-branch" onClick={() => handleAddFolder()}><FolderPlus size={14} /><span>Create Branch</span></button>'],
];

for (const [from, to] of replacements) {
  after = after.split(from).join(to);
}

after = after
  .replace(/<small[^>]*>\s*Branch\s+device\s+scope\s*<\/small>/g, '')
  .replace(/<small[^>]*>\s*Hardware\s+operational\s+views\s*<\/small>/g, '')
  .replace(/<span>\s*<strong>Branch<\/strong>\s*<\/span>/g, '<span><strong>Branch</strong></span>')
  .replace(/<span>\s*<strong>Statistics<\/strong>\s*<\/span>/g, '<span><strong>Statistics</strong></span>')
  .replace(/<button\s+type="button"\s+className="soft-btn d-inline-flex align-items-center gap-1 px-2"\s+onClick=\{\(\) => handleAddFolder\(\)\}\s*>\s*<FolderPlus\s+size=\{13\}\s*\/?>\s*New Branch Path\s*<\/button>/g, '<button type="button" className="ema-sidebar-create-branch" onClick={() => handleAddFolder()}><FolderPlus size={14} /><span>Create Branch</span></button>')
  .replace(/New Branch Path/g, 'Create Branch');

if (after !== before) {
  fs.writeFileSync(target, after, 'utf8');
  console.log('Cleaned Hardware sidebar copy and create branch button.');
} else {
  console.log('No Hardware sidebar copy/button changes found.');
}
