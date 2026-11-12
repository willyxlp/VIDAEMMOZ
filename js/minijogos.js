/* ============================================================
   Vida na Banda — mini-jogos de perícias (LL13, 27 out)
   🏋️ Ginásio: segura para encher e larga no verde (3 séries).
   🏃 Correr: toca quando o marcador passa no verde (3 passadas).
   🍳 Cozinhar: os ingredientes pela ordem certa.
   Cada jogo devolve 0–3 estrelas (null = saltar, undefined = fechar sem fazer).
   O servidor (treinar2 / cozinhar2) só deixa as estrelas mexer um bocadinho.
   ============================================================ */

function mjModal(html) {
  const m = document.createElement('div');
  m.className = 'mj-fundo';
  m.innerHTML = `<div class="mj">${html}</div>`;
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('on'));
  return m;
}
function mjFechar(m) { m.classList.remove('on'); setTimeout(() => m.remove(), 220); }
const mjEstrelas = n => '<span class="mj-est">' + [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';

// ritmo: modo 'segurar' (ginásio) ou 'tocar' (correr)
function jogoRitmo(modo) {
  return new Promise(res => {
    const gin = modo === 'segurar';
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>${gin ? '🏋️ ' + esc(tr('Séries no ginásio')) : '🏃 ' + esc(tr('Corrida com ritmo'))}</h3>
      <p class="m">${esc(tr(gin ? 'Segura o botão para levantar o peso e larga quando a barra estiver no verde.' : 'Toca quando o marcador passar no verde. Mantém o ritmo!'))}</p>
      <div class="mj-pista"><div class="mj-zona"><div class="mj-perf"></div></div><div class="mj-enche"></div><div class="mj-marca"></div></div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(0)}</div>
      <button class="btn mj-acao">${esc(tr(gin ? 'Segurar' : 'Tocar'))}</button>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const zona = m.querySelector('.mj-zona'), marca = m.querySelector('.mj-marca'), enche = m.querySelector('.mj-enche');
    const bt = m.querySelector('.mj-acao'), tent = m.querySelector('.mj-tent');
    let ronda = 0, acertos = 0, z0 = 0, z1 = 0, pos = 0, t0 = performance.now(), raf = 0, segura = false, fim = false, pausa = false;
    const novaRonda = () => {
      const larg = gin ? 20 - ronda * 3 : 18 - ronda * 3;
      z0 = 30 + Math.random() * (60 - larg); z1 = z0 + larg;
      zona.style.left = z0 + '%'; zona.style.width = (z1 - z0) + '%';
      tent.textContent = `${tr('Tentativa')} ${ronda + 1}/3`;
      pos = 0; t0 = performance.now(); pausa = false;
      marca.classList.remove('bom', 'mau'); enche.style.width = '0%';
    };
    const acabar = v => { if (fim) return; fim = true; cancelAnimationFrame(raf); mjFechar(m); res(v); };
    const marcar = () => {
      if (pausa || fim) return;
      pausa = true;
      const ok = pos >= z0 && pos <= z1;
      if (ok) acertos++;
      marca.classList.add(ok ? 'bom' : 'mau');
      m.querySelector('.mj-est').outerHTML = mjEstrelas(acertos);
      if (navigator.vibrate) try { navigator.vibrate(ok ? 30 : [20, 40, 20]); } catch { }
      ronda++;
      setTimeout(() => {
        if (ronda >= 3) {
          bt.disabled = true;
          tent.textContent = [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][acertos];
          setTimeout(() => acabar(acertos), 900);
        } else novaRonda();
      }, 650);
    };
    const quadro = now => {
      if (fim) return;
      const t = (now - t0) / 1000, vel = 1 + ronda * 0.35;
      if (!pausa) {
        if (gin) {
          if (segura) { pos = Math.min(100, pos + (40 + pos * 1.6) * vel / 60); if (pos >= 100) { pos = 100; segura = false; marcar(); } }
          enche.style.width = pos + '%';
        } else pos = 50 - 50 * Math.cos(t * 2.6 * vel);
        marca.style.left = pos + '%';
      }
      raf = requestAnimationFrame(quadro);
    };
    if (gin) {
      bt.addEventListener('pointerdown', e => { e.preventDefault(); if (!pausa) segura = true; });
      const largar = () => { if (segura) { segura = false; marcar(); } };
      bt.addEventListener('pointerup', largar); bt.addEventListener('pointerleave', largar); bt.addEventListener('pointercancel', largar);
    } else bt.addEventListener('click', marcar);
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    novaRonda(); raf = requestAnimationFrame(quadro);
  });
}

