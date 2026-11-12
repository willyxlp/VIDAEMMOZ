/* ============================================================
   Vida na Banda — 🎲 LUDO COM AMIGOS (0cq, Cinnss via dono, 3 nov)
   2, 3 ou 4 jogadores; o computador preenche os lugares vazios se quiserem.
   Tudo no servidor (dado incluído): ludo_criar / ludo_convidar / ludo_comecar / ludo_estado / ludo_lancar / ludo_mover / ludo_sair.
   O ecrã pergunta o estado de 1,5 em 1,5 s enquanto está aberto. O desenho do tabuleiro usa LUDO_CAMINHO / LUDO_CORES (mesa.js).
   ============================================================ */
let LUDO_ABERTO = null;   // { m, id, timer, e }

const ludoErro = error => { toast(limparErro(error.message), 'mau'); return null; };
async function ludoRpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  return error ? ludoErro(error) : data;
}

// 1) escolher quantos jogadores e se o computador preenche
function ludoNovaMesa() {
  const m = mjModal(`
    <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
    <h3>🎲 ${esc(tr('Ludo com amigos'))}</h3>
    <p class="ludo-p">${esc(tr('Quantos jogadores?'))}</p>
    <div class="ludo-n">${[2, 3, 4].map(n => `<button class="btn ghost" data-n="${n}">${n}</button>`).join('')}</div>
    <label class="ludo-npc"><input type="checkbox" checked> <span>${esc(tr('O computador preenche os lugares vazios'))}</span></label>
    <p class="ludo-p sm">${esc(tr('4 peças cada. Sai com 6; o 6 dá outra vez. Quem ganha leva +500 Kz (até 3 vitórias de mesa por dia).'))}</p>
    <button class="btn ludo-criar">${esc(tr('Criar a mesa'))}</button>`);
  let n = 4;
  const marcar = () => m.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('ghost', +b.dataset.n !== n));
  m.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = +b.dataset.n; marcar(); });
  marcar();
  m.querySelector('.mj-x').onclick = () => mjFechar(m);
  m.querySelector('.ludo-criar').onclick = async () => {
    const r = await ludoRpc('ludo_criar', { p_lugares: n, p_npc: m.querySelector('.ludo-npc input').checked });
    if (!r) return;
    mjFechar(m); ludoAbrir(r.id);
  };
}

// convidar a partir do cartão do jogador (cria a mesa de 4 com computador se ainda não tiveres)
async function ludoConvidar(alvo) {
  const r = await ludoRpc('ludo_convidar', { p_alvo: alvo });
  if (!r) return false;
  toast(r.msg, 'bom');
  ludoAbrir(r.id);
  return true;
}

// 2) a mesa: sala de espera → tabuleiro → fim
function ludoAbrir(id) {
  if (LUDO_ABERTO) ludoFechar();
  const m = mjModal(`
    <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
    <h3>🎲 ${esc(tr('Ludo com amigos'))} <small class="mj-mus ludo-sub"></small></h3>
    <div class="ludo-corpo"></div>`);
  m.querySelector('.mj').classList.add('largo');
  LUDO_ABERTO = { m, id, timer: null, e: null, versao: -1, fase: '' };
  m.querySelector('.mj-x').onclick = () => ludoFechar();
  ludoAtualizar();
  LUDO_ABERTO.timer = setInterval(ludoAtualizar, 1500);
}
function ludoFechar() {
  if (!LUDO_ABERTO) return;
  clearInterval(LUDO_ABERTO.timer); mjFechar(LUDO_ABERTO.m); LUDO_ABERTO = null;
}
async function ludoAtualizar() {
  const L = LUDO_ABERTO; if (!L || L.aPedir || (document.hidden && L.versao >= 0)) return;   // separador escondido: não pergunta
  L.aPedir = true;
  const { data: e, error } = await sb.rpc('ludo_estado', { p_id: L.id });
  L.aPedir = false;
  if (LUDO_ABERTO !== L) return;
  if (error) { ludoErro(error); ludoFechar(); return; }
  ludoMostrar(e);
}
function ludoMostrar(e) {
  const L = LUDO_ABERTO; if (!L) return;
  const mudou = e.versao !== L.versao || e.estado !== L.fase;
  L.e = e; L.versao = e.versao;
  if (e.estado === 'espera') { if (mudou) ludoSala(e); }
  else { if (L.fase !== e.estado || !L.m.querySelector('canvas')) ludoTabuleiro(); ludoDesenhar(); }
  L.fase = e.estado;
}

