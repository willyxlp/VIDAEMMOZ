// 8 nov 08:35 (dono, FILA 0et): «redesign every page on the app to be like [the candongueiro stop] … using claude design».
// Grupo 1 aprovado às 12:35 («Yes this is it. I like this.»): Loja, Banco, Vagas, Imóveis e Perfil.
// Regras da paragem: uma escolha por ecrã; cartões grandes 2 por linha com imagem; nome + uma linha + preço/›;
// explicações compridas escondidas em «Como funciona ›». Por agora só no site de teste (VEL_TESTE).
const ui2 = () => true;   // 9 nov 21:00 (dono): o redesenho vai ao ar para todos

// textos compridos (p.m soltos no ecrã) → um «Como funciona ›» fechado no fim
function ui2Como(body, titulo) {
  if (!ui2() || !body) return;
  const ps = [...body.querySelectorAll(':scope > p.m')]; if (!ps.length) return;
  const d = document.createElement('details'); d.className = 'ui2-como';
  d.innerHTML = `<summary>${icone('ajuda', 18)}<span>${esc(tr(titulo))}</span><b aria-hidden="true">›</b></summary>`;
  ps.forEach(p => d.appendChild(p)); body.appendChild(d);
}
const ui2Chips = (lista, atual, attr) => `<div class="ui2-chips">${lista.map(([k, n]) => `<button class="${k === atual ? 'on' : ''}" data-${attr}="${k}">${esc(tr(n))}</button>`).join('')}</div>`;

/* ---------- 🛒 Loja: passo 1, escolher a secção ---------- */
let lojaSecoes = true, lojaSala = null;
const UI2_SEC = {
  casa: ['img/lojas/casa.webp', 0], moda: ['img/lojas/loja_moda.webp', 0],
  veiculo: ['img/modelos/suv_luxo_r0.webp', 1], aviao: ['img/modelos/jato_privado_r0.webp', 1],
};
const UI2_SEC_SUB = { moda: 'Roupa, sapatos e joias', veiculo: 'Carros, motas e carrinhas', aviao: 'Jatos e helicópteros' };
const lojaOnline = p => Math.ceil(p * 115 / 10000) * 100 + 500;   // igual ao renderLoja (e ao servidor)
function ui2Desde(k) {
  const ps = k === 'casa' ? D.moveis.filter(m => m.preco > 0).map(m => lojaOnline(m.preco))
    : D.itens.filter(i => i.preco_ouro == null && (i.categoria || 'outros') === k).map(i => i.preco);
  return ps.length ? Math.min(...ps) : 0;
}
function ui2CurtoKz(v) { return v >= 1e6 ? (Math.round(v / 1e5) / 10).toLocaleString('pt-PT') + 'M Kz' : fmtKz(v); }
function linhaMovelLoja(m) {
  return `<div class="row">${miniaturaHTML('movel', m.id)}<div class="t"><b>${esc(m.nome)} ${m.preco >= 90000 ? '💎' : ''}</b><small>${esc(m.efeito)} · na loja ${fmtKz(m.preco)}</small></div><button class="btn sm" data-a="comprar_online" data-v="${m.id}">${fmtKz(lojaOnline(m.preco))}</button></div>`;
}
function ui2LojaSecoes(body) {
  const guardados = minhaMobilia.filter(m => m.x == null).length, lim = 60 + (J.armazem_extra || 0);
  const grande = k => {
    const [img, objeto] = UI2_SEC[k], d = ui2Desde(k);
    const sub = k === 'casa' ? tr('Móveis · {0}/{1} guardados').replace('{0}', guardados).replace('{1}', lim) : tr(UI2_SEC_SUB[k]);
    return `<button class="row dest-card" data-sec="${k}"><div class="dest-foto${objeto ? ' obj' : ''}"><span class="e">${CATS[k][0]}</span><img src="${img}" alt="" loading="lazy" draggable="false"></div>
      <div class="t"><b>${esc(tr(CATS[k][1]))}</b><small>${esc(sub)}</small></div><span class="dest-preco">${d ? `${esc(tr('desde'))} ${ui2CurtoKz(d)}` : ''} ›</span></button>`;
  };
  const pequeno = k => `<button class="ui2-mini" data-sec="${k}"><span class="e">${CATS[k][0]}</span><b>${esc(tr(CATS[k][1]))}</b></button>`;
  body.innerHTML = `<p class="ui2-q">${esc(tr('O que vais comprar? Escolhe a secção.'))}</p>
    <label class="ui2-busca">${icone('procurar', 18)}<input type="search" id="ui2Busca" placeholder="${esc(tr('Procurar na loja toda'))}" aria-label="${esc(tr('Procurar na loja toda'))}" autocomplete="off"></label>
    <div id="ui2Res"></div>
    <div id="ui2Secs"><div class="dest-grelha">${['casa', 'moda', 'veiculo', 'aviao'].map(grande).join('')}</div>
    <div class="ui2-tres">${['telemovel', 'animal', 'outros'].map(pequeno).join('')}</div></div>`;
  body.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => { lojaCat = b.dataset.sec; lojaSecoes = false; lojaSala = null; renderLoja(body); body.scrollTop = 0; });
  const inp = body.querySelector('#ui2Busca'), res = body.querySelector('#ui2Res'), secs = body.querySelector('#ui2Secs');
  inp.oninput = () => {
    const q = inp.value.trim().toLowerCase();
    secs.classList.toggle('hide', q.length >= 2);
    if (q.length < 2) { res.innerHTML = ''; return; }
    const bate = n => (n || '').toLowerCase().includes(q) || tr(n || '').toLowerCase().includes(q);
    const ms = D.moveis.filter(m => m.preco > 0 && bate(m.nome)).slice(0, 12);
    const is = D.itens.filter(i => i.preco_ouro == null && bate(i.nome)).slice(0, 24 - ms.length);
    res.innerHTML = ms.length + is.length ? `<div class="list">${ms.map(linhaMovelLoja).join('')}${is.map(i => linhaItem(i, !i.onde)).join('')}</div>` : `<div class="empty">${esc(tr('Nada com esse nome.'))}</div>`;
    ligarBotoes(res, () => renderLoja(body)); ligarVender(res, () => renderLoja(body));
  };
}
// passo 2: cabeçalho com «‹ Secções» e, na Casa, as divisões em pílulas
function ui2LojaTopo(k) {
  const salas = k === 'casa' ? ui2Chips([['', 'Tudo'], ...Object.entries(CAT_MOVEL).map(([s, [, n]]) => [s, n])], lojaSala || '', 'sala') : '';
  return `<div class="ui2-cab"><button class="ui2-volta" data-secoes>‹ ${esc(tr('Secções'))}</button><b>${esc(tr(CATS[k][1]))}</b></div>${salas}`;
}
function ui2LojaLigar(body) {
  if (!ui2()) return;
  body.querySelector('[data-secoes]')?.addEventListener('click', () => { lojaSecoes = true; renderLoja(body); });
  body.querySelectorAll('[data-sala]').forEach(b => b.onclick = () => { lojaSala = b.dataset.sala || null; renderLoja(body); });
  ui2Como(body, lojaCat === 'casa' ? 'Como funcionam a entrega e o armazém' : 'Como funciona');
}

/* ---------- 💼 Vagas ---------- */
let vagasFiltro = 'todas';
function ui2Vagas(body) {
  const atual = J.emprego ? emprego(J.emprego) : null;
  let lista = D.empregos.filter(e => e.id !== J.emprego);
  if (vagasFiltro === 'posso') lista = lista.filter(e => !requisitos(e).length);
  if (vagasFiltro === 'perto') lista = lista.filter(e => !e.bairro || e.bairro === J.bairro);
  if (vagasFiltro === 'paga') lista = [...lista].sort((a, z) => z.salario - a.salario);
  const cartao = e => {
    const f = requisitos(e), onde = e.bairro ? bairro(e.bairro)?.nome || '' : tr('Qualquer bairro');
    return `<div class="row dest-card ui2-vaga${f.length ? ' lock' : ''}"><div class="dest-foto${e.bairro ? '' : ' obj'}">${e.bairro ? `<img src="img/bairros/${esc(e.bairro)}.webp" alt="" loading="lazy" draggable="false">` : ''}<span class="ui2-arte">${arteListaHTML('emprego', e.id, e.emoji)}</span></div>
      <div class="t"><b>${esc(tr(e.nome))}</b><span class="ui2-paga">${fmtKz(e.salario)}<small> / ${esc(tr('turno'))}</small></span><small>${f.length ? esc(tr('Precisas') + ': ' + f.join(', ')) : '📍 ' + esc(onde)}</small></div>
      <button class="btn sm" data-a="escolher_emprego" data-v="${e.id}" ${f.length ? 'disabled' : ''}>${esc(tr(f.length ? 'Ainda não' : 'Aceitar'))}</button></div>`;
  };
  body.innerHTML = (atual ? `<div class="list" style="margin-bottom:12px">${blocoEmprego(atual)}<div class="row" style="justify-content:flex-end"><button class="btn sm ghost" id="bDemitir">${esc(tr('Despedir-me'))}</button></div></div>` : '') +
    ui2Chips([['todas', 'Todas'], ['posso', 'Posso aceitar'], ['perto', 'Perto de ti'], ['paga', 'Pagam mais']], vagasFiltro, 'vf') +
    `<div class="dest-grelha">${lista.map(cartao).join('') || `<div class="empty">${esc(tr('Nenhuma vaga aqui.'))}</div>`}</div>
    <p class="m">${esc(tr('Aceita um emprego aqui e depois vai ao local de trabalho fazer turnos. O estudo e a reputação abrem empregos melhores.'))}</p>`;
  body.querySelectorAll('[data-vf]').forEach(b => b.onclick = () => { vagasFiltro = b.dataset.vf; ui2Vagas(body); ui2VagasLigar(body); });
}
function ui2VagasLigar(body) {
  ligarBotoes(body, () => abrirTelemovel('vagas'));
  body.querySelectorAll('[data-irtrab]').forEach(b => b.onclick = irTrabalhar);
  body.querySelector('#bDemitir')?.addEventListener('click', async () => { if (!await perguntar('Despedir-te deste emprego? Deixas de receber salário.')) return; if (await acao('demitir_me')) abrirTelemovel('vagas'); });
  ui2Como(body, 'Como funcionam os empregos e os turnos');
}

/* ---------- 🏦 Banco ---------- */
function ui2Banco(body, cr, irt, atraso, prazo) {
  const card = (op, ic, nome, sub, des) => `<button class="ui2-acao" data-b="${op}" ${des ? 'disabled' : ''}><span class="ui2-ic">${ic}</span><b>${esc(tr(nome))}</b><small>${sub}</small></button>`;
  const podePedir = cr ? fmtKz(Math.max(0, cr.limite - J.divida)) : '…';
  body.innerHTML = `<div class="ui2-saldo"><small>${esc(tr('Carteira'))}</small><b>${saldoKz()}</b>
      <div class="ui2-tres"><span><small>${esc(tr('Poupança'))}</small><b style="color:var(--green)">${fmtKz(J.poupanca)}</b></span><span><small>${esc(tr('Dívida'))}</small><b style="color:${J.divida ? 'var(--red)' : 'inherit'}">${fmtKz(J.divida)}</b></span><span><small>${esc(tr('IRT esta semana'))}</small><b>${irt ? irt.taxa : 0}%</b></span></div>
      ${J.divida ? `<small class="ui2-aviso${atraso ? ' mau' : ''}">${esc(atraso ? tr('📞 Em atraso! Os cobradores levam 30% da carteira por dia e, ao fim de 7 dias, penhoram um imóvel.') : tr('Prazo: {0} dias.').replace('{0}', prazo))}</small>` : ''}</div>
    <p class="ui2-q">${esc(tr('O que queres fazer?'))}</p>
    <div class="ui2-grid">
      ${card('depositar', '🐷', 'Pôr na poupança', esc(tr('Rende 0,5% por dia, até 1.000.000 Kz')))}
      ${card('levantar', '🏧', 'Levantar', esc(tr('Volta para a carteira')))}
      ${J.divida ? card('pagar', '💳', 'Pagar dívida', fmtKz(J.divida)) : ''}
      ${card('emprestar', '🏦', 'Pedir empréstimo', esc(tr('Até {0}').replace('{0}', podePedir)) + (J.bairro !== 'mutamba' ? ' · ' + esc(tr('só ao balcão, na Baixa')) : ''), J.bairro !== 'mutamba')}
      ${cr ? `<div class="ui2-acao"><span class="ui2-ic">📊</span><b>${esc(tr('Património'))}</b><small>${fmtKz(cr.patrimonio)}</small></div>` : ''}
    </div>
    <p class="m">💡 ${esc(tr('Podes pedir até {0}. O limite sobe com a reputação, o estudo, o salário e os imóveis que tens. Comissão de 5% e 7 dias para pagar.').replace('{0}', podePedir))}</p>
    <p class="m">🧾 ${esc(tr('IRT: o salário paga imposto por escalões da semana (segunda a domingo): até 70.000 Kz não paga, depois 10%, 17% acima de 300.000 e 25% acima de 1.500.000. Retido em cada turno.'))}${irt ? ' ' + esc(tr('Salário da semana: {0}.').replace('{0}', fmtKz(irt.bruto))) : ''}</p>`;
  const NOMES = { depositar: 'Pôr na poupança', levantar: 'Levantar', pagar: 'Pagar dívida', emprestar: 'Pedir empréstimo' };
  body.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
    const op = b.dataset.b;
    pedirValor(esc(tr(NOMES[op])), esc(tr('Quanto? (mínimo 100 Kz)')), op === 'pagar' ? J.divida : '', async v => {
      if (!v || v < 100) return toast('Escreve um valor (mínimo 100 Kz).', 'mau');
      if (op === 'emprestar') return confirmar(`Pedir ${fmtKz(v)} emprestado?`, `Vais dever ${fmtKz(Math.ceil(v * 1.05))} e a dívida cresce 1,5% por dia. Tens 7 dias. Se não pagares, vêm os cobradores — e depois a penhora.`, 'Pedir empréstimo',
        async () => { if (await acao('banco', { p_acao: op, p_valor: v })) { fecharSheets(); abrirTelemovel('banco'); } });
      if (await acao('banco', { p_acao: op, p_valor: v })) { fecharSheets(); abrirTelemovel('banco'); }
    });
  });
  ui2Como(body, 'Como funcionam os impostos e os empréstimos');
}

/* ---------- 🏘️ Imóveis (sem casas ainda) ---------- */
function ui2ImoveisVazio(body) {
  const sitios = ['talatona', 'kilamba', 'maianga', 'viana', 'cazenga', 'ilha'].filter(id => id !== J.bairro && bairro(id) && provDe(id) === provDe(J.bairro)).slice(0, 4).map(bairro);
  body.innerHTML = `<div class="ui2-heroi"><img src="img/bairros/talatona.webp" alt="" draggable="false"><div><b>${esc(tr('Compra a tua primeira casa'))}</b>
      <span>${esc(tr('Custa 60 dias de renda — e depois nunca mais pagas renda. As casas que não usas podes arrendar ou vender.'))}</span></div></div>
    ${sitios.length ? `<div class="ui2-cab"><b class="ui2-rot">${esc(tr('Onde procurar'))}</b><small>${esc(tr('Toca num sítio para ir lá'))}</small></div>${grelhaDestinos(sitios.map(cartaoCidade))}` : ''}
    <p class="m">${esc(tr('Vai a um prédio ou quintal e carrega em «Comprar».'))}</p>`;
  ui2Como(body, 'Como funcionam a compra e o arrendamento');
}

