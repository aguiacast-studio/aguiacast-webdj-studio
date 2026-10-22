'use strict';
const assert = require('node:assert/strict');
const {classificarDestino, destinoPrincipal} = require('../src/studio-routes');
const host = 'https://aguiacast.com';
for(const path of ['/webdj-studio','/webdj-studio.php','/webdj/R0ExM2Q%3D?agc_audio_lab=1'])
  assert.equal(classificarDestino(host+path),'studio',path);
for(const path of ['/login','/login.php','/login-autentica-revenda','/login-autentica-revenda.php','/sair'])
  assert.equal(classificarDestino(host+path),'login',path);
for(const path of ['/dashboard','/dashboard.php','/gerenciar-webdjs'])
  assert.equal(classificarDestino(host+path),'inicio',path);
for(const path of ['/admin/login','/gerenciar-djs','/webdj','/webdj/x/y','/settings','/','/webdj/'])
  assert.equal(classificarDestino(host+path),'negado',path);
for(const bad of ['https://evil.test/webdj/x','http://aguiacast.com/login', 'https://aguiacast.com.evil.test/login','nonsense'])
  assert.equal(classificarDestino(bad),'negado',bad);
assert.equal(destinoPrincipal(host+'/dashboard'),host+'/webdj-studio');
assert.equal(destinoPrincipal(host+'/dashboard.php?foo=1'),host+'/webdj-studio');
assert.equal(destinoPrincipal(host+'/webdj/FOO'),null);
console.log('OK: verificadas rotas permitidas, recusadas e redirecionamento pos-login');
