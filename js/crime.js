/* ============================================================
   Vida na Banda — CRIME E POLÍCIA
   SMS de burla (app Mensagens), app Justiça (queixas, cadastro,
   detenção), esquemas nos becos, contrabando, esquadra e cadeia.
   ============================================================ */
let smsLista = [], smsNovas = 0, crimesContra = [];
const preso = () => !!(J?.preso_ate && new Date(J.preso_ate) > new Date());
const CRIMES = {
  carteira: { e: '👛', n: 'Tirar carteiras', d: 'No meio da multidão. 1.500–6.000 Kz.', risco: 15, en: 15 },
  burla: { e: '📲', n: 'Burla por SMS', d: 'Mandas mensagens falsas. Um jogador real pode cair… ou denunciar-te.', risco: 10, en: 10 },
  assalto: { e: '🔪', n: 'Assaltar alguém', d: 'Um jogador aqui perto. Pode defender-se e ver-te a cara.', risco: 25, en: 20 },
  contrabando: { e: '📦', n: 'Contrabando na fronteira', d: 'Compras 20.000 Kz de combustível e tabaco e vendes do outro lado: 45.000–70.000 Kz.', risco: 22, en: 30 },
};
const TIPO_CRIME = { carteira: ['👛', 'Carteirista'], casa: ['🏚️', 'Assalto à casa'], assalto: ['🔪', 'Assalto'], burla: ['📲', 'Burla'] };

async function carregarSms() {
  const ps = typeof pre === 'function' ? pre('sms') : null;
  const { data, error } = ps ? { data: ps.v } : await sb.from('sms').select('*').order('criado_em', { ascending: false }).limit(30);
  if (error) return;
  const antes = smsNovas;
  smsLista = data || []; smsNovas = smsLista.filter(s => s.estado === 'novo').length;
  if (smsNovas > antes && antes >= 0 && carregarSms.feito) toast(`💬 Nova mensagem de ${smsLista.find(s => s.estado === 'novo')?.remetente}`, 'info', 4500);
  carregarSms.feito = true;
  atualizarPontoTel();
}
async function iniciarCrime() { await carregarSms(); }
// 8 nov (0fe-1): o pulso avisa quando há SMS novas (era de 2 em 2 min)

/* ---------- 🚔 detido: escolher já ---------- */
let detencaoVista = null;
function verDetencao() {
  if (!J?.detencao) { detencaoVista = null; return; }
  if (detencaoVista === J.detencao.desde) return;
  detencaoVista = J.detencao.desde;
  setTimeout(() => abrirTelemovel('justica'), 400);
}

function blocoDetencao() {
  const d = J.detencao, g = d.grav;
  return `<div class="rel" style="margin-top:0;border-color:var(--red)">
      <div style="font-size:40px;text-align:center">🚔</div>
      <h3 style="text-align:center;margin:4px 0">Estás detido/a</h3>
      <p class="m" style="text-align:center;margin:0">Acusação: <b>${esc(d.nome)}</b>. O que fazes?</p></div>
    <div class="list" style="margin-top:10px">
      <div class="row"><span class="e">🤝</span><div class="t"><b>Dar gasosa ao agente</b><small>Quase sempre resulta… mas se for honesto, é pior (suborno).</small></div><button class="btn sm" data-decidir="gasosa">${fmtKz(g * 5000)}</button></div>
      <div class="row"><span class="e">👔</span><div class="t"><b>Advogado particular</b><small>Boa hipótese de absolvição; se perder, pena reduzida (${g} h).</small></div><button class="btn sm" data-decidir="advogado">${fmtKz(g * 15000)}</button></div>
      <div class="row"><span class="e">📂</span><div class="t"><b>Defensor oficioso</b><small>Grátis, mas raramente ganha. Pena: ${2 * g} h de cadeia.</small></div><button class="btn sm ghost" data-decidir="defensor">Grátis</button></div>
    </div><p class="m" style="margin-top:8px">Se não decidires em 30 minutos, fica o defensor oficioso.</p>`;
}
function tempoFalta(iso) { const m = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; }