function ludoSala(e) {
  const L = LUDO_ABERTO, corpo = L.m.querySelector('.ludo-corpo'), souDono = e.dono === e.eu;
  L.m.querySelector('.ludo-sub').textContent = `${e.na_mesa.length}/${e.lugares} · ${e.npc ? tr('o computador preenche') : tr('só pessoas')}`;
  corpo.innerHTML = `
    <div class="list">${e.na_mesa.map((p, i) => `<div class="row"><span class="e">${['🔴', '🟢', '🟡', '🔵'][i] || '⚪'}</span><div class="t"><b data-sem-traducao>${esc(p.nome)}</b>${p.id === e.dono ? `<small>${esc(tr('criou a mesa'))}</small>` : ''}</div></div>`).join('')}
      ${Array.from({ length: Math.max(0, e.lugares - e.na_mesa.length) }, () => `<div class="row"><span class="e">${e.npc ? '🤖' : '⏳'}</span><div class="t"><small>${esc(e.npc ? tr('Lugar livre (o computador joga se ninguém vier)') : tr('Lugar livre'))}</small></div></div>`).join('')}</div>
    ${souDono && e.na_mesa.length < e.lugares ? `<div class="sec"><h4>${esc(tr('Convidar'))}</h4><span>${esc(tr('amigos, família e par'))}</span></div><div class="list ludo-amigos"><div class="row"><small>…</small></div></div>` : ''}
    <div class="ludo-bots">
      ${souDono ? `<button class="btn ludo-comecar">▶️ ${esc(tr('Começar'))}</button>` : `<p class="ludo-p">${esc(tr('À espera que quem criou a mesa comece…'))}</p>`}
      <button class="btn ghost ludo-sair">${esc(souDono ? tr('Fechar a mesa') : tr('Sair da mesa'))}</button></div>`;
  corpo.querySelector('.ludo-comecar')?.addEventListener('click', async () => { if (await ludoRpc('ludo_comecar', { p_id: L.id })) ludoAtualizar(); });
  corpo.querySelector('.ludo-sair').onclick = async () => { if (await ludoRpc('ludo_sair', { p_id: L.id })) ludoFechar(); };
  const lista = corpo.querySelector('.ludo-amigos');
  if (lista) ludoRpc('ludo_amigos', {}).then(am => {
    if (!am || LUDO_ABERTO !== L) return;
    const fora = am.filter(a => !e.na_mesa.some(p => p.id === a.id));
    lista.innerHTML = fora.length ? fora.slice(0, 30).map(a => `<div class="row"><span class="e">${a.online ? '🟢' : '⚪'}</span><div class="t"><b data-sem-traducao>${esc(a.nome)}</b><small>${esc(a.online ? tr('online') : tr('offline'))}</small></div><button class="btn sm" data-conv="${esc(a.id)}">${esc(tr('Convidar'))}</button></div>`).join('')
      : `<div class="row"><small>${esc(tr('Ainda não tens amigos para convidar. Toca num jogador → Jogar juntos → Ludo.'))}</small></div>`;
    lista.querySelectorAll('[data-conv]').forEach(b => b.onclick = async () => {
      const r = await ludoRpc('ludo_convidar', { p_alvo: b.dataset.conv });
      if (r) { toast(r.msg, 'bom'); b.disabled = true; b.textContent = tr('Convidado'); }
    });
  });
}

