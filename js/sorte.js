/* ============================================================
   Vida na Banda — DÓLARES E SORTE
   Câmbio (banco vs kinguilas), raspadinha, Lotaria e apostas.
   ============================================================ */
const fmtUsd = n => '$' + Number(n || 0).toFixed(2).replace('.', ',');
const fmtTaxa = n => { const s = Number(n).toFixed(2); return typeof lingua !== 'undefined' && lingua === 'en' ? s : s.replace('.', ','); };   // 0g-C: em inglês, ponto

/* ---------- 💵 Dólares ---------- */
async function renderDolares(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const { data: c, error } = await sb.rpc('cambio_hoje');
  if (error) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const h = c.historico || [], ini = h[0]?.oficial, fim = h[h.length - 1]?.oficial;
  const varia = ini ? ((fim / ini - 1) * 100) : 0;
  if (typeof ui2 === 'function' && ui2()) return ui2Dolares(body, c);   // 8 nov: redesenho (teste)
  const naBaixa = J.bairro === 'mutamba', semKinguilas = ['kilamba', 'talatona'].includes(J.bairro);
  // gráfico pequeno: oficial e rua nos últimos dias
  const W = 300, H = 70, vals = h.flatMap(x => [x.oficial, x.rua]), mn = Math.min(...vals), mx = Math.max(...vals);
  const pt = (v, i) => `${(i / Math.max(1, h.length - 1)) * W},${H - ((v - mn) / Math.max(1, mx - mn)) * (H - 8) - 4}`;
  const linha = k => h.map((x, i) => pt(x[k], i)).join(' ');
  body.innerHTML = `
    <div class="rel" style="margin-top:0">
      <div class="lbl"><span>💵 Os teus dólares</span><span class="price" style="color:var(--green)">${fmtUsd(J.dolares)}</span></div>
      <small style="display:block;color:var(--muted);font-size:12px">≈ ${fmtKz(J.dolares * c.oficial)} ao câmbio oficial</small>
      ${h.length > 1 ? `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:70px;margin-top:10px"><polyline points="${linha('rua')}" fill="none" stroke="#f5b81c" stroke-width="2"/><polyline points="${linha('oficial')}" fill="none" stroke="#5aa7e0" stroke-width="2"/></svg>
        <small style="display:flex;justify-content:space-between;color:var(--dim);font-size:11.5px"><span><b style="color:#5aa7e0">━</b> Banco ${fmtTaxa(c.oficial)} · <b style="color:#f5b81c">━</b> Rua ${fmtTaxa(c.rua)}</span><span>${varia >= 0 ? '+' : ''}${varia.toFixed(1).replace('.', ',')}% em ${h.length} dias</span></small>` : ''}
    </div>
    <p class="m" style="margin-top:10px">O kwanza vai perdendo valor: guardar em dólares protege-te. O banco tem o melhor câmbio mas só vende <b>${fmtUsd(200)} por dia</b>, e só ao balcão na Baixa. As kinguilas vendem quanto quiseres, mais caro — e às vezes com notas falsas.</p>
    <label>Valor em dólares</label><input class="inp" id="iUsd" type="number" min="1" step="1" placeholder="ex: 100">
    <div class="sub2">🏦 Banco ${naBaixa ? '' : '· só na Baixa'}</div>
    <div class="grelha">
      <button data-t="banco:comprar" ${naBaixa && c.limite_banco > 0 ? '' : 'disabled'}><span class="e">🟢</span><span>Comprar a ${fmtTaxa(c.banco_compra)}<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">Hoje ainda: ${fmtUsd(c.limite_banco)}</small></span></button>
      <button data-t="banco:vender" ${naBaixa ? '' : 'disabled'}><span class="e">🔴</span><span>Vender a ${fmtTaxa(c.banco_venda)}</span></button>
    </div>
    <div class="sub2">🧕🏾 Kinguilas ${semKinguilas ? '· não há aqui' : '· na rua'}</div>
    <div class="grelha">
      <button data-t="kinguila:comprar" ${semKinguilas ? 'disabled' : ''}><span class="e">🟢</span><span>Comprar a ${fmtTaxa(c.kinguila_compra)}</span></button>
      <button data-t="kinguila:vender" ${semKinguilas ? 'disabled' : ''}><span class="e">🔴</span><span>Vender a ${fmtTaxa(c.kinguila_venda)}</span></button>
    </div>`;
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => {
    const v = parseFloat(body.querySelector('#iUsd').value);
    if (!v || v < 1) return toast('Escreve quantos dólares.', 'mau');
    const [onde, op] = b.dataset.t.split(':');
    if (await acao('trocar', { p_onde: onde, p_acao: op, p_usd: v })) abrirTelemovel('dolares');
  });
}

