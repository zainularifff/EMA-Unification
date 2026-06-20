const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = process.cwd();

const targetFiles = [
  'src/pages/Software.tsx',
  'src/pages/AppMetering.tsx',
  'src/pages/InternetMetering.tsx',
  'src/pages/AppRestriction.tsx',
  'src/pages/WebRestriction.tsx',
  'src/pages/AppWebRestriction.tsx',
  'src/pages/PatchManagement.tsx',
  'src/pages/TaskList.tsx',
  'src/pages/NetworkInventory.tsx',
  'src/pages/SoftwareDistribution.tsx',
  'src/pages/ManagementDashboard.tsx',
];

const jsxAttributeNamesToRemove = new Set(['className', 'style', 'css']);
const objectNamesToRemove = new Set(['className', 'style', 'styles']);
const reactTypeImportsToRemove = new Set(['CSSProperties']);

function getNameText(name) {
  if (!name) return '';
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isPrivateIdentifier && ts.isPrivateIdentifier(name)) return name.text;
  return '';
}

function isStyleJsxTag(tagName) {
  return tagName && ts.isIdentifier(tagName) && tagName.text.toLowerCase() === 'style';
}

function cleanImportDeclaration(node) {
  const moduleName = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';

  if (moduleName === 'clsx') return undefined;

  if (moduleName !== 'react' || !node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) {
    return node;
  }

  const kept = node.importClause.namedBindings.elements.filter((element) => !reactTypeImportsToRemove.has(element.name.text));
  if (kept.length === node.importClause.namedBindings.elements.length) return node;

  const namedBindings = kept.length
    ? ts.factory.updateNamedImports(node.importClause.namedBindings, kept)
    : undefined;

  const importClause = ts.factory.updateImportClause(
    node.importClause,
    node.importClause.isTypeOnly,
    node.importClause.name,
    namedBindings,
  );

  if (!importClause.name && !importClause.namedBindings) return undefined;

  return ts.factory.updateImportDeclaration(
    node,
    node.modifiers,
    importClause,
    node.moduleSpecifier,
    node.assertClause,
  );
}

function cleanJsxAttributes(attributes) {
  let changed = false;
  const kept = [];

  for (const prop of attributes.properties) {
    if (ts.isJsxAttribute(prop) && jsxAttributeNamesToRemove.has(getNameText(prop.name))) {
      changed = true;
      continue;
    }
    kept.push(prop);
  }

  return changed ? ts.factory.updateJsxAttributes(attributes, kept) : attributes;
}

function cleanBindingPattern(pattern) {
  if (!ts.isObjectBindingPattern(pattern)) return pattern;
  const kept = pattern.elements.filter((element) => !objectNamesToRemove.has(getNameText(element.name)));
  return kept.length === pattern.elements.length ? pattern : ts.factory.updateObjectBindingPattern(pattern, kept);
}

function cleanTypeMembers(members) {
  let changed = false;
  const kept = [];

  for (const member of members) {
    const name = getNameText(member.name);
    if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && objectNamesToRemove.has(name)) {
      changed = true;
      continue;
    }
    kept.push(member);
  }

  return { changed, kept };
}

function transformer(context) {
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      return cleanImportDeclaration(node);
    }

    if (ts.isJsxElement(node) && isStyleJsxTag(node.openingElement.tagName)) {
      return undefined;
    }

    if (ts.isJsxSelfClosingElement(node) && isStyleJsxTag(node.tagName)) {
      return undefined;
    }

    if (ts.isJsxOpeningElement(node)) {
      const visited = ts.visitEachChild(node, visit, context);
      const attrs = cleanJsxAttributes(visited.attributes);
      return attrs === visited.attributes ? visited : ts.factory.updateJsxOpeningElement(visited, visited.tagName, visited.typeArguments, attrs);
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const visited = ts.visitEachChild(node, visit, context);
      const attrs = cleanJsxAttributes(visited.attributes);
      return attrs === visited.attributes ? visited : ts.factory.updateJsxSelfClosingElement(visited, visited.tagName, visited.typeArguments, attrs);
    }

    if (ts.isBindingElement(node) && objectNamesToRemove.has(getNameText(node.name))) {
      return undefined;
    }

    if (ts.isParameter(node) && ts.isObjectBindingPattern(node.name)) {
      const visited = ts.visitEachChild(node, visit, context);
      const cleanedName = cleanBindingPattern(visited.name);
      return cleanedName === visited.name ? visited : ts.factory.updateParameterDeclaration(
        visited,
        visited.modifiers,
        visited.dotDotDotToken,
        cleanedName,
        visited.questionToken,
        visited.type,
        visited.initializer,
      );
    }

    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      const visited = ts.visitEachChild(node, visit, context);
      const cleanedName = cleanBindingPattern(visited.name);
      return cleanedName === visited.name ? visited : ts.factory.updateVariableDeclaration(
        visited,
        cleanedName,
        visited.exclamationToken,
        visited.type,
        visited.initializer,
      );
    }

    if (ts.isTypeLiteralNode(node)) {
      const visited = ts.visitEachChild(node, visit, context);
      const cleaned = cleanTypeMembers(visited.members);
      return cleaned.changed ? ts.factory.updateTypeLiteralNode(visited, cleaned.kept) : visited;
    }

    if (ts.isInterfaceDeclaration(node)) {
      const visited = ts.visitEachChild(node, visit, context);
      const cleaned = cleanTypeMembers(visited.members);
      return cleaned.changed
        ? ts.factory.updateInterfaceDeclaration(visited, visited.modifiers, visited.name, visited.typeParameters, visited.heritageClauses, cleaned.kept)
        : visited;
    }

    return ts.visitEachChild(node, visit, context);
  };

  return (sourceFile) => ts.visitNode(sourceFile, visit);
}

function stripLooseStyleBlocks(source) {
  return source
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<style\b[^>]*\/>/gi, '');
}

function processFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return { relativePath, changed: false, skipped: true };

  const before = fs.readFileSync(absolutePath, 'utf8');
  const withoutLooseStyle = stripLooseStyleBlocks(before);
  const sourceFile = ts.createSourceFile(relativePath, withoutLooseStyle, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = ts.transform(sourceFile, [transformer]);
  const transformed = result.transformed[0];
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  let after = printer.printFile(transformed);

  after = after
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trimEnd() + '\n';

  result.dispose();

  if (after !== before) {
    fs.writeFileSync(absolutePath, after, 'utf8');
    return { relativePath, changed: true };
  }

  return { relativePath, changed: false };
}

const results = targetFiles.map(processFile);
const changed = results.filter((item) => item.changed).map((item) => item.relativePath);
const skipped = results.filter((item) => item.skipped).map((item) => item.relativePath);

if (changed.length) {
  console.log('CSS names stripped from:');
  changed.forEach((item) => console.log(`- ${item}`));
} else {
  console.log('No CSS names found in target pages.');
}

if (skipped.length) {
  console.log('Skipped missing files:');
  skipped.forEach((item) => console.log(`- ${item}`));
}
