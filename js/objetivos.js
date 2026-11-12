/* ============================================================
   Vida na Banda — OBJETIVOS
   Tarefas do dia, ambição de vida e conquistas (app ⭐ Objetivos
   e o cartão "Hoje" no ecrã inicial do telemóvel).
   ============================================================ */
let obj = null, objAba = 'diario', dia = null;

/* ---------- 🔥 LL1 · voltar todos os dias: sequência, baú diário, roda grátis, gelos (tudo no servidor) ---------- */
async function carregarDiario() {
  const pd = typeof pre === 'function' ? pre('diario') : null;   // 9 nov: vem no arranque()
  const { data, error } = pd?.v != null ? { data: pd.v, error: null } : await sb.rpc('diario');
  if (error) return null;
  dia = data; atualizarPillDiario(); atualizarPontoTel();
  return dia;
}
// o lembrete no ecrã (à esquerda, por baixo da barra): aparece enquanto houver baú ou roda por usar hoje
function atualizarPillDiario() {
  let b = document.getElementById('bDiario');
  const n = dia ? (dia.bau ? 1 : 0) + (dia.roda ? 1 : 0) : 0;
  if (!n || !J) { b?.remove(); return; }
  if (!b) { b = document.createElement('button'); b.id = 'bDiario'; b.className = 'pill-diario'; b.onclick = () => { objAba = 'diario'; window._objDireto = true; abrirTelemovel('objetivos'); }; document.body.appendChild(b); }
  b.innerHTML = `🔥 ${dia.dias || 0} <span>${dia.bau ? '🎁' : '🎡'}</span>`; b.dataset.falta = dia.bau ? 'bau' : 'roda';
  b.setAttribute('aria-label', tr('Prémio do dia'));
}
// quanto falta para a meia-noite de Luanda (o baú e a roda voltam)
function faltaAmanha() { const t = Date.now() + 3600e3, m = 864e5 - (t % 864e5); const h = Math.floor(m / 36e5), mi = Math.floor(m % 36e5 / 6e4); return `${h}h ${String(mi).padStart(2, '0')}m`; }
// rótulo curto de cada fatia (o ícone já diz se é dinheiro, energia, humor, barriga ou Ouro)
const curto = p => p.kz ? (p.kz >= 1000 ? (p.kz / 1000) + 'k' : String(p.kz)) : p.ouro ? '+' + p.ouro : '+' + (p.energia || p.humor || p.fome || 0);
function rodaSVG(premios) {
  const cores = ['#FFCB00', '#cc092f', '#ffe28a', '#141012', '#FFCB00', '#cc092f', '#ffe28a', '#2c6fb0'], tinta = ['#141012', '#fff', '#141012', '#FFCB00', '#141012', '#fff', '#141012', '#fff'];
  const R = 100, n = premios.length, seg = 360 / n;
  const pt = a => [R + R * Math.sin(a * Math.PI / 180), R - R * Math.cos(a * Math.PI / 180)];
  return `<svg viewBox="-6 -6 212 212" class="roda-svg"><g id="rodaG" style="transform-origin:100px 100px">${premios.map((p, i) => {
    const [x1, y1] = pt(i * seg), [x2, y2] = pt((i + 1) * seg), mid = (i + 0.5) * seg;
    return `<path d="M${R},${R} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z" fill="${cores[i % 8]}" stroke="#141012" stroke-width="2"/>
      <g transform="rotate(${mid} ${R} ${R})"><text x="${R}" y="34" text-anchor="middle" font-size="19">${p.e}</text><text x="${R}" y="56" text-anchor="middle" font-size="13" font-weight="900" fill="${tinta[i % 8]}">${curto(p)}</text></g>`;
  }).join('')}</g><circle cx="100" cy="100" r="16" fill="#141012" stroke="#FFCB00" stroke-width="4"/><path d="M100,-4 L90,14 L110,14 Z" fill="#fff" stroke="#141012" stroke-width="2"/></svg>`;
}
function diarioHTML() {
  if (!dia) return '<div class="empty">A carregar…</div>';
  const marcos = [[7, '1 Ouro + 1 gelo'], [30, '3 Ouro + 1 gelo'], [100, '10 Ouro'], [365, '30 Ouro']];
  const prox = dia.proximo || 365, ant = [0, 7, 30, 100, 365].filter(m => m < prox).pop() || 0, pct = Math.max(4, Math.min(100, (dia.dias - ant) / (prox - ant) * 100));
  return `<div class="rel diario-cartao">
      <div class="chama">🔥</div><div class="dias"><b>${dia.dias}</b><small>${dia.dias === 1 ? 'dia seguido' : 'dias seguidos'}</small></div>
      <div class="meter" style="margin-top:10px"><u style="left:0;width:${pct}%;background:var(--gold)"></u></div>
      <small class="m">${tr('Próximo marco')}: ${prox} ${tr('dias')} · ${tr('Melhor')}: ${dia.melhor} · 🧊 ${dia.gelos}/2</small>
    </div>
    <div class="list" style="margin-top:10px">
      <div class="row ${dia.bau ? '' : 'mine'}"><span class="e">🎁</span><div class="t"><b>Baú do dia</b><small>${dia.bau ? `${tr('Hoje')}: +${fmtKz(dia.premio.kz)}${dia.premio.ouro ? ` · 🏆 +${dia.premio.ouro} Ouro` : ''}` : `${tr('Aberto. Volta daqui a')} ${faltaAmanha()}`}</small></div>${dia.bau ? '<button class="btn sm" id="bBau">Abrir</button>' : '<span class="price">✅</span>'}</div>
    </div>
    <div class="roda-caixa">${rodaSVG(dia.premios_roda)}
      <button class="btn ${dia.roda ? '' : 'ghost'}" id="bRoda" ${dia.roda ? '' : 'disabled'}>${dia.roda ? '🎡 Rodar (grátis)' : `${tr('Volta daqui a')} ${faltaAmanha()}`}</button></div>
    <div class="list" style="margin-top:12px">
      <div class="row"><span class="e">🧊</span><div class="t"><b>Gelos</b><small>Se falhares um dia, um gelo salva a tua sequência. Tens ${dia.gelos} de 2.</small></div>${dia.gelos < 2 ? `<button class="btn sm ghost" id="bGelo">1 Ouro</button>` : ''}</div>
      ${marcos.map(([m, p]) => `<div class="row ${dia.melhor >= m ? 'mine' : 'lock'}"><span class="e">${dia.melhor >= m ? '🏆' : '🔒'}</span><div class="t"><b>${m} ${tr('dias seguidos')}</b><small>${p}</small></div></div>`).join('')}
    </div>`;
}
function ligarDiario(body) {
  body.querySelector('#bBau')?.addEventListener('click', async e => {
    e.target.disabled = true;
    const r = await acao('diario_bau');
    if (r) { festejar(e.target); await carregarDiario(); desenharObjetivos(body); } else e.target.disabled = false;
  });
  body.querySelector('#bGelo')?.addEventListener('click', async e => {
    if (!await perguntar('Comprar um gelo por 1 Ouro?')) return;
    if (await acao('diario_gelo')) { await carregarDiario(); desenharObjetivos(body); }
  });
  body.querySelector('#bRoda')?.addEventListener('click', async e => {
    const btn = e.target; if (btn.disabled) return; btn.disabled = true;
    const r = await acao('diario_roda', {}, { silencio: true });
    if (!r) { btn.disabled = false; return; }
    const g = body.querySelector('#rodaG'), n = dia.premios_roda.length, seg = 360 / n;
    const alvo = 360 * 5 + (360 - (r.i * seg + seg / 2));
    g.style.transition = 'transform 3.6s cubic-bezier(.12,.75,.12,1)'; g.style.transform = `rotate(${alvo}deg)`;
    setTimeout(async () => { toast(r.msg, 'bom', 4500); festejar(btn); await carregarDiario(); if (telSub === 'objetivos' && body.isConnected) desenharObjetivos(body); }, window.__rodaRapida ? 50 : 3800);
  });
}

