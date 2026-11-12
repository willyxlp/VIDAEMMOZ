/* ============================================================
   Vida na Banda — ARTE DAS LISTAS
   Desenhos (no lugar dos emojis) para a comida, o lazer, os
   empregos e o retrato de cada edifício no topo do painel.
   Tudo desenhado num espaço de 120×96 e guardado em cache.
   ============================================================ */
const _AL = {
  sombra(c, x, y, rx, ry, a = .22) { c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); },
  elipse(c, x, y, rx, ry, cor, rot = 0) { c.fillStyle = cor; c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, 7); c.fill(); },
  grad(c, x0, y0, x1, y1, ...cores) { const g = c.createLinearGradient(x0, y0, x1, y1); cores.forEach((k, i) => g.addColorStop(i / (cores.length - 1), k)); return g; },
  rad(c, x, y, r, a, b) { const g = c.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; },
  forma(c, pts, cor) { c.fillStyle = cor; c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p => c.lineTo(...p)); c.closePath(); c.fill(); },
  rr(c, x, y, w, h, r, cor) { c.fillStyle = cor; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); },
  linha(c, pts, cor, lw = 2) { c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p => c.lineTo(...p)); c.stroke(); },
  // prato visto de cima, inclinado
  prato(c, x, y, r, cor = '#f4f1ea') {
    _AL.sombra(c, x + 2, y + 5, r + 3, r * .42 + 3);
    _AL.elipse(c, x, y + 2, r, r * .42, shade(cor, -.18));
    _AL.elipse(c, x, y, r, r * .42, cor);
    _AL.elipse(c, x, y + 1, r * .72, r * .3, shade(cor, -.06));
  },
  tigela(c, x, y, r, caldo, cor = '#c9673a') {
    _AL.sombra(c, x + 2, y + r * .75, r + 2, r * .3);
    c.fillStyle = _AL.grad(c, x - r, 0, x + r, 0, shade(cor, .15), cor, shade(cor, -.3));
    c.beginPath(); c.ellipse(x, y, r, r * .38, 0, 0, Math.PI); c.lineTo(x - r, y); c.bezierCurveTo(x - r, y + r * .9, x + r, y + r * .9, x + r, y); c.fill();
    _AL.elipse(c, x, y, r, r * .38, shade(cor, -.25));
    _AL.elipse(c, x, y + 1, r * .88, r * .32, caldo);
  },
  panela(c, x, y, r, caldo) {
    _AL.sombra(c, x + 2, y + r * .95, r + 4, r * .3);
    c.fillStyle = _AL.grad(c, x - r, 0, x + r, 0, '#8a8f96', '#5c6168', '#34383d');
    c.fillRect(x - r, y, r * 2, r * .8); _AL.elipse(c, x, y + r * .8, r, r * .36, '#34383d');
    _AL.elipse(c, x, y, r, r * .36, '#2b2e33'); _AL.elipse(c, x, y + 1, r * .9, r * .3, caldo);
    [[-1, 1], [1, -1]].forEach(([s]) => { c.fillStyle = '#2b2e33'; c.fillRect(x + s * r - (s > 0 ? 0 : 6), y + 5, 6, 3); });
  },
  funge(c, x, y, r, cor = '#ece6d6') {
    c.fillStyle = _AL.rad(c, x, y, r, '#fffdf6', cor);
    c.beginPath(); c.ellipse(x, y, r, r * .8, 0, Math.PI, 0); c.ellipse(x, y, r, r * .35, 0, 0, Math.PI); c.fill();
  },
  peixe(c, x, y, L, cor = '#9aa6ad', rot = 0, grelhado = false) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = _AL.grad(c, 0, -L * .2, 0, L * .2, shade(cor, .25), cor, shade(cor, -.3));
    c.beginPath(); c.moveTo(-L / 2, 0); c.quadraticCurveTo(-L * .1, -L * .26, L * .3, -L * .04); c.lineTo(L / 2, -L * .17); c.lineTo(L / 2 - 2, 0); c.lineTo(L / 2, L * .17); c.lineTo(L * .3, L * .04); c.quadraticCurveTo(-L * .1, L * .26, -L / 2, 0); c.fill();
    _AL.elipse(c, -L * .33, -L * .03, 1.6, 1.6, '#1a1a1a');
    if (grelhado) for (let i = -2; i <= 2; i++) _AL.linha(c, [[i * L * .1 - 2, -L * .12], [i * L * .1 + 3, L * .12]], 'rgba(40,20,10,.55)', 1.6);
    c.restore();
  },
  pedaco(c, x, y, r, cor) { c.fillStyle = _AL.rad(c, x, y, r, shade(cor, .3), shade(cor, -.25)); c.beginPath(); c.ellipse(x, y, r * 1.15, r * .8, .3, 0, 7); c.fill(); },
  ceu(c, a, b) { c.fillStyle = _AL.grad(c, 0, 0, 0, 70, a, b); c.fillRect(0, 0, 120, 96); },
  sol(c, x, y, r, cor = '#ffd34d') { _AL.elipse(c, x, y, r * 1.8, r * 1.8, 'rgba(255,220,120,.25)'); _AL.elipse(c, x, y, r, r, cor); },
  mar(c, y, a = '#2a9fd6', b = '#1b6fa8') { c.fillStyle = _AL.grad(c, 0, y, 0, 96, a, b); c.fillRect(0, y, 120, 96 - y); for (let i = 0; i < 6; i++) _AL.linha(c, [[10 + i * 19, y + 6 + (i % 3) * 7], [20 + i * 19, y + 6 + (i % 3) * 7]], 'rgba(255,255,255,.45)', 1.4); },
  colinas(c, y, cor, amp = 10, fase = 0) { c.fillStyle = cor; c.beginPath(); c.moveTo(0, 96); for (let x = 0; x <= 120; x += 6) c.lineTo(x, y - Math.sin(x / 120 * Math.PI * 2 + fase) * amp - Math.sin(x / 31 + fase) * amp * .3); c.lineTo(120, 96); c.fill(); },
  palmeira(c, x, y, h, cor = '#2f8a46') {
    _AL.linha(c, [[x, y], [x + 3, y - h * .5], [x + 2, y - h]], '#7a5636', 3);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .55; c.save(); c.translate(x + 2, y - h); c.rotate(a); _AL.elipse(c, 9, 0, 10, 2.6, i % 2 ? cor : shade(cor, -.15), .25); c.restore(); }
  },
  pessoa(c, x, y, cor, esc = 1, bracos = 0) {
    c.save(); c.translate(x, y); c.scale(esc, esc);
    _AL.elipse(c, 0, -26, 4, 4, '#5b3a26');
    _AL.rr(c, -4, -21, 8, 12, 3, cor);
    _AL.linha(c, [[-2, -9], [-3, 0]], '#2a2a35', 3); _AL.linha(c, [[2, -9], [3, 0]], '#2a2a35', 3);
    _AL.linha(c, [[-4, -19], [-8, -14 - bracos * 8]], '#5b3a26', 2.4); _AL.linha(c, [[4, -19], [8, -14 - bracos * 8]], '#5b3a26', 2.4);
    c.restore();
  },
};