/* ---------- 🎲 Sorte ---------- */
async function renderSorte(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const [{ data: jg, error }, lot, bil, aps] = await Promise.all([
    sb.rpc('jogos_hoje'),
    sb.from('lotaria').select('*').order('dia', { ascending: false }).limit(3),
    sb.from('bilhetes').select('*').eq('jogador_id', uid).order('id', { ascending: false }).limit(20),
    sb.from('apostas').select('*').eq('jogador_id', uid).order('id', { ascending: false }).limit(15)]);
  if (error) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const agora = new Date(jg.agora), hojeStr = jg.agora.slice(0, 10), horaAgora = jg.agora.slice(11, 16);
  const jogos = jg.jogos || [];
  const proxima = (lot.data || []).find(l => !l.sorteado), ultima = (lot.data || []).find(l => l.sorteado);
  const meusBil = (bil.data || []).filter(b => !proxima || b.dia === proxima.dia);
  const aberto = g => g.dia > hojeStr || (g.dia === hojeStr && g.hora.slice(0, 5) > horaAgora);
  const nomeJogo = id => { const g = jogos.find(x => x.id === id); return g ? `${g.casa} x ${g.fora}` : 'Jogo'; };
  const dataCurta = d => d === hojeStr ? 'Hoje' : d.slice(8, 10) + '/' + d.slice(5, 7);
  if (typeof ui2 === 'function' && ui2()) return ui2Sorte(body, { jogos, proxima, ultima, meusBil, aberto, nomeJogo, dataCurta, aps: aps.data || [] });   // 8 nov: redesenho (teste)
  body.innerHTML = (J?.comprou_kz ? `<div class="row lock sem-jogos"><span class="e">🚫</span><div class="t"><b>${tr('Os jogos a dinheiro estão fechados para ti')}</b><small>${tr('Compraste Kz (nesta conta ou noutra do mesmo aparelho). Quem compra Kz não pode jogar a dinheiro.')}</small></div></div>` : '') + `<p class="m">🎲 Joga com moderação: a casa ganha sempre a longo prazo. Limite de 500.000 Kz em apostas por dia.</p>
    <div class="sub2" style="margin-top:6px">🎟️ Raspadinha · 500 Kz</div>
    <div class="row"><span class="e">🎟️</span><div class="t"><b>Raspa e vê na hora</b><small>Prémios até 100.000 Kz</small></div><button class="btn sm" id="bRaspa">Raspar</button></div>
    <div class="sub2">🎰 Lotaria · sorteio todos os dias às 20h</div>
    <div class="rel" style="margin-top:0">
      <div class="lbl"><span>💰 Pote${proxima ? ' de ' + dataCurta(proxima.dia) : ''}</span><span class="price">${fmtKz(proxima?.pote ?? 1000000)}</span></div>
      <small style="display:block;color:var(--muted);font-size:12px;margin-top:4px">Bilhete: 1.000 Kz. Acerta os 3 números para levar o pote (se ninguém acertar, acumula). Acertar os 2 últimos dá 10.000 Kz.${ultima ? ` Último número: <b>${String(ultima.numero).padStart(3, '0')}</b>${ultima.vencedores ? ` (${ultima.vencedores} vencedor${ultima.vencedores > 1 ? 'es' : ''})` : ' — ninguém acertou'}.` : ''}</small>
      ${meusBil.length ? `<div class="chips" style="margin-top:8px">${meusBil.map(b => `<span class="chip">🎫 ${String(b.numero).padStart(3, '0')}${b.premio ? ' · ' + fmtKz(b.premio) : ''}</span>`).join('')}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:10px"><input class="inp" id="iNum" type="number" min="0" max="999" placeholder="Nº (000–999) ou vazio = sorte" style="flex:1;padding:8px 10px"><button class="btn sm" id="bBilhete">Comprar</button></div>
    </div>
    <div class="sub2">⚽ Liga de Luanda · apostas 1 X 2</div>
    <div class="list">${jogos.filter(aberto).map(g => `<div class="rel" style="margin-top:0"><div class="lbl"><span>${esc(g.casa)} x ${esc(g.fora)}</span><span style="color:var(--dim);font-weight:600">${dataCurta(g.dia)} · ${g.hora.slice(0, 5)}</span></div>
      <div class="grelha" style="grid-template-columns:repeat(3,1fr)">${[['1', g.odd1, 'Casa'], ['X', g.oddx, 'Empate'], ['2', g.odd2, 'Fora']].map(([k, o, t]) => `<button data-ap="${g.id}:${k}:${o}" style="justify-content:center;flex-direction:column;gap:0"><b>${k} · ${fmtTaxa(o)}</b><small style="color:var(--dim);font-size:11px">${t}</small></button>`).join('')}</div></div>`).join('') || '<div class="empty">Não há jogos abertos agora.</div>'}</div>
    ${jogos.some(g => g.golos_casa != null) ? `<div class="sub2">Resultados</div><div class="feed">${jogos.filter(g => g.golos_casa != null).map(g => `<div class="ev">${dataCurta(g.dia)} · ${esc(g.casa)} <b>${g.golos_casa}-${g.golos_fora}</b> ${esc(g.fora)}</div>`).join('')}</div>` : ''}
    ${(aps.data || []).length ? `<div class="sub2">As tuas apostas</div><div class="list">${aps.data.map(a => `<div class="row"><span class="e">${a.premio == null ? '⏳' : a.premio > 0 ? '✅' : '❌'}</span><div class="t"><b>${esc(nomeJogo(a.jogo_id))}</b><small>${a.escolha} @ ${fmtTaxa(a.odd)} · apostaste ${fmtKz(a.valor)}</small></div><span class="price" style="color:${a.premio > 0 ? 'var(--green)' : 'var(--dim)'}">${a.premio == null ? fmtKz(Math.floor(a.valor * a.odd)) : a.premio > 0 ? '+' + fmtKz(a.premio) : '—'}</span></div>`).join('')}</div>` : ''}`;
  body.querySelector('#bRaspa').onclick = async () => {
    const r = await acao('raspadinha', {}, { silencio: true });
    if (!r) return;
    raspar(r.premio, r.msg);
  };
  body.querySelector('#bBilhete').onclick = async () => {
    const v = body.querySelector('#iNum').value;
    if (await acao('comprar_bilhete', { p_numero: v === '' ? null : parseInt(v, 10) })) abrirTelemovel('sorte');
  };
  body.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => {
    const [id, esc_, odd] = b.dataset.ap.split(':'); const g = jogos.find(x => x.id === +id);
    pedirValor(`Apostar em ${esc_ === '1' ? esc(g.casa) : esc_ === '2' ? esc(g.fora) : 'empate'} · @ ${fmtTaxa(odd)}`, `${esc(g.casa)} x ${esc(g.fora)}, ${g.hora.slice(0, 5)}. Se acertares, recebes o valor × ${fmtTaxa(odd)}.`, 1000,
      async v => { if (await acao('apostar', { p_jogo: +id, p_escolha: esc_, p_valor: v })) abrirTelemovel('sorte'); });
  });
}
function raspar(premio, msg) {
  const el = sheet(`<h3>🎟️ Raspadinha</h3><p class="m">Raspa com o dedo (ou o rato)!</p>
    <div style="position:relative;width:260px;height:120px;margin:14px auto;border-radius:14px;overflow:hidden;background:${premio > 500 ? 'linear-gradient(135deg,#f5b81c,#e0313f)' : 'var(--card2)'};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:26px;color:#fff;text-align:center">
      ${premio ? fmtKz(premio) : 'Nada 😕'}<canvas id="cvRaspa" width="260" height="120" style="position:absolute;inset:0;touch-action:none;cursor:pointer"></canvas></div>
    <p class="m" id="msgRaspa" style="text-align:center;visibility:hidden">${esc(msg)}</p>
    <button class="btn full" id="maisRaspa">Outra (500 Kz)</button>`);
  const cv = el.querySelector('#cvRaspa'), g = cv.getContext('2d');
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 260, 120); g.fillStyle = '#7a7a7a'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(tr('RASPA AQUI'), 130, 66);
  let raspado = 0, ativo = false; const mostrar = () => { el.querySelector('#msgRaspa').style.visibility = 'visible'; hud(); };
  const r = e => { const b = cv.getBoundingClientRect(); const x = (e.clientX - b.left) * 260 / b.width, y = (e.clientY - b.top) * 120 / b.height;
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); raspado++; if (raspado === 25) { g.clearRect(0, 0, 260, 120); mostrar(); } };
  cv.onpointerdown = e => { ativo = true; r(e); window.addEventListener('pointerup', () => ativo = false, { once: true }); }; cv.onpointermove = e => ativo && r(e);
  el.querySelector('#maisRaspa').onclick = async () => { const x = await acao('raspadinha', {}, { silencio: true }); if (x) raspar(x.premio, x.msg); };
}
