/* ============================================================
   Vida na Banda — EMPRESAS E CARREIRAS
   ============================================================ */
const CARGOS = ['Estagiário/a', 'Júnior', 'Pleno', 'Sénior', 'Chefe'];
// LL12: cada emprego tem uma perícia; mudar para outro da mesma perícia mantém o nível na carreira
const PERICIAS = { conduzir: '🚐 Conduzir', fisico: '💪 Trabalho físico', vender: '🛍️ Vender e servir', ensinar: '🎓 Ensinar e orientar', financas: '🏦 Finanças', tecnologia: '💻 Tecnologia', beleza: '💇 Beleza e moda', saude: '🩺 Saúde', musica: '🎵 Música' };
// a lista do que falta para a próxima promoção (as mesmas contas do servidor: pedir_promocao)
function listaPromocao(n, d, precisa, minimo) {
  const t = Math.min(J.turnos, precisa), okT = J.turnos >= precisa, okD = d >= minimo, chance = Math.round(Math.min(100, Math.max(0, 60 + (d - minimo))));
  const linha = (ok, e, tit, det) => `<div class="row ${ok ? 'mine' : ''}"><span class="e">${ok ? '✅' : e}</span><div class="t"><b>${tit}</b><small>${det}</small></div></div>`;
  return `<div class="list promo" style="margin-top:10px">
    ${linha(okT, '⏳', `Turnos: ${t}/${precisa}`, okT ? 'Feito.' : `Faltam ${precisa - J.turnos} turno(s) neste cargo.`)}
    ${linha(okD, '📊', `Desempenho: ${d}/${minimo}`, okD ? 'Chega para pedir.' : 'Trabalha bem-disposto/a (humor 60+), em forma (60+) e sem stress (abaixo de 80).')}
    ${linha(false, '📈', `Próximo cargo: ${CARGOS[n]}`, `+25% de salário. ${okT && okD ? `Hipótese de o chefe dizer sim: ${chance}%.` : 'Quando os dois estiverem feitos, pede a promoção.'}`)}
  </div>`;
}
// 0g-D (27 out): os negócios rendem menos (pagam-se em ~3 semanas, não numa); req = [estudo, reputação] para trabalhar lá
const OURO_EMP_EXTRA = 900;   // 8 nov (dono): do 4.º negócio em diante, cada um custa 900 Ouro (igual a _emp_preco_ouro_extra no servidor)
const TIPOS_EMP = {
  cantina: { nome: 'Cantina', e: '🍲', custo: 150000, receita: 19000, req: [0, 0] },
  salao: { nome: 'Salão de beleza', e: '💇', custo: 200000, receita: 25000, req: [0, 0] },
  loja: { nome: 'Loja de bairro', e: '🛒', custo: 250000, receita: 29000, req: [0, 0] },
  candongueiros: { nome: 'Frota de candongueiros', e: '🚐', custo: 500000, receita: 58000, req: [0, 10] },
  discoteca: { nome: 'Discoteca', e: '💃', custo: 800000, receita: 87000, req: [0, 10] },
  construtora: { nome: 'Construtora', e: '🏗️', custo: 1500000, receita: 150000, req: [1, 20] },
  importadora: { nome: 'Importadora', e: '📦', custo: 3000000, receita: 290000, req: [2, 30] },
  // economia C (2 nov): 3 negócios no topo, cada um pede o de baixo (igual ao servidor: _emp_pede)
  petrolifera: { nome: 'Serviços petrolíferos', e: '🛢️', custo: 100000000, receita: 10000000, req: [3, 40], pede: 'importadora' },
  porto: { nome: 'Porto privado e logística', e: '⚓', custo: 500000000, receita: 50000000, req: [3, 50], pede: 'petrolifera' },
  telecom: { nome: 'Operadora de telecomunicações', e: '📡', custo: 2000000000, receita: 200000000, req: [4, 60], pede: 'porto' },
};