/* ---------- ⚖️ app Justiça ---------- */
async function renderJustica(body) {
  if (J.cadastro === undefined) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const { data } = await sb.from('crimes').select('*').order('criado_em', { ascending: false }).limit(20);
  crimesContra = data || [];
  if (typeof ui2 === 'function' && ui2()) return ui2Justica(body);   // 8 nov: redesenho (teste)
  const p = Math.round(J.procurado || 0);
  let h = '';
  if (J.detencao) h += blocoDetencao();
  else if (preso()) h += `<div class="rel" style="margin-top:0;text-align:center"><div style="font-size:40px">⛓️</div><h3 style="margin:4px 0">Na Cadeia de Viana</h3><p class="m" style="margin:0">Faltam <b>${tempoFalta(J.preso_ate)}</b>. Na oficina sai-se mais cedo; a fiança é ${fmtKz(Math.ceil((new Date(J.preso_ate) - Date.now()) / 3600e3) * 15000)}.</p></div>`;
  h += `<div class="rel" ${J.detencao || preso() ? '' : 'style="margin-top:0"'}>
      <div class="lbl"><span>🚨 Procurado/a pela polícia</span><span>${p}</span></div>
      <div class="meter"><u style="left:0;width:${p}%;background:${p >= 50 ? 'var(--red)' : p > 0 ? 'var(--gold)' : 'var(--green)'}"></u></div>
      <p class="m" style="margin:8px 0 0">${p >= 50 ? 'Há um mandado contra ti: a polícia pode bater-te à porta a qualquer momento. Podes entregar-te na esquadra.' : p > 0 ? 'A polícia anda de olho em ti. O "calor" baixa com o tempo.' : 'Ninguém te procura. 😇'}</p>
      <p class="m" style="margin:6px 0 0">📁 Cadastro: <b>${J.cadastro ? J.cadastro + ' condenação' + (J.cadastro > 1 ? 'ões' : '') : 'limpo'}</b></p></div>
    <div class="sub2">Crimes contra ti</div>
    <div class="list">${crimesContra.length ? crimesContra.map(c => {
      const t = TIPO_CRIME[c.tipo] || ['⚠️', c.tipo]; const velho = Date.now() - new Date(c.criado_em) > 3 * 864e5;
      return `<div class="row"><span class="e">${t[0]}</span><div class="t"><b>${t[1]}${c.valor ? ' · ' + fmtKz(c.valor) : ''}</b><small>${esc(bairro(c.bairro)?.nome || '')} · há ${tempoRel(c.criado_em)}</small></div>${c.queixa ? '<span class="price">Queixa feita</span>' : velho ? '<span class="price">Arquivado</span>' : `<button class="btn sm" data-queixa="${c.id}">Fazer queixa</button>`}</div>`;
    }).join('') : '<div class="empty">Nada. Que continue assim! 🙏</div>'}</div>
    <p class="m" style="margin-top:10px">🛡️ Para te protegeres: guarda o dinheiro no banco (quem te assalta só leva o que trazes) e nunca pagues "taxas" pedidas por SMS.</p>`;
  body.innerHTML = h;
  body.querySelectorAll('[data-decidir]').forEach(b => b.onclick = async () => {
    b.disabled = true; const r = await acao('decidir_detencao', { p_escolha: b.dataset.decidir }); b.disabled = false;
    if (r) abrirTelemovel('justica');
  });
  body.querySelectorAll('[data-queixa]').forEach(b => b.onclick = async () => {
    b.disabled = true; const r = await acao('queixar', { p_crime: +b.dataset.queixa }); if (r) renderJustica(body); else b.disabled = false;
  });
}

/* ---------- 💬 app Mensagens ---------- */
async function renderMensagens(body) {
  await carregarSms();
  if (!smsLista.length) { body.innerHTML = '<div class="empty">Sem mensagens.</div>'; return; }
  const est = { pago: '💸 Pagaste', ignorado: '🗑️ Apagada', denunciado: '🚩 Denunciada', recebido: '✅ Recebeste', fugiu: '😱 Fugiu com o dinheiro' };
  body.innerHTML = `<div class="sms">${smsLista.map(s => `<div class="sms-item ${s.estado === 'novo' ? 'nova' : ''}">
      <div class="de"><b>${esc(s.remetente)}</b><small>${tempoRel(s.criado_em)}</small></div>
      <div class="bolha">${esc(s.texto)}</div>
      ${s.estado === 'novo' ? `<div class="acoes"><button class="btn sm ${s.tipo === 'kixikila' ? '' : 'ghost'}" data-sms="${s.id}" data-r="pagar">${s.tipo === 'kixikila' ? 'Entrar' : 'Enviar'} ${fmtKz(s.valor)}</button><button class="btn sm ghost" data-sms="${s.id}" data-r="ignorar">Apagar</button>${s.tipo !== 'kixikila' ? `<button class="btn sm red" data-sms="${s.id}" data-r="denunciar">Denunciar</button>` : ''}</div>` : `<div class="est">${s.tipo === 'kixikila' && s.estado === 'pago' ? '⏳ Entraste. O pagamento chega daqui a 1 dia.' : est[s.estado] || ''}</div>`}
    </div>`).join('')}</div>`;
  body.querySelectorAll('[data-sms]').forEach(b => b.onclick = async () => {
    const s = smsLista.find(x => x.id === +b.dataset.sms);
    if (b.dataset.r === 'pagar' && !await perguntar(`Mandar ${fmtKz(s.valor)} para "${s.remetente}"?`)) return;
    b.disabled = true; const r = await acao('responder_sms', { p_id: s.id, p_acao: b.dataset.r }); b.disabled = false;
    if (r) renderMensagens(body);
  });
}

