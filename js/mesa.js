/* ============================================================
   Vida na Banda — 🎲 JOGOS DE MESA (0k-D, dono 27 out)
   Nos bares, cafés e cantinas: Damas e Ludo contra o computador.
   (Contra outros jogadores e apostas com Kumbu grátis vêm depois, com o LL6.)
   Ganhar dá um prémio pequeno no servidor (jogo_mesa_resultado, com teto diário).
   ============================================================ */

/* ---------- Damas (8×8, peças comem para trás, captura obrigatória, damas andam 1 casa) ---------- */
function damasInicio() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 1) {
    if (y < 3) b[y][x] = { c: 'p', d: false };      // computador (pretas, em cima)
    if (y > 4) b[y][x] = { c: 'b', d: false };      // tu (brancas, em baixo)
  }
  return b;
}
const dentroTab = (x, y) => x >= 0 && y >= 0 && x < 8 && y < 8;
function damasCapturasDe(b, x, y) {
  const p = b[y][x]; if (!p) return [];
  const out = [];
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const mx = x + dx, my = y + dy, tx = x + 2 * dx, ty = y + 2 * dy;
    if (dentroTab(tx, ty) && b[my][mx] && b[my][mx].c !== p.c && !b[ty][tx]) out.push({ de: [x, y], para: [tx, ty], come: [mx, my] });
  }
  return out;
}
function damasPassosDe(b, x, y) {
  const p = b[y][x]; if (!p) return [];
  const dirs = p.d ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : p.c === 'b' ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
  return dirs.map(([dx, dy]) => [x + dx, y + dy]).filter(([tx, ty]) => dentroTab(tx, ty) && !b[ty][tx]).map(para => ({ de: [x, y], para }));
}
function damasJogadas(b, cor, so = null) {
  const caps = [], passos = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (!b[y][x] || b[y][x].c !== cor) continue;
    if (so && (so[0] !== x || so[1] !== y)) continue;
    caps.push(...damasCapturasDe(b, x, y)); passos.push(...damasPassosDe(b, x, y));
  }
  return caps.length ? caps : so ? [] : passos;   // captura obrigatória
}
function damasAplicar(b, j) {
  const [x, y] = j.de, [tx, ty] = j.para, p = b[y][x];
  b[ty][tx] = p; b[y][x] = null;
  if (j.come) b[j.come[1]][j.come[0]] = null;
  let promoveu = false;
  if (!p.d && ((p.c === 'b' && ty === 0) || (p.c === 'p' && ty === 7))) { p.d = true; promoveu = true; }
  return promoveu;
}
function damasIA(b) {
  const js = damasJogadas(b, 'p'); if (!js.length) return null;
  const nota = j => {
    const c = b.map(l => l.map(p => p && { ...p }));
    let n = j.come ? 10 : 0; if (damasAplicar(c, j)) n += 6;
    // não deixar a peça onde pode ser comida
    const [tx, ty] = j.para;
    if (damasJogadas(c, 'b').some(r => r.come && r.come[0] === tx && r.come[1] === ty)) n -= 8;
    return n + Math.random() * 2;
  };
  return js.map(j => [nota(j), j]).sort((a, z) => z[0] - a[0])[0][1];
}
function jogoDamas() {
  return new Promise(res => {
    const b = damasInicio();
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>⚫ ${esc(tr('Damas'))} <small class="mj-mus">${esc(tr('contra o kota do bar'))}</small></h3>
      <p class="m">${esc(tr('Tu és as brancas. Toca numa peça e depois para onde vai. Comer é obrigatório; quem chega ao fundo vira dama.'))}</p>
      <div class="mj-damas" data-sem-traducao></div>
      <div class="mj-info"><span class="mj-tent"></span><span class="mj-placar" data-sem-traducao></span></div>`);
    m.querySelector('.mj').classList.add('largo');
    const tab = m.querySelector('.mj-damas'), info = m.querySelector('.mj-tent'), placar = m.querySelector('.mj-placar');
    let sel = null, obrigada = null, vez = 'b', fim = false;
    const conta = c => b.flat().filter(p => p && p.c === c).length;
    const desenhar = () => {
      const js = vez === 'b' ? damasJogadas(b, 'b', obrigada) : [];
      const alvos = sel ? js.filter(j => j.de[0] === sel[0] && j.de[1] === sel[1]) : [];
      const podem = new Set(js.map(j => j.de.join(',')));
      tab.innerHTML = b.map((l, y) => l.map((p, x) => {
        const esc_ = (x + y) % 2 === 1, alvo = alvos.find(j => j.para[0] === x && j.para[1] === y);
        return `<button class="cas ${esc_ ? 'esc' : 'cla'} ${sel && sel[0] === x && sel[1] === y ? 'sel' : ''} ${alvo ? 'alvo' : ''} ${p && podem.has(x + ',' + y) ? 'pode' : ''}" data-x="${x}" data-y="${y}">${p ? `<i class="pc ${p.c}${p.d ? ' dama' : ''}"></i>` : ''}</button>`;
      }).join('')).join('');
      placar.textContent = `⚪ ${conta('b')} · ⚫ ${conta('p')}`;
      tab.querySelectorAll('.cas').forEach(c => c.onclick = () => tocar(+c.dataset.x, +c.dataset.y));
    };
    const acabar = v => { if (fim) return; fim = true; desenhar(); setTimeout(() => mjFechar(m), 1800); res(v); };
    const verFim = () => {
      if (!conta('p') || !damasJogadas(b, 'p').length) { info.textContent = tr('Ganhaste! 🎉'); acabar(true); return true; }
      if (!conta('b') || !damasJogadas(b, 'b').length) { info.textContent = tr('O kota ganhou desta vez.'); acabar(false); return true; }
      return false;
    };
    const vezIA = () => {
      vez = 'p'; info.textContent = tr('O kota está a pensar…'); desenhar();
      let so = null;
      const passo = () => {
        if (fim) return;
        const js = so ? damasJogadas(b, 'p', so) : null;
        const j = so ? (js.length ? js.sort((a, z) => (z.come ? 1 : 0) - (a.come ? 1 : 0))[0] : null) : damasIA(b);
        if (!j) { vez = 'b'; info.textContent = tr('A tua vez.'); desenhar(); verFim(); return; }
        const prom = damasAplicar(b, j); desenhar();
        if (j.come && !prom && damasCapturasDe(b, j.para[0], j.para[1]).length) { so = j.para; setTimeout(passo, 450); return; }
        vez = 'b'; obrigada = null; info.textContent = tr('A tua vez.'); desenhar(); verFim();
      };
      setTimeout(passo, 650);
    };
    const tocar = (x, y) => {
      if (fim || vez !== 'b') return;
      const js = damasJogadas(b, 'b', obrigada);
      const j = sel && js.find(j => j.de[0] === sel[0] && j.de[1] === sel[1] && j.para[0] === x && j.para[1] === y);
      if (j) {
        const prom = damasAplicar(b, j); sel = null;
        if (j.come && !prom && damasCapturasDe(b, x, y).length) { obrigada = [x, y]; sel = [x, y]; info.textContent = tr('Continua a comer!'); desenhar(); return; }
        obrigada = null; desenhar(); if (!verFim()) vezIA(); return;
      }
      if (b[y][x] && b[y][x].c === 'b' && js.some(j => j.de[0] === x && j.de[1] === y)) { sel = [x, y]; desenhar(); }
      else if (b[y][x] && b[y][x].c === 'b' && js.some(j => j.come)) { info.textContent = tr('Tens de comer!'); }
    };
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    window.__damas = { b, jogadas: () => damasJogadas(b, 'b', obrigada), tocar };   // para os testes
    info.textContent = tr('A tua vez.'); desenhar();
  });
}

/* ---------- Ludo rápido (4 cores, 2 peças cada; tu és o vermelho) ---------- */
// caminho de 52 casas numa grelha 15×15 (começa na saída do vermelho) e as colunas de casa
const LUDO_CAMINHO = (() => {
  const c = [];
  const seg = (x0, y0, dx, dy, n) => { for (let i = 0; i < n; i++) c.push([x0 + dx * i, y0 + dy * i]); };
  seg(1, 6, 1, 0, 5); seg(6, 5, 0, -1, 6); c.push([7, 0], [8, 0]);
  seg(8, 1, 0, 1, 5); seg(9, 6, 1, 0, 6); c.push([14, 7], [14, 8]);
  seg(13, 8, -1, 0, 5); seg(8, 9, 0, 1, 6); c.push([7, 14], [6, 14]);
  seg(6, 13, 0, -1, 5); seg(5, 8, -1, 0, 6); c.push([0, 7], [0, 6]);
  return c;   // 52 casas; vermelho começa em 0, verde 13, amarelo 26, azul 39
})();
const LUDO_CORES = [
  { id: 'r', nome: 'Vermelho', cor: '#e0313f', ini: 0, casa: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], base: [[2, 2], [3, 3]] },
  { id: 'g', nome: 'Verde', cor: '#2f8f5b', ini: 13, casa: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], base: [[11, 2], [12, 3]] },
  { id: 'y', nome: 'Amarelo', cor: '#f5b81c', ini: 26, casa: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], base: [[12, 11], [11, 12]] },
  { id: 'b', nome: 'Azul', cor: '#2c6fb0', ini: 39, casa: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], base: [[3, 11], [2, 12]] },
];
const LUDO_SEGURAS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
// posição de uma peça: -1 = base; 0..50 = no caminho (relativo à saída da cor); 51..56 = coluna de casa; 56 = chegou
function ludoXY(cor, pos, k) {
  const C = LUDO_CORES[cor];
  if (pos < 0) return C.base[k];
  if (pos <= 50) return LUDO_CAMINHO[(C.ini + pos) % 52];
  return C.casa[Math.min(5, pos - 51)];
}
function ludoPode(pecas, cor, k, d) {
  const p = pecas[cor][k];
  if (p === 56) return false;
  if (p < 0) return d === 6;
  return p + d <= 56;
}
function jogoLudo() {
  return new Promise(res => {
    const pecas = LUDO_CORES.map(() => [-1, -1]);
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>🎲 ${esc(tr('Ludo rápido'))} <small class="mj-mus">${esc(tr('2 peças cada · tu és o vermelho'))}</small></h3>
      <div class="mj-ludo" data-sem-traducao><canvas width="450" height="450"></canvas></div>
      <div class="mj-info"><span class="mj-tent"></span><button class="btn sm mj-dado">🎲 ${esc(tr('Lançar'))}</button></div>`);
    m.querySelector('.mj').classList.add('largo');
    const cv = m.querySelector('canvas'), g = cv.getContext('2d'), info = m.querySelector('.mj-tent'), btDado = m.querySelector('.mj-dado');
    const T = 30;
    let vez = 0, dado = 0, fim = false, escolher = false;
    const desenhar = () => {
      g.fillStyle = '#f4ead6'; g.fillRect(0, 0, 450, 450);
      // bases
      LUDO_CORES.forEach((C, i) => { const [bx, by] = [[0, 0], [9, 0], [9, 9], [0, 9]][i]; g.fillStyle = C.cor; g.fillRect(bx * T, by * T, 6 * T, 6 * T); g.fillStyle = '#fff8'; g.fillRect(bx * T + T, by * T + T, 4 * T, 4 * T); });
      // caminho
      LUDO_CAMINHO.forEach(([x, y], i) => { g.fillStyle = LUDO_SEGURAS.has(i) ? '#e9dcc0' : '#fff'; g.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); if (LUDO_SEGURAS.has(i)) { g.fillStyle = '#c9a24a'; g.font = '14px sans-serif'; g.textAlign = 'center'; g.fillText('★', x * T + T / 2, y * T + T / 2 + 5); } });
      LUDO_CORES.forEach(C => { C.casa.forEach(([x, y]) => { g.fillStyle = C.cor + 'aa'; g.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); }); const [sx, sy] = LUDO_CAMINHO[C.ini]; g.fillStyle = C.cor; g.fillRect(sx * T + 1, sy * T + 1, T - 2, T - 2); });
      // centro
      g.fillStyle = '#141012'; g.fillRect(6 * T, 6 * T, 3 * T, 3 * T); g.fillStyle = '#FFCB00'; g.font = '700 16px sans-serif'; g.textAlign = 'center'; g.fillText('VnB', 7.5 * T, 7.5 * T + 6);
      // peças
      pecas.forEach((ps, c) => ps.forEach((p, k) => {
        if (p === 56) return;
        let [x, y] = ludoXY(c, p, k); const off = ps.filter((q, kk) => kk < k && q === p && p >= 0).length * 6;
        const cx = x * T + T / 2 + off, cy = y * T + T / 2 - off;
        g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fillStyle = LUDO_CORES[c].cor; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
        if (c === 0 && escolher && ludoPode(pecas, 0, k, dado)) { g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.strokeStyle = '#FFCB00'; g.lineWidth = 3; g.stroke(); }
      }));
      // chegadas
      const cheg = pecas.map(ps => ps.filter(p => p === 56).length);
      info.textContent = `${[tr('Vermelho'), tr('Verde'), tr('Amarelo'), tr('Azul')][vez]}${dado ? ' · 🎲 ' + dado : ''} · 🏁 ${cheg.join('/')}`;
    };
    const acabar = v => { if (fim) return; fim = true; btDado.disabled = true; setTimeout(() => mjFechar(m), 1800); res(v); };
    const mover = (c, k) => {
      const p = pecas[c][k];
      pecas[c][k] = p < 0 ? 0 : p + dado;
      const np = pecas[c][k];
      // comer: na mesma casa do caminho (não segura) volta à base
      if (np >= 0 && np <= 50) {
        const abs = (LUDO_CORES[c].ini + np) % 52;
        if (!LUDO_SEGURAS.has(abs)) pecas.forEach((ps, o) => { if (o === c) return; ps.forEach((q, kk) => { if (q >= 0 && q <= 50 && (LUDO_CORES[o].ini + q) % 52 === abs) ps[kk] = -1; }); });
      }
      if (pecas[c].every(q => q === 56)) { desenhar(); info.textContent = c === 0 ? tr('Ganhaste! 🎉') : `${[tr('Vermelho'), tr('Verde'), tr('Amarelo'), tr('Azul')][c]} ${tr('ganhou.')}`; acabar(c === 0); return true; }
      return false;
    };
    const proxima = () => { if (dado !== 6) vez = (vez + 1) % 4; dado = 0; desenhar(); if (vez === 0) { btDado.disabled = false; } else setTimeout(jogaIA, 520); };
    const jogaIA = () => {
      if (fim) return;
      dado = 1 + Math.floor(Math.random() * 6); desenhar();
      const ks = [0, 1].filter(k => ludoPode(pecas, vez, k, dado));
      if (!ks.length) { setTimeout(proxima, 450); return; }
      // preferir: comer, entrar em casa, sair da base, a mais avançada
      const nota = k => { const p = pecas[vez][k], np = p < 0 ? 0 : p + dado; let n = np;
        if (np <= 50) { const abs = (LUDO_CORES[vez].ini + np) % 52; if (!LUDO_SEGURAS.has(abs) && pecas.some((ps, o) => o !== vez && ps.some(q => q >= 0 && q <= 50 && (LUDO_CORES[o].ini + q) % 52 === abs))) n += 100; }
        if (np === 56) n += 80; if (p < 0) n += 40; return n; };
      const k = ks.sort((a, z) => nota(z) - nota(a))[0];
      setTimeout(() => { if (!mover(vez, k)) setTimeout(proxima, 350); }, 420);
    };
    btDado.addEventListener('click', () => {
      if (fim || vez !== 0 || escolher) return;
      dado = window.__ludoDado ? window.__ludoDado() : 1 + Math.floor(Math.random() * 6); btDado.disabled = true;
      const ks = [0, 1].filter(k => ludoPode(pecas, 0, k, dado));
      if (!ks.length) { desenhar(); setTimeout(proxima, 700); return; }
      if (ks.length === 1) { desenhar(); setTimeout(() => { if (!mover(0, ks[0])) proxima(); }, 400); return; }
      escolher = true; info.textContent += ' · ' + tr('Toca na peça'); desenhar();
    });
    cv.addEventListener('click', e => {
      if (!escolher || fim) return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 450, y = (e.clientY - r.top) / r.height * 450;
      const k = [0, 1].filter(k => ludoPode(pecas, 0, k, dado)).map(k => { const [px, py] = ludoXY(0, pecas[0][k], k); return [Math.hypot(px * T + T / 2 - x, py * T + T / 2 - y), k]; }).sort((a, z) => a[0] - z[0])[0];
      if (!k || k[0] > 40) return;
      escolher = false; if (!mover(0, k[1])) proxima();
    });
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    window.__ludo = { pecas, mover: k => { escolher = false; if (!mover(0, k)) proxima(); }, get vez() { return vez; }, get dado() { return dado; } };   // para os testes
    desenhar();
  });
}

