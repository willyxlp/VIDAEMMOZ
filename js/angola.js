/* ============================================================
   Vida na Banda — ANGOLA: tempo e lavras
   ============================================================ */
let climaHoje = null, climaAviso = null;
const TEMPO = { sol: ['☀️', 'Sol'], nublado: ['⛅', 'Nublado'], chuva: ['🌧️', 'Chuva'], tempestade: ['⛈️', 'Tempestade'], cacimbo: ['🌫️', 'Cacimbo'] };
const regiaoDe = id => (bairro(id)?.provincia || 'Luanda').toLowerCase();
// FILA 0cz (11) (dono, 3 nov: «it's raining too much»): num dia de chuva, só chove umas horas (3 h; tempestade 4 h) — a hora muda
// de dia para dia e de região para região; no resto do dia fica nublado. 0dc (3): a app do tempo mostra o mesmo (tempoEm/janelaChuva).
// as horas em que chove hoje nessa região ([início, fim) em horas de Luanda), ou null se hoje não chove lá
function janelaChuva(regiao) {
  const t = climaHoje?.regioes?.[regiao]; if (t !== 'chuva' && t !== 'tempestade') return null;
  const k = [...(new Date(Date.now() + 3600e3).toISOString().slice(0, 10) + regiao)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const ini = 11 + (k % 9); return [ini, ini + (t === 'tempestade' ? 4 : 3)];
}
// o tempo de agora numa região (o mesmo que se vê no jogo: fora das horas de chuva fica nublado)
function tempoEm(regiao) {
  const t = climaHoje?.regioes?.[regiao]; if (t !== 'chuva' && t !== 'tempestade') return t;
  const [a, b] = janelaChuva(regiao), h = horaLuanda(); return h >= a && h < b ? t : 'nublado';
}
function tempoAqui() { return J ? tempoEm(regiaoDe(J.bairro)) : undefined; }
function tempoEmoji() { const t = tempoAqui(); return t ? TEMPO[t]?.[0] + ' ' : ''; }
async function carregarClima() {
  const pc = typeof pre === 'function' ? pre('clima') : null;
  const pb = pc ? null : await publico();   // 9 nov: /api/publico
  const { data, error } = pc ? { data: pc.v } : pb?.clima ? { data: pb.clima } : await sb.rpc('clima_hoje');
  if (error || !data) return;
  climaHoje = data; hud();
  const t = tempoAqui(), chave = regiaoDe(J.bairro) + t;
  if (t === 'tempestade' && climaAviso !== chave) { climaAviso = chave; toast(`⛈️ Tempestade em ${bairro(J.bairro)?.provincia || 'Luanda'}: estradas alagadas, barcos parados e casas fracas podem inundar.`, 'mau', 6500); }
}
setInterval(() => { if (J && !document.hidden) carregarClima(); }, 10 * 60 * 1000);

// chuva, tempestade e cacimbo por cima da cidade
let relampago = 0;
function desenhaTempo(t) {
  const tp = tempoAqui(); if (!tp || tp === 'sol') return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (tp === 'nublado') { ctx.fillStyle = 'rgba(40,50,60,0.10)'; ctx.fillRect(0, 0, CW, CH_); return; }
  if (tp === 'cacimbo') {
    const g = ctx.createLinearGradient(0, 0, 0, CH_); g.addColorStop(0, 'rgba(205,210,215,0.30)'); g.addColorStop(1, 'rgba(205,210,215,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH_); return;
  }
  const forte = tp === 'tempestade';
  ctx.fillStyle = `rgba(20,30,45,${forte ? 0.28 : 0.16})`; ctx.fillRect(0, 0, CW, CH_);
  const n = forte ? 260 : 120, vel = forte ? 900 : 650, inc = forte ? 0.32 : 0.18;
  ctx.strokeStyle = forte ? 'rgba(200,215,235,0.55)' : 'rgba(190,205,225,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sx = (i * 137.3) % (CW + 60), comp = 10 + (i % 5) * 3;
    const y = ((i * 251.7) + t * vel * (0.8 + (i % 7) * 0.05)) % (CH_ + 40) - 20;
    const x = (sx - y * inc + CW * 2) % (CW + 60) - 30;
    ctx.moveTo(x, y); ctx.lineTo(x - comp * inc, y + comp);
  }
  ctx.stroke();
  if (forte) {
    if (relampago <= 0 && Math.random() < 0.004) relampago = 0.25;
    if (relampago > 0) { ctx.fillStyle = `rgba(235,240,255,${relampago})`; ctx.fillRect(0, 0, CW, CH_); relampago -= 0.02; }
  }
}

/* ---------- 🌱 Lavras ---------- */
const CULTURAS = {
  milho: { nome: 'Milho', e: '🌽', semente: 2000, horas: 24, sacos: 8, preco: 700 },
  feijao: { nome: 'Feijão', e: '🫘', semente: 3000, horas: 36, sacos: 6, preco: 1400 },
  mandioca: { nome: 'Mandioca', e: '🥔', semente: 1500, horas: 48, sacos: 12, preco: 550 },
  batata: { nome: 'Batata', e: '🥔', semente: 2500, horas: 24, sacos: 9, preco: 800 },
};
async function renderLavras(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const { data, error } = await sb.from('lavras').select('*').eq('jogador_id', uid).eq('colhida', false).order('id');
  if (error) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const noCampo = ['huambo', 'malanje'].includes(J.bairro);
  const mult = regiaoDe(J.bairro) === 'luanda' ? 1.7 : noCampo ? 1.0 : 1.3;
  const chuvas = climaHoje?.epoca === 'chuvas';
  const col = J.colheita || {};
  const agora = Date.now();
  if (typeof ui2 === 'function' && ui2()) return ui2Lavras(body, data, noCampo, mult, chuvas, col);   // 8 nov: redesenho (teste)
  body.innerHTML = `<p class="m">Planta no campo (Huambo ou Malanje), colhe quando estiver pronto e vende. ${chuvas ? '🌧️ É a época das chuvas: as colheitas rendem mais.' : '🌫️ É o cacimbo: sem chuva, <b>rega</b> as lavras ou a colheita sai fraca.'} Em Luanda pagam 70% mais pelos sacos.</p>
    <div class="sub2">As tuas lavras</div>
    ${data.length ? `<div class="list">${data.map(l => {
      const c = CULTURAS[l.cultura], pronta = new Date(l.pronta_em) <= agora, h = Math.max(0, Math.ceil((new Date(l.pronta_em) - agora) / 3600e3));
      const aqui = l.bairro === J.bairro;
      return `<div class="row"><span class="e">${pronta ? '🧺' : '🌱'}</span><div class="t"><b>${c.e} ${c.nome}</b><small>📍 ${esc(bairro(l.bairro)?.nome || '')} · ${pronta ? 'Pronta para colher!' : `Faltam ${h} h`}${l.regada ? ' · 💧 regada' : ''}</small></div>
        ${aqui && !pronta && !l.regada ? `<button class="btn sm ghost" data-regar="${l.id}">💧 Regar</button>` : ''}${aqui && pronta ? `<button class="btn sm" data-colher="${l.id}">Colher</button>` : ''}</div>`;
    }).join('')}</div>` : '<div class="empty">Ainda não tens lavras.</div>'}
    ${noCampo ? `<div class="sub2">Plantar aqui em ${esc(bairro(J.bairro).nome)}</div>
      <div class="grelha">${Object.entries(CULTURAS).map(([k, c]) => `<button data-plantar="${k}"><span class="e">${c.e}</span><span>${c.nome}<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">${fmtKz(c.semente)} · ${c.horas} h · ~${c.sacos} sacos</small></span></button>`).join('')}</div>`
      : `<p class="m" style="margin-top:10px">🚂 Para plantar, vai ao Huambo ou a Malanje (comboio desde Viana ou Benguela).</p>`}
    <div class="sub2">Armazém · vender aqui (${mult === 1.7 ? 'preço de Luanda' : mult === 1 ? 'preço do campo' : 'preço da cidade'})</div>
    ${Object.entries(CULTURAS).some(([k]) => col[k] > 0) ? `<div class="list">${Object.entries(CULTURAS).filter(([k]) => col[k] > 0).map(([k, c]) => `<div class="row"><span class="e">${c.e}</span><div class="t"><b>${col[k]} sacos de ${c.nome.toLowerCase()}</b><small>≈ ${fmtKz(c.preco * mult)} por saco aqui</small></div><button class="btn sm" data-vender="${k}" data-n="${col[k]}">Vender tudo</button></div>`).join('')}</div>` : '<div class="empty">O armazém está vazio.</div>'}`;
  const depois = () => abrirTelemovel('lavras');
  body.querySelectorAll('[data-plantar]').forEach(b => b.onclick = async () => { if (await acao('plantar', { p_cultura: b.dataset.plantar })) depois(); });
  body.querySelectorAll('[data-regar]').forEach(b => b.onclick = async () => { if (await acao('regar', { p_id: +b.dataset.regar })) depois(); });
  body.querySelectorAll('[data-colher]').forEach(b => b.onclick = async () => { if (await acao('colher', { p_id: +b.dataset.colher })) depois(); });
  body.querySelectorAll('[data-vender]').forEach(b => b.onclick = async () => { if (await acao('vender_colheita', { p_cultura: b.dataset.vender, p_sacos: +b.dataset.n })) depois(); });
}

/* ---------- 🏥 Saúde ---------- */
const DOENCAS = { malaria: ['🦟', 'Malária', 'Febre alta e tremores. Enquanto jogas, perdes saúde: trata-te depressa.'], tifoide: ['🤢', 'Febre tifoide', 'Só passa com receita (centro de saúde ou clínica).'], gripe: ['🤧', 'Gripe', 'Chata, mas passa sozinha num dia.'] };
const SAUDE_LUGARES = {
  farmacia: ['mutamba', 'maianga', 'cazenga', 'viana', 'kilamba', 'talatona', 'benguela', 'huambo', 'lubango', 'namibe', 'malanje', 'cabinda'],
  centro: ['cazenga', 'viana', 'maianga', 'benguela', 'huambo', 'lubango', 'namibe', 'malanje', 'cabinda'],
  clinica: ['talatona', 'mutamba', 'benguela', 'lubango', 'cabinda'],
  hospital: ['maianga'],
  curandeiro: ['cazenga', 'malanje', 'huambo', 'cabinda'],
};
async function renderSaude(body) {
  if (J.seguro_ate === undefined) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  if (typeof ui2 === 'function' && ui2()) return ui2Saude(body);   // 8 nov: redesenho (teste)
  const d = J.doenca ? DOENCAS[J.doenca] : null, s = Math.round(J.saude);
  const seguro = J.seguro_ate && new Date(J.seguro_ate) > new Date();
  const aqui = k => SAUDE_LUGARES[k].includes(J.bairro);
  const preco = { farmacia: J.doenca === 'malaria' ? 6000 : 1500, centro: 0, clinica: seguro ? 0 : 25000, hospital: seguro ? 2000 : 12000, curandeiro: 2000 };
  const op = (k, e, nome, desc, ok, p) => `<div class="row"><span class="e">${e}</span><div class="t"><b>${nome}</b><small>${desc}</small></div><button class="btn sm ${ok ? '' : 'ghost'}" data-tratar="${k}" ${ok ? '' : 'disabled'}>${p === 0 ? 'Grátis' : fmtKz(p)}</button></div>`;
  const ondeTxt = k => 'Em: ' + SAUDE_LUGARES[k].map(b => bairro(b)?.nome || b).join(', ');
  body.innerHTML = `<div class="rel" style="margin-top:0">
      <div class="lbl"><span>❤️ Saúde</span><span>${s}</span></div>
      <div class="meter"><u style="left:0;width:${s}%;background:${s < 30 ? 'var(--red)' : s < 60 ? 'var(--gold)' : 'var(--green)'}"></u></div>
      <p class="m" style="margin:10px 0 0">${d ? `${d[0]} <b>${d[1]}</b> — ${d[2]}` : '💪 Estás de boa saúde.'}</p>
      <p class="m" style="margin:6px 0 0">${seguro ? `🛡️ Seguro ativo até ${new Date(J.seguro_ate).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '🛡️ Sem seguro de saúde.'}</p>
    </div>
    <p class="m" style="margin-top:12px">${climaHoje?.epoca === 'chuvas' ? '🦟 Época das chuvas: muita malária. Casas melhores (conforto 3+) protegem.' : '🤧 Cacimbo: gripes. Manter a forma ajuda.'} Casas muito fracas apanham febre tifoide.</p>
    <div class="sub2">Tratar-me</div>
    <div class="list">
      ${op('farmacia', '💊', 'Farmácia', J.doenca === 'tifoide' ? 'Precisa de receita para a tifoide' : aqui('farmacia') ? 'Aqui perto' : 'Não há aqui', aqui('farmacia') && J.doenca && J.doenca !== 'tifoide', preco.farmacia)}
      ${op('farmacia_online', '🛵', 'Farmácia com entrega', 'Chega onde estiveres (+2.000 Kz)', J.doenca && J.doenca !== 'tifoide', preco.farmacia + 2000)}
      ${op('centro', '🏥', 'Centro de saúde público', `Grátis, mas a fila é longa e às vezes não há médico. ${aqui('centro') ? 'Aqui perto.' : ondeTxt('centro')}`, aqui('centro') && (J.doenca || s < 80), 0)}
      ${op('clinica', '🩺', 'Clínica privada', `Trata tudo, +35 saúde. ${aqui('clinica') ? 'Aqui perto.' : ondeTxt('clinica')}`, aqui('clinica'), preco.clinica)}
      ${op('hospital', '🚑', 'Hospital Josina Machel', `Uma noite internado e saúde 80+. ${aqui('hospital') ? 'Aqui perto.' : 'Na Maianga.'}`, aqui('hospital') && (J.doenca || s < 80), preco.hospital)}
      ${op('curandeiro', '🌿', 'Curandeiro tradicional', `Chá de raízes. Às vezes resulta… ${aqui('curandeiro') ? 'Aqui perto.' : ondeTxt('curandeiro')}`, aqui('curandeiro') && J.doenca, 2000)}
    </div>
    <div class="sub2">Seguro de saúde</div>
    <div class="row"><span class="e">🛡️</span><div class="t"><b>7 dias de seguro</b><small>Clínica grátis, hospital por 2.000 Kz${seguro ? ' · renova por mais 7 dias' : ''}</small></div><button class="btn sm" id="bSeguro">${fmtKz(15000)}</button></div>`;
  body.querySelectorAll('[data-tratar]').forEach(b => b.onclick = async () => { if (await acao('tratar', { p_onde: b.dataset.tratar })) abrirTelemovel('saude'); });
  body.querySelector('#bSeguro').onclick = async () => { if (await acao('comprar_seguro')) abrirTelemovel('saude'); };
}
