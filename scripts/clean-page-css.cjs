const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pagesDir = path.join(root, 'src', 'pages');
const excludedNameParts = ['Login', 'Hardware', 'Report', 'Settings', 'ServiceDesk'];

function shouldClean(fileName) {
  if (!fileName.endsWith('.tsx')) return false;
  return !excludedNameParts.some((part) => fileName.includes(part));
}

function skipBalancedBraces(text, index) {
  let depth = 0;
  let quote = null;
  let templateDepth = 0;
  let escaped = false;
  let blockComment = false;
  let lineComment = false;

  for (let i = index; i < text.length; i += 1) {
    const current = text[i];
    const next = text[i + 1];

    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (lineComment) {
      if (current === '\n') lineComment = false;
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (current === '\\') {
        escaped = true;
        continue;
      }
      if (quote === '`' && current === '$' && next === '{') {
        templateDepth += 1;
        i += 1;
        continue;
      }
      if (quote === '`' && templateDepth > 0 && current === '}') {
        templateDepth -= 1;
        continue;
      }
      if (current === quote && templateDepth === 0) quote = null;
      continue;
    }

    if (current === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (current === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      continue;
    }
    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth <= 0) return i + 1;
    }
  }

  return text.length;
}

function removeJsxAttribute(text, attrName) {
  let output = '';
  let index = 0;

  while (index < text.length) {
    const found = text.indexOf(attrName, index);
    if (found === -1) {
      output += text.slice(index);
      break;
    }

    const before = text[found - 1] || '';
    const after = text[found + attrName.length] || '';
    const isAttrBoundaryBefore = /[\s<]/.test(before);
    const isAttrBoundaryAfter = /[\s=]/.test(after);

    if (!isAttrBoundaryBefore || !isAttrBoundaryAfter) {
      output += text.slice(index, found + attrName.length);
      index = found + attrName.length;
      continue;
    }

    let start = found;
    while (start > index && /[ \t]/.test(text[start - 1])) start -= 1;

    let cursor = found + attrName.length;
    while (/\s/.test(text[cursor] || '')) cursor += 1;
    if (text[cursor] !== '=') {
      output += text.slice(index, found + attrName.length);
      index = found + attrName.length;
      continue;
    }
    cursor += 1;
    while (/\s/.test(text[cursor] || '')) cursor += 1;

    let end = cursor;
    const opener = text[cursor];
    if (opener === '"' || opener === "'") {
      end = cursor + 1;
      while (end < text.length) {
        if (text[end] === '\\') {
          end += 2;
          continue;
        }
        if (text[end] === opener) {
          end += 1;
          break;
        }
        end += 1;
      }
    } else if (opener === '{') {
      end = skipBalancedBraces(text, cursor);
    } else {
      while (end < text.length && !/[\s>]/.test(text[end])) end += 1;
    }

    output += text.slice(index, start);
    index = end;
  }

  return output;
}

function cleanContent(content) {
  let next = content;

  next = next.replace(/^\s*import\s+['"][^'"]+\.css['"];?\s*$/gm, '');
  next = next.replace(/^\s*import\s+[^;]+from\s+['"][^'"]+\.css['"];?\s*$/gm, '');
  next = next.replace(/^\s*import\s+clsx\s+from\s+['"]clsx['"];?\s*$/gm, '');
  next = next.replace(/\s*<style[^>]*>[\s\S]*?<\/style>/g, '');
  next = removeJsxAttribute(next, 'className');
  next = removeJsxAttribute(next, 'style');
  next = next.replace(/\n{3,}/g, '\n\n');

  return next;
}

const cleaned = [];
for (const fileName of fs.readdirSync(pagesDir)) {
  if (!shouldClean(fileName)) continue;
  const filePath = path.join(pagesDir, fileName);
  const original = fs.readFileSync(filePath, 'utf8');
  const next = cleanContent(original);
  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8');
    cleaned.push(path.relative(root, filePath));
  }
}

fs.rmSync(path.join(root, 'scripts', 'clean-page-css.cjs'), { force: true });
fs.rmSync(path.join(root, '.github', 'workflows', 'clean-page-css.yml'), { force: true });

console.log(cleaned.length ? `Cleaned CSS class links from:\n${cleaned.join('\n')}` : 'No matching CSS class links found.');
