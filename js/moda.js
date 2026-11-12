/* ============================================================
   Vida na Banda — LOJA DE MODA e GUARDA-ROUPA (FILA 0dn-4, dono 6 nov)
   «When you click Hang Out at Talatona Shopping, it should take you to… the actual drops in the clothes stores…
   charge Kz for some things and Ouro for some things… vary the prices based on the size of the trend.
   The whole wardrobe scene where you change clothes is what it should look like… try on… buy and they go to your
   wardrobe… the background changes to your home, while in the store the background is the store.»
   Sem deslizar para baixo: as peças passam para o lado (‹ ›), 3 de cada vez.
   ============================================================ */
let MODA = null;
const TENDENCIA_TXT = { pequena: 'Tendência pequena', media: 'Tendência média', grande: 'Tendência grande · edição limitada' };

async function abrirLojaModa(modo = 'loja') {
  const { data, error } = await sb.rpc('moda_loja');
  if (error) { toast(limparErro(error.message), 'mau'); return; }
  MODA = data;
  document.getElementById('lojaModa')?.remove();
  const v = document.createElement('div'); v.id = 'lojaModa'; v.className = 'loja-moda ' + modo;
  document.body.appendChild(v);
  const st = { modo, i: 0, sel: null, ap: { ...(J.aparencia || {}) } };
  desenharLojaModa(v, st);
}

// peças geradas todas as semanas: o nome monta-se das partes (visual.n), para sair traduzido
const MODA_PECA = { tshirt: 'T-shirt e calças', camisa: 'Camisa de algodão e calças', desporto: 'Conjunto desportivo', saia: 'Blusa e saia', pano: 'Pano africano', samakaka: 'Pano de samakaka',
  linho: 'Conjunto de linho', midi: 'Top e saia midi', fato: 'Fato clássico', festa: 'Vestido de festa', pano_festa: 'Pano de festa', blazer: 'Blazer e calças',
  alfaiate: 'Fato de alfaiate', gala: 'Vestido de gala', cetim: 'Vestido de cetim', smoking: 'Smoking', blazer_seda: 'Blazer de seda e calças', plissada: 'Saia plissada de seda',
  bata: 'Bata e calças', vestido_chita: 'Vestido de chita', saia_pano: 'Saia de pano e blusa', camisola: 'Camisola e calças de ganga',
  camisa_linho: 'Camisa de linho e calças', vestido_midi: 'Vestido midi', fato_verao: 'Fato de verão', saia_lapis: 'Saia lápis e blusa',
  fato_seda: 'Fato de seda', vestido_noite: 'Vestido de noite', kaftan: 'Kaftan de seda', fato_veludo: 'Fato de veludo' };
const MODA_COR = { branco: 'branco', preto: 'preto', azul: 'azul', vermelho: 'vermelho', verde: 'verde', amarelo: 'amarelo', cinzento: 'cinzento', castanho: 'castanho', laranja: 'laranja',
  coral: 'coral', turquesa: 'turquesa', lilas: 'lilás', vinho: 'vinho', creme: 'creme', marinho: 'azul-marinho', oliva: 'verde-oliva', rosa: 'rosa', mostarda: 'mostarda',
  dourado: 'dourado', prateado: 'prateado', champanhe: 'champanhe', esmeralda: 'esmeralda', safira: 'safira', rubi: 'rubi', marfim: 'marfim', onix: 'ónix', bronze: 'bronze' };
