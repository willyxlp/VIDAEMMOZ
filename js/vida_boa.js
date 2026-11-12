// 9 nov 2026 (dono: «please put the 9.99 deal out now»): Pacote Vida Boa — oferta por tempo limitado (experiência).
// O servidor decide quem vê (grupos A/B; C é controlo) e guarda a janela de 24 h. O estado chega pelo pulso() (campo «vb»),
// por isso não há pedidos novos; a contagem decrescente corre só no telemóvel. Depois de fechada, não volta a interromper —
// fica no app Ouro até acabar. Nunca aparece por cima do carregamento, do guia, de minijogos ou de outra janela.
let vbEstado = null, vbMostrada = false, vbRelogio = 0;
const vbFmtTempo = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
const vbPreco = () => (typeof moedaOuro === 'function' && moedaOuro() === 'usd') ? '$9.99' : '9,99 €';
const vbOcupado = () => !J || !cena || document.hidden
  || !document.getElementById('carregar')?.classList.contains('hide')
  || (typeof emJogoAgora === 'function' && emJogoAgora())
  || (typeof guiaAtivo !== 'undefined' && guiaAtivo)
  || !!document.querySelector('.veil, .pergunta, .tel-modal, .jn-pedido, .vb-oferta, #suspensao, .sheet');
function vidaBoaPulso(vb) {
  vbEstado = vb && typeof vb === 'object' ? vb : null;
  if (!vbEstado || vbEstado.fechado || vbMostrada || vbOcupado()) return;
  vidaBoaAbrir(true);
}
function vbConteudo(ex) {
  const t = s => esc(tr(s));
  return `<div class="vb-caixa" role="dialog" aria-modal="true" aria-labelledby="vbTit">
    <button class="vb-x" data-vb-fechar aria-label="${t('Fechar')}">✕</button>
    <span class="vb-k">🎁 ${t('PACOTE VIDA BOA')}</span>
    <h3 id="vbTit">${t('1.500 OURO + 2 PRESENTES GRÁTIS!')}</h3>
    <div class="vb-linha vb-sempre"><span class="vb-ic">🪙</span><b>${t('1.500 Ouro — para sempre')}</b></div>
    <div class="vb-linha"><span class="vb-ic">⚡</span><span>${t('Energia sempre cheia — 24 horas')}</span></div>
    <div class="vb-linha"><span class="vb-ic">🍲</span><span>${t('Sem fome — 24 horas')}</span></div>
    <p class="vb-extra">${t('GANHAS 1.420 OURO EM EXTRAS!')}</p>
    <div class="vb-preco">${esc(tr('Tudo por apenas {0}').replace('{0}', vbPreco()))}</div>
    <p class="vb-tempo">⏳ ${esc(tr('A tua oferta termina em {0}')).replace('{0}', `<b data-vb-tempo>${ex ? vbFmtTempo(new Date(ex) - Date.now()) : '24:00:00'}</b>`)}</p>
    <button class="btn full vb-comprar" data-vb-comprar>${t('QUERO A MINHA OFERTA')} 🎁</button>
    <button class="vb-nao" data-vb-fechar>${t('Agora não')}</button>
    <p class="vb-letra">${t('Uma vez por conta. O Ouro fica para sempre; a energia e a fome contam 24 h a partir do pagamento.')}</p>
    <div class="vb-opiniao" data-vb-op>
      <button data-op="gostei">${t('Gostei da oferta')}</button><button data-op="caro">${t('Muito caro')}</button><button data-op="nao_interessa">${t('Não me interessa')}</button>
    </div></div>`;
}
function vbLigar(raiz, aoFechar) {
  const tick = () => {
    const ex = vbEstado?.ex ? new Date(vbEstado.ex) : null, el = raiz.querySelector('[data-vb-tempo]');
    if (!raiz.isConnected) return clearInterval(vbRelogio);
    if (el && ex) el.textContent = vbFmtTempo(ex - Date.now());
    if (ex && ex < Date.now()) { clearInterval(vbRelogio); vbEstado = null; aoFechar(false); }
  };
  clearInterval(vbRelogio); vbRelogio = setInterval(tick, 1000); tick();
  raiz.querySelectorAll('[data-vb-fechar]').forEach(b => b.onclick = () => aoFechar(true));
  raiz.querySelector('[data-vb-comprar]').onclick = async () => {
    sb.rpc('vida_boa_evento', { p_tipo: 'clicar' }).then(() => { }, () => { });
    if (typeof comprarPacote === 'function') await comprarPacote('vida_boa');
  };
  raiz.querySelectorAll('[data-op]').forEach(b => b.onclick = () => {
    sb.rpc('vida_boa_evento', { p_tipo: b.dataset.op }).then(() => { }, () => { });
    const box = raiz.querySelector('[data-vb-op]'); if (box) box.innerHTML = `<small>${esc(tr('Obrigado pela opinião!'))}</small>`;
  });
}
async function vidaBoaAbrir(primeira) {
  vbMostrada = true;
  const v = document.createElement('div'); v.className = 'vb-oferta';
  v.innerHTML = vbConteudo(vbEstado?.ex);
  document.body.appendChild(v);
  vbLigar(v, fechou => {
    clearInterval(vbRelogio); v.remove();
    if (fechou) { if (vbEstado) vbEstado.fechado = true; sb.rpc('vida_boa_evento', { p_tipo: 'fechar' }).then(() => { }, () => { }); }
  });
  if (primeira || !vbEstado?.ex) {   // a janela de 24 h começa agora (o servidor guarda a hora — não recomeça)
    try { const { data } = await sb.rpc('vida_boa_visto'); if (data?.ex && vbEstado) vbEstado.ex = data.ex; } catch { }
  }
}
// no app Ouro: o cartão da oferta (enquanto não acabar), para voltar a abri-la depois de fechar
function vidaBoaBanner(body) {
  if (!vbEstado || (vbEstado.ex && new Date(vbEstado.ex) < Date.now())) return;
  const c = document.createElement('div'); c.className = 'vb-banner';
  c.innerHTML = `<span class="vb-k">🎁 ${esc(tr('Oferta especial'))}</span><b>${esc(tr('PACOTE VIDA BOA'))}</b>
    <small>${esc(tr('1.500 Ouro + 24 h de energia cheia e sem fome'))} · ${esc(vbPreco())}</small>
    ${vbEstado.ex ? `<small>⏳ <b data-vb-tempo>${vbFmtTempo(new Date(vbEstado.ex) - Date.now())}</b></small>` : ''}
    <button class="btn sm" data-vb-ver>${esc(tr('Ver oferta'))}</button>`;
  body.prepend(c);
  c.querySelector('[data-vb-ver]').onclick = () => { if (typeof fecharTelemovel === 'function') fecharTelemovel(); vidaBoaAbrir(false); };
  const t = setInterval(() => { if (!c.isConnected) return clearInterval(t); const el = c.querySelector('[data-vb-tempo]'); if (el && vbEstado?.ex) el.textContent = vbFmtTempo(new Date(vbEstado.ex) - Date.now()); }, 1000);
}
