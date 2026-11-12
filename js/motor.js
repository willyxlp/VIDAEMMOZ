/* ============================================================
   Vida na Banda — motor isométrico
   Projeção, desenho de caixas, pessoas, móveis, A*, ordenação.
   ============================================================ */
const TW = 64, TH = 32;
// 🔄 rotação da vista (0–3, 90° de cada vez). O mundo fica igual; só a projeção roda.
// imagens da arte 3D ainda a descarregar: o ecrã de "a carregar" só sai quando acabarem (nada de piscar o desenho antigo)
const CARGA = new Set();
function seguirCarga(im) { if (im.complete && im.naturalWidth) return im; CARGA.add(im); const fim = () => CARGA.delete(im); im.addEventListener('load', fim, { once: true }); im.addEventListener('error', fim, { once: true }); return im; }
let VR = 0, VW = 0, VH = 0;
function definirRotacao(r, W, H) { VR = ((r % 4) + 4) % 4; VW = W; VH = H; }
const rodarP = (x, y) => VR === 0 ? [x, y] : VR === 1 ? [VH - y, x] : VR === 2 ? [VW - x, VH - y] : [y, VW - x];
const desrodarP = (x, y) => VR === 0 ? [x, y] : VR === 1 ? [y, VH - x] : VR === 2 ? [VW - x, VH - y] : [VW - y, x];
// retângulo do mundo → retângulo na vista [x, y, w, d]
function rectV(x, y, w, d) {
  if (VR === 0) return [x, y, w, d];
  const [ax, ay] = rodarP(x, y), [bx, by] = rodarP(x + w, y + d);
  return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)];
}
const isoV = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z];
const iso = (x, y, z = 0) => { if (VR === 0) return [(x - y) * TW / 2, (x + y) * TH / 2 - z]; const [a, b] = rodarP(x, y); return [(a - b) * TW / 2, (a + b) * TH / 2 - z]; };

/* ---------- cores ---------- */
function hexRgb(h) {
  if (h[0] !== '#') { const m = h.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; }
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];   // #abc → #aabbcc
  const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function shade(h, f) {
  const [r, g, b] = hexRgb(h);
  const m = c => Math.max(0, Math.min(255, Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f))));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* ---------- primitivas ---------- */
function poly(ctx, pts, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
// Caixa isométrica: x,y,w,d em tiles; z0 = altura da base; h = altura em px
function caixa(ctx, x, y, w, d, h, cor, z0 = 0, opts = {}) {
  if (VR) [x, y, w, d] = rectV(x, y, w, d);
  const A = isoV(x, y, z0), B = isoV(x + w, y, z0), C = isoV(x + w, y + d, z0), D = isoV(x, y + d, z0);
  const up = p => [p[0], p[1] - h];
  const lado = opts.lado || shade(cor, -0.28), frente = opts.frente || shade(cor, -0.12), topo = opts.topo || shade(cor, 0.12);
  poly(ctx, [D, C, up(C), up(D)], lado, opts.linha);      // face +y (esquerda-frente)
  poly(ctx, [B, C, up(C), up(B)], frente, opts.linha);    // face +x (direita-frente)
  poly(ctx, [up(A), up(B), up(C), up(D)], topo, opts.linha);
}
// Retângulo pintado sobre a face +x (direita) de uma caixa: u ao longo de y (0..d), v altura px
function naFaceX(ctx, x, y, d, u0, u1, v0, v1, cor) {
  if (VR === 2 || VR === 3) return;   // esta face fica de costas nesta rotação
  const p = (u, v) => { const q = iso(x, y + u, v); return q; };
  poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], cor);
}
// Retângulo na face +y (esquerda): u ao longo de x
function naFaceY(ctx, x, y, w, u0, u1, v0, v1, cor) {
  if (VR === 1 || VR === 2) return;
  const p = (u, v) => iso(x + u, y, v);
  poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], cor);
}
function losango(ctx, x, y, w, d, cor, z = 0, stroke) {
  if (VR) [x, y, w, d] = rectV(x, y, w, d);
  poly(ctx, [isoV(x, y, z), isoV(x + w, y, z), isoV(x + w, y + d, z), isoV(x, y + d, z)], cor, stroke);
}

/* ---------- pessoas ---------- */
const PELES = ['#f3cfae', '#dca77c', '#b97a4c', '#8d5527', '#6a3c1c', '#4a2912'];
const CORES_CABELO = ['#1a1310', '#4a2a17', '#8a5a2b', '#c9a24a', '#a8322d', '#9a9a9a'];
const ESTILOS_CABELO = ['Careca', 'Curto', 'Afro', 'Tranças', 'Puff', 'Lenço'];
const CORES_ROUPA = ['#e0313f', '#f5b81c', '#2f8f5b', '#2c6fb0', '#7a4b8c', '#f07c2a', '#1f1f1f', '#f2f2f2', '#e86aa6', '#16a3a3', '#8a5a32', '#2a3b55'];

function aparenciaAleatoria(r = Math.random) {
  const p = a => a[Math.floor(r() * a.length)];
  return { pele: 1 + Math.floor(r() * 5), cabelo: Math.floor(r() * 6), corCabelo: Math.floor(r() * 3), camisa: p(CORES_ROUPA), calca: p(CORES_ROUPA), roupa: r() < 0.35 ? 1 : 0 };
}

// Desenha uma pessoa com os pés em (sx, sy). dir: 1 direita / -1 esquerda. costas: true quando se afasta.
/* ---------- 🧍 personagens 3D (#37 — para todos desde 25 out) ----------
   Folhas em img/modelos/pessoa/ (tools/modelos/folhas_pessoa.py): cada camada (pele, cima, baixo, cabelo) vem a branco e é
   pintada aqui com as cores de cada jogador; 'fixo' (sapatos, cara, fato) e os acessórios (a_<id>) vêm com as cores próprias.
   Por vista (frente | costas) 15 quadros: parada, 8 da passada, sentada, deitada, 4 a trabalhar. Crianças: folhas 'k…'.
   Só se descarregam as folhas que cada aparência precisa. */