/* ---------- 👤 Perfil ---------- */
function ui2Corpo() {
  const [e, t] = humor();
  const tile = (nome, v, txt, bom) => { const ok = bom ? v >= 50 : v < 60; return `<div class="ui2-stat"><span><span>${esc(tr(nome))}</span><b>${txt}</b></span><i><u style="width:${Math.max(0, Math.min(100, v))}%;background:${ok ? 'var(--green)' : v >= 80 || (bom && v < 25) ? 'var(--red)' : 'var(--gold)'}"></u></i></div>`; };
  const dica = J.stress >= 80 ? 'Precisas de descansar: praia, ginásio, igreja ou uma festa.' : J.solidao >= 70 ? 'Sentes-te sozinho/a. Conversa com alguém ou entra num grupo.' : '';
  return `<div class="ui2-grid ui2-stats">${tile('Humor', J.felicidade ?? 50, `${e} ${esc(tr(t))}`, true)}${tile('Forma física', J.forma, Math.round(J.forma), true)}${tile('Stress', J.stress, Math.round(J.stress), false)}${tile('Solidão', J.solidao, Math.round(J.solidao), false)}</div>
    ${dica ? `<small class="ui2-dica">${esc(tr(dica))}</small>` : ''}
    ${meuLar() ? `<button class="btn full" id="bFesta" style="margin-top:10px">🎉 ${esc(tr('Dar uma festa em casa'))} · ${fmtKz(15000)}</button>` : ''}`;
}
function ui2Perfil(body) {
  if (!ui2()) return;
  body.querySelector('#pvEu')?.parentElement?.classList.add('ui2-topo');
  const lista = body.querySelector(':scope > .list'); if (!lista) return;
  const hoje = document.createElement('div'); hoje.className = 'ui2-grid ui2-hoje';
  [...lista.querySelectorAll(':scope > .row')].filter(r => r.querySelector('#bFamilia, #bPais, [data-a=trabalhar], [data-irtrab]')).forEach(r => hoje.appendChild(r));
  const sec = t => { const d = document.createElement('div'); d.className = 'sec'; d.innerHTML = `<h4>${esc(tr(t))}</h4>`; return d; };
  if (hoje.children.length) lista.before(sec('Hoje'), hoje);
  lista.before(sec('Definições'));
}

/* ================= grupo 2 (dono 8 nov 12:47 «yes»): Social, Mensagens, Família, Muxima, Grupos ================= */
const _ui2Retratos = new Map();
function ui2Retrato(j) {
  const ap = typeof apVisivel === 'function' ? apVisivel(j.aparencia || {}, j.idade ?? idadeDe(j)) : (j.aparencia || {});
  const k = JSON.stringify(ap); if (_ui2Retratos.has(k)) return _ui2Retratos.get(k);
  const W = 120, H = 120, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  try { desenhaPessoa(cv.getContext('2d'), W / 2, H + 45, ap, 0.3, false, 1, false, 2.4); } catch (e) { /* sem desenho */ }
  const u = cv.toDataURL(); _ui2Retratos.set(k, u); return u;
}
async function ui2Perfis(ids) {
  ids = [...new Set(ids)].filter(Boolean); if (!ids.length) return {};
  const { data } = await sb.from('jogadores').select('id,nome,aparencia,visto_em,nascido_em,idade_base,bairro').in('id', ids.slice(0, 150));
  return Object.fromEntries((data || []).map(j => [j.id, j]));
}
const ui2Online = j => !!(j?.visto_em && Date.now() - new Date(j.visto_em) < 300e3);
const ui2Av = j => `<span class="ui2-av">${j?.aparencia ? `<img src="${ui2Retrato(j)}" alt="" draggable="false">` : `<b>${esc((j?.nome || '?').slice(0, 1).toUpperCase())}</b>`}${ui2Online(j) ? `<i class="ui2-on" title="${esc(tr('online'))}"></i>` : ''}</span>`;

// 💞 Social: as tuas pessoas em cartões com cara; pílulas «As tuas pessoas · Online · Fofocas»
let socialFiltro = 'pessoas';
async function ui2Social(body, n) {
  if (!ui2()) return;
  const lista = body.querySelector('.list[data-ui2="p"]');
  const chips = document.createElement('div');
  chips.innerHTML = ui2Chips([['pessoas', tr('As tuas pessoas') + ' · ' + n], ['online', 'Online'], ['fofocas', 'Fofocas']], socialFiltro, 'sf');
  const ancora = body.querySelector('.sub2[data-ui2="p"]'); ancora?.before(chips.firstChild);
  body.dataset.f = socialFiltro;
  body.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { socialFiltro = b.dataset.sf; body.dataset.f = socialFiltro; body.querySelectorAll('[data-sf]').forEach(x => x.classList.toggle('on', x === b)); });
  if (!lista) return;
  lista.classList.add('ui2-pessoas');
  const rows = [...lista.querySelectorAll('.row[data-o]')], ps = await ui2Perfis(rows.map(r => r.dataset.o));
  rows.forEach(r => {
    const j = ps[r.dataset.o]; if (!j) return;
    const e = r.querySelector(':scope > .e'); const tag = e?.textContent || '';
    e?.insertAdjacentHTML('beforebegin', ui2Av(j)); e?.classList.add('ui2-tag');
    r.classList.toggle('on', ui2Online(j));
    r.style.cursor = 'pointer';
    r.addEventListener('click', ev => { if (ev.target.closest('button')) return; if (typeof tocarPessoa === 'function') { fecharTelemovel(); tocarPessoa({ id: j.id, nome: j.nome }); } });
  });
}

// 💬 Mensagens: «Online agora» (amigos) e conversas com cara
async function ui2Conversas(c, l) {
  if (!ui2()) return;
  const rows = [...l.querySelectorAll('[data-cv]')];
  const ids = [...new Set([...rows.map(r => r.dataset.cv), ...(typeof amigos !== 'undefined' ? amigos : [])])];
  const ps = await ui2Perfis(ids);
  rows.forEach(r => { const j = ps[r.dataset.cv], e = r.querySelector(':scope > .e'); if (j && e) e.outerHTML = ui2Av(j); });
  const on = [...(typeof amigos !== 'undefined' ? amigos : [])].map(id => ps[id]).filter(ui2Online);
  if (on.length && c.isConnected) {
    const d = document.createElement('div'); d.className = 'ui2-onlines';
    d.innerHTML = `<div class="sub2">${esc(tr('Online agora'))}</div><div class="ui2-fila">${on.map(j => `<button data-cv2="${j.id}" data-nome="${esc(j.nome)}">${ui2Av(j)}<span data-sem-traducao>${esc(j.nome)}</span></button>`).join('')}</div>`;
    c.querySelector('#cvLista')?.before(d);
    d.querySelectorAll('[data-cv2]').forEach(b => b.onclick = () => abrirConversa(b.dataset.cv2, b.dataset.nome));
  }
}

// 👶 Família: o testamento fica num «›» fechado
function ui2Familia(body) {
  if (!ui2()) return;
  const sub = [...body.querySelectorAll('.sub2')].find(s => s.textContent.includes('📜')), rel = sub?.nextElementSibling;
  if (!sub || !rel) return;
  const d = document.createElement('details'); d.className = 'ui2-como';
  d.innerHTML = `<summary>${icone('documento', 18)}<span>${esc(tr('O teu testamento: quem fica com tudo'))}</span><b aria-hidden="true">›</b></summary>`;
  sub.before(d); sub.remove(); d.appendChild(rel); rel.style.margin = '0 12px 12px';
}

// 🤝 Grupos: primeiro o tipo, depois os grupos em cartões com foto; fundar abre uma janela
let grupoTipo = '';
function ui2Grupos(body, gs, fundou, formHTML, aoFundar) {
  const filtra = l => grupoTipo ? l.filter(g => g.tipo === grupoTipo) : l;
  const meus = filtra(gs.filter(g => g.eu)), outros = filtra(gs.filter(g => !g.eu));
  const cartao = g => linhaGrupo(g).replace(/^<div class="row([^"]*)">/, `<div class="row dest-card$1"><div class="dest-foto"><img src="img/bairros/${esc(g.bairro)}.webp" alt="" loading="lazy" draggable="false"></div>`);
  body.innerHTML = `<p class="ui2-q">${esc(tr('Menos stress, menos solidão, amigos novos. Escolhe um tipo de grupo.'))}</p>
    <div class="ui2-tres ui2-tipos">${[['', '✨', 'Todos'], ['clube', '⚽', 'Futebol'], ['igreja', '⛪', 'Igrejas'], ['associacao', '🤝', 'Associações']].map(([k, e, n]) => `<button class="ui2-mini${grupoTipo === k ? ' on' : ''}" data-gt="${k}"><span class="e">${e}</span><b>${esc(tr(n))}</b></button>`).join('')}</div>
    ${meus.length ? `<div class="sub2">${esc(tr('Os teus grupos'))}</div><div class="dest-grelha">${meus.map(cartao).join('')}</div>` : ''}
    <div class="sub2">${esc(tr('Outros grupos'))}</div>${outros.length ? `<div class="dest-grelha">${outros.map(cartao).join('')}</div>` : `<div class="empty">${esc(tr('Nenhum grupo aqui.'))}</div>`}
    ${fundou ? '' : `<button class="row ui2-fundar" id="ui2Fundar"><span class="ui2-ic">＋</span><div class="t"><b>${esc(tr('Fundar o teu grupo'))}</b><small>${esc(tr('No bairro onde estás agora'))}</small></div><span class="dest-preco">${fmtKz(50000)}</span></button>`}
    <p class="m">${esc(tr('Igrejas, equipas e associações: participar tira stress e solidão, e ficas amigo/a de quem lá estiver. Para participar tens de estar no bairro do grupo.'))}</p>`;
  body.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { grupoTipo = b.dataset.gt; ui2Grupos(body, gs, fundou, formHTML, aoFundar); });
  body.querySelector('#ui2Fundar')?.addEventListener('click', () => { const el = sheet(`<h3>${esc(tr('Fundar um grupo'))} · ${fmtKz(50000)}</h3>${formHTML}`); el.querySelector('#fGrupo')?.addEventListener('submit', e => { e.preventDefault(); aoFundar(el); }); });
  ligarGrupos(body, () => abrirTelemovel('grupos'));
  ui2Como(body, 'Como funcionam os grupos');
}

// 📸 Muxima (e onde houver o compositor): fechado numa linha; abre ao tocar
document.addEventListener('focusin', e => { if (e.target?.id === 'mTxt' && e.target.closest('.ui2')) e.target.closest('.compor')?.classList.add('aberto'); });

/* ================= grupo 3 (dono 8 nov 14:03 «yes / do that»): Objetivos, Notícias, Jornal, Canal, Ricos, Tempo ================= */
// pílula no canto direito do topo da app («3 por recolher», «Tu: 7.º»…)
function ui2Pilula(body, txt) {
  const s = body?.parentElement?.querySelector(':scope > .topo > span:last-child'); if (!s) return;
  s.innerHTML = txt ? `<b class="ui2-pil">${esc(txt)}</b>` : '';
}
const ui2Badge = n => n ? `<i class="ui2-badge">${n}</i>` : '';

/* ---------- ⭐ Objetivos: primeiro escolher o quê (Diário · Hoje · Ambição · Conquistas) ---------- */
let objCasa = true;
function ui2Objetivos(body, contar) {
  const ks = ['diario', 'hoje', 'ambicao', 'conquistas'], tot = ks.reduce((s, k) => s + contar(k), 0);
  ui2Pilula(body, tot ? tr('{0} por recolher').replace('{0}', tot) : '');
  const h = obj.hoje, feitas = h.lista.filter(t => t.feito >= t.n).length;
  const a = (obj.ambicoes || []).find(x => x.id === obj.ambicao), marcos = obj.marcos || [];
  const cs = obj.conquistas || [], tem = cs.filter(c => c.tem).length;
  const prox = dia ? dia.proximo || 365 : 7, ant = dia ? [0, 7, 30, 100, 365].filter(m => m < prox).pop() || 0 : 0;
  const pct = dia ? Math.max(4, Math.min(100, (dia.dias - ant) / (prox - ant) * 100)) : 4;
  const card = (k, ic, nome, sub, extra) => `<button class="ui2-acao" data-objk="${k}">${ui2Badge(contar(k))}<span class="ui2-ic">${ic}</span><b>${esc(tr(nome))}</b><small>${sub}</small>${extra ? `<small class="ui2-ouro">${extra}</small>` : ''}</button>`;
  body.innerHTML = `${dia ? `<button class="ui2-seq" data-objk="diario"><span class="e">🔥</span><div><b>${dia.dias} ${esc(tr(dia.dias === 1 ? 'dia seguido' : 'dias seguidos'))}</b>
      <i><u style="width:${pct}%"></u></i><small>${esc(tr('Próximo prémio aos {0} dias').replace('{0}', prox))} · ${esc(tr('melhor'))}: ${dia.melhor}</small></div></button>` : ''}
    <p class="ui2-q">${esc(tr('O que queres ver?'))}</p>
    <div class="ui2-grid">
      ${card('diario', '🎁', 'Diário', esc(tr('Baú e roda')), dia && (dia.bau || dia.roda) ? esc(tr('Por abrir')) : '')}
      ${card('hoje', '⭐', 'Hoje', esc(tr('{0} de {1} tarefas').replace('{0}', feitas).replace('{1}', h.lista.length)), h.bonus ? '✓' : '+' + fmtKz(5000))}
      ${card('ambicao', a ? a.e : '✨', 'Ambição', a ? `${esc(a.nome)} · ${marcos.filter(m => m.feito).length} ${esc(tr('de'))} 4` : esc(tr('Escolhe a tua ambição')))}
      ${card('conquistas', '🏆', 'Conquistas', esc(tr('{0} de {1}').replace('{0}', tem).replace('{1}', cs.length)))}
    </div>
    <p class="m">${esc(tr('Todos os dias: abre o baú, roda a roda e faz as três tarefas do dia. A ambição é o teu grande objetivo de vida, com quatro marcos. As conquistas vêm sozinhas, à medida que jogas. Cada prémio recolhe-se aqui.'))}</p>`;
  body.querySelectorAll('[data-objk]').forEach(b => b.onclick = () => { objAba = b.dataset.objk; objCasa = false; desenharObjetivos(body); body.scrollTop = 0; });
  ui2Como(body, 'Como funciona');
}
// dentro de uma secção: as abas dão lugar a «‹ Objetivos»
function ui2ObjVoltar(body) {
  if (!ui2()) return;
  const ab = body.querySelector(':scope > .abas'); if (!ab) return;
  const nomes = { diario: 'Diário', hoje: 'Hoje', ambicao: 'Ambição', escolher: 'Ambição', conquistas: 'Conquistas' };
  const c = document.createElement('div'); c.className = 'ui2-cab';
  c.innerHTML = `<button class="ui2-volta">‹ ${esc(tr('Objetivos'))}</button><b>${esc(tr(nomes[objAba] || ''))}</b>`;
  c.querySelector('button').onclick = () => { objCasa = true; desenharObjetivos(body); };
  ab.replaceWith(c); ui2Pilula(body, '');
  ui2Como(body, 'Como funciona');
}

/* ---------- 🔔 Notícias: o que é novo primeiro, com filtros ---------- */
let notFiltro = 'tudo', notAntigas = false;
const NOT_CAT = [
  ['premios', /conquista|prémio|recolhe|objetivo|coroa|ouro|vip/i, '#ffcb00', '🏆'],
  ['casa', /casa|arrend|móve|armaz|renda|vivenda|apartamento|quarto|penthouse/i, '#ffcb00', '🏠'],
  ['pessoas', /amizade|amig|namor|casou|casar|bebé|filh|mensagem|elogi|presente|festa|seguir|segue/i, '#8fa8ff', '👥'],
  ['dinheiro', /kz|banco|salário|pag|dívida|kumbu|empréstimo|imposto/i, '#4cc38a', '💰']];
