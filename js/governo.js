/* ============================================================
   Vida na Banda — GOVERNO E SERVIÇOS PÚBLICOS
   Municípios, administradores, eleições, campanha, orçamento;
   cortes de luz, falta de água, estradas, segurança, gasolina.
   ============================================================ */
let municipios = [], combustivel = { hoje: 300, ontem: 300 };
const SERVICOS = { energia: ['💡', 'Energia', 'menos cortes de luz'], agua: ['🚰', 'Água', 'menos falta de água'], estradas: ['🛣️', 'Estradas', 'viagens menos cansativas, menos pneus furados'], seguranca: ['👮', 'Segurança', 'menos carteiristas e assaltos'] };
// partidos 100% inventados (nada a ver com partidos reais)
const PARTIDOS = { MKT: 'Movimento Kumbu para Todos', PLS: 'Partido da Luz Sempre', UBU: 'União dos Bairros Unidos', FDF: 'Frente do Funge' };
const partidoDe = nome => { const m = /\(([A-Z]{2,4})\)\s*$/.exec(nome || ''); return m ? PARTIDOS[m[1]] || null : null; };
const MEIOS_GASOLINA = ['candongueiro', 'kupapata', 'taxi', 'mota', 'carro', 'autocarro'];

async function carregarGoverno() {
  const pm = typeof pre === 'function' ? pre('municipios') : null, pp = typeof pre === 'function' ? pre('pais') : null;
  const pb = pm && pp ? null : await publico();   // 9 nov: /api/publico
  const [m, p] = pm && pp ? [{ data: pm.v }, { data: pp.v }] : pb?.municipios && pb?.pais ? [{ data: pb.municipios }, { data: pb.pais }] : await Promise.all([sb.from('municipios').select('*').order('nome'), sb.from('pais_dia').select('*').order('dia', { ascending: false }).limit(2)]);
  if (m.error) return;
  municipios = m.data || [];
  if (p.data?.length) combustivel = { hoje: p.data[0].combustivel, ontem: (p.data[1] || p.data[0]).combustivel };
}
setInterval(() => { if (J && !document.hidden) carregarGoverno(); }, 10 * 60 * 1000);

const munDe = b => municipios.find(m => (m.bairros || []).includes(b));
const fatorComb = () => Math.round(combustivel.hoje / 300 * 100) / 100;
const semLuzAqui = () => !!munDe(J?.bairro)?.sem_luz;
function residencia() { const c = J.casa ? casaDe(J.casa) : (donoLar() && casal?.casa ? casaDe(casal.casa) : null); return c?.bairro || J.bairro; }
const hoje = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);

// preço e energia de uma viagem com a gasolina e as estradas de hoje (igual ao servidor)
function ajustarViagem(m, x, destino) {
  if (m === 'carro' && tem4x4() && provDe(destino) !== provDe(J.bairro)) x = { ...x, en: 15, n: 'O teu 4x4' };
  if (!municipios.length || !MEIOS_GASOLINA.includes(m)) return x;
  const y = { ...x, p: Math.round(x.p * fatorComb() / 50) * 50 };
  if (provDe(destino) === provDe(J.bairro)) y.en += Math.round((100 - (munDe(destino)?.estradas ?? 50)) / 25);
  return y;
}

function barraServico(k, v) {
  const [e, n, d] = SERVICOS[k]; v = Math.round(v);
  return `<div style="margin:8px 0"><div class="lbl"><span>${e} ${n}</span><span>${v}</span></div><div class="meter"><u style="left:0;width:${v}%;background:${v < 30 ? 'var(--red)' : v < 60 ? 'var(--gold)' : 'var(--green)'}"></u></div><small class="m" style="color:var(--dim)">${d}</small></div>`;
}