const AV3D = { idx: null, img: new Map(), comp: new Map() };
const AV3D_ACC = ['oculos', 'oculos_ouro', 'chapeu', 'brincos', 'colar', 'corrente_ouro', 'relogio', 'auscultadores', 'coroa', 'brincos_ouro', 'anel_diamante', 'colar_diamante', 'relogio_diamante'];
const AV3D_Q = { parado: 0, andar: 1, sentado: 9, deitado: 10, trabalhar: 11 };
// ligadas para todos desde 25 out (o dono e a Cinnss aprovaram); localStorage vel_av3d = '0' volta ao desenho antigo (testes/telemóveis fracos)
function av3dAtivo() {
  try { if (localStorage.getItem('vel_av3d') === '0') return false; } catch { }
  return true;
}
function av3dCarregar() {
  if (AV3D.idx) return;
  AV3D.idx = 'a carregar';
  fetch('img/modelos/pessoa/indice.json').then(r => r.json()).then(j => { AV3D.idx = j; }).catch(() => { AV3D.idx = null; });
}
const AV3D_ULT = new WeakMap();
// o criador de personagem: descarrega já as camadas de adulto (corpo das 5 roupas + 5 cabelos), para cada escolha aparecer logo
function av3dPreCarregar(acess = [], tentativa = 0) {
  const ix = AV3D.idx; if (!ix || typeof ix !== 'object') { av3dCarregar(); if (tentativa < 25) setTimeout(() => av3dPreCarregar(acess, tentativa + 1), 400); return; }
  const nomes = [];
  for (let r = 0; r <= 6; r++) for (const c of ['pele', 'baixo', 'cima', 'fixo']) nomes.push(`r${r}_${c}`);
  for (let e = 1; e <= 5; e++) nomes.push(`c${e}`);
  for (const a of acess) nomes.push(`a_${a}`);
  nomes.filter(n => ix.folhas.includes(n)).forEach(av3dImg);
}
// pronta para desenhar em 3D (ou o 3D está desligado): o pré-visualizador não mostra o desenho antigo enquanto espera
function av3dPronta(ap) { return !av3dAtivo() || !!av3dFolha(ap || {}, false) || AV3D_ULT.has(ap); }
function av3dImg(n) {
  let im = AV3D.img.get(n);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = 'img/modelos/pessoa/' + n + '.webp'; AV3D.img.set(n, im); seguirCarga(im); }
  return im;
}
function av3dPintar(im, cor, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (!g) return c;   // 6 nov: iPhones antigos sem memória para mais um canvas
  g.drawImage(im, 0, 0); if (!cor) return c;
  g.globalCompositeOperation = 'multiply'; g.fillStyle = cor; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
  return c;
}
// folha já pintada para esta aparência (fica em cache); null enquanto as imagens não chegam
function av3dFolha(ap, crianca) {
  const ix = AV3D.idx; if (!ix || typeof ix !== 'object') { av3dCarregar(); return null; }
  const roupa = Math.min(crianca ? 4 : 6, ap.roupa || 0), est = ap.cabelo ?? 1, k = crianca ? 'k' : '';
  const pele = PELES[ap.pele ?? 3] || PELES[3], camisa = ap.camisa || '#e0313f', calca = ap.calca || '#2a3b55';
  const cab = est === 5 ? shade(camisa, 0.15) : (CORES_CABELO[ap.corCabelo ?? 0] || CORES_CABELO[0]);
  const acc = crianca ? [] : (Array.isArray(ap.acess) ? ap.acess : []).filter(a => AV3D_ACC.includes(a)).sort();
  const chave = [k, roupa, est, pele, camisa, calca, cab, acc.join(',')].join('|');
  if (AV3D.comp.has(chave)) return AV3D.comp.get(chave);
  const camadas = [[`${k}r${roupa}_pele`, pele], [`${k}r${roupa}_baixo`, calca], [`${k}r${roupa}_cima`, camisa], [`${k}r${roupa}_fixo`, null]];
  if (est >= 1 && est <= 5) camadas.push([`${k}c${est}`, cab]);
  for (const a of acc) camadas.push([`a_${a}`, null]);
  const lista = camadas.filter(([n]) => ix.folhas.includes(n)).map(([n, c]) => [av3dImg(n), c]);
  if (lista.some(([im]) => !im.complete || !im.naturalWidth)) return null;
  const w = ix.cw * ix.quadros, h = ix.ch, out = document.createElement('canvas'); out.width = w; out.height = h;
  const g = out.getContext('2d'); if (!g) return null;   // 7 nov: telemóveis sem memória para mais um canvas (18 erros)
  for (const [im, c] of lista) g.drawImage(av3dPintar(im, c, w, h), 0, 0);
  const f = { cv: out, cw: ix.cw, ch: ix.ch, ax: ix.ax, ay: ix.ay, pv: ix.porVista || 15, vistas: ix.vistas || 2 };
  if (AV3D.comp.size > 120) AV3D.comp.clear();
  AV3D.comp.set(chave, f); return f;
}
// vista de cada uma das 8 direções: [vista na folha (0 baixo-dir, 1 baixo, 2 direita, 3 cima-dir, 4 cima), espelho]
const VISTA8 = [[2, 1], [0, 1], [1, 1], [0, -1], [2, -1], [3, -1], [4, 1], [3, 1]];
function desenhaPessoa3D(ctx, sx, sy, f, ap, t, andar, dir, costas, escala, pose, d8) {
  let vista = costas ? 3 : 0;
  if (d8 != null && !pose && f.vistas >= 5) [vista, dir] = VISTA8[d8];
  else if (f.vistas < 5 && costas) vista = 1;                                       // folhas antigas (só frente/costas)
  ctx.save(); ctx.translate(sx, sy); ctx.scale(escala * dir, escala);
  if (ap.animal && ap.animal !== 'papagaio' && !pose) desenhaAnimal(ctx, -17, 3, ap.animal, t, andar);
  if (pose !== 'deitado' && pose !== 'sentado') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill(); }
  let q = 0;
  if (andar) q = AV3D_Q.andar + Math.floor((((t * 12) / (Math.PI * 2)) % 1) * 8);
  else if (pose === 'trabalhar') q = AV3D_Q.trabalhar + Math.floor((t * 2.5) % 4);
  else if (pose && AV3D_Q[pose] != null) q = AV3D_Q[pose];
  q += vista * f.pv;
  const bob = andar || pose ? 0 : Math.sin(t * 2) * 0.4;                            // parado: respira um bocadinho
  const zPose = pose === 'deitado' ? 14 : pose === 'sentado' ? 9 : 0;               // em cima da cama / do sofá
  ctx.drawImage(f.cv, q * f.cw, 0, f.cw, f.ch, -f.ax / 2, -f.ay / 2 - bob - zPose, f.cw / 2, f.ch / 2);
  if (ap.animal === 'papagaio' && pose !== 'deitado') { ctx.translate(0, -bob - zPose); if (vista === 3 || vista === 4) ctx.globalAlpha = 0.9; desenhaAnimal(ctx, 0, 0, 'papagaio', t, andar); ctx.globalAlpha = 1; }
  ctx.restore();
}
function desenhaPessoa(ctx, sx, sy, ap, t, andar, dir = 1, costas = false, escala = 1, pose = null, d8 = null) {
  ap = ap || {};
  if (av3dAtivo()) {
    const crianca = escala < 0.8;                                                   // filhos pequenos: corpo de criança
    // enquanto as camadas novas descarregam (mudou a roupa, o cabelo…), continua a mostrar o último visual 3D desta pessoa
    let f = av3dFolha(ap, crianca);
    if (f) AV3D_ULT.set(ap, f); else f = AV3D_ULT.get(ap);
    if (f) return desenhaPessoa3D(ctx, sx, sy, f, ap, t, andar, dir, costas, crianca ? escala / 0.71 : escala, pose, d8);
  }
  const pele = PELES[ap.pele ?? 3] || PELES[3];
  const cab = CORES_CABELO[ap.corCabelo ?? 0] || CORES_CABELO[0];
  const camisa = ap.camisa || '#e0313f', calca = ap.calca || '#2a3b55';
  const r = ap.roupa || 0, saia = r === 1, fato = r === 2, vestido = r === 3, pano = r === 4, luxo = r === 5, marca = r === 6;
  const acess = Array.isArray(ap.acess) ? ap.acess : [];
  ctx.save(); ctx.translate(sx, sy); ctx.scale(escala * dir, escala);
  const fase = andar ? Math.sin(t * 12) : 0;
  const bob = andar ? Math.abs(Math.sin(t * 12)) * 1.5 : Math.sin(t * 2) * 0.4;
  if (ap.animal && ap.animal !== 'papagaio') desenhaAnimal(ctx, -17, 3, ap.animal, t, andar);
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill();
  ctx.translate(0, -bob);
  // pernas
  const perna = (ox, f) => {
    ctx.fillStyle = saia || vestido || pano || marca ? pele : fato ? '#22252b' : luxo ? camisa : calca;
    ctx.fillRect(ox - 2, -16, 4, 15 + f * 1.2);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(ox + 1, -1 + f * 1.2, 3, 1.8, 0, 0, 7); ctx.fill();
  };
  perna(-3, fase); perna(3, -fase);
  if (saia) { ctx.fillStyle = calca; poly(ctx, [[-7, -19], [7, -19], [9, -9], [-9, -9]], calca); }
  if (vestido) poly(ctx, [[-7, -20], [7, -20], [10, -3], [-10, -3]], camisa);
  if (marca) { poly(ctx, [[-7, -20], [7, -20], [5, -8], [9, -1], [-9, -1], [-5, -8]], calca); ctx.fillStyle = '#d9b04a'; ctx.fillRect(-7, -21, 14, 1.6); }
  if (pano) { poly(ctx, [[-7, -19], [7, -19], [9, -4], [-9, -4]], calca); ctx.fillStyle = camisa; for (let k = 0; k < 3; k++) ctx.fillRect(-8 + k * 0.6, -16 + k * 4.5, 16, 1.6); ctx.fillStyle = '#f5b81c'; for (let k = -6; k <= 6; k += 4) ctx.fillRect(k, -14, 1.6, 1.6); }
  // braço de trás
  ctx.fillStyle = pele; ctx.save(); ctx.translate(-7, -30); ctx.rotate(-fase * 0.5); ctx.fillRect(-1.5, 0, 3, 12); ctx.restore();
  // tronco
  ctx.fillStyle = fato ? '#22252b' : camisa; rrect(ctx, -7, -33, 14, 16, 4); ctx.fill();
  if (fato) { poly(ctx, [[-2.5, -33], [2.5, -33], [0, -24]], '#f4f4f4'); ctx.fillStyle = camisa; ctx.fillRect(-1, -32, 2, 9); }
  if (pano) { ctx.fillStyle = calca; ctx.fillRect(-7, -27, 14, 2); }
  if (luxo) { poly(ctx, [[-2.5, -33], [2.5, -33], [0, -24]], calca); ctx.fillStyle = '#d9b04a'; ctx.fillRect(-3.4, -33, 1, 8); ctx.fillRect(2.4, -33, 1, 8); ctx.fillRect(3.5, -30, 2, 1.4); ctx.fillRect(-0.6, -22, 1.2, 1.2); }
  if (acess.includes('colar')) { ctx.strokeStyle = '#f2c84b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -33, 4.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
  if (acess.includes('corrente_ouro')) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -33, 5.5, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.fillStyle = '#ffe48a'; ctx.beginPath(); ctx.arc(0, -26.6, 2.3, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6c9'; ctx.fillRect(-0.6, -27.6, 1.2, 1.2); }
  if (acess.includes('colar_diamante')) { ctx.strokeStyle = '#e9eef4'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -33, 5, 0.18, Math.PI - 0.18); ctx.stroke(); ctx.fillStyle = '#cff2ff'; poly(ctx, [[0, -29.4], [2.2, -27.2], [0, -24.6], [-2.2, -27.2]], '#cff2ff'); ctx.fillStyle = '#fff'; ctx.fillRect(-0.5, -28, 1, 1); }
  if (!saia && !vestido && !pano && !marca) { ctx.fillStyle = fato ? '#22252b' : luxo ? camisa : calca; ctx.fillRect(-7, -19, 14, 4); }
  // braço da frente
  ctx.save(); ctx.translate(7, -30); ctx.rotate(fase * 0.5);
  ctx.fillStyle = fato ? '#22252b' : camisa; ctx.fillRect(-2, 0, 4, 5); ctx.fillStyle = luxo ? camisa : pele; ctx.fillRect(-1.5, 5, 3, 7);
  if (acess.includes('relogio')) { ctx.fillStyle = '#f2c84b'; ctx.fillRect(-2, 8, 4, 2.2); }
  if (acess.includes('relogio_diamante')) { ctx.fillStyle = '#dfe6ee'; ctx.fillRect(-2.2, 6.4, 4.4, 2.4); ctx.fillStyle = '#cff2ff'; ctx.fillRect(-1, 6.8, 2, 1.6); }
  if (acess.includes('anel_diamante')) { ctx.fillStyle = '#e9eef4'; ctx.fillRect(-1.6, 10.6, 3.2, 1); ctx.fillStyle = '#cff2ff'; ctx.fillRect(-0.7, 9.8, 1.4, 1); }
  ctx.restore();
  // pescoço e cabeça
  ctx.fillStyle = pele; ctx.fillRect(-2, -36, 4, 4);
  const hy = -42;
  const est = ap.cabelo ?? 1;
  if (est === 2) { ctx.fillStyle = cab; ctx.beginPath(); ctx.arc(0, hy - 2, 10.5, 0, 7); ctx.fill(); }
  if (est === 3) { ctx.fillStyle = cab; ctx.fillRect(-8, hy - 2, 3, 15); ctx.fillRect(5, hy - 2, 3, 15); ctx.fillRect(-6, hy, 2, 13); }
  ctx.fillStyle = pele; ctx.beginPath(); ctx.arc(0, hy, 7, 0, 7); ctx.fill();
  if (!costas) {
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(1, hy - 1, 1.6, 2.2); ctx.fillRect(4.5, hy - 1, 1.6, 2.2);
    ctx.fillStyle = 'rgba(120,40,30,.55)'; ctx.fillRect(2.5, hy + 3, 3, 1.2);
    if (acess.includes('oculos_ouro')) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(-3.2, hy - 1.9, 10.6, 1.1); ctx.fillStyle = '#2b2620'; ctx.fillRect(-0.5, hy - 1.6, 4, 3.2); ctx.fillRect(4, hy - 1.6, 3.2, 3.2); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-0.5, hy + 1.3, 4, 0.6); ctx.fillRect(4, hy + 1.3, 3.2, 0.6); }
    if (acess.includes('oculos')) { ctx.fillStyle = '#111'; ctx.fillRect(-0.5, hy - 2, 4, 3); ctx.fillRect(4, hy - 2, 3.2, 3); ctx.fillRect(-3, hy - 1.5, 10, 1); }
    if (acess.includes('brincos')) { ctx.fillStyle = '#f2c84b'; ctx.beginPath(); ctx.arc(-5.5, hy + 3.5, 1.3, 0, 7); ctx.fill(); }
    if (acess.includes('brincos_ouro')) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(-5.6, hy + 4.6, 2, 0, 7); ctx.stroke(); }
  }
  ctx.fillStyle = cab;
  if (est === 1 || est === 3 || est === 4) { ctx.beginPath(); ctx.arc(0, hy - 1, 7.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.fillRect(-7.4, hy - 2, 2.5, costas ? 8 : 4); if (costas) { ctx.beginPath(); ctx.arc(0, hy, 7.4, 0, 7); ctx.fill(); } }
  if (est === 4) { ctx.beginPath(); ctx.arc(0, hy - 10, 5, 0, 7); ctx.fill(); }
  if (est === 2 && costas) { ctx.beginPath(); ctx.arc(0, hy - 1, 9, 0, 7); ctx.fill(); }
  if (est === 5) {
    const lc = shade(camisa, 0.15);
    ctx.fillStyle = lc; ctx.beginPath(); ctx.ellipse(0, hy - 6, 9, 7, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, hy - 11, 7, 6, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = shade(camisa, -0.2); ctx.fillRect(-8, hy - 4, 16, 2);
  }
  if (acess.includes('auscultadores')) { ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, hy - 1, 8.6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.fillStyle = '#e0313f'; rrect(ctx, -10, hy - 3, 4, 7, 1.6); ctx.fill(); if (!costas) { rrect(ctx, 6.2, hy - 3, 3.6, 7, 1.6); ctx.fill(); } }
  if (acess.includes('coroa') && est !== 5) { const cy = hy - 7 - (est === 2 ? 4 : est === 4 ? 6 : 0); poly(ctx, [[-6.5, cy + 3], [-6.5, cy - 3], [-3.5, cy], [0, cy - 5], [3.5, cy], [6.5, cy - 3], [6.5, cy + 3]], '#ffd34d'); ctx.fillStyle = '#e0313f'; ctx.beginPath(); ctx.arc(0, cy + 0.8, 1.3, 0, 7); ctx.fill(); ctx.fillStyle = '#2c6fb0'; ctx.beginPath(); ctx.arc(-4, cy + 1.2, 0.9, 0, 7); ctx.arc(4, cy + 1.2, 0.9, 0, 7); ctx.fill(); }
  if (acess.includes('chapeu') && est !== 5) {
    ctx.fillStyle = '#d9b26a'; ctx.beginPath(); ctx.ellipse(0, hy - 6, 12, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e7c886'; rrect(ctx, -6, hy - 13, 12, 8, 3); ctx.fill();
    ctx.fillStyle = '#7a4b2a'; ctx.fillRect(-6, hy - 8, 12, 2);
  }
  if (ap.animal === 'papagaio' && pose !== 'deitado') desenhaAnimal(ctx, 0, 0, 'papagaio', t, andar);
  ctx.restore();
}
// cão, gato ou galinha a andar ao lado do dono
function desenhaAnimal(ctx, x, y, tipo, t, andar) {
  const p = andar ? Math.sin(t * 14) : 0, b = andar ? Math.abs(Math.sin(t * 14)) * 1.2 : 0;
  if (tipo === 'papagaio') {   // 8 nov (Ouro): papagaio cinzento no ombro (cauda vermelha)
    ctx.save(); ctx.translate(7.5, -39.5 - b * 0.5); ctx.scale(1.25, 1.25);
    ctx.fillStyle = '#c63a2c'; poly(ctx, [[-1.5, 2], [1.5, 2], [0.5, 7], [-1, 7]], '#c63a2c');
    ctx.fillStyle = '#9aa3ab'; ctx.beginPath(); ctx.ellipse(0, -1, 3.2, 4.2, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#b9c1c8'; ctx.beginPath(); ctx.arc(0.6, -5.6, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4f2ee'; ctx.beginPath(); ctx.arc(1.5, -5.8, 1.2, 0, 7); ctx.fill();
    poly(ctx, [[2.8, -6.2], [4.6, -5.2], [2.8, -4.4]], '#1d1d1f'); ctx.fillStyle = '#111'; ctx.fillRect(1.3, -6.4, 0.9, 0.9);
    ctx.restore(); return;
  }
  if (tipo === 'cavalo_branco') {   // 8 nov (Ouro): cavalo branco ao lado do dono
    ctx.save(); ctx.translate(x - 8, y - b);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, b, 14, 4, 0, 0, 7); ctx.fill();
    const branco = '#f4f2ee', sombra = '#d9d6cf';
    ctx.fillStyle = sombra; ctx.fillRect(-9 + p, -14, 2.4, 14); ctx.fillRect(6 - p, -14, 2.4, 14);
    ctx.fillStyle = branco; ctx.fillRect(-6 - p, -14, 2.4, 14); ctx.fillRect(9 + p, -14, 2.4, 14);
    rrect(ctx, -11, -24, 23, 11, 5); ctx.fill();
    poly(ctx, [[8, -22], [12, -34], [16, -33], [13, -21]], branco);
    rrect(ctx, 12, -38, 9, 5, 2.4); ctx.fill();
    ctx.fillStyle = '#b8b2a8'; poly(ctx, [[9, -24], [11, -35], [13, -36], [11, -23]], '#b8b2a8');
    ctx.strokeStyle = '#b8b2a8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-11, -21); ctx.quadraticCurveTo(-16, -16, -14 + p, -9); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(16.5, -37, 1.2, 1.2);
    ctx.restore(); return;
  }
  ctx.save(); ctx.translate(x, y - b);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, b, 7, 2.6, 0, 0, 7); ctx.fill();
  if (tipo === 'galinhas') {
    ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.ellipse(0, -6, 5, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -10, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0313f'; ctx.fillRect(3.5, -13.5, 2, 1.8); ctx.fillStyle = '#f5b81c'; poly(ctx, [[6.4, -10], [8.4, -9.4], [6.4, -8.8]], '#f5b81c');
    ctx.fillStyle = '#f5b81c'; ctx.fillRect(-1.5 + p, -2.5, 1, 2.5); ctx.fillRect(1 - p, -2.5, 1, 2.5);
    ctx.fillStyle = '#111'; ctx.fillRect(4.6, -10.6, 0.9, 0.9);
  } else {
    const cor = tipo === 'cao' ? '#a8743f' : '#5b5b66', esc = tipo === 'cao' ? 1 : 0.85;
    ctx.scale(esc, esc);
    ctx.fillStyle = cor;
    ctx.fillRect(-5 + p, -4, 2, 4); ctx.fillRect(3 - p, -4, 2, 4);
    rrect(ctx, -7, -10, 14, 7, 3); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -11, 4, 0, 7); ctx.fill();
    if (tipo === 'cao') { ctx.fillStyle = shade(cor, -0.25); ctx.beginPath(); ctx.ellipse(5.4, -12, 1.6, 3, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = cor; ctx.fillRect(10, -11, 2.5, 2.5); }
    else { poly(ctx, [[4.6, -14], [5.6, -17.5], [7, -14.5]], cor); poly(ctx, [[7.4, -14.5], [9, -17.5], [9.6, -13.8]], cor); }
    ctx.strokeStyle = cor; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-11, tipo === 'cao' ? -14 : -16, -9 + p, tipo === 'cao' ? -15 : -18); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(8, -12.4, 1.1, 1.1);
  }
  ctx.restore();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* ---------- vegetação e decoração ---------- */
// árvores 3D fotografadas: cada árvore usa uma das 4 fotos (para as vizinhas não serem iguais) e abana um bocadinho ao vento
const hashXY = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
function desenhaNatureza(ctx, id, x, y, t, vento = 0.012) {
  if (typeof MOD3D === 'undefined') return false;
  const e = MOD3D.idx?.[id]; if (!e) return false;
  const h = hashXY(x | 0, y | 0), v = (VR + h) % 4, r = e.rot?.[v]; if (!r) return false;
  const im = imgModelo(`${id}_r${v}`); if (!im) return false;
  const [sx, sy] = iso(x + 0.5, y + 0.5);
  const k = Math.sin(t * 1.1 + (h % 628) / 100) * vento + Math.sin(t * 2.7 + x) * vento * 0.25;
  ctx.save(); ctx.translate(sx, sy); ctx.transform(1, 0, k, 1, 0, 0);
  ctx.drawImage(im, -r.ax / 2, -r.ay / 2, r.w / 2, r.h / 2); ctx.restore();
  return true;
}
// a cor da árvore (gerada pela cidade) + o sítio escolhem a espécie: mangueira, árvore de sombra ou acácia rubra
const ARVORE_COR = { '#4f8f3a': 'mangueira', '#3f7d33': 'mangueira', '#5f9e45': 'arvore_verde' };
function especieArvore(x, y, cor) { const h = hashXY(x | 0, y | 0); return h % 5 === 0 ? 'acacia' : (ARVORE_COR[cor] || (h % 2 ? 'mangueira' : 'arvore_verde')); }
function desenhaPalmeira(ctx, x, y, t, alt = 70) {
  if (desenhaNatureza(ctx, 'palmeira', x, y, t, 0.022)) return;
  const [bx, by] = iso(x + 0.5, y + 0.5);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(bx + 6, by, 18, 7, 0, 0, 7); ctx.fill();
  const sway = Math.sin(t * 1.3 + x) * 2;
  ctx.strokeStyle = '#8a6a43'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 8, by - alt / 2, bx + 4 + sway, by - alt); ctx.stroke();
  const tx = bx + 4 + sway, ty = by - alt;
  ctx.fillStyle = '#2f8a3e';
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + 0.3;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -6, 28, 6); ctx.quadraticCurveTo(14, 2, 0, 0); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#6b4b25'; ctx.beginPath(); ctx.arc(tx, ty + 2, 3.5, 0, 7); ctx.fill();
}
function desenhaArvore(ctx, x, y, t, cor = '#4f8f3a', baobab = false) {
  if (desenhaNatureza(ctx, baobab ? 'imbondeiro' : especieArvore(x, y, cor), x, y, t, baobab ? 0.004 : 0.012)) return;
  const [bx, by] = iso(x + 0.5, y + 0.5);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(bx + 5, by, 22, 9, 0, 0, 7); ctx.fill();
  if (baobab) {
    ctx.fillStyle = '#8b7360'; poly(ctx, [[bx - 9, by], [bx + 9, by], [bx + 7, by - 34], [bx - 7, by - 34]], '#8b7360');
    ctx.strokeStyle = '#8b7360'; ctx.lineWidth = 3;
    [[-14, -50], [-4, -54], [6, -52], [15, -46]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(bx, by - 32); ctx.lineTo(bx + dx, by + dy); ctx.stroke(); });
    ctx.fillStyle = '#6f9a45';
    [[-15, -52], [-4, -57], [7, -55], [16, -48]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(bx + dx, by + dy, 7, 0, 7); ctx.fill(); });
    return;
  }
  ctx.fillStyle = '#6d4c2e'; ctx.fillRect(bx - 3, by - 22, 6, 22);
  const s = Math.sin(t + x * 3) * 0.8;
  ctx.fillStyle = shade(cor, -0.15); ctx.beginPath(); ctx.arc(bx - 8 + s, by - 30, 12, 0, 7); ctx.fill();
  ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(bx + 6 + s, by - 34, 13, 0, 7); ctx.fill();
  ctx.fillStyle = shade(cor, 0.12); ctx.beginPath(); ctx.arc(bx - 1 + s, by - 42, 11, 0, 7); ctx.fill();
}
// carros estacionados na cidade → modelos 3D (carros comuns; a cor escolhe o modelo)
const CARRO_RUA = { '#c0392b': 'citadino', '#2c6fb0': 'sedan', '#eeeeee': 'pickup', '#222222': 'jipe', '#7f8c8d': 'carro', '#f5b81c': 'citadino' };
function desenhaCarro(ctx, x, y, cor, rot = 0, tipo = 'carro') {
  if (!rot && typeof desenhaModelo === 'function' && desenhaModelo(ctx, tipo === 'candongueiro' ? 'carrinha' : (CARRO_RUA[cor] || 'sedan'), x, y)) return;
  // ocupa 1x2 (rot 0, ao longo de y) ou 2x1 (rot 1)
  const w = rot ? 1.7 : 0.8, d = rot ? 0.8 : 1.7, ox = x + (rot ? 0.15 : 0.1), oy = y + (rot ? 0.1 : 0.15);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; losango(ctx, ox + 0.05, oy + 0.05, w, d, 'rgba(0,0,0,.22)');
  if (tipo === 'candongueiro') {
    caixa(ctx, ox, oy, w, d, 22, '#f2f2f2', 3);
    // faixa azul, tão luandense
    if (rot) naFaceX(ctx, ox + w, oy, d, 0, d, 9, 15, '#2a62c9'); else naFaceY(ctx, ox, oy + d, w, 0, w, 9, 15, '#2a62c9');
    if (rot) naFaceY(ctx, ox, oy + d, w, 0.15, w - 0.15, 9, 15, '#2a62c9'); else naFaceX(ctx, ox + w, oy, d, 0.15, d - 0.15, 9, 15, '#2a62c9');
    if (rot) naFaceY(ctx, ox, oy + d, w, 0.2, w - 0.3, 16, 23, '#24323d'); else naFaceX(ctx, ox + w, oy, d, 0.2, d - 0.3, 16, 23, '#24323d');
    return;
  }
  caixa(ctx, ox, oy, w, d, 10, cor, 3);
  const cw = rot ? w * 0.5 : w * 0.9, cd = rot ? d * 0.9 : d * 0.5;
  caixa(ctx, ox + (w - cw) / 2, oy + (d - cd) / 2, cw, cd, 8, '#2b3a46', 13, { topo: shade(cor, 0.1) });
}
function desenhaCandeeiroRua(ctx, x, y, noite) {
  const [bx, by] = iso(x + 0.5, y + 0.5);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(bx - 1.5, by - 48, 3, 48); ctx.fillRect(bx - 1.5, by - 48, 10, 3);
  ctx.fillStyle = noite ? '#ffe9a0' : '#ddd'; ctx.fillRect(bx + 5, by - 46, 6, 3);
  if (noite) { const g = ctx.createRadialGradient(bx + 8, by - 40, 2, bx + 8, by - 20, 50); g.addColorStop(0, 'rgba(255,220,130,.35)'); g.addColorStop(1, 'rgba(255,220,130,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx + 8, by - 8, 46, 24, 0, 0, 7); ctx.fill(); }
}

/* ---------- edifícios ---------- */
// b: {x,y,w,d,h,cor,telhado,porta:'y'|'x', nome, emoji, janelas:true}
/* ---------- 🏢 prédios em 3D fotografado (tools/modelos/predios.py → img/modelos/predios/) ----------
   Cada combinação (tipo, tamanho, altura, cor, telhado, porta, toldo, antena, tanque) tem um id; se a imagem já chegou,
   desenha-se a fotografia (e, à noite, as janelas acesas por cima); senão, o desenho antigo. */
function specPredio(kind, e) { return { k: kind, w: e.w, d: e.d, h: e.h, cor: e.cor, t: e.telhado || '', p: e.porta || '', to: e.toldo || '', an: !!e.antena, ta: !!e.tanque }; }
function idPredio(sp) {
  const s = [sp.k, sp.w, sp.d, sp.h, sp.cor, sp.t, sp.p, sp.to, sp.an ? 1 : 0, sp.ta ? 1 : 0].join('|');
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'p' + h.toString(36);
}
const PRED3D = { idx: null, img: new Map() };
function predioImg(n) {
  let im = PRED3D.img.get(n);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = 'img/modelos/predios/' + n + '.webp'; PRED3D.img.set(n, im); seguirCarga(im); }
  return im.complete && im.naturalWidth ? im : null;
}
function desenhaPredio3D(ctx, kind, b, noite) {
  if (PRED3D.idx === null) { PRED3D.idx = 'a carregar'; fetch('img/modelos/predios/indice.json').then(r => r.json()).then(j => { PRED3D.idx = j; }).catch(() => { PRED3D.idx = {}; }); return false; }
  if (typeof PRED3D.idx !== 'object') return false;
  const id = idPredio(specPredio(kind, b)), e = PRED3D.idx[id], r = e?.rot?.[VR]; if (!r) return false;
  const im = predioImg(`${id}_r${VR}`); if (!im) return false;
  const [sx, sy] = iso(b.x, b.y, 0);
  ctx.drawImage(im, sx - r.ax / 2, sy - r.ay / 2, r.w / 2, r.h / 2);
  const n = e.noite?.[VR];
  if (noite && n) { const ln = predioImg(`${id}_n${VR}`); if (ln) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(ln, sx - n.ax / 2, sy - n.ay / 2, n.w / 2, n.h / 2); ctx.restore(); } }
  return true;
}
function desenhaEdificio(ctx, b, noite, kind = 'edificio') {
  if (b.h > 8 && desenhaPredio3D(ctx, kind, b, noite)) return;
  const { x, y, w, d, h, cor } = b;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; losango(ctx, x + 0.15, y + 0.15, w + 0.2, d + 0.2, 'rgba(0,0,0,.18)');
  caixa(ctx, x, y, w, d, h, cor, 0, { topo: b.telhado === 'plano' ? shade(cor, 0.25) : undefined });
  // janelas
  const andares = Math.max(1, Math.floor((h - 8) / 26));
  const jan = noite ? '#ffd970' : '#2f4a5c';
  for (let a = 0; a < andares; a++) {
    const v0 = 10 + a * 26, v1 = v0 + 12;
    if (v1 > h - 4) break;
    for (let u = 0.25; u < d - 0.3; u += 0.75) { if (a === 0 && b.porta === 'x' && Math.abs(u + 0.25 - d / 2) < 0.6) continue; naFaceX(ctx, x + w, y, d, u, u + 0.4, v0, v1, (noite && ((u * 7 + a) | 0) % 3 === 0) ? '#3a3f45' : jan); }
    for (let u = 0.25; u < w - 0.3; u += 0.75) { if (a === 0 && b.porta !== 'x' && Math.abs(u + 0.25 - w / 2) < 0.6) continue; naFaceY(ctx, x, y + d, w, u, u + 0.4, v0, v1, (noite && ((u * 5 + a) | 0) % 3 === 1) ? '#3a3f45' : jan); }
  }
  // porta
  if (b.porta === 'x') naFaceX(ctx, x + w, y, d, d / 2 - 0.3, d / 2 + 0.3, 0, 20, '#3b2a1e');
  else naFaceY(ctx, x, y + d, w, w / 2 - 0.3, w / 2 + 0.3, 0, 20, '#3b2a1e');
  // toldo colorido por cima da porta
  if (b.toldo) {
    if (b.porta === 'x') naFaceX(ctx, x + w, y, d, d / 2 - 0.6, d / 2 + 0.6, 22, 28, b.toldo);
    else naFaceY(ctx, x, y + d, w, w / 2 - 0.6, w / 2 + 0.6, 22, 28, b.toldo);
  }
  // telhados
  if (b.telhado === 'zinco') {
    const tz = h;
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    for (let u = 0.2; u < w; u += 0.3) { const p1 = iso(x + u, y, tz), p2 = iso(x + u, y + d, tz); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); }
  } else if (b.telhado === 'telha') {
    const tz = h, mid = d / 2;
    const A = iso(x, y, tz), B = iso(x + w, y, tz), C = iso(x + w, y + d, tz), D = iso(x, y + d, tz);
    const M1 = iso(x, y + mid, tz + 18), M2 = iso(x + w, y + mid, tz + 18);
    poly(ctx, [A, B, M2, M1], '#a8432a'); poly(ctx, [M1, M2, C, D], '#c4553a');
    poly(ctx, [B, C, M2], '#8f3420');
  } else if (b.telhado === 'plano') {
    // muro do terraço
    const z = h; ctx.strokeStyle = shade(cor, -0.05); ctx.lineWidth = 2;
    const A = iso(x + 0.1, y + 0.1, z + 3), B = iso(x + w - 0.1, y + 0.1, z + 3), C = iso(x + w - 0.1, y + d - 0.1, z + 3), D = iso(x + 0.1, y + d - 0.1, z + 3);
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.lineTo(...D); ctx.closePath(); ctx.stroke();
    if (b.antena) { const [ax, ay] = iso(x + w * 0.3, y + d * 0.3, z); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.ellipse(ax, ay - 6, 6, 4, -0.4, 0, 7); ctx.fill(); }
    if (b.tanque) caixa(ctx, x + w * 0.6, y + 0.3, 0.6, 0.6, 12, '#3a6fb0', z);
  }
}