const notCats = ev => NOT_CAT.filter(([, re]) => re.test(ev.texto)).map(([k]) => k);
function ui2Noticias(body) {
  const lido = ls.get('vel_lido_' + uid) || '', novas = (eventos || []).filter(e => e.criado_em > lido).length;
  marcarLidas(); ui2Pilula(body, novas ? tr('{0} novas').replace('{0}', novas) : '');
  const lista = (eventos || []).filter(e => notFiltro === 'tudo' || notCats(e).includes(notFiltro));
  const idade = e => (Date.now() - new Date(e.criado_em)) / 1000;
  const agora = lista.filter(e => idade(e) < 3600), hoje = lista.filter(e => idade(e) >= 3600 && idade(e) < 86400), antigas = lista.filter(e => idade(e) >= 86400);
  const linha = (e, grande) => {
    const m = e.texto.match(/^(\p{Extended_Pictographic}️?)\s*/u), cat = NOT_CAT.find(([k]) => notCats(e)[0] === k);
    const ic = m ? m[1] : cat ? cat[3] : '🔔', txt = m ? e.texto.slice(m[0].length) : e.texto;
    const corte = txt.search(/[.!?](\s|$)/), tit = corte > 0 && corte < 90 ? txt.slice(0, corte + 1) : txt.slice(0, 90), resto = txt.slice(tit.length).trim();
    const rec = e.tipo === 'objetivo' || /Recolhe/.test(e.texto);
    return `<${rec ? 'button' : 'div'} class="ui2-nota${grande ? ' grande' : ''} ${e.tipo || ''}" ${rec ? 'data-nrec' : ''}><span class="ui2-ic" style="--c:${cat ? cat[2] : '#a8a2ad'}">${ic}</span>
      <span class="t"><b>${esc(tit)}</b><small>${resto ? esc(resto.length > 80 ? resto.slice(0, 78) + '…' : resto) + ' · ' : ''}${tempoRel(e.criado_em)}</small></span>${rec ? `<span class="dest-preco">${esc(tr('Recolher'))} ›</span>` : ''}</${rec ? 'button' : 'div'}>`;
  };
  const sec = (t, l, grande) => l.length ? `<div class="ui2-rot">${esc(tr(t))}</div>${grande ? l.map(e => linha(e, true)).join('') : `<div class="ui2-caixa">${l.map(e => linha(e)).join('')}</div>`}` : '';
  body.innerHTML = ui2Chips([['tudo', 'Tudo'], ['dinheiro', 'Dinheiro'], ['pessoas', 'Pessoas'], ['casa', 'Casa'], ['premios', 'Prémios']], notFiltro, 'nf')
    + (lista.length ? sec('Agora mesmo', agora, true) + sec('Hoje', hoje) + (antigas.length ? notAntigas ? sec('Mais antigas', antigas) : `<button class="ui2-mais" id="ui2Antigas">${esc(tr('Ver mais antigas'))} <b aria-hidden="true">›</b></button>` : '')
      : `<div class="empty">${esc(tr(notFiltro === 'tudo' ? 'Nada ainda.' : 'Nada aqui por agora.'))}</div>`);
  body.querySelectorAll('[data-nf]').forEach(b => b.onclick = () => { notFiltro = b.dataset.nf; notAntigas = false; ui2Noticias(body); });
  body.querySelector('#ui2Antigas')?.addEventListener('click', () => { notAntigas = true; ui2Noticias(body); });
  body.querySelectorAll('[data-nrec]').forEach(b => b.onclick = () => { window._objDireto = false; abrirTelemovel('objetivos'); });
}

/* ---------- 📰 Jornal: a manchete e quatro secções ---------- */
let jornalSec = null;
function ui2Jornal(body, noticias, coroas, virais) {
  const corpo = t => t.replace(/^\p{Extended_Pictographic}️?\s*/u, ''), emo = t => (t.match(/^\p{Extended_Pictographic}️?/u) || ['📰'])[0];
  const passadas = COROAS.map(([t, e, nome, fmt]) => { const c = (coroas?.coroas || []).find(x => x.tipo === t); return c && { t, e, nome, fmt, c }; }).filter(Boolean);
  const rico = passadas.find(p => p.t === 'rico'), capa = noticias[0];
  const dia = new Date().toLocaleDateString(typeof provLoc === 'function' ? provLoc() : 'pt-PT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Luanda' });
  ui2Pilula(body, dia);
  const voltar = t => `<div class="ui2-cab"><button class="ui2-volta" data-js="">‹ ${esc(tr('Jornal'))}</button><b>${esc(tr(t))}</b></div>`;
  const nota = n => `<div class="nota"><span>${emo(n.texto)}</span><div><b>${esc(corpo(n.texto))}</b><small>${esc(bairro(n.bairro)?.nome || 'Angola')} · há ${tempoRel(n.criado_em)}</small></div></div>`;
  let h;
  if (jornalSec === 'coroas') {
    h = voltar('Coroas') + (passadas.length ? `<div class="coroas">${passadas.map(({ t, e, nome, fmt, c }, i) => `<div class="coroa-c ${c.id === uid ? 'eu' : ''}">
        ${t === 'crew' || !c.aparencia ? `<div class="sem-av">${e}</div>` : `<canvas id="cor${i}" width="160" height="200"></canvas>`}
        <small class="tit">${e} ${nome}</small><b>${esc(c.nome)}</b><small>${fmt(c.valor)}</small></div>`).join('')}</div>` : `<div class="empty">${esc(tr('Ainda ninguém foi coroado/a. As coroas saem à segunda-feira.'))}</div>`)
      + `<p class="m">${esc(tr('Fecha domingo à meia-noite. Quem ganhar leva a coroa e +5 de reputação.'))}</p>`;
  } else if (jornalSec === 'semana') {
    const agora = COROAS.map(([t, e, nome]) => { const l = (coroas?.agora || {})[t] || []; return l.length ? `<div class="nota"><span>${e}</span><div><b>${nome}</b><small>${l.map((p, i) => `${i + 1}. ${esc(p.nome)} — ${t === 'rico' ? fmtKz(p.valor) : fmtN(p.valor)}`).join(' · ')}</small></div></div>` : ''; }).join('');
    h = voltar('Esta semana') + (agora || `<div class="empty">${esc(tr('Ainda ninguém pontuou esta semana.'))}</div>`) + `<p class="m">${esc(tr('Fecha domingo à meia-noite. Quem ganhar leva a coroa e +5 de reputação.'))}</p>`;
  } else if (jornalSec === 'fofocas') {
    h = voltar('Fofocas') + (virais.length ? `<div class="sub2">🔥 ${esc(tr('Viral no Muxima'))}</div>${virais.map(p => `<div class="row"><span class="e">${p.foto || '🔥'}</span><div class="t"><b>"${esc(p.texto.slice(0, 70))}"</b><small>${esc(p.nome)} · ${fmtN(gostosDe(p))} gostos</small></div></div>`).join('')}<div class="sub2">${esc(tr('Últimas'))}</div>` : '')
      + (noticias.length ? noticias.map(nota).join('') : `<div class="empty">${esc(tr('Dia calmo em Luanda. Nada a reportar.'))}</div>`);
  } else {
    const fof24 = noticias.filter(n => Date.now() - new Date(n.criado_em) < 864e5).length;
    const el = typeof PROV !== 'undefined' && PROV ? (PROV.eleicoes || [])[0] : null;
    const foto = capa?.bairro && bairro(capa.bairro) ? capa.bairro : 'mutamba';
    const manchete = rico ? [tr('{0} é o/a mais rico/a da semana').replace('{0}', rico.c.nome), fmtKz(rico.c.valor), 'coroas'] : capa ? [corpo(capa.texto), `${bairro(capa.bairro)?.nome || 'Angola'} · há ${tempoRel(capa.criado_em)}`, 'fofocas'] : null;
    const sec = (k, ic, cor, nome, sub, acao) => `<button class="row dest-card ui2-secj" data-js="${k}"><div class="dest-foto" style="--c:${cor}"><span class="e">${ic}</span></div><div class="t"><b>${esc(tr(nome))}</b><small>${esc(sub)}</small></div><span class="dest-preco">${esc(acao)} ›</span></button>`;
    h = (manchete ? `<button class="ui2-manchete" data-js="${manchete[2]}"><img src="img/bairros/${esc(foto)}.webp" alt="" draggable="false"><span><i>${esc(tr('MANCHETE'))}</i><b>${esc(manchete[0])}</b><small>${esc(manchete[1])}</small></span></button>` : `<div class="empty">${esc(tr('Dia calmo em Luanda. Nada a reportar.'))}</div>`)
      + `<p class="ui2-q">${esc(tr('Secções do jornal'))}</p><div class="dest-grelha">
        ${sec('coroas', '👑', '#ffcb00', 'Coroas', tr('Os campeões da semana'), passadas.length ? tr(passadas.length === 1 ? '{0} coroa' : '{0} coroas').replace('{0}', passadas.length) : tr('Ver'))}
        ${sec('semana', '📊', '#8fa8ff', 'Esta semana', tr('Quem vai à frente'), tr('Ver tabela'))}
        ${sec('fofocas', '💬', '#ff8fb1', 'Fofocas', tr('O que se diz no bairro'), fof24 ? tr('{0} novas').replace('{0}', fof24) : tr('Ler'))}
        ${sec('eleicoes', '🗳️', '#4cc38a', 'Eleições', el ? tr('Governador/a de {0}').replace('{0}', provNome(el.provincia)) : tr('Governo das províncias'), el ? tr('Fecha {0}').replace('{0}', new Date(el.fecha_em).toLocaleDateString(provLoc(), { weekday: 'long', timeZone: 'Africa/Luanda' })) : tr('Ver'))}
      </div>
      <p class="m">${esc(tr('Todas as semanas há sete coroas: o/a mais rico/a, o/a mais popular, o/a melhor cozinheiro/a, condutor/a, o/a mais trabalhador/a, o rei ou a rainha do Jet Ski e a melhor crew. Fecha domingo à meia-noite e quem ganhar leva a coroa e +5 de reputação.'))}</p>`;
  }
  body.innerHTML = h;
  body.querySelectorAll('[data-js]').forEach(b => b.onclick = () => {
    if (b.dataset.js === 'eleicoes') return abrirTelemovel('governo');
    jornalSec = b.dataset.js || null; ui2Jornal(body, noticias, coroas, virais); body.scrollTop = 0;
  });
  if (jornalSec === 'coroas') ligarCoroas(coroas);
  if (!jornalSec) ui2Como(body, 'Como se ganha uma coroa');
}