let _objTudo = true;   // 9 nov (10 mil jogadores): diário + objetivos num só pedido (objetivos_tudo); base antiga → os dois de antes
async function carregarObjetivos() {
  const po = typeof pre === 'function' ? pre('objetivos') : null;   // 9 nov: vem no arranque()
  let data = null, error = null;
  if (po?.v != null) { data = po.v; carregarDiario(); }
  else if (_objTudo) {
    const r = await sb.rpc('objetivos_tudo');
    if (r.error && /objetivos_tudo|PGRST202|Could not find/i.test((r.error.code || '') + ' ' + (r.error.message || ''))) { _objTudo = false; return carregarObjetivos(); }
    error = r.error; data = r.data?.objetivos ?? null;
    if (r.data?.diario != null) { dia = r.data.diario; atualizarPillDiario(); atualizarPontoTel(); }
  } else { carregarDiario(); ({ data, error } = await sb.rpc('objetivos')); }
  if (error) return null;
  obj = data; atualizarPontoTel();
  const w = document.getElementById('wHoje'); if (w) w.outerHTML = widgetHoje();
  ligarWidgetHoje();
  return obj;
}
// 9 nov (custos): já não pede de 5 em 5 min sem razão — atualiza depois de jogares (no máximo de 3 em 3 min), ao abrir os Objetivos,
// quando um objetivo é cumprido (evento) e quando muda o dia (o baú diário)
let _objEm = Date.now(), _objDia = new Date().toDateString();
document.addEventListener('vb:acao', () => { if (J && Date.now() - _objEm > 5 * 60 * 1000) {   // 9 nov: 5 min (era 3)
   _objEm = Date.now(); carregarObjetivos(); } });
