/* ============================================================
   Vida na Banda — PAINEL DE ADMIN por páginas (FILA 0bi, item 3; dono 2 nov 21:34: «I need pages, segregations»)
   Início · Jogadores · Um jogador · Anúncios · Dinheiro · Segurança. Tudo vem de RPCs só para admins (o servidor recusa os outros).
   Textos em PT; o idioma.js traduz (en/fr em i18n/manual).
   ============================================================ */
let admPag = 'inicio', admArg = null, admAba = 'rever', admBody = null;
const admLista = { busca: '', filtro: 'todos', ordem: 'recentes', pagina: 0 };
const admT = iso => tr(tempoRel(iso));
const admN = v => Number(v || 0).toLocaleString('pt-PT');
const admCent = (c, m) => (m === 'EUR' ? '€' : m === 'USD' ? 'US$ ' : m === 'GBP' ? '£' : (m || '') + ' ') + (Number(c || 0) / 100).toFixed(2);
const admErro = (el, error) => { if (el) el.innerHTML = `<div class="empty">${esc(limparErro(error.message))}</div>`; };
function admIr(pag, arg = null, aba = null) { admPag = pag; admArg = arg; if (aba) admAba = aba; if (admBody) { admBody.scrollTop = 0; renderAdmin(admBody); } }
async function admAbrirNome(nome) {   // alertas e denúncias trazem o nome: abre a ficha
  const { data, error } = await sb.rpc('admin_jogadores', { p_busca: nome, p_filtro: 'todos', p_ordem: 'nome', p_pagina: 0 });
  if (error) return toast(limparErro(error.message), 'mau');
  const j = (data.linhas || []).find(x => x.nome.toLowerCase() === String(nome).toLowerCase()) || (data.linhas || [])[0];
  if (j) admIr('jogador', j.id); else toast('Não encontrei esse jogador.', 'mau');
}
// FILA 0do (dono 6 nov, desenho aprovado no Claude Design): secções em botões grandes com ícone e cor; Servidor tem a manutenção e a saúde
const ADM_SEC = [
  ['jogadores', 'social', 'Jogadores', '#35c2b4'],
  ['dinheiro', 'grafico', 'Dinheiro', '#ffcb00'],
  ['anuncios', 'megafone', 'Anúncios', '#f07c2a'],
  ['seguranca', 'admin', 'Segurança', '#ff4d63'],
  ['canal', 'falar', 'Canal', '#a98bff'],
  ['servidor', 'luz', 'Servidor', '#4cbf74'],
];
function admTopo(titulo, voltar = 'inicio') {
  return `<div class="admTopo"><button class="btn sm ghost" type="button" data-volta="${voltar}">← ${esc(tr(voltar === 'inicio' ? 'Admin' : 'Jogadores'))}</button><h3>${titulo}</h3></div>`;
}

async function renderAdmin(body) {
  admBody = body;
  const pag = { inicio: admInicio, jogadores: admJogadores, jogador: admJogador, anuncios: admAnuncios, dinheiro: admDinheiro, seguranca: admSeguranca, canal: admCanal, servidor: admServidor }[admPag] || admInicio;
  await pag(body);
  body.querySelectorAll('[data-volta]').forEach(b => b.onclick = () => admIr(b.dataset.volta));
  body.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => admIr(b.dataset.ir, null, b.dataset.aba || null));
}