// cozinha: os passos de cada prato, pela ordem certa
function passosPrato(f) {
  const n = (f?.id || '') + ' ' + (f?.nome || '').toLowerCase();
  if (/funge|pir[aã]o/.test(n)) return ['Ferver a água', 'Juntar a fuba', 'Mexer com o pau', 'Servir quentinho'];
  if (/muamba|moamba/.test(n)) return ['Temperar a carne', 'Óleo de palma na panela', 'Juntar quiabos e abóbora', 'Deixar apurar'];
  if (/calulu/.test(n)) return ['Demolhar o peixe seco', 'Refogar cebola e tomate', 'Juntar a gimboa', 'Cozinhar devagar'];
  if (/arroz/.test(n)) return ['Fazer o refogado', 'Juntar o arroz', 'Pôr a água', 'Tapar e esperar'];
  if (/grelhad|churrasco|assad/.test(n)) return ['Temperar com limão e alho', 'Acender o carvão', 'Grelhar', 'Virar na hora certa'];
  if (/feij/.test(n)) return ['Demolhar o feijão', 'Cozer o feijão', 'Juntar o óleo de palma', 'Temperar e servir'];
  if (/caldeirada|sopa|dobrada/.test(n)) return ['Cortar os legumes', 'Refogar', 'Juntar o caldo', 'Ferver devagar'];
  return ['Lavar os ingredientes', 'Cortar tudo', 'Refogar', 'Cozinhar e servir'];
}
function jogoCozinha(f) {
  return new Promise(res => {
    const passos = passosPrato(f).map(p => tr(p));
    const baralho = passos.map((p, i) => ({ p, i })).sort(() => Math.random() - 0.5);
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>🍳 ${esc(f?.nome ? tr(f.nome) : tr('Cozinhar em casa'))}</h3>
      <p class="m mj-dica">${esc(tr('Memoriza a receita…'))}</p>
      <ol class="mj-receita">${passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      <div class="mj-passos" hidden>${baralho.map(b => `<button class="btn ghost mj-passo" data-i="${b.i}">${esc(b.p)}</button>`).join('')}</div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(3)}</div>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const rec = m.querySelector('.mj-receita'), box = m.querySelector('.mj-passos'), dica = m.querySelector('.mj-dica'), tent = m.querySelector('.mj-tent');
    let prox = 0, erros = 0, fim = false;
    const acabar = v => { if (fim) return; fim = true; clearTimeout(tm); mjFechar(m); res(v); };
    const tm = setTimeout(() => {
      rec.hidden = true; box.hidden = false; dica.textContent = tr('Agora pela ordem certa!');
      tent.textContent = `${tr('Passo')} 1/${passos.length}`;
    }, 2600);
    box.querySelectorAll('.mj-passo').forEach(b => b.addEventListener('click', () => {
      if (fim) return;
      if (+b.dataset.i === prox) {
        b.disabled = true; b.classList.add('feito'); prox++;
        if (prox >= passos.length) {
          const n = Math.max(0, 3 - erros);
          tent.textContent = [tr('Queimou um bocadinho…'), tr('Comível.'), tr('Ficou bom!'), tr('Ficou divinal!')][n];
          setTimeout(() => acabar(n), 900);
        } else tent.textContent = `${tr('Passo')} ${prox + 1}/${passos.length}`;
      } else {
        erros++; b.classList.remove('treme'); void b.offsetWidth; b.classList.add('treme');
        m.querySelector('.mj-est').outerHTML = mjEstrelas(Math.max(0, 3 - erros));
      }
    }));
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
  });
}

/* ---------- 🏃 Passadeira: jogo de ritmo tipo Piano Tiles (0k-G, dono 27 out) ----------
   Quatro faixas na passadeira; as peças descem até à linha e tocas na faixa a tempo — cada toque toca a nota da música.
   Começa devagar e acelera; mais à frente vêm toques duplos e seguidos. 3 falhas e acaba.
   Músicas originais (melodias nossas, ao estilo kizomba / semba / kuduro). Precisão → estrelas. */
