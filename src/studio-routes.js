'use strict';
const ORIGIN = 'https://aguiacast.com';
const HOME = `${ORIGIN}/webdj-studio`;

function classificarDestino(valor) {
  try {
    const u = new URL(valor);
    if (u.origin !== ORIGIN || u.username || u.password) return 'negado';
    const p = u.pathname.replace(/\/+$/, '') || '/';
    if (/^\/webdj\/[^/]+$/i.test(p) || p === '/webdj-studio' || p === '/webdj-studio.php') return 'studio';
    if (/^\/(?:login|login\.php|sair|login-autentica-revenda(?:\.php)?|login-autentica-streaming(?:\.php)?|login-autentica(?:\.php)?)$/i.test(p)) return 'login';
    if (p === '/dashboard' || p === '/dashboard.php' || p === '/gerenciar-webdjs' || p === '/gerenciar-webdjs.php') return 'inicio';
    return 'negado';
  } catch (_) { return 'negado'; }
}

// So converte /dashboard, pagina de retorno normal do login da Streaming.
// Evita a exibicao de um painel completo dentro do aplicativo.
function destinoPrincipal(valor) {
  try {
    const u = new URL(valor);
    if (u.origin !== ORIGIN || u.username || u.password) return null;
    if (/^\/dashboard(?:\.php)?\/?$/i.test(u.pathname)) return HOME;
    return null;
  } catch (_) { return null; }
}
module.exports = { classificarDestino, destinoPrincipal };
