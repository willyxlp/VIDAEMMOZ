/* ============================================================
   Vida em Moz — 🎮 tycoon.js  (stub / em construção)
   O motor 3D do mini-jogo de negócios ainda está a ser
   preparado para Maputo. Por agora mostra um ecrã de espera
   e evita o 404 que quebrava o painel de Negócios.
   ============================================================ */

/* Instala window.TYCOON para que tycoon_ui.js não falhe */
const ICONES = { cantina: '🍲', discoteca: '🪩', salao: '💇🏾‍♀️', loja: '🛒' };

function iniciar(container, opts) {
  /* Desenha um ecrã "em breve" dentro do container tycoon */
  const ic = ICONES[opts.tipo] || '🏪';
  const nome = opts.nome || opts.tipo || 'Negócio';

  /* Canvas de fundo (escuro, estilo do jogo) */
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#0a0a12;';
  container.appendChild(canvas);

  /* Overlay com mensagem */
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:16px;
    color:#fff;font-family:'Bricolage Grotesque',sans-serif;text-align:center;
    padding:24px;pointer-events:none;
  `;
  overlay.innerHTML = `
    <div style="font-size:72px;line-height:1">${ic}</div>
    <div style="font-size:22px;font-weight:800">${esc ? esc(nome) : nome}</div>
    <div style="font-size:15px;color:#aaa;max-width:280px;line-height:1.5">
      O mini-jogo 3D está a ser preparado para Maputo.<br>
      Volta em breve — o teu negócio não vai a lado nenhum!
    </div>
    <div style="margin-top:8px;font-size:13px;color:#555">🚧 Em construção 🚧</div>
  `;
  container.appendChild(overlay);

  /* Preenche HUD mínimo para não crashar tycoon_ui */
  if (typeof opts.hud === 'function') {
    opts.hud({
      caixa: 0, nivel: 1, xp: 0, falta: 100,
      objetivos: 0, luz: false, leva: 0, max: 0,
      proximo: null,
      melhorias: [],
    });
  }
  if (typeof opts.passo === 'function') opts.passo(null);
  if (typeof opts.dica  === 'function') opts.dica(null);

  /* Objecto de jogo retornado — métodos chamados por tycoon_ui */
  return {
    marcarCompleto:  () => {},
    definirBonus:    () => {},
    aplicarCompras:  () => {},
    destruir:        () => { canvas.remove(); overlay.remove(); },
  };
}

/* Expõe globalmente (tycoon_ui usa window.TYCOON.iniciar) */
window.TYCOON = { iniciar };

/* Export ES-module para o import() dinâmico em tycoon_ui.js */
export { iniciar };
export default { iniciar };
