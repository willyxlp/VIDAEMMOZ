/* 0bz (dono, 2 nov): dinheiro dos anúncios no painel de admin — Despesas · Preços · Projeções · Histórico.
   Os preços vêm sempre do servidor (um só cálculo: admin_fin_* / _fin_calcular). Aqui só se mostra, simula e aprova.
   Só para admins (o servidor recusa os outros). Textos em PT; o idioma.js traduz (en/fr em i18n/manual). */
let finAba = 'precos', finDados = null, finSim = null, finConfirmar = 0;
const FIN_MOEDAS = ['GBP', 'USD', 'NGN', 'AOA', 'EUR'];
const FIN_PERIODO = { mes: 'Todos os meses', ano: 'Uma vez por ano', unico: 'Só uma vez' };
const FIN_ESTADO = { proposta: 'Proposta', aprovada: 'Aprovada', publicada: 'Publicada', substituida: 'Substituída', rejeitada: 'Posta de lado', real: 'Real', previsto: 'Previsto', anulada: 'Anulada' };
const FIN_MISTURA = { equilibrado: 'Equilibrado', caros_primeiro: 'Os caros primeiro', baratos_primeiro: 'Os baratos primeiro' };
// tamanhos da base Supabase (US$/mês, preço de tabela; o Pro inclui 10 $ de compute) — para as projeções
const FIN_BASES = [['Small', 2, 15], ['Medium', 4, 60], ['Large', 8, 110], ['XL', 16, 210], ['2XL', 32, 410], ['4XL', 64, 960]];

const finNum = (v, d = 2) => (Math.round((+v || 0) * 10 ** d) / 10 ** d).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const finGbp = v => (v < 0 ? '−£' : '£') + finNum(Math.abs(v));
const finEur = c => '€' + finNum((c || 0) / 100);
function finOutras(gbp) {   // £ → ₦ · Kz · $ (com os câmbios gravados)
  const c = finDados?.cambios || {}, f = (m, s, d = 0) => c[m] ? s + finNum(gbp * c[m].por_gbp, d) : '';
  return [f('NGN', '₦'), f('AOA', 'Kz ', 0), f('USD', '$', 2)].filter(Boolean).join(' · ');
}
const finMesTxt = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }); } catch { return d; } };
const finPct = v => v == null ? '—' : finNum(v * 100, 0) + ' %';

async function renderFinancas(el) {
  if (!el) return;
  el.innerHTML = '<div class="empty">A carregar…</div>';
  const { data, error } = await sb.rpc('admin_fin_painel');
  if (error) { el.innerHTML = `<div class="empty">${esc(limparErro(error.message))}</div>`; return; }
  finDados = data; finSim = null;
  pintarFinancas(el);
}
function pintarFinancas(el) {
  const d = finDados, df = d.definicoes || {}, prev = +d.custo_previsto_prox_gbp || 0, v = d.vendas_mes || {};
  // 0dp-1 (6 nov): as mesmas contas do servidor (_fin_calcular) — o que a Stripe tira (% + fixo por compra) entra antes da margem
  const dPct = (+df.taxa_cartao_pct || 0) + (+df.taxa_fx_pct || 0) + (+df.taxa_mp_pct || 0) + (+df.imposto_pct || 0), pm = +df.partilha_mes || 0;
  const fixas = (+df.taxa_cartao_fixa_gbp || 0) * (pm + (1 - pm) * 52 / 12) / (+df.itens_encomenda || 1) * (+df.ocupacao || 0.5) * (+d.lugares_total || 0);
  const empate = (prev + fixas) / Math.max(0.05, 1 - dPct), alvo = (prev + fixas) / Math.max(0.05, 1 - dPct - (+df.margem || 0));
  el.innerHTML = `
    <div class="list">
      <div class="row"><div class="t"><b>Quanto custa o jogo</b><small>${esc(finMesTxt(d.proximo))} · previsto</small></div><div data-sem-traducao style="text-align:right"><b>${finGbp(prev)}</b><br><small>${esc(finOutras(prev))}</small></div></div>
      <div class="row"><div class="t"><b>Receita para empatar</b><small>custos + o que a Stripe tira</small></div><div data-sem-traducao style="text-align:right"><b>${finGbp(empate)}</b></div></div>
      <div class="row"><div class="t"><b>Receita para a margem-alvo</b><small>margem = lucro ÷ vendas brutas</small></div><div data-sem-traducao style="text-align:right"><b>${finGbp(alvo)}</b><br><small>${finPct(+df.margem)} · ${esc(finOutras(alvo))}</small></div></div>
      <div class="row"><div class="t"><b>Ganho com anúncios este mês</b><small>pagas e aprovadas (reembolsos à parte)</small></div><div data-sem-traducao style="text-align:right"><b>${finGbp(+v.bruto_gbp || 0)}</b><br><small>${+v.pagas || 0} · −${finGbp(+v.reembolsos_gbp || 0)}</small></div></div>
      <div class="row"><div class="t"><b>Lugares vendidos agora</b><small>esta semana</small></div><div data-sem-traducao style="text-align:right"><b>${+d.ocupadas_agora || 0} / ${+d.lugares_total || 0}</b></div></div>
    </div>
    <div class="abas" style="margin-top:10px">${[['despesas', 'Despesas'], ['precos', 'Preços'], ['projecoes', 'Projeções'], ['historico', 'Histórico']].map(([k, n]) => `<button type="button" class="${finAba === k ? 'on' : ''}" data-finaba="${k}">${n}</button>`).join('')}</div>
    <div id="finCorpo"></div>`;
  el.querySelectorAll('[data-finaba]').forEach(b => b.onclick = () => { finAba = b.dataset.finaba; pintarFinancas(el); });
  const c = el.querySelector('#finCorpo');
  ({ despesas: finDespesas, precos: finPrecos, projecoes: finProjecoes, historico: finHistorico })[finAba](c, el);
}