/* ---------- móveis ---------- */
// m: {tipo, cor, w, d (já rodados), rot}; desenha na posição (x,y) do chão da casa
function desenhaMovel(ctx, tipo, x, y, w, d, rot, cor, t) {
  const madeira = '#8a5a32';
  rot = rot || 0;
  const r1 = rot % 2 === 1, flip = rot >= 2;
  // rotações 2 e 3 = o mesmo móvel virado ao contrário (a frente fica para a parede do fundo)
  const C = (X, Y, W, D, h, c, z, o) => {
    if (rot === 2) Y = y + d - (Y - y) - D;
    if (rot === 3) X = x + w - (X - x) - W;
    caixa(ctx, X, Y, W, D, h, c, z, o);
  };
  const NY = (...a) => { if (!flip) naFaceY(ctx, ...a); }, NX = (...a) => { if (!flip) naFaceX(ctx, ...a); };
  switch (tipo) {
    case 'cama': {
      C(x + 0.05, y + 0.05, w - 0.1, d - 0.1, 9, madeira);
      C(x + 0.08, y + 0.08, w - 0.16, d - 0.16, 5, '#f4efe6', 9);
      // cobertor na parte da frente
      if (r1) C(x + 0.08 + (w - 0.16) * 0.4, y + 0.08, (w - 0.16) * 0.6, d - 0.16, 2, cor, 14);
      else C(x + 0.08, y + 0.08 + (d - 0.16) * 0.4, w - 0.16, (d - 0.16) * 0.6, 2, cor, 14);
      // almofada
      if (r1) C(x + 0.12, y + 0.2, 0.3, d - 0.4, 4, '#ffffff', 14); else C(x + 0.2, y + 0.12, w - 0.4, 0.3, 4, '#ffffff', 14);
      if (cor === '#c9b9a0') break; // colchão: sem cabeceira
      if (r1) C(x + 0.05, y + 0.05, 0.12, d - 0.1, 26, madeira); else C(x + 0.05, y + 0.05, w - 0.1, 0.12, 26, madeira);
      break;
    }
    case 'sofa': {
      C(x + 0.08, y + 0.08, w - 0.16, d - 0.16, 12, cor);
      if (r1) C(x + 0.08, y + 0.08, 0.25, d - 0.16, 26, shade(cor, -0.1)); else C(x + 0.08, y + 0.08, w - 0.16, 0.25, 26, shade(cor, -0.1));
      if (r1) { C(x + 0.08, y + 0.08, w - 0.16, 0.18, 18, cor); C(x + 0.08, y + d - 0.26, w - 0.16, 0.18, 18, cor); }
      else { C(x + 0.08, y + 0.08, 0.18, d - 0.16, 18, cor); C(x + w - 0.26, y + 0.08, 0.18, d - 0.16, 18, cor); }
      break;
    }
    case 'tv': {
      C(x + 0.1, y + 0.2, 0.8, 0.6, 12, '#5a3a22');
      if (r1) C(x + 0.3, y + 0.1, 0.12, 0.8, 26, '#151515', 12, { frente: '#151515' });
      else C(x + 0.1, y + 0.3, 0.8, 0.12, 26, '#151515', 12, { lado: '#151515' });
      const brilho = `hsl(${(t * 40) % 360},55%,${45 + Math.sin(t * 3) * 8}%)`;
      if (r1) NX(x + 0.42, y + 0.1, 0.8, 0.07, 0.73, 15, 35, brilho); else NY(x + 0.1, y + 0.42, 0.8, 0.07, 0.73, 15, 35, brilho);
      break;
    }
    case 'som': C(x + 0.2, y + 0.2, 0.6, 0.6, 30, '#1c1c1c');
      if (r1) { NX(x + 0.8, y + 0.2, 0.6, 0.15, 0.45, 6, 14, '#555'); NX(x + 0.8, y + 0.2, 0.6, 0.15, 0.45, 18, 26, '#555'); }
      else { NY(x + 0.2, y + 0.8, 0.6, 0.15, 0.45, 6, 14, '#555'); NY(x + 0.2, y + 0.8, 0.6, 0.15, 0.45, 18, 26, '#555'); }
      break;
    case 'mesa':
      [[0.15, 0.15], [w - 0.25, 0.15], [0.15, d - 0.25], [w - 0.25, d - 0.25]].forEach(([a, b]) => C(x + a, y + b, 0.1, 0.1, 16, shade(cor, -0.2)));
      C(x + 0.1, y + 0.1, w - 0.2, d - 0.2, 3, cor, 16); break;
    case 'cadeira': C(x + 0.25, y + 0.25, 0.5, 0.5, 3, cor, 11);
      [[0.27, 0.27], [0.63, 0.27], [0.27, 0.63], [0.63, 0.63]].forEach(([a, b]) => C(x + a, y + b, 0.08, 0.08, 11, shade(cor, -0.2)));
      if (r1) C(x + 0.25, y + 0.25, 0.08, 0.5, 26, cor); else C(x + 0.25, y + 0.25, 0.5, 0.08, 26, cor);
      break;
    case 'fogao': C(x + 0.1, y + 0.1, 0.8, 0.8, 24, '#ececec');
      [[0.3, 0.3], [0.65, 0.3], [0.3, 0.65], [0.65, 0.65]].forEach(([a, b]) => { const [px, py] = iso(x + a, y + b, 24); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(px, py, 6, 3, 0, 0, 7); ctx.fill(); });
      NY(x + 0.1, y + 0.9, 0.8, 0.15, 0.65, 4, 16, '#333'); break;
    case 'frigorifico': C(x + 0.1, y + 0.1, 0.8, 0.8, 52, '#f2f2f2');
      NY(x + 0.1, y + 0.9, 0.8, 0.05, 0.75, 34, 35.5, '#bbb'); NY(x + 0.1, y + 0.9, 0.8, 0.6, 0.66, 18, 30, '#999'); break;
    case 'chuveiro': losango(ctx, x + 0.05, y + 0.05, 0.9, 0.9, '#bfe3f2'); C(x + 0.05, y + 0.05, 0.9, 0.9, 2, '#9fd3ea');
      ctx.globalAlpha = 0.35; C(x + 0.05, y + 0.05, 0.9, 0.9, 56, '#cfefff'); ctx.globalAlpha = 1;
      C(x + 0.1, y + 0.1, 0.06, 0.06, 60, '#aaa'); break;
    case 'estante': C(x + 0.1, y + 0.2, 0.8, 0.6, 52, cor);
      for (let s = 0; s < 4; s++) for (let b = 0; b < 5; b++) NY(x + 0.1, y + 0.8, 0.8, 0.08 + b * 0.14, 0.18 + b * 0.14, 6 + s * 12, 15 + s * 12, ['#c0392b', '#2c6fb0', '#f5b81c', '#2f8f5b', '#eee'][(b + s) % 5]);
      break;
    case 'ventoinha': { C(x + 0.4, y + 0.4, 0.2, 0.2, 3, '#ddd'); C(x + 0.47, y + 0.47, 0.06, 0.06, 36, '#bbb');
      const [px, py] = iso(x + 0.5, y + 0.5, 42); ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(200,220,230,.8)'; for (let i = 0; i < 3; i++) { const a = t * 15 + i * 2.1; ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 5, py + Math.sin(a) * 5, 5, 2.5, a, 0, 7); ctx.fill(); }
      break; }
    case 'ac': C(x + 0.15, y + 0.25, 0.7, 0.5, 44, '#f5f5f5');
      for (let i = 0; i < 4; i++) NY(x + 0.15, y + 0.75, 0.7, 0.1, 0.6, 30 + i * 3, 31 + i * 3, '#bbb'); break;
    case 'planta': C(x + 0.35, y + 0.35, 0.3, 0.3, 10, '#b5653a');
      { const [px, py] = iso(x + 0.5, y + 0.5, 18); ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.fillStyle = shade(cor, 0.2); ctx.beginPath(); ctx.arc(px - 3, py - 4, 5, 0, 7); ctx.fill(); }
      break;
    case 'palmeira': C(x + 0.32, y + 0.32, 0.36, 0.36, 12, '#c47a2c');
      { const [px, py] = iso(x + 0.5, y + 0.5, 12); ctx.strokeStyle = '#7a5a33'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2, py - 26); ctx.stroke();
        ctx.fillStyle = cor; for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(px + 2, py - 26); ctx.rotate(i * 1.05 + Math.sin(t) * 0.05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -4, 16, 4); ctx.quadraticCurveTo(8, 1, 0, 0); ctx.fill(); ctx.restore(); } }
      break;
    case 'candeeiro': C(x + 0.4, y + 0.4, 0.2, 0.2, 2, '#444'); C(x + 0.47, y + 0.47, 0.06, 0.06, 38, '#666');
      C(x + 0.33, y + 0.33, 0.34, 0.34, 12, cor, 34); break;
    case 'tapete': losango(ctx, x + 0.1, y + 0.1, w - 0.2, d - 0.2, cor);
      losango(ctx, x + 0.3, y + 0.3, w - 0.6, d - 0.6, shade(cor, 0.25)); losango(ctx, x + 0.5, y + 0.5, w - 1, d - 1, cor); break;
    case 'quadro': C(x + 0.2, y + 0.4, 0.6, 0.12, 4, '#5a3a22');
      C(x + 0.25, y + 0.45, 0.5, 0.06, 34, '#e0b03a', 4); NY(x + 0.25, y + 0.51, 0.5, 0.06, 0.44, 8, 30, '#2a7fa8'); NY(x + 0.25, y + 0.51, 0.5, 0.1, 0.4, 8, 14, '#e6cf98'); break;
    default: C(x + 0.1, y + 0.1, w - 0.2, d - 0.2, 20, cor);
  }
}

