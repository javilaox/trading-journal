/**
 * Acota stats-page.css a #statsView (sin dependencias externas).
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/stats-page.css');
let css = fs.readFileSync(file, 'utf8');

const header = `/* Estadísticas — solo dentro de #statsView (no afecta Dashboard) */
#statsView.stats-view-root {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  box-sizing: border-box;
}

`;

// Quitar cabecera previa y reglas globales que pisan Dashboard
css = css.replace(/^[\s\S]*?(?=\.app-shell|\.main-content\.stats-main|\.stats-page|\.filters|\.container)/m, '');
css = css.replace(/\.app-shell > \.main-content\.stats-main\s*\{[\s\S]*?\}\s*/m, '');
css = css.replace(
  /\.main-content\.stats-main,\s*\.stats-page,[\s\S]*?max-width: 100%;\s*\}\s*/m,
  ''
);

function findMatchingBrace(str, openIdx) {
  let depth = 0;
  for (let j = openIdx; j < str.length; j += 1) {
    if (str[j] === '{') depth += 1;
    else if (str[j] === '}') {
      depth -= 1;
      if (depth === 0) return j;
    }
  }
  return str.length - 1;
}

function prefixRuleBlock(selectors, body) {
  const parts = selectors
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.includes('#statsView')) return s;
      return `#statsView ${s}`;
    });
  return `${parts.join(', ')} ${body}`;
}

function scopeCss(input) {
  let out = '';
  let i = 0;
  const n = input.length;

  while (i < n) {
    const rest = input.slice(i);
    const ws = rest.match(/^\s*/)[0];
    out += ws;
    i += ws.length;
    if (i >= n) break;

    if (input[i] === '@') {
      const atRule = input.slice(i).match(/^@[\w-]+/)[0];
      if (atRule === '@keyframes' || atRule === '@font-face') {
        const close = findMatchingBrace(input, input.indexOf('{', i));
        out += input.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      if (atRule === '@media') {
        const open = input.indexOf('{', i);
        const close = findMatchingBrace(input, open);
        const prelude = input.slice(i, open + 1);
        const inner = input.slice(open + 1, close);
        out += prelude + scopeCss(inner) + '}';
        i = close + 1;
        continue;
      }
    }

    const open = input.indexOf('{', i);
    if (open === -1) {
      out += input.slice(i);
      break;
    }
    const selectors = input.slice(i, open).trim();
    const close = findMatchingBrace(input, open);
    const body = input.slice(open, close + 1);

    if (!selectors) {
      out += body;
    } else if (selectors.startsWith('@')) {
      out += selectors + body;
    } else {
      out += prefixRuleBlock(selectors, body);
    }
    i = close + 1;
  }
  return out;
}

const scoped = header + scopeCss(css.trim());
fs.writeFileSync(file, scoped);
console.log('OK:', file, '→', scoped.split('\n').length, 'lines');