/* ---------- 🏠 Início (desenho aprovado: o que precisa de ti primeiro, números grandes, secções em botões) ---------- */
async function admInicio(body) {
  const hoje = new Date().toLocaleDateString(lingua === 'en' ? 'en-GB' : lingua === 'fr' ? 'fr-FR' : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
  body.innerHTML = `<div class="admCab"><div><h3>${esc(tr('Admin'))}</h3><small>${esc(hoje)} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div><span class="admOn" id="admOn"><i></i><b>…</b> ${esc(tr('online'))}</span></div>
    <div id="admPrecisa"></div>
    <div id="admNum"><div class="empty">A carregar…</div></div>
    <div class="admCartao"><div class="admLinha"><small>${esc(tr('Online por hora · hoje'))}</small><small id="admPico"></small></div><div id="admHoras"></div></div>
    <div id="admJogo"></div>
    <div class="admSec">${ADM_SEC.map(([k, ic, n, cor]) => `<button type="button" data-ir="${k}" style="color:${cor}">${icone(ic, 28)}<b>${esc(tr(n))}</b></button>`).join('')}</div>`;
  const [{ data: d, error }, est] = await Promise.all([sb.rpc('admin_inicio'), sb.rpc('admin_estatisticas')]);
  if (error) return admErro(body.querySelector('#admNum'), error);
  const e = est.data || {}, v = e.voltaram_no_dia_seguinte || {}, dh = d.dinheiro_hoje || {};
  const din = [...(dh.ouro || []).map(x => admCent(x.centimos, x.moeda)), dh.anuncios_eur_cent ? admCent(dh.anuncios_eur_cent, 'EUR') : '', dh.anuncios_usd_cent ? admCent(dh.anuncios_usd_cent, 'USD') : '', dh.kz_confirmados ? fmtKz(dh.kz_confirmados) : ''].filter(Boolean);
  body.querySelector('#admOn b').textContent = admN(d.online);
  body.querySelector('#admNum').innerHTML = `<div class="admNums">
      <div class="admNum"><span>${esc(tr('Novos hoje'))}</span><b data-sem-traducao>${admN(d.novos_hoje)}</b><small class="ok" data-sem-traducao>${admN(d.total)} ${esc(tr('no total'))}</small></div>
      <div class="admNum"><span>${esc(tr('Jogaram hoje'))}</span><b data-sem-traducao>${admN(d.jogaram_hoje)}</b><small data-sem-traducao>${v.criados ? Math.round(100 * v.voltaram / v.criados) + '% ' + esc(tr('voltaram no dia seguinte')) : admN(d.jogaram_7d) + ' ' + esc(tr('em 7 dias'))}</small></div>
      <button type="button" class="admNum admDin" data-ir="dinheiro"><span>${esc(tr('Dinheiro real hoje'))}</span><b data-sem-traducao>${din.length ? din.join(' + ') : '0'}</b><small>${esc(tr('Ver quanto ganhamos'))} ›</small></button></div>`;
  const p = d.precisa || {}, itens = [
    ['anuncios', 'rever', 'megafone', p.anuncios, 'anúncios para rever'], ['dinheiro', null, 'banco', p.pagamentos, 'pagamentos em Kz por confirmar'],
    ['seguranca', null, 'aviso', p.alertas, 'alertas de abuso'], ['seguranca', null, 'aviso', p.denuncias, 'denúncias (24 h)']];
  const urg = itens.filter(x => x[3] > 0);
  body.querySelector('#admPrecisa').innerHTML = `<div class="sub2 admOuro">${esc(tr('Precisa de ti'))}</div>` + (urg.length
    ? `<div class="admUrgs">${urg.map(([pg, aba, ic, n, t]) => `<button class="admUrg" type="button" data-ir="${pg}" ${aba ? `data-aba="${aba}"` : ''}>${icone(ic, 22)}<b data-sem-traducao>${n}</b><span>${esc(tr(t))}</span><i>›</i></button>`).join('')}</div>`
    : `<div class="empty">✅ ${esc(tr('Nada à tua espera.'))}</div>`);
  const H = d.por_hora || [], max = Math.max(1, ...H.map(x => x.n));
  body.querySelector('#admPico').textContent = `${tr('pico')} ${admN(d.pico_hoje)}`;
  body.querySelector('#admHoras').innerHTML = `<div class="admBarras">${Array.from({ length: 24 }, (_, h) => { const x = H.find(y => y.h === h); return `<div title="${h}h: ${x ? x.n : 0}"><i style="height:${x ? Math.max(3, Math.round(100 * x.n / max)) : 0}%"></i>${h % 6 === 0 ? `<small>${h}h</small>` : ''}</div>`; }).join('')}</div>`;
  body.querySelectorAll('#admPrecisa [data-ir], #admNum [data-ir]').forEach(b => b.onclick = () => admIr(b.dataset.ir, null, b.dataset.aba || null));
  admJogoStats(body.querySelector('#admJogo'));
  const ec = document.createElement('div'); body.querySelector('#admJogo')?.after(ec); admEconomia(ec);
}

/* ---------- 🏛️ Economia: o que a ronda diária tirou (dono 6 nov 23:16) ---------- */
async function admEconomia(el) {
  if (!el) return;
  const { data, error } = await sb.rpc('admin_economia');
  if (error) return admErro(el, error);
  const D = data || [], k = v => fmtKz(+v || 0);
  el.innerHTML = `<div class="admCartao"><div class="admLinha"><small>🏛️ ${esc(tr('Economia · o que saiu do jogo por dia'))}</small></div>
    ${D.length ? D.slice(0, 7).map(x => `<details><summary class="admLinha"><small data-sem-traducao>${esc(x.dia)}</small><b data-sem-traducao>${k(+x.imposto_riqueza + +x.manutencao + +x.multas + +x.roubos + +x.apreendido)}</b></summary>
      <div class="admLinha"><small>${esc(tr('Imposto sobre o património'))} (<span data-sem-traducao>${x.jogadores_taxados}</span>)</small><small data-sem-traducao>${k(x.imposto_riqueza)}</small></div>
      <div class="admLinha"><small>${esc(tr('Manutenção das casas'))} (<span data-sem-traducao>${x.leiloes}</span> ${esc(tr('leilões'))})</small><small data-sem-traducao>${k(x.manutencao)}</small></div>
      <div class="admLinha"><small>${esc(tr('Multas de estacionamento'))}</small><small data-sem-traducao>${k(x.multas)}</small></div>
      <div class="admLinha"><small>${esc(tr('Dinheiro vivo roubado'))}</small><small data-sem-traducao>${k(x.roubos)}</small></div>
      <div class="admLinha"><small>${esc(tr('Levado pelo Governo'))}</small><small data-sem-traducao>${k(x.apreendido)}</small></div></details>`).join('')
    : `<small>${esc(tr('A primeira ronda corre hoje às 23:30.'))}</small>`}</div>`;
}

/* ---------- 💷 Pagamento estimado da Stripe (dono 6 nov: «the 222 that we made today can be very deceiving… real estimated payout… VAT, WHT… weekly on mondays») ---------- */
const admLibra = v => '£' + Number(v || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function admPagamento(el) {
  if (!el) return;
  const { data: p, error } = await sb.rpc('admin_pagamentos');
  if (error) return admErro(el, error);
  const loc = lingua === 'en' ? 'en-GB' : lingua === 'fr' ? 'fr-FR' : 'pt-PT';
  const dia = d => new Date(d + 'T12:00:00').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
  const S = p.semanas || [], prox = S.find(x => x.estado === 'proximo'), R = p.regras || {};
  const pct = x => (Math.round(x * 1000) / 10).toString().replace('.', lingua === 'en' ? '.' : ',') + '%';
  const linha = (t, v, forte) => `<div class="admLinha"><small style="${forte ? 'color:var(--ink);font-weight:800' : ''}">${t}</small><small data-sem-traducao style="${forte ? 'color:var(--ink);font-weight:800' : ''}">${v}</small></div>`;
  el.innerHTML = `<div class="admCartao" style="border-color:var(--gold)">
      <div class="admLinha"><small>💷 ${esc(tr('Próximo pagamento da Stripe (estimativa)'))}</small><small data-sem-traducao>${prox ? esc(dia(prox.segunda)) : '—'}</small></div>
      <b data-sem-traducao style="font-family:var(--f-disp),sans-serif;font-size:28px">${admLibra(prox?.liquido_gbp)}</b>
      ${prox ? `${linha(esc(tr('Vendas')) + ` (<span data-sem-traducao>${prox.vendas}</span>)`, admLibra(prox.bruto_gbp))}
        ${linha('− ' + esc(tr('Comissão do cartão')) + ` <span data-sem-traducao>(${pct(R.cartao_pct)} + 20p)</span>`, '−' + admLibra(prox.cartao_gbp))}
        ${linha('− ' + esc(tr('Conversão de moeda')) + ` <span data-sem-traducao>(${pct(R.fx_pct)})</span>`, '−' + admLibra(prox.fx_gbp))}
        ${linha('− Managed Payments' + ` <span data-sem-traducao>(${pct(R.managed_pct)})</span>`, '−' + admLibra(prox.managed_gbp))}
        ${linha('− ' + esc(tr('IVA / impostos retidos (estimativa)')) + ` <span data-sem-traducao>(${pct(R.imposto_pct)})</span>`, '−' + admLibra(prox.imposto_gbp))}
        ${linha('= ' + esc(tr('Chega ao banco')), admLibra(prox.liquido_gbp), true)}` : `<small>${esc(tr('Ainda não há vendas para o próximo pagamento.'))}</small>`}
      <div class="admNums" style="margin-top:6px">
        <div class="admNum"><span>${esc(tr('Hoje: vendas → fica'))}</span><b data-sem-traducao style="font-size:18px">${admLibra(p.hoje_vendas?.bruto_gbp)} → ${admLibra(p.hoje_vendas?.liquido_gbp)}</b></div>
        <div class="admNum"><span>${esc(tr('Este mês: vendas → fica'))}</span><b data-sem-traducao style="font-size:18px">${admLibra(p.mes?.bruto_gbp)} → ${admLibra(p.mes?.liquido_gbp)}</b></div></div>
      ${S.length ? `<details><summary><small>${esc(tr('Todas as segundas-feiras'))}</small></summary>${S.map(x => linha(`${esc(dia(x.segunda))} · ${esc(tr(x.estado === 'pago' ? 'pago' : x.estado === 'proximo' ? 'próximo' : 'a seguir'))} · <span data-sem-traducao>${x.vendas}</span> ${esc(tr('vendas'))}`, `${admLibra(x.bruto_gbp)} → <b>${admLibra(x.liquido_gbp)}</b>`)).join('')}</details>` : ''}
      <small style="color:var(--muted)">${esc(tr('Cada venda fica disponível ~7 dias depois e entra na segunda-feira seguinte. Cartões de fora do Reino Unido pagam mais (EEA 2,5%, outros 3,25%).'))}</small></div>`;
}

/* ---------- 🎯 Conversão (dono 8 nov: «MAKE THAT VISIBLE live») — quem paga entre quem voltou no dia 2, e quem abre o pagamento e desiste ---------- */
async function admConversao(el) {
  if (!el) return;
  const { data: c, error } = await sb.rpc('admin_conversao', { p_dias: 7 });
  if (error) { el.innerHTML = ''; return; }   // migração ainda não aplicada: não mostra nada
  const pc = (a, b) => b ? (Math.round(1000 * a / b) / 10).toString().replace('.', lingua === 'en' ? '.' : ',') + '%' : '—';
  const n = v => Number(v || 0).toLocaleString(lingua === 'en' ? 'en-GB' : 'pt-PT');
  const desist = (+c.abertos || 0) - (+c.pagos || 0);
  el.innerHTML = `<div class="admCartao">
      <div class="admLinha"><small>🎯 ${esc(tr('Conversão'))}</small><small data-sem-traducao>${esc(tr('pagamentos: últimos 7 dias'))}</small></div>
      <div class="admNums">
        <div class="admNum"><span>${esc(tr('Pagam, entre quem voltou no dia 2'))}</span><b data-sem-traducao>${pc(c.d2_pagaram, c.d2_voltaram)}</b><small data-sem-traducao>${n(c.d2_pagaram)} / ${n(c.d2_voltaram)}</small></div>
        <div class="admNum"><span>${esc(tr('Pagam, entre todas as contas'))}</span><b data-sem-traducao>${pc(c.pagantes, c.contas)}</b><small data-sem-traducao>${n(c.pagantes)} / ${n(c.contas)}</small></div>
        <div class="admNum"><span>${esc(tr('Voltam no dia 2'))}</span><b data-sem-traducao>${pc(c.d2_voltaram, c.d2_contas)}</b><small data-sem-traducao>${n(c.d2_voltaram)} / ${n(c.d2_contas)}</small></div></div>
      <div class="admNums" style="margin-top:6px">
        <div class="admNum"><span>${esc(tr('Abriram o pagamento'))}</span><b data-sem-traducao>${n(c.abertos)}</b><small data-sem-traducao>${n(c.pessoas_abriram)} ${esc(tr('pessoas'))}</small></div>
        <div class="admNum"><span>${esc(tr('Pagaram'))}</span><b data-sem-traducao>${n(c.pagos)}</b><small data-sem-traducao>${pc(c.pagos, c.abertos)}</small></div>
        <div class="admNum"><span>${esc(tr('Desistiram'))}</span><b data-sem-traducao style="color:${desist > 0 ? 'var(--c-perigo)' : 'inherit'}">${n(desist)}</b><small data-sem-traducao>${pc(desist, c.abertos)}</small></div></div>
      ${(c.por_pacote || []).length ? `<details><summary><small>${esc(tr('Por pacote'))}</small></summary>${c.por_pacote.map(x => `<div class="admLinha"><small data-sem-traducao>${esc(x.pacote)}</small><small data-sem-traducao>${n(x.pagos)} / ${n(x.abertos)} · ${pc(x.pagos, x.abertos)}</small></div>`).join('')}</details>` : ''}
      <small style="color:var(--muted)">${esc(tr('Os pagamentos abertos contam desde'))} <span data-sem-traducao>${c.desde ? esc(new Date(c.desde).toLocaleDateString(lingua === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' })) : '—'}</span>. ${esc(tr('Dia 2 = o dia a seguir ao registo (hora de Luanda).'))}</small></div>`;
}

/* ---------- 📊 Jogo: online por hora (24 h), onde estão, jet ski (dono 6 nov) ---------- */
async function admJogoStats(el) {
  if (!el) return;
  const { data: d, error } = await sb.rpc('admin_stats_jogo');
  if (error) return admErro(el, error);
  const H = d.por_hora || [], mx = Math.max(1, ...H.map(x => x.max));
  const B = (d.bairros_24h || []).slice(0, 6), bmx = Math.max(1, ...B.map(x => +x.media));
  const j = d.jetski_24h || {}, jt = d.jetski_total || {};
  const seg = s => s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 ? (s % 60) + ' s' : ''}` : `${s || 0} s`;
  el.innerHTML = `<div class="admCartao"><div class="admLinha"><small>${esc(tr('Online por hora · últimas 24 h'))}</small><small data-sem-traducao>${d.pico_7d ? esc(tr('pico 7 dias')) + ' ' + admN(d.pico_7d.n) : ''}</small></div>
      <div class="admBarras">${H.map((x, i) => { const h = new Date(x.hora).getHours(); return `<div title="${h}h: ${x.max}"><i style="height:${Math.max(3, Math.round(100 * x.max / mx))}%"></i>${h % 6 === 0 ? `<small>${h}h</small>` : ''}</div>`; }).join('')}</div></div>
    <div class="admCartao"><div class="admLinha"><small>${esc(tr('Onde estão os jogadores · média 24 h'))}</small></div>
      ${B.map(x => `<div class="admLinha"><small style="min-width:84px;color:var(--ink)">${esc(typeof bairro === 'function' ? (bairro(x.bairro)?.nome || x.bairro) : x.bairro)}</small><span style="flex:1;align-self:center;height:8px;border-radius:5px;background:var(--line);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(100 * x.media / bmx)}%;background:var(--gold)"></i></span><small data-sem-traducao>${x.media}</small></div>`).join('') || `<small>—</small>`}</div>
    <div class="admCartao"><div class="admLinha"><small>🌊 ${esc(tr('Jet ski · últimas 24 h'))}</small><small data-sem-traducao>${admN(jt.corridas)} ${esc(tr('corridas desde'))} ${esc(jt.desde || '')}</small></div>
      <div class="admNums">
        <div class="admNum"><span>${esc(tr('Jogadores'))}</span><b data-sem-traducao>${admN(j.jogadores)}</b><small data-sem-traducao>${admN(j.corridas)} ${esc(tr('corridas'))}</small></div>
        <div class="admNum"><span>${esc(tr('Uma corrida dura'))}</span><b data-sem-traducao>${seg(j.mediana_s)}</b><small data-sem-traducao>${esc(tr('9 em 10 abaixo de'))} ${seg(j.p90_s)}</small></div>
        <div class="admNum"><span>${esc(tr('Tempo total'))}</span><b data-sem-traducao>${admN(j.minutos_total)} min</b><small data-sem-traducao>🪙 ${admN(j.ouro_continuar)} ${esc(tr('Ouro a continuar'))}</small></div></div></div>`;
}

/* ---------- 🖥️ Servidor: manutenção e saúde (saíram do Início para o deixar limpo) ---------- */
async function admServidor(body) {
  body.innerHTML = `${admTopo('🖥️ ' + tr('Servidor'))}
    <div class="sub2">🔧 Manutenção (avisar os jogadores)</div><div class="row" style="flex-wrap:wrap;gap:8px"><div class="t" style="flex-basis:100%"><small>Antes de mudar o tamanho da base (reinicia uns minutos), marca a hora: todos veem uma faixa com a contagem.</small></div>
      <input class="inp" id="manEm" type="datetime-local" style="flex:1 1 180px"><input class="inp" id="manMin" type="number" min="1" max="120" value="5" style="width:80px" aria-label="Minutos">
      <button class="btn sm" id="manSim" type="button">Avisar</button><button class="btn sm ghost" id="manNao" type="button">Cancelar aviso</button><small id="manEstado" style="flex-basis:100%"></small></div>
    <div class="sub2">Saúde do servidor</div><div id="admSaude"><div class="empty">A carregar…</div></div>`;
  const manEst = body.querySelector('#manEstado'), pintaMan = m => { manEst.textContent = m ? `Marcada: ${new Date(m.em).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })} · ${m.minutos} min` : 'Nenhuma manutenção marcada.'; };
  sb.rpc('aviso_manutencao').then(({ data }) => pintaMan(data));
  body.querySelector('#manSim').onclick = async () => {
    const v = body.querySelector('#manEm').value; if (!v) return toast('Escolhe a hora.', 'mau');
    const { data, error } = await sb.rpc('admin_manutencao', { p_em: new Date(v).toISOString(), p_minutos: parseInt(body.querySelector('#manMin').value, 10) || 5 });
    if (error) return toast(limparErro(error.message), 'mau'); pintaMan(data); verManutencao(); toast('Aviso posto: os jogadores já veem a faixa.', 'bom');
  };
  body.querySelector('#manNao').onclick = async () => { const { error } = await sb.rpc('admin_manutencao', { p_em: null }); if (error) return toast(limparErro(error.message), 'mau'); pintaMan(null); verManutencao(); };
  const [{ data: d, error }, est] = await Promise.all([sb.rpc('admin_inicio'), sb.rpc('admin_estatisticas')]);
  if (error) return admErro(body.querySelector('#admSaude'), error);
  const e = est.data || {}, a = d.ultima_amostra, S = d.saude || [];
  body.querySelector('#admSaude').innerHTML = `<div class="list">
    ${a ? `<div class="row"><span class="e">🗄️</span><div class="t"><b data-sem-traducao>${a.ligacoes}/${a.max_ligacoes} ${tr('ligações')} · CPU ${Math.round(a.cpu || 0)}% · RAM ${Math.round(a.ram || 0)}%</b><small>${tr('última medição')} ${admT(a.em)}</small></div></div>` : ''}
    ${S.map(s => `<div class="row"><span class="e">${s.mau ? '🔴' : '🟢'}</span><div class="t"><b data-sem-traducao>${esc(s.chave)}</b><small>${esc(s.detalhe || '')}${s.desde ? ' · ' + admT(s.desde) : ''}</small></div></div>`).join('')}
    <div class="row"><span class="e">🐞</span><div class="t"><b>Erros (24 h)</b><small data-sem-traducao>${admN(e.erros_24h)}</small></div></div>
    ${(e.erros_top || []).map(x => `<div class="row"><div class="t"><b>${esc(x.msg)}</b><small>${esc(x.origem || '')} · ${x.vezes}× · ${x.jogadores} jogador(es)</small></div></div>`).join('')}</div>`;
}

const ADM_FILTROS = [['todos', 'Todos'], ['online', 'Online'], ['novos', 'Novos hoje'], ['vigiar', 'Para vigiar'], ['banidos', 'Suspensos ou silenciados']];
const ADM_ORDENS = [['recentes', 'Vistos há menos tempo'], ['novos', 'Mais novos'], ['ricos', 'Mais ricos'], ['nome', 'Nome']];
async function admJogadores(body) {
  const L = admLista;
  body.innerHTML = `${admTopo('👥 Jogadores')}
    <form id="admBusca" style="display:flex;gap:8px"><input class="inp" id="admQ" type="search" maxlength="40" placeholder="${esc(tr('Nome do jogador'))}" value="${esc(L.busca)}" style="flex:1"><button class="btn sm" type="submit">🔎</button></form>
    <div class="tabs" style="flex-wrap:wrap;margin-top:8px">${ADM_FILTROS.map(([k, t]) => `<button type="button" data-f="${k}" class="${L.filtro === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <label style="margin-top:8px">Ordenar</label><select class="inp" id="admOrdem">${ADM_ORDENS.map(([k, t]) => `<option value="${k}" ${L.ordem === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <div id="admJs" style="margin-top:10px"><div class="empty">A carregar…</div></div>`;
  body.querySelector('#admBusca').onsubmit = ev => { ev.preventDefault(); L.busca = body.querySelector('#admQ').value.trim(); L.pagina = 0; admIr('jogadores'); };
  body.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { L.filtro = b.dataset.f; L.pagina = 0; admIr('jogadores'); });
  body.querySelector('#admOrdem').onchange = ev => { L.ordem = ev.target.value; L.pagina = 0; admIr('jogadores'); };
  const { data, error } = await sb.rpc('admin_jogadores', { p_busca: L.busca || null, p_filtro: L.filtro, p_ordem: L.ordem, p_pagina: L.pagina });
  const lj = body.querySelector('#admJs'); if (error) return admErro(lj, error);
  const R = data.linhas || [], paginas = Math.ceil(data.total / data.por_pagina);
  const online = j => j.visto_em && Date.now() - new Date(j.visto_em) < 300e3;
  lj.innerHTML = `<small class="m" data-sem-traducao>${admN(data.total)} ${tr(data.total === 1 ? 'jogador' : 'jogadores')}</small>
    ${R.length ? `<div class="list">${R.map(j => `<button class="row admJ ${j.banido ? 'mau' : ''}" type="button" data-j="${j.id}" style="text-align:left"><span class="admAv" style="background:${['#2c6fb0', '#7a4b8c', '#2f8f5b', '#f07c2a', '#16a3a3', '#cc092f'][(j.nome || '?').charCodeAt(0) % 6]}" data-sem-traducao>${esc((j.nome || '?')[0].toUpperCase())}${online(j) ? '<i></i>' : ''}</span><div class="t">
      <b data-sem-traducao>${esc(j.nome)}${j.admin ? ' 🛡️' : ''}${j.banido ? ' ⛔' : ''}${j.mudo_ate && new Date(j.mudo_ate) > new Date() ? ' 🔇' : ''}${j.alertas > 0 ? ` 🚨${j.alertas}` : ''}${j.denuncias > 0 ? ` 🚩${j.denuncias}` : ''}</b>
      <small><span data-sem-traducao>${esc(bairro(j.bairro)?.nome || j.bairro || '')}</span> · ${online(j) ? `<span class="ok">${esc(tr('online'))}</span>` : `${tr('visto')} ${j.visto_em ? admT(j.visto_em) : '—'}`}</small></div><b class="admKz" data-sem-traducao>${fmtKz(j.kumbu)}</b></button>`).join('')}</div>` : '<div class="empty">Ninguém com esses filtros.</div>'}
    ${paginas > 1 ? `<div class="admPag"><button class="btn ghost" type="button" id="admAnt" aria-label="${esc(tr('Página anterior'))}" ${L.pagina <= 0 ? 'disabled' : ''}>‹</button><small data-sem-traducao>${esc(tr('Página {0} de {1}').replace('{0}', L.pagina + 1).replace('{1}', paginas))}</small><button class="btn" type="button" id="admSeg" aria-label="${esc(tr('Página seguinte'))}" ${L.pagina + 1 >= paginas ? 'disabled' : ''}>›</button></div>` : ''}`;
  lj.querySelectorAll('[data-j]').forEach(b => b.onclick = () => admIr('jogador', b.dataset.j));
  lj.querySelector('#admAnt')?.addEventListener('click', () => { L.pagina--; admIr('jogadores'); });
  lj.querySelector('#admSeg')?.addEventListener('click', () => { L.pagina++; admIr('jogadores'); });
}

/* ---------- 🧑 Um jogador ---------- */
const ADM_ACOES = {
  avisar: ['⚠️', 'Avisar', 'O jogador recebe o aviso com o motivo.'],
  mutar: ['🔇', 'Silenciar', 'Não pode escrever no chat nem em mensagens durante as horas que escolheres.'],
  desmutar: ['🔈', 'Tirar o silêncio', ''],
  tirar_kumbu: ['🏦', 'Tirar dinheiro', 'Tira kumbu da carteira (nunca mais do que tem).'],
  banir: ['⛔', 'Suspender a conta', 'Não consegue jogar até reativares.'],
  desbanir: ['✅', 'Reativar a conta', ''],
};
async function admJogador(body) {
  body.innerHTML = `${admTopo('🧑 Jogador', 'jogadores')}<div id="admFicha"><div class="empty">A carregar…</div></div>`;
  const { data: j, error } = await sb.rpc('admin_jogador', { p_id: admArg });
  const f = body.querySelector('#admFicha'); if (error) return admErro(f, error);
  const mudo = j.mudo_ate && new Date(j.mudo_ate) > new Date(), on = j.visto_em && Date.now() - new Date(j.visto_em) < 300e3;
  const emp = j.emprego ? (D.empregos?.find(x => x.id === j.emprego)?.nome || j.emprego) : 'Desempregado';
  const real = (j.dinheiro_real || []).map(x => `${admCent(x.centimos, x.moeda)} (${x.vezes}×)`).join(' + ');
  const sec = (t, h) => `<div class="sub2">${t}</div>${h}`;
  const linha = (e, b, s = '') => `<div class="row"><span class="e">${e}</span><div class="t"><b>${b}</b>${s ? `<small>${s}</small>` : ''}</div></div>`;
  f.innerHTML = `<div class="rel"><div class="lbl"><span data-sem-traducao>${on ? '🟢' : '⚪'} ${esc(j.nome)}</span><span class="price" data-sem-traducao>${fmtKz(j.kumbu)}</span></div>
      <small style="display:block;color:var(--muted);font-size:12px"><span data-sem-traducao>${esc(bairro(j.bairro)?.nome || j.bairro || '')}</span> · ${tr('visto')} ${j.visto_em ? admT(j.visto_em) : '—'} · ${tr('desde')} ${new Date(j.criado_em).toLocaleDateString('pt-PT')}</small>
      <div class="chips" style="margin-top:8px">${j.banido ? `<span class="chip">⛔ ${tr('Suspensa')}</span>` : ''}${mudo ? `<span class="chip">🔇 ${tr('Silenciado/a até')} ${new Date(j.mudo_ate).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</span>` : ''}${j.preso_ate && new Date(j.preso_ate) > new Date() ? `<span class="chip">🚔 ${tr('Preso/a')}</span>` : ''}
        <span class="chip">🪙 <span data-sem-traducao>${admN(j.ouro)}</span> ${tr('Ouro')}</span><span class="chip">💵 <span data-sem-traducao>${admN(j.dolares)}</span> USD</span><span class="chip">🏦 <span data-sem-traducao>${fmtKz(j.poupanca)}</span></span>${j.divida > 0 ? `<span class="chip">📉 <span data-sem-traducao>${fmtKz(j.divida)}</span></span>` : ''}</div></div>
    <div class="grelha" style="margin-top:10px">${Object.entries(ADM_ACOES).filter(([k]) => !(k === 'desmutar' && !mudo) && !(k === 'mutar' && mudo) && !(k === 'banir' && j.banido) && !(k === 'desbanir' && !j.banido))
      .map(([k, [e, t]]) => `<button type="button" data-ac="${k}" class="${k === 'banir' || k === 'tirar_kumbu' ? 'perigo' : ''}"><span class="e">${e}</span><span>${t}</span></button>`).join('')}</div>
    ${sec('Vida', `<div class="list">${linha('💼', esc(tr(emp)), j.cargo_nivel ? `${tr('Cargo')} ${j.cargo_nivel}` : '')}${linha('⏱️', `${tr('Turnos hoje')}: <span data-sem-traducao>${admN(j.turnos_hoje)}</span>`, `${tr('Ações hoje')}: <span data-sem-traducao>${admN(j.acoes_hoje)}</span>`)}
      ${linha('🍼', `${tr('Família')}: ${esc(tr({ musseque: 'Musseque', media: 'Classe média', rica: 'Rica', rica_cem: 'Rica (centenas de milhões)', rica_mil: 'Rica (milhares de milhões)' }[j.berco || j.classe] || j.classe || '—'))}`, `${tr('Estudo')} ${j.estudo} · ${tr('Reputação')} ${j.reputacao}`)}
      ${linha('💳', `${tr('Dinheiro real gasto')}: <span data-sem-traducao>${real || '0'}</span>`, j.kz_banco ? `${tr('Pagamentos em Kz')}: <span data-sem-traducao>${fmtKz(j.kz_banco)}</span>` : '')}</div>`)}
    ${(j.itens || []).length ? sec('Posses', `<div class="chips">${j.itens.map(i => `<span class="chip">${i.emoji} ${esc(tr(i.nome))}</span>`).join('')}</div>`) : ''}
    ${(j.empresas || []).length ? sec('Empresas', `<div class="list">${j.empresas.map(e => linha(TIPOS_EMP[e.tipo]?.e || '🏢', `<span data-sem-traducao>${esc(e.nome)}</span>${e.falida ? ' · 💥' : ''}`, `${tr(TAM_EMP?.[e.tamanho] || e.tamanho || '')} · ${tr('Caixa')} <span data-sem-traducao>${fmtKz(e.caixa)}</span>`)).join('')}</div>`) : ''}
    ${sec('Alertas', (j.alertas || []).length ? `<div class="list">${j.alertas.map(a => linha(a.estado === 'novo' ? '🚨' : '☑️', esc(TIPOS_ALERTA[a.tipo] || a.tipo), `${tr('Gravidade')} ${a.gravidade}/3 · ${a.vezes}× · ${admT(a.em)}`)).join('')}</div>` : '<div class="empty">Sem alertas.</div>')}
    ${sec('Denúncias', (j.denuncias || []).length ? `<div class="list">${j.denuncias.map(x => linha('🚩', esc(x.motivo), `${tr('por')} <span data-sem-traducao>${esc(x.de || '?')}</span> · ${admT(x.em)}${x.texto ? ` · “<span data-sem-traducao>${esc(x.texto)}</span>”` : ''}`)).join('')}</div>` : '<div class="empty">Sem denúncias.</div>')}
    ${sec('O que os admins fizeram', (j.moderacao || []).length ? `<div class="list">${j.moderacao.map(m => linha(ADM_ACOES[m.acao]?.[0] || '•', `${esc(tr(ADM_ACOES[m.acao]?.[1] || m.acao))}${m.horas ? ` · <span data-sem-traducao>${m.horas} h</span>` : ''}${m.valor ? ` · <span data-sem-traducao>${fmtKz(m.valor)}</span>` : ''}`, `<span data-sem-traducao>${esc(m.motivo || '')}</span> · ${tr('por')} <span data-sem-traducao>${esc(m.por || '?')}</span> · ${admT(m.em)}`)).join('')}</div>` : '<div class="empty">Nada ainda.</div>')}
    ${sec('Atividade recente', (j.eventos || []).length ? `<div class="list">${j.eventos.map(x => `<div class="row"><div class="t"><small>${esc(tr(x.texto))}</small><small>${admT(x.em)}</small></div></div>`).join('')}</div>` : '<div class="empty">Sem atividade.</div>')}`;
  f.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => {
    const k = b.dataset.ac, [e, t, d] = ADM_ACOES[k];
    const el = sheet(`<h3>${e} ${t}: <span data-sem-traducao>${esc(j.nome)}</span></h3>${d ? `<p class="m">${d}</p>` : ''}
      ${k === 'mutar' ? '<label>Horas</label><input class="inp" id="admV" type="number" min="1" max="8760" value="24">' : ''}
      ${k === 'tirar_kumbu' ? `<label>Quanto (Kz)</label><input class="inp" id="admV" type="number" min="1" max="${Math.max(1, j.kumbu)}" placeholder="${admN(j.kumbu)}">` : ''}
      <label>Motivo (fica no registo)</label><input class="inp" id="admMot" maxlength="300" placeholder="ex.: farming com 4 contas">
      <button class="btn full ${k === 'banir' || k === 'tirar_kumbu' ? 'red' : ''}" type="button" id="admSim">${t}</button>`);
    el.querySelector('#admSim').onclick = async () => {
      const mot = el.querySelector('#admMot').value.trim(); if (mot.length < 3) return toast('Escreve o motivo.', 'mau');
      const v = el.querySelector('#admV') ? parseInt(el.querySelector('#admV').value, 10) || null : null;
      if (k === 'tirar_kumbu' && !v) return toast('Escreve quanto tirar.', 'mau');
      if ((k === 'banir' || k === 'tirar_kumbu') && !await perguntar(`${t}: ${j.nome}?`)) return;
      if (await acao('admin_acao_jogador', { p_id: j.id, p_acao: k, p_valor: v, p_motivo: mot })) { fecharSheets(); admIr('jogador', j.id); }
    };
  });
}

/* ---------- 📣 Anúncios ---------- */
const ADM_ABAS = [['rever', 'Rever'], ['noar', 'No ar'], ['lugares', 'Lugares'], ['bairros', 'Bairros']];
async function admAnuncios(body) {
  if (!ADM_ABAS.some(([k]) => k === admAba)) admAba = 'rever';
  body.innerHTML = `${admTopo('📣 Anúncios')}<div class="tabs" style="flex-wrap:wrap">${ADM_ABAS.map(([k, t]) => `<button type="button" data-aba="${k}" class="${admAba === k ? 'on' : ''}">${t}</button>`).join('')}</div><div id="admAba" style="margin-top:10px"><div class="empty">A carregar…</div></div>`;
  body.querySelectorAll('.tabs [data-aba]').forEach(b => b.onclick = () => admIr('anuncios', null, b.dataset.aba));
  const el = body.querySelector('#admAba');
  if (admAba === 'rever') return admLoja(el);
  if (admAba === 'noar') return admNoAr(el);
  if (admAba === 'lugares') return admLugares(el);
  return admBairros(el);
}
// 0u (dono, 30 out): anúncios comprados na loja (anunciar/) — ver a imagem e aprovar (vai para o ar nas datas pagas) ou recusar (reembolso total)
async function admLoja(ll) {
  const { data, error } = await sb.rpc('admin_loja'); if (error) return admErro(ll, error);
  const EST = { paga: '⏳ Paga, por rever', aprovada: '✅ No ar', recusada: '❌ Recusada', reembolsada: '↩️ Recusada e reembolsada', retirada: '⛔ Retirada', retirada_reembolsada: '⛔ Retirada e reembolsada' };
  const ordem = [...data].sort((a, b) => (a.estado === 'paga' ? 0 : 1) - (b.estado === 'paga' ? 0 : 1));
  ll.innerHTML = ordem.length ? `<div class="list">${ordem.map(e => `<div class="row" style="flex-wrap:wrap;align-items:flex-start"><div class="t" style="flex-basis:100%">
      <b data-sem-traducao>${esc(e.marca)} · ${e.total_eur_centimos ? admCent(e.total_eur_centimos, 'EUR') : 'US$ ' + (e.total_usd_centimos / 100).toFixed(2)} (${fmtKz(e.total_kz)})</b>
      <small>${EST[e.estado] || esc(e.estado)} · ${esc(e.email)}${e.link ? ` · <a href="${esc(e.link)}" target="_blank" rel="noopener nofollow">${esc(e.link)}</a>` : ''}${e.motivo ? ` · motivo: ${esc(e.motivo)}` : ''}</small></div>
      ${(e.itens || []).map(i => `<div style="flex:1 1 220px;min-width:0"><img src="${esc(i.imagem)}" alt="" style="width:100%;border-radius:8px;background:#000;display:block">
        <small data-sem-traducao>${esc(i.nome)} · ${i.largura}×${i.altura} · ${new Date(i.inicio).toLocaleDateString('pt-PT')}–${new Date(i.fim).toLocaleDateString('pt-PT')}</small></div>`).join('')}
      ${e.estado === 'paga' ? `<div style="flex-basis:100%;display:flex;gap:8px"><button class="btn sm" data-loja="${e.id}" data-ac="aprovar">Aprovar</button><button class="btn sm ghost" data-loja="${e.id}" data-ac="recusar">Recusar e devolver</button></div>` : ''}
      ${e.estado === 'aprovada' ? `<div style="flex-basis:100%;display:flex;gap:8px"><button class="btn sm red" data-loja="${e.id}" data-ac="retirar">⛔ Retirar do jogo</button></div>` : ''}</div>`).join('')}</div>`
    : '<div class="empty">Nenhuma encomenda nos últimos 60 dias.</div>';
  const enviar = async (id, acaoLoja, motivo = '') => {
    const { data: r, error: er } = await sb.functions.invoke('loja-admin', { body: { encomenda: id, acao: acaoLoja, motivo } });
    if (er || r?.erro) { toast(r?.erro || 'Não deu. Tenta outra vez.', 'mau'); return false; }
    toast(acaoLoja === 'aprovar' ? 'Aprovado: já está no jogo.' : 'Recusado e devolvido.'); admIr('anuncios', null, 'rever'); return true;
  };
  ll.querySelectorAll('[data-loja]').forEach(b => b.onclick = async () => {
    if (b.dataset.ac === 'aprovar') { if (await perguntar('Aprovar? O anúncio vai para o ar nas datas pagas.')) { b.disabled = true; if (!await enviar(b.dataset.loja, 'aprovar')) b.disabled = false; } return; }
    if (b.dataset.ac === 'retirar') {   // dono 1 nov: tirar do jogo um anúncio já aprovado
      const el = sheet(`<h3>⛔ Retirar este anúncio do jogo</h3><p class="m">Sai de todos os lugares já, mesmo que ainda faltem dias.</p><label>Motivo (quem anunciou vai ler)</label><input class="inp" id="lojaMot" maxlength="300" placeholder="ex.: a imagem não segue as regras"><label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="lojaDev"> Devolver o dinheiro todo</label><button class="btn full red" id="lojaSim">Retirar agora</button>`);
      el.querySelector('#lojaSim').onclick = async () => { const m = el.querySelector('#lojaMot').value.trim(); if (m.length < 3) return toast('Escreve o motivo.', 'mau');
        const { data: r, error: er } = await sb.functions.invoke('loja-admin', { body: { encomenda: b.dataset.loja, acao: 'retirar', motivo: m, devolver: el.querySelector('#lojaDev').checked } });
        if (er || r?.erro) return toast(r?.erro || 'Não deu. Tenta outra vez.', 'mau');
        toast(r.reembolsada ? 'Retirado e devolvido.' : 'Retirado do jogo.'); fecharSheets(); admIr('anuncios', null, 'rever'); };
      return;
    }
    const el = sheet(`<h3>Recusar e devolver o dinheiro</h3><label>Motivo (quem anunciou vai ler)</label><input class="inp" id="lojaMot" maxlength="300" placeholder="ex.: a imagem mostra uma bebida alcoólica"><button class="btn full" id="lojaSim">Recusar e devolver</button>`);
    el.querySelector('#lojaSim').onclick = async () => { const m = el.querySelector('#lojaMot').value.trim(); if (m.length < 3) return toast('Escreve o motivo.', 'mau'); if (await enviar(b.dataset.loja, 'recusar', m)) fecharSheets(); };
  });
}
// #41a: alcance, impressões, aberturas e cliques de cada anúncio
async function admNoAr(la) {
  const { data, error } = await sb.rpc('admin_anuncios'); if (error) return admErro(la, error);
  const n = admN, pct = (a, b) => b ? (100 * a / b).toFixed(1).replace('.', ',') + '%' : '—';
  la.innerHTML = data.length ? `<div class="list">${data.map(a => `<div class="row" style="flex-wrap:wrap"><div class="t"><b data-sem-traducao>${esc(a.marca)} · ${esc(a.slot)}${a.ativo ? '' : ' · terminado'}</b>
    <small>até ${new Date(a.ate).toLocaleDateString('pt-PT')} · ${a.no_outdoor}/6 no outdoor</small>
    <small>👀 ${n(a.alcance)} ${a.alcance == 1 ? 'pessoa' : 'pessoas'} (${n(a.alcance_7d)} nos últimos 7 dias) · ${n(a.impressoes)} ${a.impressoes == 1 ? 'impressão' : 'impressões'} · 👆 ${n(a.aberturas)} ${a.aberturas == 1 ? 'toque' : 'toques'} · 🔗 ${n(a.cliques)} ${a.cliques == 1 ? 'clique' : 'cliques'} (${pct(a.cliques, a.alcance)})</small></div></div>`).join('')}</div>`
    : '<div class="empty">Ainda não há anúncios nos últimos 30 dias.</div>';
}
// 0l-C: tempo à vista por lugar de anúncio
async function admLugares(lx) {
  const { data, error } = await sb.rpc('admin_exposicao'); if (error) return admErro(lx, error);
  const n = admN, tempo = s => s >= 3600 ? (s / 3600).toFixed(1).replace('.', ',') + ' h' : s >= 60 ? Math.round(s / 60) + ' min' : Math.round(s) + ' s';
  const L = data.lugares || [];
  lx.innerHTML = `<p class="m">⏱️ Lugares de anúncio — tempo à vista (7 dias)</p>` + (L.length ? `<div class="list">${L.map(x => `<div class="row"><div class="t"><b data-sem-traducao>${esc(x.lugar)}</b>
    <small>👀 ${n(x.pessoas_7d)} pessoas (hoje ${n(x.pessoas_hoje)}) · ${n(x.vistas_7d)} vistas · ⏱️ ${tempo(x.seg_7d)} no total · ${String(x.seg_por_vista).replace('.', ',')} s por vista</small></div></div>`).join('')}</div>`
    : '<div class="empty">Ainda sem dados.</div>');
}
// 0y (dono, 30 out): que bairros e sítios crescem primeiro
async function admBairros(lv) {
  const { data, error } = await sb.rpc('admin_visitas'); if (error) return admErro(lv, error);
  const n = admN, B = data.bairros || [], L = data.lugares || [];
  const prox = REGRA_CRESCER.find(r => data.ativos_7d < r.jogadores);
  lv.innerHTML = `<p class="m">🗺️ Onde vão os jogadores (7 dias)</p><div class="row"><div class="t"><b>${n(data.ativos_7d)} jogadores ativos (7 dias) · ${n(data.ativos_hoje)} hoje</b>
      <small>Regra para crescer: ${REGRA_CRESCER.map(r => `${n(r.jogadores)} ativos/semana → ${r.passo}`).join(' · ')}${prox ? ` — faltam ${n(prox.jogadores - data.ativos_7d)} para o próximo passo` : ''}</small></div></div>
    ${B.length ? `<div class="list">${B.map((x, i) => `<div class="row"><div class="t"><b data-sem-traducao>${i + 1}. ${esc(x.nome)}</b>
      <small>${String(x.pessoas_dia).replace('.', ',')} jogadores/dia · ${n(x.pessoas_7d)} diferentes na semana · ${n(x.visitas_7d)} idas · hoje ${n(x.pessoas_hoje)}${x.pessoas_dia >= REGRA_BAIRRO ? ' · ✅ já pode crescer' : ''}</small></div></div>`).join('')}</div>` : '<div class="empty">Ainda sem dados.</div>'}
    ${L.length ? `<div class="sub2">Sítios mais visitados</div><div class="list">${L.slice(0, 15).map(x => `<div class="row"><div class="t"><b data-sem-traducao>${esc(x.lugar)}</b><small>${esc(bairro(x.bairro)?.nome || x.bairro)} · ${n(x.pessoas_7d)} pessoas · ${n(x.visitas_7d)} idas</small></div></div>`).join('')}</div>` : ''}`;
}

/* ---------- 💷 Dinheiro ---------- */
async function admDinheiro(body) {
  body.innerHTML = `${admTopo('💷 ' + tr('Quanto ganhamos'))}<div id="admPag"></div><div id="admConv"></div><div id="admRec"><div class="empty">A carregar…</div></div>
    <div class="sub2">Pagamentos em Kz por confirmar</div><div id="pagList"><div class="empty">A carregar…</div></div>
    <div class="sub2">💷 Dinheiro dos anúncios</div><div id="finBox"><div class="empty">A carregar…</div></div>`;
  if (typeof renderFinancas === 'function') renderFinancas(body.querySelector('#finBox'));   // 0bz: Despesas · Preços · Projeções · Histórico
  admReceitas(body.querySelector('#admRec'));
  admPagamento(body.querySelector('#admPag'));
  admConversao(body.querySelector('#admConv'));
  const { data, error } = await sb.rpc('admin_pagamentos_locais');
  const lp = body.querySelector('#pagList'); if (error) return admErro(lp, error);
  lp.innerHTML = data.length ? `<div class="list">${data.map(x => `<div class="row" style="flex-wrap:wrap"><div class="t"><b data-sem-traducao>${esc(x.codigo)} · ${fmtKz(x.valor_kz)}</b><small>${esc(x.nome)} · ${admT(x.criado_em)}</small></div>
    <button class="btn sm" data-pag="${x.id}" data-ok="1">Recebido</button><button class="btn sm ghost" data-pag="${x.id}" data-ok="">Não chegou</button></div>`).join('')}</div>` : '<div class="empty">Nenhum pagamento à espera.</div>';
  lp.querySelectorAll('[data-pag]').forEach(b => b.onclick = async () => {
    const ok = !!b.dataset.ok; if (!await perguntar(ok ? 'Confirmas que o dinheiro chegou à conta?' : 'Recusar este pagamento?')) return;
    if (await acao('admin_tratar_pagamento', { p_id: +b.dataset.pag, p_confirmar: ok })) admIr('dinheiro');
  });
}

// FILA 0do (dono 6 nov): «a page to analyse how much we are making and visual representations of it» — desenho aprovado
let admRecDias = 7;
async function admReceitas(el) {
  const { data: r, error } = await sb.rpc('admin_receitas', { p_dias: admRecDias });
  if (error) return admErro(el, error);
  const eur = c => '€' + (Number(c || 0) / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eurCurto = c => '€' + Math.round(Number(c || 0) / 100);
  const dias = r.por_dia || [], max = Math.max(1, ...dias.map(x => x.ouro + x.anuncios));
  const loc = lingua === 'en' ? 'en-GB' : lingua === 'fr' ? 'fr-FR' : 'pt-PT';
  const dNome = d => { const x = new Date(d + 'T12:00:00'); return dias.length > 10 ? String(x.getDate()) : x.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '').slice(0, 3) + ' ' + x.getDate(); };
  const tot = r.total_eur_cent || 0, pOuro = tot ? Math.round(100 * r.ouro_eur_cent / tot) : 0;
  const pmax = Math.max(1, ...(r.pacotes || []).map(x => x.eur_cent));
  const PER = [[1, 'Hoje'], [7, '7 dias'], [30, '30 dias'], [0, 'Tudo']];
  el.innerHTML = `<div class="admPer" role="group" aria-label="${esc(tr('Período'))}">${PER.map(([d, t]) => `<button type="button" data-dias="${d}" class="${admRecDias === d ? 'on' : ''}">${esc(tr(t))}</button>`).join('')}</div>
    <div class="admCartao"><small>${esc(tr('Total'))}${(r.por_moeda || []).some(x => x.moeda === 'USD') ? ' ≈' : ''}</small><b class="admGrande" data-sem-traducao>${eur(tot)}</b>
      ${r.melhor_dia ? `<small class="ok">${esc(tr('Melhor dia'))}: ${esc(dNome(r.melhor_dia.dia))} · <span data-sem-traducao>${eur(r.melhor_dia.eur_cent)}</span></small>` : `<small>${esc(tr('Ainda sem vendas neste período.'))}</small>`}</div>
    ${dias.length > 1 ? `<div class="admCartao"><div class="admLinha"><small>${esc(tr('Por dia'))}</small><small><i class="admPonto" style="background:#ffcb00"></i>${esc(tr('Ouro'))} <i class="admPonto" style="background:#5aa7e0"></i>${esc(tr('Anúncios'))}</small></div>
      <div class="admDias">${dias.map(x => `<div title="${esc(dNome(x.dia))}: ${eur(x.ouro + x.anuncios)}"><span data-sem-traducao>${x.ouro + x.anuncios ? eurCurto(x.ouro + x.anuncios) : ''}</span>
        <i style="height:${Math.round(100 * x.anuncios / max)}%;background:#5aa7e0"></i><i style="height:${Math.round(100 * x.ouro / max)}%;background:#ffcb00"></i><small>${esc(dNome(x.dia))}</small></div>`).join('')}</div></div>` : ''}
    <div class="admCartao"><small>${esc(tr('De onde vem'))}</small><div class="admBarra"><i style="width:${pOuro}%;background:#ffcb00"></i><i style="width:${tot ? 100 - pOuro : 0}%;background:#5aa7e0"></i></div>
      <div class="admTres"><div><span style="color:#ffcb00">${esc(tr('Ouro'))}</span><b data-sem-traducao>${eur(r.ouro_eur_cent)}</b></div><div><span style="color:#5aa7e0">${esc(tr('Anúncios'))}</span><b data-sem-traducao>${eur(r.anuncios_eur_cent)}</b></div>
        <div><span>${esc(tr('Kz (banco)'))}</span><b data-sem-traducao>${r.kz_ligado ? fmtKz(r.kz_total) : esc(tr('desligado'))}</b></div></div>
      ${(r.por_moeda || []).length > 1 ? `<small>${(r.por_moeda || []).map(x => `<span data-sem-traducao>${admCent(x.cent, x.moeda)}</span> (${x.vezes}×)`).join(' + ')} · ${esc(tr('US$ contam a {0} €').replace('{0}', String(r.taxa_usd_eur).replace('.', ',')))}</small>` : ''}</div>
    ${(r.pacotes || []).length ? `<div class="admCartao"><small>${esc(tr('Pacotes de Ouro · receita'))}</small><div class="admPacotes">${r.pacotes.map(x => `<span data-sem-traducao>${admN(x.ouro)} ${esc(tr('Ouro'))}</span><i style="width:${Math.round(100 * x.eur_cent / pmax)}%"></i><b data-sem-traducao>${eurCurto(x.eur_cent)} · ${x.vezes}×</b>`).join('')}</div></div>` : ''}
    <div class="admNums admNums3"><div class="admNum"><span>${esc(tr('Pagaram'))}</span><b data-sem-traducao>${admN(r.pagantes)}</b><small>${esc(tr('jogadores'))}</small></div>
      <div class="admNum"><span>${esc(tr('Conversão'))}</span><b data-sem-traducao>${r.jogadores ? (100 * r.pagantes / r.jogadores).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + '%' : '—'}</b><small data-sem-traducao>${esc(tr('de'))} ${admN(r.jogadores)}</small></div>
      <div class="admNum"><span>${esc(tr('Por pagante'))}</span><b data-sem-traducao>${r.pagantes ? eur(r.ouro_eur_cent / r.pagantes) : '—'}</b><small>${esc(tr('em média'))}</small></div></div>`;
  el.querySelectorAll('[data-dias]').forEach(b => b.onclick = () => { admRecDias = Number(b.dataset.dias); admReceitas(el); });
}

/* ---------- 🛡️ Segurança ---------- */
async function admSeguranca(body) {
  body.innerHTML = `${admTopo('🛡️ Segurança')}<p class="m">Toca num nome para abrir a ficha e agir (avisar, silenciar, tirar dinheiro, suspender).</p>
    <div class="sub2">Recursos de contas suspensas</div><div id="recSusp"><div class="empty">A carregar…</div></div>
    <div class="sub2">Recursos à CFB</div><div id="recCfb"><div class="empty">A carregar…</div></div>
    <div class="sub2">Alertas de abuso</div><div id="alList"><div class="empty">A carregar…</div></div>
    <div class="sub2">Denúncias recentes</div><div id="denList"><div class="empty">A carregar…</div></div>
    <div class="sub2">O que os admins fizeram</div><div id="regList"><div class="empty">A carregar…</div></div>`;
  // 6 nov (dono: «make sure the appeal actually works»): recursos de contas suspensas e da CFB, um toque para decidir
  Promise.all([sb.rpc('admin_recursos_suspensao'), sb.rpc('admin_cfb_casos', { p_so_recursos: true })]).then(([rs, rc]) => {
    const caixa = (id, r, linha, ligar) => { const el = body.querySelector(id); if (!el) return; if (r.error) return admErro(el, r.error);
      el.innerHTML = (r.data || []).length ? `<div class="list">${r.data.map(linha).join('')}</div>` : '<div class="empty">Nenhum por decidir 🎉</div>'; ligar(el); };
    caixa('#recSusp', rs, x => `<div class="row"><div class="t"><b>${esc(x.nome)}</b><small>${x.motivo ? 'Motivo: ' + esc(x.motivo) + ' · ' : ''}${new Date(x.criado_em).toLocaleString()}</small><small style="display:block;margin-top:4px;white-space:pre-wrap" data-sem-traducao>«${esc(x.texto)}»</small></div><div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-sus="${x.id}:1">Reativar</button><button class="btn sm ghost" data-sus="${x.id}:0">Manter</button></div></div>`,
      el => el.querySelectorAll('[data-sus]').forEach(b => b.onclick = async () => { const [id, sim] = b.dataset.sus.split(':'); if (await acao('admin_decidir_suspensao', { p_id: +id, p_levantar: sim === '1' })) admSeguranca(body); }));
    caixa('#recCfb', rc, x => `<div class="row"><div class="t"><b>${esc(x.nome)}</b><small>${esc(x.motivo)} · ${fmtKz(x.patrimonio_antes || 0)}</small><small style="display:block;margin-top:4px;white-space:pre-wrap" data-sem-traducao>«${esc(x.recurso || '')}»</small></div><div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-cfb="${x.id}:1">Devolver</button><button class="btn sm ghost" data-cfb="${x.id}:0">Manter</button></div></div>`,
      el => el.querySelectorAll('[data-cfb]').forEach(b => b.onclick = async () => { const [id, sim] = b.dataset.cfb.split(':'); if (await acao('admin_cfb_decidir', { p_caso: +id, p_devolver: sim === '1' })) admSeguranca(body); }));
  });
  const [al, den, reg] = await Promise.all([sb.rpc('admin_alertas'), sb.rpc('admin_denuncias'), sb.rpc('admin_registo')]);
  const la = body.querySelector('#alList');
  if (al.error) admErro(la, al.error);
  else la.innerHTML = al.data.length ? `<div class="list">${al.data.map(a => `<div class="row" style="flex-wrap:wrap"><div class="t"><b>${esc(TIPOS_ALERTA[a.tipo] || a.tipo)}</b>
      <small>Gravidade ${a.gravidade}/3 · ${a.vezes}× · ${admT(a.atualizado_em)}</small>
      <small>${(a.contas || []).map(c => `<button class="lnk" type="button" data-nome="${esc(c.nome)}">${esc(c.nome)}${c.banido ? ' (suspensa)' : ''}</button>`).join(' · ')}</small></div>
      <button class="btn sm ghost" data-visto="${a.id}">Ignorar</button></div>`).join('')}</div>` : '<div class="empty">Nada suspeito por agora.</div>';
  la.querySelectorAll('[data-visto]').forEach(b => b.onclick = async () => { await sb.rpc('admin_alerta_visto', { p_id: +b.dataset.visto }); admIr('seguranca'); });
  const ld = body.querySelector('#denList');
  if (den.error) admErro(ld, den.error);
  else ld.innerHTML = den.data.length ? `<div class="list">${den.data.map(d => `<div class="row"><div class="t"><b><button class="lnk" type="button" data-nome="${esc(d.contra)}">${esc(d.contra)}</button>${d.banido ? ' (suspensa)' : d.mudo_ate && new Date(d.mudo_ate) > new Date() ? ' (silenciado/a)' : ''}</b>
    <small>${esc(d.motivo)} · por ${esc(d.de)} · ${admT(d.criado_em)}</small>${d.texto ? `<small>“${esc(d.texto)}”</small>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Sem denúncias.</div>';
  const lr = body.querySelector('#regList');
  if (reg.error) admErro(lr, reg.error);
  else lr.innerHTML = reg.data.length ? `<div class="list">${reg.data.map(m => `<div class="row"><span class="e">${ADM_ACOES[m.acao]?.[0] || '•'}</span><div class="t"><b>${esc(tr(ADM_ACOES[m.acao]?.[1] || m.acao))} · <button class="lnk" type="button" data-nome="${esc(m.alvo || '')}">${esc(m.alvo || '?')}</button>${m.horas ? ` · <span data-sem-traducao>${m.horas} h</span>` : ''}${m.valor ? ` · <span data-sem-traducao>${fmtKz(m.valor)}</span>` : ''}</b>
    <small><span data-sem-traducao>${esc(m.motivo || '')}</span> · ${tr('por')} <span data-sem-traducao>${esc(m.por || '?')}</span> · ${admT(m.em)}</small></div></div>`).join('')}</div>` : '<div class="empty">Nada ainda.</div>';
  body.querySelectorAll('[data-nome]').forEach(b => b.onclick = () => admAbrirNome(b.dataset.nome));
}