// ── Despesas ────────────────────────────────────────────────────────────────
function finDespesas(c, el) {
  const lista = finDados.despesas || [], hoje = new Date().toISOString().slice(0, 7);
  c.innerHTML = `
    <div class="list">${lista.length ? lista.map(x => `<div class="row" ${x.estado === 'anulada' ? 'style="opacity:.5"' : ''}><div class="t"><b data-sem-traducao>${esc(x.descricao)}</b>
        <small><span>${FIN_PERIODO[x.periodo] || x.periodo}</span> · <span data-sem-traducao>${esc(String(x.mes).slice(0, 7))}${x.ate ? ' → ' + esc(String(x.ate).slice(0, 7)) : ''}</span> · <span>${FIN_ESTADO[x.estado] || x.estado}</span>${x.nota ? ` · <span data-sem-traducao>${esc(x.nota)}</span>` : ''}</small></div>
        <div data-sem-traducao style="text-align:right;white-space:nowrap"><b>${esc(x.moeda)} ${finNum(x.valor)}</b></div>
        ${x.estado !== 'anulada' ? `<button class="btn sm ghost" type="button" data-finanular="${x.id}">Anular</button>` : ''}</div>`).join('') : '<div class="empty">Ainda não há despesas.</div>'}</div>
    <form id="finNova"><div class="sub2">Juntar uma despesa</div>
      <label>Descrição</label><input class="inp" id="fdDesc" required maxlength="120" placeholder="ex.: Cloudflare">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:2 1 140px"><label>Valor</label><input class="inp" id="fdValor" required type="number" step="0.01"></div>
        <div style="flex:1 1 90px"><label>Moeda</label><select class="inp" id="fdMoeda">${FIN_MOEDAS.map(m => `<option>${m}</option>`).join('')}</select></div></div>
      <label>Quantas vezes se paga</label><select class="inp" id="fdPer">${Object.entries(FIN_PERIODO).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:1 1 140px"><label>A partir de (mês)</label><input class="inp" id="fdMes" type="month" required value="${hoje}"></div>
        <div style="flex:1 1 140px"><label>Até (mês, opcional)</label><input class="inp" id="fdAte" type="month"></div></div>
      <label>Já pago ou previsto?</label><select class="inp" id="fdEst"><option value="real">Real</option><option value="previsto">Previsto</option></select>
      <label>Nota (opcional)</label><input class="inp" id="fdNota" maxlength="300">
      <button class="btn full" type="submit">Guardar despesa</button></form>
    <small class="m">Uma despesa «Só uma vez» nunca passa a contar todos os meses. As que se pagam por ano contam 1/12 por mês na previsão.</small>`;
  c.querySelectorAll('[data-finanular]').forEach(b => b.onclick = async () => {
    const { error } = await sb.rpc('admin_fin_despesa_anular', { p_id: +b.dataset.finanular });
    if (error) return toast(limparErro(error.message), 'mau'); renderFinancas(el);
  });
  c.querySelector('#finNova').onsubmit = async e => {
    e.preventDefault();
    const p = { descricao: c.querySelector('#fdDesc').value.trim(), valor: c.querySelector('#fdValor').value, moeda: c.querySelector('#fdMoeda').value, periodo: c.querySelector('#fdPer').value,
      mes: c.querySelector('#fdMes').value + '-01', ate: c.querySelector('#fdAte').value ? c.querySelector('#fdAte').value + '-01' : '', estado: c.querySelector('#fdEst').value, nota: c.querySelector('#fdNota').value };
    const { error } = await sb.rpc('admin_fin_despesa', { p });
    if (error) return toast(limparErro(error.message), 'mau');
    toast('Despesa guardada.', 'bom'); finAba = 'despesas'; renderFinancas(el);
  };
}