/* ---------- caminho (A*) ---------- */
function caminho(bloq, W, H, sx, sy, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
  if (bloq[ty * W + tx]) return null;
  const idx = (x, y) => y * W + x;
  const g = new Float32Array(W * H).fill(Infinity), de = new Int32Array(W * H).fill(-1), fechado = new Uint8Array(W * H);
  const aberto = [[0, sx, sy]]; g[idx(sx, sy)] = 0;
  const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  let n = 0;
  while (aberto.length && n++ < 6000) {
    let bi = 0; for (let i = 1; i < aberto.length; i++) if (aberto[i][0] < aberto[bi][0]) bi = i;
    const [, x, y] = aberto.splice(bi, 1)[0]; const k = idx(x, y);
    if (fechado[k]) continue; fechado[k] = 1;
    if (x === tx && y === ty) {
      const r = []; let c = k; while (c !== -1) { r.push([c % W, (c / W) | 0]); c = de[c]; }
      return suavizarCaminho(bloq, W, H, r.reverse());
    }
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nk = idx(nx, ny); if (bloq[nk] || fechado[nk]) continue;
      if (dx && dy && (bloq[idx(x + dx, y)] || bloq[idx(x, y + dy)])) continue;
      const ng = g[k] + (dx && dy ? 1.414 : 1);
      if (ng < g[nk]) { g[nk] = ng; de[nk] = k; aberto.push([ng + h(nx, ny), nx, ny]); }
    }
  }
  return null;
}
// caminho direito: tira os pontos intermédios sempre que a linha reta entre dois pontos está livre (com folga para o corpo),
// para as pessoas andarem em linha reta em qualquer ângulo em vez de aos ziguezagues pelos quadrados
function linhaLivre(bloq, W, H, a, b) {
  const ax = a[0] + 0.5, ay = a[1] + 0.5, bx = b[0] + 0.5, by = b[1] + 0.5, L = Math.hypot(bx - ax, by - ay);
  if (L < 1e-6) return true;
  const nx = -(by - ay) / L * 0.3, ny = (bx - ax) / L * 0.3, passos = Math.ceil(L / 0.2);
  for (let i = 0; i <= passos; i++) {
    const t = i / passos, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    for (const [ox, oy] of [[0, 0], [nx, ny], [-nx, -ny]]) {
      const cx = Math.floor(x + ox), cy = Math.floor(y + oy);
      if (cx < 0 || cy < 0 || cx >= W || cy >= H || bloq[cy * W + cx]) return false;
    }
  }
  return true;
}
function suavizarCaminho(bloq, W, H, r) {
  if (r.length < 3) return r;
  const out = [r[0]]; let i = 0;
  while (i < r.length - 1) {
    let j = r.length - 1;
    while (j > i + 1 && !linhaLivre(bloq, W, H, r[i], r[j])) j--;
    out.push(r[j]); i = j;
  }
  return out;
}
// 8 direções no ecrã (para onde a pessoa está virada): E, SE, S, SO, O, NO, N, NE — ângulos das direções do mundo na vista
const DIR8 = [0, Math.atan2(16, 32), Math.PI / 2, Math.PI - Math.atan2(16, 32), Math.PI, -Math.PI + Math.atan2(16, 32), -Math.PI / 2, -Math.atan2(16, 32)];
function direcao8(ex, ey) {
  const a = Math.atan2(ey, ex); let melhor = 0, md = 9;
  DIR8.forEach((d, i) => { let df = Math.abs(a - d); if (df > Math.PI) df = 2 * Math.PI - df; if (df < md) { md = df; melhor = i; } });
  return melhor;
}
// tile livre mais próximo (para quando se toca num sítio bloqueado)
function livreProximo(bloq, W, H, x, y) {
  for (let r = 1; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (!bloq[ny * W + nx]) return [nx, ny];
  }
  return null;
}