const MUSICAS_PASSADEIRA = [
  { nome: 'Kizomba da Marginal', bpm: [84, 132], notas: 'E4 G4 A4 G4 E4 D4 E4 . G4 A4 C5 A4 G4 E4 G4 . E4 G4 A4 C5 D5 C5 A4 G4 A4 G4 E4 D4 C4 D4 E4 . E4+G4 A4 G4 E4 D4 E4 G4 A4 C5+E5 D5 C5 A4 G4 E4 D4 E4+A4' },
  { nome: 'Semba do Kinaxixi', bpm: [96, 150], notas: 'C4 E4 G4 E4 F4 A4 G4 . C5 B4 A4 G4 F4 E4 D4 . E4 G4 C5 G4 A4 F4 G4 E4 D4 F4 E4 C4 D4 . G4+B4 C5 B4 A4 G4 E4 F4 G4 A4 G4 E4 C4 E4+G4 D4 C4+E4' },
  { nome: 'Kuduro da Ilha', bpm: [104, 168], notas: 'A4 A4 C5 A4 G4 E4 G4 A4 . A4 C5 D5 C5 A4 G4 A4 . E5 D5 C5 A4 C5 A4 G4 E4 G4 A4 C5 A4 . A4+C5 E5 D5 C5 A4 G4+B4 A4 C5 D5 E5 D5 C5 A4 G4 A4+E5' },
];
function freqNota(n) { const m = n.match(/^([A-G])(#?)(\d)$/); if (!m) return 440; const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12; return 440 * Math.pow(2, i / 12); }
function jogoPassadeira() {
  return new Promise(res => {
    const mus = MUSICAS_PASSADEIRA[Math.floor(Math.random() * MUSICAS_PASSADEIRA.length)];
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>🏃 ${esc(tr('Passadeira'))} <small class="mj-mus">♪ ${esc(mus.nome)}</small></h3>
      <p class="m">${esc(tr('Toca na faixa quando a peça chegar à linha. Começa devagar… depois acelera!'))}</p>
      <div class="mj-tiles"><canvas></canvas><div class="mj-come">${esc(tr('Toca para começar'))}</div></div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(0)}</div>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const box = m.querySelector('.mj-tiles'), cv = box.querySelector('canvas'), g = cv.getContext('2d'), info = m.querySelector('.mj-tent'), come = m.querySelector('.mj-come');
    const W = Math.min(340, box.clientWidth || 320), H = 380, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const LIN = H - 70, FAIXA = W / 4;
    // notas → tempos: a música acelera de bpm[0] para bpm[1]; '.' = pausa; 'A+B' = duas faixas ao mesmo tempo
    const passos = mus.notas.split(/\s+/), N = passos.length, notas = [];
    let t = 1.6, ultima = -1;
    passos.forEach((p, i) => {
      const bpm = mus.bpm[0] + (mus.bpm[1] - mus.bpm[0]) * (i / N), dt = 60 / bpm;
      if (p !== '.') {
        const tons = p.split('+'), usadas = new Set();
        tons.forEach((tom, k) => {
          let f = (Math.round(freqNota(tom)) + i * 7 + k * 2) % 4;
          while (usadas.has(f) || (tons.length === 1 && f === ultima && Math.random() < 0.7)) f = (f + 1) % 4;
          usadas.add(f); if (tons.length === 1) ultima = f;
          notas.push({ t, faixa: f, hz: freqNota(tom), feita: false, falhou: false });
        });
      }
      t += dt * (i > N * 0.6 && i % 3 === 2 ? 0.5 : 1);   // mais à frente: toques seguidos (colcheias)
    });
    const fimT = t + 1.2;
    let A = null; try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch { }
    const tocar = hz => { if (!A) return; try { const o = A.createOscillator(), o2 = A.createOscillator(), v = A.createGain(), q = A.currentTime;
      o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = hz; o2.frequency.value = hz * 2; o.connect(v); o2.connect(v); v.connect(A.destination);
      v.gain.setValueAtTime(0.0001, q); v.gain.exponentialRampToValueAtTime(0.22, q + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, q + 0.5);
      o.start(q); o2.start(q); o.stop(q + 0.55); o2.stop(q + 0.55); } catch { } };
    const bum = () => { if (!A) return; try { const o = A.createOscillator(), v = A.createGain(), q = A.currentTime; o.type = 'sawtooth'; o.frequency.setValueAtTime(110, q); o.frequency.exponentialRampToValueAtTime(55, q + 0.25); o.connect(v); v.connect(A.destination); v.gain.setValueAtTime(0.12, q); v.gain.exponentialRampToValueAtTime(0.0001, q + 0.3); o.start(q); o.stop(q + 0.3); } catch { } };
    const relogio = () => (typeof window.__relogioTiles === 'function' ? window.__relogioTiles() : performance.now()) / 1000;
    let t0 = null, falhas = 0, acertos = 0, perfeitos = 0, combo = 0, fim = false, raf = 0, flash = [0, 0, 0, 0], txt = null;
    const vel = tt => 260 + 200 * Math.min(1, tt / fimT);   // px/s: a passadeira acelera
    const yDe = (n, tt) => LIN - (n.t - tt) * vel(tt);
    const acabar = v => { if (fim) return; fim = true; cancelAnimationFrame(raf); try { A && A.close(); } catch { } setTimeout(() => mjFechar(m), v === undefined || v === null ? 0 : 1100); res(v); };
    const estrelas = () => { const p = acertos / Math.max(1, notas.length); return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.45 ? 1 : 0; };
    const terminar = () => {
      const s = estrelas();
      m.querySelector('.mj-est').outerHTML = mjEstrelas(s);
      info.textContent = `${Math.round(100 * acertos / Math.max(1, notas.length))}% · ` + [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][s];
      acabar(s);
    };
    const tocarFaixa = f => {
      if (fim) return;
      if (t0 === null) { t0 = relogio(); come.style.display = 'none'; try { A && A.resume(); } catch { } return; }
      const tt = relogio() - t0;
      let melhor = null, md = 1e9;
      for (const n of notas) if (n.faixa === f && !n.feita && !n.falhou) { const d = Math.abs(n.t - tt); if (d < md) { md = d; melhor = n; } }
      if (melhor && md < 0.18) {
        melhor.feita = true; acertos++; combo++; flash[f] = 1; tocar(melhor.hz);
        if (md < 0.07) { perfeitos++; txt = { s: tr('Perfeito!'), a: 1 }; } else txt = { s: tr('Boa!'), a: 1 };
      } else { falhas++; combo = 0; bum(); txt = { s: tr('Falhou!'), a: 1, mau: true }; if (navigator.vibrate) try { navigator.vibrate(60); } catch { } }
      if (falhas >= 3) terminar();
    };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); tocarFaixa(Math.max(0, Math.min(3, Math.floor((e.clientX - r.left) / (r.width / 4))))); });
    come.addEventListener('pointerdown', e => { e.preventDefault(); tocarFaixa(0); });
    const teclas = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
    const tecla = e => { if (!m.isConnected) return removeEventListener('keydown', tecla); if (e.key in teclas) { e.preventDefault(); tocarFaixa(teclas[e.key]); } };
    addEventListener('keydown', tecla);
    const quadro = () => {
      if (fim) return;
      const tt = t0 === null ? 0 : relogio() - t0;
      // modo automático para os testes e demonstrações
      if (window.__tilesAuto && t0 !== null) for (const n of notas) if (!n.feita && !n.falhou && tt >= n.t - 0.01) { n.feita = true; acertos++; perfeitos++; flash[n.faixa] = 1; }
      for (const n of notas) if (!n.feita && !n.falhou && tt - n.t > 0.18) { n.falhou = true; falhas++; combo = 0; bum(); txt = { s: tr('Falhou!'), a: 1, mau: true }; if (falhas >= 3) { terminar(); return; } }
      // passadeira: fundo escuro com riscas a andar
      g.fillStyle = '#17120f'; g.fillRect(0, 0, W, H);
      const off = (tt * vel(tt)) % 40;
      for (let y = -40 + off; y < H; y += 40) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(0, y, W, 18); }
      for (let f = 0; f < 4; f++) {
        if (flash[f] > 0) { const gr = g.createLinearGradient(0, LIN - 160, 0, LIN); gr.addColorStop(0, 'rgba(255,203,0,0)'); gr.addColorStop(1, `rgba(255,203,0,${0.35 * flash[f]})`); g.fillStyle = gr; g.fillRect(f * FAIXA, LIN - 160, FAIXA, 160); flash[f] = Math.max(0, flash[f] - 0.06); }
        if (f) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(f * FAIXA - 1, 0, 2, H); }
      }
      // linha de toque e laterais da passadeira
      g.fillStyle = '#FFCB00'; g.fillRect(0, LIN - 2, W, 4);
      g.fillStyle = 'rgba(255,203,0,0.12)'; g.fillRect(0, LIN + 2, W, H - LIN);
      // peças
      for (const n of notas) {
        const y = yDe(n, tt); if (y < -80 || y > H + 20) continue;
        const x = n.faixa * FAIXA + 5, w = FAIXA - 10, h = 64;
        g.save(); g.globalAlpha = n.feita ? Math.max(0, 1 - (tt - n.t) * 4) : 1;
        const gr = g.createLinearGradient(0, y - h, 0, y);
        if (n.falhou) { gr.addColorStop(0, '#7a2a24'); gr.addColorStop(1, '#ff6b5b'); }
        else if (n.feita) { gr.addColorStop(0, '#2e8f55'); gr.addColorStop(1, '#4ccf7a'); }
        else { gr.addColorStop(0, '#ffe07a'); gr.addColorStop(1, '#f0a800'); }
        g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x, y - h, w, h, 10) : g.rect(x, y - h, w, h); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke();
        if (!n.feita && !n.falhou) { g.fillStyle = 'rgba(40,25,5,.55)'; g.beginPath(); g.arc(x + w / 2, y - h / 2, 7, 0, 7); g.fill(); }
        g.restore();
      }
      if (txt && txt.a > 0) { g.globalAlpha = txt.a; g.fillStyle = txt.mau ? '#ff6b5b' : '#FFCB00'; g.font = '800 26px "Bricolage Grotesque", Inter, sans-serif'; g.textAlign = 'center'; g.fillText(txt.s, W / 2, LIN - 190); g.globalAlpha = 1; txt.a -= 0.025; }
      if (combo >= 5) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 15px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(`${combo}× combo`, W / 2, 28); }
      // vidas
      for (let i = 0; i < 3; i++) { g.fillStyle = i < 3 - falhas ? '#ff6b5b' : 'rgba(255,255,255,.18)'; g.font = '16px sans-serif'; g.textAlign = 'left'; g.fillText('♥', 10 + i * 18, 24); }
      info.textContent = t0 === null ? tr('Pronto/a?') : `${acertos}/${notas.length}`;
      m.querySelector('.mj-est').outerHTML = mjEstrelas(estrelas());
      if (t0 !== null && tt > fimT) { terminar(); return; }
      raf = requestAnimationFrame(quadro);
    };
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    raf = requestAnimationFrame(quadro);
  });
}