// ── Preços ──────────────────────────────────────────────────────────────────
function finTabelaPrecos(dados, publicados) {
  const antes = new Map((publicados || []).map(p => [p.lugar, p]));
  return `<div class="list">${(dados.produtos || []).map(p => { const a = antes.get(p.lugar); return `<div class="row"><div class="t"><b>${esc(p.nome)}</b>
      <small><span data-sem-traducao>${p.pessoas}</span> <span>jogadores</span> · <span>valor</span> <span data-sem-traducao>${finNum(p.peso)}</span> · <span>${p.motivo === 'minimo' ? 'preço mínimo' : 'pela fórmula'}</span>${a ? ` · <span>antes</span> <span data-sem-traducao>${finEur(a.semana_eur_cent)}</span>` : ''}</small></div>
      <div data-sem-traducao style="text-align:right;white-space:nowrap"><b>${finEur(p.semana_eur_cent)}</b> <small>/sem</small><br><small>${finEur(p.mes_eur_cent)} /mês · ≈ ${fmtKz(p.semana_kz)}</small></div></div>`; }).join('')}</div>`;
}
function finAvisos(dados) {
  const av = dados.avisos || [];
  if (!av.length) return '';
  return `<div class="list">${av.map(a => a.tipo === 'caro'
    ? `<div class="row"><div class="t"><b>⚠️ Talvez caro demais</b><small><span data-sem-traducao>${esc((dados.produtos || []).find(p => p.lugar === a.lugar)?.nome || a.lugar)}</span> · <span>mais de 3× o preço justo pelas vistas</span> (<span data-sem-traducao>€${finNum(a.justo_eur)}</span>)</small></div></div>`
    : `<div class="row"><div class="t"><b>⚠️ A margem não chega com a ocupação-alvo</b><small>Hipóteses: cortar custos, vender mais anúncios, mais alcance, baixar a margem ou aceitar menos por agora.</small></div></div>`).join('')}</div>`;
}
async function finPrecos(c, el) {
  const prop = finDados.proposta, pub = finDados.publicados || [];
  if (!prop) {
    c.innerHTML = '<div class="empty">A calcular…</div>';
    const { data, error } = await sb.rpc('admin_fin_simular', { p_mes: finDados.proximo });
    if (error) { c.innerHTML = `<div class="empty">${esc(limparErro(error.message))}</div>`; return; }
    c.innerHTML = `<p class="m"><span>Ainda sem proposta para</span> <span data-sem-traducao>${esc(finMesTxt(finDados.proximo))}</span> · <span>pré-visualização (não grava)</span></p>
      ${finAvisos(data)}${finTabelaPrecos(data, pub)}
      <button class="btn full" type="button" id="finPropor">Gravar como proposta</button>
      ${pub.length ? '' : '<small class="m">Enquanto não publicares nenhuma tabela, os anunciantes continuam a ver os preços antigos (em Kz).</small>'}`;
    c.querySelector('#finPropor').onclick = async () => {
      const { error: e2 } = await sb.rpc('admin_fin_propor', { p_mes: finDados.proximo });
      if (e2) return toast(limparErro(e2.message), 'mau'); toast('Proposta gravada. Revê e aprova.', 'bom'); renderFinancas(el);
    };
    return;
  }
  const dados = prop.dados || {};
  c.innerHTML = `<p class="m"><span>${FIN_ESTADO[prop.estado]}</span> · <span data-sem-traducao>${esc(finMesTxt(prop.mes))}</span> · <span>custo</span> <span data-sem-traducao>${finGbp(prop.custo_gbp)}</span> · <span>receita-alvo</span> <span data-sem-traducao>${finGbp(prop.receita_alvo_gbp)}</span></p>
    ${finAvisos(dados)}${finTabelaPrecos(dados, pub)}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      ${prop.estado === 'proposta' ? '<button class="btn" type="button" id="finAprovar" style="flex:1">Aprovar</button>' : ''}
      ${prop.estado === 'aprovada' ? '<button class="btn" type="button" id="finPublicar" style="flex:1">Publicar</button>' : ''}
      <button class="btn ghost" type="button" id="finRefazer" style="flex:1">Calcular de novo</button></div>
    <small class="m">Publicar só muda as encomendas novas. As que já estão pagas ficam com o preço delas.</small>`;
  c.querySelector('#finAprovar')?.addEventListener('click', async () => {
    const { error } = await sb.rpc('admin_fin_aprovar', { p_id: prop.id });
    if (error) return toast(limparErro(error.message), 'mau'); toast('Aprovada. Agora podes publicar.', 'bom'); renderFinancas(el);
  });
  c.querySelector('#finPublicar')?.addEventListener('click', async ev => {
    if (Date.now() - finConfirmar > 6000) { finConfirmar = Date.now(); ev.target.textContent = tr('Tocar outra vez para publicar'); return; }   // sem janelas do navegador: confirma com um 2.º toque
    finConfirmar = 0;
    const { error } = await sb.rpc('admin_fin_publicar', { p_id: prop.id });
    if (error) return toast(limparErro(error.message), 'mau'); toast('Preços publicados: os anunciantes já os veem.', 'bom'); renderFinancas(el);
  });
  c.querySelector('#finRefazer').onclick = async () => {
    const { error } = await sb.rpc('admin_fin_propor', { p_mes: prop.mes });
    if (error) return toast(limparErro(error.message), 'mau'); toast('Proposta calculada de novo.', 'bom'); renderFinancas(el);
  };
}

