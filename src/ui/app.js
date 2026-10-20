'use strict';
const botoes = document.querySelectorAll('[data-acao]');
for (const botao of botoes) {
  botao.addEventListener('click', () => {
    if (botao.dataset.acao !== 'atualizar' && botao.dataset.acao !== 'voltar') {
      document.querySelectorAll('nav button').forEach((el) => el.classList.toggle('active', el === botao));
    }
    window.agc.acao(botao.dataset.acao).catch(() => {});
  });
}
window.agc.escutar(({ texto, classe, webdj }) => {
  const saida = document.getElementById('estado');
  saida.textContent = texto;
  saida.title = texto;
  document.getElementById('indicador').className = 'indicator ' + (['ok','erro'].includes(classe) ? classe : '');
  document.title = webdj ? 'No ar · Águia Cast WebDJ Studio' : 'Águia Cast WebDJ Studio';
});
