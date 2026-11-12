/* ============================================================
   Vida na Banda — MEDIR A RETENÇÃO (FILA 0gp, dono 10 nov 09:32 «yeah add all of that» + «apply it»)
   1) Onde passam o tempo: 1 em cada 8 jogadores (pelo id) conta os segundos em cada zona e manda-os no pulso (sem pedidos novos).
   2) «O que te trouxe de volta?»: uma pergunta, uma só vez, a partir do 2.º dia de jogo, 3–6 min depois de entrar.
   ============================================================ */
const _tempo = new Map();
const tempoAmostra = () => typeof uid !== 'undefined' && uid && /^[01]/.test(uid);
function zonaAgora() {
  if (document.querySelector('.fila-espera')) return 'fila';
  if (typeof tycoonAberto !== 'undefined' && tycoonAberto) return 'negocio';
  if (typeof telAberto !== 'undefined' && telAberto) return 'tel:' + (typeof telSub !== 'undefined' && telSub ? String(telSub).replace(/[^a-z0-9_]/g, '') : 'inicio');
  const t = typeof cena !== 'undefined' && cena?.tipo;
  return t === 'bairro' ? 'rua' : t === 'casa' ? 'casa' : t === 'interior' ? 'interior' : 'outro';
}
setInterval(() => {
  if (document.hidden || !tempoAmostra()) return;
  const z = zonaAgora(); _tempo.set(z, (_tempo.get(z) || 0) + 1);
}, 1000);
// chamado pelo pulsar(): devolve o tempo acumulado e começa de novo
function tempoParaPulso() {
  if (!_tempo.size) return [];
  const r = [..._tempo].slice(0, 10).map(([z, s]) => ({ lugar: 't:' + z, id: 0, seg: Math.min(150, s) }));
  _tempo.clear(); return r;
}

const REGRESSO = [['amigos', '👥', 'Os amigos e as pessoas'], ['progresso', '💰', 'Ganhar dinheiro e subir na vida'], ['negocio', '🏪', 'O meu negócio'],
  ['casa', '🏠', 'A minha casa'], ['novidades', '✨', 'As coisas novas no jogo'], ['eventos', '🗳️', 'As eleições e os eventos'], ['outro', '✏️', 'Outra coisa']];
function mostrarRegresso() {
  if (document.querySelector('.regresso')) return;
  const v = document.createElement('div'); v.className = 'regresso'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', tr('O que te trouxe de volta?'));
  v.innerHTML = `<button class="rg-x" aria-label="${esc(tr('Fechar'))}">✕</button>
    <b>${esc(tr('Bem-vindo/a de volta!'))}</b><p>${esc(tr('O que te trouxe de volta hoje?'))}</p>
    <div class="rg-op">${REGRESSO.map(([k, e, t]) => `<button class="rg-b" data-rg="${k}"><span aria-hidden="true">${e}</span>${esc(tr(t))}</button>`).join('')}</div>
    <div class="rg-outro hide"><input maxlength="200" placeholder="${esc(tr('Conta-nos em poucas palavras'))}" aria-label="${esc(tr('Outra coisa'))}"><button class="btn sm">${esc(tr('Enviar'))}</button></div>
    <small class="rg-ok hide" role="status">${esc(tr('Obrigado! Isto ajuda-nos a saber o que melhorar.'))}</small>`;
  const marcar = () => { try { localStorage.setItem('vel_regresso_' + uid, '1'); } catch { } };
  const enviar = async (k, outro) => {
    marcar(); v.querySelector('.rg-op').classList.add('hide'); v.querySelector('.rg-outro').classList.add('hide'); v.querySelector('.rg-ok').classList.remove('hide');
    sb.rpc('responder_regresso', { p_resposta: k, p_outro: outro || null }).then(() => { }, () => { });
    setTimeout(() => v.remove(), 2500);
  };
  v.querySelector('.rg-x').onclick = () => { marcar(); v.remove(); };
  v.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => {
    if (b.dataset.rg !== 'outro') return enviar(b.dataset.rg);
    v.querySelector('.rg-op').classList.add('hide'); const o = v.querySelector('.rg-outro'); o.classList.remove('hide'); o.querySelector('input').focus();
  });
  v.querySelector('.rg-outro button').onclick = () => enviar('outro', v.querySelector('.rg-outro input').value.trim());
  document.body.appendChild(v);
}
(function vigiarRegresso() {
  const em = Date.now() + (window.__REGRESSO_JA ? 0 : (3 + Math.random() * 3) * 60000);
  const t = setInterval(() => {
    if (Date.now() < em) return;
    if (typeof J === 'undefined' || !J?.criado_em || typeof uid === 'undefined' || !uid || !document.querySelector('#carregar.hide')) return;
    let feito = false; try { feito = !!localStorage.getItem('vel_regresso_' + uid); } catch { }
    // a partir do 2.º dia de jogo (dia de Luanda)
    const dia = d => new Date(d + 3600e3).toISOString().slice(0, 10);
    if (feito || dia(Date.parse(J.criado_em)) === dia(Date.now())) return clearInterval(t);
    if ((typeof tycoonAberto !== 'undefined' && tycoonAberto) || document.querySelector('.veil, .pergunta, .novidades, .cartao-guia, #telVeil')) return;
    clearInterval(t); mostrarRegresso();
  }, 4000);
})();