/* ---------- 👶 Jogos com os filhos (0k-C, dono 27 out) ----------
   Bebé (0–2): «Cucu!» — a criança tapa a cara; toca quando ela destapa (3 vezes).
   3–17: jogo da memória com coisas de Angola (mais cartas para os mais velhos).
   Trabalhos de casa (6–17): contas rápidas conforme a idade. */
function jogoCucu(nome) {
  return new Promise(res => {
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>👶 ${esc(tr('Cucu!'))} <small class="mj-mus">${esc(nome || '')}</small></h3>
      <p class="m">${esc(tr('Quando o bebé destapar a cara, toca depressa para o fazer rir!'))}</p>
      <div class="mj-bebe" data-sem-traducao><span class="cara">🙈</span></div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(0)}</div>
      <button class="btn mj-acao">${esc(tr('Cucu!'))}</button>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const cara = m.querySelector('.cara'), info = m.querySelector('.mj-tent'), bt = m.querySelector('.mj-acao');
    let ronda = 0, acertos = 0, aberto = false, fim = false, tA = null, tF = null, t1 = null;
    const acabar = v => { if (fim) return; fim = true; [tA, tF, t1].forEach(clearTimeout); setTimeout(() => mjFechar(m), v == null ? 0 : 900); res(v); };
    const nova = () => {
      if (ronda >= 3) { info.textContent = [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][acertos]; return acabar(acertos); }
      cara.textContent = '🙈'; aberto = false; info.textContent = `${tr('Tentativa')} ${ronda + 1}/3`;
      tA = setTimeout(() => { aberto = true; cara.textContent = '👶'; tF = setTimeout(() => { if (aberto) { aberto = false; ronda++; cara.textContent = '🙈'; t1 = setTimeout(nova, 500); } }, 900 - ronda * 150); }, 900 + Math.random() * 1800);
    };
    bt.addEventListener('click', () => {
      if (fim) return;
      clearTimeout(tA); clearTimeout(tF);
      if (aberto) { acertos++; cara.textContent = '😆'; m.querySelector('.mj-est').outerHTML = mjEstrelas(acertos); }
      else cara.textContent = '😐';
      aberto = false; ronda++; t1 = setTimeout(nova, 700);
    });
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    nova();
  });
}
const CARTAS_MEMORIA = ['🥭', '🍌', '🚐', '⚽', '🦁', '🐘', '🥥', '🦒', '🌴', '🐢', '🎺', '🥁'];
function jogoMemoria(idade, nome) {
  return new Promise(res => {
    const pares = idade < 7 ? 4 : idade < 12 ? 6 : 8;
    const cartas = CARTAS_MEMORIA.slice().sort(() => Math.random() - 0.5).slice(0, pares).flatMap(e => [e, e]).sort(() => Math.random() - 0.5);
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>🧠 ${esc(tr('Jogo da memória'))} <small class="mj-mus">${esc(tr('com'))} ${esc(nome || '')}</small></h3>
      <p class="m">${esc(tr('Vira duas cartas de cada vez e encontra os pares. Quantas menos tentativas, melhor!'))}</p>
      <div class="mj-cartas c${pares}" data-sem-traducao>${cartas.map((e, i) => `<button class="mj-carta" data-i="${i}" aria-label="?"><span>${e}</span></button>`).join('')}</div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(3)}</div>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const info = m.querySelector('.mj-tent');
    let abertas = [], feitos = 0, tent = 0, fim = false, ocupado = false;
    const est = () => { const sobra = tent - pares; return sobra <= Math.ceil(pares * 0.5) ? 3 : sobra <= pares ? 2 : sobra <= pares * 2 ? 1 : 0; };
    const acabar = v => { if (fim) return; fim = true; setTimeout(() => mjFechar(m), v == null ? 0 : 1000); res(v); };
    info.textContent = `${tr('Tentativas')}: 0`;
    m.querySelectorAll('.mj-carta').forEach(c => c.addEventListener('click', () => {
      if (fim || ocupado || c.classList.contains('vira') || c.classList.contains('par')) return;
      c.classList.add('vira'); abertas.push(c);
      if (abertas.length < 2) return;
      tent++; info.textContent = `${tr('Tentativas')}: ${tent}`;
      const [a, b] = abertas; abertas = [];
      if (cartas[+a.dataset.i] === cartas[+b.dataset.i]) {
        a.classList.add('par'); b.classList.add('par'); feitos++;
        if (feitos === pares) { const s = est(); m.querySelector('.mj-est').outerHTML = mjEstrelas(s); info.textContent = [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][s]; acabar(s); }
      } else { ocupado = true; setTimeout(() => { a.classList.remove('vira'); b.classList.remove('vira'); ocupado = false; }, 750); }
      m.querySelector('.mj-est').outerHTML = mjEstrelas(est());
    }));
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
  });
}
function jogoContas(idade, nome) {
  return new Promise(res => {
    const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pergunta = () => {
      if (idade < 10) { const a = r(2, 20), b = r(1, 15), soma = Math.random() < 0.6; return soma ? [`${a} + ${b}`, a + b] : [`${Math.max(a, b)} − ${Math.min(a, b)}`, Math.abs(a - b)]; }
      if (idade < 14) { const a = r(3, 12), b = r(3, 12); return Math.random() < 0.6 ? [`${a} × ${b}`, a * b] : [`${a * b} ÷ ${a}`, b]; }
      const a = r(5, 25), b = r(2, 9), c = r(1, 30); return [`${a} × ${b} − ${c}`, a * b - c];
    };
    const qs = Array.from({ length: 5 }, pergunta);
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>📚 ${esc(tr('Contas com'))} ${esc(nome || '')}</h3>
      <p class="m">${esc(tr('Ajuda a resolver 5 contas. Cada resposta certa conta!'))}</p>
      <div class="mj-conta"></div><div class="mj-opcoes"></div>
      <div class="mj-info"><span class="mj-tent"></span>${mjEstrelas(0)}</div>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const conta = m.querySelector('.mj-conta'), ops = m.querySelector('.mj-opcoes'), info = m.querySelector('.mj-tent');
    let k = 0, certas = 0, fim = false;
    const est = () => certas >= 5 ? 3 : certas === 4 ? 2 : certas === 3 ? 1 : 0;
    const acabar = v => { if (fim) return; fim = true; setTimeout(() => mjFechar(m), v == null ? 0 : 900); res(v); };
    const mostrar = () => {
      if (k >= qs.length) { info.textContent = `${certas}/5 · ` + [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][est()]; return acabar(est()); }
      const [txt, sol] = qs[k];
      const alt = new Set([sol]); while (alt.size < 4) alt.add(sol + r(-6, 6) || sol + 7);
      conta.textContent = `${txt} = ?`; info.textContent = `${k + 1}/5`;
      ops.innerHTML = [...alt].sort(() => Math.random() - 0.5).map(v => `<button class="btn ghost" data-v="${v}">${v}</button>`).join('');
      ops.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
        if (fim) return;
        const ok = +b.dataset.v === sol; if (ok) certas++;
        b.classList.add(ok ? 'certo' : 'errado'); ops.querySelectorAll('[data-v]').forEach(x => { x.disabled = true; if (+x.dataset.v === sol) x.classList.add('certo'); });
        m.querySelector('.mj-est').outerHTML = mjEstrelas(est()); k++; setTimeout(mostrar, 650);
      }));
    };
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    mostrar();
  });
}