// ── Projeções ───────────────────────────────────────────────────────────────
// 0dp-1 (6 nov): a conta do mês com a ocupação-alvo, linha a linha (vendas → o que a Stripe tira → fica → custos → lucro)
function finContas(x, alvoMargem) {
  const d = x.deducoes || {}, linha = (rot, v, forte, extra = '') => `<div class="row" style="padding:6px 10px"><div class="t"><b style="font-weight:${forte ? 800 : 500}">${rot}</b>${extra}</div><div data-sem-traducao style="text-align:right;white-space:nowrap;font-weight:${forte ? 800 : 500}">${finGbp(v)}</div></div>`;
  const ok = x.margem != null && x.margem >= alvoMargem - 1e-9;
  return `<div class="sub2"><span>Com a ocupação-alvo</span> (<span data-sem-traducao>${finPct(x.ocupacao)}</span>)</div><div class="list">
    ${linha('<span>Vendas brutas</span>', x.receita_gbp, true)}
    ${linha('<span>− Comissão do cartão</span>', -(d.cartao_gbp || 0))}
    ${linha('<span>− Taxa fixa</span>', -(d.fixas_gbp || 0), false, ` <small>(<span data-sem-traducao>${finNum(x.compras, 1)}</span> <span>compras</span>)</small>`)}
    ${linha('<span>− Conversão de moeda</span>', -(d.fx_gbp || 0))}
    ${linha('<span>− Managed Payments</span>', -(d.managed_gbp || 0))}
    ${linha('<span>− Imposto retido</span>', -(d.imposto_gbp || 0))}
    ${linha('<span>= Fica connosco</span>', x.fica_gbp, true)}
    ${linha('<span>− Custos do mês</span>', -x.custo_gbp)}
    ${linha('<span>= Lucro</span>', x.lucro_gbp, true)}
    <div class="row" style="padding:6px 10px"><div class="t"><b>Margem sobre as vendas</b><small><span>Margem sobre o que fica</span>: <span data-sem-traducao>${finPct(x.margem_fica)}</span></small></div>
      <div data-sem-traducao style="text-align:right;font-weight:800;color:${ok ? 'var(--good,#2e9e5b)' : 'var(--bad,#c33)'}">${finPct(x.margem)}</div></div></div>
    ${ok ? '' : '<div class="row"><div class="t"><b>⚠️ Com esta ocupação a margem fica abaixo do objetivo.</b></div></div>'}`;
}
async function finProjecoes(c, el) {
  const df = finDados.definicoes || {}, prev = +finDados.custo_previsto_prox_gbp || 0;
  const v = finSim?.aj || { custo: prev, margem: +df.margem * 100, ocupacao: +df.ocupacao * 100, min: (+df.min_semana_eur_cent || 199) / 100, taxa: +df.taxa_cartao_pct * 100,
    fixa: +(df.taxa_cartao_fixa_gbp ?? 0.2), fx: +(df.taxa_fx_pct ?? 0.02) * 100, mp: +(df.taxa_mp_pct ?? 0.035) * 100, imp: +(df.imposto_pct ?? 0.165) * 100, mensal: +(df.partilha_mes ?? 0) * 100 };
  c.innerHTML = `<div class="sub2">Simular (não grava)</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <div style="flex:1 1 110px"><label>Custo do mês (£)</label><input class="inp" id="fsCusto" type="number" step="0.01" value="${finNum(v.custo).replace(/,/g, '')}"></div>
      <div style="flex:1 1 90px"><label>Margem (%)</label><input class="inp" id="fsMargem" type="number" step="1" min="0" max="90" value="${Math.round(v.margem)}"></div>
      <div style="flex:1 1 90px"><label>Ocupação-alvo (%)</label><input class="inp" id="fsOcup" type="number" step="5" min="5" max="100" value="${Math.round(v.ocupacao)}"></div>
      <div style="flex:1 1 90px"><label>Preço mínimo (€)</label><input class="inp" id="fsMin" type="number" step="1" min="0.99" value="${v.min}"></div>
      <div style="flex:1 1 90px"><label>Comissão do cartão (%)</label><input class="inp" id="fsTaxa" type="number" step="0.1" min="0" max="20" value="${finNum(v.taxa, 1)}"></div>
      <div style="flex:1 1 90px"><label>Taxa fixa por compra (£)</label><input class="inp" id="fsFixa" type="number" step="0.01" min="0" max="5" value="${v.fixa}"></div>
      <div style="flex:1 1 90px"><label>Conversão de moeda (%)</label><input class="inp" id="fsFx" type="number" step="0.1" min="0" max="20" value="${finNum(v.fx, 1)}"></div>
      <div style="flex:1 1 90px"><label>Managed Payments (%)</label><input class="inp" id="fsMp" type="number" step="0.1" min="0" max="20" value="${finNum(v.mp, 1)}"></div>
      <div style="flex:1 1 90px"><label>Imposto retido (%)</label><input class="inp" id="fsImp" type="number" step="0.5" min="0" max="60" value="${finNum(v.imp, 1)}"></div>
      <div style="flex:1 1 90px"><label>Vendas mensais (%)</label><input class="inp" id="fsMensal" type="number" step="5" min="0" max="100" value="${Math.round(v.mensal)}"></div></div>
    <small class="m">Estimativa a partir dos relatórios da Stripe (31 out–5 nov). O imposto varia com o país de quem compra.</small>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button class="btn" type="button" id="fsCalc" style="flex:1">Recalcular</button><button class="btn ghost" type="button" id="fsGuardar" style="flex:1">Guardar como definições</button></div>
    <div id="fsRes"><div class="empty">A calcular…</div></div>
    <div class="sub2">Crescimento: jogadores, base de dados e lucro</div>
    <small class="m">Pressupostos NÃO medidos — ajusta. Cada anúncio vende-se ao preço justo por vistas.</small>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <div style="flex:1 1 100px"><label>Pico online (% semanais)</label><input class="inp" id="fgPico" type="number" value="25"></div>
      <div style="flex:1 1 100px"><label>Online por GB de RAM</label><input class="inp" id="fgGb" type="number" value="30"></div>
      <div style="flex:1 1 100px"><label>€ por 1.000 vistas</label><input class="inp" id="fgCpm" type="number" step="0.5" value="${+df.cpm_justo_eur || 5}"></div></div>
    <div id="fgRes"></div>`;
  const num = (id, d) => { const x = parseFloat(c.querySelector(id)?.value); return Number.isFinite(x) ? x : d; };
  const ler = () => ({ custo: num('#fsCusto', 0), margem: num('#fsMargem', 0), ocupacao: num('#fsOcup', 50) || 50, min: num('#fsMin', 1.99) || 1.99, taxa: num('#fsTaxa', 0),
    fixa: num('#fsFixa', 0.2), fx: num('#fsFx', 0), mp: num('#fsMp', 0), imp: num('#fsImp', 0), mensal: num('#fsMensal', 0) });
  const ajustes = aj => ({ margem: aj.margem / 100, ocupacao: aj.ocupacao / 100, min_semana_eur_cent: Math.round(aj.min * 100), taxa_cartao_pct: aj.taxa / 100,
    taxa_cartao_fixa_gbp: aj.fixa, taxa_fx_pct: aj.fx / 100, taxa_mp_pct: aj.mp / 100, imposto_pct: aj.imp / 100, partilha_mes: aj.mensal / 100 });
  const calcular = async () => {
    const aj = ler(); finSim = { aj };
    const { data, error } = await sb.rpc('admin_fin_simular', { p_mes: finDados.proximo, p_custo: aj.custo, p_ajustes: ajustes(aj) });
    const r = c.querySelector('#fsRes'); if (!r) return;
    if (error) { r.innerHTML = `<div class="empty">${esc(limparErro(error.message))}</div>`; return; }
    finSim.dados = data;
    const alvoOcc = aj.ocupacao / 100;
    const alvo = (data.cenarios || []).find(x => x.mistura === 'equilibrado' && Math.abs(x.ocupacao - alvoOcc) < 1e-6);
    r.innerHTML = `${finAvisos(data)}${alvo ? finContas(alvo, aj.margem / 100) : ''}<div class="list">${(data.cenarios || []).filter(x => x.mistura === 'equilibrado' || Math.abs(x.ocupacao - alvoOcc) < 1e-6).map(x => `
      <div class="row" ${Math.abs(x.ocupacao - alvoOcc) < 1e-6 && x.mistura === 'equilibrado' ? 'style="outline:2px solid var(--gold)"' : ''}><div class="t">
        <b><span data-sem-traducao>${finPct(x.ocupacao)}</span> · <span>${FIN_MISTURA[x.mistura]}</span></b>
        <small><span data-sem-traducao>${x.mistura === 'equilibrado' ? finNum(x.lugares_exato, 2) : x.lugares}</span> <span>lugares</span>${x.mistura !== 'equilibrado' && +x.lugares_exato !== x.lugares ? ` (<span data-sem-traducao>${finNum(x.lugares_exato, 2)}</span> <span>arredondado</span>)` : ''} · <span>vendas</span> <span data-sem-traducao>${finGbp(x.receita_gbp)}</span> · <span>deduções</span> <span data-sem-traducao>${finGbp(x.taxas_gbp)}</span> · <span>fica</span> <span data-sem-traducao>${finGbp(x.fica_gbp ?? (x.receita_gbp - x.taxas_gbp))}</span></small></div>
        <div data-sem-traducao style="text-align:right;white-space:nowrap"><b style="color:${x.lucro_gbp >= 0 ? 'var(--good,#2e9e5b)' : 'var(--bad,#c33)'}">${finGbp(x.lucro_gbp)}</b><br><small>${finPct(x.margem)}</small></div></div>`).join('')}</div>
      <small class="m">Ocupação não garante receita: depende de quais lugares se vendem.</small>`;
    crescer();
  };
  const crescer = () => {
    const r = c.querySelector('#fgRes'); if (!r) return;
    const pico = (+c.querySelector('#fgPico').value || 25) / 100, porGb = +c.querySelector('#fgGb').value || 30, cpm = +c.querySelector('#fgCpm').value || 5;
    const cam = finDados.cambios || {}, usd = cam.USD?.por_gbp || 1.34, eur = cam.EUR?.por_gbp || 1.2, ocup = (ler().ocupacao || 50) / 100;
    const custo = ler().custo, computeAgora = (15 - 10) / usd, outros = custo - computeAgora;   // hoje: Small (15 $) − 10 $ de crédito
    const jog = Math.max(1, +finDados.jogadores_7d || 1), vistasPorJogSem = (+finDados.seg_7d || 0) / 5 / jog;
    const niveis = [...new Set([jog, 250, 500, 1000, 2000, 5000])].sort((a, b) => a - b);
    r.innerHTML = `<div class="list">${niveis.map(n => {
      const online = Math.ceil(n * pico), base = FIN_BASES.find(([, gb]) => gb * porGb >= online) || FIN_BASES[FIN_BASES.length - 1];
      const custoN = outros + Math.max(0, base[2] - 10) / usd, vistasMes = n * vistasPorJogSem * 52 / 12, receita = vistasMes / 1000 * cpm / eur * ocup, lucro = receita - custoN;
      return `<div class="row"><div class="t"><b><span data-sem-traducao>${n.toLocaleString('en-GB')}</span> <span>jogadores por semana</span></b>
        <small><span>pico</span> <span data-sem-traducao>${online}</span> · <span data-sem-traducao>${base[0]}</span> · <span>custo</span> <span data-sem-traducao>${finGbp(custoN)}</span> · <span>anúncios</span> <span data-sem-traducao>${finGbp(receita)}</span></small></div>
        <div data-sem-traducao style="text-align:right"><b style="color:${lucro >= 0 ? 'var(--good,#2e9e5b)' : 'var(--bad,#c33)'}">${finGbp(lucro)}</b></div></div>`; }).join('')}</div>`;
  };
  c.querySelector('#fsCalc').onclick = calcular;
  ['#fgPico', '#fgGb', '#fgCpm'].forEach(s => c.querySelector(s).addEventListener('input', crescer));
  c.querySelector('#fsGuardar').onclick = async () => {
    const aj = ler();
    const { error } = await sb.rpc('admin_fin_definicoes', { p: ajustes(aj) });
    if (error) return toast(limparErro(error.message), 'mau'); toast('Definições guardadas.', 'bom'); finAba = 'projecoes'; renderFinancas(el);
  };
  calcular();
}

