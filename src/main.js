'use strict';
const path = require('node:path');
const { classificarDestino, destinoPrincipal } = require('./studio-routes');
const { app, BrowserWindow, WebContentsView, ipcMain, session, dialog, powerSaveBlocker } = require('electron');

const ORIGIN = 'https://aguiacast.com';
const HOME = `${ORIGIN}/webdj-studio`;
const DJS = `${ORIGIN}/gerenciar-djs`;
const LOGIN = `${ORIGIN}/login`;
const LOGOUT = `${ORIGIN}/sair`;
const TOP = 76;
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
async function confirmarSaidaEstudio() {
  if (!pagina || !estaNoWebDJ(pagina.webContents.getURL())) return true;
  // Só apresenta alerta quando o WebDJ realmente iniciou transmissão.
  // Se o estado não puder ser lido, opta por avisar para não cortar o áudio.
  let transmitindo = true;
  try {
    transmitindo = await pagina.webContents.executeJavaScript(
      'Boolean(window.Webcaster && Webcaster.views && Webcaster.views.settings && Webcaster.views.settings.model && Webcaster.views.settings.model.get("streaming"))',
      true
    );
  } catch (_) { /* manter aviso conservador */ }
  if (!transmitindo) return true;
  return dialog.showMessageBoxSync(janela, {
    type: 'warning', buttons: ['Continuar transmitindo', 'Encerrar e sair'], defaultId: 0, cancelId: 0,
    title: 'Transmissão em andamento',
    message: 'Você está transmitindo ao vivo.',
    detail: 'Sair agora pode interromper a programação da rádio. Desconecte o WebDJ primeiro para encerrar com segurança.'
  }) === 1;
}
async function navegar(destino, exigeConfirmacao = true) {
  if (!pagina || !urlConfiavel(destino)) return false;
  if (exigeConfirmacao && !(await confirmarSaidaEstudio())) return false;
  try { await pagina.webContents.loadURL(destino); return true; }
  catch (_) { estado('Falha ao carregar o Studio. Verifique sua internet.', 'erro'); return false; }
}
function ajustar() {
  if (!janela || !pagina || janela.isDestroyed()) return;
  const [w, h] = janela.getContentSize();
  pagina.setBounds({ x: 0, y: TOP, width: Math.max(320, w), height: Math.max(50, h - TOP) });
}
function iniciar() {
  janela = new BrowserWindow({
    width: 1360, height: 900, minWidth: 880, minHeight: 620, show: false,
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
    ev.preventDefault();
    confirmarSaidaEstudio().then((autorizado) => {
      if (autorizado && janela && !janela.isDestroyed()) {
        fechando = true;
        janela.close();
      }
    }).catch(() => estado('Não foi possível confirmar a saída do estúdio.', 'atencao'));
  });
  janela.on('closed', () => {
    if (suspensao !== null) { powerSaveBlocker.stop(suspensao); suspensao = null; }
    pagina = null; janela = null;
  });
  janela.once('ready-to-show', () => janela && janela.show());
  pagina.webContents.setWindowOpenHandler(({ url }) => {
    const destino = classificarDestino(url);
    if (destino === 'studio' || destino === 'login' || destino === 'djs') {
      navegar(url);
    } else if (destino === 'inicio') {
      navegar(HOME);
    } else {
      estado('Neste aplicativo, apenas os DJs e o Studio estão disponíveis.', 'atencao');
    }
    return { action: 'deny' };
  });
  pagina.webContents.on('will-navigate', (evento, url) => {
    const destino = classificarDestino(url);
    if (estaNoWebDJ(pagina.webContents.getURL()) && (destino === 'djs' || destino === 'login')) {
      evento.preventDefault();
      navegar(url);
    } else if (destino === 'negado') {
      evento.preventDefault();
      estado('Área do painel bloqueada no aplicativo. Use o navegador para administrar a rádio.', 'atencao');
    } else if (destino === 'inicio') {
      evento.preventDefault();
      navegar(HOME);
    }
  });
  pagina.webContents.on('did-start-loading', () => estado('Abrindo Águia Cast Studio…'));
  pagina.webContents.on('did-stop-loading', () => {
    gerirSuspensao();
    const u = pagina.webContents.getURL();
    let endereco;
    try { endereco = new URL(u); } catch (_) { return; }
    if (/^\/login(?:\.php)?\/?$/i.test(endereco.pathname)) {
      estado('Faça login com a porta e a senha da streaming.', 'neutro');
    } else if (estaNoWebDJ(u)) {
      const labAtivo = endereco.searchParams.get('agc_audio_lab') !== '0';
      estado(labAtivo
        ? 'Motor de áudio V1.5 ativo · transmissão com mixagem aprimorada.'
        : 'WebDJ clássico aberto · Audio Lab não identificado nesta página.',
        labAtivo ? 'ok' : 'atencao');
    } else if (endereco.pathname === '/gerenciar-djs' || endereco.pathname === '/gerenciar-djs.php') {
      estado('Gerenciador de DJs conectado ao cadastro da VPS.', 'ok');
    } else if (endereco.origin === ORIGIN) {
      estado('Central de DJs pronta para abrir seu estúdio.', 'ok');
    } else {
      estado('Página não reconhecida.', 'erro');
    }
  });
  pagina.webContents.on('did-fail-load', (_ev, erro, desc, url, isMainFrame) => {
    if (isMainFrame && erro !== -3) estado(`Não foi possível abrir o Studio (${erro}).`, 'erro');
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
    // Na V1.5 o Audio Lab aprovado fica ativado por padrão na VPS.
    // Aplica somente a navegacoes completas do estudio, nao interfere em
    // login, dashboard, recursos de audio, cookies ou WebSockets.
    // O login do painel pode redirecionar primeiro a /dashboard.
    // O Electron pula essa tela e carrega a Central WebDJ imediatamente.
    // Nao afeta recursos, chamadas AJAX, formularios POST ou WebSockets.
    sessao.webRequest.onBeforeRequest({ urls: [`${ORIGIN}/*`] }, (detalhes, callback) => {
      if (detalhes.resourceType !== 'mainFrame' || detalhes.method !== 'GET') {
        callback({});
        return;
      }
      const principal = destinoPrincipal(detalhes.url);
      const tipo = classificarDestino(detalhes.url);
      if (principal || tipo === 'inicio' || tipo === 'negado') {
        callback({ redirectURL: principal || HOME });
        return;
      }
      // V1.5 VPS liga o motor de áudio por padrão (sem parâmetro na URL).
      callback({});
    });
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
      if (acao === 'djs') return navegar(DJS);
      if (acao === 'sair') return navegar(LOGOUT);
      if (acao === 'voltar') return navegar(HOME);
      if (acao === 'atualizar') { pagina.webContents.reloadIgnoringCache(); return true; }
      return false;
    });
    iniciar();
  });
  app.on('window-all-closed', () => app.quit());
}