/* ---------- 💃 Desafio de estilo na Boutique (0k-F, dono 27 out) ----------
   Uma cliente pede um visual para um tema; escolhes roupa, cores, penteado e até 2 acessórios.
   Pontos: roupa 35 + cores 30 + acessórios 24 + penteado 11 → 0–3 estrelas. */
const TEMAS_MODA = [
  { id: 'casamento', e: '💍', t: 'Casamento no sábado', d: 'Vou a um casamento de convidada. Elegante, mas sem roubar o branco à noiva!', roupas: [2, 3, 4], cores: ['#e0313f', '#7a4b8c', '#2a3b55', '#e86aa6', '#16a3a3', '#f5b81c'], maus: ['#f2f2f2'], acess: ['colar', 'brincos', 'relogio', 'corrente_ouro'], evitar: ['auscultadores'], cabelos: [1, 3, 4] },
  { id: 'praia', e: '🏖️', t: 'Dia de praia na Ilha', d: 'Quero ir à Ilha com as amigas: fresco, colorido e com proteção do sol.', roupas: [0, 1], cores: ['#f5b81c', '#f07c2a', '#16a3a3', '#e86aa6', '#2f8f5b', '#f2f2f2'], maus: ['#1f1f1f', '#2a3b55', '#8a5a32'], acess: ['oculos', 'chapeu', 'oculos_ouro'], evitar: ['coroa', 'relogio'], cabelos: [2, 3, 4, 5] },
  { id: 'entrevista', e: '💼', t: 'Entrevista de emprego', d: 'Tenho entrevista num banco na Baixa. Sério e profissional, por favor.', roupas: [2], cores: ['#1f1f1f', '#2a3b55', '#f2f2f2', '#2c6fb0'], maus: ['#e86aa6', '#f07c2a', '#f5b81c'], acess: ['relogio'], evitar: ['auscultadores', 'coroa', 'oculos', 'corrente_ouro'], cabelos: [0, 1, 3] },
  { id: 'kizomba', e: '💃', t: 'Noite de kizomba', d: 'Vou dançar kizomba esta noite. Quero arrasar na pista!', roupas: [1, 3, 4], cores: ['#e0313f', '#1f1f1f', '#7a4b8c', '#e86aa6'], maus: ['#8a5a32'], acess: ['brincos', 'corrente_ouro', 'colar'], evitar: ['chapeu', 'auscultadores'], cabelos: [2, 3, 4] },
  { id: 'igreja', e: '⛪', t: 'Culto de domingo', d: 'Domingo é dia de igreja com a família. Bonito e respeitoso.', roupas: [2, 3, 4], cores: ['#f2f2f2', '#f5b81c', '#2c6fb0', '#2a3b55'], maus: ['#e0313f'], acess: ['chapeu', 'colar', 'relogio'], evitar: ['auscultadores', 'oculos', 'corrente_ouro'], cabelos: [1, 3, 5] },
  { id: 'kuduro', e: '🎧', t: 'Festa de kuduro', d: 'Há festa de kuduro no bairro! Cores vivas e muita atitude.', roupas: [0], cores: ['#f07c2a', '#f5b81c', '#2f8f5b', '#e0313f', '#16a3a3'], maus: ['#8a5a32', '#2a3b55'], acess: ['auscultadores', 'oculos', 'corrente_ouro'], evitar: ['colar'], cabelos: [1, 2, 4] },
];
const NOMES_CLIENTES = ['Dona Fátima', 'Djamila', 'Tia Rosa', 'Nádia', 'Kiesse', 'Mariana', 'Sr. Edson', 'Kiluanji', 'Mano Zé', 'Yola'];
function pontuarModa(tema, ap) {
  let p = 0;
  if (tema.roupas.includes(ap.roupa || 0)) p += 35;
  for (const c of [ap.camisa, ap.calca]) p += tema.cores.includes(c) ? 15 : tema.maus.includes(c) ? -10 : 0;
  for (const a of (ap.acess || []).slice(0, 2)) p += tema.acess.includes(a) ? 12 : tema.evitar.includes(a) ? -12 : 0;
  if (tema.cabelos.includes(ap.cabelo)) p += 11;
  return Math.max(0, Math.min(100, p));
}
const estrelasModa = p => p >= 80 ? 3 : p >= 60 ? 2 : p >= 40 ? 1 : 0;
function jogoModa() {
  return new Promise(res => {
    const r = Math.random, tema = TEMAS_MODA[Math.floor(r() * TEMAS_MODA.length)], cliente = NOMES_CLIENTES[Math.floor(r() * NOMES_CLIENTES.length)];
    const ap = { ...aparenciaAleatoria(r), roupa: 0, camisa: '#8a5a32', calca: '#8a5a32', cabelo: 1, acess: [] };
    window.__modaTema = tema;   // para os testes
    const roupas = typeof ROUPAS !== 'undefined' ? ROUPAS : ['Calças', 'Saia', 'Fato', 'Vestido de gala', 'Pano africano'];
    const acessorios = ['oculos', 'chapeu', 'brincos', 'colar', 'relogio', 'auscultadores', 'oculos_ouro', 'corrente_ouro', 'coroa', 'brincos_ouro', 'anel_diamante', 'colar_diamante', 'relogio_diamante'];
    const nomeAc = id => (D.itens || []).find(x => x.id === id);
    if (typeof av3dPreCarregar === 'function') try { av3dPreCarregar(acessorios); } catch { }
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>${tema.e} ${esc(tr(tema.t))}</h3>
      <div class="mj-cliente"><b>${esc(cliente)}:</b> «${esc(tr(tema.d))}»</div>
      <div class="mj-moda"><canvas id="mjModelo" width="160" height="200"></canvas>
        <div class="mj-ops">
          <small>${esc(tr('Roupa'))}</small><div class="sw">${roupas.map((n, i) => `<button type="button" class="txt" data-roupa="${i}">${esc(tr(n))}</button>`).join('')}</div>
          <small>${esc(tr('Parte de cima'))}</small><div class="sw">${CORES_ROUPA.map(c => `<button type="button" class="cor" data-camisa="${c}" style="background:${c}"></button>`).join('')}</div>
          <small>${esc(tr('Parte de baixo'))}</small><div class="sw">${CORES_ROUPA.map(c => `<button type="button" class="cor" data-calca="${c}" style="background:${c}"></button>`).join('')}</div>
          <small>${esc(tr('Penteado'))}</small><div class="sw">${ESTILOS_CABELO.map((n, i) => `<button type="button" class="txt" data-cabelo="${i}">${esc(tr(n))}</button>`).join('')}</div>
          <small>${esc(tr('Acessórios (até 2)'))}</small><div class="sw">${acessorios.map(a => `<button type="button" class="txt" data-acess="${a}">${nomeAc(a)?.emoji || ''} ${esc(tr(nomeAc(a)?.nome || a))}</button>`).join('')}</div>
        </div></div>
      <div class="mj-info"><span class="mj-tent">${esc(tr('Monta o visual e mostra à cliente.'))}</span>${mjEstrelas(0)}</div>
      <button class="btn mj-acao">${esc(tr('Mostrar à cliente'))}</button>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    m.querySelector('.mj').classList.add('largo');
    const marcar = () => {
      m.querySelectorAll('[data-roupa]').forEach(b => b.classList.toggle('on', +b.dataset.roupa === ap.roupa));
      m.querySelectorAll('[data-camisa]').forEach(b => b.classList.toggle('on', b.dataset.camisa === ap.camisa));
      m.querySelectorAll('[data-calca]').forEach(b => b.classList.toggle('on', b.dataset.calca === ap.calca));
      m.querySelectorAll('[data-cabelo]').forEach(b => b.classList.toggle('on', +b.dataset.cabelo === ap.cabelo));
      m.querySelectorAll('[data-acess]').forEach(b => b.classList.toggle('on', ap.acess.includes(b.dataset.acess)));
      registarPreview('mjModelo', { ...ap }); if (!previewAnim) animarPreview();
    };
    m.querySelectorAll('[data-roupa]').forEach(b => b.onclick = () => { ap.roupa = +b.dataset.roupa; marcar(); });
    m.querySelectorAll('[data-camisa]').forEach(b => b.onclick = () => { ap.camisa = b.dataset.camisa; marcar(); });
    m.querySelectorAll('[data-calca]').forEach(b => b.onclick = () => { ap.calca = b.dataset.calca; marcar(); });
    m.querySelectorAll('[data-cabelo]').forEach(b => b.onclick = () => { ap.cabelo = +b.dataset.cabelo; marcar(); });
    m.querySelectorAll('[data-acess]').forEach(b => b.onclick = () => { const a = b.dataset.acess; ap.acess = ap.acess.includes(a) ? ap.acess.filter(x => x !== a) : [...ap.acess, a].slice(-2); marcar(); });
    let fim = false;
    const acabar = v => { if (fim) return; fim = true; setTimeout(() => mjFechar(m), v == null ? 0 : 1600); res(v); };
    m.querySelector('.mj-acao').addEventListener('click', () => {
      const p = pontuarModa(tema, ap), s = estrelasModa(p);
      m.querySelector('.mj-est').outerHTML = mjEstrelas(s);
      m.querySelector('.mj-tent').textContent = `${p}/100 · ` + [tr('A cliente não gostou nada…'), tr('Mais ou menos.'), tr('A cliente gostou!'), tr('A cliente adorou!')][s];
      m.querySelector('.mj-acao').disabled = true; acabar(s);
    });
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    marcar();
  });
}
async function desafioModa() {
  const est = await jogoModa();
  if (est === undefined || est === null) return;
  await acao('moda_desafio', { p_estrelas: est });
}