function ludoTabuleiro() {
  const L = LUDO_ABERTO, corpo = L.m.querySelector('.ludo-corpo');
  corpo.innerHTML = `
    <div class="ludo-jog"></div>
    <div class="mj-ludo" data-sem-traducao><canvas width="450" height="450"></canvas></div>
    <div class="mj-info"><span class="mj-tent ludo-info"></span><button class="btn sm ludo-dado">🎲 ${esc(tr('Lançar'))}</button></div>
    <div class="ludo-log" data-sem-traducao></div>
    <div class="ludo-bots"><button class="btn ghost sm ludo-sair">${esc(tr('Sair da partida'))}</button></div>`;
  corpo.querySelector('.ludo-dado').onclick = async () => {
    const b = corpo.querySelector('.ludo-dado'); b.disabled = true;
    const e = await ludoRpc('ludo_lancar', { p_id: L.id });
    if (e && LUDO_ABERTO === L) ludoMostrar(e);
  };
  corpo.querySelector('.ludo-sair').onclick = async () => {
    if (L.e?.estado === 'jogo' && !(await perguntar(tr('Sair da partida? O computador fica com o teu lugar.'), tr('Sair'), tr('Ficar')))) return;
    if (L.e?.estado !== 'jogo' || await ludoRpc('ludo_sair', { p_id: L.id })) ludoFechar();
  };
  corpo.querySelector('canvas').addEventListener('click', ev => ludoTocar(ev));
}