/* ---------- comida ---------- */
const ARTE_COMIDA = {
  cabrito(c) {
    _AL.prato(c, 60, 58, 40);
    [[44, 54, 9], [58, 50, 10], [72, 55, 9], [55, 62, 8], [69, 63, 8]].forEach(([x, y, r]) => _AL.pedaco(c, x, y, r, '#8a4a22'));
    _AL.linha(c, [[78, 47], [92, 42]], '#efe6d0', 3.5); _AL.elipse(c, 93, 41, 3, 2.4, '#efe6d0');
    [[40, 64], [48, 46], [84, 60], [62, 44]].forEach(([x, y]) => _AL.elipse(c, x, y, 2.5, 1.2, '#3f8a3a', .6));
    _AL.forma(c, [[30, 56], [38, 50], [38, 60]], '#f2d23a');
  },
  calulu_peixe(c) {
    _AL.tigela(c, 60, 50, 36, '#5a5a23');
    _AL.peixe(c, 56, 49, 34, '#d9cdb5', -.1);
    [[38, 52], [76, 46], [72, 55], [44, 45]].forEach(([x, y]) => { _AL.elipse(c, x, y, 4, 2.4, '#5d9a3c'); _AL.elipse(c, x, y, 1.6, 1, '#cfe0a5'); });
    _AL.elipse(c, 82, 52, 3, 2, '#d23c2a');
  },
  churrasco(c) {
    _AL.sombra(c, 62, 84, 40, 7);
    _AL.linha(c, [[30, 64], [26, 86]], '#3a3a3a', 3); _AL.linha(c, [[90, 64], [94, 86]], '#3a3a3a', 3);
    _AL.forma(c, [[18, 56], [102, 56], [92, 70], [28, 70]], '#2d2d2d');
    _AL.forma(c, [[22, 56], [98, 56], [94, 61], [26, 61]], '#e2541f');
    for (let i = 0; i < 3; i++) {
      const y = 44 + i * 5; _AL.linha(c, [[24, y + 4], [100, y - 2]], '#bbb', 1.6);
      for (let k = 0; k < 4; k++) { const x = 34 + k * 16, yy = y + 3 - k * 1.5; _AL.rr(c, x - 5, yy - 4, 10, 8, 3, k % 2 ? '#7d3a18' : (i === 1 ? '#3c9a3a' : '#c43d22')); }
    }
    _AL.linha(c, [[50, 30], [46, 22], [52, 14]], 'rgba(200,200,200,.6)', 3); _AL.linha(c, [[72, 28], [68, 20], [74, 10]], 'rgba(200,200,200,.45)', 3);
  },
  funge_bombo(c) {
    _AL.prato(c, 60, 58, 40);
    _AL.funge(c, 48, 56, 17, '#e2dccb');
    for (let i = 0; i < 7; i++) _AL.elipse(c, 70 + (i % 3) * 6, 52 + (i / 3 | 0) * 5, 7, 3, i % 2 ? '#2f6b2a' : '#3f8a35', .4);
    _AL.peixe(c, 76, 66, 22, '#b88a52', .1, true);
  },
  funge_calulu(c) {
    _AL.prato(c, 50, 62, 34);
    _AL.funge(c, 48, 60, 16, '#efd98a');
    _AL.tigela(c, 88, 48, 20, '#6b5a22', '#a85a2e');
    _AL.peixe(c, 86, 47, 18, '#d9cdb5', .2);
  },
  gelada(c) {
    _AL.sombra(c, 58, 84, 34, 6);
    c.fillStyle = _AL.grad(c, 30, 0, 58, 0, '#a35a14', '#6b3608', '#3d1d04');
    c.beginPath(); c.roundRect(30, 38, 26, 46, 5); c.fill(); c.fillRect(38, 16, 10, 24);
    c.beginPath(); c.moveTo(38, 40); c.quadraticCurveTo(30, 40, 30, 46); c.lineTo(56, 46); c.quadraticCurveTo(56, 40, 48, 40); c.fill();
    _AL.rr(c, 37, 12, 12, 6, 2, '#d8b23c');
    _AL.rr(c, 30, 52, 26, 18, 2, '#e8e2d2'); _AL.rr(c, 30, 56, 26, 9, 0, '#c8202a'); _AL.elipse(c, 43, 60.5, 5, 3, '#f5d23a');
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(34, 40, 3, 40);
    c.fillStyle = _AL.grad(c, 0, 40, 0, 84, '#f7c548', '#e09a12');
    c.beginPath(); c.moveTo(64, 42); c.lineTo(92, 42); c.lineTo(89, 84); c.lineTo(67, 84); c.fill();
    _AL.elipse(c, 78, 42, 14, 4, '#fffaf0'); _AL.elipse(c, 72, 40, 6, 4, '#fffaf0'); _AL.elipse(c, 84, 40, 6, 4, '#fffaf0');
    [[70, 58], [80, 66], [74, 74], [86, 54]].forEach(([x, y]) => _AL.elipse(c, x, y, 1.2, 1.2, 'rgba(255,255,255,.7)'));
  },
  jantar_fino(c) {
    _AL.prato(c, 52, 62, 38, '#ffffff');
    _AL.pedaco(c, 50, 58, 12, '#6b2f1c');
    _AL.linha(c, [[30, 66], [70, 70]], '#8c1d3a', 2.4);
    [[60, 52], [40, 54], [64, 62]].forEach(([x, y]) => _AL.elipse(c, x, y, 3, 1.5, '#4f9a3a', .7));
    _AL.elipse(c, 40, 64, 5, 3, '#f0a030');
    _AL.sombra(c, 96, 86, 10, 3);
    _AL.linha(c, [[96, 56], [96, 84]], 'rgba(230,240,245,.9)', 2.4); _AL.elipse(c, 96, 85, 9, 2.6, 'rgba(230,240,245,.9)');
    c.fillStyle = 'rgba(230,240,245,.55)'; c.beginPath(); c.moveTo(84, 22); c.lineTo(108, 22); c.quadraticCurveTo(110, 56, 96, 57); c.quadraticCurveTo(82, 56, 84, 22); c.fill();
    c.fillStyle = '#7a0f26'; c.beginPath(); c.moveTo(85, 36); c.lineTo(107, 36); c.quadraticCurveTo(108, 55, 96, 55); c.quadraticCurveTo(84, 55, 85, 36); c.fill();
  },
  marisco(c) {
    _AL.prato(c, 60, 60, 42, '#eef4f6');
    // lagosta
    c.save(); c.translate(54, 56); c.rotate(-.25);
    for (let i = 0; i < 5; i++) _AL.elipse(c, -12 + i * 7, 0, 5.5, 7 - i * .6, i % 2 ? '#d8402a' : '#e9553a');
    _AL.elipse(c, 22, 0, 9, 7, '#c9331f'); _AL.forma(c, [[-15, 0], [-24, -7], [-24, 7]], '#c9331f');
    _AL.linha(c, [[28, -3], [44, -16]], '#c9331f', 1.4); _AL.linha(c, [[28, 3], [46, -6]], '#c9331f', 1.4);
    _AL.elipse(c, 32, 10, 7, 4, '#d8402a', .4); _AL.elipse(c, 30, -10, 7, 4, '#d8402a', -.4);
    c.restore();
    [[34, 70], [78, 70], [88, 58]].forEach(([x, y]) => { c.strokeStyle = '#f08a4b'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, 5, .3, 3.6); c.stroke(); });
    _AL.forma(c, [[92, 46], [100, 40], [102, 50]], '#f2d23a');
  },
  milho_assado(c) {
    _AL.sombra(c, 60, 82, 44, 8);
    for (let i = 0; i < 14; i++) _AL.elipse(c, 22 + i * 6, 78 + (i % 3), 5, 3, i % 3 ? '#3a2a20' : '#ff7a1a');
    _AL.elipse(c, 60, 76, 40, 6, 'rgba(255,120,30,.25)');
    c.save(); c.translate(60, 54); c.rotate(-.35);
    c.fillStyle = '#e8d49a'; c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(-46, -8, -54, -14); c.quadraticCurveTo(-44, -2, -40, 8); c.fill();
    c.fillStyle = _AL.grad(c, 0, -11, 0, 11, '#ffe27a', '#f2b51c', '#c48a0a'); c.beginPath(); c.roundRect(-38, -11, 76, 22, 11); c.fill();
    for (let r = -1; r <= 1; r++) for (let k = 0; k < 11; k++) _AL.elipse(c, -32 + k * 6.4, r * 6.5, 2.6, 2.6, (k * 7 + r * 3) % 5 === 0 ? '#5a3410' : (k + r) % 2 ? '#ffd451' : '#f0b52a');
    c.restore();
  },
  muamba(c) {
    _AL.panela(c, 60, 46, 38, '#d8541a');
    [[46, 46], [62, 42], [74, 49], [54, 52]].forEach(([x, y]) => _AL.pedaco(c, x, y, 7, '#c98a4a'));
    [[38, 44], [80, 42], [66, 52]].forEach(([x, y]) => { _AL.elipse(c, x, y, 3.5, 2.2, '#5d9a3c'); _AL.elipse(c, x, y, 1.4, .9, '#cfe0a5'); });
    _AL.linha(c, [[60, 30], [56, 22], [62, 14]], 'rgba(220,220,220,.55)', 3);
  },
  mufete(c) {
    _AL.prato(c, 60, 60, 44);
    _AL.peixe(c, 58, 54, 52, '#a07c4e', -.12, true);
    for (let i = 0; i < 9; i++) _AL.elipse(c, 30 + (i % 3) * 5, 66 + (i / 3 | 0) * 3, 2.6, 1.8, '#6b3a1c');
    [[78, 68], [86, 64], [92, 60]].forEach(([x, y]) => _AL.elipse(c, x, y, 5, 3, '#f2c94c', .5));
    [[48, 70], [58, 72], [66, 70]].forEach(([x, y]) => { c.strokeStyle = '#c45a8a'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x, y, 4, 2, 0, 0, 7); c.stroke(); });
  },
  mwambe(c) {
    _AL.panela(c, 60, 46, 38, '#e0661f');
    _AL.peixe(c, 56, 46, 36, '#e8d6b4', .15);
    [[78, 44], [40, 42], [72, 52]].forEach(([x, y]) => _AL.elipse(c, x, y, 3, 2, '#3f8a35'));
    _AL.elipse(c, 84, 50, 3, 2.4, '#c8202a');
  },
  pao_chourico(c) {
    _AL.sombra(c, 60, 78, 44, 8);
    c.fillStyle = _AL.grad(c, 0, 34, 0, 78, '#f2c06a', '#d48a2c', '#9a5a18');
    c.beginPath(); c.ellipse(60, 58, 46, 22, -.08, 0, 7); c.fill();
    for (let i = 0; i < 4; i++) _AL.elipse(c, 30 + i * 20, 54 - i * 1.6, 7, 2.2, '#f7dca0', -.5);
    _AL.forma(c, [[18, 62], [102, 56], [100, 64], [20, 70]], '#f4e2b8');
    for (let i = 0; i < 6; i++) { _AL.elipse(c, 26 + i * 13, 64 - i * .7, 6, 4.2, '#a32418'); _AL.elipse(c, 26 + i * 13, 64 - i * .7, 3.6, 2.4, '#c9442c'); _AL.elipse(c, 27 + i * 13, 63 - i * .7, 1, .8, '#f0c0a0'); }
  },
  peixe_seco(c) {
    _AL.prato(c, 60, 60, 42);
    _AL.funge(c, 44, 58, 15, '#e2dccb');
    _AL.peixe(c, 74, 58, 40, '#8a7458', -.35);
    for (let i = 0; i < 5; i++) _AL.linha(c, [[64 + i * 5, 52 - i * 2], [66 + i * 5, 64 - i * 2]], 'rgba(60,40,20,.35)', 1.2);
  },
};