setInterval(() => { const d = new Date().toDateString(); if (J && !document.hidden && d !== _objDia) { _objDia = d; _objEm = Date.now(); carregarObjetivos(); } }, 60 * 1000);   // só compara a data (sem pedidos)

// quantos prémios estão à espera de ser recolhidos
function premiosPorRecolher() {
  if (!obj) return 0;
  const h = obj.hoje, rec = h.recolhidas || [];
  let n = h.lista.filter((t, i) => t.feito >= t.n && !rec.includes(i)).length;
  if (!h.bonus && rec.length === h.lista.length) n++;
  n += (obj.marcos || []).filter(m => m.feito && !m.recolhido).length;
  n += (obj.conquistas || []).filter(c => c.tem && !c.recolhida).length;
  if (dia) n += (dia.bau ? 1 : 0) + (dia.roda ? 1 : 0);
  return n;
}

function widgetHoje() {
  if (!obj) return '<div id="wHoje"></div>';
  const h = obj.hoje, feitas = h.lista.filter(t => t.feito >= t.n).length, n = premiosPorRecolher();
  return `<button id="wHoje" class="widget hoje" data-app="objetivos">
    <div class="wl" style="margin:0"><span>⭐ Hoje · ${feitas}/${h.lista.length}</span><span>${n ? `🎁 ${n} por recolher` : h.bonus ? '🌟 Dia completo!' : ''}</span></div>
    ${h.lista.map(t => `<div class="tarefa ${t.feito >= t.n ? 'ok' : ''}"><span>${t.feito >= t.n ? '✅' : t.e}</span><span>${esc(t.t)}</span>${t.n > 1 ? `<small>${Math.min(t.feito, t.n)}/${t.n}</small>` : ''}</div>`).join('')}
    ${obj.ambicao ? '' : '<div class="tarefa"><span>✨</span><span><b>Escolhe a tua ambição de vida</b></span></div>'}
  </button>`;
}
function ligarWidgetHoje() { const w = document.getElementById('wHoje'); if (w && w.dataset.app) w.onclick = () => abrirTelemovel('objetivos'); }