// ── Histórico ───────────────────────────────────────────────────────────────
function finHistorico(c) {
  const h = finDados.historico || [];
  c.innerHTML = h.length ? `<div class="list">${h.map(t => {
    const lucro = (+t.vendas_gbp || 0) - (+t.custo_real_gbp || 0), margem = +t.vendas_gbp > 0 ? lucro / t.vendas_gbp : null;
    return `<div class="row"><div class="t"><b><span data-sem-traducao>${esc(finMesTxt(t.mes))}</span> · <span>${FIN_ESTADO[t.estado] || t.estado}</span></b>
      <small><span>previsto</span> <span data-sem-traducao>${finGbp(t.custo_gbp)}</span> · <span>real</span> <span data-sem-traducao>${finGbp(t.custo_real_gbp)}</span> · <span>vendas</span> <span data-sem-traducao>${finGbp(t.vendas_gbp)}</span>${t.publicado_por ? ` · <span>publicada por</span> <span data-sem-traducao>${esc(t.publicado_por)}</span>` : t.aprovado_por ? ` · <span>aprovada por</span> <span data-sem-traducao>${esc(t.aprovado_por)}</span>` : ''}</small></div>
      <div data-sem-traducao style="text-align:right"><b>${finGbp(lucro)}</b><br><small>${finPct(margem)} / ${finPct(+finDados.definicoes?.margem)}</small></div></div>`; }).join('')}</div>` : '<div class="empty">Ainda não há tabelas de preços.</div>';
}