/* ---------- lazer: postais ---------- */
const ARTE_LAZER = {
  arco(c) {
    _AL.ceu(c, '#7cc4ef', '#d9efff'); _AL.colinas(c, 70, '#e4b97a', 4);
    c.fillStyle = '#c26a3a'; c.beginPath(); c.moveTo(24, 74); c.lineTo(30, 30); c.quadraticCurveTo(60, 14, 92, 30); c.lineTo(98, 74); c.lineTo(80, 74); c.lineTo(78, 48); c.quadraticCurveTo(60, 36, 44, 48); c.lineTo(42, 74); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(80, 40, 18, 34);
    _AL.mar(c, 74, '#3fb6c9', '#2a8aa8');
  },
  baia_azul(c) {
    _AL.ceu(c, '#5db7ef', '#c9ecff'); _AL.sol(c, 96, 18, 7);
    _AL.mar(c, 44, '#22a6d8', '#0d6aa5');
    c.fillStyle = '#f2dca6'; c.beginPath(); c.moveTo(0, 96); c.lineTo(0, 66); c.quadraticCurveTo(60, 56, 120, 74); c.lineTo(120, 96); c.fill();
    _AL.linha(c, [[48, 82], [52, 56]], '#eee', 2);
    c.fillStyle = '#e0313f'; c.beginPath(); c.moveTo(34, 60); c.quadraticCurveTo(52, 44, 70, 56); c.closePath(); c.fill();
    _AL.rr(c, 62, 76, 18, 5, 2, '#2a62c9');
  },
  bola(c) {
    _AL.ceu(c, '#3a2a24', '#1c1412');
    _AL.rr(c, 14, 10, 92, 54, 4, '#111'); _AL.rr(c, 17, 13, 86, 48, 2, '#2f9a48');
    for (let i = 0; i < 4; i++) c.fillStyle = 'rgba(255,255,255,.08)', c.fillRect(17 + i * 22, 13, 11, 48);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2; c.strokeRect(21, 17, 78, 40); _AL.linha(c, [[60, 17], [60, 57]], 'rgba(255,255,255,.8)', 1.2); c.beginPath(); c.arc(60, 37, 8, 0, 7); c.stroke();
    _AL.elipse(c, 72, 42, 3.2, 3.2, '#fff');
    _AL.pessoa(c, 46, 46, '#e0313f', .7); _AL.pessoa(c, 80, 40, '#2a62c9', .7);
    _AL.rr(c, 0, 72, 120, 24, 0, '#6b4226'); _AL.rr(c, 0, 70, 120, 5, 0, '#8a5a32');
    [[30, 56], [86, 54]].forEach(([x]) => { _AL.rr(c, x, 54, 8, 18, 2, '#6b3608'); _AL.rr(c, x + 2, 48, 4, 8, 1, '#6b3608'); _AL.rr(c, x, 60, 8, 5, 0, '#c8202a'); });
  },
  cristo_rei(c) {
    _AL.ceu(c, '#ff9e5a', '#ffe1a8'); _AL.sol(c, 24, 54, 9, '#fff1c0');
    _AL.colinas(c, 72, '#4f6e3a', 8); _AL.colinas(c, 80, '#3a542a', 5, 2);
    _AL.rr(c, 52, 50, 16, 26, 1, '#e8e2d6'); _AL.rr(c, 48, 74, 24, 6, 1, '#d6cfc0');
    _AL.rr(c, 56, 22, 8, 30, 3, '#f6f2ea'); _AL.elipse(c, 60, 18, 4.2, 4.6, '#f6f2ea');
    _AL.rr(c, 38, 26, 44, 5, 2.5, '#f6f2ea');
  },
  deserto(c) {
    _AL.ceu(c, '#7cc4ef', '#fde4b2'); _AL.sol(c, 90, 20, 8);
    _AL.colinas(c, 58, '#e8a557', 10); _AL.colinas(c, 72, '#d58a3d', 8, 2); _AL.colinas(c, 86, '#c4772d', 5, 4);
    _AL.elipse(c, 34, 80, 10, 3, '#4f6a2c'); for (let i = 0; i < 5; i++) _AL.elipse(c, 26 + i * 4, 79, 6, 1.5, '#5f7f34', (i - 2) * .4);
  },
  jetski(c) {
    _AL.ceu(c, '#5db7ef', '#d6f0ff'); _AL.mar(c, 40, '#28a8d8', '#0d5f99');
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(16, 70); c.quadraticCurveTo(40, 60, 62, 66); c.lineTo(60, 72); c.quadraticCurveTo(38, 70, 16, 74); c.fill();
    c.fillStyle = '#ffcb00'; c.beginPath(); c.moveTo(56, 70); c.lineTo(100, 62); c.quadraticCurveTo(106, 66, 98, 72); c.lineTo(60, 76); c.fill();
    _AL.rr(c, 68, 58, 18, 6, 3, '#141414'); _AL.pessoa(c, 78, 60, '#e0313f', .8, .6);
  },
  kalandula(c) {
    _AL.ceu(c, '#7cc4ef', '#e2f4ff');
    _AL.rr(c, 0, 24, 120, 12, 0, '#3f8a35'); c.fillStyle = '#6b5236'; c.fillRect(0, 34, 120, 40);
    for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,255,255,${.75 + (i % 2) * .2})`; c.fillRect(20 + i * 9, 32, 6, 44); }
    _AL.mar(c, 72, '#4ab0d0', '#2a7fa0');
    for (let i = 0; i < 8; i++) _AL.elipse(c, 22 + i * 11, 72, 10, 6, 'rgba(255,255,255,.75)');
    _AL.colinas(c, 30, 'rgba(47,138,70,.0)'); [8, 108].forEach(x => _AL.elipse(c, x, 30, 14, 10, '#2f7a3a'));
  },
  kizomba(c) {
    _AL.ceu(c, '#3a0f4a', '#120616');
    [[20, 14, '#ff3d7f'], [60, 8, '#ffcb00'], [100, 16, '#36c2ff']].forEach(([x, y, k]) => { c.fillStyle = k + '33'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 22, 96); c.lineTo(x + 22, 96); c.fill(); _AL.elipse(c, x, y, 4, 4, k); });
    _AL.elipse(c, 60, 88, 46, 7, 'rgba(255,255,255,.08)');
    _AL.pessoa(c, 52, 86, '#e0313f', 1.6, .4); _AL.pessoa(c, 66, 86, '#1b1b1b', 1.65, .4);
  },
  maiombe(c) {
    _AL.ceu(c, '#a8d8a0', '#e8f6e0');
    for (let i = 0; i < 8; i++) { const x = 6 + i * 15; _AL.rr(c, x + 6, 40, 4, 56, 1, '#5a3c22'); _AL.elipse(c, x + 8, 34 - (i % 3) * 6, 16, 18, ['#1f6a2e', '#2f8a3e', '#185a26'][i % 3]); }
    _AL.colinas(c, 84, '#1f5a22', 4);
    for (let i = 0; i < 6; i++) _AL.elipse(c, 10 + i * 20, 82, 10, 7, '#2a7a32');
  },
  mercado(c) {
    _AL.ceu(c, '#86c8f0', '#e6f5ff'); _AL.rr(c, 0, 66, 120, 30, 0, '#c9a77a');
    [['#e0313f', 6], ['#ffcb00', 44], ['#2f8f5b', 82]].forEach(([k, x]) => {
      _AL.rr(c, x + 2, 40, 2, 30, 0, '#7a5636'); _AL.rr(c, x + 30, 40, 2, 30, 0, '#7a5636');
      for (let i = 0; i < 4; i++) _AL.rr(c, x + i * 8.5, 30, 8.5, 12, 0, i % 2 ? '#fff' : k);
      _AL.rr(c, x, 58, 34, 8, 1, '#8a5a32');
      for (let i = 0; i < 5; i++) _AL.elipse(c, x + 5 + i * 6, 56, 3, 3, ['#f28a1a', '#d02a2a', '#f5d23a', '#6aa83a', '#7a2a6a'][(i + x) % 5]);
    });
    _AL.pessoa(c, 58, 90, '#e86aa6', 1.1); _AL.elipse(c, 58, 58, 9, 3.5, '#b07a3a');
  },
  mussulo(c) {
    _AL.ceu(c, '#55b4ee', '#d8f2ff'); _AL.mar(c, 50, '#3ccbd6', '#1294b5');
    c.fillStyle = '#f6e2b0'; c.beginPath(); c.moveTo(0, 96); c.lineTo(0, 70); c.quadraticCurveTo(70, 60, 120, 84); c.lineTo(120, 96); c.fill();
    _AL.palmeira(c, 22, 82, 40); _AL.palmeira(c, 92, 90, 32, '#3a9a4e');
    _AL.rr(c, 48, 80, 22, 5, 2, '#fff'); _AL.linha(c, [[60, 80], [62, 64]], '#ddd', 2);
  },
  planalto(c) {
    _AL.ceu(c, '#86c8f0', '#eef8ff'); _AL.sol(c, 20, 18, 6);
    _AL.colinas(c, 48, '#8ab35a', 9); _AL.colinas(c, 62, '#6f9a44', 8, 2); _AL.colinas(c, 78, '#5a8a36', 6, 4);
    for (let i = 0; i < 5; i++) _AL.linha(c, [[10 + i * 22, 90], [24 + i * 22, 74]], 'rgba(255,240,180,.35)', 2);
    _AL.rr(c, 78, 52, 14, 10, 1, '#efe6d0'); _AL.forma(c, [[76, 53], [85, 45], [94, 53]], '#a8432a');
  },
  praia(c) {
    _AL.ceu(c, '#ffb070', '#ffe8c0'); _AL.sol(c, 60, 46, 12, '#ffdc6a');
    _AL.mar(c, 50, '#2f9ed0', '#165f96');
    c.fillStyle = '#f2d9a0'; c.beginPath(); c.moveTo(0, 96); c.lineTo(0, 76); c.quadraticCurveTo(60, 70, 120, 78); c.lineTo(120, 96); c.fill();
    _AL.palmeira(c, 102, 86, 44);
  },
  pungo(c) {
    _AL.ceu(c, '#86c8f0', '#f2f8ff'); _AL.colinas(c, 76, '#b8a258', 4);
    [[30, 76, 22, 34], [62, 76, 30, 46], [94, 78, 18, 26]].forEach(([x, y, r, h]) => { c.fillStyle = _AL.grad(c, x - r, 0, x + r, 0, '#4a4a50', '#2a2a2e', '#18181b'); c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x - r, y - h, x, y - h); c.quadraticCurveTo(x + r, y - h, x + r, y); c.fill(); });
    for (let i = 0; i < 6; i++) _AL.elipse(c, 8 + i * 22, 86, 8, 3, '#7a9a3a');
  },
  serra_leba(c) {
    _AL.ceu(c, '#86c8f0', '#e6f4ff'); _AL.colinas(c, 30, '#8a7a5a', 6); c.fillStyle = '#6a8a3a'; c.fillRect(0, 32, 120, 64);
    _AL.linha(c, [[100, 34], [20, 44], [100, 54], [20, 64], [100, 74], [30, 90]], '#333', 5.5);
    _AL.linha(c, [[100, 34], [20, 44], [100, 54], [20, 64], [100, 74], [30, 90]], '#fff3', 1);
  },
  shopping(c) {
    _AL.ceu(c, '#d8e4ee', '#f6f8fa'); _AL.rr(c, 6, 14, 108, 60, 3, '#e9ecef');
    c.fillStyle = _AL.grad(c, 0, 20, 0, 70, '#a8d0ec', '#5f93bc'); c.fillRect(12, 24, 96, 46);
    for (let i = 1; i < 4; i++) c.fillStyle = '#e9ecef', c.fillRect(12 + i * 24, 24, 2, 46);
    _AL.rr(c, 6, 14, 108, 9, 2, '#cc092f');
    _AL.rr(c, 0, 74, 120, 22, 0, '#c9ced4');
    [[34, '#e86aa6'], [56, '#ffcb00'], [78, '#2a62c9']].forEach(([x, k]) => { _AL.forma(c, [[x, 66], [x + 18, 66], [x + 20, 90], [x - 2, 90]], k); c.strokeStyle = shade(k, -.3); c.lineWidth = 2; c.beginPath(); c.arc(x + 9, 66, 5, Math.PI, 0); c.stroke(); });
  },
  tundavala(c) {
    _AL.ceu(c, '#86c8f0', '#f0f8ff');
    _AL.colinas(c, 60, '#9ab8d0', 4); _AL.colinas(c, 70, '#7fa0b8', 3, 1);
    c.fillStyle = '#7a6a52'; c.beginPath(); c.moveTo(0, 96); c.lineTo(0, 16); c.lineTo(34, 22); c.lineTo(46, 96); c.fill();
    c.beginPath(); c.moveTo(120, 96); c.lineTo(120, 10); c.lineTo(80, 20); c.lineTo(70, 96); c.fill();
    c.fillStyle = '#5f533f'; c.beginPath(); c.moveTo(34, 22); c.lineTo(46, 96); c.lineTo(30, 96); c.fill();
    _AL.rr(c, 0, 10, 34, 6, 0, '#4f8a3a'); _AL.rr(c, 82, 6, 38, 6, 0, '#4f8a3a');
  },
};

/* ---------- empregos: as ferramentas de cada um ---------- */
const ARTE_EMPREGO = {
  agricultor(c) {
    _AL.sombra(c, 60, 86, 40, 6); _AL.rr(c, 16, 80, 88, 8, 4, '#7a5636');
    _AL.linha(c, [[60, 84], [60, 22]], '#4f8a3a', 4);
    [[-1, 60], [1, 48], [-1, 36]].forEach(([s, y]) => _AL.elipse(c, 60 + s * 14, y, 16, 3.5, '#5fa83f', s * -.6));
    c.save(); c.translate(70, 46); c.rotate(.5); c.fillStyle = _AL.grad(c, -5, 0, 5, 0, '#ffe27a', '#e0a21a'); c.beginPath(); c.roundRect(-5, -14, 10, 28, 5); c.fill(); _AL.elipse(c, -4, 6, 3, 10, '#8ab35a', .2); c.restore();
    _AL.linha(c, [[22, 30], [44, 82]], '#9a6a3a', 3.5); _AL.forma(c, [[16, 26], [30, 22], [28, 34]], '#9aa6ad');
  },
  bancario(c) {
    _AL.sombra(c, 60, 84, 44, 7);
    _AL.forma(c, [[30, 34], [60, 16], [90, 34]], '#d6d0c4'); _AL.rr(c, 30, 34, 60, 6, 0, '#bdb6a8');
    for (let i = 0; i < 4; i++) _AL.rr(c, 36 + i * 14, 40, 6, 32, 1, '#ece6da');
    _AL.rr(c, 26, 72, 68, 8, 1, '#bdb6a8');
    for (let i = 0; i < 4; i++) _AL.rr(c, 76, 66 - i * 4, 34, 10, 2, i % 2 ? '#3a9a5a' : '#2f8a4e');
    [[18, 80], [24, 74]].forEach(([x, y]) => { _AL.elipse(c, x, y, 9, 4, '#c99a1a'); _AL.elipse(c, x, y - 2, 9, 4, '#f2c43a'); });
  },
  cobrador(c) {
    _AL.sombra(c, 60, 82, 50, 6);
    c.fillStyle = '#2a62c9'; c.beginPath(); c.moveTo(10, 76); c.lineTo(10, 40); c.quadraticCurveTo(12, 28, 28, 28); c.lineTo(96, 28); c.quadraticCurveTo(112, 30, 112, 50); c.lineTo(112, 76); c.fill();
    _AL.rr(c, 10, 52, 102, 10, 0, '#ffffff');
    for (let i = 0; i < 4; i++) _AL.rr(c, 26 + i * 18, 33, 14, 15, 2, '#9fd0ee');
    c.fillStyle = '#9fd0ee'; c.beginPath(); c.moveTo(98, 33); c.lineTo(104, 33); c.quadraticCurveTo(110, 38, 110, 48); c.lineTo(98, 48); c.fill();
    [30, 92].forEach(x => { _AL.elipse(c, x, 76, 10, 10, '#1a1a1a'); _AL.elipse(c, x, 76, 4.5, 4.5, '#aaa'); });
    _AL.pessoa(c, 18, 78, '#ffcb00', .9, .9);
  },
  empregado_mesa(c) {
    _AL.sombra(c, 60, 84, 30, 5);
    _AL.linha(c, [[60, 84], [60, 58]], '#555', 3);
    _AL.elipse(c, 60, 56, 44, 10, '#9aa0a8'); _AL.elipse(c, 60, 54, 44, 10, '#d8dce2');
    c.fillStyle = _AL.grad(c, 32, 0, 72, 0, '#ffffff', '#c8cdd4'); c.beginPath(); c.ellipse(52, 52, 20, 22, 0, Math.PI, 0); c.fill(); _AL.elipse(c, 52, 29, 3, 2.5, '#9aa0a8');
    c.fillStyle = 'rgba(220,235,245,.8)'; c.beginPath(); c.moveTo(78, 24); c.lineTo(94, 24); c.lineTo(92, 52); c.lineTo(80, 52); c.fill(); c.fillStyle = '#f2b03a'; c.fillRect(80, 36, 12, 16);
  },
  engenheiro(c) {
    _AL.sombra(c, 60, 84, 46, 6); _AL.rr(c, 14, 78, 92, 8, 2, '#5a5f66');
    _AL.forma(c, [[46, 80], [56, 36], [64, 36], [74, 80]], '#3a3f45'); _AL.linha(c, [[50, 64], [70, 64]], '#3a3f45', 2);
    c.save(); c.translate(60, 34); c.rotate(-.18); _AL.rr(c, -44, -5, 82, 10, 3, '#e8b81c'); c.fillStyle = '#333'; c.beginPath(); c.moveTo(-44, -8); c.quadraticCurveTo(-56, 0, -44, 12); c.lineTo(-40, 4); c.fill(); c.restore();
    _AL.linha(c, [[16, 44], [16, 80]], '#222', 2); _AL.rr(c, 84, 56, 18, 22, 3, '#c8202a'); _AL.elipse(c, 93, 66, 6, 6, '#8a1418');
  },
  estivador(c) {
    _AL.sombra(c, 60, 86, 50, 6);
    [[8, 58, '#c8202a'], [44, 58, '#2a62c9'], [80, 58, '#2f8f5b'], [26, 34, '#f2a01a']].forEach(([x, y, k]) => { _AL.rr(c, x, y, 34, 24, 1, k); for (let i = 1; i < 8; i++) c.fillStyle = 'rgba(0,0,0,.18)', c.fillRect(x + i * 4.2, y + 2, 1.4, 20); });
    _AL.linha(c, [[78, 6], [78, 30]], '#555', 1.6); _AL.linha(c, [[78, 30], [82, 36], [76, 36]], '#333', 2.4);
  },
  guia(c) {
    _AL.sombra(c, 60, 82, 46, 7);
    _AL.forma(c, [[12, 70], [40, 58], [64, 70], [96, 58], [110, 74], [80, 86], [56, 76], [26, 86]], '#efe3c2');
    _AL.linha(c, [[30, 74], [50, 68], [70, 76], [94, 68]], '#d0402a', 1.6);
    _AL.elipse(c, 62, 42, 26, 26, '#b8862a'); _AL.elipse(c, 62, 42, 21, 21, '#fff8e6');
    _AL.forma(c, [[62, 24], [67, 42], [62, 40]], '#d0202a'); _AL.forma(c, [[62, 60], [57, 42], [62, 44]], '#333');
    _AL.elipse(c, 62, 42, 2.4, 2.4, '#b8862a');
  },
  kupapata(c) {
    _AL.sombra(c, 60, 82, 46, 6);
    [26, 94].forEach(x => { _AL.elipse(c, x, 70, 15, 15, '#1a1a1a'); _AL.elipse(c, x, 70, 7, 7, '#9aa0a8'); });
    _AL.linha(c, [[26, 70], [50, 56], [76, 58], [94, 70]], '#555', 3.5);
    c.fillStyle = '#c8202a'; c.beginPath(); c.moveTo(44, 48); c.quadraticCurveTo(58, 38, 76, 46); c.lineTo(78, 58); c.lineTo(46, 60); c.fill();
    _AL.rr(c, 30, 42, 26, 7, 3, '#1a1a1a'); _AL.linha(c, [[82, 40], [92, 64]], '#333', 3); _AL.linha(c, [[76, 38], [88, 38]], '#222', 3);
    _AL.elipse(c, 92, 46, 4, 4, '#ffe9a0');
  },
  lavador(c) {
    _AL.sombra(c, 50, 86, 34, 6);
    c.fillStyle = _AL.grad(c, 22, 0, 74, 0, '#5fa8e8', '#2a62c9', '#163f8a'); c.beginPath(); c.moveTo(22, 44); c.lineTo(76, 44); c.lineTo(70, 86); c.lineTo(28, 86); c.fill();
    _AL.elipse(c, 49, 44, 27, 7, '#163f8a'); _AL.elipse(c, 49, 45, 24, 5, '#bfe4ff');
    c.strokeStyle = '#888'; c.lineWidth = 2; c.beginPath(); c.ellipse(49, 42, 26, 22, 0, Math.PI, 0); c.stroke();
    _AL.rr(c, 76, 56, 30, 20, 6, '#ffd23a'); _AL.rr(c, 76, 62, 30, 6, 0, '#2f9a48');
    [[80, 46, 5], [92, 40, 4], [100, 50, 3], [66, 32, 3.5], [40, 34, 4]].forEach(([x, y, r]) => { c.strokeStyle = 'rgba(120,180,230,.9)'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); });
  },
  nadador_salvador(c) {
    _AL.sombra(c, 56, 84, 38, 7);
    for (let i = 0; i < 8; i++) { c.strokeStyle = i % 2 ? '#fff' : '#e0313f'; c.lineWidth = 14; c.beginPath(); c.arc(54, 50, 26, i * Math.PI / 4, (i + 1) * Math.PI / 4); c.stroke(); }
    c.strokeStyle = '#d8d0c0'; c.lineWidth = 2; c.beginPath(); c.arc(54, 50, 33, 0, 7); c.stroke();
    _AL.rr(c, 88, 64, 20, 10, 4, '#ffcb00'); _AL.elipse(c, 104, 69, 3, 3, '#222'); _AL.linha(c, [[90, 66], [80, 30]], '#e0313f', 1.4);
  },
  operario(c) {
    _AL.sombra(c, 60, 86, 44, 6);
    c.save(); c.translate(44, 54);
    c.fillStyle = '#7a8088'; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-5, -28, 10, 10); c.restore(); }
    _AL.elipse(c, 0, 0, 21, 21, '#8a9098'); _AL.elipse(c, 0, 0, 8, 8, '#4a4f56'); c.restore();
    c.fillStyle = _AL.grad(c, 66, 0, 110, 0, '#ffe04a', '#f2b51c', '#c48a0a'); c.beginPath(); c.ellipse(88, 70, 22, 18, 0, Math.PI, 0); c.fill();
    _AL.rr(c, 62, 68, 52, 6, 3, '#e0a21a'); _AL.rr(c, 85, 52, 6, 18, 2, '#ffe680');
  },
  pescador(c) {
    _AL.mar(c, 66, '#3a9ad0', '#1d5f90');
    _AL.linha(c, [[14, 90], [96, 12]], '#6b4226', 3); _AL.linha(c, [[96, 12], [100, 40]], 'rgba(40,40,40,.7)', 1);
    _AL.elipse(c, 26, 80, 5, 5, '#888');
    _AL.peixe(c, 96, 52, 32, '#7fb0c8', 1.35);
  },
  plataforma(c) {
    _AL.ceu(c, '#9fd0f0', '#e8f6ff'); _AL.mar(c, 70, '#2a8ac0', '#134f80');
    [30, 50, 70, 90].forEach(x => _AL.rr(c, x - 2, 52, 4, 30, 0, '#ffcb00'));
    _AL.rr(c, 20, 44, 82, 10, 1, '#5a5f66'); _AL.rr(c, 26, 30, 30, 14, 1, '#e8e2d6'); _AL.rr(c, 60, 34, 20, 10, 1, '#c8202a');
    _AL.forma(c, [[84, 44], [90, 8], [96, 44]], '#3a3f45'); _AL.linha(c, [[86, 30], [94, 30]], '#3a3f45', 1.5);
    _AL.linha(c, [[100, 28], [112, 18]], '#555', 2); _AL.elipse(c, 114, 15, 4, 6, '#ff8a1a');
  },
  professor(c) {
    _AL.rr(c, 12, 10, 96, 56, 3, '#8a5a32'); _AL.rr(c, 16, 14, 88, 48, 2, '#2f5a3e');
    ['M 24 30 l 10 -8 l 0 18', '', ''].forEach(() => {});
    _AL.linha(c, [[24, 26], [44, 26]], '#f2f2e8', 1.6); _AL.linha(c, [[24, 34], [60, 34]], '#f2f2e8', 1.6); _AL.linha(c, [[24, 42], [52, 42]], '#f2f2e8', 1.6); _AL.linha(c, [[70, 24], [92, 46]], '#f2f2e8', 1.6); _AL.linha(c, [[92, 24], [70, 46]], '#f2f2e8', 1.6);
    _AL.sombra(c, 60, 90, 40, 5);
    [['#e0313f', 76], ['#2a62c9', 70], ['#ffcb00', 64]].forEach(([k, y], i) => _AL.rr(c, 28 + i * 4, y + 8, 64 - i * 6, 7, 1.5, k));
  },
  programador(c) {
    _AL.sombra(c, 60, 86, 50, 6);
    _AL.rr(c, 22, 12, 76, 52, 4, '#2a2d33'); _AL.rr(c, 26, 16, 68, 44, 2, '#14161a');
    [[30, 22, 26, '#ffcb00'], [36, 29, 34, '#5fd0ff'], [36, 36, 22, '#ff6b8a'], [36, 43, 40, '#9fe07a'], [30, 50, 18, '#ffcb00']].forEach(([x, y, w, k]) => _AL.rr(c, x, y, w, 3, 1.5, k));
    _AL.forma(c, [[14, 66], [106, 66], [114, 80], [6, 80]], '#b8bec6'); _AL.rr(c, 50, 70, 20, 4, 2, '#8a9098');
  },
  seguranca(c) {
    _AL.sombra(c, 60, 86, 34, 6);
    c.fillStyle = _AL.grad(c, 30, 0, 90, 0, '#3a5aa8', '#1f3a7a', '#122556');
    c.beginPath(); c.moveTo(60, 10); c.lineTo(92, 22); c.quadraticCurveTo(92, 66, 60, 84); c.quadraticCurveTo(28, 66, 28, 22); c.closePath(); c.fill();
    c.fillStyle = '#ffcb00'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(60 + Math.cos(a) * r, 44 + Math.sin(a) * r); } c.fill();
  },
  zungueira(c) {
    _AL.sombra(c, 60, 82, 44, 8);
    c.fillStyle = _AL.grad(c, 18, 0, 102, 0, '#d8a860', '#b07a3a', '#7a5226'); c.beginPath(); c.moveTo(16, 50); c.lineTo(104, 50); c.quadraticCurveTo(98, 80, 60, 82); c.quadraticCurveTo(22, 80, 16, 50); c.fill();
    for (let i = 0; i < 5; i++) _AL.linha(c, [[22 + i * 2, 56 + i * 5], [98 - i * 2, 56 + i * 5]], 'rgba(90,60,30,.45)', 1.4);
    [[34, 46, '#f28a1a'], [48, 40, '#f5d23a'], [62, 44, '#d02a2a'], [76, 40, '#6aa83a'], [88, 46, '#f28a1a'], [56, 34, '#f5d23a']].forEach(([x, y, k]) => { _AL.elipse(c, x, y, 9, 8, k); _AL.elipse(c, x - 3, y - 3, 2.5, 2, 'rgba(255,255,255,.4)'); });
    _AL.elipse(c, 60, 50, 44, 6, '#8a5a2a');
  },
};

/* ---------- ícones simples para as outras linhas dos painéis ---------- */
const ARTE_ACAO = {
  biscato(c) { _AL.sombra(c, 60, 84, 34, 5); c.save(); c.translate(60, 50); c.rotate(-.6); _AL.rr(c, -4, -6, 8, 46, 3, '#9a6a3a'); _AL.rr(c, -22, -16, 44, 14, 3, '#5a5f66'); _AL.rr(c, 14, -16, 8, 14, 2, '#3a3f45'); c.restore(); },
  univ(c) { _AL.sombra(c, 60, 82, 40, 6); _AL.forma(c, [[60, 22], [108, 40], [60, 58], [12, 40]], '#1b1b22'); c.fillStyle = '#2a2a33'; c.beginPath(); c.moveTo(34, 50); c.lineTo(34, 66); c.quadraticCurveTo(60, 80, 86, 66); c.lineTo(86, 50); c.lineTo(60, 60); c.fill(); _AL.linha(c, [[96, 44], [98, 70]], '#ffcb00', 2); _AL.elipse(c, 98, 72, 3.5, 5, '#ffcb00'); },
  saude(c) { _AL.sombra(c, 60, 84, 30, 5); _AL.rr(c, 30, 26, 60, 54, 8, '#ffffff'); _AL.rr(c, 30, 26, 60, 54, 8, 'rgba(0,0,0,.04)'); _AL.rr(c, 52, 36, 16, 36, 2, '#e0313f'); _AL.rr(c, 42, 46, 36, 16, 2, '#e0313f'); _AL.rr(c, 48, 18, 24, 10, 3, '#9aa0a8'); },
  lavras: c => ARTE_EMPREGO.agricultor(c),
  banco: c => ARTE_EMPREGO.bancario(c),
  ginasio(c) { _AL.sombra(c, 60, 78, 46, 6); _AL.rr(c, 26, 54, 68, 6, 3, '#9aa0a8'); [[12, 18], [22, 22], [86, 22], [96, 18]].forEach(([x, h], i) => _AL.rr(c, x, 57 - h, 12, h * 2, 3, i === 1 || i === 2 ? '#e0313f' : '#1b1b22')); },
  correr(c) { _AL.sombra(c, 60, 84, 40, 6); c.fillStyle = '#ff4a5a'; c.beginPath(); c.moveTo(18, 74); c.quadraticCurveTo(20, 46, 44, 44); c.lineTo(60, 56); c.quadraticCurveTo(96, 58, 102, 72); c.lineTo(102, 80); c.lineTo(18, 80); c.fill(); _AL.rr(c, 16, 76, 88, 8, 3, '#f2f2f2'); [[40, 52], [48, 56], [56, 60]].forEach(([x, y]) => _AL.linha(c, [[x, y], [x + 8, y - 6]], '#fff', 2)); },
  porta(c) { _AL.sombra(c, 60, 86, 30, 5); _AL.rr(c, 34, 14, 52, 72, 3, '#5a3c22'); _AL.rr(c, 38, 18, 44, 68, 2, '#8a5a32'); _AL.rr(c, 43, 24, 34, 24, 2, '#7a4e2a'); _AL.rr(c, 43, 54, 34, 26, 2, '#7a4e2a'); _AL.elipse(c, 74, 52, 3, 3, '#f2c43a'); },
};

const _desenhosLista = { comida: ARTE_COMIDA, lazer: ARTE_LAZER, emprego: ARTE_EMPREGO, acao: ARTE_ACAO };
const _cacheLista = new Map();
function arteLista(tipo, id) {
  const chave = tipo + ':' + id;
  if (_cacheLista.has(chave)) return _cacheLista.get(chave);
  // comidas e bebidas: fotografias dos modelos 3D (js/comidas3d.js → tools/modelos/comidas.py), como o resto da arte do jogo
  if (tipo === 'comida' && typeof COMIDA_FOTOS !== 'undefined' && COMIDA_FOTOS.has(id)) { const u = 'img/modelos/comida/' + id + '.webp'; _cacheLista.set(chave, u); return u; }
  const f = _desenhosLista[tipo]?.[id];
  let url = '';
  if (f) {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 192;
    const c = cv.getContext('2d'); c.scale(2, 2);
    if (tipo === 'lazer') { c.beginPath(); c.roundRect(0, 0, 120, 96, 14); c.clip(); }
    try { f(c); } catch (e) { /* fica em branco */ }
    url = cv.toDataURL(); cv.width = cv.height = 0;
  }
  _cacheLista.set(chave, url);
  return url;
}
// <img> com o desenho; se não houver desenho para o id, cai no emoji (para não ficar vazio)
function arteListaHTML(tipo, id, emoji = '') {
  const u = arteLista(tipo, id);
  return u ? `<img class="mini ${tipo === 'lazer' ? 'postal' : ''}" alt="" src="${u}" draggable="false">` : `<span class="e">${emoji}</span>`;
}

/* ---------- retrato do edifício (topo do painel) ---------- */
const _retratos = new Map();
function retratoLugar(o, W = 360, H = 170) {
  const chave = (o.spec?.nome || o.kind) + ':' + o.kind + ':' + W + 'x' + H;
  if (_retratos.has(chave)) return _retratos.get(chave);
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
  const c = cv.getContext('2d'); c.scale(2, 2);
  try {
    const w = o.b?.w ?? o.w ?? 2, d = o.b?.d ?? o.d ?? 2, h = (o.b?.h ?? o.h ?? 30) + (o.b?.telhado === 'telha' ? 20 : 6);
    enquadrar(c, w + 1, d + 1, h, W, H, 1.6);
    c.translate(...(([a, b]) => [a - iso(0, 0)[0], b - iso(0, 0)[1]])(iso(0.5, 0.5)));
    // um bocadinho de chão à volta
    losango(c, -0.5, -0.5, w + 1, d + 1, 'rgba(0,0,0,.08)');
    const copia = { ...o, x: 0, y: 0 };
    if (o.b) copia.b = { ...o.b, x: 0, y: 0 };
    if (o.kind === 'edificio' || o.kind === 'casinha') desenhaEdificio(c, copia.b, false);
    else if (typeof desenhaObjeto === 'function') desenhaObjeto(copia, 0, false, c);
  } catch (e) { /* sem retrato */ }
  // 6 nov: um outdoor com imagem de fora «sujava» o canvas e o painel do lugar não abria («The operation is insecure»)
  let url = '';
  try { url = cv.toDataURL(); } catch (e) { }
  cv.width = cv.height = 0;   // 8 nov: liberta a memória já (iPhone)
  _retratos.set(chave, url);
  return url;
}

/* ---------- 23 out: bebidas, petiscos e profissões novas (e as que ainda não tinham desenho) ---------- */
const _B = {
  // garrafa de cerveja/refrigerante: vidro, rótulo e tampa
  garrafa(c, x, y, vidro, rotulo, faixa, tampa = '#d8b23c', alt = 56) {
    _AL.sombra(c, x + 13, y + 2, 18, 4);
    c.fillStyle = _AL.grad(c, x, 0, x + 26, 0, shade(vidro, .25), vidro, shade(vidro, -.35));
    c.beginPath(); c.roundRect(x, y - alt * .62, 26, alt * .62, 5); c.fill(); c.fillRect(x + 8, y - alt, 10, alt * .4);
    c.beginPath(); c.moveTo(x + 8, y - alt * .6); c.quadraticCurveTo(x, y - alt * .6, x, y - alt * .5); c.lineTo(x + 26, y - alt * .5); c.quadraticCurveTo(x + 26, y - alt * .6, x + 18, y - alt * .6); c.fill();
    _AL.rr(c, x + 7, y - alt - 4, 12, 6, 2, tampa);
    _AL.rr(c, x, y - alt * .45, 26, alt * .3, 2, rotulo); if (faixa) _AL.rr(c, x, y - alt * .36, 26, alt * .1, 0, faixa);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 4, y - alt * .58, 3, alt * .5);
  },
  // lata de refrigerante
  lata(c, x, y, cor, risca, w = 26, h = 44) {
    _AL.sombra(c, x + w / 2, y + 2, w * .7, 4);
    c.fillStyle = _AL.grad(c, x, 0, x + w, 0, shade(cor, .3), cor, shade(cor, -.35)); c.beginPath(); c.roundRect(x, y - h, w, h, 4); c.fill();
    _AL.elipse(c, x + w / 2, y - h, w / 2, 4, '#d9dde0'); _AL.elipse(c, x + w / 2, y - h, w / 2 - 3, 2.6, '#b9bec2'); _AL.rr(c, x + w / 2 - 3, y - h - 2, 6, 3, 1, '#9aa0a5');
    if (risca) { c.strokeStyle = risca; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 2, y - h * .3); c.bezierCurveTo(x + w * .4, y - h * .55, x + w * .6, y - h * .2, x + w - 2, y - h * .5); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x + 4, y - h + 4, 3, h - 8);
  },
  // copo com líquido (e espuma opcional)
  copo(c, x, y, liq, espuma = null, w = 24, h = 40) {
    _AL.sombra(c, x + w / 2, y + 2, w * .7, 4);
    c.fillStyle = 'rgba(230,240,245,.35)'; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y - h); c.lineTo(x + w - 3, y); c.lineTo(x + 3, y); c.fill();
    c.fillStyle = typeof liq === 'string' ? liq : liq; c.beginPath(); c.moveTo(x + 1, y - h * .78); c.lineTo(x + w - 1, y - h * .78); c.lineTo(x + w - 3.5, y - 1); c.lineTo(x + 3.5, y - 1); c.fill();
    if (espuma) { _AL.elipse(c, x + w / 2, y - h * .8, w / 2, 3.5, espuma); _AL.elipse(c, x + w * .3, y - h * .84, w * .2, 3, espuma); _AL.elipse(c, x + w * .7, y - h * .84, w * .2, 3, espuma); }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + 4, y - h + 3, 2, h - 6);
  },
  palhinha(c, x, y, cor = '#e0313f') { _AL.linha(c, [[x, y], [x + 8, y - 22]], cor, 2.4); },
  fruta(c, x, y, r, cor, folha = '#4f9a3a') { c.fillStyle = _AL.rad(c, x, y, r, shade(cor, .35), shade(cor, -.25)); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); _AL.elipse(c, x + 2, y - r, 4, 1.8, folha, -.5); },
};
Object.assign(ARTE_COMIDA, {
  kissangua(c) {   // cabaça com kissangua e caneca
    _AL.sombra(c, 46, 84, 26, 6);
    c.fillStyle = _AL.rad(c, 46, 62, 24, '#e6b76a', '#a8702c'); c.beginPath(); c.ellipse(46, 64, 22, 20, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(46, 38, 9, 10, 0, 0, 7); c.fill(); _AL.rr(c, 41, 24, 10, 8, 2, '#8a5a24');
    _AL.linha(c, [[30, 58], [62, 58]], 'rgba(90,50,10,.4)', 1.5); _AL.linha(c, [[28, 66], [64, 66]], 'rgba(90,50,10,.4)', 1.5);
    _B.copo(c, 76, 84, '#e9dcb0', '#f7f0d8', 26, 34);
  },
  vinho_pacote(c) {   // pacote de vinho com palhinha e copo de plástico
    _AL.sombra(c, 50, 84, 28, 6);
    _AL.rr(c, 30, 30, 36, 54, 2, '#7a1f2b'); _AL.forma(c, [[30, 30], [48, 22], [66, 30]], '#5e1620');
    _AL.rr(c, 34, 44, 28, 22, 2, '#f2e3c2'); _AL.elipse(c, 48, 55, 8, 6, '#7a1f2b'); _AL.elipse(c, 46, 53, 3, 2, '#b23a48');
    _B.palhinha(c, 54, 26, '#ffffff');
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(76, 56); c.lineTo(100, 56); c.lineTo(97, 84); c.lineTo(79, 84); c.fill();
    c.fillStyle = '#8c1d3a'; c.beginPath(); c.moveTo(77.5, 64); c.lineTo(98.5, 64); c.lineTo(96.5, 83); c.lineTo(79.5, 83); c.fill();
  },
  moet(c) {   // champanhe num balde de gelo com duas taças
    _AL.sombra(c, 52, 86, 36, 6);
    c.fillStyle = _AL.grad(c, 22, 0, 82, 0, '#e4e8ea', '#aab2b8', '#7c858c'); c.beginPath(); c.moveTo(22, 52); c.lineTo(82, 52); c.lineTo(76, 86); c.lineTo(28, 86); c.fill();
    [[32, 52], [44, 50], [58, 52], [70, 50]].forEach(([x, y]) => _AL.rr(c, x - 5, y - 6, 10, 9, 2, 'rgba(220,240,255,.85)'));
    c.save(); c.translate(52, 50); c.rotate(-.2);
    c.fillStyle = _AL.grad(c, -10, 0, 10, 0, '#2e4a2e', '#1a2e1a', '#0e1a0e'); c.beginPath(); c.roundRect(-10, -26, 20, 30, 5); c.fill(); c.fillRect(-4, -44, 8, 20);
    _AL.rr(c, -5, -50, 10, 10, 2, '#d4af37'); _AL.rr(c, -10, -18, 20, 12, 1, '#f6f1e2'); _AL.rr(c, -10, -14, 20, 3, 0, '#d4af37');
    c.restore();
    [[96, 86], [108, 80]].forEach(([x, y]) => { _AL.linha(c, [[x, y - 2], [x, y - 18]], 'rgba(230,240,245,.9)', 1.6); _AL.elipse(c, x, y - 1, 6, 1.8, 'rgba(230,240,245,.9)');
      c.fillStyle = 'rgba(230,240,245,.6)'; c.beginPath(); c.moveTo(x - 6, y - 40); c.lineTo(x + 6, y - 40); c.lineTo(x + 2, y - 18); c.lineTo(x - 2, y - 18); c.fill();
      c.fillStyle = '#f2d36b'; c.beginPath(); c.moveTo(x - 5, y - 34); c.lineTo(x + 5, y - 34); c.lineTo(x + 1.8, y - 19); c.lineTo(x - 1.8, y - 19); c.fill(); });
  },
  sumo_maracuja(c) { _B.copo(c, 38, 86, '#f2a922', null, 30, 50); _B.palhinha(c, 52, 40, '#2f8f5b'); _B.fruta(c, 88, 70, 14, '#6a2a5a', '#4f9a3a'); _AL.elipse(c, 96, 76, 9, 7, '#f2c13a'); [[94, 75], [98, 77], [95, 79]].forEach(([x, y]) => _AL.elipse(c, x, y, 1.2, 1.2, '#3a2a10')); },
  sumo_mucua(c) {   // sumo cremoso de múcua com o fruto do imbondeiro
    _B.copo(c, 34, 86, '#efe3c6', null, 30, 50); _B.palhinha(c, 48, 40, '#c47a2c');
    c.fillStyle = _AL.grad(c, 72, 0, 112, 0, '#a8b07a', '#7a8450', '#5a6238'); c.beginPath(); c.ellipse(90, 66, 22, 13, -.3, 0, 7); c.fill();
    _AL.linha(c, [[70, 74], [62, 80]], '#6a5a3a', 2.4);
    _AL.elipse(c, 96, 70, 9, 6, '#f2ead2'); [[94, 69], [99, 71]].forEach(([x, y]) => _AL.elipse(c, x, y, 1.6, 1.2, '#8a5a32'));
  },
  fanta(c) { _B.garrafa(c, 26, 86, '#f2861b', '#1e5aa8', '#ffffff', '#1e5aa8', 58); _B.lata(c, 70, 86, '#f2861b', '#1e5aa8'); },
  coca_cola(c) { _B.garrafa(c, 26, 86, '#3a1a10', '#d61f26', '#ffffff', '#d61f26', 58); _B.lata(c, 70, 86, '#d61f26', '#ffffff'); },
  nocal(c) { _B.garrafa(c, 26, 86, '#5e3410', '#2a62c9', '#ffcb00', '#c9a227', 60); _B.copo(c, 66, 86, _AL.grad(c, 0, 50, 0, 86, '#f7c548', '#e09a12'), '#fffaf0', 26, 40); },
  sumo_tutti(c) { _AL.sombra(c, 50, 86, 28, 5); _AL.rr(c, 34, 36, 30, 50, 3, '#ffcb00'); _AL.rr(c, 34, 50, 30, 18, 0, '#e0313f'); _B.fruta(c, 49, 59, 6, '#f5821f'); _B.palhinha(c, 56, 34, '#ffffff'); _B.fruta(c, 86, 76, 11, '#f5821f'); _B.fruta(c, 98, 82, 7, '#ffcb00'); },
  eka(c) { _B.garrafa(c, 30, 86, '#2e5a2e', '#f5f1e8', '#cc092f', '#d8b23c', 60); _B.copo(c, 68, 86, _AL.grad(c, 0, 50, 0, 86, '#f7c548', '#e09a12'), '#fffaf0', 26, 40); },
  cuca(c) { _B.garrafa(c, 30, 86, '#6b3608', '#e0313f', '#ffcb00', '#d8b23c', 60); _B.copo(c, 68, 86, _AL.grad(c, 0, 50, 0, 86, '#f7c548', '#e09a12'), '#fffaf0', 26, 40); },
  funge(c) { _AL.prato(c, 60, 62, 40); _AL.funge(c, 56, 58, 22); _AL.elipse(c, 82, 66, 8, 3, '#d9d2c0'); },
  kizaca(c) {   // folhas de mandioca pisadas, escuras, com funge ao lado
    _AL.prato(c, 58, 62, 42);
    for (let i = 0; i < 14; i++) _AL.elipse(c, 70 + Math.cos(i * 1.7) * 13, 58 + Math.sin(i * 2.3) * 6, 6, 3, i % 2 ? '#2f5a22' : '#3d6e2a', i);
    _AL.elipse(c, 72, 60, 3, 2, '#c9a24a'); _AL.funge(c, 38, 58, 14);
  },
  bombo(c) {   // mandioca seca assada na brasa
    _AL.sombra(c, 60, 82, 44, 6); _AL.rr(c, 18, 70, 84, 8, 3, '#3a2a20');
    [[0, 0], [10, -6], [-6, -10]].forEach(([dx, dy], i) => { c.save(); c.translate(60 + dx, 62 + dy); c.rotate(-.25 + i * .2);
      c.fillStyle = _AL.grad(c, 0, -7, 0, 7, '#f2e3c2', '#d9b77a', '#9a6a3a'); c.beginPath(); c.roundRect(-30, -7, 60, 14, 7); c.fill();
      for (let k = -2; k <= 2; k++) _AL.elipse(c, k * 11, 0, 3, 5, 'rgba(60,30,10,.55)'); c.restore(); });
    [[30, 76], [50, 78], [80, 76], [92, 78]].forEach(([x, y]) => _AL.elipse(c, x, y, 4, 2, '#e0602a'));
  },
  ginguba(c) {   // cartucho de papel com amendoins torrados
    _AL.sombra(c, 58, 86, 34, 5);
    _AL.forma(c, [[36, 40], [80, 40], [66, 86], [50, 86]], '#e9dcc4'); _AL.forma(c, [[36, 40], [80, 40], [76, 48], [40, 48]], '#d6c6a6');
    for (let i = 0; i < 12; i++) { const x = 40 + (i % 6) * 7 + (i > 5 ? 3 : 0), y = 36 - (i > 5 ? 6 : 0); _AL.elipse(c, x, y, 4, 3, i % 2 ? '#c88a4a' : '#b8763a', .4); }
    [[90, 80], [98, 84], [86, 86]].forEach(([x, y]) => _AL.elipse(c, x, y, 4, 3, '#c88a4a', .3));
  },
  cabrite(c) { _AL.prato(c, 56, 64, 40); [[44, 58], [62, 56], [54, 66]].forEach(([x, y], i) => { _AL.pedaco(c, x, y, 10, '#8a4a24'); _AL.linha(c, [[x - 6, y - 2], [x + 6, y + 2]], 'rgba(30,10,0,.5)', 1.6); }); _AL.elipse(c, 80, 64, 6, 3, '#e0313f'); _AL.elipse(c, 84, 60, 5, 2.5, '#4f9a3a'); },
  pincho(c) { _AL.sombra(c, 60, 84, 44, 6); [[0, 66], [8, 54]].forEach(([dy, y], k) => { _AL.linha(c, [[14, y + 10], [106, y - 10]], '#b9a27a', 2); for (let i = 0; i < 5; i++) _AL.pedaco(c, 26 + i * 17, y + 7 - i * 4, 7, i % 2 ? '#7a3a1a' : '#9a4a22'); }); _AL.elipse(c, 72, 48, 4, 3, '#e0313f'); },
  mikate(c) { _AL.sombra(c, 60, 84, 40, 6); [[42, 64], [70, 68], [58, 50]].forEach(([x, y]) => { c.fillStyle = _AL.rad(c, x, y, 16, '#f2c06a', '#b8702a'); c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill(); [[-5, -4], [4, 3], [6, -6]].forEach(([dx, dy]) => _AL.elipse(c, x + dx, y + dy, 1.6, 1, 'rgba(255,255,255,.7)')); }); },
});
Object.assign(ARTE_EMPREGO, {
  toloba(c) {   // telemóvel a gravar uma dança
    _AL.sombra(c, 60, 86, 40, 6); _AL.rr(c, 40, 10, 40, 74, 8, '#141012'); _AL.rr(c, 43, 16, 34, 62, 4, '#2a1f3a');
    _AL.pessoa(c, 60, 66, '#e86aa6', 1.1, 1); _AL.elipse(c, 72, 22, 3, 3, '#e0313f');
    [[22, 30], [96, 40], [24, 62]].forEach(([x, y], i) => _AL.linha(c, [[x, y], [x + 6, y - 6 + i * 3], [x + 2, y - 12]], ['#ffcb00', '#16a3a3', '#e86aa6'][i], 2.4));
  },
  mixeiro(c) {   // banca com telemóveis, roupa e notas
    _AL.sombra(c, 60, 86, 48, 6); _AL.pessoa(c, 66, 64, '#ffcb00', 1.4, 1);   // o/a mixeiro/a atrás da banca
    _AL.rr(c, 14, 54, 92, 8, 2, '#8a5a32'); _AL.linha(c, [[20, 62], [18, 86]], '#6a4424', 3); _AL.linha(c, [[100, 62], [102, 86]], '#6a4424', 3);
    [[22, 40], [36, 42]].forEach(([x, y]) => { _AL.rr(c, x, y, 11, 18, 2, '#141012'); _AL.rr(c, x + 1.5, y + 2, 8, 13, 1, '#5aa7e0'); });
    _AL.forma(c, [[54, 30], [74, 30], [80, 38], [76, 54], [52, 54], [48, 38]], '#e0313f'); _AL.rr(c, 58, 30, 12, 4, 2, '#b8202a');
    [[86, 46], [90, 42]].forEach(([x, y]) => _AL.rr(c, x, y, 16, 9, 1, '#3a9a5a'));
  },
  barbeiro(c) {   // poste de barbeiro, tesoura e máquina
    _AL.sombra(c, 60, 86, 40, 6); _AL.rr(c, 22, 14, 14, 70, 7, '#f5f1e8');
    c.save(); c.beginPath(); c.roundRect(22, 14, 14, 70, 7); c.clip(); for (let i = -2; i < 10; i++) _AL.forma(c, [[22, 14 + i * 10], [36, 4 + i * 10], [36, 10 + i * 10], [22, 20 + i * 10]], i % 2 ? '#e0313f' : '#2c6fb0'); c.restore();
    c.save(); c.translate(72, 44); c.rotate(.5); [[-1], [1]].forEach(([s]) => { _AL.linha(c, [[0, 0], [s * 4, -26]], '#9aa6ad', 3); c.strokeStyle = '#141012'; c.lineWidth = 2.4; c.beginPath(); c.arc(s * 7, 9, 6, 0, 7); c.stroke(); }); c.restore();
    _AL.rr(c, 82, 56, 14, 28, 5, '#2a2a35'); _AL.rr(c, 82, 52, 14, 6, 1, '#9aa6ad');
  },
  maquilhador(c) {   // estojo de maquilhagem: batom, pincel e paleta
    _AL.sombra(c, 60, 86, 46, 6); _AL.rr(c, 18, 52, 56, 30, 4, '#141012');
    ['#e86aa6', '#c47a2c', '#7a1fd0', '#f2c6a0', '#cc092f', '#d4af37'].forEach((k, i) => _AL.elipse(c, 28 + (i % 3) * 18, 62 + Math.floor(i / 3) * 12, 6, 4, k));
    c.save(); c.translate(90, 56); c.rotate(.3); _AL.rr(c, -5, -6, 10, 30, 2, '#d4af37'); _AL.rr(c, -4, -18, 8, 13, 3, '#cc092f'); c.restore();
    c.save(); c.translate(84, 34); c.rotate(-.7); _AL.rr(c, -2, -2, 4, 30, 2, '#8a5a32'); _AL.elipse(c, 0, -6, 4, 8, '#3a2a20'); c.restore();
  },
  pastor(c) {   // púlpito com a Bíblia aberta
    _AL.sombra(c, 60, 86, 40, 6); _AL.pessoa(c, 60, 66, '#141012', 1.5, 1);   // o/a pastor/a atrás do púlpito
    _AL.forma(c, [[36, 44], [84, 44], [78, 86], [42, 86]], '#8a5a32'); _AL.rr(c, 32, 40, 56, 8, 2, '#6a4424');
    _AL.rr(c, 56, 56, 8, 18, 0, '#d4af37'); _AL.rr(c, 51, 61, 18, 6, 0, '#d4af37');
    _AL.forma(c, [[40, 40], [60, 34], [80, 40], [60, 44]], '#f5f1e8'); _AL.linha(c, [[60, 34], [60, 44]], '#cc092f', 1.6);
  },
  treinador(c) {   // prancheta com a tática, apito e bola
    _AL.sombra(c, 60, 86, 46, 6); _AL.rr(c, 22, 16, 50, 66, 4, '#8a5a32'); _AL.rr(c, 26, 22, 42, 56, 2, '#2f8f5b'); _AL.rr(c, 40, 12, 14, 8, 2, '#9aa6ad');
    _AL.linha(c, [[47, 22], [47, 78]], 'rgba(255,255,255,.6)', 1.2); c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(47, 50, 8, 0, 7); c.stroke();
    [[36, 34], [58, 36], [36, 62], [58, 64]].forEach(([x, y]) => _AL.elipse(c, x, y, 2.4, 2.4, '#ffcb00')); _AL.linha(c, [[36, 34], [52, 46]], '#ffffff', 1.4);
    _AL.elipse(c, 92, 72, 13, 13, '#ffffff'); [[92, 72], [86, 66], [98, 66], [86, 78], [98, 78]].forEach(([x, y]) => _AL.elipse(c, x, y, 3, 3, '#141012'));
    _AL.linha(c, [[78, 30], [92, 44]], '#e0313f', 1.4); _AL.rr(c, 88, 42, 12, 7, 3, '#9aa6ad');
  },
  dj(c) {   // mesa de mistura com dois pratos e auscultadores
    _AL.sombra(c, 60, 86, 52, 6); _AL.rr(c, 8, 54, 104, 30, 4, '#1e1e24');
    [[32, 66], [88, 66]].forEach(([x, y]) => { _AL.elipse(c, x, y, 20, 9, '#141012'); _AL.elipse(c, x, y, 14, 6, '#2a2a35'); _AL.elipse(c, x, y, 4, 2, '#e86aa6'); });
    for (let i = 0; i < 3; i++) { _AL.rr(c, 52 + i * 6, 58, 3, 18, 1, '#555'); _AL.rr(c, 51 + i * 6, 62 + i * 4, 5, 4, 1, '#ffcb00'); }
    c.strokeStyle = '#141012'; c.lineWidth = 5; c.beginPath(); c.arc(60, 40, 18, Math.PI, 0); c.stroke(); _AL.rr(c, 38, 36, 9, 14, 3, '#7a1fd0'); _AL.rr(c, 73, 36, 9, 14, 3, '#7a1fd0');
  },
  estilista(c) {   // manequim com tecido de padrão africano, fita métrica
    _AL.sombra(c, 52, 86, 30, 6); _AL.linha(c, [[52, 70], [52, 86]], '#3a2a20', 3); _AL.linha(c, [[42, 86], [62, 86]], '#3a2a20', 3);
    _AL.forma(c, [[40, 18], [64, 18], [70, 40], [66, 72], [38, 72], [34, 40]], '#f2c13a'); _AL.rr(c, 46, 10, 12, 10, 4, '#d9cdb5');
    c.save(); c.beginPath(); c.moveTo(40, 18); c.lineTo(64, 18); c.lineTo(70, 40); c.lineTo(66, 72); c.lineTo(38, 72); c.lineTo(34, 40); c.closePath(); c.clip();
    for (let y = 18; y < 74; y += 10) for (let x = 32; x < 72; x += 10) { _AL.forma(c, [[x, y + 5], [x + 5, y], [x + 10, y + 5], [x + 5, y + 10]], (x + y) % 20 ? '#cc092f' : '#2c6fb0'); _AL.elipse(c, x + 5, y + 5, 1.6, 1.6, '#141012'); }
    c.restore();
    c.strokeStyle = '#ffcb00'; c.lineWidth = 3; c.beginPath(); c.moveTo(78, 30); c.bezierCurveTo(100, 40, 80, 60, 104, 76); c.stroke();
    for (let i = 0; i < 6; i++) _AL.linha(c, [[80 + i * 4, 34 + i * 7], [83 + i * 4, 33 + i * 7]], '#141012', 1);
  },
  medico(c) {   // estetoscópio, cruz e bata
    _AL.sombra(c, 60, 86, 44, 6); _AL.forma(c, [[30, 30], [90, 30], [96, 86], [24, 86]], '#f5f5f5'); _AL.forma(c, [[52, 30], [68, 30], [60, 52]], '#5aa7e0');
    _AL.linha(c, [[30, 30], [52, 52]], '#d9d9d9', 2); _AL.linha(c, [[90, 30], [68, 52]], '#d9d9d9', 2);
    c.strokeStyle = '#2a2a35'; c.lineWidth = 3; c.beginPath(); c.moveTo(48, 34); c.quadraticCurveTo(44, 64, 60, 66); c.quadraticCurveTo(76, 64, 72, 34); c.stroke();
    _AL.linha(c, [[60, 66], [62, 76]], '#2a2a35', 3); _AL.elipse(c, 62, 78, 5, 5, '#9aa6ad');
    _AL.rr(c, 76, 58, 12, 4, 1, '#e0313f'); _AL.rr(c, 80, 54, 4, 12, 1, '#e0313f');
  },
});
