/* ============================================================
   Vida na Banda — POSSES
   Loja por categorias, stand automóvel, boutique, feira dos
   animais, vender, Estilo, animais e corridas de carrinha.
   ============================================================ */
const CATS = { casa: ['🛋️', 'Casa'], telemovel: ['📱', 'Telemóveis'], moda: ['👗', 'Moda'], veiculo: ['🚗', 'Veículos'], aviao: ['✈️', 'Aviões'], animal: ['🐶', 'Animais'], outros: ['🔌', 'Outros'] };
let lojaCat = 'casa';
const temCarro = () => ['carro', 'carrinha', 'citadino', 'sedan', 'pickup', 'jipe', 'suv_luxo', 'desportivo', 'superdesportivo', 'hipercarro', 'turbilhao'].some(temLar);   // 0cy: os da casa também (cônjuge com quem moras)
const tem4x4 = () => ['pickup', 'jipe', 'suv_luxo'].some(tem);
const temMota = () => ['scooter', 'mota', 'superbike'].some(temLar);
const estilo = () => (J.itens || []).reduce((s, i) => s + (D.itens.find(x => x.id === i)?.nivel || 0), 0);
const diamantes = n => n ? '💎'.repeat(Math.min(5, n)) : '';
function melhorTelemovel() { return tem('tel_ouro') ? 'ouro' : tem('tel_topo') ? 'topo' : tem('tel_android') ? 'android' : ''; }

// +10% de entrega, em contas inteiras (900.000 × 1,1 em vírgula flutuante dava 990.000,0000001 → arredondado para cima 990.001)
const comEntrega = p => Math.ceil(p * 11 / 10);
// 0aq: aviões e carros caros custam todos os dias (igual ao servidor: _custo_diario)
const custoDiario = i => i.categoria === 'aviao' ? Math.round(i.preco * 0.001) : i.categoria === 'veiculo' && i.preco >= 1e7 ? Math.round(i.preco * 0.0005) : 0;
// 7 nov 18:55 (dono, FILA 0el-6): tocar num carro → tu com o carro, em várias poses (js/stand3d.js). Primeiro no teste.
const CARROS_POSE = ['carrinha', 'carro', 'citadino', 'sedan', 'pickup', 'jipe', 'suv_luxo', 'desportivo', 'superdesportivo', 'hipercarro', 'turbilhao', 'candongueiro_ouro'];
const posarCom = i => !!window.VEL_TESTE && CARROS_POSE.includes(i.id) && typeof temWebGL === 'function' && temWebGL();
// 7 nov 19:35 (dono): abre num carro e deixa passar por todos os do Stand (‹ › / deslizar / a fita de carros em baixo)
async function abrirPosesCarro(id) {
  if (!D.itens.find(x => x.id === id)) return;
  try { await import('./stand3d.js'); } catch (e) { toast(tr('O 3D não carregou neste aparelho.'), 'mau'); return; }
  const lista = D.itens.filter(i => CARROS_POSE.includes(i.id) && (i.onde === 'stand' || tem(i.id))).sort((a, z) => a.preco - z.preco);
  const noStand = typeof cena !== 'undefined' && cena?.tipo === 'interior' && (cena.lugar?.spec?.acao || []).some(a => a.t === 'itens' && (a.cats || []).includes('veiculo'));
  const carros = lista.map(i => {
    const meu = tem(i.id), ac = typeof acabDe === 'function' ? acabDe(i.id) : {}, idv = meu && ac?.pintura ? `${i.id}__${ac.pintura}` : i.id;
    const bt = document.querySelector(`[data-a="comprar"][data-v="${i.id}"], [data-encomendar="${i.id}"]`);
    const direto = !bt && noStand && i.onde === 'stand';
    return { id: idv, item: i.id, nome: tr(i.nome), preco: meu ? '✓ ' + tr('É teu') : fmtKz(i.preco),
      comprar: meu || (!bt && !direto) ? null : (bt?.dataset.encomendar ? '🚚 ' : '') + tr('Comprar') + ' · ' + (bt ? bt.textContent.replace(/^🚚\s*/, '').trim() : fmtKz(i.preco)),
      podeComprar: bt ? !bt.disabled : direto ? J.kumbu >= i.preco : false,
      aoComprar: async () => { if (bt) return bt.click(); if (await perguntar(`${tr('Comprar')} ${tr(i.nome)} · ${fmtKz(i.preco)}?`)) await acao('comprar', { p_item: i.id }); } };
  });
  window.STAND3D.abrir(carros, minhaAparencia(), { i: Math.max(0, lista.findIndex(i => i.id === id)) });
}
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-posar]'); if (el) { e.preventDefault(); abrirPosesCarro(el.dataset.posar); } });
function linhaItem(i, podeComprar) {
  const meu = tem(i.id);
  const onde = tr(i.onde === 'stand' ? 'No Stand Automóvel (Talatona)' : i.onde === 'feira' ? 'Na Feira dos Animais (Viana)' : '');
  const pose = posarCom(i);
  return `<div class="row ${meu ? 'mine' : ''}">${pose ? `<button class="posar-mini" data-posar="${i.id}" aria-label="${esc(tr('Ver-me com este carro'))}">${miniaturaHTML('item', i.id)}<span>📸</span></button>` : miniaturaHTML('item', i.id)}<div class="t"${pose ? ` data-posar="${i.id}"` : ''}><b>${esc(tr(i.nome))} ${diamantes(i.nivel)}</b>${pose ? `<small class="posar-txt">📸 ${esc(tr('Ver-me com este carro'))}</small>` : ''}<small>${esc(tr(i.descricao))}${custoDiario(i) ? ' · <b class="custo-dia">' + esc(tr('Custa {0} por dia (piloto, seguro, manutenção)').replace('{0}', fmtKz(custoDiario(i)))) + '</b>' : ''}${!meu && !podeComprar && onde ? ' · ' + onde : ''}</small></div>
    ${meu ? `<button class="btn sm ghost" data-vender="${i.id}">Vender ${fmtKz(Math.round(i.preco / 2))}</button>` : podeComprar ? `<button class="btn sm" data-a="comprar" data-v="${i.id}" ${J.kumbu < i.preco ? 'disabled' : ''}>${fmtKz(i.preco)}</button>` : i.onde === 'stand' ? (encomendados.has(i.id) ? `<span class="price">🚚 A caminho</span>` : `<button class="btn sm ghost" data-encomendar="${i.id}" ${J.kumbu < comEntrega(i.preco) ? 'disabled' : ''}>🚚 ${fmtKz(comEntrega(i.preco))}</button>`) : `<span class="price">${fmtKz(i.preco)}</span>`}</div>`;
}
function ligarVender(el, depois) {
  el.querySelectorAll('[data-vender]').forEach(b => b.onclick = async () => {
    const i = D.itens.find(x => x.id === b.dataset.vender);
    const ac = J.acabamentos?.[i.id], perde = ac && Object.keys(ac).length ? ' ' + tr('Os acabamentos de Ouro deste carro perdem-se ({0}).').replace('{0}', resumoAcab(ac)) : '';
    if (!await perguntar(`Vender ${i.nome} por ${fmtKz(Math.round(i.preco / 2))} (metade do preço)?` + perde)) return;
    b.disabled = true; if (await acao('vender_item', { p_item: i.id })) depois && depois(); else b.disabled = false;
  });
}