/* ---------- lugares: beco, fronteira, esquadra, cadeia ---------- */
function crimeHTML(tipos) {
  return `<div class="sec"><h4>🕶️ Esquemas</h4><span>Risco ${Math.round(J.procurado || 0) ? '↑ (procurado/a)' : ''}</span></div>
    <p class="m">Dinheiro rápido… e a polícia anda por aí. Se fores apanhado/a: gasosa, advogado ou cadeia.</p>
    <div class="list">${tipos.map(t => { const c = CRIMES[t]; return `<div class="row"><span class="e">${c.e}</span><div class="t"><b>${c.n}</b><small>${c.d} · risco ~${c.risco}% · −${c.en} energia</small></div><button class="btn sm red" data-crime="${t}">Fazer</button></div>`; }).join('')}</div>`;
}
async function escolherVitima() {
  const { data } = await sb.from('jogadores').select('id,nome,visto_em,criado_em').eq('bairro', J.bairro).neq('id', uid)
    .gt('visto_em', new Date(Date.now() - 15 * 60000).toISOString()).limit(20);
  const lista = (data || []).filter(p => !bloqueados.has(p.id) && Date.now() - new Date(p.criado_em) > 864e5);
  const el = sheet(`<h3>🔪 Assaltar quem?</h3><p class="m">Só quem está aqui no bairro agora.</p><div class="list">${lista.length ? lista.map(p => `<div class="row"><span class="e">👤</span><div class="t"><b>${esc(p.nome)}</b></div><button class="btn sm red" data-v="${p.id}">Assaltar</button></div>`).join('') : '<div class="empty">Não há ninguém por perto.</div>'}</div>`);
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => { b.disabled = true; const r = await acao('crime', { p_tipo: 'assalto', p_alvo: b.dataset.v }); if (r) fecharSheets(); else b.disabled = false; });
}
function ligarCrime(el, depois) {
  el.querySelectorAll('[data-crime]').forEach(b => b.onclick = async () => {
    const t = b.dataset.crime;
    if (t === 'assalto') { fecharSheets(); return escolherVitima(); }
    if (t === 'contrabando' && !await perguntar('Investir 20.000 Kz no carregamento?')) return;
    b.disabled = true; const r = await acao('crime', { p_tipo: t }); b.disabled = false;
    if (r) { eu.fala = { txt: '🤫', ate: performance.now() + 2000 }; depois && depois(); }
  });
  el.querySelectorAll('[data-policia]').forEach(b => b.onclick = async () => {
    if (b.dataset.policia === 'limpar_legal' && !await perguntar(`Pagar ${fmtKz(200000 * (J.cadastro || 0))} de multa no tribunal para limpar o cadastro?`)) return;
    if (b.dataset.policia === 'limpar' && !await perguntar(`Pagar ${fmtKz(50000 * (J.cadastro || 0))} "por baixo da mesa" para limpar o cadastro? Se for uma operação anticorrupção, és detido/a.`)) return;
    b.disabled = true; const r = await acao('policia', { p_acao: b.dataset.policia }); b.disabled = false;
    if (r) depois && depois();
  });
  el.querySelectorAll('[data-cadeia]').forEach(b => b.onclick = async () => {
    b.disabled = true; const r = await acao('cadeia', { p_acao: b.dataset.cadeia }); b.disabled = false;
    if (r) { if (b.dataset.cadeia === 'trabalhar') eu.fala = { txt: '🔨', ate: performance.now() + 2000 }; if (b.dataset.cadeia === 'cartas') eu.fala = { txt: '🃏', ate: performance.now() + 2000 }; depois && depois(); }
  });
  // LL36: a barra do bom comportamento (vem do servidor)
  const bc = el.querySelector('#bcMeter');
  if (bc) sb.rpc('minha_pena').then(({ data }) => {
    if (!data || !bc.isConnected) return;
    const p = data.pontos || 0;
    bc.innerHTML = `<div class="lbl"><span>⭐ ${tr('Bom comportamento')}</span><span class="price">${p}/100</span></div><div class="meter"><u style="left:0;width:${p}%;background:${p >= 60 ? 'var(--green)' : 'var(--gold)'}"></u></div>`;
    const pr = el.querySelector('[data-cadeia="precaria"]');
    if (pr) pr.disabled = data.precaria || p < 60;
    const ca = el.querySelector('[data-cadeia="cartas"]');
    if (ca && data.cartas_em && Date.now() - new Date(data.cartas_em) < 3600e3) ca.disabled = true;
  });
  el.querySelector('[data-abrir-justica]')?.addEventListener('click', () => abrirTelemovel('justica'));
}
function policiaHTML() {
  const p = Math.round(J.procurado || 0);
  return `<div class="sec"><h4>👮 Esquadra</h4></div><div class="list">
    <div class="row"><span class="e">📝</span><div class="t"><b>Fazer queixa</b><small>Foste roubado/a ou burlado/a?</small></div><button class="btn sm" data-abrir-justica>Abrir</button></div>
    <div class="row ${p ? '' : 'lock'}"><span class="e">🙋</span><div class="t"><b>Entregar-me</b><small>${p ? (p < 30 ? 'Pagas uma multa e fica resolvido.' : 'Tens mandado: 1 h de cadeia em vez de muito mais.') : 'Ninguém te procura.'}</small></div><button class="btn sm ghost" data-policia="entregar" ${p ? '' : 'disabled'}>Ir</button></div>
    <div class="row ${J.cadastro ? '' : 'lock'}"><span class="e">⚖️</span><div class="t"><b>Pagar a multa no tribunal</b><small>Limpa o cadastro dentro da lei, sem risco: ${fmtKz(200000 * (J.cadastro || 0))}.</small></div><button class="btn sm" data-policia="limpar_legal" ${J.cadastro ? '' : 'disabled'}>Pagar</button></div>
    <div class="row ${J.cadastro ? '' : 'lock'}"><span class="e">🤫</span><div class="t"><b>"Limpar" o cadastro</b><small>Um despachante faz o processo desaparecer… se não for uma armadilha.</small></div><button class="btn sm red" data-policia="limpar" ${J.cadastro ? '' : 'disabled'}>${J.cadastro ? fmtKz(50000 * J.cadastro) : 'Limpo'}</button></div>
  </div>`;
}
function cadeiaHTML(o) {
  if (!preso()) return `<p class="m">Já não estás preso/a.</p>`;
  const racao = J.racao_em && Date.now() - new Date(J.racao_em) < 3 * 3600e3;
  const linhas = {
    comer: `<div class="row"><span class="e">🥣</span><div class="t"><b>Refeição da cadeia</b><small>${racao ? 'Próxima às ' + new Date(new Date(J.racao_em).getTime() + 3 * 3600e3).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'Funge com feijão. Barriga +40'}</small></div><button class="btn sm" data-cadeia="comer" ${racao ? 'disabled' : ''}>Grátis</button></div>`,
    trabalhar: `<div class="row"><span class="e">🔨</span><div class="t"><b>Oficina</b><small>+300 Kz e −30 min de pena · −25 energia</small></div><button class="btn sm" data-cadeia="trabalhar">Trabalhar</button></div>`,
    treinar: `<div class="row"><span class="e">💪</span><div class="t"><b>Exercício no pátio</b><small>Forma +6 · −15 energia</small></div><button class="btn sm ghost" data-cadeia="treinar">Treinar</button></div>`,
    cartas: `<div class="row"><span class="e">🃏</span><div class="t"><b>Cartas com os colegas de cela</b><small>Uma sueca: humor +6, menos solidão e stress · 1 vez por hora · sem apostas</small></div><button class="btn sm ghost" data-cadeia="cartas">Jogar</button></div>`,
    precaria: `<div class="row"><span class="e">⭐</span><div class="t"><b>Pedir a saída precária</b><small>Com 60 de bom comportamento, a pena que falta passa para metade (1 vez por pena)</small></div><button class="btn sm" data-cadeia="precaria" disabled>Pedir</button></div>`,
    fianca: `<div class="row"><span class="e">🔓</span><div class="t"><b>Pagar fiança</b><small>15.000 Kz por cada hora que falta</small></div><button class="btn sm" data-cadeia="fianca">${fmtKz(Math.ceil((new Date(J.preso_ate) - Date.now()) / 3600e3) * 15000)}</button></div>`,
  };
  // cartas e saída precária são a 2.ª ação do pátio/secretaria: o cabeçalho (pena e barra) já está em cima
  if (o === 'cartas' || o === 'precaria') return `<div class="list" style="margin-top:8px">${linhas[o]}</div>`;
  return `<p class="m">⛓️ Faltam <b>${tempoFalta(J.preso_ate)}</b> de pena.</p><div id="bcMeter" class="rel" style="margin:0 0 10px"></div><div class="list">${linhas[o]}</div>`;
}
