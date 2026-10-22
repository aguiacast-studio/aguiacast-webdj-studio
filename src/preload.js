'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const ACTIONS = new Set(['inicio', 'voltar', 'atualizar', 'sair']);
contextBridge.exposeInMainWorld('agc', Object.freeze({
  acao: (nome) => {
    if (typeof nome !== 'string' || !ACTIONS.has(nome)) return Promise.resolve(false);
    return ipcRenderer.invoke('agc:acao', nome);
  },
  escutar: (fn) => {
    if (typeof fn !== 'function') return;
    ipcRenderer.on('agc:estado', (_event, info) => {
      if (!info || typeof info !== 'object') return;
      fn({ texto: String(info.texto || ''), classe: String(info.classe || 'neutro'), webdj: Boolean(info.webdj) });
    });
  }
}));
