'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../src/ui/index.html'), 'utf8');
for (const action of ['inicio', 'djs', 'atualizar', 'sair']) {
  assert.equal(html.split('data-acao="' + action + '"').length - 1, 1, action);
}
assert.ok(!html.includes('Central do Studio'));
assert.ok(!html.includes('data-acao="voltar"'));
assert.ok(html.includes('Meus DJs'));
console.log('OK: menu sem botao duplicado; Meus DJs preservado');