function nomePeca(p) {
  const n = p.visual?.n; if (!n || !MODA_PECA[n.p]) return tr(p.nome);
  const c1 = tr(MODA_COR[n.c1] || n.c1), c2 = tr(MODA_COR[n.c2] || n.c2);
  return tr(MODA_PECA[n.p]) + ' · ' + (n.c2 && n.c2 !== n.c1 ? tr('{0} e {1}').replace('{0}', c1).replace('{1}', c2) : c1);
}
const MODA_DESC = { 'Roupa do dia a dia, feita no bairro.': 1, 'Peça bem cortada, para sair à noite ou ir ao trabalho.': 1, 'Alta-costura: tecidos nobres e acabamentos à mão.': 1 };
function descPeca(d) {
  const lim = / Edição limitada\.$/.test(d), base = d.replace(/ Edição limitada\.$/, '');
  return MODA_DESC[base] ? tr(base) + (lim ? ' ' + tr('Edição limitada.') : '') : tr(d);
}

// 7 nov 15:43 (dono): «anything bought can be kept in the wardrobe … the wardrobe also has the dress up experience»
// O guarda-roupa guarda tudo o que é teu: a roupa de sempre, os fatos e vestidos comprados, os do Ouro, as peças das coleções e os acessórios.
const GR_BASES = [['fato', 2, '🤵'], ['vestido', 3, '👗'], ['pano', 4, '🧣'], ['fato_luxo', 5, '🤵'], ['vestido_marca', 6, '👗']];
const GR_ACESS = ['oculos', 'chapeu', 'brincos', 'colar', 'relogio', 'auscultadores', 'oculos_ouro', 'corrente_ouro', 'coroa', 'brincos_ouro', 'anel_diamante', 'colar_diamante', 'relogio_diamante'];
const nomeItem = id => (typeof D !== 'undefined' && D.itens || []).find(i => i.id === id);
function semanasModa() {   // as coleções agrupadas por semana (mais recente primeiro)
  const g = new Map();
  for (const c of MODA.colecoes || []) { const k = c.id.slice(0, 8); if (!g.has(k)) g.set(k, []); g.get(k).push(c); }
  return [...g.values()];
}
function pecasDoModo(st) {
  const meus = new Set(J.itens || []);
  if (st.modo === 'casa' && st.tab === 'acess')
    return GR_ACESS.filter(a => meus.has(a)).map(a => ({ id: 'ac:' + a, acess: a, nome: nomeItem(a)?.nome || a, emoji: nomeItem(a)?.emoji || '💍', tenho: true }));
  if (st.modo === 'casa') {
    const c0 = J.aparencia?.peca ? '#e0313f' : (J.aparencia?.camisa || '#e0313f'), k0 = J.aparencia?.peca ? '#2a3b55' : (J.aparencia?.calca || '#2a3b55');
    return [{ id: '', nome: 'A minha roupa de sempre', emoji: '👕', visual: null, tenho: true },
      ...GR_BASES.filter(([id]) => meus.has(id)).map(([id, r, e]) => ({ id: 'base:' + id, nome: nomeItem(id)?.nome || id, emoji: e, base: r, visual: { roupa: r, camisa: c0, calca: k0 }, tenho: true })),
      ...(MODA.minhas || []).map(p => ({ ...p, tenho: true }))];
  }
  const sem = semanasModa()[st.tab === 'passada' ? 1 : 0] || [];
  return sem.flatMap(c => (c.pecas || []).map(p => ({ ...p, colecaoNome: c.nome })));
}