/* ---------- na interface: secção «Jogos de mesa» nos bares, cafés e cantinas ---------- */
function mesaHTML() {
  return `<div class="sec"><h4>🎲 ${tr('Jogos de mesa')}</h4><span>${tr('contra o computador')}</span></div><div class="list">
    <div class="row"><span class="e">⚫</span><div class="t"><b>${tr('Damas')}</b><small>${tr('Contra o kota do bar. Ganhar: +500 Kz (até 3 por dia).')}</small></div><button class="btn sm" data-mesa="damas">${tr('Jogar')}</button></div>
    <div class="row"><span class="e">🎲</span><div class="t"><b>${tr('Ludo rápido')}</b><small>${tr('Tu contra 3. Ganhar: +500 Kz (até 3 por dia).')}</small></div><button class="btn sm" data-mesa="ludo">${tr('Jogar')}</button></div>
    <div class="row"><span class="e">👥</span><div class="t"><b>${tr('Ludo com amigos')}</b><small>${tr('2 a 4 jogadores; o computador preenche se quiserem. Ganhar: +500 Kz.')}</small></div><button class="btn sm" data-ludo-amigos>${tr('Jogar')}</button></div></div>`;
}
function ligarMesa(el) {
  if (typeof ludoBotaoMesa === 'function') ludoBotaoMesa(el);
  el.querySelectorAll('[data-mesa]').forEach(b => b.onclick = async () => {
    const jogo = b.dataset.mesa;
    const { data: id, error } = await sb.rpc('jogo_mesa_comecar', { p_jogo: jogo });
    if (error) return toast(limparErro(error.message), 'mau');
    const ganhou = jogo === 'damas' ? await jogoDamas() : await jogoLudo();
    await acao('jogo_mesa_resultado', { p_id: id, p_ganhou: !!ganhou }, { silencio: ganhou === undefined });
  });
}