// categorias de móveis (loja e armazém)
const CAT_MOVEL = { cozinha: ['🍳', 'Cozinha', ['fogao', 'frigorifico', 'microondas', 'bancada', 'maquina']], banho: ['🚿', 'Casa de banho', ['chuveiro', 'banheira', 'jacuzzi', 'sanita', 'lavatorio']],
  quarto: ['🛏️', 'Quarto', ['cama']], sala: ['🛋️', 'Sala', ['sofa', 'tv', 'som', 'mesa', 'cadeira', 'estante']], clima: ['💨', 'Clima e luz', ['ac', 'ventoinha', 'candeeiro']],
  deco: ['🖼️', 'Decoração', ['quadro', 'tapete', 'planta', 'palmeira', 'aquario']] };
const catMovel = tipo => Object.keys(CAT_MOVEL).find(k => CAT_MOVEL[k][2].includes(tipo)) || 'deco';
function gruposMoveis(lista, render) {
  return Object.entries(CAT_MOVEL).map(([k, [e, n]]) => { const ms = lista.filter(m => catMovel((m.tipo || movelDe(m.movel)?.tipo)) === k); return ms.length ? `<div class="sub2">${e} ${n}</div>` + render(ms) : ''; }).join('');
}
/* ---------- 🛒 app Loja ---------- */
let encomendados = new Set();
async function receberEncomendas() {
  const pr = typeof pre === 'function' ? pre('encomendas_rec') : null, pp = typeof pre === 'function' ? pre('encomendas_pend') : null;   // 9 nov: do arranque_tudo
  const { data } = pr ? { data: pr.v } : await sb.rpc('receber_encomendas'); if (data?.msg) { if (data.jogador) setJogador(data.jogador); toast(data.msg, 'bom', 6000); }
  const { data: pend } = pp ? { data: pp.v } : await sb.from('encomendas').select('item').eq('entregue', false); encomendados = new Set((pend || []).map(x => x.item));
}
function renderLoja(body) {
  if (!renderLoja.feito) { renderLoja.feito = true; receberEncomendas().then(() => { if (telSub === 'loja') renderLoja(body); }); }
  if (typeof ui2 === 'function' && ui2() && lojaSecoes) return ui2LojaSecoes(body);   // 8 nov: redesenho (teste) — primeiro a secção
  const tabs = Object.entries(CATS).map(([k, [e, n]]) => `<button class="${lojaCat === k ? 'on' : ''}" data-cat="${k}">${e}<br><small>${n}</small></button>`).join('');
  let h = `<div class="abas cats">${tabs}</div>` + ((typeof ui2 === 'function' && ui2()) ? ui2LojaTopo(lojaCat) : '');
  if (lojaCat === 'casa') {
    const online = p => Math.ceil(p * 115 / 10000) * 100 + 500;   // (contas inteiras, como o servidor)
    const guardados = minhaMobilia.filter(m => m.x == null).length, lim = 60 + (J.armazem_extra || 0), custoArm = 50000 * (1 + Math.floor((J.armazem_extra || 0) / 20));
    h += `<div class="row" style="margin-bottom:10px"><span class="e">📦</span><div class="t"><b>Armazém: ${guardados}/${lim} móveis</b><small>Precisas de mais espaço? +20 lugares.</small></div><button class="btn sm ghost" id="bArmazem">${fmtKz(custoArm)}</button></div>`;
    h += `<p class="m">Móveis entregues no teu armazém (+15% e 500 Kz de entrega). Mais baratos nos Móveis do Mercado (Viana) ou no Casa & Design (Talatona).</p>
      ${J.casa ? `<div class="row mine" style="margin-bottom:10px"><span class="e">🔨</span><div class="t"><b>Como pôr na casa</b><small>Vai a casa (🏠 Casa), carrega em 🔨 Decorar, escolhe o móvel e toca no chão.${guardados ? ` Tens ${guardados} no armazém.` : ''}</small></div></div>` : ''}
      ${gruposMoveis(D.moveis.filter(m => m.preco > 0 && (!(typeof ui2 === 'function' && ui2()) || !lojaSala || catMovel(m.tipo) === lojaSala)).sort((a, z) => a.preco - z.preco), ms => `<div class="list">${ms.map(m => `<div class="row">${miniaturaHTML('movel', m.id)}<div class="t"><b>${esc(m.nome)} ${m.preco >= 90000 ? '💎' : ''}</b><small>${esc(m.efeito)} · na loja ${fmtKz(m.preco)}</small></div><button class="btn sm" data-a="comprar_online" data-v="${m.id}">${fmtKz(online(m.preco))}</button></div>`).join('')}</div>`)}`;
  } else {
    const lista = D.itens.filter(i => i.preco_ouro == null && (i.categoria || 'outros') === lojaCat).sort((a, z) => (a.ordem || 0) - (z.ordem || 0));
    const fisico = lojaCat === 'aviao' ? 'Aviões e helicópteros. Só os mais ricos: cada um desbloqueia quando o teu património chega ao valor indicado.' : lojaCat === 'veiculo' ? 'Compra no Stand Automóvel (Talatona) ou toca em 🚚 para encomendar aqui: +10% e chega em 2 dias.' : lojaCat === 'animal' ? 'Os animais compram-se na <b>Feira dos Animais</b>, em Viana.' : '';
    h += `<p class="m">${fisico || 'Entregue onde estiveres.'} 💎 = Estilo (as posses de luxo dão reputação e nível de Estilo). Podes vender por metade do preço.</p>
      <div class="list">${lista.map(i => linhaItem(i, !i.onde)).join('')}</div>`;
  }
  body.innerHTML = h;
  body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { lojaCat = b.dataset.cat; renderLoja(body); });
  body.querySelector('#bArmazem')?.addEventListener('click', async () => { if (await acao('comprar_armazem')) renderLoja(body); });
  ligarBotoes(body, () => renderLoja(body));
  ligarVender(body, () => renderLoja(body));
  if (typeof ui2LojaLigar === 'function') ui2LojaLigar(body);
  body.querySelectorAll('[data-encomendar]').forEach(b => b.onclick = async () => {
    const i = D.itens.find(x => x.id === b.dataset.encomendar);
    if (!await perguntar(`Encomendar ${i.nome} por ${fmtKz(comEntrega(i.preco))} (com entrega)? Chega daqui a 2 dias.`)) return;
    b.disabled = true; if (await acao('encomendar_veiculo', { p_item: i.id })) { encomendados.add(i.id); renderLoja(body); } else b.disabled = false;
  });
}