function desenharLojaModa(v, st) {
  st.tab = st.tab || (st.modo === 'casa' ? 'roupa' : 'esta');
  const pecas = pecasDoModo(st), N = 3, max = Math.max(0, pecas.length - N);
  st.i = Math.min(st.i, max);
  const sel = pecas.find(p => p.id === st.sel);
  const sitio = J.bairro === 'talatona' ? 'Talatona Shopping' : (bairro(J.bairro)?.nome || J.bairro);
  const titulo = st.modo === 'casa' ? '👗 ' + tr('O meu guarda-roupa') : '🛍️ ' + tr('Loja de moda') + ' · ' + sitio;
  const sub = st.modo === 'casa' ? tr('Experimenta e veste o que é teu.') : tr('Coleção nova todas as segundas-feiras.');
  const TABS = st.modo === 'casa' ? [['roupa', '👗 ' + tr('Roupa')], ['acess', '💍 ' + tr('Acessórios')]] : [['esta', tr('Esta semana')], ['passada', tr('Semana passada')]];
  const abas = `<div class="lm-abas">${TABS.map(([k, t]) => `<button class="${st.tab === k ? 'on' : ''}" data-aba="${k}">${esc(t)}</button>`).join('')}<span>${pecas.length ? `${Math.floor(st.i / N) + 1}/${Math.ceil(pecas.length / N)}` : ''}</span></div>`;
  const acessOn = a => (st.ap.acess || []).includes(a);
  const preco = p => p.preco_ouro ? `🪙 ${p.preco_ouro} ${tr('Ouro')}` : fmtKz(p.preco);
  const cartao = p => `<button class="lm-peca ${st.sel === p.id ? 'on' : ''}" data-p="${esc(p.id)}">
      <span class="lm-cores">${p.visual ? `<i style="background:${esc(p.visual.camisa)}"></i><i style="background:${esc(p.visual.calca)}"></i>` : '<i style="background:#888"></i>'}</span>
      <b>${p.acess ? esc(p.emoji + ' ' + tr(p.nome)) : esc(nomePeca(p))}</b>
      <small>${p.acess ? (acessOn(p.acess) ? '✓ ' + esc(tr('A usar')) : esc(tr('Tocar para usar'))) : p.tenho ? '✓ ' + esc(tr('É teu')) : esc(preco(p))}</small>
      ${p.tendencia ? `<em class="t-${p.tendencia}">${esc(tr({ pequena: 'Pequena', media: 'Média', grande: 'Grande' }[p.tendencia]))}</em>` : ''}</button>`;
  let acaoBtn = '';
  if (sel && st.modo === 'loja' && !sel.tenho) acaoBtn = `<button class="btn" data-comprar>${esc(tr('Comprar'))} · ${esc(preco(sel))}</button>`;
  else if (sel || (st.modo === 'casa' && st.tab === 'acess')) acaoBtn = `<button class="btn" data-vestir>${esc(tr('Vestir'))}</button>`;
  const fundo = st.modo === 'loja' ? ` style="background-image:url(img/lojas/moda_${esc(J.bairro)}.webp), url(img/lojas/loja_moda.webp)"` : '';
  v.innerHTML = `<div class="lm-fundo"${fundo}></div>
    <div class="lm-topo"><div><b>${esc(titulo)}</b><small>${esc(sub)}</small></div><button class="btn ghost sm" data-fechar-moda>✕</button></div>
    <div class="lm-palco"><canvas id="lmPv" width="260" height="330"></canvas>
      ${sel && sel.descricao ? `<div class="lm-info"><b>${esc(nomePeca(sel))}</b><small>${esc(descPeca(sel.descricao))}</small>${sel.tendencia ? `<small class="lm-tend">${esc(tr(TENDENCIA_TXT[sel.tendencia]))}${sel.etiqueta ? ' · ' + esc(tr(sel.etiqueta === 'pratico' ? 'Prático' : 'Extravagante')) : ''}</small>` : ''}</div>` : ''}</div>
    ${abas}
    <div class="lm-barra">
      <button class="lm-seta" data-seta="-1" ${st.i <= 0 ? 'disabled' : ''}>‹</button>
      <div class="lm-pecas">${pecas.length ? pecas.slice(st.i, st.i + N).map(cartao).join('') : `<div class="empty">${esc(tr(st.modo === 'casa' ? (st.tab === 'acess' ? 'Ainda não tens acessórios.' : 'Ainda não compraste nada das coleções.') : 'Ainda não há coleção esta semana.'))}</div>`}</div>
      <button class="lm-seta" data-seta="1" ${st.i >= max ? 'disabled' : ''}>›</button>
    </div>
    <div class="lm-acoes">${st.modo === 'loja' ? `<button class="btn ghost" data-ir-casa>👗 ${esc(tr('O meu guarda-roupa'))}</button>` : ((MODA.colecoes || []).length ? `<button class="btn ghost" data-ir-loja>🛍️ ${esc(tr('Voltar à loja'))}</button>` : '')}${acaoBtn}</div>`;
  registarPreview('lmPv', st.ap); if (!previewAnim) animarPreview();
  v.querySelector('[data-fechar-moda]').onclick = () => v.remove();
  v.querySelectorAll('[data-seta]').forEach(b => b.onclick = () => { st.i = Math.max(0, Math.min(max, st.i + Number(b.dataset.seta) * N)); desenharLojaModa(v, st); });
  v.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { st.tab = b.dataset.aba; st.i = 0; st.sel = null; desenharLojaModa(v, st); });
  v.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const p = pecas.find(x => x.id === b.dataset.p);
    if (p.acess) {   // acessórios: liga/desliga por cima da roupa que estás a experimentar
      const a = new Set(st.ap.acess || []); a.has(p.acess) ? a.delete(p.acess) : a.add(p.acess); st.ap = { ...st.ap, acess: [...a] };
      return desenharLojaModa(v, st);
    }
    st.sel = p.id;
    const manter = { acess: st.ap.acess || J.aparencia?.acess || [] };
    if (p.base) { st.ap = { ...(J.aparencia || {}), ...manter, roupa: p.base, camisa: p.visual.camisa, calca: p.visual.calca }; delete st.ap.peca; }
    else if (p.visual) st.ap = { ...(J.aparencia || {}), ...manter, roupa: p.visual.roupa, camisa: p.visual.camisa, calca: p.visual.calca, peca: p.id };
    else { st.ap = { ...(J.aparencia || {}), ...manter }; delete st.ap.peca; if (J.aparencia?.peca || (J.aparencia?.roupa || 0) > 1) { st.ap.roupa = 0; st.ap.camisa = '#e0313f'; st.ap.calca = '#2a3b55'; } }
    desenharLojaModa(v, st);
  });
  v.querySelector('[data-ir-casa]')?.addEventListener('click', () => { st.modo = 'casa'; st.tab = 'roupa'; st.i = 0; st.sel = null; v.className = 'loja-moda casa'; st.ap = { ...(J.aparencia || {}) }; desenharLojaModa(v, st); });
  v.querySelector('[data-ir-loja]')?.addEventListener('click', () => { st.modo = 'loja'; st.tab = 'esta'; st.i = 0; st.sel = null; v.className = 'loja-moda loja'; st.ap = { ...(J.aparencia || {}) }; desenharLojaModa(v, st); });
  v.querySelector('[data-comprar]')?.addEventListener('click', async ev => {
    const bt = ev.currentTarget; bt.disabled = true;
    if (sel.preco_ouro && (J?.ouro || 0) < sel.preco_ouro && typeof sugerirOuro === 'function') { bt.disabled = false; return sugerirOuro(sel.preco_ouro); }   // 0dp-2
    const r = sel.preco_ouro ? await acao('comprar_com_ouro', { p_tipo: 'item', p_id: sel.id }) : await acao('comprar', { p_item: sel.id });
    if (r) { const { data } = await sb.rpc('moda_loja'); if (data) MODA = data; desenharLojaModa(v, st); } else bt.disabled = false;
  });
  v.querySelector('[data-vestir]')?.addEventListener('click', async ev => {
    const bt = ev.currentTarget; bt.disabled = true;
    if (await acao('mudar_aparencia', { p_aparencia: st.ap })) { try { localStorage.removeItem('vel_ap_' + uid); } catch { } if (typeof eu !== 'undefined' && eu) { eu.ap = minhaAparencia(); presencaAgora(true); } toast(tr('Ficaste um espetáculo! ✨'), 'bom'); }
    bt.disabled = false;
  });
}