/* ---------- 🏛️ app Governo ---------- */
async function renderGoverno(body) {
  const [, hp] = await Promise.all([carregarGoverno(), provHTML().catch(() => '')]);   // FILA 0di: governadores primeiro
  const soProv = msg => { body.innerHTML = hp + `<div class="empty">${msg}</div>`; ligarProv(body, () => renderGoverno(body)); };
  if (!municipios.length) return soProv('Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!');
  const res = residencia(), m = munDe(res);
  if (!m) return soProv('Aqui não há município.');
  const { data: el } = await sb.from('eleicoes').select('*').eq('municipio', m.id).eq('resolvida', false).limit(1);
  const e = el?.[0];
  const [cs, mv] = e ? await Promise.all([sb.from('candidatos').select('*').eq('eleicao_id', e.id), sb.from('votos').select('*').eq('eleicao_id', e.id).eq('eleitor', uid)]) : [{ data: [] }, { data: [] }];
  const cands = (cs.data || []).sort((a, z) => (z.votos * 150 + z.campanha) - (a.votos * 150 + a.campanha));
  const jaVotei = !!(mv.data || []).length, souCand = cands.find(c => c.jogador_id === uid), souAdmin = m.admin === uid;
  const subiu = combustivel.hoje - combustivel.ontem;
  const fecha = e ? new Date(e.fecha_em) : null;
  const dias = fecha ? Math.max(0, Math.ceil((fecha - Date.now()) / 864e5)) : 0;

  let h = `<div class="rel" style="margin-top:0">
      <div style="display:flex;gap:10px;align-items:center"><span style="font-size:34px">🏛️</span><div><div class="m" style="margin:0;font-size:12px">📍 ${esc(tr('Onde moras'))}${munDe(J.bairro)?.id !== m.id ? ` · ${esc(tr('estás agora em'))} ${esc(bairro(J.bairro)?.nome || '')}` : ''}</div><b style="font-size:16px">${esc(m.nome)}</b><div class="m" style="margin:0">Administrador/a: <b>${esc(m.admin_nome)}</b>${souAdmin ? ' (tu!)' : ''}${!m.admin && partidoDe(m.admin_nome) ? ` · ${esc(partidoDe(m.admin_nome))}` : ''}</div></div></div>
      <div class="chips"><span class="chip">💰 Orçamento ${fmtKz(m.orcamento)}</span><span class="chip">🧾 Taxa ${fmtKz(m.taxa)}/dia</span></div>
    </div>
    <div class="list" style="margin-top:10px">
      <div class="row"><span class="e">${m.sem_luz ? '🕯️' : '💡'}</span><div class="t"><b>${m.sem_luz ? 'Hoje há cortes de luz' : 'Hoje há luz'}</b><small>${m.sem_luz ? (tem('gerador') ? 'O teu gerador aguenta.' : 'Sem gerador dorme-se mal e o humor desce.') : 'Aproveita!'}</small></div></div>
      <div class="row"><span class="e">${m.sem_agua ? '🚱' : '🚰'}</span><div class="t"><b>${m.sem_agua ? 'Hoje não há água na torneira' : 'Hoje há água'}</b><small>${m.sem_agua ? (J.agua_dia === hoje() ? 'Tens os bidões cheios. 👍' : 'Sem água perdes humor e saúde.') : 'Corre a água.'}</small></div>${m.sem_agua && J.agua_dia !== hoje() ? `<button class="btn sm" id="bAgua">🚚 ${fmtKz(2500)}</button>` : ''}</div>
      <div class="row"><span class="e">⛽</span><div class="t"><b>Gasolina: ${fmtKz(combustivel.hoje)}/litro</b><small>${subiu > 0 ? `📈 Subiu ${fmtKz(subiu)} desde ontem` : subiu < 0 ? `📉 Desceu ${fmtKz(-subiu)} desde ontem` : 'Igual a ontem'} · candongueiros, táxis e carros acompanham</small></div></div>
    </div>
    <div class="sub2">Serviços públicos</div>
    <div class="rel" style="margin-top:0">${Object.keys(SERVICOS).map(k => barraServico(k, m[k])).join('')}</div>`;

  if (souAdmin) h += `<div class="sub2">🏢 O teu gabinete</div>
    <p class="m">Recebes 25.000 Kz/dia. O Estado manda 150.000 Kz/dia; a taxa municipal soma. Cada 10.000 Kz investidos = +1 no serviço (que perde uns pontos por dia).</p>
    <div class="list">${Object.keys(SERVICOS).map(k => `<div class="row"><span class="e">${SERVICOS[k][0]}</span><div class="t"><b>Investir em ${SERVICOS[k][1].toLowerCase()}</b><small>Nível ${Math.round(m[k])}</small></div><button class="btn sm" data-gov="investir" data-s="${k}">Investir</button></div>`).join('')}
      <div class="row"><span class="e">🧾</span><div class="t"><b>Taxa municipal</b><small>0 a 1.000 Kz por dia, paga por quem mora cá. Impopular!</small></div><button class="btn sm ghost" data-gov="taxa">${fmtKz(m.taxa)}</button></div>
      <div class="row"><span class="e">🤫</span><div class="t"><b>Desviar fundos</b><small>Para a "empresa de um primo". A Inspeção faz auditorias…</small></div><button class="btn sm red" data-gov="desviar">Desviar</button></div>
      <div class="row"><span class="e">🚪</span><div class="t"><b>Demitir-me</b></div><button class="btn sm ghost" data-gov="demitir">Sair</button></div>
    </div>`;

  if (e) {
    const npcPts = e.npc_votos;
    h += `<div class="sub2">🗳️ Eleições · fecham ${fecha.toLocaleDateString('pt-PT', { weekday: 'long', timeZone: 'Africa/Luanda' })} às 20h${dias ? ` (${dias} dia${dias > 1 ? 's' : ''})` : ''}</div>
      <div class="list">
        <div class="row"><span class="e">🎗️</span><div class="t"><b>${esc(e.npc_nome)}</b><small>${esc(partidoDe(e.npc_nome) || 'Independente')} · ${npcPts} voto${npcPts === 1 ? '' : 's'} de jogadores (e os apoiantes do partido)</small></div>${jaVotei ? '' : '<button class="btn sm ghost" data-votar="">Votar</button>'}</div>
        ${cands.map(c => `<div class="row ${c.jogador_id === uid ? 'mine' : ''}"><span class="e">🙋</span><div class="t"><b>${esc(c.nome)}</b><small>"${esc(c.lema || '')}" · ${c.votos} voto${c.votos === 1 ? '' : 's'} · 📣 ${c.campanha} apoio</small></div>${jaVotei ? '' : `<button class="btn sm" data-votar="${c.jogador_id}">Votar</button>`}</div>`).join('')}
      </div>
      <p class="m" style="margin-top:8px">${jaVotei ? '☑️ Já votaste.' : 'Votas no município onde moras.'} Cada voto de um jogador vale muito; a campanha conta o resto.</p>`;
    if (souCand) h += `<div class="sub2">📣 A tua campanha</div><div class="list">
        <div class="row"><span class="e">🎤</span><div class="t"><b>Comício</b><small>Som, palco, sumo e pão · +100–200 apoio · de 2 em 2 horas</small></div><button class="btn sm" data-camp="comicio">${fmtKz(25000)}</button></div>
        <div class="row"><span class="e">🚪</span><div class="t"><b>Porta a porta</b><small>Grátis, cansa · +25–45 apoio</small></div><button class="btn sm ghost" data-camp="porta">Ir</button></div>
        <div class="row"><span class="e">👕</span><div class="t"><b>Camisolas e "gasosa" eleitoral</b><small>+300 apoio… se nenhum jornalista vir</small></div><button class="btn sm red" data-camp="camisolas">${fmtKz(50000)}</button></div>
      </div><p class="m" style="margin-top:6px">A campanha faz-se dentro do município (${m.bairros.map(b => esc(bairro(b)?.nome || b)).join(', ')}).</p>`;
    else h += `<div class="list" style="margin-top:8px"><div class="row"><span class="e">✋</span><div class="t"><b>Candidatar-me a administrador/a</b><small>20.000 Kz · reputação 10+ · cadastro limpo · morar no município</small></div><button class="btn sm" id="bCand">Candidatar</button></div></div>`;
  }

  h += `<div class="sub2">Outros municípios</div><div class="list">${municipios.filter(x => x.id !== m.id).map(x => `<div class="row"><span class="e">${x.sem_luz ? '🕯️' : '💡'}${x.sem_agua ? '🚱' : ''}</span><div class="t"><b>${esc(x.nome)}</b><small>${esc(x.admin_nome)} · ${Object.keys(SERVICOS).map(k => `<span class="svc">${icone(icDoEmoji(SERVICOS[k][0]) || 'ponto', 13)}${Math.round(x[k])}</span>`).join(' ')}</small></div></div>`).join('')}</div>`;
  body.innerHTML = hp + `<div class="sub2">🏘️ ${esc(tr('O teu município'))}</div>` + h;

  const depois = () => renderGoverno(body);
  ligarProv(body, depois);
  if (typeof ui2 === 'function' && ui2()) ui2Governo(body, m, e, hp);   // 8 nov: redesenho (teste)
  if (window._provFoco) { window._provFoco = false; body.querySelector('#provTopo')?.scrollIntoView({ block: 'start' }); }
  body.querySelector('#bAgua')?.addEventListener('click', async () => { if (await acao('comprar_agua')) depois(); });
  body.querySelectorAll('[data-votar]').forEach(b => b.onclick = async () => {
    const id = b.dataset.votar || null, nome = id ? cands.find(c => c.jogador_id === id).nome : e.npc_nome;
    if (!await perguntar(`Votar em ${nome}? Não dá para mudar.`)) return;
    if (await acao('votar', { p_candidato: id })) depois();
  });
  body.querySelector('#bCand')?.addEventListener('click', async () => {
    const lema = prompt('O teu lema de campanha (até 80 letras):', 'Luz, água e estradas para todos!');
    if (lema === null) return;
    if (await acao('candidatar', { p_lema: lema })) depois();
  });
  body.querySelectorAll('[data-camp]').forEach(b => b.onclick = async () => {
    if (b.dataset.camp === 'camisolas' && !await perguntar('Comprar votos é crime. Se fores apanhado/a, és excluído/a e detido/a. Arriscar?')) return;
    b.disabled = true; const r = await acao('campanha', { p_tipo: b.dataset.camp }); b.disabled = false;
    if (r) depois();
  });
  body.querySelectorAll('[data-gov]').forEach(b => b.onclick = () => {
    const a = b.dataset.gov;
    if (a === 'demitir') { perguntar('Demitir-te do cargo?').then(ok => ok && acao('governar', { p_acao: 'demitir' }).then(r => r && depois())); return; }
    if (a === 'investir') return pedirValor(`${SERVICOS[b.dataset.s][0]} Investir em ${SERVICOS[b.dataset.s][1].toLowerCase()}`, `Orçamento: ${fmtKz(m.orcamento)}. Cada 10.000 Kz = +1.`, Math.min(m.orcamento, 100000), async v => { if (await acao('governar', { p_acao: 'investir', p_servico: b.dataset.s, p_valor: v })) { fecharSheetsTel(); depois(); } });
    if (a === 'taxa') return pedirValor('🧾 Taxa municipal', 'Por dia, paga por quem mora no município (0 a 1.000 Kz).', m.taxa, async v => { if (await acao('governar', { p_acao: 'taxa', p_valor: v })) { fecharSheetsTel(); depois(); } });
    if (a === 'desviar') return pedirValor('🤫 Desviar fundos', `Orçamento: ${fmtKz(m.orcamento)}. Quanto mais desvias, mais provável uma auditoria: exoneração e detenção.`, 50000, async v => { if (await acao('governar', { p_acao: 'desviar', p_valor: v })) { fecharSheetsTel(); depois(); } });
  });
}
function fecharSheetsTel() { document.querySelectorAll('.tel-modal').forEach(x => x.remove()); }

function governoHTML() {
  return `<div class="sec"><h4>🏛️ Governo</h4></div><div class="list"><div class="row"><span class="e">🗳️</span><div class="t"><b>Administração, eleições e serviços</b><small>Quem manda, o orçamento, a luz e a água</small></div><button class="btn sm" data-abrir-governo>Abrir</button></div></div>`;
}