/* ---------- 📢 Canal: a última novidade em grande, as outras em cartões ---------- */
function ui2Canal(body) {
  ui2Pilula(body, tr('Equipa oficial'));
  const quando = p => new Date(p.publicar_em).toLocaleDateString(typeof lingua !== 'undefined' && lingua === 'en' ? 'en-GB' : typeof lingua !== 'undefined' && lingua === 'fr' ? 'fr-FR' : 'pt-PT', { day: 'numeric', month: 'short' });
  const tag = p => `<i class="ui2-tag">${esc(tr(p.patrocinado ? 'Patrocinado' : 'Novidade'))}</i>`;
  const st = p => canalTexto(p).proprio ? ' data-sem-traducao' : '';
  const curto = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
  const [p0, ...resto] = canalPosts, dois = resto.slice(0, 2), antes = resto.slice(2);
  body.innerHTML = `<p class="ui2-q">${esc(tr('Novidades, eventos e avisos da equipa.'))}</p>` + (p0 ? `
    <button class="ui2-post" data-cp="0"><img src="${esc(p0.imagem || 'img/bairros/mutamba.webp')}" alt="" loading="lazy" draggable="false"><span>
      <span class="ui2-quando">${tag(p0)}<small>${quando(p0)}</small></span><b${st(p0)}>${esc(canalTexto(p0).titulo)}</b><small${st(p0)}>${esc(curto(canalTexto(p0).texto, 120))}</small></span></button>
    ${dois.length ? `<div class="dest-grelha">${dois.map((p, i) => `<button class="row dest-card" data-cp="${i + 1}"><div class="dest-foto">${p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy" draggable="false">` : `<span class="e">${p.patrocinado ? '🤝' : '📢'}</span>`}</div>
      <div class="t"><b${st(p)}>${esc(curto(canalTexto(p).titulo, 50))}</b><small>${quando(p)}</small></div><span class="dest-preco">${esc(tr('Ler'))} ›</span></button>`).join('')}</div>` : ''}
    ${antes.length ? `<div class="ui2-rot">${esc(tr('Anteriores'))}</div><div class="ui2-caixa">${antes.map((p, i) => `<button class="ui2-nota" data-cp="${i + 3}"><span class="t"><b${st(p)}>${esc(curto(canalTexto(p).titulo, 60))}</b><small>${quando(p)}</small></span><span class="dest-preco">›</span></button>`).join('')}</div>` : ''}`
    : `<div class="empty">${esc(tr('Ainda não há publicações.'))}</div>`);
  const appNome = id => (APPS.find(a => a.id === id) || {}).n;
  body.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => {
    const p = canalPosts[+b.dataset.cp], c = canalTexto(p), s = st(p);
    const el = sheetTel(`${p.patrocinado ? `<small class="canalPat">${tr('Patrocinado')}${p.marca ? ` · <span data-sem-traducao>${esc(p.marca)}</span>` : ''}</small>` : ''}
      ${p.imagem ? `<img src="${esc(p.imagem)}" alt="" style="width:100%;border-radius:12px;display:block;margin-bottom:10px">` : ''}
      <h3${s} style="margin:0 0 6px">${esc(c.titulo)}</h3><p class="m"${s} style="white-space:pre-line;margin:0">${esc(c.texto)}</p>
      <small style="display:block;color:var(--dim);margin-top:8px">${quando(p)}</small>
      ${p.botao_app && appNome(p.botao_app) ? `<button class="btn full" data-canal-app="${esc(p.botao_app)}" style="margin-top:12px">${tr('Abrir')} ${esc(tr(appNome(p.botao_app)))}</button>` : ''}`);
    el.querySelector('[data-canal-app]')?.addEventListener('click', () => abrirTelemovel(p.botao_app));
  });
}

/* ---------- 🏆 Ricos: pódio, filtros e a tua posição sempre à vista ---------- */
let ricosFiltro = 'angola', ricosAmigos = null;
async function ui2Ranking(body, data) {
  if (ricosFiltro === 'amigos' && !ricosAmigos) {
    const { data: rel } = await sb.from('relacoes').select('a,b').or(`a.eq.${uid},b.eq.${uid}`);
    ricosAmigos = new Set([uid, ...(rel || []).map(r => r.a === uid ? r.b : r.a)]);
  }
  const lista = data.filter(p => ricosFiltro === 'bairro' ? p.bairro === J.bairro || p.id === uid : ricosFiltro === 'amigos' ? ricosAmigos.has(p.id) : true);
  const meu = data.findIndex(p => p.id === uid);
  ui2Pilula(body, meu >= 0 ? tr('Tu: {0}.º').replace('{0}', meu + 1) : '');
  const pod = lista.slice(0, 3), ordem = [1, 0, 2].filter(i => pod[i]);
  const av = (p, i) => `<span class="ui2-podav p${i + 1}">${p.aparencia ? `<img src="${ui2Retrato(p)}" alt="" draggable="false">` : `<b>${esc(p.nome.slice(0, 2).toUpperCase())}</b>`}</span>`;
  const eu = lista.findIndex(p => p.id === uid);
  const linha = (p, i) => `<div class="ui2-nota${p.id === uid ? ' eu' : ''}"><b class="ui2-pos">${i + 1}</b><span class="t"><b>${esc(p.nome)}</b><small>${esc(bairro(p.bairro)?.nome || '')}${p.imoveis ? ` · 🏘️ ${p.imoveis}` : ''}</small></span><b class="ui2-val">${ui2CurtoKz(p.patrimonio)}</b></div>`;
  body.innerHTML = ui2Chips([['angola', 'Angola'], ['bairro', 'O meu bairro'], ['amigos', 'Amigos']], ricosFiltro, 'rf')
    + (pod.length ? `<div class="ui2-podio">${ordem.map(i => { const p = pod[i]; return `<div class="ui2-pod p${i + 1}${p.id === uid ? ' eu' : ''}">${i === 0 ? '<span class="cor">👑</span>' : ''}${av(p, i)}<b>${esc(p.nome)}</b><small>${ui2CurtoKz(p.patrimonio)}</small><span class="degrau">${i + 1}</span></div>`; }).join('')}</div>` : `<div class="empty">${esc(tr('Ninguém aqui ainda.'))}</div>`)
    + (lista.length > 3 ? `<div class="ui2-caixa">${lista.slice(3).map((p, i) => p.id === uid ? '' : linha(p, i + 3)).join('')}</div>` : '')
    + (eu >= 0 ? `<div class="ui2-eu"><b class="ui2-pos">${eu + 1}</b><span class="t"><b>${esc(tr('Tu'))} · ${esc(J.nome)}</b><small>${eu === 0 ? esc(tr('És o/a mais rico/a daqui!')) : esc(tr('Faltam {0} para o {1}.º lugar').replace('{0}', ui2CurtoKz(Math.max(1, lista[eu - 1].patrimonio - lista[eu].patrimonio))).replace('{1}', eu))}</small></span><b class="ui2-val">${ui2CurtoKz(lista[eu].patrimonio)}</b></div>`
      : `<div class="ui2-eu"><span class="t"><b>${esc(tr('Tu'))} · ${esc(J.nome)}</b><small>${esc(tr('Ainda fora da lista dos 30 mais ricos. Trabalha, poupa e compra casas!'))}</small></span></div>`)
    + `<p class="m">${esc(tr('Património = carteira + poupança + imóveis − dívidas. A lista mostra os 30 mais ricos de Angola; «O meu bairro» e «Amigos» mostram quem deles mora onde tu moras ou é teu amigo/a.'))}</p>`;
  body.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { ricosFiltro = b.dataset.rf; ui2Ranking(body, data); });
  ui2Como(body, 'Como se conta o património');
}

/* ---------- ⛅ Tempo: aqui em grande com a foto do bairro; o resto de Angola em cartões ---------- */
const UI2_REG_FOTO = { luanda: 'mutamba', benguela: 'benguela', huambo: 'huambo', 'huíla': 'lubango', namibe: 'namibe', malanje: 'malanje', cabinda: 'cabinda' };
function ui2Tempo(body) {
  const r = climaHoje?.regioes || {}, aqui = tempoAqui(), minha = regiaoDe(J.bairro);
  const nomes = { luanda: 'Luanda', benguela: 'Benguela', huambo: 'Huambo', 'huíla': 'Lubango', namibe: 'Namibe', malanje: 'Malanje', cabinda: 'Cabinda' };
  const noite = escuridao() > 0.24, ver = t => t === 'sol' && noite ? ['🌙', 'Céu limpo'] : TEMPO[t] || ['…', ''];
  const chuva = k => { const j = janelaChuva(k); return j ? (r[k] === 'tempestade' ? tr('Tempestade das {0}h às {1}h') : tr('Chuva das {0}h às {1}h')).replace('{0}', j[0]).replace('{1}', j[1]) : ''; };
  const cor = t => t === 'sol' ? 'var(--gold)' : t === 'chuva' || t === 'tempestade' ? '#8fc4ff' : 'var(--muted)';
  ui2Pilula(body, `${String(Math.floor(horaLuanda())).padStart(2, '0')}:${String(Math.floor(horaLuanda() % 1 * 60)).padStart(2, '0')} · ${tr(noite ? 'noite' : 'dia')}`);
  const fotoAqui = bairro(J.bairro) && ['mutamba', 'maianga', 'talatona', 'kilamba', 'viana', 'cazenga', 'ilha', 'mussulo', 'camama', 'rangel', 'novavida', 'zango', 'benguela', 'huambo', 'lubango', 'namibe', 'malanje', 'cabinda'].includes(J.bairro) ? J.bairro : UI2_REG_FOTO[minha] || 'mutamba';
  body.innerHTML = `<div class="ui2-agora"><img src="img/bairros/${esc(fotoAqui)}.webp" alt="" draggable="false"><span>
      <small>${esc(tr('Aqui'))} · ${esc(bairro(J.bairro)?.nome || '')}</small><b><em>${aqui ? ver(aqui)[0] : '…'}</em>${esc(tr(aqui ? ver(aqui)[1] : ''))}</b><small>${esc(chuva(minha) || tr('Sem chuva hoje'))}</small></span></div>
    <p class="ui2-q">${esc(tr('No resto de Angola'))}</p>
    <div class="dest-grelha">${Object.entries(nomes).filter(([k]) => r[k] && k !== minha).map(([k, n]) => { const t = tempoEm(k);
      return `<div class="row dest-card ui2-reg"><div class="dest-foto"><img src="img/bairros/${UI2_REG_FOTO[k]}.webp" alt="" loading="lazy" draggable="false"><span class="ui2-tic">${ver(t)[0]}</span></div><div class="t"><b>${n}</b><small style="color:${cor(t)};font-weight:700">${esc(chuva(k) || tr(ver(t)[1]))}</small></div></div>`; }).join('')}</div>
    <p class="m">${esc(tr(climaHoje?.epoca === 'chuvas' ? '🌧️ Época das chuvas (outubro a abril): cuidado com as tempestades, as estradas e as inundações. Boa altura para as lavras.' : '🌫️ Cacimbo (maio a setembro): céu cinzento, noites frescas, quase sem chuva. Rega as lavras!'))}</p>`;
  ui2Como(body, 'Época das chuvas e lavras');
}

/* ================= grupo 4 (dono 8 nov 14:24 «yes»): Saúde, Justiça, Governo, Universidade, Empregados, Empresas ================= */
const ui2Card = (attr, foto, ic, cor, nome, sub, preco, extra = '') => `<button class="row dest-card ui2-c4" ${attr}${extra}><div class="dest-foto" style="--c:${cor}">${foto ? `<img src="${foto}" alt="" loading="lazy" draggable="false">` : `<span class="e">${ic}</span>`}</div>
  <div class="t"><b>${esc(nome)}</b><small>${esc(sub)}</small></div><span class="dest-preco">${preco}</span></button>`;
const ui2Voltar4 = (txt, titulo) => `<div class="ui2-cab"><button class="ui2-volta" data-ui2v>‹ ${esc(tr(txt))}</button><b>${esc(tr(titulo))}</b></div>`;

/* ---------- 🏥 Saúde: como estás, depois onde te tratar ---------- */
function ui2Saude(body) {
  const d = J.doenca ? DOENCAS[J.doenca] : null, s = Math.round(J.saude);
  const seguro = J.seguro_ate && new Date(J.seguro_ate) > new Date();
  const aqui = k => SAUDE_LUGARES[k].includes(J.bairro), onde = k => SAUDE_LUGARES[k].map(b => bairro(b)?.nome || b)[0];
  const preco = { farmacia: J.doenca === 'malaria' ? 6000 : 1500, centro: 0, clinica: seguro ? 0 : 25000, hospital: seguro ? 2000 : 12000, curandeiro: 2000 };
  const pode = { farmacia: aqui('farmacia') && J.doenca && J.doenca !== 'tifoide', farmacia_online: J.doenca && J.doenca !== 'tifoide', centro: aqui('centro') && (J.doenca || s < 80), clinica: aqui('clinica'), hospital: aqui('hospital') && (J.doenca || s < 80), curandeiro: aqui('curandeiro') && J.doenca };
  const pr = (k, v) => !pode[k] ? (SAUDE_LUGARES[k] && !aqui(k) ? esc(tr('Em {0}').replace('{0}', onde(k))) : '—') : v === 0 ? esc(tr('Grátis')) + ' ›' : fmtKz(v) + ' ›';
  const cor = s < 30 ? 'var(--red)' : s < 60 ? 'var(--gold)' : 'var(--green)';
  ui2Pilula(body, seguro ? tr('Seguro até {0}').replace('{0}', new Date(J.seguro_ate).toLocaleDateString(typeof provLoc === 'function' ? provLoc() : 'pt-PT', { weekday: 'short' })) : '');
  body.innerHTML = `<div class="ui2-estado"><span class="ui2-ic" style="--c:#ff8fa0">${d ? d[0] : '❤️'}</span><div><span class="ui2-l"><b>${esc(tr(d ? d[1] : 'Estás de boa saúde'))}</b><b style="color:${cor}">${s} / 100</b></span>
      <i><u style="width:${s}%;background:${cor}"></u></i><small>${esc(tr(d ? d[2] : 'Trabalha, come bem e dorme: a saúde aguenta-se sozinha.'))}</small></div></div>
    <p class="ui2-q">${esc(tr('Onde te queres tratar?'))}</p>
    <div class="dest-grelha">
      ${ui2Card(`data-tratar="farmacia" ${pode.farmacia ? '' : 'disabled'}`, '', '💊', '#4cc38a', tr('Farmácia'), tr(J.doenca === 'tifoide' ? 'A tifoide precisa de receita' : aqui('farmacia') ? 'Aqui perto' : 'Não há aqui'), pr('farmacia', preco.farmacia))}
      ${ui2Card(`data-tratar="clinica" ${pode.clinica ? '' : 'disabled'}`, '', '🩺', '#8fa8ff', tr('Clínica privada'), tr('Trata tudo · +35 saúde'), pr('clinica', preco.clinica))}
      ${ui2Card(`data-tratar="hospital" ${pode.hospital ? '' : 'disabled'}`, 'img/bairros/maianga.webp', '🚑', '#ff8fa0', tr('Hospital'), tr('Uma noite internado · saúde 80+'), pr('hospital', preco.hospital))}
      ${ui2Card(`data-tratar="centro" ${pode.centro ? '' : 'disabled'}`, '', '🏥', '#c9c3cc', tr('Centro de saúde'), tr('Grátis · fila longa'), pr('centro', 0))}
    </div>
    <div class="ui2-dois">
      <button class="ui2-peq" data-tratar="farmacia_online" ${pode.farmacia_online ? '' : 'disabled'}><span>🛵</span><b>${esc(tr('Com entrega'))}<small>${fmtKz(preco.farmacia + 2000)}</small></b></button>
      <button class="ui2-peq" data-tratar="curandeiro" ${pode.curandeiro ? '' : 'disabled'}><span>🌿</span><b>${esc(tr('Curandeiro'))}<small>${pode.curandeiro ? fmtKz(2000) : esc(tr('Em {0}').replace('{0}', onde('curandeiro')))}</small></b></button>
    </div>
    <button class="ui2-eu ui2-ouro-l" id="bSeguro"><span class="ui2-pos">🛡️</span><span class="t"><b>${esc(tr('Seguro de saúde · 7 dias'))}</b><small>${esc(tr('Clínica grátis, hospital a 2.000 Kz'))}${seguro ? ' · ' + esc(tr('renova por mais 7 dias')) : ''}</small></span><b class="ui2-val">${fmtKz(15000)} ›</b></button>
    <p class="m">${esc(tr(climaHoje?.epoca === 'chuvas' ? '🦟 Época das chuvas: muita malária. Casas melhores (conforto 3+) protegem.' : '🤧 Cacimbo: gripes. Manter a forma ajuda.'))} ${esc(tr('Casas muito fracas apanham febre tifoide.'))}</p>
    <p class="m">${esc(tr('Centro de saúde: grátis, mas a fila é longa e às vezes não há médico. O curandeiro dá chá de raízes: às vezes resulta… O seguro dura 7 dias.'))}</p>`;
  body.querySelectorAll('[data-tratar]').forEach(b => b.onclick = async () => { if (await acao('tratar', { p_onde: b.dataset.tratar })) abrirTelemovel('saude'); });
  body.querySelector('#bSeguro').onclick = async () => { if (await acao('comprar_seguro')) abrirTelemovel('saude'); };
  ui2Como(body, 'Doenças e época das chuvas');
}

/* ---------- ⚖️ Justiça: dois números e os crimes contra ti ---------- */
function ui2Justica(body) {
  const p = Math.round(J.procurado || 0), cad = J.cadastro || 0;
  ui2Pilula(body, cad ? tr('{0} condenações').replace('{0}', cad) : tr('Cadastro limpo'));
  const cor = p >= 50 ? 'var(--red)' : p > 0 ? 'var(--gold)' : 'var(--green)';
  const velho = c => Date.now() - new Date(c.criado_em) > 3 * 864e5;
  const novos = crimesContra.filter(c => !velho(c) || c.queixa), velhos = crimesContra.filter(c => velho(c) && !c.queixa);
  const linha = (c, grande) => { const t = TIPO_CRIME[c.tipo] || ['⚠️', c.tipo];
    return `<div class="ui2-nota${grande ? ' grande' : ''}"><span class="ui2-ic" style="--c:${c.queixa ? '#4cc38a' : '#ff8fa0'}">${t[0]}</span><span class="t"><b>${esc(tr(t[1]))}${c.valor ? ' · ' + fmtKz(c.valor) : ''}</b><small>${esc(bairro(c.bairro)?.nome || '')} · ${tempoRel(c.criado_em)}</small></span>
      ${c.queixa ? `<span class="dest-preco" style="color:var(--green)">${esc(tr('Queixa feita'))}</span>` : velho(c) ? `<small class="m">${esc(tr('Arquivado'))}</small>` : `<button class="btn sm" data-queixa="${c.id}">${esc(tr('Fazer queixa'))}</button>`}</div>`; };
  body.innerHTML = (J.detencao ? blocoDetencao() : preso() ? `<div class="ui2-estado mau"><span class="ui2-ic" style="--c:#ff8fa0">⛓️</span><div><b>${esc(tr('Na Cadeia de Viana'))}</b><small>${esc(tr('Faltam {0}. Na oficina sai-se mais cedo; a fiança é {1}.').replace('{0}', tempoFalta(J.preso_ate)).replace('{1}', fmtKz(Math.ceil((new Date(J.preso_ate) - Date.now()) / 3600e3) * 15000)))}</small></div></div>` : '')
    + `<div class="ui2-grid">
      <div class="ui2-stat"><span><span>🚨 ${esc(tr('Procurado/a'))}</span><b style="color:${cor}">${p}</b></span><i><u style="width:${p}%;background:${cor}"></u></i><small class="m">${esc(tr(p >= 50 ? 'Há um mandado contra ti' : p > 0 ? 'A polícia anda de olho em ti' : 'Ninguém te procura'))}</small></div>
      <div class="ui2-stat"><span><span>📁 ${esc(tr('Cadastro'))}</span><b style="color:${cad ? 'var(--red)' : 'var(--green)'}">${cad}</b></span><i></i><small class="m">${esc(tr(cad ? 'Condenações no registo' : 'Nenhuma condenação'))}</small></div></div>
    <div class="ui2-rot">${esc(tr('Crimes contra ti'))}</div>
    ${novos.length ? novos.map(c => linha(c, true)).join('') : velhos.length ? '' : `<div class="empty">${esc(tr('Nada. Que continue assim! 🙏'))}</div>`}
    ${velhos.length ? `<div class="ui2-caixa">${velhos.map(c => linha(c)).join('')}</div>` : ''}
    <div class="ui2-eu" style="margin-top:12px"><span class="ui2-pos">🛡️</span><span class="t"><small>${esc(tr('Guarda o dinheiro no banco: quem te assalta só leva o que trazes. E nunca pagues «taxas» pedidas por SMS.'))}</small></span></div>
    <p class="m">${esc(tr(p >= 50 ? 'Há um mandado contra ti: a polícia pode bater-te à porta a qualquer momento. Podes entregar-te na esquadra.' : 'O «calor» da polícia baixa com o tempo. Se fores apanhado/a: gasosa, advogado ou defensor oficioso. Na cadeia, a oficina encurta a pena.'))}</p>
    <p class="m">${esc(tr('Tens 3 dias para fazer queixa de um crime; depois é arquivado.'))}</p>`;
  body.querySelectorAll('[data-decidir]').forEach(b => b.onclick = async () => { b.disabled = true; const r = await acao('decidir_detencao', { p_escolha: b.dataset.decidir }); b.disabled = false; if (r) abrirTelemovel('justica'); });
  body.querySelectorAll('[data-queixa]').forEach(b => b.onclick = async () => { b.disabled = true; const r = await acao('queixar', { p_crime: +b.dataset.queixa }); if (r) renderJustica(body); else b.disabled = false; });
  ui2Como(body, 'Polícia, cadeia e fiança');
}

/* ---------- 🏛️ Governo: hoje onde moras, as eleições e duas portas ---------- */
let govSec = null;
function ui2Governo(body, m, e, hp) {
  if (!body.dataset.ui2Gov) { body.dataset.ui2Gov = '1'; govSec = window._provFoco ? 'prov' : null; }
  const tmp = document.createElement('div'); tmp.innerHTML = hp; const nProv = tmp.children.length;
  const filhos = [...body.children];
  ui2Pilula(body, m.nome);
  if (govSec) {
    filhos.forEach((el, i) => el.hidden = govSec === 'prov' ? i >= nProv : i < nProv);
    const c = document.createElement('div'); c.innerHTML = ui2Voltar4('Governo', govSec === 'prov' ? 'Governos provinciais' : 'O teu município');
    body.prepend(c.firstElementChild); body.querySelector('[data-ui2v]').onclick = () => { govSec = null; renderGoverno(body); };
    return;
  }
  filhos.forEach(el => el.hidden = true);
  const pe = (PROV?.eleicoes || []).find(x => x.provincia === PROV.vivo || x.provincia === PROV.nasci);
  const subiu = combustivel.hoje - combustivel.ontem, semAgua = m.sem_agua && J.agua_dia !== hoje();
  const tile = (ic, t, s, mau, extra = '') => `<div class="ui2-tile${mau ? ' mau' : ''}"><span>${ic}</span><b>${esc(tr(t))}</b><small>${s}</small>${extra}</div>`;
  const caras = l => `<span class="ui2-caras">${l.slice(0, 3).map(k => `<span>${k.aparencia ? `<img src="${ui2Retrato(k)}" alt="">` : esc((k.nome || '?').slice(0, 2).toUpperCase())}</span>`).join('')}${l.length > 3 ? `<span>+${l.length - 3}</span>` : ''}</span>`;
  let el = '';
  if (pe) { const pr = PROV.provincias.find(x => x.id === pe.provincia), n = (pe.candidatos || []).length + 1;
    el = `<button class="ui2-eleicao" data-gs="prov"><span class="ui2-foto"><img src="img/bairros/${esc(pe.provincia === 'luanda' ? 'mutamba' : (UI2_REG_FOTO[pe.provincia] || 'mutamba'))}.webp" alt=""><i class="ui2-tag">${esc(tr('Eleições'))}</i></span>
      <span class="t"><b>${esc(tr('Governador/a de {0}').replace('{0}', pr?.nome || pe.provincia))}</b><span class="ui2-l">${caras(pe.candidatos || [])}<small>${esc(tr('{0} candidatos').replace('{0}', n))} · ${esc(tr('fecha {0}').replace('{0}', fechaTxt(pe.fecha_em)))}</small><b class="ui2-val">${esc(tr(pe.votei ? 'Já votaste' : 'Votar'))} ›</b></span></span></button>`; }
  else if (e) el = `<button class="ui2-eleicao" data-gs="mun"><span class="ui2-foto"><img src="img/bairros/${esc(m.bairros?.[0] || 'mutamba')}.webp" alt=""><i class="ui2-tag">${esc(tr('Eleições'))}</i></span>
      <span class="t"><b>${esc(tr('Administrador/a de {0}').replace('{0}', m.nome))}</b><span class="ui2-l"><small>${esc(tr('fecha {0}').replace('{0}', new Date(e.fecha_em).toLocaleDateString(provLoc(), { weekday: 'long', timeZone: 'Africa/Luanda' })))}</small><b class="ui2-val">${esc(tr('Votar'))} ›</b></span></span></button>`;
  const casa = document.createElement('div'); casa.className = 'ui2-gov';
  casa.innerHTML = `<div class="ui2-rot" style="margin-top:0">${esc(tr('Hoje onde moras'))}</div>
    <div class="ui2-tres3">
      ${tile(m.sem_luz ? '🕯️' : '💡', m.sem_luz ? 'Sem luz' : 'Há luz', esc(tr(m.sem_luz ? (tem('gerador') ? 'O gerador aguenta' : 'Dorme-se mal') : 'Aproveita')), m.sem_luz)}
      ${tile(m.sem_agua ? '🚱' : '🚰', m.sem_agua ? 'Sem água' : 'Há água', semAgua ? '' : esc(tr(m.sem_agua ? 'Bidões cheios' : 'Corre a água')), m.sem_agua, semAgua ? `<button class="ui2-mini-b" id="bAgua2">${esc(tr('Bidões'))} ${fmtKz(2500)}</button>` : '')}
      ${tile('⛽', fmtKz(combustivel.hoje) + '/l', esc(subiu > 0 ? tr('Subiu {0}').replace('{0}', subiu) : subiu < 0 ? tr('Desceu {0}').replace('{0}', -subiu) : tr('Igual a ontem')))}
    </div>
    ${el}
    <div class="dest-grelha">
      ${ui2Card('data-gs="mun"', `img/bairros/${esc(m.bairros?.[0] || 'mutamba')}.webp`, '🏘️', '', tr('O teu município'), tr('Admin.: {0}').replace('{0}', m.admin_nome || '—'), esc(tr('Serviços')) + ' ›')}
      ${ui2Card('data-gs="prov"', '', '🏛️', '#ffcb00', tr('{0} províncias').replace('{0}', PROV?.provincias?.length || 7), tr('Quem governa e as medidas'), esc(tr('Ver')) + ' ›')}
    </div>
    <button class="row ui2-fundar" data-gs="${pe ? 'prov' : 'mun'}"><span class="ui2-ic">✋</span><div class="t"><b>${esc(tr('Candidatar-me'))}</b><small>${esc(tr('A governador/a ou a administrador/a'))}</small></div><span class="dest-preco">›</span></button>
    <p class="m">${esc(tr('Há eleições de 2 em 2 semanas. Para governador/a votas onde nasceste e onde vives; para administrador/a, no município onde moras. Quem ganha recebe salário, escolhe medidas e investe nos serviços: luz, água, estradas, saúde. Política 100% fictícia.'))}</p>`;
  body.prepend(casa);
  casa.querySelectorAll('[data-gs]').forEach(b => b.onclick = () => { govSec = b.dataset.gs; renderGoverno(body); body.scrollTop = 0; });
  casa.querySelector('#bAgua2')?.addEventListener('click', async () => { if (await acao('comprar_agua')) renderGoverno(body); });
  ui2Como(casa, 'Como funcionam as eleições');
}

/* ---------- 🎓 Universidade: o teu curso e um botão; depois as universidades ---------- */
let univSel = null;
function ui2Universidade(body) {
  ui2Pilula(body, tr('Estudo {0}/10').replace('{0}', J.estudo));
  if (univSel) {
    body.innerHTML = ui2Voltar4('Universidades', UNIVS[univSel].nome) + univHTML(univSel, true) + `<p class="m">📍 ${esc(bairro(UNIVS[univSel].bairro)?.nome || '')} · ${esc(tr('Lá pessoalmente pagas o preço normal (sem os +50%).'))}</p>`;
    body.querySelector('[data-ui2v]').onclick = () => { univSel = null; ui2Universidade(body); };
    ligarUniv(body, () => ui2Universidade(body)); return;
  }
  const custo = (id, online) => Math.round(5000 * (J.estudo + 1) * UNIVS[id].mult * (online ? 1.5 : 1));
  const minha = J.universidade && UNIVS[J.universidade] ? J.universidade : null;
  const FOTO = { uan: 'mutamba', isaf: 'maianga', uor: 'talatona', isptec: 'talatona' };
  body.innerHTML = `<div class="ui2-estado"><span class="ui2-ic" style="--c:#8fa8ff">🎓</span><div><b>${minha ? `${esc(CURSOS[J.curso] || '')} · ${esc(UNIVS[minha].nome)}` : esc(tr('Ainda não estudas'))}</b>
      <span class="ui2-passos">${Array.from({ length: 10 }, (_, i) => `<i class="${i < J.estudo ? 'on' : ''}"></i>`).join('')}</span><small>${esc(tr(J.estudo >= 10 ? 'Estudo completo!' : 'Cada módulo abre vagas melhores'))}</small></div></div>
    ${minha && J.estudo < 10 ? `<button class="btn full ui2-grande" data-estudar="${minha}" data-online="1">${esc(tr('Estudar o módulo {0} · à distância').replace('{0}', J.estudo + 1))}<span>${fmtKz(custo(minha, true))}</span></button>` : ''}
    <p class="ui2-q">${esc(tr(minha ? 'Ou escolhe outra universidade' : 'Escolhe a universidade'))}</p>
    <div class="dest-grelha">${Object.entries(UNIVS).map(([id, u]) => ui2Card(`data-univ-sel="${id}"`, `img/bairros/${FOTO[id] || 'mutamba'}.webp`, '🎓', '', u.nome.replace('Universidade ', ''), tr(u.txt.split('.')[0]), `${esc(tr('desde'))} ${fmtKz(custo(id, false))} ›`, id === minha ? ' data-minha' : '')).join('')}</div>
    <p class="m">${esc(tr('Estuda à distância em qualquer universidade (+50% nas propinas), ou vai lá pessoalmente e paga o preço normal. Mais estudo abre vagas melhores. Mudar de curso não apaga o teu nível de estudo.'))}</p>`;
  body.querySelectorAll('[data-univ-sel]').forEach(b => b.onclick = () => { univSel = b.dataset.univSel; ui2Universidade(body); body.scrollTop = 0; });
  ligarUniv(body, () => ui2Universidade(body));
  ui2Como(body, 'À distância ou lá pessoalmente?');
}

/* ---------- 🧹 Empregados: quanto pagas e quem queres ---------- */
function ui2Empregados(body, meus) {
  const total = Object.entries(EMPREGADOS).filter(([k]) => meus.has(k)).reduce((s, [, v]) => s + v[2], 0);
  const c = J.casa ? casaDe(J.casa) : null;
  ui2Pilula(body, meus.size ? tr('{0} em casa').replace('{0}', meus.size) : '');
  body.innerHTML = `<div class="ui2-estado">${c ? `<img src="img/bairros/${esc(c.bairro)}.webp" alt="">` : '<span class="ui2-ic">🏠</span>'}<div><small>${c ? esc(tr('A tua casa')) + ' · ' + esc(bairro(c.bairro)?.nome || '') : esc(tr('Sem casa'))}</small>
      <b style="font-size:18px">${c ? esc(tr('{0} por dia').replace('{0}', fmtKz(total))) : esc(tr('Primeiro precisas de uma casa'))}</b><small>${esc(tr(c ? 'Paga-se sozinho. Sem kumbu, vão-se embora.' : 'Arrenda ou compra em 📱 → Imóveis.'))}</small></div></div>
    <p class="ui2-q">${esc(tr('Quem queres contratar?'))}</p>
    <div class="ui2-grid">${Object.entries(EMPREGADOS).map(([k, [e, n, sal, txt]]) => meus.has(k)
      ? `<div class="ui2-acao ui2-tenho"><span class="ui2-ic">${e}</span><i class="ui2-tag">${esc(tr('Em casa'))}</i><b>${esc(tr(n))}</b><small>${esc(tr(txt))}</small><span class="ui2-l"><b class="ui2-val" style="color:var(--green)">${fmtKz(sal)}/${esc(tr('dia'))}</b><button class="ui2-link" data-desp="${k}">${esc(tr('Despedir'))}</button></span></div>`
      : `<button class="ui2-acao" data-contr="${k}" ${J.casa ? '' : 'disabled'}><span class="ui2-ic">${e}</span><b>${esc(tr(n))}</b><small>${esc(tr(txt))}</small><small class="ui2-ouro">${fmtKz(sal)}/${esc(tr('dia'))} ›</small></button>`).join('')}</div>
    <p class="m">${esc(tr('O salário sai sozinho da tua carteira todos os dias. Se não tiveres kumbu, vão-se embora. Podes despedir quando quiseres.'))}</p>`;
  body.querySelectorAll('[data-contr]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('contratar_empregado', { p_tipo: b.dataset.contr })) renderEmpregados(body); else b.disabled = false; });
  body.querySelectorAll('[data-desp]').forEach(b => b.onclick = async () => { if (!await perguntar('Despedir?')) return; if (await acao('contratar_empregado', { p_tipo: b.dataset.desp, p_sim: false })) renderEmpregados(body); });
  ui2Como(body, 'Como funcionam os salários');
}

/* ---------- 🏢 Empresas: os teus negócios em cartões; gerir e abrir em ecrãs à parte ---------- */
let empSec = null;
function ui2Empresas(body, minhas, nOutras) {
  if (Date.now() - (ui2Empresas.t || 0) > 60000) empSec = null;   // volta ao princípio se a app foi aberta de novo
  ui2Empresas.t = Date.now();
  ui2Pilula(body, minhas.length ? tr(minhas.length === 1 ? '1 negócio' : '{0} negócios').replace('{0}', minhas.length) : '');
  const filhos = [...body.children], form = body.querySelector('#fEmp');
  const iForm = filhos.indexOf(form), iAbrir = filhos.findIndex((el, i) => i < iForm && el.classList.contains('sub2') && filhos.slice(i + 1, iForm).every(x => !x.classList.contains('sub2')));
  const iLista = filhos.findIndex((el, i) => i > iForm && el.classList.contains('sub2'));
  const rels = filhos.filter(el => el.matches('.rel[data-e]'));
  const intro = filhos.filter(el => el.matches('p.m, .dicas') && filhos.indexOf(el) < (iAbrir < 0 ? iForm : iAbrir) && !el.closest('.rel'));
  const voltar = titulo => { const c = document.createElement('div'); c.innerHTML = ui2Voltar4('Empresas', titulo); const b = c.firstElementChild; b.querySelector('[data-ui2v]').onclick = () => { empSec = null; abrirTelemovel('empresas'); }; return b; };
  if (empSec) {
    filhos.forEach(el => el.hidden = true);
    if (empSec === 'abrir') { filhos.slice(iAbrir < 0 ? iForm : iAbrir + 1, iForm + 1).forEach(el => el.hidden = false); body.prepend(voltar(filhos[iAbrir]?.textContent || 'Abrir um negócio')); }
    else { const r = body.querySelector(`.rel[data-e="${empSec}"]`); if (r) { r.hidden = false; body.prepend(voltar(minhas.find(x => String(x.id) === empSec)?.nome || '')); } else { empSec = null; return ui2Empresas(body, minhas, nOutras); } }
    body.scrollTop = 0; return;
  }
  // ecrã principal: cartões + «Abrir» + a lista de Luanda (que fica como está, com pesquisa)
  rels.forEach(el => el.hidden = true); filhos.slice(iAbrir < 0 ? iForm : iAbrir, iForm + 1).forEach(el => el.hidden = true);
  const T = id => TIPOS_EMP[id] || {};
  const casa = document.createElement('div');
  casa.innerHTML = `${minhas.length ? `<div class="ui2-rot" style="margin-top:0">${esc(tr('Os teus negócios'))}</div><div class="dest-grelha">${minhas.map(e => { const espera = new Date(e.licenca_ate) > new Date();
      return `<button class="row dest-card ui2-c4" data-emp="${e.id}"><div class="dest-foto"><img src="img/bairros/${esc(e.bairro)}.webp" alt="" loading="lazy" draggable="false">${typeof tycoonTem === 'function' && tycoonTem(e.tipo) ? `<span class="ui2-jogar" role="button" tabindex="0" data-tyemp="${e.id}">🎮 ${esc(tr('Jogar'))}</span>` : ''}<i class="ui2-selo${espera ? ' ouro' : ''}">${esc(espera ? tr('À espera da licença') : (TAM_EMP[e.tamanho] || TAM_EMP.quiosque).replace(/^\S+\s/, ''))}</i></div>
        <div class="t"><b>${T(e.tipo).e || ''} ${esc(e.nome)}</b><small>${e.ultimo_dia ? esc(tr('Último fecho: {0}').replace('{0}', fmtKz(e.ultimas_vendas || 0))) : esc(tr('Primeiras vendas às 18:00'))}</small></div>
        <span class="dest-preco" style="color:${e.caixa < 0 ? 'var(--red)' : ''}">${esc(tr('Caixa'))} ${ui2CurtoKz(e.caixa)} ›</span></button>`; }).join('')}</div>` : ''}
    <button class="row ui2-fundar" data-emp="abrir"><span class="ui2-ic">＋</span><div class="t"><b>${esc(tr('Abrir um negócio'))}</b><small>${esc(tr('Aqui em {0}').replace('{0}', bairro(J.bairro)?.nome || ''))} · ${esc(tr('{0} tipos').replace('{0}', Object.keys(TIPOS_EMP).length))}</small></div><span class="dest-preco">${esc(tr('desde'))} ${ui2CurtoKz(Math.min(...Object.values(TIPOS_EMP).map(t => t.custo || 1e12)))} ›</span></button>`;
  const ancora = filhos[iLista] || null;
  body.insertBefore(casa, ancora);
  casa.querySelectorAll('[data-emp]').forEach(b => b.onclick = () => { empSec = b.dataset.emp; ui2Empresas(body, minhas, nOutras); });
  casa.querySelectorAll('[data-tyemp]').forEach(x => x.onclick = ev => { ev.stopPropagation(); const e = minhas.find(m => String(m.id) === x.dataset.tyemp); if (e) abrirTycoon(e); });
  // o texto de cima vai para o «Como funciona» do fim
  if (intro.length) { const d = document.createElement('details'); d.className = 'ui2-como'; d.innerHTML = `<summary>${icone('ajuda', 18)}<span>${esc(tr('Como funcionam os negócios'))}</span><b aria-hidden="true">›</b></summary>`; intro.forEach(p => d.appendChild(p)); body.appendChild(d); }
}

/* ================= grupo 5 (dono 8 nov 17:51 «yes.»): Câmbio, Transferir, Ouro, Sorte, Lavras, Rádio, Ajuda ================= */
/* ---------- 💵 Câmbio: os teus dólares, depois onde trocar ---------- */
let cambioOnde = null, cambioUsd = 100;
function ui2Dolares(body, c) {
  const h = c.historico || [], ini = h[0]?.oficial, fim = h[h.length - 1]?.oficial, varia = ini ? ((fim / ini - 1) * 100) : 0;
  const naBaixa = J.bairro === 'mutamba', semKinguilas = ['kilamba', 'talatona'].includes(J.bairro);
  const W = 300, H = 64, vals = h.flatMap(x => [x.oficial, x.rua]), mn = Math.min(...vals), mx = Math.max(...vals);
  const pt = (v, i) => `${(i / Math.max(1, h.length - 1)) * W},${H - ((v - mn) / Math.max(1, mx - mn)) * (H - 8) - 4}`, linha = k => h.map((x, i) => pt(x[k], i)).join(' ');
  if (!cambioOnde) cambioOnde = naBaixa ? 'banco' : 'kinguila';
  ui2Pilula(body, `1 $ = ${fmtTaxa(c.banco_compra)} Kz`);
  const pode = cambioOnde === 'banco' ? naBaixa : !semKinguilas;
  const compra = cambioOnde === 'banco' ? c.banco_compra : c.kinguila_compra, venda = cambioOnde === 'banco' ? c.banco_venda : c.kinguila_venda;
  const card = (k, foto, nome, sub, taxa, selo, ok) => `<button class="row dest-card ui2-c4${cambioOnde === k ? ' ui2-sel' : ''}" data-co="${k}"><div class="dest-foto"><img src="img/bairros/${foto}.webp" alt="" loading="lazy" draggable="false">${selo ? `<i class="ui2-selo${k === 'banco' ? ' verde' : ''}">${esc(tr(selo))}</i>` : ''}</div>
    <div class="t"><b>${esc(tr(nome))}</b><small>${esc(sub)}</small></div><span class="dest-preco"${ok ? '' : ' style="color:var(--muted)"'}>1 $ = ${fmtTaxa(taxa)} ›</span></button>`;
  body.innerHTML = `<div class="ui2-estado ui2-usd"><div><small>${esc(tr('Os teus dólares'))}</small><span class="ui2-l"><b style="font-size:28px;color:var(--green)">${fmtUsd(J.dolares)}</b><small>≈ ${fmtKz(J.dolares * c.oficial)}</small></span>
      ${h.length > 1 ? `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:64px" aria-hidden="true"><polyline points="${linha('oficial')}" fill="none" stroke="#5aa7e0" stroke-width="2.5"/><polyline points="${linha('rua')}" fill="none" stroke="#f5b81c" stroke-width="2.5"/></svg>` : ''}
      <span class="ui2-l"><small><b style="color:#5aa7e0">━</b> ${esc(tr('Banco'))} · <b style="color:#f5b81c">━</b> ${esc(tr('Rua'))}</small><small style="color:${varia > 0 ? 'var(--red)' : 'var(--green)'}">${esc(tr('Dólar {0}% em {1} dias').replace('{0}', (varia >= 0 ? '+' : '') + varia.toFixed(1)).replace('{1}', h.length))}</small></span></div></div>
    <p class="ui2-q">${esc(tr('Onde queres trocar?'))}</p>
    <div class="dest-grelha">${card('banco', 'mutamba', 'Banco', naBaixa ? tr('Até {0} por dia').replace('{0}', fmtUsd(200)) : tr('Só ao balcão, na Baixa'), c.banco_compra, 'Melhor preço', naBaixa)}
      ${card('kinguila', 'cazenga', 'Kinguilas', semKinguilas ? tr('Não há aqui') : tr('Quanto quiseres, mais caro'), c.kinguila_compra, 'Na rua', !semKinguilas)}</div>
    <div class="ui2-troca"><span class="ui2-l"><b>${esc(tr(cambioOnde === 'banco' ? 'Banco' : 'Kinguilas'))}</b><small>${cambioOnde === 'banco' && naBaixa ? esc(tr('Hoje ainda: {0}').replace('{0}', fmtUsd(c.limite_banco))) : !pode ? esc(tr(cambioOnde === 'banco' ? 'Vai à Baixa para trocar no banco' : 'Não há kinguilas neste bairro')) : ''}</small></span>
      <span class="ui2-qts">${[50, 100, 200].map(v => `<button class="${cambioUsd === v ? 'on' : ''}" data-usd="${v}">$ ${v}</button>`).join('')}<button class="${[50, 100, 200].includes(cambioUsd) ? '' : 'on'}" data-usd="">${[50, 100, 200].includes(cambioUsd) ? esc(tr('Outro')) : '$ ' + cambioUsd}</button></span>
      <span class="ui2-dois" style="margin:0"><button class="btn" data-t="comprar" ${pode && !(cambioOnde === 'banco' && c.limite_banco <= 0) ? '' : 'disabled'}>${esc(tr('Comprar'))} · ${fmtKz(Math.round(cambioUsd * compra))}</button><button class="btn ghost" data-t="vender" ${pode ? '' : 'disabled'}>${esc(tr('Vender'))} · ${fmtKz(Math.round(cambioUsd * venda))}</button></span></div>
    <p class="m">${esc(tr('O kwanza vai perdendo valor: guardar em dólares protege-te. O banco tem o melhor câmbio, mas só vende 200 $ por dia e só ao balcão, na Baixa. As kinguilas vendem quanto quiseres, mais caro.'))}</p>`;
  body.querySelectorAll('[data-co]').forEach(b => b.onclick = () => { cambioOnde = b.dataset.co; ui2Dolares(body, c); });
  body.querySelectorAll('[data-usd]').forEach(b => b.onclick = () => {
    if (b.dataset.usd) { cambioUsd = +b.dataset.usd; return ui2Dolares(body, c); }
    pedirValor(esc(tr('Quantos dólares?')), '', cambioUsd, v => { if (v >= 1) { cambioUsd = Math.floor(v); fecharSheets(); ui2Dolares(body, c); } });
  });
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('trocar', { p_onde: cambioOnde, p_acao: b.dataset.t, p_usd: cambioUsd })) abrirTelemovel('dolares'); else b.disabled = false; });
  ui2Como(body, 'Porquê guardar em dólares?');
}

/* ---------- 💸 Transferir: para quem, quanto, e um botão que diz tudo ---------- */
let kumbuPara = '', kumbuVal = 5000;
async function ui2Kumbu(body, extra, nomes, recentes) {
  if (extra) kumbuPara = extra;
  ui2Pilula(body, tr('Tens {0}').replace('{0}', ui2CurtoKz(J.kumbu)));
  const desenhar = () => {
    const ok = kumbuPara.trim() && kumbuVal >= 1 && kumbuVal <= J.kumbu;
    body.querySelector('#ui2Env').textContent = kumbuPara.trim() ? tr('Enviar {0} a {1}').replace('{0}', fmtKz(kumbuVal || 0)).replace('{1}', kumbuPara.trim()) : tr('Escolhe para quem');
    body.querySelector('#ui2Env').disabled = !ok;
    body.querySelector('#ui2Fica').textContent = kumbuVal > J.kumbu ? tr('Não tens tanto kumbu') : tr('Ficas com {0}').replace('{0}', fmtKz(J.kumbu - (kumbuVal || 0)));
    body.querySelectorAll('[data-kn]').forEach(b => b.classList.toggle('on', b.dataset.kn.toLowerCase() === kumbuPara.trim().toLowerCase()));
    body.querySelectorAll('[data-kv]').forEach(b => b.classList.toggle('on', +b.dataset.kv === kumbuVal));
  };
  body.innerHTML = `<p class="ui2-q">${esc(tr('Para quem?'))}</p>
    ${nomes.length ? `<div class="ui2-fila ui2-kfila">${nomes.slice(0, 8).map(n => `<button type="button" data-kn="${esc(n)}"><span class="ui2-av"><b>${esc(n.slice(0, 2).toUpperCase())}</b></span><span data-sem-traducao>${esc(n)}</span></button>`).join('')}</div>` : ''}
    <label class="ui2-busca">${icone('procurar', 18)}<input id="ui2Para" maxlength="16" autocomplete="off" placeholder="${esc(tr('Nome do jogador'))}" aria-label="${esc(tr('Nome do jogador'))}" value="${esc(kumbuPara)}"></label>
    <p class="ui2-q" style="margin-top:14px">${esc(tr('Quanto?'))}</p>
    <label class="ui2-valor"><input id="ui2Val" type="number" min="1" step="1" inputmode="numeric" value="${kumbuVal}" aria-label="${esc(tr('Quanto?'))}"><span>Kz</span></label><small class="ui2-fica" id="ui2Fica"></small>
    <div class="ui2-qts">${[1000, 5000, 10000, 50000].map(v => `<button type="button" data-kv="${v}">${v.toLocaleString('pt-PT')}</button>`).join('')}</div>
    <button class="btn full ui2-grande" id="ui2Env" style="justify-content:center"></button>
    <small class="ui2-fica">${esc(tr('Chega na hora, sem taxas.'))}</small>`;
  const ip = body.querySelector('#ui2Para'), iv = body.querySelector('#ui2Val');
  ip.oninput = () => { kumbuPara = ip.value; desenhar(); };
  iv.oninput = () => { kumbuVal = parseInt(iv.value, 10) || 0; desenhar(); };
  body.querySelectorAll('[data-kn]').forEach(b => b.onclick = () => { kumbuPara = ip.value = b.dataset.kn; desenhar(); });
  body.querySelectorAll('[data-kv]').forEach(b => b.onclick = () => { kumbuVal = +b.dataset.kv; iv.value = kumbuVal; desenhar(); });
  body.querySelector('#ui2Env').onclick = async e => {
    const nome = kumbuPara.trim(); e.target.disabled = true;
    const r = await acao('enviar_kumbu', { p_nome: nome, p_valor: kumbuVal });
    if (r) { ls.set('vel_env_' + uid, [nome, ...recentes.filter(x => x.toLowerCase() !== nome.toLowerCase())].slice(0, 5)); kumbuPara = ''; renderKumbu(body); } else desenhar();
  };
  desenhar();
}

/* ---------- 🪙 Ouro: o saldo, «Comprar Ouro» e quatro portas (o código das compras não muda: é do chat do dinheiro) ---------- */
let ouroSec = null;
function ui2Ouro(body) {
  if (Date.now() - (ui2Ouro.t || 0) > 60000) ouroSec = null;
  ui2Ouro.t = Date.now();
  ui2Pilula(body, tr('{0} Ouro').replace('{0}', (J.ouro || 0).toLocaleString('pt-PT')));
  // partes do ecrã antigo, pela ordem dos títulos (.sec)
  // cada parte = um título (.sec) e o que vem a seguir; a chave sai do que lá está dentro (não do texto, que pode estar traduzido)
  const filhos = [...body.children], grupos = [[]];
  for (const el of filhos) { if (el.classList.contains('sec')) grupos.push([]); grupos[grupos.length - 1].push(el); }
  const MARCA = [['[data-comprar-ouro],[data-moeda],[data-comprar-kz],[data-ouro-kz],.pacotes', 'comprar'], ['[data-pagar]', 'pagar'], ['[data-protecao]', 'protecao'], ['[data-vantagem],[data-recarga]', 'vip'], ['[data-acab],[data-ouro]', 'extras']];
  const partes = {};
  grupos.forEach((g, i) => { const k = i === 0 ? 'topo' : (MARCA.find(([sel]) => g.some(el => el.matches(sel) || el.querySelector(sel))) || [, 'outro'])[1]; (partes[k] = partes[k] || []).push(...g); });
  const voltar = titulo => { const c = document.createElement('div'); c.innerHTML = ui2Voltar4('Ouro', titulo); c.querySelector('[data-ui2v]').onclick = () => { ouroSec = null; renderOuro(body); }; return c.firstElementChild; };
  filhos.forEach(el => el.hidden = true);
  if (ouroSec) {
    (partes[ouroSec] || []).forEach(el => el.hidden = false);
    const NOMES = { comprar: 'Comprar Ouro', vip: 'Passes', extras: 'Móveis, animais e carros', protecao: 'Proteção contra roubos' };
    body.prepend(voltar(NOMES[ouroSec] || '')); body.scrollTop = 0; return;
  }
  const precoMin = l => l.length ? Math.min(...l) : 0;
  const pVip = precoMin([...(typeof VANTAGENS !== 'undefined' ? VANTAGENS.map(v => +v[1]) : []), ...(typeof PASSES_DIA !== 'undefined' ? PASSES_DIA.map(v => +v[1]) : [])]);
  const pExt = precoMin([...D.itens.filter(i => i.preco_ouro != null).map(i => i.preco_ouro), ...D.moveis.filter(m => m.preco_ouro != null).map(m => m.preco_ouro)]);
  const casa = document.createElement('div');
  casa.innerHTML = `<div class="ui2-estado ui2-ourocard"><span class="ui2-ic">🪙</span><div><b style="font-size:24px;color:var(--gold)">${esc(tr('{0} Ouro').replace('{0}', (J.ouro || 0).toLocaleString('pt-PT')))}</b><small>${esc(tr('É teu para sempre, mesmo se a personagem morrer'))}</small></div></div>
    <button class="btn full ui2-grande" data-os="comprar">${esc(tr('Comprar Ouro'))}<span>${esc(tr('Ver pacotes'))} ›</span></button>
    <p class="ui2-q">${esc(tr('O que queres com o teu Ouro?'))}</p>
    <div class="dest-grelha">
      ${ui2Card('data-os="vip"', '', '💎', '#ffcb00', tr('Passes'), tr('Proteção, salário +10% e mais'), pVip ? `${esc(tr('desde'))} ${pVip} ›` : '›')}
      ${ui2Card('data-os="casas"', 'img/bairros/ilha.webp', '🏙️', '', tr('Casas VIP'), tr('Penthouse e Mussulo'), `${esc(tr('desde'))} 5.000 ›`)}
      ${ui2Card('data-os="extras"', '', '🦜', '#8fa8ff', tr('Móveis, animais e carros'), tr('Piano, trono, papagaio…'), pExt ? `${esc(tr('desde'))} ${pExt} ›` : '›')}
      ${ui2Card('data-os="protecao"', '', '🛡️', '#4cc38a', tr('Proteção'), tr('Contra roubos'), esc(tr('Ver')) + ' ›')}
    </div>
    <div class="ui2-eu" id="ui2PagarOuro" style="cursor:pointer"><span class="t"><b>${esc(tr('Pagar compras com Ouro'))}</b><small>${esc(tr('1 Ouro = 100 Kz nas lojas'))}</small></span><span class="ui2-sw${pagarComOuro() ? ' on' : ''}" role="switch" aria-checked="${pagarComOuro()}"><i></i></span></div>`;
  body.prepend(casa);
  casa.querySelectorAll('[data-os]').forEach(b => b.onclick = () => {
    if (b.dataset.os === 'casas') { const el = sheet(`<h3>${esc(tr('Casas VIP'))}</h3><p class="m">${esc(tr('A Penthouse VIP fica na Torre VIP da Marginal, na Baixa. As vivendas VIP ficam no Mussulo. Vai lá e toca no prédio para comprar com Ouro.'))}</p><button class="btn full" data-ir-paragem>${esc(tr('Ir à paragem'))}</button>`); el.querySelector('[data-ir-paragem]').onclick = () => { fecharSheets(); irParaParagem(); }; return; }
    ouroSec = b.dataset.os; ui2Ouro(body);
  });
  casa.querySelector('#ui2PagarOuro').onclick = () => { try { localStorage.setItem('vel_pagar', pagarComOuro() ? 'kz' : 'ouro'); } catch { } renderOuro(body); };
  const intro = partes.topo?.[0]?.querySelector('p.m');
  if (intro) { const d = document.createElement('details'); d.className = 'ui2-como'; d.innerHTML = `<summary>${icone('ajuda', 18)}<span>${esc(tr('Como funciona o Ouro'))}</span><b aria-hidden="true">›</b></summary>`; d.appendChild(intro.cloneNode(true)); body.appendChild(d); }
}

/* ---------- 🎲 Sorte: a lotaria em grande, depois raspadinha e futebol ---------- */
let sorteSec = null;
function ui2Sorte(body, s) {
  const { jogos, proxima, ultima, meusBil, aberto, nomeJogo, dataCurta, aps } = s;
  ui2Pilula(body, tr('Sorteio às 20h'));
  const fechado = J?.comprou_kz ? `<div class="row lock sem-jogos"><span class="e">🚫</span><div class="t"><b>${tr('Os jogos a dinheiro estão fechados para ti')}</b><small>${tr('Compraste Kz (nesta conta ou noutra do mesmo aparelho). Quem compra Kz não pode jogar a dinheiro.')}</small></div></div>` : '';
  if (sorteSec === 'liga') {
    body.innerHTML = ui2Voltar4('Sorte', 'Liga de Luanda') + fechado + (jogos.filter(aberto).length ? `<div class="list">${jogos.filter(aberto).map(g => `<div class="rel" style="margin-top:0"><div class="lbl"><span>${esc(g.casa)} x ${esc(g.fora)}</span><span style="color:var(--dim);font-weight:600">${dataCurta(g.dia)} · ${g.hora.slice(0, 5)}</span></div>
      <div class="grelha" style="grid-template-columns:repeat(3,1fr)">${[['1', g.odd1, 'Casa'], ['X', g.oddx, 'Empate'], ['2', g.odd2, 'Fora']].map(([k, o, t]) => `<button data-ap="${g.id}:${k}:${o}" style="justify-content:center;flex-direction:column;gap:0"><b>${k}</b><small>${esc(tr(t))} · ${fmtTaxa(o)}</small></button>`).join('')}</div></div>`).join('')}</div>` : `<div class="empty">${esc(tr('Não há jogos abertos agora.'))}</div>`)
      + (jogos.some(g => g.golos_casa != null) ? `<div class="ui2-rot">${esc(tr('Resultados'))}</div><div class="ui2-caixa">${jogos.filter(g => g.golos_casa != null).map(g => `<div class="ui2-nota"><span class="t"><b>${esc(g.casa)} ${g.golos_casa}-${g.golos_fora} ${esc(g.fora)}</b><small>${dataCurta(g.dia)}</small></span></div>`).join('')}</div>` : '');
    body.querySelector('[data-ui2v]').onclick = () => { sorteSec = null; ui2Sorte(body, s); };
  } else {
    const hojeAbertos = jogos.filter(aberto).length;
    body.innerHTML = fechado + `<div class="ui2-lotaria"><span class="ui2-l"><i class="ui2-tag">${esc(tr('Lotaria de hoje'))}</i><small>${meusBil.length ? esc(tr('Os teus bilhetes')) + ': ' + meusBil.map(b => String(b.numero).padStart(3, '0')).join(' · ') : ''}</small></span>
        <small>${esc(tr('Pote'))}</small><b>${fmtKz(proxima?.pote ?? 1000000)}</b>
        <small>${esc(tr('Acerta os 3 números para levar o pote; os 2 últimos dão 10.000 Kz.'))}${ultima ? ' ' + esc(tr('Último número: {0}').replace('{0}', String(ultima.numero ?? '').padStart(3, '0'))) : ''}</small>
        <span class="ui2-l"><input class="inp" id="iNum" type="number" min="0" max="999" placeholder="${esc(tr('Nº ou vazio = sorte'))}" aria-label="${esc(tr('Número do bilhete'))}"><button class="btn" id="bBilhete">${esc(tr('Comprar bilhete'))} · ${fmtKz(1000)}</button></span></div>
      <p class="ui2-q">${esc(tr('Ou tenta outra coisa'))}</p>
      <div class="dest-grelha">
        ${ui2Card('id="bRaspa"', '', '🎟️', '#ffcb00', tr('Raspadinha'), tr('Vês na hora · até 100.000'), fmtKz(500) + ' ›')}
        ${ui2Card('data-ss="liga"', '', '⚽', '#4cc38a', tr('Liga de Luanda'), tr('Aposta 1 X 2'), esc(hojeAbertos ? tr('{0} jogos').replace('{0}', hojeAbertos) : tr('Resultados')) + ' ›')}
      </div>
      ${aps.length ? `<div class="ui2-rot">${esc(tr('As tuas apostas'))}</div><div class="ui2-caixa">${aps.slice(0, 6).map(a => `<div class="ui2-nota"><span class="t"><b>${esc(nomeJogo(a.jogo_id))} · ${esc(a.escolha)}</b><small>${fmtKz(a.valor)} @ ${fmtTaxa(a.odd)}</small></span><b class="ui2-val" style="color:${a.premio == null ? 'var(--muted)' : a.premio > 0 ? 'var(--green)' : 'var(--red)'}">${a.premio == null ? esc(tr('A decorrer')) : a.premio > 0 ? '+' + fmtKz(a.premio) : esc(tr('Perdeste'))}</b></div>`).join('')}</div>` : ''}
      <p class="m">${esc(tr('Raspadinha: 500 Kz, prémios até 100.000 Kz. Lotaria: bilhete de 1.000 Kz, sorteio todos os dias às 20h; se ninguém acertar, o pote acumula. Liga de Luanda: aposta no vencedor ou no empate; se acertares, recebes o valor vezes a odd. Joga só o que podes perder.'))}</p>`;
    body.querySelector('[data-ss]').onclick = () => { sorteSec = 'liga'; ui2Sorte(body, s); body.scrollTop = 0; };
    body.querySelector('#bRaspa').onclick = async () => { const r = await acao('raspadinha', {}, { silencio: true }); if (r) raspar(r.premio, r.msg); };
    body.querySelector('#bBilhete').onclick = async () => { const v = body.querySelector('#iNum').value; if (await acao('comprar_bilhete', { p_numero: v === '' ? null : parseInt(v, 10) })) abrirTelemovel('sorte'); };
    ui2Como(body, 'Regras e jogo responsável');
  }
  body.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => {
    const [id, esc_, odd] = b.dataset.ap.split(':'); const g = jogos.find(x => x.id === +id);
    pedirValor(`Apostar em ${esc_ === '1' ? esc(g.casa) : esc_ === '2' ? esc(g.fora) : 'empate'} · @ ${fmtTaxa(odd)}`, `${esc(g.casa)} x ${esc(g.fora)}, ${g.hora.slice(0, 5)}. Se acertares, recebes o valor × ${fmtTaxa(odd)}.`, 1000,
      async v => { if (await acao('apostar', { p_jogo: +id, p_escolha: esc_, p_valor: v })) abrirTelemovel('sorte'); });
  });
}

/* ---------- 🌱 Lavras: as tuas em cartões, plantar, armazém ---------- */
function ui2Lavras(body, data, noCampo, mult, chuvas, col) {
  ui2Pilula(body, tr(chuvas ? 'Época das chuvas' : 'Cacimbo'));
  const agora = Date.now(), sacos = Object.entries(CULTURAS).reduce((s, [k]) => s + (col[k] || 0), 0);
  const FOTO = b => ['huambo', 'malanje'].includes(b) ? b : 'huambo';
  body.innerHTML = `${data.length ? `<div class="ui2-rot" style="margin-top:0">${esc(tr('As tuas lavras'))}</div><div class="dest-grelha">${data.map(l => {
      const c = CULTURAS[l.cultura], pronta = new Date(l.pronta_em) <= agora, h = Math.max(0, Math.ceil((new Date(l.pronta_em) - agora) / 3600e3)), aqui = l.bairro === J.bairro;
      const pct = Math.max(4, Math.min(100, 100 - h / c.horas * 100));
      return `<div class="row dest-card ui2-lavra${pronta ? ' pronta' : ''}"><div class="dest-foto"><img src="img/bairros/${FOTO(l.bairro)}.webp" alt="" loading="lazy" draggable="false"><i class="ui2-selo${pronta ? ' verde' : ''}">${esc(pronta ? tr('Pronta') : tr('Faltam {0} h').replace('{0}', h))}</i></div>
        <div class="t"><b>${c.e} ${esc(tr(c.nome))} · ${esc(bairro(l.bairro)?.nome || '')}</b>${pronta ? `<small>${esc(tr('{0} sacos à tua espera').replace('{0}', c.sacos))}</small>` : `<i class="ui2-barra"><u style="width:${pct}%"></u></i>`}${l.regada ? `<small>💧 ${esc(tr('regada'))}</small>` : ''}</div>
        ${aqui && pronta ? `<button class="btn sm" data-colher="${l.id}">${esc(tr('Colher'))}</button>` : aqui && !l.regada ? `<button class="btn sm ghost" data-regar="${l.id}">💧 ${esc(tr('Regar'))}</button>` : !aqui ? `<small class="m">${esc(tr('Vai lá para {0}').replace('{0}', tr(pronta ? 'colher' : 'regar')))}</small>` : ''}</div>`; }).join('')}</div>` : `<div class="ui2-heroi"><img src="img/bairros/huambo.webp" alt="" draggable="false"><div><b>${esc(tr('Planta a tua primeira lavra'))}</b><span>${esc(tr('No Huambo ou em Malanje. Colhes um ou dois dias depois e vendes em Luanda por mais.'))}</span></div></div>`}
    ${noCampo ? `<p class="ui2-q">${esc(tr('Plantar aqui em {0}').replace('{0}', bairro(J.bairro).nome))}</p><div class="ui2-grid ui2-plantar">${Object.entries(CULTURAS).map(([k, c]) => `<button class="ui2-peq" data-plantar="${k}"><span>${c.e}</span><b>${esc(tr(c.nome))}<small>${c.horas} h · ${c.sacos} ${esc(tr('sacos'))}</small><small class="ui2-ouro">${fmtKz(c.semente)} ›</small></b></button>`).join('')}</div>`
      : `<button class="row ui2-fundar" id="ui2IrCampo"><span class="ui2-ic">🚂</span><div class="t"><b>${esc(tr('Ir plantar'))}</b><small>${esc(tr('Huambo ou Malanje · comboio desde Viana ou Benguela'))}</small></div><span class="dest-preco">›</span></button>`}
    ${sacos ? `<div class="ui2-rot">${esc(tr('Armazém'))} · ${esc(tr(mult === 1.7 ? 'preço de Luanda' : mult === 1 ? 'preço do campo' : 'preço da cidade'))}</div><div class="ui2-caixa">${Object.entries(CULTURAS).filter(([k]) => col[k] > 0).map(([k, c]) => `<div class="ui2-nota"><span class="ui2-ic">${c.e}</span><span class="t"><b>${col[k]} ${esc(tr('sacos'))} · ${esc(tr(c.nome))}</b><small>${fmtKz(Math.round(c.preco * mult))} ${esc(tr('por saco'))}</small></span><button class="btn sm" data-vender="${k}" data-n="${col[k]}">${fmtKz(Math.round(c.preco * mult * col[k]))}</button></div>`).join('')}</div>` : ''}
    <p class="m">${esc(tr(chuvas ? 'É a época das chuvas: as colheitas rendem mais.' : 'É o cacimbo: sem chuva, rega as lavras ou a colheita sai fraca.'))} ${esc(tr('Planta no campo (Huambo ou Malanje), colhe quando estiver pronto e vende. Em Luanda pagam mais (×1,7), na cidade ×1,3.'))}</p>`;
  const depois = () => abrirTelemovel('lavras');
  body.querySelectorAll('[data-plantar]').forEach(b => b.onclick = async () => { if (await acao('plantar', { p_cultura: b.dataset.plantar })) depois(); });
  body.querySelectorAll('[data-regar]').forEach(b => b.onclick = async () => { if (await acao('regar', { p_id: +b.dataset.regar })) depois(); });
  body.querySelectorAll('[data-colher]').forEach(b => b.onclick = async () => { if (await acao('colher', { p_id: +b.dataset.colher })) depois(); });
  body.querySelectorAll('[data-vender]').forEach(b => b.onclick = async () => { if (await acao('vender_colheita', { p_cultura: b.dataset.vender, p_sacos: +b.dataset.n })) depois(); });
  body.querySelector('#ui2IrCampo')?.addEventListener('click', () => { fecharSheets(); irParaParagem(); });
  ui2Como(body, 'Onde plantar e quando regar');
}

/* ---------- 📻 Rádio: o leitor em grande, as estações em botões ---------- */
function ui2Radio(body, lista) {
  const m = musicaAtual() || ESTACOES[0], aTocar = !!musicaAtual() && !leitor().paused;
  ui2Pilula(body, aTocar ? tr('AO VIVO') : '');
  body.innerHTML = `<div class="ui2-leitor"><span class="ui2-capa">${m.capa ? `<img src="${esc(m.capa)}" alt="">` : '🎵'}</span>
      <small>${esc(tr(aTocar ? 'A tocar agora' : 'Pronto a tocar'))}${m.gen ? ' · ' + esc(m.gen) : ''}</small><b ${m.gen ? '' : 'data-sem-traducao'}>${esc(m.gen ? tr(m.titulo) : m.titulo)}</b><small ${m.gen ? '' : 'data-sem-traducao'}>${esc(m.gen ? tr(m.artista) : m.artista)}</small>
      <span class="ui2-ctl">${aTocar && radio.lista.length > 1 ? `<button data-rm="next" aria-label="${esc(tr('Seguinte'))}">⏭</button>` : ''}<button class="pp" data-musica="${m.id}" data-lista="radio" aria-label="${esc(tr(aTocar ? 'Pausa' : 'Tocar'))}">${aTocar ? '⏸' : '▶️'}</button>${aTocar ? `<button data-rm="x" aria-label="${esc(tr('Parar'))}">⏹</button>` : ''}</span>
      <small>${esc(tr('Continua a tocar enquanto andas pela cidade'))}</small></div>
    <p class="ui2-q">${esc(tr('Estações'))}</p>
    <div class="ui2-tres3">${ESTACOES.map(e => `<button class="ui2-tile ui2-est${musicaAtual()?.id === e.id ? ' on' : ''}" data-musica="${e.id}" data-lista="radio"><b>${esc(e.gen[0].toUpperCase() + e.gen.slice(1))}</b><small>${esc(tr(e.titulo))}</small></button>`).join('')}</div>
    ${lista.length ? `<div class="ui2-rot">${esc(tr('Música dos artistas'))}</div><div class="list">${lista.map(x => linhaMusica(x, 'radio')).join('')}</div><p class="adPub">${esc(tr('Músicas promovidas pelos artistas'))}</p>` : ''}
    <a class="row ui2-fundar" href="mailto:${CONTACTO_MUSICA}?subject=${encodeURIComponent('Promover música no Vida na Banda')}"><span class="ui2-ic">🎤</span><div class="t"><b>${esc(tr('És artista?'))}</b><small>${esc(tr('Põe a tua música na rádio e nas discotecas'))}</small></div><span class="dest-preco">›</span></a>`;
  const atualizar = () => { if (telSub === 'radio' && body.isConnected) ui2Radio(body, musicasPara('radio')); };
  if (radio.audio) { radio.audio.onplay = atualizar; radio.audio.onpause = atualizar; }
  body.querySelectorAll('[data-musica], [data-rm]').forEach(b => b.addEventListener('click', () => setTimeout(atualizar, 150)));
}

/* ---------- ❓ Ajuda: o que fazer agora, procurar, quatro temas ---------- */
let ajudaTema = null;
const AJUDA_TEMAS = {
  dinheiro: ['💰', '#4cc38a', 'Ganhar dinheiro', 'Trabalho, estudo, negócios', ['Arranjar emprego', 'Ganhar dinheiro', 'Estudar', 'Abrir um negócio', 'Guardar dinheiro no banco', 'Enviar kumbu a alguém', 'Ganhar Ouro']],
  casa: ['🏠', '#ffcb00', 'Casa', 'Arrendar, comprar, decorar', ['Arrendar ou comprar casa', 'Decorar a casa', 'Comprar móveis', 'Contratar empregados', 'Convidar alguém para a tua casa', 'Voltar para casa']],
  amigos: ['💞', '#ff8fb1', 'Amigos e amor', 'Conversar, namorar, casar', ['Fazer amigos', 'Mensagens privadas', 'Visitar a casa de um amigo', 'Namorar', 'Casar', 'Ter um bebé ou adotar']],
  energia: ['⚡', '#ff8fa0', 'Energia e saúde', 'Comer, dormir, stress', ['Comer', 'Dormir e recuperar energia', 'Dormir fora (pensão ou hotel)', 'Ir à praia', 'Rezar ou ir ao culto', 'Viajar para outro bairro']],
};
function ui2AjudaAgora() {
  const g = t => indiceProcura().find(e => e.tipo === 'guia' && e.t === t);
  const lugar = q => procurarNoJogo(q).find(e => e.tipo === 'lugar' && e.bairro === J.bairro);
  const s = [];
  if ((J.fome ?? 100) < 30) s.push(['🍲', tr('Estás com fome (barriga {0})').replace('{0}', Math.round(J.fome)), tr('Come numa cantina antes que a barriga fique vazia.'), lugar('comer cantina') || g('Comer'), tr('Levar-me')]);
  if ((J.energia ?? 100) < 25) s.push(['😴', tr('Estás sem energia'), tr('Dorme em casa, ou numa pensão se estiveres longe.'), g('Dormir e recuperar energia'), tr('Como')]);
  if (J.doenca || (J.saude ?? 100) < 40) s.push(['🏥', tr('A tua saúde está fraca'), tr('Trata-te na farmácia, clínica ou hospital.'), { tipo: 'app', app: 'saude' }, tr('Abrir')]);
  if (!J.emprego && !J.empresa_id) s.push(['💼', tr('Ainda não tens trabalho'), tr('Escolhe um emprego em Vagas e depois vai lá fazer turnos.'), { tipo: 'app', app: 'vagas' }, tr('Ver vagas')]);
  if (!J.casa && !(typeof donoLar === 'function' && donoLar())) s.push(['🏠', tr('Ainda não tens casa'), tr('Arrenda uma casa barata: dormes melhor e podes decorar.'), { tipo: 'app', app: 'imoveis' }, tr('Ver casas')]);
  if ((J.stress ?? 0) >= 80) s.push(['😰', tr('Estás muito stressado/a'), tr('Vai à praia, ao ginásio, à igreja ou a uma festa.'), g('Ir à praia'), tr('Como')]);
  if (typeof premiosPorRecolher === 'function' && premiosPorRecolher()) s.push(['🎁', tr('Tens prémios por recolher'), tr('Abre os Objetivos e recolhe-os.'), { tipo: 'app', app: 'objetivos' }, tr('Recolher')]);
  if (J.emprego) s.push(['🛠️', tr('Faz o teu turno'), tr('Cada turno dá salário e reputação.'), { tipo: 'app', app: 'eu' }, tr('Ir')]);
  if (!s.length) s.push(['⭐', tr('Vê as tarefas de hoje'), tr('Três tarefas novas todos os dias, com prémio.'), { tipo: 'app', app: 'objetivos' }, tr('Abrir')]);
  return s.slice(0, 2);
}
// «Tudo o que se pode fazer» é a lista antiga (jogo.js); aqui só ganha o «‹ Ajuda»
function ui2AjudaVoltar(body) {
  const c = document.createElement('div'); c.innerHTML = ui2Voltar4('Ajuda', 'Tudo o que se pode fazer');
  c.querySelector('[data-ui2v]').onclick = () => abrirTelemovel('ajuda'); body.prepend(c.firstElementChild);
}
function ui2Ajuda(body) {
  if (ajudaTema === 'tudo') { ajudaTema = null; window._ajudaTudo = true; return abrirTelemovel('ajuda'); }
  if (ajudaTema) {
    const lista = AJUDA_TEMAS[ajudaTema][4].map(t => indiceProcura().find(e => e.tipo === 'guia' && e.t === t)).filter(Boolean);
    body.innerHTML = ui2Voltar4('Ajuda', AJUDA_TEMAS[ajudaTema][2]) + `<div class="list">${lista.map(linhaProcura).join('')}</div>`;
    body.querySelector('[data-ui2v]').onclick = () => { ajudaTema = null; ui2Ajuda(body); };
    body.querySelectorAll('[data-res]').forEach(b => b.onclick = () => abrirResultado(lista[+b.dataset.res]));
    return;
  }
  const agora = ui2AjudaAgora();
  body.innerHTML = `<div class="ui2-rot" style="margin-top:0">${esc(tr('O que fazer agora'))}</div>
    ${agora.map(([e, t, s], i) => `<button class="ui2-eu${i ? '' : ' ui2-ouro-l'} ui2-agora-${i}" data-ag="${i}" style="margin:0 0 10px"><span class="ui2-pos" style="font-size:22px;width:auto">${e}</span><span class="t"><b>${esc(t)}</b><small>${esc(s)}</small></span><b class="ui2-val">${esc(agora[i][4])} ›</b></button>`).join('')}
    <label class="ui2-busca" style="margin-top:6px">${icone('procurar', 18)}<input type="search" id="ui2AjBusca" placeholder="${esc(tr('Como faço para… (ex: casar, comprar casa)'))}" aria-label="${esc(tr('Procurar na ajuda'))}" autocomplete="off"></label>
    <div id="ui2AjRes"></div>
    <div id="ui2AjTemas" class="ui2-grid">${Object.entries(AJUDA_TEMAS).map(([k, [e, cor, n, sub]]) => `<button class="ui2-acao" data-tema="${k}"><span class="ui2-ic" style="background:color-mix(in srgb,${cor} 16%,transparent)">${e}</span><b>${esc(tr(n))}</b><small>${esc(tr(sub))}</small></button>`).join('')}</div>
    <button class="row ui2-fundar" data-tema="tudo"><span class="ui2-ic">📖</span><div class="t"><b>${esc(tr('Ainda perdido/a?'))}</b><small>${esc(tr('Vê tudo o que se pode fazer no jogo'))}</small></div><span class="dest-preco">›</span></button>`;
  body.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => abrirResultado(agora[+b.dataset.ag][3]));
  body.querySelectorAll('[data-tema]').forEach(b => b.onclick = () => { ajudaTema = b.dataset.tema; ui2Ajuda(body); body.scrollTop = 0; });
  const inp = body.querySelector('#ui2AjBusca'), res = body.querySelector('#ui2AjRes'), temas = body.querySelector('#ui2AjTemas');
  inp.oninput = () => {
    const q = inp.value.trim(); temas.classList.toggle('hide', q.length >= 2);
    if (q.length < 2) { res.innerHTML = ''; return; }
    const l = procurarNoJogo(q);
    res.innerHTML = l.length ? `<div class="list">${l.map(linhaProcura).join('')}</div>` : `<div class="empty">${esc(tr('Nada encontrado. Tenta outra palavra.'))}</div>`;
    res.querySelectorAll('[data-res]').forEach(b => b.onclick = () => abrirResultado(l[+b.dataset.res]));
  };
}

/* ================= grupo 6 (dono 8 nov 18:19 «yes»): sítios da cidade e tocar num jogador ================= */
// cada sítio: foto + nome + horário; depois «O que queres fazer?» com um cartão por parte (Comer e beber, Trabalho, Curtir…)
const UI2_LUGAR_IC = { 'Comer e beber': ['🍲', '#ffcb00'], 'Curtir': ['🎉', '#c08cff'], 'Trabalho': ['💼', '#4cc38a'], 'Biscato': ['🔧', '#4cc38a'], 'Treinar': ['💪', '#ff8fa0'], 'Correr': ['🏃', '#ff8fa0'],
  'Saúde': ['🏥', '#ff8fa0'], 'Lavras': ['🌱', '#4cc38a'], 'Balcão': ['🏦', '#8fa8ff'], 'Jogos de mesa': ['🎲', '#ff8fb1'], 'Esquemas': ['🕶️', '#a8a2ad'], 'Mora aqui': ['🏠', '#ffcb00'] };
let ui2LugarMem = { k: '', sec: null, t: 0 };
function ui2Lugar(el, o) {
  const s = o.spec || {};
  if (!el || (s.acao || []).some(a => a.t === 'paragem')) return;
  el.classList.add('ui2-lugar');
  const hr = horarioLugar(s), tt = el.querySelector('.heroiT');
  if (hr && tt) tt.insertAdjacentHTML('beforeend', `<i class="ui2-hora${hr.aberto ? '' : ' fechado'}">${esc(hr.aberto ? tr('Aberto até às {0}h').replace('{0}', hr.fecha) : tr('Abre às {0}h').replace('{0}', hr.abre))}</i>`);
  // o menu de comida em cartões, 2 por linha; o melhor para a fome fica marcado
  el.querySelectorAll('.list').forEach(l => {
    if (!l.querySelector('[data-a="comer"]')) return;
    l.classList.add('ui2-menu');
    if ((J.fome ?? 100) < 50) {
      let melhor = null, mv = 0;
      l.querySelectorAll('[data-a="comer"]').forEach(b => { const c = D.comidas.find(x => x.id === b.dataset.v); if (c && c.preco <= J.kumbu && c.fome > mv) { mv = c.fome; melhor = b.closest('.row'); } });
      if (melhor && mv >= 20) melhor.insertAdjacentHTML('afterbegin', `<i class="ui2-selo ouro">${esc(tr('Mata a fome'))}</i>`);
    }
  });
  // partes: cada .sec (filho direto) até à próxima
  const filhos = [...el.children], partes = [];
  filhos.forEach(n => { if (n.matches('.sec')) partes.push([n]); else if (partes.length && !n.matches('#vizinhos, #fechadoAgora')) partes[partes.length - 1].push(n); });
  if (partes.length < 2) return;
  const nome = el.querySelector('.heroiT h3')?.textContent || '';
  const titulo = p => (p[0].querySelector('h4')?.textContent || '').trim();
  const limpo = t => t.replace(/^\p{Extended_Pictographic}️?\s*/u, '');
  const cartao = (p, i) => {
    const t = limpo(titulo(p)), [ic, cor] = UI2_LUGAR_IC[t] || [(titulo(p).match(/^\p{Extended_Pictographic}️?/u) || ['✨'])[0], '#ffcb00'];
    const precos = p.flatMap(n => [...n.querySelectorAll('button.btn')].map(b => { const m = b.textContent.replace(/\./g, '').match(/(\d+)\s*Kz/); return m ? +m[1] : null; })).filter(x => x > 0);
    const linhas = p.reduce((a, n) => a + n.querySelectorAll('.row').length, 0);
    const sub = p[0].querySelector('span')?.textContent?.trim() || (linhas > 1 ? tr('{0} opções').replace('{0}', linhas) : (p[1]?.querySelector('.row .t small')?.textContent || '').slice(0, 40));
    return `<button class="ui2-acao" data-lsec="${i}"><span class="ui2-ic" style="--c:${cor}">${ic}</span><b>${esc(t)}</b><small>${esc(sub)}</small><small class="ui2-ouro">${precos.length ? `${esc(tr('desde'))} ${fmtKz(Math.min(...precos))} ›` : '›'}</small></button>`;
  };
  const casa = document.createElement('div'); casa.className = 'ui2-lcasa';
  casa.innerHTML = `<p class="ui2-q">${esc(tr('O que queres fazer?'))}</p><div class="ui2-grid">${partes.map(cartao).join('')}</div>`;
  partes[0][0].before(casa);
  const voltar = document.createElement('div'); voltar.className = 'ui2-cab'; voltar.hidden = true;
  voltar.innerHTML = `<button class="ui2-volta">‹ ${esc(nome)}</button>`;
  casa.after(voltar);
  const mostrar = sec => {
    ui2LugarMem = { k: nome, sec, t: Date.now() };
    casa.hidden = sec != null; voltar.hidden = sec == null;
    partes.forEach((p, i) => p.forEach(n => n.hidden = sec != null ? i !== sec : true));
  };
  casa.querySelectorAll('[data-lsec]').forEach(b => b.onclick = () => { mostrar(+b.dataset.lsec); el.scrollTop = 0; });
  voltar.querySelector('button').onclick = () => mostrar(null);
  // depois de comprar alguma coisa o sítio volta a abrir: fica na mesma parte
  mostrar(ui2LugarMem.k === nome && Date.now() - ui2LugarMem.t < 60000 && ui2LugarMem.sec != null && ui2LugarMem.sec < partes.length ? ui2LugarMem.sec : null);
}

// 👤 tocar num jogador: seis botões grandes; o resto num «Mais» fechado
function ui2Pessoa(el) {
  if (!ui2() || !el) return;
  const grelhas = [...el.querySelectorAll(':scope > .grelha')]; if (!grelhas.length) return;
  el.classList.add('ui2-pessoa');
  const pega = ac => el.querySelector(`.grelha [data-ac="${ac}"]`);
  const escolha = ['conversar', 'elogiar', 'presente', 'kumbu', 'sair', 'visitar', 'mensagem', 'namoriscar', 'encontro'].map(pega).filter(Boolean).slice(0, 6);
  if (escolha.length < 3) return;
  const g = document.createElement('div'); g.className = 'ui2-pgrid';
  escolha.forEach(b => g.appendChild(b));
  const rel = el.querySelector(':scope > .rel'); (rel || grelhas[0]).after(g);
  const d = document.createElement('details'); d.className = 'ui2-como ui2-mais-p';
  d.innerHTML = `<summary>${icone('ajuda', 18)}<span>${esc(tr('Mais: jogar, romance, família…'))}</span><b aria-hidden="true">›</b></summary>`;
  let n = g.nextElementSibling;
  while (n) { const prox = n.nextElementSibling; if (n.matches('.sub2, .grelha, button.row')) d.appendChild(n); n = prox; }
  [...d.querySelectorAll('.grelha')].forEach(x => { if (!x.children.length) { x.previousElementSibling?.matches('.sub2') && x.previousElementSibling.remove(); x.remove(); } });
  g.after(d);
}
