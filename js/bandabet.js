/* ============================================================
   Vida na Banda — BandaBet (dono 7 nov 20:36: «betting … based off of real things like sports … an actual betting platform
   (just with our game money)» · 22:33 «i approve the design» · 23:12 «the betting app goes on the test site»).
   Desenho aprovado em Claude Design: Início, Jogo ao vivo, Boletim, As minhas apostas (cash out), Promoções, Entrada 18+.
   Tudo o que conta (odds, limites, pagamento) é do servidor: desp_apostar / desp_cash_out / desp_minhas / desp_estado.
   ============================================================ */
const BB = { tela: 'inicio', desporto: 'futebol', eventos: [], est: null, ev: null, aba: true, timer: 0, valor: 1000 };
const BB_DESP = [['futebol', 'Futebol'], ['basquetebol', 'Basquetebol'], ['tenis', 'Ténis'], ['combate', 'Combate']];
const BB_IC = {
  logo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141012" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18 L10 8 L14 14 L20 5"></path><path d="M15 5 h5 v5"></path></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
  voltar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>',
  inicio: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg>',
  aovivo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"></path></svg>',
  boletim: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"></path><path d="M9 8h6M9 12h6"></path></svg>',
  apostas: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"></path></svg>',
  promos: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7S10 2 7.5 3.5 9 7 12 7zM12 7s2-5 4.5-3.5S15 7 12 7z"></path></svg>',
  raio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffcb00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"></path></svg>',
  escudo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34c77b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"></path></svg>',
};
const bbN = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const bbKz = n => bbN(n) + ' Kz';
const bbOdd = n => Number(n).toFixed(2);
const bbTotal = b => Math.min(1000, Math.round(b.reduce((a, x) => a * x.odd, 1) * 100) / 100);   // igual ao servidor (2 casas)
const bbIni = s => String(s || '').split(/\s+/).filter(w => /^[A-Za-zÀ-ÿ0-9º]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const bbCor = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 55% 38%)`; };
const bbEscudo = (nome, g) => `<span class="bb-esc${g ? ' g' : ''}" style="background:${bbCor(nome)}">${esc(bbIni(nome))}</span>`;
function bbBoletim() { try { return JSON.parse(localStorage.getItem('vel_bb_boletim') || '[]'); } catch { return []; } }
function bbGuardarBoletim(b) { try { localStorage.setItem('vel_bb_boletim', JSON.stringify(b)); } catch { } }
const bbNoBoletim = (ev, m, s) => bbBoletim().some(x => x.evento === ev && x.mercado === m && x.selecao === s);
const BB_SEL = { '1': '1', X: 'X', '2': '2', mais: 'Mais de', menos: 'Menos de', sim: 'Sim', nao: 'Não' };
const BB_MERC = { '1x2': 'Resultado final', total: 'Total de golos', ambas: 'Ambas marcam' };
function bbNomeSel(e, m, s) {
  if (m === '1x2') return s === '1' ? e.casa : s === '2' ? e.fora : tr('Empate');
  if (m === 'total') return `${tr(BB_SEL[s])} ${String(e.odds?.total?.linha ?? '').replace('.', ',')} ${tr('golos')}`;
  return `${tr('Ambas marcam')}: ${tr(BB_SEL[s])}`;
}

async function abrirBandaBet(tela) {
  document.getElementById('bandabet')?.remove();
  const v = document.createElement('div'); v.id = 'bandabet'; v.className = 'bb';
  document.body.appendChild(v);
  BB.tela = tela || 'inicio';
  v.innerHTML = `<div class="bb-carregar">${esc(tr('A carregar…'))}</div>`;
  await bbCarregar();
  bbDesenhar();
  clearInterval(BB.timer); BB.timer = setInterval(() => { if (!document.getElementById('bandabet')) return clearInterval(BB.timer); if (['inicio', 'jogo', 'aovivo'].includes(BB.tela)) bbCarregar().then(bbDesenhar); }, 30000);
}
function fecharBandaBet() { clearInterval(BB.timer); document.getElementById('bandabet')?.remove(); }
async function bbCarregar() {
  const [ev, st] = await Promise.all([
    sb.from('desp_eventos').select('*').order('inicio').limit(300),
    sb.rpc('desp_estado'),
  ]);
  const agora = Date.now();
  BB.eventos = (ev.data || []).filter(e => e.estado === 'ao_vivo' || (e.estado === 'agendado' && new Date(e.inicio) > agora));
  BB.est = st.data || { apostas_18: false };
  if (BB.ev) BB.ev = BB.eventos.find(e => e.id === BB.ev.id) || BB.ev;
}

function bbTopo() {
  return `<header class="bb-topo"><div class="bb-logo"><span class="bb-marca">${BB_IC.logo}</span><b>BANDA<i>BET</i></b></div>
    <div class="bb-saldo"><b>${bbKz(J?.kumbu)}</b><small>${esc(tr('dinheiro do jogo'))}</small></div>
    <button class="bb-ic" data-bb-fechar aria-label="${esc(tr('Fechar'))}">${BB_IC.x}</button></header>`;
}
function bbNav() {
  const it = (t, ic, n) => `<button data-bb-ir="${t}" class="${BB.tela === t ? 'on' : ''}">${BB_IC[ic]}<span>${esc(tr(n))}</span>${t === 'boletim' && bbBoletim().length ? `<em>${bbBoletim().length}</em>` : ''}</button>`;
  return `<nav class="bb-nav" aria-label="${esc(tr('Menu principal'))}">${it('inicio', 'inicio', 'Início')}${it('aovivo', 'aovivo', 'Ao vivo')}${it('boletim', 'boletim', 'Boletim')}${it('apostas', 'apostas', 'Apostas')}${it('promos', 'promos', 'Promos')}</nav>`;
}
function bbBarraBoletim() {
  const b = bbBoletim(); if (!b.length) return '';
  const tot = bbTotal(b);
  return `<button class="bb-barra" data-bb-ir="boletim"><span><em>${b.length}</em>${esc(tr('Boletim'))}</span><span>${esc(tr('Odds'))} ${bbOdd(tot)}</span></button>`;
}
function bbBotaoOdd(e, m, s, rot) {
  const o = e.odds?.[m]?.[s]; if (o == null) return '';
  return `<button class="bb-odd ${bbNoBoletim(e.id, m, s) ? 'on' : ''}" data-bb-odd="${esc(e.id)}|${m}|${s}"><span>${esc(rot)}</span><b>${bbOdd(o)}</b></button>`;
}
function bbCartao(e) {
  const vivo = e.estado === 'ao_vivo', hora = new Date(e.inicio).toLocaleString(typeof lingua !== 'undefined' && lingua !== 'pt' ? lingua : 'pt-PT', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Luanda' });
  const odds = ['1', 'X', '2'].map(s => bbBotaoOdd(e, '1x2', s, s)).join('');
  return `<article class="bb-cartao">
    <button class="bb-cab" data-bb-jogo="${esc(e.id)}"><span>${esc(e.liga)}</span><span class="${vivo ? 'vivo' : ''}">${vivo ? esc(e.minuto || tr('Ao vivo')) : esc(hora)}</span></button>
    <button class="bb-equipas" data-bb-jogo="${esc(e.id)}">
      <span>${bbEscudo(e.casa)}${esc(e.casa)}</span><b>${vivo ? e.golos_casa ?? 0 : ''}</b>
      <span>${bbEscudo(e.fora)}${esc(e.fora)}</span><b>${vivo ? e.golos_fora ?? 0 : ''}</b></button>
    <div class="bb-odds n${(odds.match(/bb-odd/g) || []).length}">${odds}</div></article>`;
}
function bbInicio(soVivo) {
  const evs = BB.eventos.filter(e => e.desporto === BB.desporto);
  const vivos = evs.filter(e => e.estado === 'ao_vivo'), prox = evs.filter(e => e.estado === 'agendado');
  const ligas = [...new Set(prox.map(e => e.liga))];
  return `${bbTopo()}
    <nav class="bb-desp" aria-label="${esc(tr('Desportos'))}">${BB_DESP.map(([k, n]) => `<button data-bb-desp="${k}" class="${BB.desporto === k ? 'on' : ''}">${esc(tr(n))}</button>`).join('')}</nav>
    <main class="bb-corpo">
      ${soVivo ? '' : `<section class="bb-promo"><div><small>${esc(tr('ACUMULADORA TURBO'))}</small><b>${esc(tr('Até +25% nos ganhos com 5 ou mais jogos'))}</b></div><button data-bb-ir="promos">${esc(tr('Ver'))}</button></section>`}
      <h2 class="bb-h2"><i class="ponto"></i>${esc(tr('Ao vivo'))}</h2>
      ${vivos.map(bbCartao).join('') || `<p class="bb-vazio">${esc(tr('Nenhum jogo ao vivo agora.'))}</p>`}
      ${soVivo ? '' : ligas.map(l => `<h2 class="bb-h2">${esc(l)}</h2>${prox.filter(e => e.liga === l).slice(0, 8).map(bbCartao).join('')}`).join('') || `<p class="bb-vazio">${esc(tr('Sem jogos para já. Volta mais logo.'))}</p>`}
    </main>${bbBarraBoletim()}${bbNav()}`;
}
function bbJogo() {
  const e = BB.ev; if (!e) return bbInicio();
  const vivo = e.estado === 'ao_vivo', o = e.odds || {};
  const merc = (m, nota, lista) => o[m] ? `<section class="bb-merc"><div class="bb-merc-t"><h3>${esc(tr(BB_MERC[m]))}</h3><small>${esc(nota || '')}</small></div>
      <div class="bb-odds n${lista.filter(([s]) => o[m][s] != null).length}">${lista.map(([s, r]) => bbBotaoOdd(e, m, s, r)).join('')}</div></section>` : '';
  return `<header class="bb-topo"><button class="bb-ic" data-bb-ir="inicio" aria-label="${esc(tr('Voltar'))}">${BB_IC.voltar}</button>
      <div class="bb-tit"><small>${esc(e.liga)}</small><b>${esc(e.casa)} vs ${esc(e.fora)}</b></div>${vivo ? `<span class="bb-vivo"><i class="ponto"></i>${esc(tr('AO VIVO'))}</span>` : ''}</header>
    <section class="bb-placar"><div>${bbEscudo(e.casa, 1)}<b>${esc(e.casa)}</b></div>
      <div class="bb-res"><b>${vivo ? `${e.golos_casa ?? 0} – ${e.golos_fora ?? 0}` : 'vs'}</b><small class="${vivo ? 'vivo' : ''}">${vivo ? esc(e.minuto || '') : esc(new Date(e.inicio).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Luanda' }))}</small></div>
      <div>${bbEscudo(e.fora, 1)}<b>${esc(e.fora)}</b></div></section>
    <main class="bb-corpo">
      ${merc('1x2', vivo ? tr('atualiza sozinho') : '', [['1', e.casa], ['X', tr('Empate')], ['2', e.fora]])}
      ${merc('total', o.total ? tr('linha') + ' ' + String(o.total.linha).replace('.', ',') : '', [['mais', tr('Mais de') + ' ' + String(o.total?.linha ?? '').replace('.', ',')], ['menos', tr('Menos de') + ' ' + String(o.total?.linha ?? '').replace('.', ',')]])}
      ${merc('ambas', '', [['sim', tr('Sim')], ['nao', tr('Não')]])}
    </main>${bbBarraBoletim()}${bbNav()}`;
}
function bbBoletimTela() {
  const b = bbBoletim(), tot = bbTotal(b), ganho = Math.min(10000000, Math.floor(BB.valor * tot));
  return `<header class="bb-topo"><button class="bb-ic" data-bb-ir="inicio" aria-label="${esc(tr('Fechar o boletim'))}">${BB_IC.x}</button><h1 class="bb-h1">${esc(tr('Boletim'))}</h1>
      ${b.length ? `<button class="bb-limpar" data-bb-limpar>${esc(tr('Limpar tudo'))}</button>` : ''}</header>
    <main class="bb-corpo">
      ${b.length ? `<p class="bb-tipo">${esc(b.length > 1 ? tr('Múltipla') + ` (${b.length})` : tr('Simples'))}</p>` : ''}
      ${b.map((x, i) => `<div class="bb-sel"><b>${esc(x.nome)}</b><b class="o">${bbOdd(x.odd)}</b><small>${esc(tr(BB_MERC[x.mercado]))} · ${esc(x.jogo)}</small>
        <button data-bb-tirar="${i}" aria-label="${esc(tr('Tirar do boletim'))}">${BB_IC.x}</button></div>`).join('') || `<p class="bb-vazio">${esc(tr('O boletim está vazio. Toca nas odds de um jogo para as juntar aqui.'))}</p>`}
      ${b.length > 1 && b.length < 5 ? `<div class="bb-turbo">${BB_IC.raio}<span>${esc(tr('Junta mais {0} jogos e a Acumuladora turbo dá +10% nos ganhos.').replace('{0}', 5 - b.length))}</span></div>` : ''}
    </main>
    ${b.length ? `<section class="bb-valor">
      <div class="lin"><span>${esc(tr('Odds totais'))}</span><b class="grande">${bbOdd(tot)}</b></div>
      <label>${esc(tr('Valor a apostar (Kz)'))}<input id="bbValor" type="text" inputmode="numeric" value="${bbN(BB.valor)}"></label>
      <div class="chips">${[1000, 5000, 10000].map(v => `<button data-bb-v="${v}" class="${BB.valor === v ? 'on' : ''}">${bbN(v)}</button>`).join('')}<button data-bb-v="max">${esc(tr('Máx.'))}</button></div>
      <div class="lin"><span>${esc(tr('Ganho possível'))}</span><b class="verde" id="bbGanho">${bbKz(ganho)}</b></div>
      <button class="bb-apostar" data-bb-apostar>${esc(tr('Apostar {0}').replace('{0}', bbKz(BB.valor)))}</button>
      <p class="nota">${esc(tr('Dinheiro do jogo, sem valor real · 18+ · Joga com moderação'))}</p></section>` : ''}${bbNav()}`;
}
function bbApostasTela(lista) {
  const ESTADO = { ganha: ['GANHA', 'g'], perdida: ['PERDIDA', 'p'], cash_out: ['CASH OUT', 'c'], anulada: ['ANULADA', 'p'] };
  const perna = s => { const sinal = s.estado === 'ganha' ? '✓' : s.estado === 'perdida' ? '✕' : s.ev_estado === 'ao_vivo' ? '•' : '';
    return `<li><span class="s ${s.estado === 'ganha' ? 'g' : s.estado === 'perdida' ? 'p' : s.ev_estado === 'ao_vivo' ? 'v' : ''}">${sinal}</span><div><b>${esc(bbNomeSel({ casa: s.casa, fora: s.fora, odds: { total: { linha: s.linha } } }, s.mercado, s.selecao))}</b>
      <small>${esc(s.casa)} vs ${esc(s.fora)}${s.ev_estado === 'ao_vivo' ? ` · ${s.gc ?? 0}–${s.gf ?? 0} ${esc(s.minuto || '')}` : s.ev_estado === 'terminado' ? ` · ${s.gc}–${s.gf}` : ''}</small></div><b>${bbOdd(s.odd)}</b></li>`; };
  const cartao = a => a.estado === 'aberta' ? `<article class="bb-ap">
      <div class="cab"><div><b>${esc(a.selecoes.length > 1 ? tr('Múltipla') + ' · ' + a.selecoes.length + ' ' + tr('seleções') : tr('Simples'))}</b><small>${esc(tr('Apostaste {0} · odds {1}').replace('{0}', bbKz(a.valor)).replace('{1}', bbOdd(a.odd)))}</small></div></div>
      <ul>${a.selecoes.map(perna).join('')}</ul>
      <div class="pe"><div class="lin"><span>${esc(tr('Ganho possível'))}</span><b class="verde">${bbKz(a.ganho)}</b></div>
      ${a.cash > 0 ? `<button class="bb-cash" data-bb-cash="${a.id}">${esc(tr('Cash out {0}').replace('{0}', bbKz(a.cash)))}</button><small>${esc(tr('O valor do cash out muda com o jogo ao vivo'))}</small>` : ''}</div></article>`
    : `<article class="bb-res ${ESTADO[a.estado]?.[1] || ''}"><span class="selo">${esc(tr(ESTADO[a.estado]?.[0] || a.estado))}</span><div><b>${esc(a.selecoes.length > 1 ? tr('Múltipla') + ' (' + a.selecoes.length + ')' : `${a.selecoes[0]?.casa} vs ${a.selecoes[0]?.fora}`)}</b><small>${bbKz(a.valor)} → ${bbKz(a.pago)}</small></div></article>`;
  return `<header class="bb-topo"><h1 class="bb-h1">${esc(tr('As minhas apostas'))}</h1><button class="bb-ic" data-bb-fechar aria-label="${esc(tr('Fechar'))}">${BB_IC.x}</button></header>
    <div class="bb-abas" role="tablist"><button role="tab" data-bb-aba="1" class="${BB.aba ? 'on' : ''}">${esc(tr('Abertas'))}</button><button role="tab" data-bb-aba="0" class="${BB.aba ? '' : 'on'}">${esc(tr('Resolvidas'))}</button></div>
    <main class="bb-corpo">${lista ? (lista.map(cartao).join('') || `<p class="bb-vazio">${esc(tr(BB.aba ? 'Não tens apostas abertas.' : 'Ainda não tens apostas resolvidas.'))}</p>`) : `<p class="bb-vazio">${esc(tr('A carregar…'))}</p>`}</main>${bbNav()}`;
}
function bbPromos() {
  const st = BB.est || {}, pct = Math.min(100, Math.round(100 * (st.hoje || 0) / (st.limite || 500000)));
  const P = [['+25%', 'Acumuladora turbo', 'Junta 5 ou mais jogos e ganhas até +25% em cima do prémio.'], ['GIRA', 'Odds aumentadas na Girabola', 'Todos os sábados, os jogos grandes do campeonato angolano com odds melhores.'],
    ['1x', 'Aposta grátis da semana', 'Faz 3 apostas de 2.000 Kz até domingo e recebes uma aposta grátis de 2.000 Kz.'], ['TOP', 'Desafio do apostador', 'Quem acertar mais resultados da semana entra no ranking e ganha uma coroa.']];
  return `<header class="bb-topo"><h1 class="bb-h1">${esc(tr('Promoções'))}</h1><button class="bb-ic" data-bb-fechar aria-label="${esc(tr('Fechar'))}">${BB_IC.x}</button></header>
    <main class="bb-corpo">${P.map(([s, t, d]) => `<article class="bb-pr"><span class="selo">${esc(s)}</span><div><b>${esc(tr(t))}</b><small>${esc(tr(d))}</small></div><span class="breve">${esc(tr('Em breve'))}</span></article>`).join('')}
      <section class="bb-resp"><h2>${BB_IC.escudo}${esc(tr('Jogo responsável'))}</h2>
        <div class="lin"><span>${esc(tr('Limite diário de apostas'))}</span><b>${bbKz(st.limite || 500000)}</b></div>
        <div class="lin"><span>${esc(tr('Já apostaste hoje'))}</span><b>${bbKz(st.hoje || 0)}</b></div>
        <div class="barra"><i style="width:${pct}%"></i></div>
        <p>${esc(tr('Aqui só se aposta dinheiro do jogo: não se compra com dinheiro real nem se levanta. Quem compra Kz não pode apostar. 18+.'))}</p></section></main>${bbNav()}`;
}
function bbEntrada() {
  return `<div class="bb-entrada"><div class="cima"><span class="bb-marca grande">${BB_IC.logo}</span><b class="bb-nome">BANDA<i>BET</i></b>
      <p>${esc(tr('Apostas em jogos de verdade — futebol, basquetebol, ténis e combates — com o dinheiro do teu jogo.'))}</p></div>
    <section class="caixa"><h1>${esc(tr('Tens 18 anos ou mais?'))}</h1>
      <ul><li>${esc(tr('Só se aposta dinheiro do jogo. Não tem valor real e não se levanta.'))}</li><li>${esc(tr('Quem compra Kz (nesta conta ou noutra do mesmo aparelho) não pode apostar.'))}</li><li>${esc(tr('Limite de 500.000 Kz em apostas por dia.'))}</li></ul>
      <label><input type="checkbox" id="bb18"> ${esc(tr('Confirmo que tenho 18 anos ou mais'))}</label>
      <button class="bb-apostar" data-bb-18 disabled>${esc(tr('Entrar na BandaBet'))}</button>
      <button class="bb-nao" data-bb-fechar>${esc(tr('Agora não'))}</button></section></div>`;
}
function bbBloqueado() {
  return `${bbTopo()}<main class="bb-corpo"><section class="bb-resp"><h2>${BB_IC.escudo}${esc(tr('Os jogos a dinheiro estão fechados para ti'))}</h2>
    <p>${esc(tr('Compraste Kz (nesta conta ou noutra do mesmo aparelho). Quem compra Kz não pode jogar a dinheiro.'))}</p></section></main>`;
}

function bbDesenhar(lista) {
  const v = document.getElementById('bandabet'); if (!v) return;
  const st = BB.est || {};
  v.innerHTML = st.sem_jogos ? bbBloqueado() : !st.apostas_18 ? bbEntrada()
    : BB.tela === 'jogo' ? bbJogo() : BB.tela === 'boletim' ? bbBoletimTela() : BB.tela === 'apostas' ? bbApostasTela(lista) : BB.tela === 'promos' ? bbPromos() : bbInicio(BB.tela === 'aovivo');
  v.querySelectorAll('[data-bb-fechar]').forEach(b => b.onclick = fecharBandaBet);
  v.querySelectorAll('[data-bb-ir]').forEach(b => b.onclick = () => { BB.tela = b.dataset.bbIr; if (BB.tela === 'apostas') bbIrApostas(); else bbDesenhar(); v.querySelector('.bb-corpo')?.scrollTo(0, 0); });
  v.querySelectorAll('[data-bb-desp]').forEach(b => b.onclick = () => { BB.desporto = b.dataset.bbDesp; bbDesenhar(); });
  v.querySelectorAll('[data-bb-jogo]').forEach(b => b.onclick = () => { BB.ev = BB.eventos.find(e => e.id === b.dataset.bbJogo); BB.tela = 'jogo'; bbDesenhar(); });
  v.querySelectorAll('[data-bb-odd]').forEach(b => b.onclick = () => {
    const [id, m, s] = b.dataset.bbOdd.split('|'), e = BB.eventos.find(x => x.id === id); if (!e) return;
    let bol = bbBoletim(); const ja = bol.findIndex(x => x.evento === id);
    if (ja >= 0 && bol[ja].mercado === m && bol[ja].selecao === s) bol.splice(ja, 1);
    else { if (ja >= 0) bol.splice(ja, 1); if (bol.length >= 10) return toast(tr('Máximo 10 seleções no boletim.'), 'info'); bol.push({ evento: id, mercado: m, selecao: s, odd: e.odds[m][s], nome: bbNomeSel(e, m, s), jogo: `${e.casa} vs ${e.fora}` }); }
    bbGuardarBoletim(bol); bbDesenhar();
  });
  v.querySelectorAll('[data-bb-tirar]').forEach(b => b.onclick = () => { const bol = bbBoletim(); bol.splice(+b.dataset.bbTirar, 1); bbGuardarBoletim(bol); bbDesenhar(); });
  v.querySelector('[data-bb-limpar]')?.addEventListener('click', () => { bbGuardarBoletim([]); bbDesenhar(); });
  const inp = v.querySelector('#bbValor');
  if (inp) inp.oninput = () => { BB.valor = Math.max(0, parseInt(inp.value.replace(/\D/g, ''), 10) || 0); const tot = bbTotal(bbBoletim()); v.querySelector('#bbGanho').textContent = bbKz(Math.min(10000000, Math.floor(BB.valor * tot))); v.querySelector('[data-bb-apostar]').textContent = tr('Apostar {0}').replace('{0}', bbKz(BB.valor)); };
  v.querySelectorAll('[data-bb-v]').forEach(b => b.onclick = () => { BB.valor = b.dataset.bbV === 'max' ? Math.max(100, Math.min(200000, J?.kumbu || 0, (BB.est?.limite || 500000) - (BB.est?.hoje || 0))) : +b.dataset.bbV; bbDesenhar(); });
  v.querySelector('[data-bb-apostar]:not([data-bb-18])')?.addEventListener('click', async ev => {
    const bt = ev.currentTarget; bt.disabled = true;
    const sel = bbBoletim().map(({ evento, mercado, selecao }) => ({ evento, mercado, selecao }));
    const r = await acao('desp_apostar', { p_sel: sel, p_valor: BB.valor });
    if (r) { bbGuardarBoletim([]); await bbCarregar(); BB.tela = 'apostas'; BB.aba = true; bbIrApostas(); } else bt.disabled = false;
  });
  const c18 = v.querySelector('#bb18'), b18 = v.querySelector('[data-bb-18]');
  if (c18) c18.onchange = () => { b18.disabled = !c18.checked; };
  b18?.addEventListener('click', async () => { b18.disabled = true; const { error } = await sb.rpc('desp_confirmar_18'); if (error) { toast(limparErro(error.message), 'mau'); b18.disabled = false; return; } await bbCarregar(); bbDesenhar(); });
  v.querySelectorAll('[data-bb-aba]').forEach(b => b.onclick = () => { BB.aba = b.dataset.bbAba === '1'; bbIrApostas(); });
  v.querySelectorAll('[data-bb-cash]').forEach(b => b.onclick = async () => {
    if (!await perguntar(b.textContent.trim() + '?', tr('Sim'), tr('Cancelar'))) return;
    b.disabled = true; if (await acao('desp_cash_out', { p_aposta: +b.dataset.bbCash })) bbIrApostas(); else b.disabled = false;
  });
}
async function bbIrApostas() {
  bbDesenhar(null);
  const { data } = await sb.rpc('desp_minhas', { p_abertas: BB.aba });
  if (BB.tela === 'apostas') bbDesenhar(data || []);
}