/* ---------- ordenação isométrica ---------- */
// cada item: {x0,y0,x1,y1, sx0,sy0,sx1,sy1, draw()}
function ordenar(itens) {
  const n = itens.length, atras = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = itens[i], b = itens[j];
    if (a.sx1 < b.sx0 || b.sx1 < a.sx0 || a.sy1 < b.sy0 || b.sy1 < a.sy0) continue;
    const aAtras = a.x1 <= b.x0 + 1e-3 || a.y1 <= b.y0 + 1e-3;
    const bAtras = b.x1 <= a.x0 + 1e-3 || b.y1 <= a.y0 + 1e-3;
    if (aAtras && !bAtras) atras[j].push(i);
    else if (bAtras && !aAtras) atras[i].push(j);
    else if ((a.x0 + a.x1 + a.y0 + a.y1) < (b.x0 + b.x1 + b.y0 + b.y1)) atras[j].push(i); else atras[i].push(j);
  }
  const vis = new Uint8Array(n), out = [];
  const visita = i => { if (vis[i]) return; vis[i] = 1; for (const k of atras[i]) visita(k); out.push(itens[i]); };
  for (let i = 0; i < n; i++) visita(i);
  return out;
}
function retanguloEcra(x0, y0, x1, y1, h) {   // recebe coordenadas JÁ na vista
  const l = isoV(x0, y1)[0], r = isoV(x1, y0)[0], t = isoV(x0, y0)[1] - h, b = isoV(x1, y1)[1];
  return { sx0: l, sx1: r, sy0: t, sy1: b };
}
