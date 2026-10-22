'use strict';

const ORIGEM_PERMITIDA = 'https://aguiacast.com';

/**
 * Acrescenta somente o parâmetro do laboratório de áudio às páginas de DJ.
 * Não altera endpoints, credenciais, fragmentos nem outros parâmetros.
 * Retorna null quando nenhuma alteração é necessária.
 *
 * Para comparar com o motor antigo dentro do app, um link explícito
 * ?agc_audio_lab=0 é respeitado.
 */
function prepararUrlAudioLab(valor) {
  try {
    const url = new URL(valor);
    if (url.origin !== ORIGEM_PERMITIDA || url.username || url.password) return null;
    if (!/^\/webdj\/[^/]+\/?$/i.test(url.pathname)) return null;
    if (url.searchParams.has('agc_audio_lab')) return null;
    url.searchParams.set('agc_audio_lab', '1');
    return url.toString();
  } catch (_) {
    return null;
  }
}

module.exports = { prepararUrlAudioLab };
