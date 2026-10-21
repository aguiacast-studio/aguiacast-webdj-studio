'use strict';
const path = require('node:path');
const { app, BrowserWindow, WebContentsView, ipcMain, session, dialog, powerSaveBlocker } = require('electron');

const ORIGIN = 'https://aguiacast.com';
const HOME = `${ORIGIN}/webdj-studio`;
const PANEL = `${ORIGIN}/dashboard`;
const RADIO = `${ORIGIN}/gerenciar-webdjs`;
const LOGIN = `${ORIGIN}/login`;
const LOGOUT = `${ORIGIN}/sair`;
const TOP = 80;
let janela = null;
let pagina = null;
let suspensao = null;
let fechando = false;

function urlConfiavel(valor) {
  try {
    const url = new URL(valor);
    return url.origin === ORIGIN && url.username === '' && url.password === '';
  } catch (_) { return false; }
}
function estaNoWebDJ(valor) {
  try { return urlConfiavel(valor) && /^\/webdj\//i.test(new URL(valor).pathname); }
  catch (_) { return false; }
}
function estado(texto, classe = 'neutro') {
  if (!janela || janela.isDestroyed()) return;
  janela.webContents.send('agc:estado', { texto, classe, webdj: pagina && estaNoWebDJ(pagina.webContents.getURL()) });
}
function gerirSuspensao() {
  if (!pagina || pagina.webContents.isDestroyed()) return;
  if (estaNoWebDJ(pagina.webContents.getURL())) {
    if (suspensao === null) suspensao = powerSaveBlocker.start('prevent-app-suspension');
  } else if (suspensao !== null) {
    powerSaveBlocker.stop(suspensao); suspensao = null;
  }
}
function confirmarSaidaEstudio() {
  if (!pagina || !estaNoWebDJ(pagina.webContents.getURL())) return true;
  return dialog.showMessageBoxSync(janela, {
    type: 'warning', buttons: ['Permanecer no estúdio', 'Sair do estúdio'], defaultId: 0, cancelId: 0,
    title: 'Transmissão ao vivo',
    message: 'Você pode estar transmitindo ao vivo.',
    detail: 'Sair do estúdio ou fechar o aplicativo pode interromper sua transmissão. Deseja continuar?'
  }) === 1;
}
async function navegar(destino, exigeConfirmacao = true) {
  if (!pagina || !urlConfiavel(destino)) return false;
  if (exigeConfirmacao && !confirmarSaidaEstudio()) return false;
  try { await pagina.webContents.loadURL(destino); return true; }
  catch (_) { estado('Falha na conexão com o painel. Verifique sua internet.', 'erro'); return false; }
}
function ajustar() {
  if (!janela || !pagina || janela.isDestroyed()) return;
  const [w, h] = janela.getContentSize();
  pagina.setBounds({ x: 0, y: TOP, width: Math.max(320, w), height: Math.max(50, h - TOP) });
}
function iniciar() {
  janela = new BrowserWindow({
    width: 1360, height: 900, minWidth: 920, minHeight: 630, show: false,
    title: 'Águia Cast WebDJ Studio', backgroundColor: '#0b0e15',
    icon: path.join(__dirname, '../assets/icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, nodeIntegration: false,
      contextIsolation: true, webSecurity: true, devTools: false, webviewTag: false }
  });
  janela.removeMenu();
  janela.loadFile(path.join(__dirname, 'ui/index.html'));
  pagina = new WebContentsView({
    webPreferences: { partition: 'persist:aguiacast-webdj', sandbox: true, nodeIntegration: false,
      contextIsolation: true, webSecurity: true, devTools: false, webviewTag: false,
      backgroundThrottling: false, spellcheck: false }
  });
  janela.contentView.addChildView(pagina);
  ajustar();
  janela.on('resize', ajustar);
  janela.on('close', (ev) => {
    if (fechando) return;
    if (!confirmarSaidaEstudio()) ev.preventDefault();
    else fechando = true;
  });
  janela.on('closed', () => {
    if (suspensao !== null) { powerSaveBlocker.stop(suspensao); suspensao = null; }
    pagina = null; janela = null;
  });
  janela.once('ready-to-show', () => janela && janela.show());
  pagina.webContents.setWindowOpenHandler(({ url }) => {
    // Links do painel são abertos no aplicativo. Links externos só por ação explícita do usuário.
    if (urlConfiavel(url)) { navegar(url); }
    // Links externos bloqueados; não entregar URLs de páginas remotas ao sistema operacional.
    return { action: 'deny' };
  });
  pagina.webContents.on('will-navigate', (evento, url) => {
    if (!urlConfiavel(url)) { evento.preventDefault(); estado('Navegação externa bloqueada no estúdio.', 'atencao'); }
  });
  pagina.webContents.on('did-start-loading', () => estado('Carregando painel…'));
  pagina.webContents.on('did-stop-loading', () => {
    gerirSuspensao();
    const u = pagina.webContents.getURL();
    let endereco;
    try { endereco = new URL(u); } catch (_) { return; }
    if (/^\/login(?:\.php)?\/?$/i.test(endereco.pathname)) {
      estado('Faça login com a porta e a senha da streaming.', 'neutro');
    } else if (estaNoWebDJ(u)) {
      estado('Estúdio WebDJ aberto · confirme a conexão antes de transmitir.', 'ok');
    } else if (endereco.origin === ORIGIN) {
      estado('Área do painel Águia Cast aberta.', 'ok');
    } else {
      estado('Página não reconhecida.', 'erro');
    }
  });
  pagina.webContents.on('did-fail-load', (_ev, erro, desc, url, isMainFrame) => {
    if (isMainFrame && erro !== -3) estado(`Não foi possível abrir o painel (${erro}).`, 'erro');
  });
  pagina.webContents.on('render-process-gone', () => estado('Página interrompida. Clique em Atualizar.', 'erro'));
  pagina.webContents.loadURL(HOME).catch(() => estado('Verifique a internet e a instalação do módulo na VPS.', 'erro'));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
  });
  app.whenReady().then(() => {
    const sessao = session.fromPartition('persist:aguiacast-webdj');
    const autorizaMicrofone = (url, tipo, detalhes = {}) => {
      if (tipo !== 'media' || !estaNoWebDJ(url)) return false;
      const tipos = detalhes.mediaTypes || [];
      return tipos.length === 0 || (tipos.includes('audio') && !tipos.includes('video'));
    };
    sessao.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url = details && details.requestingUrl ? details.requestingUrl : webContents.getURL();
      callback(autorizaMicrofone(url, permission, details));
    });
    sessao.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details = {}) => {
      // Chamadas ao microfone são permitidas apenas no WebDJ autorizado.
      if (permission !== 'media') return false;
      const url = details.requestingUrl || (pagina && pagina.webContents.getURL()) || '';
      return estaNoWebDJ(url) && urlConfiavel(String(requestingOrigin));
    });
    // A primeira fase não pede acesso a câmera, tela, filesystem privilegiado ou execução local.
    ipcMain.handle('agc:acao', async (_ev, acao) => {
      if (!pagina || !janela) return false;
      if (acao === 'inicio') return navegar(HOME);
      if (acao === 'painel') return navegar(PANEL);
      if (acao === 'radio') return navegar(RADIO);
      if (acao === 'sair') return navegar(LOGOUT);
      if (acao === 'voltar') { if (!confirmarSaidaEstudio()) return false; if (pagina.webContents.canGoBack()) { pagina.webContents.goBack(); return true; } return navegar(HOME, false); }
      if (acao === 'atualizar') { pagina.webContents.reloadIgnoringCache(); return true; }
      return false;
    });
    iniciar();
  });
  app.on('window-all-closed', () => app.quit());
}