const LUDO_T = 30;
const ludoBase = (cor, k) => { const [bx, by] = [[0, 0], [9, 0], [9, 9], [0, 9]][cor]; return [bx + 1.5 + (k % 2) * 2, by + 1.5 + Math.floor(k / 2) * 2]; };
function ludoXY4(cor, pos, k) {   // em casas (pode ser fracionário na base)
  if (pos < 0) return ludoBase(cor, k);
  if (pos <= 50) return LUDO_CAMINHO[(LUDO_CORES[cor].ini + pos) % 52];
  return LUDO_CORES[cor].casa[Math.min(5, pos - 51)];
}
function ludoMinhaVez() {
  const e = LUDO_ABERTO?.e; if (!e || e.estado !== 'jogo') return -1;
  const g = e.jogo; return g.jogadores[g.vez] === e.eu ? g.vez : -1;
}
function ludoPodeK(g, i, k) {
  const p = g.pecas[i][k], d = g.dado;
  if (d == null || p === 56) return false;
  return p < 0 ? d === 6 : p + d <= 56;
}
function ludoDesenhar() {
  const L = LUDO_ABERTO, e = L.e, g = e.jogo, cv = L.m.querySelector('canvas'); if (!cv || !g) return;
  const c2 = cv.getContext('2d'), T = LUDO_T, eu = ludoMinhaVez();
  c2.fillStyle = '#f4ead6'; c2.fillRect(0, 0, 450, 450);
  LUDO_CORES.forEach((C, i) => { const [bx, by] = [[0, 0], [9, 0], [9, 9], [0, 9]][i]; const usada = g.cores.includes(i);
    c2.fillStyle = usada ? C.cor : '#cfc6b4'; c2.fillRect(bx * T, by * T, 6 * T, 6 * T); c2.fillStyle = '#fff8'; c2.fillRect(bx * T + T / 2, by * T + T / 2, 5 * T, 5 * T); });
  LUDO_CAMINHO.forEach(([x, y], i) => { const s = LUDO_SEGURAS.has(i); c2.fillStyle = s ? '#e9dcc0' : '#fff'; c2.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
    if (s) { c2.fillStyle = '#c9a24a'; c2.font = '14px sans-serif'; c2.textAlign = 'center'; c2.fillText('★', x * T + T / 2, y * T + T / 2 + 5); } });
  LUDO_CORES.forEach(C => { C.casa.forEach(([x, y]) => { c2.fillStyle = C.cor + 'aa'; c2.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); }); const [sx, sy] = LUDO_CAMINHO[C.ini]; c2.fillStyle = C.cor; c2.fillRect(sx * T + 1, sy * T + 1, T - 2, T - 2); });
  c2.fillStyle = '#141012'; c2.fillRect(6 * T, 6 * T, 3 * T, 3 * T); c2.fillStyle = '#FFCB00'; c2.font = '700 16px sans-serif'; c2.textAlign = 'center'; c2.fillText('VnB', 7.5 * T, 7.5 * T + 6);
  // peças (as que estão na mesma casa ficam um pouco desviadas)
  const vistos = {};
  g.pecas.forEach((ps, i) => ps.forEach((p, k) => {
    if (p === 56) return;
    const cor = g.cores[i], [x, y] = ludoXY4(cor, p, k);
    const chave = x + ',' + y, off = p >= 0 ? (vistos[chave] = (vistos[chave] || 0) + 1) - 1 : 0;
    const cx = x * T + T / 2 + off * 5, cy = y * T + T / 2 - off * 5;
    c2.beginPath(); c2.arc(cx, cy, 10, 0, 7); c2.fillStyle = LUDO_CORES[cor].cor; c2.fill(); c2.lineWidth = 3; c2.strokeStyle = '#fff'; c2.stroke();
    if (i === eu && ludoPodeK(g, i, k)) { c2.beginPath(); c2.arc(cx, cy, 14, 0, 7); c2.strokeStyle = '#FFCB00'; c2.lineWidth = 3; c2.stroke(); }
  }));
  // jogadores
  L.m.querySelector('.ludo-jog').innerHTML = g.jogadores.map((uid, i) => `<span class="ludo-chip${i === g.vez && e.estado === 'jogo' ? ' on' : ''}" style="--c:${LUDO_CORES[g.cores[i]].cor}">${uid ? '' : '🤖 '}<b data-sem-traducao>${esc(g.nomes[i])}</b>${uid === e.eu ? ` <small>(${esc(tr('tu'))})</small>` : ''} · 🏁${g.pecas[i].filter(p => p === 56).length}</span>`).join('');
  L.m.querySelector('.ludo-sub').textContent = `${g.jogadores.length} ${tr('jogadores')}`;
  const info = L.m.querySelector('.ludo-info'), bt = L.m.querySelector('.ludo-dado');
  if (e.estado === 'fim') {
    const v = g.vencedor;
    info.textContent = v == null ? tr('A partida acabou.') : g.jogadores[v] === e.eu ? tr('Ganhaste! 🎉') : `🏆 ${g.nomes[v]} ${tr('ganhou.')}`;
    bt.disabled = true; bt.style.display = 'none';
    const s = L.m.querySelector('.ludo-sair'); s.textContent = tr('Fechar'); s.classList.remove('ghost');
    clearInterval(L.timer);
  } else if (eu >= 0) {
    bt.style.display = ''; bt.disabled = g.dado != null;
    info.textContent = g.dado == null ? tr('É a tua vez: lança o dado.') : `🎲 ${g.dado} · ${tr('Toca na peça')}`;
  } else {
    bt.style.display = 'none';
    info.textContent = `${tr('Vez de')} ${g.nomes[g.vez]}${g.dado != null ? ' · 🎲 ' + g.dado : ''}`;
  }
  L.m.querySelector('.ludo-log').innerHTML = (g.log || []).slice(0, 4).map(l => `<div style="--c:${LUDO_CORES[g.cores[l.i]]?.cor || '#888'}">${esc(l.txt.replace(/ · (saiu|chegou 🏁|comeu! 💥|sem jogada)/g, (x, w) => ' · ' + tr(w)))}</div>`).join('');
}
async function ludoTocar(ev) {
  const L = LUDO_ABERTO, i = ludoMinhaVez(); if (!L || i < 0 || L.aMover) return;
  const g = L.e.jogo; if (g.dado == null) return;
  const cv = ev.currentTarget, r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 450, y = (ev.clientY - r.top) / r.height * 450, T = LUDO_T;
  const k = [0, 1, 2, 3].filter(k => ludoPodeK(g, i, k)).map(k => { const [px, py] = ludoXY4(g.cores[i], g.pecas[i][k], k); return [Math.hypot(px * T + T / 2 - x, py * T + T / 2 - y), k]; }).sort((a, z) => a[0] - z[0])[0];
  if (!k || k[0] > 40) return;
  L.aMover = true;
  const e = await ludoRpc('ludo_mover', { p_id: L.id, p_peca: k[1] });
  L.aMover = false;
  if (e && LUDO_ABERTO === L) ludoMostrar(e);
}
window.__ludoAmigos = { mover: async k => { const L = LUDO_ABERTO; const e = await ludoRpc('ludo_mover', { p_id: L.id, p_peca: k }); if (e) ludoMostrar(e); }, get e() { return LUDO_ABERTO?.e; } };   // para os testes

// na secção «Jogos de mesa»: criar mesa ou voltar à partida
async function ludoBotaoMesa(el) {
  const b = el.querySelector('[data-ludo-amigos]'); if (!b) return;
  b.onclick = async () => {
    const id = await ludoRpc('ludo_minha_partida', {});
    if (id) ludoAbrir(id); else ludoNovaMesa();
  };
}