/* ---------- carreira (📱 → Perfil) ---------- */
let minhaEmpresaTrab = null;
let empAcabada = null;   // 9 nov: o negócio que acabaste de abrir (para o convite «Entrar»)
const TY_ENTRAR = { cantina: 'Entrar na cantina', discoteca: 'Entrar na discoteca', salao: 'Entrar no salão', loja: 'Entrar na loja' };
function blocoCarreira() {
  if (J.cargo_nivel == null) return '';
  // 8 nov: se a lista de empregos ainda não carregou, não rebentar (era o erro «e.nome» ao abrir o 📱)
  if (J.emprego && emprego(J.emprego)) {
    const e = emprego(J.emprego), n = J.cargo_nivel, precisa = 4 * n, minimo = 55 + 5 * n, d = Math.round(J.desempenho);
    const idade = idadeDe(J);
    return `<div class="rel"><div class="lbl"><span>💼 ${esc(e.nome)} · ${CARGOS[n - 1]}</span><span style="color:var(--dim);font-weight:600">+${25 * (n - 1)}% salário</span></div>
      <div class="lbl" style="margin-top:8px;font-weight:600"><span>📊 Desempenho</span><span>${d}</span></div>
      <div class="meter"><u style="left:0;width:${d}%;background:${d < 25 ? 'var(--red)' : d < minimo ? 'var(--gold)' : 'var(--green)'}"></u></div>
      <div class="lbl" style="margin-top:8px;font-weight:600"><span>🔁 ${esc(tr('Turnos feitos'))}</span><span>${(J.turnos_total ?? J.turnos ?? 0).toLocaleString('pt-PT')}</span></div>   <!-- 8 nov: FILA 0ey -->
      ${n < 5 ? listaPromocao(n, d, precisa, minimo) : ''}
      ${e.pericia && PERICIAS[e.pericia] ? `<small style="display:block;color:var(--muted);font-size:12px;margin-top:8px">${tr('Perícia')}: <b>${tr(PERICIAS[e.pericia])}</b> — ${tr('se mudares para outro emprego desta área, ficas com o teu nível.')}</small>` : ''}
      <small style="display:block;color:var(--muted);font-size:12px;margin-top:6px">${n >= 5 ? 'És chefe! Mais acima, só com a tua própria empresa.' : ''} ${d < 25 ? '⚠️ Abaixo de 15 és despedido/a!' : 'Bom humor e boa forma ajudam; stress estraga.'}</small>
      <div class="grelha">
        ${n < 5 ? `<button id="bPromo" ${J.turnos < precisa || d < minimo ? 'disabled' : ''}><span class="e">📈</span><span>Pedir promoção</span></button>` : ''}
        ${idade >= 60 ? `<button id="bReforma"><span class="e">🏖️</span><span>Pedir a reforma</span></button>` : ''}
      </div></div>`;
  }
  if (J.empresa_id && minhaEmpresaTrab) {
    const t = TIPOS_EMP[minhaEmpresaTrab.tipo] || {};
    // 8 nov: com a licença por sair, o servidor recusa o turno («ainda está à espera da licença», ~200 vezes por dia)
    if (minhaEmpresaTrab.licenca_ate && new Date(minhaEmpresaTrab.licenca_ate) > new Date())
      return `<div class="rel"><div class="lbl"><span>${t.e || '🏢'} ${esc(minhaEmpresaTrab.nome)}</span><span class="price">${fmtKz(minhaEmpresaTrab.salario)}/turno</span></div>
      <small style="display:block;color:var(--muted);font-size:12px;margin-top:4px">📄 ${tr('À espera da licença. Podes trabalhar quando sair.')}</small>
      <div class="grelha"><button id="bSairEmp" class="perigo"><span class="e">👋</span><span>Despedir-me</span></button></div></div>`;
    return `<div class="rel"><div class="lbl"><span>${t.e || '🏢'} ${esc(minhaEmpresaTrab.nome)}</span><span class="price">${fmtKz(minhaEmpresaTrab.salario)}/turno</span></div>
      <small style="display:block;color:var(--muted);font-size:12px;margin-top:4px">Patrão/patroa: ${esc(minhaEmpresaTrab.donoNome || '?')} · 📍 ${esc(bairro(minhaEmpresaTrab.bairro)?.nome || '')}. Se a caixa estiver vazia, não te pagam!</small>
      <div class="grelha"><button id="bTrabEmp" class="${minhaEmpresaTrab.bairro === J.bairro ? '' : ''}" ${minhaEmpresaTrab.bairro !== J.bairro ? 'disabled' : ''}><span class="e">💪</span><span>Trabalhar${minhaEmpresaTrab.bairro !== J.bairro ? `<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">Vai a ${esc(bairro(minhaEmpresaTrab.bairro)?.nome || '')}</small>` : ''}</span></button>
      <button id="bSairEmp" class="perigo"><span class="e">👋</span><span>Despedir-me</span></button></div></div>`;
  }
  if (J.pensao > 0) return `<div class="rel"><div class="lbl"><span>🏖️ Reformado/a</span><span class="price">${fmtKz(J.pensao)}/dia</span></div></div>`;
  return '';
}
async function carregarTrabEmp() {
  minhaEmpresaTrab = null;
  if (!J?.empresa_id) return;
  const pt = pre('trab_emp'); if (pt?.v) { minhaEmpresaTrab = pt.v; return; }   // 8 nov (0fe-3): veio no arranque
  const [{ data: e }, { data: f }] = await Promise.all([sb.from('empresas').select('*').eq('id', J.empresa_id).maybeSingle(), sb.from('empregados').select('*').eq('jogador_id', uid).maybeSingle()]);
  if (!e) return;
  const n = await nomesDe([e.dono]);
  minhaEmpresaTrab = { ...e, salario: f?.salario ?? e.vaga_salario, donoNome: n[e.dono] };
}
function ligarCarreira(body) {
  body.querySelector('#bPromo')?.addEventListener('click', async () => { if (await acao('pedir_promocao')) abrirTelemovel('eu'); });
  body.querySelector('#bReforma')?.addEventListener('click', () => confirmar('Pedir a reforma? 🏖️', `Deixas de trabalhar e recebes metade do teu salário atual todos os dias, para sempre.`, 'Reformar',
    async () => { if (await acao('reformar')) abrirTelemovel('eu'); }));
  // 8 nov: se o patrão te despediu (ou fechou o negócio) há pouco, o 📱 ainda mostrava a empresa e o servidor respondia
  // «Não trabalhas em nenhuma empresa» (~150 vezes por dia). Quando falha, vai buscar o estado verdadeiro e redesenha.
  const ressincronizar = async () => { const { data } = await sb.rpc('estado'); if (data?.jogador) setJogador(data.jogador); await carregarTrabEmp(); abrirTelemovel('eu'); };
  body.querySelector('#bTrabEmp')?.addEventListener('click', async () => { if (await acao('trabalhar_empresa', { p_id: null })) abrirTelemovel('eu'); else ressincronizar(); });
  body.querySelector('#bSairEmp')?.addEventListener('click', () => confirmar('Despedir-te?', 'Deixas de trabalhar nesta empresa.', 'Despedir-me',
    async () => { if (await acao('sair_empresa')) { await carregarTrabEmp(); abrirTelemovel('eu'); } else ressincronizar(); }));
}

/* ---------- 🏢 Empresas ---------- */
// item 2 (2 nov): tamanhos e contas de sábado (calculadas no servidor: empresa_contas)
const TAM_EMP = { quiosque: '🏪 Quiosque', loja: '🏬 Loja', plaza: '🏢 Plaza' };
// fatia 2 (3 nov): gerente, gerador, preço, marketing — os mesmos números do servidor (empresa_melhorar)
const VENDAS_TAM = { quiosque: 1, loja: 2.2, plaza: 4 }, MULT_EMP = 4;
const PRECO_EMP = { barato: ['🏷️ Barato', 'Mais clientes (+4%), mas o stock pesa mais (+25%).'], justo: ['🏷️ Justo', 'O normal.'], premium: ['💎 Premium', 'Menos clientes (−9%), mas o stock pesa menos (−23%).'] };
const CAMPANHAS = { panfletos: ['🗞️', 'Panfletos', 0.20, 1, 0.08], radio: ['📻', 'Anúncio na rádio', 0.35, 2, 0.25], redes: ['📱', 'Redes sociais', 0.60, 3, 0.60] };
const diaNormalEmp = e => Math.floor((TIPOS_EMP[e.tipo]?.receita || 0) * MULT_EMP * (VENDAS_TAM[e.tamanho] || 1));
const custoGerador = e => Math.max(50000, Math.floor((TIPOS_EMP[e.tipo]?.custo || 0) * 0.10));
const custoCameras = e => Math.max(30000, Math.floor((TIPOS_EMP[e.tipo]?.custo || 0) * 0.10));
const custoCampanha = (e, k) => Math.max(1000, Math.floor(diaNormalEmp(e) * CAMPANHAS[k][4]));
function blocoMelhorias(e, todas = []) {
  const camp = e.marketing_ate && e.marketing_ate >= new Date(Date.now() + 3600e3).toISOString().slice(0, 10) ? CAMPANHAS[e.marketing] : null;
  return `<div class="chips" style="margin-top:8px">${e.gerente ? '<span class="chip">👔 Gerente</span>' : ''}${e.gerador ? '<span class="chip">🔌 Gerador</span>' : ''}${e.seguranca ? '<span class="chip">💂 Segurança</span>' : ''}${e.cao ? '<span class="chip">🐕 Cão</span>' : ''}${e.cameras ? '<span class="chip">📹 Câmaras</span>' : ''}<span class="chip">${PRECO_EMP[e.preco || 'justo'][0]}</span>${camp ? `<span class="chip">📣 ${tr(camp[1])} · ${tr('até')} <span data-sem-traducao>${e.marketing_ate.slice(8, 10)}/${e.marketing_ate.slice(5, 7)}</span></span>` : ''}</div>
    <div class="grelha">
      <button data-m="${e.gerente ? 'sem_gerente' : 'gerente'}"><span class="e">👔</span><span>${e.gerente ? 'Despedir o gerente' : 'Contratar gerente'}<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">${e.gerente ? '' : tr('15% das vendas da semana')}</small></span></button>
      ${e.gerador ? '' : `<button data-m="gerador"><span class="e">🔌</span><span>Comprar gerador<small style="display:block;font-weight:600;color:var(--dim);font-size:11px" data-sem-traducao>${fmtKz(custoGerador(e))}</small></span></button>`}
      <button data-m="preco"><span class="e">🏷️</span><span>Mudar os preços</span></button>
      ${camp ? '' : `<button data-m="marketing"><span class="e">📣</span><span>Fazer publicidade</span></button>`}
    </div>
    <div class="sub2" style="margin-top:12px">Contra assaltos</div>
    <small style="display:block;color:var(--muted);font-size:12px">Os ladrões só aparecem a quem já tem 50 milhões de Kz ou mais.</small>
    <div class="grelha">
      <button data-m="${e.seguranca ? 'sem_seguranca' : 'seguranca'}"><span class="e">💂</span><span>${e.seguranca ? 'Dispensar o segurança' : 'Contratar segurança'}<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">${e.seguranca ? '' : tr('3% das vendas da semana')}</small></span></button>
      ${e.cao ? '' : `<button data-m="cao"><span class="e">🐕</span><span>Cão de guarda<small style="display:block;font-weight:600;color:var(--dim);font-size:11px" data-sem-traducao>${fmtKz(30000)}</small></span></button>`}
      ${e.cameras ? '' : `<button data-m="cameras"><span class="e">📹</span><span>Câmaras<small style="display:block;font-weight:600;color:var(--dim);font-size:11px" data-sem-traducao>${fmtKz(custoCameras(e))}</small></span></button>`}
    </div>
    ${e.matriz ? '' : (() => { const fil = todas.filter(x => x.matriz === e.id), aqui = [e, ...fil].some(x => x.bairro === J.bairro);
      return `<div class="sub2" style="margin-top:12px">Filiais <span data-sem-traducao>${fil.length}/4</span></div><div id="filPronto"></div>
      ${fil.length ? `<small style="display:block;color:var(--muted);font-size:12px" data-sem-traducao>${fil.map(x => esc(bairro(x.bairro)?.nome || x.bairro)).join(' · ')}</small>` : ''}
      ${fil.length < 4 ? `<div class="grelha"><button data-m="filial" ${aqui ? 'disabled' : ''}><span class="e">🏪</span><span>${aqui ? tr('Vai a outro bairro para abrir uma filial') : `${tr('Abrir filial em')} ${esc(bairro(J.bairro)?.nome || '')}`}<small style="display:block;font-weight:600;color:var(--dim);font-size:11px" data-sem-traducao>${fmtKz((TIPOS_EMP[e.tipo]?.custo || 0) + 25000)}</small></span></button></div>` : ''}`; })()}`;
}
// 9 nov (dono: «Let's do 1»): antes de levantar, mostra o IRT — o que é capital teu (sem imposto), o lucro, o imposto e o que recebes
// cartões de dicas com setas (‹ ›) e deslizar — um ponto de cada vez
function dicasHTML(itens) {
  return `<div class="dicas"><div class="dicas-txt">${itens.map((t, i) => `<p${i ? ' hidden' : ''}>${t}</p>`).join('')}</div>
    <div class="dicas-nav"><button type="button" class="dicas-seta" data-d="-1" aria-label="${esc(tr('Anterior'))}">‹</button><span class="dicas-pts">${itens.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span><button type="button" class="dicas-seta" data-d="1" aria-label="${esc(tr('Seguinte'))}">›</button></div></div>`;
}
function ligarDicas(raiz) {
  raiz.querySelectorAll('.dicas').forEach(d => {
    const ps = [...d.querySelectorAll('.dicas-txt p')], pts = [...d.querySelectorAll('.dicas-pts i')]; let i = 0, x0 = null;
    const ir = n => { i = (n + ps.length) % ps.length; ps.forEach((p, k) => { p.hidden = k !== i; }); pts.forEach((p, k) => p.classList.toggle('on', k === i)); };
    d.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => ir(i + Number(b.dataset.d)); });
    d.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) ir(i + (dx < 0 ? 1 : -1)); });
  });
}
function levantarComIRT(e, fazer) {
  const el = sheet(`<h3>${tr('Levantar de')} ${esc(e.nome)}</h3>
    <p class="m">${tr('A caixa tem')} <b data-sem-traducao>${fmtKz(e.caixa)}</b>. ${tr('Deixa sempre algum para pagar salários!')}</p>
    <label>${tr('Valor (Kz)')}</label><input class="inp" id="iValor" type="number" min="100" step="100" value="${Math.max(0, Math.floor(e.caixa / 2))}">
    <div class="irt-prev" id="irtPrev"><small>${tr('A calcular o IRT…')}</small></div>
    <button class="btn full" id="sim">${tr('Levantar')}</button>`);
  const inp = el.querySelector('#iValor'), box = el.querySelector('#irtPrev'), btn = el.querySelector('#sim');
  let t = null, n = 0;
  const linha = (a, b, cor) => `<div class="lbl"><span>${a}</span><span class="price" data-sem-traducao${cor ? ` style="color:${cor}"` : ''}>${b}</span></div>`;
  const calcular = async () => {
    const v = parseInt(inp.value, 10) || 0, k = ++n;
    const { data, error } = await sb.rpc('irt_simular', { p_empresa: e.id, p_valor: v });
    if (k !== n || !box.isConnected) return;
    if (error || !data) { box.innerHTML = `<small>${tr('O lucro que levantas paga IRT; o dinheiro que tu puseste na caixa volta sem imposto.')}</small>`; return; }
    btn.textContent = `${tr('Levantar')} · ${tr('recebes')} ${fmtKz(data.recebes)}`;
    box.innerHTML = linha(tr('Levantas'), fmtKz(data.valor))
      + (data.capital > 0 ? linha(tr('O teu capital (sem imposto)'), fmtKz(data.capital)) : '')
      + linha(tr('Lucro'), fmtKz(data.lucro))
      + linha(`🧾 IRT${data.lucro > 0 ? ` · ${data.taxa}%` : ''}`, data.imposto ? '−' + fmtKz(data.imposto) : fmtKz(0), data.imposto ? 'var(--red)' : '')
      + `<div class="irt-tot">${linha(`<b>${tr('Recebes na carteira')}</b>`, `<b>${fmtKz(data.recebes)}</b>`, 'var(--green)')}</div>`
      + `<small>${data.lucro > 0 ? tr('O IRT é por escalões da semana (segunda a domingo) e no lucro das empresas nunca passa de 30%. Esta semana já tiveste {0} de rendimentos; o próximo kwanza de lucro paga {1}%.').replace('{0}', fmtKz(data.semana_bruto)).replace('{1}', data.marginal) : tr('Estás a levantar só o capital que puseste: não paga IRT.')}</small>`;
  };
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(calcular, 350); });
  btn.onclick = () => { const v = parseInt(inp.value, 10); if (!v) return toast('Escreve um valor.', 'mau'); fazer(v); };
  calcular();
}

function ligarMelhorias(e, el, depois) {
  if (!e.matriz) prontidaoFilial(e, el, depois);
  const fazer = async (ac, v) => { if (await acao('empresa_melhorar', { p_id: e.id, p_acao: ac, p_valor: v ?? null })) { fecharSheets(); depois(); } };
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const m = b.dataset.m;
    if (m === 'seguranca') return confirmar(`Contratar um segurança para ${esc(e.nome)}?`, 'Fica com 3% das vendas da semana. Os assaltos ficam muito mais raros (−70%).', 'Contratar', () => fazer('seguranca'));
    if (m === 'sem_seguranca') return confirmar('Dispensar o segurança?', 'Os assaltos voltam a ser mais prováveis.', 'Dispensar', () => fazer('sem_seguranca'));
    if (m === 'cao') return confirmar(`Comprar um cão de guarda para ${esc(e.nome)}?`, `Custa ${fmtKz(30000)}, uma vez. Os ladrões pensam duas vezes (−40%).`, 'Comprar', () => fazer('cao'));
    if (m === 'cameras') return confirmar(`Pôr câmaras em ${esc(e.nome)}?`, `Custa ${fmtKz(custoCameras(e))}, uma vez. Menos assaltos (−30%) e, se houver um, a polícia recupera metade.`, 'Comprar', () => fazer('cameras'));
    if (m === 'filial') return confirmar(`Abrir uma filial de ${esc(e.nome)} em ${esc(bairro(J.bairro)?.nome || '')}?`, `Custa ${fmtKz((TIPOS_EMP[e.tipo]?.custo || 0) + 25000)} (investimento + licença). Começa como quiosque e tem as suas próprias vendas e contas.`, 'Abrir', async () => { if (await acao('empresa_filial', { p_id: e.id })) { fecharSheets(); depois(); } });
    if (m === 'gerente') return confirmar(`Contratar um gerente para ${esc(e.nome)}?`, 'Fica com 15% das vendas da semana (sai nas contas de sábado). Com gerente, a empresa vende tudo mesmo nos dias em que não jogas.', 'Contratar', () => fazer('gerente'));
    if (m === 'sem_gerente') return confirmar('Despedir o gerente?', 'Nos dias em que não jogas, a empresa só vende metade.', 'Despedir', () => fazer('sem_gerente'));
    if (m === 'gerador') return confirmar(`Comprar um gerador para ${esc(e.nome)}?`, `Custa ${fmtKz(custoGerador(e))}. Nos cortes de luz continua a vender (sem gerador perde 40%). O combustível (2% das vendas da semana) sai nas contas de sábado.`, 'Comprar', () => fazer('gerador'));
    if (m === 'preco') {
      const s2 = sheet(`<h3>🏷️ Preços de <span data-sem-traducao>${esc(e.nome)}</span></h3><p class="m">Conta a partir do fecho das 18:00.</p><div class="list">${Object.entries(PRECO_EMP).map(([k, [t, d]]) => `<button class="row ${(e.preco || 'justo') === k ? 'mine' : ''}" data-p="${k}" style="text-align:left"><div class="t"><b>${t}</b><small>${d}</small></div></button>`).join('')}</div>`);
      s2.querySelectorAll('[data-p]').forEach(x => x.onclick = () => fazer('preco', x.dataset.p));
      return;
    }
    if (m === 'marketing') {
      const s2 = sheet(`<h3>📣 Publicidade para <span data-sem-traducao>${esc(e.nome)}</span></h3><p class="m">Mais clientes nas próximas noites. Uma campanha de cada vez.</p><div class="list">${Object.entries(CAMPANHAS).map(([k, [ic, n, bon, noites]]) => `<button class="row" data-c="${k}" style="text-align:left"><span class="e">${ic}</span><div class="t"><b>${n}</b><small><span data-sem-traducao>+${Math.round(bon * 100)}%</span> ${tr('nas vendas')} · <span data-sem-traducao>${noites}</span> ${tr(noites === 1 ? 'noite' : 'noites')}</small></div><span class="price" data-sem-traducao>${fmtKz(custoCampanha(e, k))}</span></button>`).join('')}</div>`);
      s2.querySelectorAll('[data-c]').forEach(x => x.onclick = () => fazer('marketing', x.dataset.c));
    }
  });
}
async function mostrarContasEmp(e, el) {
  if (!el) return;
  const { data: c, error } = await sb.rpc('empresa_contas', { p_id: e.id });
  if (error || !c) return;
  const graca = new Date(c.contas_desde) > new Date();
  el.innerHTML = `<div class="lbl" style="margin-top:8px"><span>🧾 Contas de sábado (até agora)</span><span class="price" data-sem-traducao>${fmtKz(c.total || 0)}</span></div>
    <small style="display:block;color:var(--muted);font-size:12px"><span>renda</span> <span data-sem-traducao>${fmtKz(c.renda || 0)}</span> · <span>ajudantes</span> <span data-sem-traducao>${fmtKz(c.salarios || 0)}</span> · <span>stock</span> <span data-sem-traducao>${fmtKz(c.stock || 0)}</span> · <span>impostos</span> <span data-sem-traducao>${fmtKz(c.imposto || 0)}</span></small>
    <small style="display:block;color:var(--muted);font-size:12px">${graca ? 'Primeira semana: ainda não pagas contas.' : 'Saem da caixa no sábado às 18:10. Deixa dinheiro na caixa!'}</small>
    <small style="display:block;color:var(--dim);font-size:12px"><span>Máximo de vendas por dia (todas as tuas empresas)</span>: <span data-sem-traducao>${fmtKz(c.teto || 0)}</span></small>`;
}
// 6 nov (dono: «people are making businesses and the businesses just don't show up»): o servidor devolve no máximo 1.000 linhas
// por pedido; com 1.378 empresas, as mais novas (por id) nunca chegavam. Agora lê-se tudo, 1.000 de cada vez.
async function lerTudo(fazer) {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const { data, error } = await fazer().range(i * 1000, i * 1000 + 999);
    if (error) return { data: out.length ? out : null, error: out.length ? null : error };
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
}
async function renderEmpresas(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  // 9 nov (registos: o app Empresas fazia ~20 pedidos por abertura — 1.400 negócios aos bocados + nomes de 150 em 150):
  // a lista dos outros vem de /api/empresas (a mesma para todos, guardada 60 s na Vercel); os meus negócios e a minha equipa vêm da base.
  let emps, fs, nomes, contagem = null, error = null;
  // (guardada 2 min no telemóvel: abrir o app outra vez não descarrega a lista de novo)
  const pub = (renderEmpresas._c && Date.now() - renderEmpresas._em < 120000) ? renderEmpresas._c
    : await fetch('/api/empresas').then(r => r.ok ? r.json() : null, () => null).then(d => { if (d?.e) { renderEmpresas._c = d; renderEmpresas._em = Date.now(); } return d; });
  if (pub?.e) {
    const m = await sb.from('empresas').select('*').eq('dono', uid).eq('falida', false).order('id');
    if (m.error) error = m.error;
    const minhasIds = (m.data || []).map(e => e.id);
    const st = minhasIds.length ? await sb.from('empregados').select('*').in('empresa_id', minhasIds) : { data: [] };
    fs = st.data || []; contagem = pub.c || {};
    const outrasPub = pub.e.filter(x => x[3] !== uid).map(([id, nome, tipo, dono, bairro, vaga_salario, nivel]) => ({ id, nome, tipo, dono, bairro, vaga_salario, nivel }));
    emps = [...(m.data || []), ...outrasPub];
    Object.entries(pub.n || {}).forEach(([id, n]) => typeof lembrarNome === 'function' && lembrarNome(id, n));
    nomes = { ...(pub.n || {}), ...(await nomesDe(fs.map(x => x.jogador_id))) };
  } else {
    const r = await Promise.all([
      lerTudo(() => sb.from('empresas').select('*').eq('falida', false).order('id')),
      lerTudo(() => sb.from('empregados').select('*').order('jogador_id'))]);
    emps = r[0].data; error = r[0].error; fs = r[1].data;
    if (!error) nomes = await nomesDe([...emps.map(e => e.dono), ...(fs || []).map(f => f.jogador_id)]);
  }
  if (error) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  // 9 nov 14:01 (dono: «they are making business but the businesses are not appearing»): com ~3.900 negócios, os novos ficavam
  // no fim da lista (40 de cada vez, do mais antigo para o mais novo) — agora os mais novos aparecem primeiro
  const minhas = emps.filter(e => e.dono === uid), outras = emps.filter(e => e.dono !== uid).sort((a, b) => b.id - a.id);
  const extra = minhas.filter(x => !x.matriz).length >= 3;   // 8 nov: do 4.º negócio em diante paga-se Ouro (servidor: criar_empresa)
  const staffDe = id => (fs || []).filter(f => f.empresa_id === id);
  const nStaff = id => contagem && !minhas.some(x => x.id === id) ? (contagem[id] || 0) : staffDe(id).length;
  // 9 nov (dono: «too much writing… concise points… tap arrows to read»): o texto de cima passa a cartões curtos com setas
  body.innerHTML = `${dicasHTML([
      tr('🏪 Abres o negócio no bairro onde estás.'),
      tr('💰 Às 18:00 as vendas entram na caixa, mesmo sem jogares.'),
      tr('🧾 Ao sábado pagas as contas: renda, ajudantes, stock e impostos.'),
      tr('👥 Outros jogadores podem candidatar-se a trabalhar contigo.'),
      tr('⚔️ Outro negócio igual no bairro baixa as tuas vendas.'),
      tr('🪙 Até 3 negócios pagas só em Kz. Do 4.º em diante, também {0} Ouro (filiais não contam).').replace('{0}', OURO_EMP_EXTRA),
      ...(minhas.length ? [] : [tr('🏦 Sem dinheiro? O banco empresta para o teu 1.º negócio.')]),
    ])}
    ${minhas.map(e => {
      const t = TIPOS_EMP[e.tipo] || {}, reais = staffDe(e.id);
      const espera = new Date(e.licenca_ate) > new Date();
      return `<div class="rel" data-e="${e.id}"><div class="lbl"><span>${t.e} ${esc(e.nome)}${e.matriz ? ` <small style="color:var(--dim)">· ${tr('filial')}</small>` : ''}</span><span style="color:var(--dim);font-weight:600">${TAM_EMP[e.tamanho] || TAM_EMP.quiosque} · 📍 ${esc(bairro(e.bairro)?.nome || '')}</span></div>
        ${espera ? `<p class="m" style="margin:6px 0 0">📄 À espera da licença…</p>` : ''}
        ${tycoonTem(e.tipo) ? `<button type="button" class="btn full ty-entrar" data-g="tycoon"><span>🎮 ${tr(TY_ENTRAR[e.tipo] || 'Entrar e gerir')}</span><small>${tr('Serve os clientes tu mesmo/a: a caixa e a barra das filiais enchem mais depressa.')}</small></button>` : ''}
        <div class="lbl" style="margin-top:8px"><span>💼 Caixa</span><span class="price" style="color:${e.caixa < 0 ? 'var(--red)' : 'var(--gold)'}">${fmtKz(e.caixa)}</span></div>
        ${e.ultimo_dia ? `<small style="display:block;color:var(--muted);font-size:12px"><span>Último fecho (18:00)</span>: <span data-sem-traducao>${fmtKz(e.ultimas_vendas || 0)}</span> · <span>${esc(e.ultima_nota || '')}</span></small>` : `<small style="display:block;color:var(--muted);font-size:12px">As primeiras vendas entram hoje às 18:00.</small>`}
        <div class="contasEmp" data-contas="${e.id}"></div>
        <div class="chips" style="margin-top:8px"><span class="chip">👥 Equipa completa: tu + ${e.staff} ajudante${e.staff === 1 ? '' : 's'}${reais.length ? ` + ${reais.length} jogador${reais.length === 1 ? '' : 'es'}` : ''}</span><span class="chip">⭐ Fama ${e.reputacao}</span>${e.sonegar ? `<span class="chip">🤫 A fugir aos impostos</span>` : ''}${e.vaga_salario ? `<span class="chip">📢 Vaga: ${fmtKz(e.vaga_salario)}/turno</span>` : ''}</div>
        ${reais.length ? `<div class="list" style="margin-top:8px">${reais.map(f => `<div class="row"><span class="e">🧑</span><div class="t"><b>${esc(nomes[f.jogador_id] || '?')}</b><small>${fmtKz(f.salario)}/turno · ${f.turnos} turnos</small></div><button class="btn sm ghost" data-desp="${f.jogador_id}">Despedir</button></div>`).join('')}</div>` : ''}
        <div class="sub2" style="margin-top:12px">Melhorias</div>${blocoMelhorias(e, minhas)}
        <div class="sub2" style="margin-top:12px">Gerir</div>
        <div class="grelha">
          ${e.bairro === J.bairro && !espera ? `<button data-g="trabalhar"><span class="e">💪</span><span>Trabalhar aqui</span></button>` : ''}
          <button data-g="injetar"><span class="e">💼</span><span>Pôr dinheiro</span></button>
          <button data-g="levantar"><span class="e">💵</span><span>Levantar lucro</span></button>
          <button data-g="vaga"><span class="e">📢</span><span>${e.vaga_salario ? 'Mudar o salário da vaga' : 'Abrir vaga a jogadores'}</span></button>
          ${e.vaga_salario ? `<button data-g="fecharvaga"><span class="e">✋</span><span>Fechar a vaga</span></button>` : ''}
          ${e.tamanho !== 'plaza' ? `<button data-g="expandir"><span class="e">📈</span><span>${e.tamanho === 'loja' ? 'Crescer para plaza' : 'Crescer para loja'} · ${fmtKz(Math.floor((t.custo || 0) * (e.tamanho === 'loja' ? 5 : 2) * 1.6))}</span></button>` : ''}
          ${e.sonegar === undefined ? '' : e.sonegar ? `<button data-g="impostos"><span class="e">🧾</span><span>Voltar a pagar impostos</span></button>` : `<button data-g="impostos" class="perigo"><span class="e">🤫</span><span>Fugir aos impostos</span></button>`}
          <button data-g="fechar" class="perigo"><span class="e">🔒</span><span>Fechar o negócio</span></button>
        </div></div>`;
    }).join('')}
    ${`<div class="sub2">Abrir um negócio em ${esc(bairro(J.bairro)?.nome || '')}</div>${extra ? `<p class="m">🪙 <span>Já tens 3 negócios: este custa também</span> <b data-sem-traducao>${OURO_EMP_EXTRA}</b> <span>Ouro.</span> <span data-sem-traducao>(${J.ouro || 0} 🪙)</span></p>` : ''}
    <form id="fEmp"><label>Tipo</label><select class="inp" id="eTipo">${Object.entries(TIPOS_EMP).map(([k, t]) => { const falta = t.pede && !minhas.some(m => m.tipo === t.pede && !m.falida);
      return `<option value="${k}" ${falta ? 'disabled' : ''}>${t.e} ${t.nome} · ${fmtKz(t.custo)}${falta ? ` · ${tr('precisa de')} ${tr(TIPOS_EMP[t.pede].nome)}` : ''}</option>`; }).join('')}</select>
      <label>Nome</label><input class="inp" id="eNome" maxlength="40" required placeholder="ex: Cantina da Mãe Rosa">
      <label class="maior"><input type="checkbox" id="eGasosa"> Gasosa de 40.000 Kz: licença na hora (25% de risco de multa)</label>
      <small style="display:block;color:var(--dim);font-size:12px;margin-top:6px">+25.000 Kz de licença (demora 2 horas). Ajudantes incluídos.</small>
      <button class="btn full" type="submit">Abrir</button>${minhas.length ? '' : `<p class="m credito-dica">🏦 ${tr('Sem dinheiro? O banco empresta para o teu 1.º negócio.')}</p>`}</form>`}
    <div class="sub2">Negócios de Luanda <small style="color:var(--dim);font-weight:600" data-sem-traducao>(${outras.length})</small></div>
    ${outras.length ? `<input class="inp" id="empBusca" type="search" autocomplete="off" placeholder="${esc(tr('Pesquisar por nome, tipo, dono ou bairro'))}" style="margin-bottom:6px">
    <div class="chips" style="margin-bottom:8px"><button type="button" class="chip" data-fvaga aria-pressed="false">📢 ${tr('Só com vaga')}</button><button type="button" class="chip" data-faqui aria-pressed="false">📍 ${tr('Só neste bairro')}</button></div>` : ''}
    <div class="list" id="empOutras">${outras.length ? '' : '<div class="empty">Ainda ninguém abriu um negócio. Sê o primeiro!</div>'}</div>`;
  // 6 nov (jogadores: «coloca só uma aba de pesquisa nas empresas por favor»): 981 negócios numa lista → pesquisa + filtros + 40 de cada vez
  const linhaOutra = e => { const t = TIPOS_EMP[e.tipo] || {}; const cheio = nStaff(e.id) >= e.nivel * 2 - 1;
      return `<div class="row"><span class="e">${t.e}</span><div class="t"><b>${esc(e.nome)}</b><small>${t.nome} de ${esc(nomes[e.dono] || '?')} · 📍 ${esc(bairro(e.bairro)?.nome || '')}</small>${e.vaga_salario && !cheio ? `<small>📢 Contrata: ${fmtKz(e.vaga_salario)} por turno${(t.req || [0, 0])[0] || (t.req || [0, 0])[1] ? ` · ${esc(tr('pede estudo {0} e reputação {1}').replace('{0}', t.req[0]).replace('{1}', t.req[1]))}` : ''}</small>` : ''}</div>
        ${e.vaga_salario && !cheio && J.empresa_id !== e.id ? `<button class="btn sm ${J.estudo >= (t.req || [0, 0])[0] && J.reputacao >= (t.req || [0, 0])[1] ? '' : 'ghost'}" data-cand="${e.id}">Candidatar</button>` : J.empresa_id === e.id ? '<span class="price">Trabalhas aqui</span>' : ''}</div>`;
  };
  const semAcento = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const indice = new Map(outras.map(e => { const t = TIPOS_EMP[e.tipo] || {}; return [e.id, semAcento([e.nome, t.nome, tr(t.nome || ''), nomes[e.dono], bairro(e.bairro)?.nome, e.bairro].join(' '))]; }));
  let mostrar = 40, fVaga = false, fAqui = false;
  const listaEl = body.querySelector('#empOutras'), buscaEl = body.querySelector('#empBusca');
  const desenharOutras = () => {
    if (!listaEl || !outras.length) return;
    const q = semAcento(buscaEl?.value).trim().split(/\s+/).filter(Boolean);
    const lista = outras.filter(e => (!fVaga || (e.vaga_salario && nStaff(e.id) < e.nivel * 2 - 1)) && (!fAqui || e.bairro === J.bairro) && q.every(p => indice.get(e.id).includes(p)));
    listaEl.innerHTML = lista.length ? lista.slice(0, mostrar).map(linhaOutra).join('') + (lista.length > mostrar ? `<button type="button" class="btn ghost full" data-mais style="margin-top:6px">${tr('Ver mais')} <span data-sem-traducao>(${lista.length - mostrar})</span></button>` : '')
      : `<div class="empty">${tr('Nenhum negócio encontrado.')}</div>`;
    listaEl.querySelector('[data-mais]')?.addEventListener('click', () => { mostrar += 40; desenharOutras(); });
    listaEl.querySelectorAll('[data-cand]').forEach(b => b.onclick = () => confirmar('Trabalhar para este negócio?', 'Deixas o emprego atual. Ganhas por turno, se a caixa tiver dinheiro.', 'Candidatar',
      async () => { if (await acao('candidatar_empresa', { p_id: +b.dataset.cand })) { await carregarTrabEmp(); depois(); } }));
  };
  buscaEl?.addEventListener('input', () => { mostrar = 40; desenharOutras(); });
  body.querySelector('[data-fvaga]')?.addEventListener('click', ev => { fVaga = !fVaga; ev.currentTarget.setAttribute('aria-pressed', fVaga); ev.currentTarget.classList.toggle('on', fVaga); mostrar = 40; desenharOutras(); });
  body.querySelector('[data-faqui]')?.addEventListener('click', ev => { fAqui = !fAqui; ev.currentTarget.setAttribute('aria-pressed', fAqui); ev.currentTarget.classList.toggle('on', fAqui); mostrar = 40; desenharOutras(); });
  const depois = () => abrirTelemovel('empresas');
  // 9 nov (dono): acabaste de abrir um negócio com jogo → convite para entrar logo (sem botões «de teste»)
  if (empAcabada) {
    const n = empAcabada; empAcabada = null;
    const nova = minhas.filter(x => x.tipo === n.tipo && x.nome === n.nome).sort((a, b) => b.id - a.id)[0];
    if (nova && tycoonTem(nova.tipo)) setTimeout(() => confirmar(`🎉 ${esc(nova.nome)} ${tr('abriu!')}`, tr('Entra e põe o negócio a funcionar: sentas os clientes, serves e apanhas o dinheiro. Quanto mais jogas, mais a caixa enche e mais depressa abres filiais.'), tr(TY_ENTRAR[nova.tipo] || 'Entrar e gerir'), () => abrirTycoon(nova)), 300);
  }
  ligarDicas(body);
  desenharOutras();
  // 👑 coroa do ranking do tycoon no cartão do teu negócio (no teste, até ao lançamento)
  if (minhas.length) (typeof tycoonCoroas === 'function' ? tycoonCoroas(uid) : sb.rpc('tycoon_coroas', { p_jogador: uid })).then(({ data }) => { for (const c of data || []) { const el = body.querySelector(`[data-e="${c.empresa}"] .lbl span`); if (el && !el.querySelector('.coroa-emp')) el.insertAdjacentHTML('afterbegin', `<span class="coroa-emp" title="${esc(coroaTexto(c))}">👑</span> `); } }, () => { });
  // 0fy: crédito do banco no cartão do negócio (só quem tem negócio pede isto)
  if (minhas.length) sb.from('creditos_empresa').select('*').eq('jogador', uid).is('pago_em', null).then(({ data }) => {
    for (const c of data || []) {
      const el = body.querySelector(`[data-e="${c.empresa}"]`); if (!el || el.querySelector('.credito-emp')) continue;
      const falta = c.devido - c.pago, pc = Math.round(c.pago * 100 / c.devido);
      (el.querySelector('.lbl') || el).insertAdjacentHTML('afterend', `<div class="credito-emp"><div class="lbl"><span>🏦 ${tr('Crédito do banco')}</span><span class="price" data-sem-traducao>${fmtKz(c.pago)} / ${fmtKz(c.devido)}</span></div>
        <div class="barra"><i style="width:${pc}%"></i></div>
        <small>${tr('{0}% do que o negócio fatura vai para o banco até pagares tudo. Falta {1}.').replace('{0}', Math.round(c.pct * 100)).replace('{1}', fmtKz(falta))}</small>
        <button class="btn ghost sm" data-credpagar>${tr('Pagar o crédito')}</button></div>`);
      el.querySelector('[data-credpagar]').onclick = () => pedirValor(tr('Pagar o crédito'), tr('Sai da tua carteira. Falta {0}.').replace('{0}', fmtKz(falta)), Math.min(falta, Math.max(100, J.kumbu || 0)),
        async v => { if (await acao('credito_pagar', { p_valor: v })) { fecharSheets(); depois(); } });
    }
  });
  for (const e of minhas) {
    const el = body.querySelector(`[data-e="${e.id}"]`), g = k => el.querySelector(`[data-g="${k}"]`);
    const gerir = async (ac, v) => { if (await acao('gerir_empresa', { p_id: e.id, p_acao: ac, p_valor: v ?? null })) depois(); };
    g('tycoon')?.addEventListener('click', () => abrirTycoon(e));
    g('trabalhar')?.addEventListener('click', async () => { if (await acao('trabalhar_empresa', { p_id: e.id })) depois(); });
    g('injetar')?.addEventListener('click', () => pedirValor(`Pôr dinheiro em ${esc(e.nome)}`, 'Sai da tua carteira para a caixa da empresa (paga salários e evita a falência).', 10000, v => gerir('injetar', v)));
    g('levantar')?.addEventListener('click', () => levantarComIRT(e, v => gerir('levantar', v)));
    g('vaga')?.addEventListener('click', () => pedirValor('Salário por turno para jogadores', 'Cada turno de um jogador fatura para a caixa e tu pagas-lhe isto. Entre 1.000 e 100.000 Kz.', e.vaga_salario || Math.min(30000, Math.max(3000, Math.round((TIPOS_EMP[e.tipo]?.receita || 35000) * 0.12 / 100) * 100)), v => gerir('vaga', v)));
    g('fecharvaga')?.addEventListener('click', () => gerir('vaga', null));
    g('expandir')?.addEventListener('click', () => confirmar(`${e.tamanho === 'loja' ? 'Passar a plaza' : 'Passar a loja'}: ${esc(e.nome)}?`, `Custa ${fmtKz(Math.floor((TIPOS_EMP[e.tipo]?.custo || 0) * (e.tamanho === 'loja' ? 5 : 2) * 1.6))}. Mais clientes todos os dias, mas a renda e os ajudantes também sobem.`, 'Crescer', () => gerir('expandir')));
    mostrarContasEmp(e, el.querySelector(`[data-contas="${e.id}"]`));
    ligarMelhorias(e, el, depois);
    g('impostos')?.addEventListener('click', () => e.sonegar ? acao('fugir_impostos', { p_id: e.id, p_fugir: false }).then(r => r && depois())
      : confirmar(`Fugir aos impostos em ${esc(e.nome)}?`, 'Não declaras o lucro e ficas com mais 10%. Mas a probabilidade de inspeção das Finanças sobe muito e, se te apanharem, pagas o triplo do que deves, e a tua reputação cai.', 'Fugir aos impostos',
        async () => { if (await acao('fugir_impostos', { p_id: e.id, p_fugir: true })) depois(); }));
    g('fechar')?.addEventListener('click', () => confirmar(`Fechar ${esc(e.nome)}?`, `Recebes a caixa e 30% do que investiste. Os funcionários ficam sem trabalho.`, 'Fechar', () => gerir('fechar')));
    el.querySelectorAll('[data-desp]').forEach(b => b.onclick = () => confirmar('Despedir?', 'Fica sem trabalho e recebe a notícia.', 'Despedir', async () => { if (await acao('despedir', { p_jogador: b.dataset.desp })) depois(); }));
  }
  body.querySelector('#fEmp')?.addEventListener('submit', e => {
    e.preventDefault();
    const tipo = body.querySelector('#eTipo').value, nome = body.querySelector('#eNome').value, gas = body.querySelector('#eGasosa').checked, t = TIPOS_EMP[tipo];
    if (extra && (J.ouro || 0) < OURO_EMP_EXTRA && typeof sugerirOuro === 'function') return sugerirOuro(OURO_EMP_EXTRA);
    // 0fy (dono, 9 nov): sem dinheiro para o 1.º negócio → crédito do banco, pago com uma parte do que o negócio faturar
    const total = t.custo + 25000 + (gas ? 40000 : 0), falta = total - Math.max(0, J.kumbu || 0);
    // 0gj (dono, 10 nov): também se pode pagar o que falta com Ouro (1 Ouro = 100 Kz), em qualquer negócio
    const podeCred = !minhas.length && t.custo <= 1000000;
    if (falta > 0) {
      const ouroF = Math.ceil(falta / 100), pct = (t.custo < 200000 ? 25 : t.custo < 400000 ? 30 : 35) + (gas ? 10 : 0);
      const abrirOuro = () => (J.ouro || 0) < ouroF && typeof sugerirOuro === 'function' ? sugerirOuro(ouroF)
        : confirmar(tr('Pagar com Ouro?'), tr('Faltam-te {0}. Pagas com {1} Ouro e o negócio é todo teu, sem dívida.').replace('{0}', fmtKz(falta)).replace('{1}', typeof milhar === 'function' ? milhar(ouroF) : ouroF), tr('Pagar com Ouro e abrir'),
          async () => { if (await acao('criar_empresa_ouro', { p_tipo: tipo, p_nome: nome, p_gasosa: gas })) { empAcabada = { tipo, nome: nome.trim() }; if (typeof empSec !== 'undefined') empSec = null; depois(); } });
      if (empPagarOuro || !podeCred) { empPagarOuro = false; return abrirOuro(); }
      return escolherPagamento(falta, ouroF, pct, gas).then(c => c === 'ouro' ? abrirOuro() : c === 'credito' ? confirmar(tr('Pedir crédito ao banco?'), tr('Faltam-te {0}. O banco empresta e pagas {1} no total (mais 15%, sem juros por dia). Até acabar, {2}% de tudo o que o negócio faturar vai para o banco; o resto é teu.')
        .replace('{0}', fmtKz(falta)).replace('{1}', fmtKz(Math.ceil(falta * 1.15))).replace('{2}', pct), tr('Pedir crédito e abrir'),
        async () => { if (await acao('criar_empresa_credito', { p_tipo: tipo, p_nome: nome, p_gasosa: gas })) { empAcabada = { tipo, nome: nome.trim() }; if (typeof empSec !== 'undefined') empSec = null; depois(); } }) : null);
    }
    confirmar(`Abrir ${esc(nome)}?`, `${t.e} ${t.nome} em ${esc(bairro(J.bairro)?.nome || '')}: ${fmtKz(t.custo + 25000 + (gas ? 40000 : 0))} no total${gas ? ', com gasosa' : ''}${extra ? ` + ${OURO_EMP_EXTRA} Ouro` : ''}.`, 'Abrir',
      async () => { if (await acao('criar_empresa', { p_tipo: tipo, p_nome: nome, p_gasosa: gas })) { empAcabada = { tipo, nome: nome.trim() }; if (typeof empSec !== 'undefined') empSec = null; depois(); } });
  });
  if (typeof ui2 === 'function' && ui2()) ui2Empresas(body, minhas, outras.length);   // 8 nov: redesenho (teste)
}


/* ============================================================
   7 nov (dono, aprovado): filiais devagar mas com jogo — barra «Pronto para uma filial», decisão do gerente por dia,
   inspeção e licença com Ouro. Primeiro no site de teste.
   ============================================================ */
const CASOS_GERENTE = {   // a ordem das respostas tem de bater com _filial_caso no servidor
  fornecedor: ['Um fornecedor oferece stock 20% mais barato, mas costuma chegar atrasado.', ['Aceitar e encomendar com uma semana de folga', 'Ficar com o fornecedor de sempre', 'Aceitar e encomendar em cima da hora']],
  cliente_zangado: ['Um cliente está a reclamar alto à frente de toda a gente.', ['Discutir com ele para não perder a razão', 'Pedir desculpa e oferecer-lhe alguma coisa', 'Deixar o ajudante resolver']],
  ajudante_atrasado: ['Um ajudante voltou a chegar atrasado.', ['Despedi-lo à frente de todos', 'Fingir que não se viu', 'Falar com ele em privado e combinar uma regra']],
  chuva: ['Vem aí uma chuvada forte esta noite.', ['Levantar o stock do chão e pôr sacos de areia', 'Não fazer nada', 'Fechar mais cedo']],
  falso_fiscal: ['Um senhor diz que é fiscal e pede uma «gasosa» para não multar.', ['Mandá-lo embora aos gritos', 'Pedir a identificação e ligar para a Administração', 'Pagar a gasosa']],
  concorrente: ['O negócio ao lado baixou os preços.', ['Não fazer nada', 'Baixar os preços abaixo do custo', 'Melhorar o atendimento e criar um cartão de cliente']],
  corte_luz: ['Vai haver corte de luz esta noite.', ['Esperar que a luz volte depressa', 'Ver se há combustível para o gerador', 'Fechar mais cedo']],
  influencer: ['Uma influencer famosa quer coisas de graça em troca de um post.', ['Fazer um acordo pequeno: ela publica primeiro', 'Dar-lhe tudo de graça', 'Dizer que não']],
  limpeza: ['Os clientes dizem que o espaço está sujo.', ['Limpar quando houver tempo', 'Culpar os ajudantes', 'Fazer já um horário de limpeza']],
  caixa_falta: ['Falta dinheiro na caixa no fim do dia.', ['Contar a caixa todos os dias com duas pessoas', 'Acusar um ajudante à frente de todos', 'Deixar passar desta vez']],
  encomenda: ['Pedem uma encomenda grande para um casamento, para amanhã.', ['Aceitar sem sinal', 'Aceitar com 50% de sinal', 'Recusar']],
  fila: ['Há uma fila enorme à hora do almoço.', ['Deixar como está', 'Dizer às pessoas para voltarem mais tarde', 'Pôr um ajudante numa segunda caixa']],
};
async function prontidaoFilial(e, el, depois) {
  const box = el.querySelector('#filPronto'); if (!box) return;
  const { data: f, error } = await sb.rpc('filial_estado', { p_empresa: e.id });
  if (error || !f) { box.innerHTML = ''; return; }
  if (!f.ligado) { box.innerHTML = ''; return; }
  const caso = CASOS_GERENTE[f.caso], pct = Math.floor(f.barra);
  const ok = (c, txt) => `<li>${c ? '✅' : '⬜'} ${txt}</li>`;
  const RES = { boa: ['👏', 'Boa decisão! +4%'], meia: ['🙂', 'Assim-assim. +1%'], ma: ['😬', 'Má decisão. −2%'] };
  box.innerHTML = `<div class="fil-pronto">
    <div class="fp-topo"><b>🏪 ${esc(tr('Pronto para uma filial'))}</b><span data-sem-traducao>${pct}%</span></div>
    <div class="fp-barra"><i style="width:${pct}%"></i></div>
    <ul class="fp-lista">
      ${ok(f.plaza, esc(tr('Negócio no máximo (plaza)')))}
      ${ok(f.tycoon_hoje >= 25, esc(tr('Tycoon hoje: +{0}% de 25%').replace('{0}', f.tycoon_hoje)))}
      ${ok(f.sabados >= 3, esc(tr('Sábados com lucro seguidos: {0}').replace('{0}', f.sabados)))}
      ${ok(f.reputacao >= 80, esc(tr('Fama {0}/80 (com 80 a inspeção passa sempre)').replace('{0}', f.reputacao)))}
    </ul>
    ${f.licencas > 0 ? `<p class="fp-lic">✅ ${esc(tr('Tens {0} licença(s) para abrir uma filial.').replace('{0}', f.licencas))}</p>` : ''}
    ${caso ? `<div class="fp-caso"><small>📱 ${esc(tr('Decisão do gerente de hoje'))}</small><b>${esc(tr(caso[0]))}</b>
      ${f.decidido ? `<p>${RES[f.resultado]?.[0] || ''} ${esc(tr(RES[f.resultado]?.[1] || ''))} ${esc(tr('Amanhã há outra.'))}</p>`
        : caso[1].map((t, i) => `<button class="btn ghost sm" data-decidir="${i}">${esc(tr(t))}</button>`).join('')}</div>` : ''}
    <div class="fp-acoes">
      <button class="btn sm" data-inspecao ${f.barra >= 100 && f.plaza && !f.inspecao_hoje ? '' : 'disabled'}>🕵🏾 ${esc(tr(f.inspecao_hoje ? 'O inspetor volta amanhã' : 'Pedir a inspeção'))}</button>
      ${f.licencas > 0 || f.filiais >= 4 ? '' : `<button class="btn ghost sm" data-lic-ouro ${f.plaza ? '' : 'disabled'}>🪙 ${esc(tr('Licença já'))} · ${f.preco_ouro} ${esc(tr('Ouro'))}</button>`}
    </div>
    <small class="fp-nota">${esc(tr('Enche depressa a jogar o tycoon deste negócio (até +25% por dia). Sem jogar: responde à decisão do gerente todos os dias e faz sábados com lucro.'))}</small>
  </div>`;
  const recarregar = () => prontidaoFilial(e, el, depois);
  box.querySelectorAll('[data-decidir]').forEach(b => b.onclick = async () => {
    box.querySelectorAll('[data-decidir]').forEach(x => x.disabled = true);
    const { data, error } = await sb.rpc('filial_decidir', { p_empresa: e.id, p_opcao: Number(b.dataset.decidir) });
    if (error) toast(limparErro(error.message), 'mau'); else toast(`${RES[data.resultado][0]} ${tr(RES[data.resultado][1])}`, data.resultado === 'ma' ? 'mau' : 'bom');
    recarregar();
  });
  box.querySelector('[data-inspecao]')?.addEventListener('click', async ev => {
    ev.currentTarget.disabled = true;
    const { data, error } = await sb.rpc('filial_inspecao', { p_empresa: e.id });
    if (error) toast(limparErro(error.message), 'mau');
    else toast(data.passou ? '✅ ' + tr('A inspeção passou! Já podes abrir uma filial noutro bairro.') : '❌ ' + tr('O inspetor encontrou problemas. Volta amanhã (a barra desceu para 85%). Com fama 80 passa sempre.'), data.passou ? 'bom' : 'mau', 6000);
    recarregar();
  });
  box.querySelector('[data-lic-ouro]')?.addEventListener('click', () => {
    if ((J?.ouro || 0) < f.preco_ouro && typeof sugerirOuro === 'function') return sugerirOuro(f.preco_ouro);
    confirmar(tr('Comprar já a licença de filial?'), tr('Custa {0} Ouro. Saltas a barra e a inspeção.').replace('{0}', f.preco_ouro), tr('Comprar'), async () => {
      const { data, error } = await sb.rpc('filial_licenca_ouro', { p_empresa: e.id });
      if (error) return toast(limparErro(error.message), 'mau');
      if (J) J.ouro = data.ouro; toast('✅ ' + tr('Licença comprada! Vai a outro bairro para abrir a filial.'), 'bom'); fecharSheets(); depois && depois();
    });
  });
}

// 0gj (dono, 10 nov): sem dinheiro para abrir — crédito do banco ou Ouro
function escolherPagamento(falta, ouro, pct, gas) {
  return new Promise(res => {
    const v = document.createElement('div'); v.className = 'pergunta';
    v.innerHTML = `<div class="pergCaixa"><p><b>${esc(tr('Faltam-te {0}. Como queres pagar?').replace('{0}', fmtKz(falta)))}</b></p>
      <div class="pg-opcoes">
        <button class="btn full" data-pg="credito">🏦 ${esc(tr('Crédito do banco'))}<small>${esc(tr('{0}% do que o negócio faturar vai para o banco até pagares {1}').replace('{0}', pct).replace('{1}', fmtKz(Math.ceil(falta * 1.15))))}</small></button>
        <button class="btn full" data-pg="ouro">🪙 ${esc(tr('{0} Ouro').replace('{0}', typeof milhar === 'function' ? milhar(ouro) : ouro))}<small>${esc(tr('sem dívida: o lucro é todo teu'))}</small></button>
        <button class="btn ghost full" data-pg="nao">${esc(tr('Cancelar'))}</button></div></div>`;
    const fim = r => { v.remove(); res(r); };
    v.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => fim(b.dataset.pg === 'nao' ? null : b.dataset.pg));
    v.onclick = e => { if (e.target === v) fim(null); };
    document.body.appendChild(v);
  });
}
