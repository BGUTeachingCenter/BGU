// Reads a JSON array of {where, html} from stdin; parses every \( \) and \[ \] TeX segment with MathJax.
// Prints one line per error. Exit code 1 if any errors.
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({packages: AllPackages.filter(p => p !== 'bussproofs'), formatError: (jax, err) => { throw err; }});
const doc = mathjax.document('', {InputJax: tex});

let input = '';
for await (const chunk of process.stdin) input += chunk;
const items = JSON.parse(input);
let bad = 0;
const re = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
for (const {where, html} of items) {
  const stripped = html.replace(re, '');
  if (/\\\(|\\\)|\\\[|\\\]/.test(stripped)) { console.log(`${where}: unbalanced math delimiters`); bad++; }
  if (/\$/.test(stripped)) { console.log(`${where}: contains $ — use \\( \\) or \\[ \\] instead`); bad++; }
  for (const m of html.matchAll(re)) {
    const src = m[1] ?? m[2];
    if (/[֐-׿]/.test(src)) { console.log(`${where}: Hebrew inside math: ${src.slice(0, 60)}`); bad++; }
    try { doc.convert(src, {display: m[2] !== undefined}); }
    catch (e) { console.log(`${where}: TeX error "${e.message}" in: ${src.slice(0, 80)}`); bad++; }
  }
}
process.exit(bad ? 1 : 0);