/* ---------- lojas físicas (stand, boutique, feira, shopping) ---------- */
function lojaFisicaHTML(cats) {
  const lista = D.itens.filter(i => i.preco_ouro == null && cats.includes(i.categoria || 'outros')).sort((a, z) => (a.ordem || 0) - (z.ordem || 0));
  return `<div class="sec"><h4>À venda</h4><span>💰 ${saldoKz()}</span></div><div class="list">${lista.map(i => linhaItem(i, true)).join('')}</div>`;
}

/* ---------- Perfil: estilo e animais ---------- */
function blocoPosses() {
  const e = estilo(), animais = ['cao', 'gato', 'galinhas', 'papagaio', 'cavalo_branco'].filter(tem);
  if (!e && !animais.length) return '';
  const pode = J.mimo_em && Date.now() - new Date(J.mimo_em) < 3 * 3600e3;
  const ovos = J.ovos_dia === new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
  return `<div class="rel"><div class="lbl"><span>💎 Estilo</span><span>${e}</span></div><small class="m">Sobe com carros, telemóveis, moda e luxo.</small>
    ${animais.length ? `<div class="list" style="margin-top:8px">
      ${['cao', 'gato', 'papagaio', 'cavalo_branco'].some(tem) ? `<div class="row"><span class="e">${tem('cavalo_branco') ? '🐎' : tem('cao') ? '🐕' : tem('gato') ? '🐈' : '🦜'}</span><div class="t"><b>Dar mimos</b><small>Humor +8, menos solidão · de 3 em 3 horas</small></div><button class="btn sm" data-animal-acao="mimar" ${pode ? 'disabled' : ''}>${pode ? 'Daqui a pouco' : 'Mimar'}</button></div>` : ''}
      ${tem('galinhas') ? `<div class="row"><span class="e">🥚</span><div class="t"><b>Apanhar os ovos</b><small>2.000–4.000 Kz por dia</small></div><button class="btn sm" data-animal-acao="ovos" ${ovos ? 'disabled' : ''}>${ovos ? 'Amanhã' : 'Apanhar'}</button></div>` : ''}
    </div>` : ''}</div>`;
}
function ligarPosses(el, depois) {
  el.querySelectorAll('[data-animal-acao]').forEach(b => b.onclick = async () => {
    b.disabled = true; if (await acao('animal', { p_acao: b.dataset.animalAcao })) depois && depois(); else b.disabled = false;
  });
  el.querySelectorAll('[data-corrida]').forEach(b => b.onclick = async () => {
    b.disabled = true; const r = await acao('corrida'); b.disabled = false;
    if (r) { eu.fala = { txt: '🚐', ate: performance.now() + 2000 }; depois && depois(); }
  });
}
function corridaHTML() {
  if (!tem('carrinha')) return '';
  return `<div class="sec"><h4>🚐 A tua carrinha</h4></div><div class="list"><div class="row"><span class="e">🚐</span><div class="t"><b>Fazer uma corrida de candongueiro</b><small>5.000–9.000 Kz (mais quando a gasolina sobe) · −20 energia · de 30 em 30 min</small></div><button class="btn sm" data-corrida>Fazer</button></div></div>`;
}