/* ---------- ⚽ Penáltis no campo do bairro (dono, 27 out: «jogos de futebol») ----------
   5 remates: toca na baliza para escolher o canto e depois para a barra de força (verde = bom, vermelho = por cima).
   O guarda-redes atira-se para um lado (mais à frente fica melhor). Golos = estrelas: 5→3, 4→2, 3→1. */
function jogoPenaltis() {
  return new Promise(res => {
    const m = mjModal(`
      <button class="mj-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <h3>⚽ ${esc(tr('Penáltis'))}</h3>
      <p class="m">${esc(tr('Toca na baliza para escolher o canto e depois na força certa. 5 remates.'))}</p>
      <div class="mj-campo" data-sem-traducao><canvas width="340" height="230"></canvas></div>
      <div class="mj-pista mj-forca" style="display:none"><div class="mj-zona" style="left:55%;width:22%"></div><div class="mj-marca"></div></div>
      <div class="mj-info"><span class="mj-tent"></span><span class="mj-placar" data-sem-traducao></span></div>
      <button class="btn ghost sm mj-saltar">${esc(tr('Saltar (sem bónus)'))}</button>`);
    const cv = m.querySelector('canvas'), g = cv.getContext('2d'), info = m.querySelector('.mj-tent'), placar = m.querySelector('.mj-placar'), forca = m.querySelector('.mj-forca'), marca = forca.querySelector('.mj-marca');
    const W = 340, H = 230, B = { x: 50, y: 40, w: 240, h: 110 };
    let remate = 0, golos = 0, alvo = null, fase = 'mirar', pos = 0, t0 = 0, raf = 0, fim = false, anim = null, resultado = '';
    const desenhar = () => {
      // relva com riscas, área, baliza com rede
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#3f8a37' : '#4a9a40'; g.fillRect(0, i * H / 8, W, H / 8); }
      g.strokeStyle = '#ffffffcc'; g.lineWidth = 2; g.strokeRect(20, B.y + B.h, W - 40, 60); g.beginPath(); g.arc(W / 2, H - 22, 3, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.strokeStyle = '#ffffff55'; g.lineWidth = 1; for (let x = B.x; x <= B.x + B.w; x += 12) { g.beginPath(); g.moveTo(x, B.y); g.lineTo(x, B.y + B.h); g.stroke(); } for (let y = B.y; y <= B.y + B.h; y += 12) { g.beginPath(); g.moveTo(B.x, y); g.lineTo(B.x + B.w, y); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(B.x, B.y + B.h); g.lineTo(B.x, B.y); g.lineTo(B.x + B.w, B.y); g.lineTo(B.x + B.w, B.y + B.h); g.stroke();
      // guarda-redes
      const gx = anim ? anim.gx : W / 2, gy = B.y + B.h - 4, inc = anim ? anim.inc : 0;
      g.save(); g.translate(gx, gy); g.rotate(inc);
      g.fillStyle = '#f5b81c'; g.fillRect(-14, -46, 28, 30); g.fillStyle = '#1f1f1f'; g.fillRect(-12, -16, 24, 16);
      g.fillStyle = '#6a3c1c'; g.beginPath(); g.arc(0, -54, 9, 0, 7); g.fill();
      g.strokeStyle = '#6a3c1c'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-13, -42); g.lineTo(-30, -60); g.moveTo(13, -42); g.lineTo(30, -60); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-30, -60, 5, 0, 7); g.arc(30, -60, 5, 0, 7); g.fill();
      g.restore();
      // alvo e bola
      if (alvo && fase !== 'voo') { g.strokeStyle = '#FFCB00'; g.lineWidth = 3; g.beginPath(); g.arc(alvo.x, alvo.y, 12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(alvo.x - 18, alvo.y); g.lineTo(alvo.x + 18, alvo.y); g.moveTo(alvo.x, alvo.y - 18); g.lineTo(alvo.x, alvo.y + 18); g.stroke(); }
      const bx = anim ? anim.bx : W / 2, by = anim ? anim.by : H - 22, br = anim ? anim.br : 9;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(bx, by, br * 0.35, 0, 7); g.fill();
      if (resultado) { g.fillStyle = resultado === 'GOLO!' ? '#FFCB00' : '#ff6b5b'; g.font = '900 34px "Bricolage Grotesque", Inter, sans-serif'; g.textAlign = 'center'; g.fillText(tr(resultado), W / 2, 30); }
      placar.textContent = '⚽ '.repeat(golos) + '❌ '.repeat(remate - golos) + '◯ '.repeat(5 - remate);
    };
    const acabar = v => { if (fim) return; fim = true; cancelAnimationFrame(raf); setTimeout(() => mjFechar(m), v == null ? 0 : 1300); res(v); };
    const rematar = p => {
      fase = 'voo'; forca.style.display = 'none';
      const por_cima = p > 0.85, fraco = p < 0.35, canto = Math.abs(alvo.x - W / 2) / (B.w / 2);
      // o guarda-redes escolhe um lado (adivinha 40% das vezes); bola fraca ou ao meio é mais fácil de defender
      const lado = Math.random() < 0.4 ? Math.sign(alvo.x - W / 2) || 1 : Math.random() < 0.5 ? -1 : 1, gxF = W / 2 + lado * 70;
      const defende = !por_cima && Math.sign(alvo.x - W / 2) === lado && (canto < 0.75 || fraco) || (!por_cima && canto < 0.25 && Math.random() < 0.6);
      const ty = por_cima ? B.y - 30 : alvo.y, tx = alvo.x;
      const ini = performance.now();
      const voo = () => {
        const k = Math.min(1, (performance.now() - ini) / 650);
        anim = { bx: W / 2 + (tx - W / 2) * k, by: H - 22 + (ty - (H - 22)) * k - Math.sin(k * Math.PI) * 20, br: 9 - 4 * k, gx: W / 2 + (gxF - W / 2) * Math.min(1, k * 1.4), inc: lado * Math.min(1, k * 1.4) * 1.1 };
        desenhar();
        if (k < 1) { raf = requestAnimationFrame(voo); return; }
        remate++; const golo = !por_cima && !defende; if (golo) golos++;
        resultado = golo ? 'GOLO!' : por_cima ? 'Por cima!' : 'Defendeu!'; desenhar();
        if (navigator.vibrate) try { navigator.vibrate(golo ? [30, 40, 30] : 80); } catch { }
        setTimeout(() => {
          resultado = ''; anim = null; alvo = null; fase = 'mirar';
          if (remate >= 5) { const s = golos >= 5 ? 3 : golos === 4 ? 2 : golos === 3 ? 1 : 0; info.textContent = `${golos}/5 · ` + [tr('Hoje não foi o dia…'), tr('Razoável.'), tr('Boa técnica!'), tr('Perfeito!')][s]; return acabar(s); }
          info.textContent = `${tr('Remate')} ${remate + 1}/5 · ${tr('Toca na baliza')}`; desenhar();
        }, 1100);
      };
      raf = requestAnimationFrame(voo);
    };
    cv.addEventListener('click', e => {
      if (fim || fase !== 'mirar') return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (x < B.x + 8 || x > B.x + B.w - 8 || y < B.y + 8 || y > B.y + B.h - 4) return;
      alvo = { x, y }; fase = 'forca'; forca.style.display = ''; t0 = performance.now(); info.textContent = tr('Agora a força!'); desenhar();
      const mexe = () => { if (fase !== 'forca') return; pos = 0.5 - 0.5 * Math.cos((performance.now() - t0) / 1000 * 3.4); marca.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(mexe); };
      raf = requestAnimationFrame(mexe);
    });
    forca.addEventListener('click', () => { if (fase === 'forca') rematar(window.__penaltiForca ?? pos); });
    m.querySelector('.mj-saltar').addEventListener('click', () => acabar(null));
    m.querySelector('.mj-x').addEventListener('click', () => acabar(undefined));
    info.textContent = `${tr('Remate')} 1/5 · ${tr('Toca na baliza')}`; desenhar();
  });
}