/* ---------- ⭐ app Objetivos ---------- */
async function renderObjetivos(body) {
  if (typeof ui2 === 'function' && ui2()) { objCasa = !window._objDireto; window._objDireto = false; }   // 8 nov: redesenho (teste)
  if (!obj) await carregarObjetivos(); else carregarObjetivos().then(() => { if (telSub === 'objetivos' && body.isConnected) desenharObjetivos(body); });
  if (!obj) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  desenharObjetivos(body);
}
function desenharObjetivos(body) {
  const contar = a => a === 'diario' ? (dia ? (dia.bau ? 1 : 0) + (dia.roda ? 1 : 0) : 0) : a === 'hoje' ? obj.hoje.lista.filter((t, i) => t.feito >= t.n && !obj.hoje.recolhidas.includes(i)).length + (!obj.hoje.bonus && obj.hoje.recolhidas.length === obj.hoje.lista.length ? 1 : 0)
    : a === 'ambicao' ? (obj.marcos || []).filter(m => m.feito && !m.recolhido).length : (obj.conquistas || []).filter(c => c.tem && !c.recolhida).length;
  if (typeof ui2 === 'function' && ui2() && objCasa) return ui2Objetivos(body, contar);   // 8 nov: redesenho (teste)
  const abas = [['diario', '🔥 Diário'], ['hoje', '⭐ Hoje'], ['ambicao', '✨ Ambição'], ['conquistas', '🏆 Conquistas']];
  let h = `<div class="abas">${abas.map(([k, n]) => `<button class="${objAba === k ? 'on' : ''}" data-aba="${k}">${n}${contar(k) ? ` <i class="badge" style="position:static;display:inline-block">${contar(k)}</i>` : ''}</button>`).join('')}</div>`;

  if (objAba === 'diario') h += diarioHTML();

  if (objAba === 'hoje') {
    const t = obj.hoje, rec = t.recolhidas || [], todas = rec.length === t.lista.length;
    h += `<p class="m">Três tarefas novas todos os dias. Cada uma dá kumbu e bom humor; as três juntas dão um bónus.</p><div class="list">
      ${t.lista.map((x, i) => { const ok = x.feito >= x.n, r = rec.includes(i); return `<div class="row ${r ? 'mine' : ''}"><span class="e">${ok ? '✅' : x.e}</span><div class="t"><b>${esc(x.t)}</b><small>${r ? 'Prémio recolhido' : ok ? 'Feito! Recolhe o prémio' : x.n > 1 ? `${x.feito}/${x.n}` : 'Por fazer'}</small></div>${ok && !r ? `<button class="btn sm" data-rec="tarefa" data-i="${i}">🎁 Recolher</button>` : ''}</div>`; }).join('')}
      <div class="row ${t.bonus ? 'mine' : todas ? '' : 'lock'}"><span class="e">🌟</span><div class="t"><b>Bónus do dia</b><small>${t.bonus ? 'Recolhido. Volta amanhã!' : 'Faz as três: 5.000 Kz e +1 reputação'}</small></div>${todas && !t.bonus ? '<button class="btn sm" data-rec="bonus">🎁 Recolher</button>' : ''}</div>
    </div>`;
  }

  if (objAba === 'ambicao') {
    const a = (obj.ambicoes || []).find(x => x.id === obj.ambicao);
    if (!a || objAba === 'escolher') {
      h += escolherAmbicaoHTML();
    } else {
      const marcos = obj.marcos || [], feitos = marcos.filter(m => m.feito).length;
      h += `<div class="rel" style="margin-top:0;text-align:center"><div style="font-size:44px">${a.e}</div><h3 style="margin:2px 0">${esc(a.nome)}</h3><p class="m" style="margin:0">${esc(a.descricao)}</p>
          <div class="meter" style="margin-top:12px"><u style="left:0;width:${feitos / 4 * 100}%;background:var(--gold)"></u></div><small class="m">${feitos} de 4 marcos</small></div>
        <div class="list" style="margin-top:10px">${marcos.map(m => `<div class="row ${m.recolhido ? 'mine' : m.feito ? '' : 'lock'}"><span class="e">${m.recolhido ? '✅' : m.feito ? '🎁' : ['①', '②', '③', '④'][m.i - 1]}</span><div class="t"><b>${esc(m.texto)}</b><small>${m.recolhido ? 'Cumprido' : 'Prémio: ' + fmtKz(m.premio)}</small></div>${m.feito && !m.recolhido ? `<button class="btn sm" data-rec="marco" data-i="${m.i}">Recolher</button>` : ''}</div>`).join('')}</div>
        <button class="btn ghost full" id="bMudarAmb" style="margin-top:12px">Mudar de ambição</button>`;
    }
  }

  if (objAba === 'escolher') h += escolherAmbicaoHTML();

  if (objAba === 'conquistas') {
    const cs = obj.conquistas || [], tem = cs.filter(c => c.tem).length;
    h += `<p class="m">${tem} de ${cs.length} conquistas.</p><div class="conq">${cs.map(c => `<div class="cq ${c.tem ? 'tem' : ''}"><div class="ce">${c.tem ? c.e : '🔒'}</div><b>${esc(c.nome)}</b><small>${esc(c.descricao)}</small>${!c.tem && c.alvo > 1 ? `<div class="meter" style="margin:4px 0 2px"><u style="left:0;width:${Math.min(100, Math.round(c.atual / c.alvo * 100))}%;background:var(--gold)"></u></div><small data-sem-traducao>${c.alvo >= 1000 ? fmtKz(c.atual).replace(' Kz', '') : c.atual} / ${c.alvo >= 1000 ? fmtKz(c.alvo).replace(' Kz', '') : c.alvo}</small>` : ''}${c.tem && !c.recolhida ? `<button class="btn sm" data-rec="conquista" data-id="${c.id}">🎁 ${fmtKz(c.premio)}</button>` : c.tem ? '<small style="color:var(--green)">✓</small>' : c.premio ? `<small>🎁 ${fmtKz(c.premio)}</small>` : ''}</div>`).join('')}</div>`;
  }

  body.innerHTML = h;
  if (typeof ui2ObjVoltar === 'function') ui2ObjVoltar(body);   // 8 nov: redesenho (teste)
  if (objAba === 'diario') ligarDiario(body);
  body.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { objAba = b.dataset.aba; desenharObjetivos(body); });
  body.querySelector('#bMudarAmb')?.addEventListener('click', () => { objAba = 'escolher'; desenharObjetivos(body); });
  body.querySelectorAll('[data-amb]').forEach(b => b.onclick = async () => {
    if (obj.ambicao && !await perguntar('Mudar de ambição? Os prémios já recolhidos ficam contigo.')) return;
    b.disabled = true;
    if (await acao('escolher_ambicao', { p_id: b.dataset.amb })) { objAba = 'ambicao'; await carregarObjetivos(); desenharObjetivos(body); }
    else b.disabled = false;
  });
  body.querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const r = await acao('recolher', { p_tipo: b.dataset.rec, p_i: b.dataset.i != null ? +b.dataset.i : null, p_id: b.dataset.id || null });
    if (r) { festejar(b); await carregarObjetivos(); desenharObjetivos(body); } else b.disabled = false;
  });
}
function escolherAmbicaoHTML() {
  return `<p class="m">Qual é o teu sonho? Cada ambição tem 4 marcos com prémios cada vez maiores. Podes mudar quando quiseres.</p>
    <div class="list">${(obj.ambicoes || []).map(a => `<div class="row ${a.id === obj.ambicao ? 'mine' : ''}"><span class="e">${a.e}</span><div class="t"><b>${esc(a.nome)}</b><small>${esc(a.descricao)}</small></div>${a.id === obj.ambicao ? '<span class="price">Atual</span>' : `<button class="btn sm" data-amb="${a.id}">Escolher</button>`}</div>`).join('')}</div>`;
}
// pequena chuva de estrelas ao recolher um prémio
function festejar(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span'); s.className = 'estrela'; s.textContent = ['⭐', '✨', '💰', '🎉'][i % 4];
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
    s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); s.style.setProperty('--dy', (-60 - Math.random() * 120) + 'px');
    document.body.appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