/* ---------- 🪙 Ouro: a moeda premium ---------- */
// dono 5 nov: «all the ouro payments should be in euros too» — escolher € ou $ (fica lembrado; por omissão € em países do euro e em Angola/Portugal)
function moedaOuro() {
  let m = null; try { m = localStorage.getItem('vel_moeda_ouro'); } catch { }
  if (m === 'eur' || m === 'usd') return m;
  const l = (navigator.language || '').toLowerCase();
  return /^(pt|fr|de|es|it|nl|el|fi|et|lv|lt|sk|sl|mt|ga|hr)(-|$)/.test(l) && !/-(br|us|ca|ch)$/.test(l) ? 'eur' : 'usd';
}
function precoOuro(p) {
  const eur = moedaOuro() === 'eur', c = eur ? p.preco_eur_centimos : p.preco_usd_centimos;
  if (!c) return '';
  return eur ? (c / 100).toFixed(2).replace('.', ',') + ' €' : '$' + (c / 100).toFixed(2);
}
// dono 6 nov: «we want to sell the 9.99 one the most so make it the best value for money and ensure the whole game [shows] that it is»
const pacoteMelhor = () => (D.pacotes || []).find(p => p.destaque) || null;
const ouroPorEuro = p => (p.ouro + p.bonus) / ((p.preco_eur_centimos || p.preco_usd_centimos || 1) / 100);
function maisOuroPct(p) {   // quanto mais Ouro por € do que o pacote mais pequeno
  const base = Math.min(...(D.pacotes || []).filter(x => x.preco_eur_centimos || x.preco_usd_centimos).map(ouroPorEuro));
  return base > 0 ? Math.round((ouroPorEuro(p) / base - 1) * 100) : 0;
}
async function comprarPacote(id) {
  toast(tr('A abrir o pagamento…'));
  const { data, error } = await sb.functions.invoke('stripe-checkout', { body: { pacote: id, moeda: moedaOuro() } });
  if (error || !data?.url) { let m = ''; try { m = (await error?.context?.json())?.erro; } catch { } toast(m || data?.erro || tr('Não foi possível abrir o pagamento.'), 'mau'); return false; }
  location.href = data.url; return true;
}
// sem Ouro suficiente: sugestão discreta (só quando o jogador tentou comprar algo), com o preço à vista; «Agora não» fecha
// 7 nov 16:26 (dono): primeiro o pacote de 9,99 € (o melhor valor); o pacote pequeno só aparece por baixo, como «só desta vez»,
// e só se chegar para o que falta (a Stripe leva 20p por compra: compras pequenas rendem muito menos).
async function sugerirOuro(precisa, motivo) {
  const p = pacoteMelhor(), tens = J?.ouro || 0;
  const falta = motivo || tr('Precisas de {0} Ouro. Tens {1}.').replace('{0}', precisa).replace('{1}', tens);
  if (!p || !precoOuro(p)) { toast(falta, 'mau'); return; }
  const qt = n => (n.ouro + n.bonus).toLocaleString('pt-PT');
  const preco = q => moedaOuro() === 'eur' ? q.preco_eur_centimos : q.preco_usd_centimos;
  const peq = (D.pacotes || []).filter(x => x.id !== p.id && preco(x) && preco(x) < preco(p) && (x.ouro + x.bonus) >= (precisa || 0) - tens).sort((a, b) => preco(a) - preco(b))[0];
  const esc2 = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const escolha = await new Promise(res => {
    const v = document.createElement('div'); v.className = 'pergunta';
    v.innerHTML = `<div class="pergCaixa"><p>${esc2(falta)} ${esc2(tr('O pacote de {0} Ouro é o que dá mais Ouro por euro.').replace('{0}', qt(p)))}</p>
      <div class="pergBot" style="flex-direction:column;align-items:stretch">
        <button class="btn" data-o="melhor">🪙 ${esc2(tr('Comprar {0} Ouro').replace('{0}', qt(p)))} · ${esc2(precoOuro(p))} · ${esc2(tr('Melhor valor'))}</button>
        ${peq ? `<button class="btn ghost sm" data-o="peq">${esc2(tr('Só desta vez: {0} Ouro').replace('{0}', qt(peq)))} · ${esc2(precoOuro(peq))}</button>` : ''}
        <button class="btn ghost sm" data-o="">${esc2(tr('Agora não'))}</button></div></div>`;
    v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { v.remove(); res(b.dataset.o); });
    document.body.appendChild(v);
  });
  if (escolha === 'melhor') await comprarPacote(p.id);
  else if (escolha === 'peq') await comprarPacote(peq.id);
}
// jet ski (e outros jogos a meio): o pagamento abre NOUTRA janela para a corrida ficar à espera; a janela abre-se já no toque
// (senão o browser bloqueia) e só depois recebe o endereço da Stripe
async function comprarPacoteNovaJanela(id) {
  const w = window.open('', '_blank');
  const { data, error } = await sb.functions.invoke('stripe-checkout', { body: { pacote: id, moeda: moedaOuro() } });
  if (error || !data?.url) { try { w?.close(); } catch { } let m = ''; try { m = (await error?.context?.json())?.erro; } catch { } toast(m || data?.erro || tr('Não foi possível abrir o pagamento.'), 'mau'); return false; }
  if (w) w.location = data.url; else location.href = data.url;
  return true;
}
async function comprarKzNovaJanela(id) {
  const w = window.open('', '_blank');
  const { data, error } = await sb.functions.invoke('stripe-checkout', { body: { pacote: id, moeda: moedaOuro(), tipo: 'kz' } });
  if (error || !data?.url) { try { w?.close(); } catch { } let m = ''; try { m = (await error?.context?.json())?.erro; } catch { } toast(m || data?.erro || tr('Não foi possível abrir o pagamento.'), 'mau'); return false; }
  if (w) w.location = data.url; else location.href = data.url;
  return true;
}
async function atualizarOuro() {   // depois de pagar noutra janela: o Ouro chega pelo webhook da Stripe
  const { data } = await sb.rpc('estado'); if (data?.jogador) setJogador(data.jogador);
  return J?.ouro || 0;
}
// 6 nov 20:05 (dono): passes do dia no lugar das recargas — os preços verdadeiros estão no servidor (ouro_recargas)
const PASSES_DIA = [
  ['energia_dia', 520, '⚡', 'Energia cheia o dia todo', 'Durante 24 horas a energia fica sempre cheia.', 'energia_cheia_ate'],
  ['fome_dia', 900, '🍲', 'Sem fome o dia todo', 'Durante 24 horas a barriga fica sempre cheia.', 'fome_cheia_ate'],
];
const ateHTML = d => new Date(d).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
// 8 nov (FILA 0dd-3 / 0dv-d): vantagens só com Ouro — preços verdadeiros no servidor (ouro_vantagens)
const VANTAGENS = [
  // 👑 VIP retirado (dono 8 nov 17:30: «roll it back, it's not supposed to go to live» — ainda está a decidir o que o VIP inclui)
  ['salario', 250, '💼', '+10% no salário · 7 dias', 'Cada turno do teu emprego paga mais 10%.', 'salario_extra_ate'],
];
// 6 nov (dono): proteção contra roubos — preços verdadeiros no servidor (protecao_pacotes)
const PROTECAO = [[1, 290], [3, 690], [7, 1290]];
const protegidoAte = () => J?.protecao_ate && new Date(J.protecao_ate) > new Date() ? J.protecao_ate : null;
function protecaoHTML() {
  const ate = protegidoAte(), ouro = J.ouro || 0;
  return `<p class="m">${tr('Com proteção ninguém te rouba o dinheiro da carteira. O dinheiro no banco está sempre a salvo.')}${ate ? `<br><b>🛡️ ${tr('Protegido/a até')} ${ateHTML(ate)}</b>` : ''}</p>
    <div class="list">${PROTECAO.map(([d, p]) => `<div class="row ${ate ? 'mine' : ''}"><span class="e">🛡️</span><div class="t"><b>${tr(d === 1 ? 'Proteção · 1 dia' : d === 3 ? 'Proteção · 3 dias' : 'Proteção · 7 dias')}</b><small>${tr('Seguranças à tua volta: os roubos falham.')}</small></div><button class="btn sm ${ouro >= p ? '' : 'ghost'}" data-protecao="${d}:${p}">🪙 ${p.toLocaleString('pt-PT')}</button></div>`).join('')}</div>`;
}
async function comprarProtecao(d, p, depois) {
  if ((J.ouro || 0) < p) return sugerirOuro(p);
  if (!await perguntar(tr('Comprar {0} de proteção por {1} Ouro?').replace('{0}', tr(d === 1 ? '1 dia' : d + ' dias')).replace('{1}', p.toLocaleString('pt-PT')))) return;
  if (await acao('comprar_protecao', { p_dias: d })) depois && depois();
}
// a proteção acabou → janela a propor renovar (uma vez; «Agora não» não volta a abrir)
let _protEspera = null;
function talvezRenovarProtecao() {
  if (_protEspera || !J?.protecao_avisar) return;
  _protEspera = setInterval(() => {
    if (!J?.protecao_avisar) { clearInterval(_protEspera); _protEspera = null; return; }
    if (!document.querySelector('#carregar.hide') || document.querySelector('.veil, .tel-modal, .pergunta, #nomeForcado') || telAberto) return;
    clearInterval(_protEspera); _protEspera = null;
    J.protecao_avisar = false; sb.rpc('protecao_visto').then(() => { }, () => { });
    const el = sheet(`<h3>🛡️ ${esc(tr('A tua proteção acabou'))}</h3><p class="m">${esc(tr('Sem proteção, qualquer pessoa no teu bairro pode tentar roubar o dinheiro da tua carteira. Renovar?'))}</p>${protecaoHTML()}<button class="btn full ghost" data-fechar style="margin-top:10px">${esc(tr('Agora não'))}</button>`);
    el.querySelectorAll('[data-protecao]').forEach(b => b.onclick = () => { const [d, p] = b.dataset.protecao.split(':').map(Number); comprarProtecao(d, p, () => fecharSheets()); });
  }, 3000);
}
setInterval(() => { if (J?.protecao_avisar) talvezRenovarProtecao(); }, 5000);
// 6 nov (Gold Exclusive C): acabamentos para os carros que já tens — os preços verdadeiros estão no servidor (acabamentos_catalogo)
const ACAB = [
  ['ouro', 2500, '🟡', 'Banhado a ouro', 'Carroçaria e jantes em ouro polido.'],
  ['diamante', 3000, '💎', 'Acabamento diamante', 'Pintura branca perolada que brilha como diamante.'],
  ['neon', 1500, '🌈', 'Luz néon por baixo', 'Brilha por baixo do carro à noite. Mudar a cor depois é grátis.'],
  ['matricula', 1500, '🔤', 'Matrícula personalizada', 'Até 8 letras ou números. Única no jogo.'],
];
const NEON_CORES = ['#00e5ff', '#ff2bd6', '#39ff14', '#9d4dff', '#ff2a2a', '#ffcf3a', '#2a7bff'];
const meusCarros = () => (J.itens || []).map(id => D.itens?.find(i => i.id === id)).filter(i => i?.categoria === 'veiculo').sort((a, z) => z.preco - a.preco);
const resumoAcab = a => [a.pintura === 'ouro' ? '🟡 ' + tr('Dourado') : a.pintura === 'diamante' ? '💎 ' + tr('Diamante') : '', a.neon ? '🌈 ' + tr('Néon') : '', a.matricula ? '🔤 ' + a.matricula : ''].filter(Boolean).join(' · ');
function acabamentosListaHTML() {
  const cs = meusCarros();
  if (!cs.length) return `<p class="m">${tr('Compra um carro ou uma mota no Stand (Talatona) para lhe pores acabamentos de luxo.')}</p>`;
  return `<p class="m">${tr('Dourado, diamante, luz néon e matrícula só tua. O acabamento fica no carro: se o venderes, perde-se.')}</p>
    <div class="list">${cs.map(i => { const a = J.acabamentos?.[i.id] || {};
      return `<div class="row">${miniaturaHTML('item', idVisual(i.id))}<div class="t"><b>${esc(tr(i.nome))}</b><small>${esc(resumoAcab(a)) || tr('Sem acabamentos')}</small></div><button class="btn sm" data-acab="${esc(i.id)}">✨ ${tr('Personalizar')}</button></div>`; }).join('')}</div>`;
}
function abrirAcabamentos(id, depois) {
  const i = D.itens.find(x => x.id === id); if (!i) return;
  const a = J.acabamentos?.[id] || {}, ouro = J.ouro || 0;
  const fechar = () => (typeof telAberto !== 'undefined' && telAberto && typeof fecharSheetsTel === 'function') ? fecharSheetsTel() : fecharSheets();
  const reabrir = () => { fechar(); abrirAcabamentos(id, depois); depois && depois(); };
  const linha = ([t, p, e, n, d]) => {
    if (t === 'ouro' && id === 'candongueiro_ouro') return '';
    let extra = '';
    if (t === 'neon') extra = `<div class="neonCores">${NEON_CORES.map(c => `<button class="neonCor ${(a.neon || NEON_CORES[0]) === c ? 'on' : ''}" data-neon="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
    if (t === 'matricula') extra = `<div class="matriculaLinha"><input id="acabMatricula" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(a.matricula || 'KOTA01')}"></div>`;
    const tem = (t === 'ouro' || t === 'diamante') && a.pintura === t;
    const btn = tem ? `<span class="tag">${tr('Já tem')}</span>`
      : t === 'neon' && a.neon ? `<span class="tag">${tr('Toca numa cor: grátis')}</span>`
      : `<button class="btn sm ${ouro >= p ? '' : 'ghost'}" data-comprar-acab="${t}:${p}">🪙 ${p.toLocaleString('pt-PT')}</button>`;
    return `<div class="row acab"><span class="e">${e}</span><div class="t"><b>${tr(n)}</b><small>${tr(d)}</small>${extra}</div>${btn}</div>`;
  };
  const el = sheet(`<h3>✨ ${esc(tr(i.nome))}</h3>
    <div class="acabFoto">${miniaturaHTML('item', idVisual(id), 'mini grande')}${a.matricula ? `<b class="matricula grande" data-sem-traducao>${esc(a.matricula)}</b>` : ''}</div>
    <p class="m">🪙 ${ouro.toLocaleString('pt-PT')} Ouro · ${tr('O acabamento fica no carro: se o venderes, perde-se.')}</p>
    <div class="list">${ACAB.map(linha).join('')}</div>`);
  let neon = a.neon || NEON_CORES[0];
  el.querySelectorAll('[data-neon]').forEach(b => b.onclick = async () => {
    neon = b.dataset.neon; el.querySelectorAll('[data-neon]').forEach(x => x.classList.toggle('on', x === b));
    if (a.neon && a.neon !== neon && await acao('comprar_acabamento', { p_carro: id, p_tipo: 'neon', p_valor: neon })) reabrir();   // já tem néon: mudar a cor é grátis
  });
  el.querySelectorAll('[data-comprar-acab]').forEach(b => b.onclick = async () => {
    const [t, p] = b.dataset.comprarAcab.split(':');
    let valor = t === 'neon' ? neon : null;
    if (t === 'matricula') {
      valor = (el.querySelector('#acabMatricula')?.value || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{2,8}$/.test(valor)) return toast(tr('A matrícula leva de 2 a 8 letras ou números, sem espaços nem acentos.'), 'info');
    }
    if ((J.ouro || 0) < +p) return sugerirOuro(+p);
    const nome = tr(ACAB.find(x => x[0] === t)[3]) + (t === 'matricula' ? ` «${valor}»` : '');
    if (!await perguntar(tr('Comprar {0} para o teu {1} por {2} Ouro?').replace('{0}', nome).replace('{1}', tr(i.nome)).replace('{2}', (+p).toLocaleString('pt-PT')))) return;
    b.disabled = true; const r = await acao('comprar_acabamento', { p_carro: id, p_tipo: t, p_valor: valor }); b.disabled = false;
    if (r) reabrir();
  });
}
function renderOuro(body) {
  const ouro = J.ouro || 0;
  const extras = [
    ...D.itens.filter(i => i.preco_ouro != null).map(i => ({ tipo: 'item', id: i.id, e: i.emoji, n: i.nome, d: i.descricao, p: i.preco_ouro, cat: i.categoria, nivel: i.nivel, tens: tem(i.id) })),
    ...D.moveis.filter(m => m.preco_ouro != null).map(m => ({ tipo: 'movel', id: m.id, e: m.emoji, n: m.nome, d: m.efeito, p: m.preco_ouro, cat: 'casa' })),
  ].sort((a, z) => a.p - z.p);
  const nomeCat = { moda: 'Visual', veiculo: 'Veículo', casa: 'Para a casa' };
  body.innerHTML = `
    <div class="ouroTopo"><div class="ouroSaldo">🪙 <b>${ouro.toLocaleString('pt-PT')}</b> <span>Ouro</span></div>
      <p class="m">Extras exclusivos para te destacares em Luanda. O Ouro é teu para sempre (não se perde quando a personagem morre), não se envia a outros jogadores e não entra nos jogos de sorte.</p></div>
    <div class="sec"><h4>Comprar Ouro</h4><span class="abas" style="margin:0"><button data-moeda="eur" class="${moedaOuro() === 'eur' ? 'on' : ''}">€ EUR</button><button data-moeda="usd" class="${moedaOuro() === 'usd' ? 'on' : ''}">$ USD</button></span></div>
    <div class="pacotes">${(D.pacotes || []).map(p => `<div class="pacote ${p.destaque ? 'dest' : ''}">${p.destaque ? `<i class="selo">${esc(tr(p.destaque))}</i>` : ''}
      <div class="pq">🪙 ${(p.ouro + p.bonus).toLocaleString('pt-PT')}</div>${p.bonus ? `<small>${p.ouro} + ${p.bonus} ${tr('de bónus')}</small>` : '<small>&nbsp;</small>'}${maisOuroPct(p) > 0 ? `<small class="mais-ouro"${p.destaque ? ' style="color:var(--gold);font-weight:800"' : ''}>${tr('+{0}% de Ouro por €').replace('{0}', maisOuroPct(p))}</small>` : '<small>&nbsp;</small>'}
      ${precoOuro(p) ? `<button class="btn sm" data-comprar-ouro="${esc(p.id)}">${precoOuro(p)}</button>` : ''}${D.pagaKz ? `<button class="btn sm ghost" data-ouro-kz="${esc(p.id)}" style="margin-top:4px">${fmtKz(p.preco_kz)}</button>` : (p.preco_usd_centimos ? '' : `<button class="btn sm" disabled>${fmtKz(p.preco_kz)}</button>`)}</div>`).join('')}</div>
    <p class="m" style="margin-top:8px">${D.pagaKz ? 'Paga em euros ou dólares com cartão (Visa, Mastercard) numa página segura, ou em Kz por Multicaixa Express / transferência.' : 'Paga com cartão (Visa, Mastercard) numa página segura da Stripe. O Multicaixa Express chega em breve.'}</p>
    ${(D.pacotesKz || []).length ? `<div class="sec"><h4>💵 ${tr('Comprar Kz')}</h4><span>${tr('máx. 250.000 Kz por semana')}</span></div>
    <p class="m aviso-kz">⚠️ ${tr('Quem compra Kz deixa de poder jogar a dinheiro (raspadinha, lotaria, apostas, casino) para sempre — nesta conta e nas do mesmo aparelho. Os Kz comprados não se enviam a outros jogadores.')}</p>
    <div class="pacotes">${D.pacotesKz.map(p => `<div class="pacote"><div class="pq">💵 ${fmtKz(p.kz)}</div><small>&nbsp;</small>${precoOuro(p) ? `<button class="btn sm" data-comprar-kz="${esc(p.id)}">${precoOuro(p)}</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="sec"><h4>${tr('Pagar com Ouro')}</h4><span>1 🪙 = 100 Kz</span></div>
    <div class="abas" style="margin-bottom:6px"><button data-pagar="kz" class="${pagarComOuro() ? '' : 'on'}">${tr('Pagar compras em Kz')}</button><button data-pagar="ouro" class="${pagarComOuro() ? 'on' : ''}">🪙 ${tr('Pagar compras em Ouro')}</button></div>
    <p class="m">${tr('Lojas, stand, móveis e casas: escolhe se pagas em Kz ou em Ouro. Se te faltar Kz, também podes pagar com Ouro na hora.')}</p>
    <div class="sec"><h4>🛡️ ${tr('Proteção contra roubos')}</h4></div>
    ${protecaoHTML()}
    <div class="sec"><h4>✨ ${tr('Exclusivo Ouro')}</h4></div>
    <p class="m">${tr('Só se compra com Ouro. Quando o passe acaba, tudo volta a descer como sempre.')}${J.pacote2d_ate && new Date(J.pacote2d_ate) > new Date() ? `<br><b>🛡️ ${tr('Pacote de 2 dias ativo até')} ${ateHTML(J.pacote2d_ate)}</b>` : ''}</p>
    <div class="list">${PASSES_DIA.map(([t, p, e, n, d, col]) => { const at = J[col] && new Date(J[col]) > new Date();
      return `<div class="row ${at ? 'mine' : ''}"><span class="e">${e}</span><div class="t"><b>${tr(n)}</b><small>${tr(d)}${at ? `<br><b>${tr('Ativo até')} ${ateHTML(J[col])}</b>` : ''}</small></div><button class="btn sm ${ouro >= p ? '' : 'ghost'}" data-recarga="${t}:${p}">🪙 ${p}${at ? ' +24 h' : ''}</button></div>`; }).join('')}</div>
    <div class="list" style="margin-top:8px">${VANTAGENS.map(([t, p, e, n, d, col]) => { const at = J[col] && new Date(J[col]) > new Date();
      return `<div class="row ${at ? 'mine' : ''}"><span class="e">${e}</span><div class="t"><b>${tr(n)}</b><small>${tr(d)}${at ? `<br><b>${tr('Ativo até')} ${ateHTML(J[col])}</b>` : ''}</small></div><button class="btn sm ${ouro >= p ? '' : 'ghost'}" data-vantagem="${t}:${p}">🪙 ${p}</button></div>`; }).join('')}</div>
    <div class="sec"><h4>🚗 ${tr('Acabamentos para o teu carro')}</h4></div>
    ${acabamentosListaHTML()}
    <div class="sec"><h4>${tr('Extras exclusivos')}</h4></div>
    <div class="list">${extras.map(x => `<div class="row ${x.tens ? 'mine' : ''}">${miniaturaHTML(x.tipo, x.id)}
      <div class="t"><b>${esc(x.n)}</b><small>${nomeCat[x.cat] || ''}${x.d ? ' · ' + esc(x.d) : ''}</small></div>
      ${x.tens ? '<span class="tag">Já tens</span>' : `<button class="btn sm ${ouro >= x.p ? '' : 'ghost'}" data-ouro="${x.tipo}:${x.id}">🪙 ${x.p}</button>`}</div>`).join('')}</div>`;
  body.querySelectorAll('[data-protecao]').forEach(b => b.onclick = () => { const [d, p] = b.dataset.protecao.split(':').map(Number); comprarProtecao(d, p, () => renderOuro(body)); });
  body.querySelectorAll('[data-acab]').forEach(b => b.onclick = () => abrirAcabamentos(b.dataset.acab, () => renderOuro(body)));
  body.querySelectorAll('[data-moeda]').forEach(b => b.onclick = () => { try { localStorage.setItem('vel_moeda_ouro', b.dataset.moeda); } catch { } renderOuro(body); });
  body.querySelectorAll('[data-pagar]').forEach(b => b.onclick = () => { try { localStorage.setItem('vel_pagar', b.dataset.pagar); } catch { } renderOuro(body); });
  body.querySelectorAll('[data-vantagem]').forEach(b => b.onclick = async () => {
    const [t, p] = b.dataset.vantagem.split(':'), v = VANTAGENS.find(x => x[0] === t);
    if ((J.ouro || 0) < +p) return typeof sugerirOuro === 'function' ? sugerirOuro(+p) : toast(tr('Precisas de {0} Ouro. Tens {1}.').replace('{0}', p).replace('{1}', J.ouro || 0), 'mau');
    if (!await perguntar(tr('Comprar «{0}» por {1} Ouro?').replace('{0}', tr(v[3])).replace('{1}', p))) return;
    b.disabled = true; const r = await acao('comprar_vantagem', { p_tipo: t }); b.disabled = false; if (r) renderOuro(body);
  });
  body.querySelectorAll('[data-recarga]').forEach(b => b.onclick = async () => {
    const [t, p] = b.dataset.recarga.split(':');
    if ((J.ouro || 0) < +p) return sugerirOuro(+p);
    if (!await perguntar(tr('Comprar este passe de 24 horas por {0} Ouro? Quando acaba, tudo volta a descer como sempre.').replace('{0}', p))) return;
    b.disabled = true; const r = await acao('ouro_recarga', { p_tipo: t }); b.disabled = false; if (r) renderOuro(body);
  });
  body.querySelectorAll('[data-ouro-kz]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data: r, error } = await sb.rpc('pedir_pagamento_local', { p_pacote: b.dataset.ouroKz });
    b.disabled = false;
    if (error) { toast(limparErro(error.message), 'mau'); return; }
    const linha = (t, v) => v ? `<div class="row"><div class="t"><small>${t}</small><b data-sem-traducao style="user-select:all">${esc(v)}</b></div></div>` : '';
    sheet(`<h3>Pagar em Kz</h3>
      <p class="m">Transfere <b>${fmtKz(r.valor_kz)}</b> e escreve o código no descritivo. Quando confirmarmos, recebes 🪙 ${r.ouro} Ouro (normalmente no mesmo dia).</p>
      <div class="list">${linha('Código (escreve no descritivo)', r.codigo)}${linha('Multicaixa Express', r.multicaixa)}${linha('IBAN', r.iban)}${linha('Titular', r.titular)}${linha('Banco', r.banco)}</div>
      ${r.contacto ? `<p class="m" style="margin-top:8px">Envia o comprovativo com o código para <b data-sem-traducao>${esc(r.contacto)}</b>.</p>` : ''}
      <button class="btn full" data-fechar>Já percebi</button>`);
  });
  // 7 nov (dono): comprar Kz — caro, com limite por semana; primeiro confirma que deixa de jogar a dinheiro
  body.querySelectorAll('[data-comprar-kz]').forEach(b => b.onclick = async () => {
    const p = (D.pacotesKz || []).find(x => x.id === b.dataset.comprarKz); if (!p) return;
    if (!await perguntar(tr('Comprar {0} por {1}? Depois disto não podes jogar a dinheiro (raspadinha, lotaria, apostas, casino) — nunca mais, nesta conta e nas do mesmo aparelho.').replace('{0}', fmtKz(p.kz)).replace('{1}', precoOuro(p)))) return;
    b.disabled = true; if (!await comprarKzNovaJanela(p.id)) b.disabled = false;
  });
  body.querySelectorAll('[data-comprar-ouro]').forEach(b => b.onclick = async () => {
    b.disabled = true; if (!await comprarPacote(b.dataset.comprarOuro)) b.disabled = false;
  });
  body.querySelectorAll('[data-ouro]').forEach(b => b.onclick = async () => {
    const [tipo, id] = b.dataset.ouro.split(':');
    const x = extras.find(e => e.tipo === tipo && e.id === id);
    if ((J.ouro || 0) < x.p) return sugerirOuro(x.p);
    if (!await perguntar(`Comprar ${x.n} por ${x.p} Ouro?`)) return;
    b.disabled = true;
    const r = await acao('comprar_com_ouro', { p_tipo: tipo, p_id: id });
    b.disabled = false;
    if (r) { if (tipo === 'movel') await carregarMinhaMobilia(); renderOuro(body); }
  });
  if (typeof ui2 === 'function' && ui2()) ui2Ouro(body);   // 8 nov: redesenho (teste)
  if (typeof vidaBoaBanner === 'function') vidaBoaBanner(body);   // 9 nov: Pacote Vida Boa
}
