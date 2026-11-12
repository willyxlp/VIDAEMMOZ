/* ============================================================
   Vida na Banda — ARTE DOS OBJETOS
   Cada móvel e cada coisa que se compra tem o seu próprio desenho
   (2.5D, no estilo do jogo). O mesmo desenho aparece em casa e,
   em ponto grande, na loja — o que vês é o que compras.
   ============================================================ */

/* ---------- móveis: um desenho por id ----------
   Coordenadas locais: a = ao longo do comprimento do móvel, b = profundidade
   (b = 0 encostado à parede do fundo, b = DEP à frente). As rotações tratam-se aqui. */
function quadroMovel(ctx, x, y, w, d, rot) {
  rot = rot || 0;
  const r1 = rot % 2 === 1, flip = rot >= 2;
  const LEN = r1 ? d : w, DEP = r1 ? w : d;
  const mapa = (a, b, A, B) => {
    let X, Y, W, D;
    if (!r1) { X = x + a; Y = y + b; W = A; D = B; } else { X = x + b; Y = y + a; W = B; D = A; }
    if (rot === 2) Y = y + d - (Y - y) - D;
    if (rot === 3) X = x + w - (X - x) - W;
    return [X, Y, W, D];
  };
  const L = (a, b, A, B, h, cor, z = 0, o) => { const [X, Y, W, D] = mapa(a, b, A, B); caixa(ctx, X, Y, W, D, h, cor, z, o); };
  const T = (a, b, A, B, cor, z = 0) => { const [X, Y, W, D] = mapa(a, b, A, B); losango(ctx, X, Y, W, D, cor, z); };
  // ponto no ecrã de um ponto local (para círculos, linhas…)
  const P = (a, b, z = 0) => { const [X, Y] = mapa(a, b, 0, 0); return iso(X, Y, z); };
  // retângulo pintado na face da frente (plano b), entre a0..a1 e alturas z0..z1 (só quando a frente está virada para nós)
  const F = (b, a0, a1, z0, z1, cor) => {
    if (flip) return;
    if (!r1) naFaceY(ctx, x, y + b, 0, a0, a1, z0, z1, cor); else naFaceX(ctx, x + b, y, 0, a0, a1, z0, z1, cor);
  };
  return { L, T, P, F, LEN, DEP, flip, r1 };
}
const circulo = (ctx, [px, py], r, cor, ry) => { ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(px, py, r, ry ?? r * 0.5, 0, 0, 7); ctx.fill(); };
const MADEIRA = '#8a5a32', MADEIRA_ESC = '#5a3a22';

const ARTE_MOVEIS = {
  /* ----- camas ----- */
  colchao(g, c, t, p) {
    g.L(0.08, 0.1, g.LEN - 0.16, g.DEP - 0.2, 5, p || '#c9b9a0');
    g.T(0.12, 0.18, g.LEN - 0.24, 0.35, '#e9e2d2', 5);           // almofada gasta
    g.T(0.15, 0.9, g.LEN - 0.3, 0.06, '#b3a283', 5);              // costura
  },
  // nas camas e sofás, a parte de trás (cabeceira, encosto) desenha-se primeiro — senão tapa o colchão;
  // quando o móvel está virado para a parede (rotação 2/3), a parte de trás fica à frente e desenha-se no fim
  cama_simples(g, c) {
    const cab = () => {
      g.L(0.08, 0.04, g.LEN - 0.16, 0.06, 24, '#7d8792');           // cabeceira de tubo
      g.L(0.08, 0.04, 0.06, 0.06, 30, '#7d8792'); g.L(g.LEN - 0.14, 0.04, 0.06, 0.06, 30, '#7d8792');
    };
    if (!g.flip) cab();
    g.L(0.08, 0.1, g.LEN - 0.16, g.DEP - 0.16, 10, '#9aa3ad');      // estrutura de metal
    g.L(0.1, 0.12, g.LEN - 0.2, g.DEP - 0.2, 5, '#f4efe6', 10);
    g.L(0.2, 0.16, g.LEN - 0.4, 0.3, 4, '#ffffff', 15);
    g.L(0.1, 0.12 + (g.DEP - 0.2) * 0.42, g.LEN - 0.2, (g.DEP - 0.2) * 0.58, 2, c, 15);
    if (g.flip) cab();
  },
  cama_casal(g, c) {
    const cab = () => g.L(0.05, 0.02, g.LEN - 0.1, 0.1, 30, MADEIRA_ESC);
    if (!g.flip) cab();
    g.L(0.05, 0.12, g.LEN - 0.1, g.DEP - 0.17, 10, MADEIRA);
    g.L(0.08, 0.15, g.LEN - 0.16, g.DEP - 0.23, 5, '#f4efe6', 10);
    const pw = (g.LEN - 0.5) / 2;
    g.L(0.18, 0.2, pw, 0.3, 4, '#ffffff', 15); g.L(0.32 + pw, 0.2, pw, 0.3, 4, '#ffffff', 15);
    g.L(0.08, 0.15 + (g.DEP - 0.23) * 0.4, g.LEN - 0.16, (g.DEP - 0.23) * 0.6, 2, c, 15);
    g.T(0.08, 0.15 + (g.DEP - 0.23) * 0.4, g.LEN - 0.16, 0.08, shade(c, 0.25), 17);
    if (g.flip) cab();
  },
  cama_king(g, c, t, p) {
    const cab = () => {   // cabeceira alta, estofada, com botões dourados
      g.L(0.02, 0.01, g.LEN - 0.04, 0.12, 46, '#5a4126', 0, { frente: '#7a5a36' });
      g.F(0.13, 0.12, g.LEN - 0.12, 18, 42, '#8c6a3f');
      if (!g.flip) for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) circulo(g.ctx, g.P(0.25 + i * (g.LEN - 0.5) / 5, 0.13, 22 + k * 8), 1.3, '#d4af37', 1.3);
      g.L(0.02, 0.01, g.LEN - 0.04, 0.12, 3, '#d4af37', 46);
    };
    if (!g.flip) cab();
    g.L(0.03, 0.13, g.LEN - 0.06, g.DEP - 0.17, 12, '#3a2a1c');
    g.L(0.06, 0.16, g.LEN - 0.12, g.DEP - 0.23, 6, '#fbf7ee', 12);
    const pw = (g.LEN - 0.4) / 4;
    for (let i = 0; i < 4; i++) g.L(0.14 + i * (pw + 0.04), 0.2, pw, 0.28, 5, i % 3 ? '#e8d9b0' : '#ffffff', 18);
    g.L(0.06, 0.16 + (g.DEP - 0.23) * 0.38, g.LEN - 0.12, (g.DEP - 0.23) * 0.62, 2, p || '#f1e6cc', 18);
    g.T(0.06, 0.16 + (g.DEP - 0.23) * 0.62, g.LEN - 0.12, 0.22, '#d4af37', 20);   // faixa dourada
    if (g.flip) cab();
  },
  /* ----- sofás ----- */
  sofa(g, c) {
    const enc = () => g.L(0.08, 0.08, g.LEN - 0.16, 0.24, 26, shade(c, -0.1));
    g.L(0.08, 0.08, 0.18, g.DEP - 0.16, 18, c);                    // braço de trás (fica mais longe)
    if (!g.flip) enc();
    g.L(0.08, 0.32, g.LEN - 0.16, g.DEP - 0.4, 11, c);
    const cw = (g.LEN - 0.6) / 2;
    g.L(0.28, 0.34, cw, g.DEP - 0.5, 3, shade(c, 0.12), 11); g.L(0.32 + cw, 0.34, cw, g.DEP - 0.5, 3, shade(c, 0.12), 11);
    if (g.flip) enc();
    g.L(g.LEN - 0.26, 0.08, 0.18, g.DEP - 0.16, 18, c);
  },
  poltrona(g, c) {
    const enc = () => g.L(0.12, 0.1, 0.76, 0.22, 28, shade(c, -0.12));
    g.L(0.1, 0.12, 0.16, 0.72, 19, c);
    if (!g.flip) enc();
    g.L(0.12, 0.32, 0.76, 0.52, 11, c);
    g.L(0.28, 0.36, 0.44, 0.42, 3, shade(c, 0.15), 11);
    if (g.flip) enc();
    g.L(0.74, 0.12, 0.16, 0.72, 19, c);
  },
  sofa_couro(g, c) {
    const enc = () => {
      g.L(0.08, 0.07, g.LEN - 0.16, 0.26, 28, shade(c, -0.08));
      g.F(0.33, 0.3, g.LEN - 0.3, 16, 27, shade(c, 0.12));
      if (!g.flip) for (let i = 0; i < 5; i++) for (let k = 0; k < 2; k++) circulo(g.ctx, g.P(0.42 + i * (g.LEN - 0.84) / 4, 0.33, 19 + k * 5), 0.9, shade(c, -0.35), 0.9);
    };
    [[0.12, 0.15], [g.LEN - 0.16, 0.15], [0.12, g.DEP - 0.18], [g.LEN - 0.16, g.DEP - 0.18]].forEach(([a, b]) => g.L(a, b, 0.04, 0.04, 4, '#c8ccd2'));
    g.L(0.05, 0.07, 0.22, g.DEP - 0.14, 20, shade(c, 0.05));
    if (!g.flip) enc();
    g.L(0.08, 0.33, g.LEN - 0.16, g.DEP - 0.41, 9, c, 4);
    const cw = (g.LEN - 0.62) / 3;
    for (let i = 0; i < 3; i++) g.L(0.31 + i * cw, 0.36, cw - 0.02, g.DEP - 0.52, 4, shade(c, 0.1), 13);
    if (g.flip) enc();
    g.L(g.LEN - 0.27, 0.07, 0.22, g.DEP - 0.14, 20, shade(c, 0.05));
  },
  sofa_ouro(g, c) {
    const enc = () => { for (let i = 0; i < 5; i++) g.L(0.1 + i * (g.LEN - 0.2) / 5, 0.07, (g.LEN - 0.2) / 5, 0.24, 26 + (i % 2 === 0 ? 4 : 0), shade(c, -0.08)); };
    g.L(0.06, 0.08, 0.2, g.DEP - 0.16, 19, c);
    if (!g.flip) enc();
    g.L(0.08, 0.31, g.LEN - 0.16, g.DEP - 0.39, 11, c);
    const cw = (g.LEN - 0.6) / 3;
    for (let i = 0; i < 3; i++) g.L(0.3 + i * cw, 0.34, cw - 0.03, g.DEP - 0.5, 4, '#e9cf6a', 11);
    g.L(0.4, 0.36, 0.22, 0.12, 6, '#cc092f', 15);   // almofada vermelha
    if (g.flip) enc();
    g.L(g.LEN - 0.26, 0.08, 0.2, g.DEP - 0.16, 19, c);
  },
  /* ----- televisões ----- */
  tv(g, c, t, p) {
    g.L(0.12, 0.25, g.LEN - 0.24, 0.55, 14, p || MADEIRA);
    g.F(0.8, 0.18, g.LEN - 0.18, 4, 11, p ? shade(p, -0.2) : MADEIRA_ESC);
    g.L(0.42, 0.4, 0.16, 0.12, 3, '#2a2a2a', 14);
    g.L(0.22, 0.4, g.LEN - 0.44, 0.08, 24, '#151515', 17, { lado: '#151515', frente: '#202024' });
    g.F(0.48, 0.25, g.LEN - 0.25, 19.5, 39, `hsl(${(t * 40) % 360},50%,${44 + Math.sin(t * 3) * 7}%)`);
  },
  tv_gigante(g, c, t, p) {
    g.L(0.04, 0.4, g.LEN - 0.08, 0.5, 10, p || '#2b2b30');            // consola baixa e comprida
    g.F(0.9, 0.08, g.LEN - 0.08, 2, 8, p ? shade(p, 0.15) : '#3a3a42');
    g.L(0.3, 0.55, g.LEN - 0.6, 0.12, 4, '#111', 10);             // barra de som
    g.F(0.67, 0.34, g.LEN - 0.34, 11, 13, '#444');
    g.L(0.06, 0.36, g.LEN - 0.12, 0.05, 44, '#0b0b0d', 14, { lado: '#0b0b0d', frente: '#141418' });
    const h = (t * 30) % 360;
    g.F(0.41, 0.1, g.LEN - 0.1, 16, 56, `hsl(${h},45%,30%)`);
    g.F(0.41, 0.1, g.LEN - 0.1, 16, 30, `hsl(${(h + 120) % 360},55%,42%)`);   // jogo a passar: relvado
    g.F(0.41, 0.1, g.LEN - 0.1, 22, 23, 'rgba(255,255,255,.6)');
  },
  /* ----- som ----- */
  som(g, c, t, p) {
    g.L(0.25, 0.25, 0.5, 0.5, 30, p || '#1c1c1c');
    g.F(0.75, 0.3, 0.7, 6, 14, '#555'); g.F(0.75, 0.3, 0.7, 18, 26, '#555');
  },
  som_premium(g, c, t, p) {
    g.L(0.06, 0.25, 0.26, 0.4, 54, p || '#2a2a2a');                    // torre esquerda
    g.L(0.68, 0.25, 0.26, 0.4, 54, p || '#2a2a2a');                    // torre direita
    for (const a0 of [0.08, 0.7]) { g.F(0.65, a0, a0 + 0.22, 8, 18, '#5b5b5b'); g.F(0.65, a0, a0 + 0.22, 24, 34, '#5b5b5b'); g.F(0.65, a0 + 0.06, a0 + 0.16, 42, 47, '#9a9a9a'); }
    g.L(0.34, 0.45, 0.32, 0.4, 18, '#151515');                    // subwoofer
    g.F(0.85, 0.37, 0.63, 4, 14, '#3b3b3b');
  },
  som_kuduro(g, c, t, p) {
    g.L(0.18, 0.2, 0.64, 0.6, 40, p || '#1a1a1f');
    const cor = i => `hsl(${(t * 120 + i * 90) % 360},90%,58%)`;
    g.F(0.8, 0.24, 0.76, 6, 18, cor(0)); g.F(0.8, 0.3, 0.7, 9, 15, '#111');
    g.F(0.8, 0.24, 0.76, 22, 34, cor(1)); g.F(0.8, 0.3, 0.7, 25, 31, '#111');
    g.L(0.42, 0.42, 0.16, 0.16, 6, '#333', 40);                   // pega
  },
  /* ----- mesa e cadeira ----- */
  mesa(g, c) {
    [[0.15, 0.15], [g.LEN - 0.25, 0.15], [0.15, g.DEP - 0.25], [g.LEN - 0.25, g.DEP - 0.25]].forEach(([a, b]) => g.L(a, b, 0.1, 0.1, 16, shade(c, -0.2)));
    g.L(0.1, 0.1, g.LEN - 0.2, g.DEP - 0.2, 3, c, 16);
    circulo(g.ctx, g.P(0.55, g.DEP / 2, 19), 6, '#f4f4f4'); circulo(g.ctx, g.P(g.LEN - 0.55, g.DEP / 2, 19), 6, '#f4f4f4');
    circulo(g.ctx, g.P(g.LEN / 2, g.DEP / 2, 19), 4, '#cc092f');  // jarra
  },
  cadeira(g, c) {
    g.L(0.25, 0.25, 0.5, 0.5, 3, c, 11);
    [[0.27, 0.27], [0.63, 0.27], [0.27, 0.63], [0.63, 0.63]].forEach(([a, b]) => g.L(a, b, 0.08, 0.08, 11, shade(c, -0.2)));
    g.L(0.25, 0.25, 0.5, 0.08, 26, c);
  },
  /* ----- cozinha e casa de banho ----- */
  fogao(g, c, t, p) {
    g.L(0.1, 0.12, 0.62, 0.76, 24, p || '#ececec');
    [[0.26, 0.3], [0.54, 0.3], [0.26, 0.64], [0.54, 0.64]].forEach(([a, b]) => circulo(g.ctx, g.P(a, b, 24), 5, '#222'));
    g.F(0.88, 0.16, 0.66, 4, 16, '#333');
    g.L(0.74, 0.5, 0.2, 0.2, 18, '#cc4b1c');                       // botija de gás
    g.L(0.79, 0.55, 0.1, 0.1, 4, '#888', 18);
  },
  frigorifico(g, c, t, p) {
    g.L(0.1, 0.1, 0.8, 0.8, 52, p || '#f2f2f2');
    g.F(0.9, 0.05, 0.75, 34, 35.5, '#bbb');
    g.F(0.9, 0.62, 0.68, 38, 48, '#999'); g.F(0.9, 0.62, 0.68, 14, 30, '#999');
    g.F(0.9, 0.12, 0.3, 40, 46, '#cc092f');                        // íman
  },
  // ---------- interiores ----------
  int_balcao(g, c) {
    const L = g.LEN;
    g.L(0.05, 0.15, L - 0.1, 0.7, 22, shade(c, -0.1));
    g.L(0.02, 0.1, L - 0.04, 0.8, 2.5, '#efe6d2', 22);                         // tampo
    for (let i = 0; i < L; i++) g.F(0.85, i + 0.1, i + 0.9, 4, 18, shade(c, 0.08));
    const [px, py] = g.P(L - 0.5, 0.45, 25); g.ctx.fillStyle = '#d4af37'; g.ctx.beginPath(); g.ctx.arc(px, py, 2.4, 0, 7); g.ctx.fill();   // campainha
    g.L(0.3, 0.3, 0.35, 0.25, 7, '#1e1e24', 24.5);                            // caixa registadora
  },
  int_mesa_rest(g, c) {
    g.L(0.45, 0.45, 0.1, 0.1, 18, '#5a3a22');
    g.L(0.1, 0.1, 0.8, 0.8, 2, c, 18);
    g.T(0.15, 0.15, 0.7, 0.7, '#f5f1e8', 20.2);                                // toalha
    for (const [a, b] of [[0.32, 0.35], [0.62, 0.6]]) { const [px, py] = g.P(a, b, 21); g.ctx.fillStyle = '#fff'; g.ctx.beginPath(); g.ctx.ellipse(px, py, 4, 2, 0, 0, 7); g.ctx.fill(); g.ctx.fillStyle = '#c0392b'; g.ctx.beginPath(); g.ctx.ellipse(px, py - 0.5, 2, 1, 0, 0, 7); g.ctx.fill(); }
    g.L(0.7, 0.25, 0.07, 0.07, 8, '#2f8f5b', 20);                              // garrafa
  },
  int_passadeira(g, c) {
    g.L(0.15, 0.1, 0.7, 1.8, 6, '#2a2a2e');
    g.T(0.22, 0.25, 0.56, 1.5, '#111', 6.2);
    g.L(0.15, 0.1, 0.08, 0.08, 34, '#777'); g.L(0.77, 0.1, 0.08, 0.08, 34, '#777');
    g.L(0.15, 0.08, 0.7, 0.18, 6, '#444', 32);                                 // painel
    const [px, py] = g.P(0.5, 0.17, 38); g.ctx.fillStyle = '#16a3a3'; g.ctx.fillRect(px - 4, py - 1.5, 8, 3);
  },
  int_halteres(g) {
    const L = g.LEN;
    g.L(0.1, 0.3, L - 0.2, 0.4, 16, '#3a3a3e');
    for (let i = 0; i < L * 3 - 1; i++) { const [px, py] = g.P(0.35 + i * 0.32, 0.5, 18); g.ctx.fillStyle = i % 2 ? '#c0392b' : '#222'; g.ctx.beginPath(); g.ctx.ellipse(px, py, 3.5, 3.5, 0, 0, 7); g.ctx.fill(); }
  },
  int_multibanco(g, c) {
    g.L(0.2, 0.25, 0.6, 0.5, 44, c);
    g.F(0.75, 0.3, 0.7, 26, 38, '#1e2a36');                                    // ecrã
    g.F(0.75, 0.35, 0.65, 14, 22, '#bbb');                                     // teclado
    const [px, py] = g.P(0.5, 0.5, 46); g.ctx.fillStyle = '#fff'; g.ctx.font = '700 6px Inter, sans-serif'; g.ctx.textAlign = 'center'; g.ctx.fillText('MCX', px, py);
  },
  int_quadro(g, c) {
    const L = g.LEN;
    g.L(0.05, 0.05, L - 0.1, 0.12, 50, '#5a3a22');
    g.F(0.17, 0.12, L - 0.12, 18, 48, c);
    g.ctx.strokeStyle = 'rgba(255,255,255,.7)'; g.ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const [ax, ay] = g.P(0.3 + k * 0.9, 0.17, 40 - k * 6), [bx, by] = g.P(0.9 + k * 0.9, 0.17, 40 - k * 6); g.ctx.beginPath(); g.ctx.moveTo(ax, ay); g.ctx.lineTo(bx, by); g.ctx.stroke(); }
  },
  int_dj(g, c, t) {
    const L = g.LEN;
    g.L(0.05, 0.2, L - 0.1, 0.6, 20, c);
    for (const a of [0.6, L - 0.6]) { const [px, py] = g.P(a, 0.5, 21); g.ctx.fillStyle = '#333'; g.ctx.beginPath(); g.ctx.ellipse(px, py, 7, 3.5, 0, 0, 7); g.ctx.fill(); g.ctx.fillStyle = '#cc092f'; g.ctx.beginPath(); g.ctx.ellipse(px, py, 2, 1, 0, 0, 7); g.ctx.fill(); }
    g.F(0.8, 0.3, L - 0.3, 6, 16, ['#7a1fd0', '#16a3a3', '#cc092f'][Math.floor((t || 0) / 400) % 3]);
  },
  int_pista(g, c, t) {
    const L = g.LEN, D = g.DEP, k = Math.floor((t || 0) / 350);
    const cores = ['#7a1fd0', '#cc092f', '#16a3a3', '#f5b81c', '#e86aa6'];
    for (let i = 0; i < L; i++) for (let j = 0; j < D; j++) g.T(i + 0.04, j + 0.04, 0.92, 0.92, shade(cores[(i * 3 + j * 5 + k) % cores.length], -0.1), 0.5);
  },
  int_prateleira(g) {
    const L = g.LEN;
    g.L(0.05, 0.25, L - 0.1, 0.5, 46, '#e9e4dc');
    const cores = ['#cc092f', '#2c6fb0', '#f5b81c', '#2f8f5b', '#e86aa6', '#16a3a3'];
    for (let s = 0; s < 4; s++) for (let b = 0; b < L * 4 - 1; b++) g.F(0.75, 0.12 + b * 0.24, 0.3 + b * 0.24, 4 + s * 11, 11 + s * 11, cores[(b + s * 2) % cores.length]);
  },
  int_secretaria(g, c) {
    const L = g.LEN;
    g.L(0.05, 0.15, L - 0.1, 0.7, 18, c);
    g.L(0.3, 0.3, 0.6, 0.12, 14, '#1e1e24', 18);                               // monitor
    g.F(0.42, 0.33, 0.87, 20, 30, '#2c6fb0');
    g.L(L - 0.6, 0.35, 0.35, 0.3, 3, '#f5f1e8', 18);                           // papéis
  },
  int_banco_igreja(g, c) {
    const L = g.LEN;
    g.L(0.05, 0.3, L - 0.1, 0.5, 12, c);
    g.L(0.05, 0.1, L - 0.1, 0.18, 26, shade(c, -0.15));
  },
  sanita(g, c) {
    g.L(0.3, 0.12, 0.4, 0.18, 30, c);                                  // autoclismo
    g.L(0.32, 0.3, 0.36, 0.42, 14, c);                                 // base
    g.T(0.35, 0.33, 0.3, 0.36, '#cfe7ef', 14.5);                       // água
    g.L(0.31, 0.29, 0.38, 0.44, 1.5, shade(c, -0.12), 14);             // assento
  },
  sanita_luxo(g, c) { ARTE_MOVEIS.sanita(g, c); g.L(0.45, 0.13, 0.1, 0.04, 2, '#d4af37', 30); },
  lavatorio(g, c) {
    g.L(0.2, 0.15, 0.6, 0.12, 22, '#b5b5b5');                          // parede/espelho base
    g.L(0.42, 0.4, 0.16, 0.16, 18, '#cfcfcf');                         // pé
    g.L(0.22, 0.25, 0.56, 0.45, 5, c, 18);                             // bacia
    g.T(0.28, 0.3, 0.44, 0.33, '#bfe3f2', 22.5);
    g.L(0.47, 0.22, 0.06, 0.08, 6, '#999', 23);                        // torneira
    g.ctx.globalAlpha = 0.5; g.L(0.22, 0.12, 0.56, 0.04, 24, '#e8f7ff', 30); g.ctx.globalAlpha = 1;   // espelho
  },
  lavatorio_marmore(g, c) { ARTE_MOVEIS.lavatorio(g, c); g.L(0.47, 0.22, 0.06, 0.08, 6, '#d4af37', 23); },
  microondas(g, c) {
    g.L(0.1, 0.25, 0.8, 0.5, 12, '#8a5a32');                           // mesinha
    g.L(0.18, 0.3, 0.64, 0.4, 14, c, 12);
    g.F(0.7, 0.22, 0.6, 15, 24, '#1e1e24'); g.F(0.7, 0.66, 0.76, 15, 24, '#555');
  },
  bancada(g, c) {
    const L = g.LEN;
    g.L(0.05, 0.1, L - 0.1, 0.8, 20, '#f2efe8');
    g.L(0.03, 0.08, L - 0.06, 0.84, 2, c, 20);
    for (let i = 0; i < Math.round(L * 2); i++) g.F(0.9, 0.1 + i * 0.5, 0.5 + i * 0.5, 4, 17, shade('#f2efe8', -0.08));
    g.L(L / 2 - 0.25, 0.25, 0.5, 0.35, 1, '#bfc7cc', 21.5);              // lava-loiça
  },
  bancada_marmore(g, c) { ARTE_MOVEIS.bancada(g, c); },
  maquina_lavar(g, c) {
    g.L(0.12, 0.12, 0.76, 0.76, 30, c);
    const [px, py] = g.P(0.5, 0.88, 15); g.ctx.fillStyle = '#9fb7c4'; g.ctx.beginPath(); g.ctx.ellipse(px, py, 7, 6, 0, 0, 7); g.ctx.fill();
    g.F(0.88, 0.2, 0.8, 26, 29, '#bbb');
  },
  fogao_luxo(g, c) {
    const L = g.LEN;
    g.L(0.08, 0.1, L - 0.16, 0.8, 24, '#333');
    g.T(0.12, 0.14, L - 0.24, 0.72, c, 24.5);
    [[0.4, 0.35], [0.9, 0.35], [1.4, 0.35], [0.65, 0.65], [1.15, 0.65]].forEach(([a, b]) => { if (a < L - 0.1) { const [px, py] = g.P(a, b, 25); g.ctx.strokeStyle = '#c0392b'; g.ctx.lineWidth = 1; g.ctx.beginPath(); g.ctx.ellipse(px, py, 5, 2.5, 0, 0, 7); g.ctx.stroke(); } });
  },
  frigorifico_duplo(g, c) {
    const L = g.LEN;
    g.L(0.1, 0.12, L - 0.2, 0.76, 56, c);
    g.F(0.88, L / 2 - 0.02, L / 2 + 0.02, 2, 56, '#8a959c');
    g.F(0.88, L / 2 - 0.15, L / 2 - 0.1, 26, 44, '#666'); g.F(0.88, L / 2 + 0.1, L / 2 + 0.15, 26, 44, '#666');
  },
  chuveiro_grande(g, c, t, p) {
    const L = g.LEN, D = g.DEP;
    g.T(0.05, 0.05, L - 0.1, D - 0.1, p ? shade(p, 0.35) : '#d6eef7'); g.L(0.05, 0.05, L - 0.1, D - 0.1, 2, p || '#a9d8ec');
    g.ctx.globalAlpha = 0.3; g.L(0.05, D - 0.1, L - 0.1, 0.05, 58, '#e8f7ff', 2); g.ctx.globalAlpha = 1;   // vidro
    [0.35, L - 0.45].forEach(a => { g.L(a, 0.1, 0.06, 0.06, 64, '#999'); g.L(a - 0.1, 0.1, 0.26, 0.2, 2, '#bbb', 62); });
    g.ctx.fillStyle = 'rgba(160,210,240,.7)'; for (let i = 0; i < 10; i++) { const [px, py] = g.P(0.3 + (i % 5) * (L - 0.6) / 4, 0.3 + (i % 2) * 0.2, 50 - (i % 4) * 9); g.ctx.fillRect(px, py, 1.5, 4); }
  },
  banheira(g, c, t, p) {
    const L = g.LEN, D = g.DEP;
    g.L(0.08, 0.08, L - 0.16, D - 0.16, 18, p || '#f7f7f4');
    g.T(0.16, 0.16, L - 0.32, D - 0.32, '#8fd0ea', 17);
    g.L(0.12, 0.12, 0.08, 0.08, 24, '#b5b5b5');
    g.F(D - 0.08, 0.08, L - 0.08, 2, 16, p ? shade(p, -0.1) : '#e6e6e0');
  },
  banheira_grande(g, c) { ARTE_MOVEIS.banheira(g, c); g.L(g.LEN - 0.3, 0.12, 0.12, 0.12, 24, '#d4af37'); },
  jacuzzi(g, c, t, p) {
    const L = g.LEN, D = g.DEP;
    g.L(0.05, 0.05, L - 0.1, D - 0.1, 16, p || '#5a3a22');
    g.L(0.12, 0.12, L - 0.24, D - 0.24, 16, '#e9f4f7');
    g.T(0.2, 0.2, L - 0.4, D - 0.4, '#3fb8d8', 15);
    g.ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 9; i++) { const ph = ((t || 0) / 700 + i * 0.37) % 1; const [px, py] = g.P(0.35 + (i % 3) * (L - 0.7) / 2, 0.35 + Math.floor(i / 3) * (D - 0.7) / 2, 15 + ph * 6); g.ctx.beginPath(); g.ctx.arc(px, py, 1.5 + ph, 0, 7); g.ctx.fill(); }
  },
  chuveiro(g, c, t, p) {
    g.T(0.05, 0.05, 0.9, 0.9, p ? shade(p, 0.35) : '#bfe3f2');
    g.L(0.05, 0.05, 0.9, 0.9, 2, p || '#9fd3ea');
    g.L(0.08, 0.08, 0.05, 0.05, 62, '#aaa');
    g.L(0.08, 0.08, 0.32, 0.08, 3, '#aaa', 60);
    g.ctx.globalAlpha = 0.5; g.L(0.88, 0.05, 0.03, 0.9, 54, '#e8f7ff', 6); g.ctx.globalAlpha = 1;   // cortina
    g.ctx.fillStyle = 'rgba(160,210,240,.7)'; for (let i = 0; i < 6; i++) { const [px, py] = g.P(0.3 + (i % 3) * 0.06, 0.15 + (i % 2) * 0.06, 50 - i * 7); g.ctx.fillRect(px, py, 1, 4); }
  },
  /* ----- livros, clima ----- */
  estante(g, c) {
    g.L(0.1, 0.2, 0.8, 0.6, 52, c);
    for (let s = 0; s < 4; s++) for (let b = 0; b < 5; b++) g.F(0.8, 0.14 + b * 0.14, 0.24 + b * 0.14, 6 + s * 12, 15 + s * 12, ['#c0392b', '#2c6fb0', '#f5b81c', '#2f8f5b', '#eee'][(b + s) % 5]);
  },
  ventoinha(g, c, t, p) {
    g.L(0.4, 0.4, 0.2, 0.2, 3, p || '#ddd'); g.L(0.47, 0.47, 0.06, 0.06, 36, p ? shade(p, -0.1) : '#bbb');
    const [px, py] = g.P(0.5, 0.5, 42); const ctx = g.ctx;
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(200,220,230,.8)'; for (let i = 0; i < 3; i++) { const a = t * 15 + i * 2.1; ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 5, py + Math.sin(a) * 5, 5, 2.5, a, 0, 7); ctx.fill(); }
  },
  ac(g, c, t, p) {
    g.L(0.15, 0.3, 0.7, 0.4, 46, p || '#f7f7f7');
    for (let i = 0; i < 5; i++) g.F(0.7, 0.2, 0.8, 30 + i * 3, 31 + i * 3, '#b9bec4');
    g.F(0.7, 0.62, 0.74, 14, 18, '#4cbf74');                       // luzinha verde
    g.ctx.fillStyle = 'rgba(160,220,255,.35)'; const [px, py] = g.P(0.5, 0.85, 30); g.ctx.fillRect(px - 8, py, 16, 8);
  },
  /* ----- plantas ----- */
  planta(g, c) {
    g.L(0.35, 0.35, 0.3, 0.3, 10, '#b5653a');
    const [px, py] = g.P(0.5, 0.5, 18), ctx = g.ctx;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.fillStyle = shade(c, 0.2); ctx.beginPath(); ctx.arc(px - 3, py - 4, 5, 0, 7); ctx.fill();
  },
  palmeira(g, c, t, p) {
    g.L(0.32, 0.32, 0.36, 0.36, 12, p || '#c47a2c');
    const [px, py] = g.P(0.5, 0.5, 12), ctx = g.ctx;
    ctx.strokeStyle = '#7a5a33'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2, py - 26); ctx.stroke();
    ctx.fillStyle = p ? '#3f8f3a' : c; for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(px + 2, py - 26); ctx.rotate(i * 1.05 + Math.sin(t) * 0.05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -4, 16, 4); ctx.quadraticCurveTo(8, 1, 0, 0); ctx.fill(); ctx.restore(); }
  },
  /* ----- luz ----- */
  candeeiro(g, c) {
    g.L(0.38, 0.38, 0.24, 0.24, 2, '#444'); g.L(0.47, 0.47, 0.06, 0.06, 38, '#666');
    const ctx = g.ctx, [px, py] = g.P(0.5, 0.5, 50);
    poly(ctx, [[px - 7, py + 6], [px + 7, py + 6], [px + 5, py - 6], [px - 5, py - 6]], c);
    poly(ctx, [[px - 7, py + 6], [px + 7, py + 6], [px + 5, py + 4], [px - 5, py + 4]], shade(c, -0.2));
    ctx.fillStyle = 'rgba(255,230,140,.25)'; ctx.beginPath(); ctx.ellipse(px, py + 12, 14, 6, 0, 0, 7); ctx.fill();
  },
  lustre(g, c, t, p) {
    g.L(0.36, 0.36, 0.28, 0.28, 3, p ? shade(p, -0.15) : '#b8932b'); g.L(0.47, 0.47, 0.06, 0.06, 40, p || '#d4af37');
    const ctx = g.ctx, [px, py] = g.P(0.5, 0.5, 46);
    ctx.strokeStyle = p || '#d4af37'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + i * 5, py + 4, px + i * 6, py - 4); ctx.stroke(); }
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.ellipse(px + i * 6, py - 6, 1.6, 2.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(210,240,255,${0.6 + Math.sin(t * 3 + i) * 0.3})`; ctx.fillRect(px + i * 6 - 0.6, py + 1, 1.2, 4);
    }
    ctx.fillStyle = 'rgba(255,220,120,.2)'; ctx.beginPath(); ctx.ellipse(px, py + 30, 16, 7, 0, 0, 7); ctx.fill();
  },
  neon_vida(g, c, t) {
    g.L(0.2, 0.42, 0.6, 0.16, 4, '#222');
    g.L(0.47, 0.47, 0.06, 0.06, 18, '#333', 4);
    g.L(0.1, 0.46, 0.8, 0.06, 22, '#1a1020', 20, { lado: '#1a1020', frente: '#2a1830' });
    const brilho = 0.75 + Math.sin(t * 6) * 0.25, ctx = g.ctx;
    ctx.save(); ctx.globalAlpha = brilho; ctx.shadowColor = c; ctx.shadowBlur = 10;
    g.F(0.52, 0.18, 0.82, 34, 36, c); g.F(0.52, 0.18, 0.5, 28, 30, c); g.F(0.52, 0.56, 0.82, 28, 30, '#ffcb00');
    ctx.restore();
  },
  /* ----- tapetes ----- */
  tapete(g, c) {
    g.T(0.1, 0.1, g.LEN - 0.2, g.DEP - 0.2, c);
    g.T(0.3, 0.3, g.LEN - 0.6, g.DEP - 0.6, shade(c, 0.25)); g.T(0.5, 0.5, g.LEN - 1, g.DEP - 1, c);
  },
  tapete_azul(g, c) {
    g.T(0.1, 0.1, g.LEN - 0.2, g.DEP - 0.2, c);
    for (let i = 0; i < 4; i++) g.T(0.1, 0.3 + i * 0.4, g.LEN - 0.2, 0.12, shade(c, 0.35));   // riscas
  },
  tapete_ouro(g, c, t, p) {
    g.T(0.08, 0.08, g.LEN - 0.16, g.DEP - 0.16, p || '#d4af37');
    g.T(0.2, 0.2, g.LEN - 0.4, g.DEP - 0.4, '#7a1f2b');
    g.T(0.45, 0.45, g.LEN - 0.9, g.DEP - 0.9, p || '#d4af37');
    g.T(0.62, 0.62, g.LEN - 1.24, g.DEP - 1.24, '#2b4f8c');
    for (let i = 0; i < 6; i++) g.T(0.24 + i * (g.LEN - 0.6) / 5, 0.24, 0.12, 0.12, '#f1d27a');
  },
  /* ----- arte e peixes ----- */
  quadro(g, c, t, p) {
    g.L(0.2, 0.4, 0.6, 0.12, 4, p || MADEIRA_ESC);
    g.L(0.25, 0.45, 0.5, 0.06, 36, p || '#e0b03a', 4);
    g.F(0.51, 0.06, 0.44, 8, 32, '#1f6c94');                       // mar
    g.F(0.51, 0.06, 0.44, 8, 13, '#e6cf98');                       // areia
    g.F(0.51, 0.2, 0.3, 14, 24, '#3a2a20');                        // a Kianda
    g.F(0.51, 0.18, 0.34, 12, 15, '#2f9a8a');
  },
  aquario(g, c, t) {
    g.L(0.1, 0.25, 0.8, 0.5, 16, MADEIRA_ESC);
    g.ctx.globalAlpha = 0.85; g.L(0.12, 0.27, 0.76, 0.46, 28, c, 16, { topo: shade(c, 0.35) }); g.ctx.globalAlpha = 1;
    const peixe = (k, cor) => { const [px, py] = g.P(0.25 + ((t * 0.15 + k * 0.3) % 0.55), 0.73, 26 + k * 7); g.ctx.fillStyle = cor; g.ctx.beginPath(); g.ctx.ellipse(px, py, 3, 1.6, 0, 0, 7); g.ctx.fill(); };
    peixe(0, '#ff8a1c'); peixe(1, '#ffcb00'); peixe(2, '#ff5a6e');
    g.F(0.73, 0.15, 0.85, 17, 19, '#e6cf98');
  },
  aquario_tubarao(g, c, t) {
    g.L(0.05, 0.2, 0.9, 0.6, 16, '#1e1e24');
    g.ctx.globalAlpha = 0.85; g.L(0.07, 0.22, 0.86, 0.56, 36, c, 16, { topo: shade(c, 0.35) }); g.ctx.globalAlpha = 1;
    const [px, py] = g.P(0.25 + ((t * 0.1) % 0.5), 0.78, 34), ctx = g.ctx;
    ctx.fillStyle = '#8b98a6'; ctx.beginPath(); ctx.ellipse(px, py, 7, 2.6, 0, 0, 7); ctx.fill();   // tubarão-bebé
    poly(ctx, [[px - 1, py - 2], [px + 2, py - 6], [px + 3, py - 2]], '#8b98a6');
    poly(ctx, [[px - 7, py], [px - 10, py - 3], [px - 10, py + 3]], '#8b98a6');
    ctx.fillStyle = '#fff'; ctx.fillRect(px + 4, py - 1, 1, 1);
    g.F(0.78, 0.1, 0.9, 17, 19, '#e6cf98');
  },
  // 8 nov (FILA 0eu): móveis só com Ouro
  piano_ouro(g, c) {
    const L = g.LEN, ouro = '#d4af37', laca = '#141012';
    [[0.18, 0.72], [L - 0.24, 0.72]].forEach(([a, b]) => g.L(a, b, 0.06, 0.06, 24, ouro));
    g.L(0.1, 0.12, L - 0.2, 0.45, 46, laca, 0, { topo: '#26222a' });                  // caixa do piano
    g.L(0.1, 0.12, L - 0.2, 0.45, 2, ouro, 46);                                        // friso dourado
    g.F(0.57, 0.3, L - 0.3, 30, 42, '#2a2530'); g.F(0.57, L / 2 - 0.2, L / 2 + 0.2, 36, 38, ouro);
    g.L(0.14, 0.57, L - 0.28, 0.2, 4, laca, 24);                                       // teclado
    g.L(0.18, 0.59, L - 0.36, 0.14, 1, '#f4f2ee', 28);
    for (let k = 0; k < 14; k++) if (k % 7 !== 2 && k % 7 !== 6) g.L(0.22 + k * (L - 0.44) / 14, 0.59, 0.05, 0.08, 1, '#18181b', 29);
    g.L(L / 2 - 0.3, 0.82, 0.6, 0.15, 14, '#7a1f2b', 0, { topo: '#9b2a3a' });          // banco
  },
  trono_ouro(g, c) {
    const ouro = '#d4af37', veludo = '#9b1b30';
    g.L(0.14, 0.12, 0.72, 0.16, 64, ouro, 0, { topo: '#f0d27a' });                     // encosto alto
    g.F(0.28, 0.24, 0.76, 22, 56, veludo);
    [0.2, 0.46, 0.72].forEach(a => g.L(a, 0.14, 0.08, 0.1, 7, '#f0d27a', 64));          // coroa
    g.L(0.16, 0.28, 0.68, 0.58, 14, ouro);                                             // base
    g.L(0.22, 0.3, 0.56, 0.52, 5, veludo, 14, { topo: '#b8263c' });                    // almofada
    g.L(0.1, 0.3, 0.12, 0.56, 26, ouro); g.L(0.78, 0.3, 0.12, 0.56, 26, ouro);          // braços
  },
  aquario_peixe_ouro(g, c, t) {
    const ctx = g.ctx;
    g.L(0.28, 0.28, 0.44, 0.44, 14, '#5a3a22');                                         // mesinha
    ctx.globalAlpha = 0.8; g.L(0.22, 0.22, 0.56, 0.56, 20, c, 14, { topo: shade(c, 0.35) }); ctx.globalAlpha = 1;
    const [px, py] = g.P(0.5 + Math.sin(t * 0.8) * 0.12, 0.5, 24);
    ctx.fillStyle = '#ffb21c'; ctx.beginPath(); ctx.ellipse(px, py, 3.6, 2, 0, 0, 7); ctx.fill();
    poly(ctx, [[px - 3, py], [px - 6, py - 2.5], [px - 6, py + 2.5]], '#ff8a1c');
  },
  aquario_parede(g, c, t) {
    const L = g.LEN, ctx = g.ctx;
    g.L(0.05, 0.2, L - 0.1, 0.6, 16, '#1e1e24');
    ctx.globalAlpha = 0.85; g.L(0.07, 0.22, L - 0.14, 0.56, 42, c, 16, { topo: shade(c, 0.35) }); ctx.globalAlpha = 1;
    const cores = ['#ff8a1c', '#ffcb00', '#ff5a6e', '#7cf0ff', '#ffffff', '#ffcb00'];
    for (let k = 0; k < 9; k++) { const [px, py] = g.P(0.2 + ((t * (0.08 + k * 0.01) + k * 0.31) % (L - 0.4)), 0.78, 24 + (k % 3) * 8); ctx.fillStyle = cores[k % cores.length]; ctx.beginPath(); ctx.ellipse(px, py, 3, 1.6, 0, 0, 7); ctx.fill(); }
    g.F(0.78, 0.1, L - 0.1, 17, 20, '#e6cf98');                                       // areia
    for (let k = 0; k < 4; k++) g.F(0.78, 0.3 + k * (L - 0.6) / 3, 0.36 + k * (L - 0.6) / 3, 18, 30 + (k % 2) * 6, k % 2 ? '#e86aa6' : '#2f8f5b');
    g.L(0.05, 0.2, L - 0.1, 0.6, 3, '#d4af37', 58);                                    // tampa dourada
  },
  // 0g-B: lojas com o que vendem à vista (stand, boutique)
  int_carro_expo(g, c) {
    const L = g.LEN, D = g.DEP;
    g.L(0.05, 0.05, L - 0.1, D - 0.1, 3, '#d9d6cf');                           // estrado
    g.L(0.3, 0.35, L - 0.6, D - 0.7, 12, c, 3);                                // carroçaria
    g.L(0.45, 0.6, L - 0.9, D - 1.2, 9, shade(c, 0.15), 15, { topo: '#9fc3d8' }); // habitáculo e vidros
  },
  int_arara(g) {
    const L = g.LEN, cores = ['#cc092f', '#f5b81c', '#2c6fb0', '#16a3a3', '#e86aa6', '#141012', '#2f8f5b'];
    [0.1, L - 0.16].forEach(a => g.L(a, 0.45, 0.06, 0.06, 44, '#999'));
    g.L(0.1, 0.45, L - 0.2, 0.06, 2, '#bbb', 44);
    for (let k = 0; k < L * 5 - 1; k++) g.L(0.2 + k * 0.2, 0.3, 0.14, 0.36, 26, cores[k % cores.length], 16);
  },
  int_manequim(g, c) {
    g.L(0.3, 0.3, 0.4, 0.4, 3, '#d9d6cf');
    g.L(0.45, 0.45, 0.1, 0.1, 14, '#bbb', 3);
    g.L(0.33, 0.38, 0.34, 0.24, 26, c, 16);
    g.L(0.42, 0.42, 0.16, 0.16, 8, '#e8dccb', 42);
  },
};

// liga o desenho por id ao desenhaMovel do motor (os móveis sem desenho próprio usam o do tipo)
function desenhaMovelId(ctx, id, tipo, x, y, w, d, rot, cor, t, pintado) {
  const f = ARTE_MOVEIS[id];
  if (!f) return desenhaMovel(ctx, tipo, x, y, w, d, rot, cor, t);
  const g = quadroMovel(ctx, x, y, w, d, rot); g.ctx = ctx;
  f(g, cor, t || 0, pintado || null);   // pintado: cor escolhida pelo jogador (null = aspeto original)
}

/* ---------- 🧊 modelos 3D fotografados (tools/modelos/fotografar.py → img/modelos/) ----------
   O jogo continua 2.5D: cada modelo foi fotografado nas 4 rotações da vista, com a mesma projeção. Enquanto a imagem
   não chega (ou se não existir), usa-se o desenho antigo. */
const MOD3D = { idx: null, img: new Map() };
fetch('img/modelos/indice.json').then(r => r.ok ? r.json() : {}).then(j => { MOD3D.idx = j || {}; }).catch(() => { MOD3D.idx = {}; });
function imgModelo(nome) {
  let im = MOD3D.img.get(nome);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = 'img/modelos/' + nome + '.webp'; MOD3D.img.set(nome, im); seguirCarga(im); }
  return im.complete && im.naturalWidth ? im : null;
}
const temModelo = id => !!MOD3D.idx?.[id];
// desenha o modelo pousado no ponto (x, y) do mundo (a origem do modelo); false = ainda sem imagem
function desenhaModelo(ctx, id, x, y, z = 0) {
  const e = MOD3D.idx?.[id], r = e?.rot?.[VR]; if (!r) return false;
  const im = imgModelo(`${id}_r${VR}`); if (!im) return false;
  const [sx, sy] = iso(x, y, z); ctx.drawImage(im, sx - r.ax / 2, sy - r.ay / 2, r.w / 2, r.h / 2); return true;
}

/* ---------- ✈️ aeronaves (miniatura de perfil) ---------- */
function desenhaAeronave(ctx, id, W, H) {
  const cor = { avioneta: '#e0313f', helicoptero: '#1d3c5e', jato_privado: '#f5f5f5', jato_luxo: '#d4af37' }[id] || '#ddd';
  const cx = W / 2, cy = H / 2 + 6;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 26, 40, 5, 0, 0, 7); ctx.fill();
  if (id === 'helicoptero') {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(cx - 6, cy, 22, 14, 0, 0, 7); ctx.fill();
    ctx.fillRect(cx + 10, cy - 4, 34, 6); ctx.fillRect(cx + 40, cy - 12, 4, 14);
    ctx.fillStyle = '#9fd3ea'; ctx.beginPath(); ctx.ellipse(cx - 16, cy - 3, 9, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(cx - 7, cy - 18, 3, 6); ctx.fillRect(cx - 44, cy - 20, 74, 3);
    ctx.fillRect(cx - 24, cy + 16, 34, 3); ctx.fillRect(cx - 18, cy + 12, 3, 5); ctx.fillRect(cx + 2, cy + 12, 3, 5);
    return;
  }
  const L = id === 'avioneta' ? 70 : 92, h = id === 'avioneta' ? 11 : 14;
  ctx.fillStyle = cor; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - L / 2, cy); ctx.quadraticCurveTo(cx - L / 2, cy - h, cx - L / 2 + 14, cy - h); ctx.lineTo(cx + L / 2 - 6, cy - h + 2);
  ctx.lineTo(cx + L / 2, cy - h - 16); ctx.lineTo(cx + L / 2 + 4, cy - h - 16); ctx.lineTo(cx + L / 2 + 2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(cor, -0.15); ctx.beginPath(); ctx.moveTo(cx - 6, cy - 4); ctx.lineTo(cx + 18, cy - 4); ctx.lineTo(cx + 2, cy + 14); ctx.lineTo(cx - 14, cy + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a3b55'; for (let i = 0; i < (id === 'avioneta' ? 3 : 6); i++) ctx.fillRect(cx - L / 2 + 20 + i * 9, cy - h + 4, 5, 4);
  ctx.fillStyle = '#9fd3ea'; ctx.beginPath(); ctx.moveTo(cx - L / 2 + 4, cy - h + 6); ctx.lineTo(cx - L / 2 + 12, cy - h + 2); ctx.lineTo(cx - L / 2 + 14, cy - h + 7); ctx.closePath(); ctx.fill();
  if (id === 'avioneta') { ctx.fillStyle = '#333'; ctx.fillRect(cx - L / 2 - 3, cy - h, 2, h + 4); }
  if (id === 'jato_luxo' || id === 'jato_privado') { ctx.fillStyle = id === 'jato_luxo' ? '#141012' : '#cc092f'; ctx.fillRect(cx - L / 2 + 10, cy - 3, L - 16, 2); }
  ctx.fillStyle = '#333'; ctx.fillRect(cx - L / 2 + 14, cy + 1, 2, 7); ctx.fillRect(cx + 10, cy + 1, 2, 7);
}

/* ---------- veículos ---------- */
const VEICULOS = {
  scooter: { duas: true, cor: '#4fb3d9' }, mota: { duas: true, cor: '#cc092f' }, superbike: { duas: true, cor: '#f07c2a', desportiva: true },
  carrinha: { forma: 'carrinha', cor: '#f2f2f2' }, candongueiro_ouro: { forma: 'carrinha', cor: '#f2f2f2', ouro: true },
  carro: { forma: 'sedan', cor: '#8a8f96', velho: true }, citadino: { forma: 'citadino', cor: '#ffcb00' }, sedan: { forma: 'sedan', cor: '#1f2e44' },
  pickup: { forma: 'pickup', cor: '#d8d8d8' }, jipe: { forma: 'jipe', cor: '#111418' }, suv_luxo: { forma: 'quadrado', cor: '#2a2d22' },
  desportivo: { forma: 'desportivo', cor: '#cc092f' }, superdesportivo: { forma: 'cunha', cor: '#ffcb00' },
  hipercarro: { forma: 'cunha', cor: '#f2f2f2', faixa: '#f07c2a' }, turbilhao: { forma: 'turbilhao', cor: '#1e3f8a', faixa: '#0b0b0f' },
};
// desenha o veículo ao longo do eixo y (de frente para nós), a ocupar ~1x2
function desenhaVeiculo(ctx, id, x, y) {
  if (desenhaModelo(ctx, id, x, y)) return;                 // modelo 3D fotografado (img/modelos), se já carregou
  const v = VEICULOS[id] || { forma: 'sedan', cor: '#888' };
  const sombra = (w, d) => losango(ctx, x + 0.05, y + 0.05, w, d, 'rgba(0,0,0,.22)');
  const roda = (a, b) => { const [px, py] = iso(x + a, y + b, 3); ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.ellipse(px, py, 4, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa0a6'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 7); ctx.fill(); };
  const vidro = '#2b3a46';
  if (v.duas) {
    const ox = x + 0.35, oy = y + 0.3;
    sombra(0.4, 1.3);
    roda(0.55, 0.45); roda(0.55, 1.45);
    caixa(ctx, ox, oy + 0.15, 0.3, 1.0, v.desportiva ? 10 : 8, v.cor, 5);
    if (v.desportiva) caixa(ctx, ox, oy + 0.9, 0.3, 0.3, 8, shade(v.cor, -0.1), 12);
    caixa(ctx, ox + 0.05, oy + 0.35, 0.2, 0.4, 4, '#222', v.desportiva ? 15 : 13);   // banco
    caixa(ctx, ox + 0.12, oy + 1.05, 0.06, 0.06, 12, '#555', 12);                    // guiador
    const [hx, hy] = iso(ox + 0.15, oy + 1.2, 21); ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, 7); ctx.fill();
    return;
  }
  const f = v.forma, c = v.cor;
  const W = 0.8, D = f === 'citadino' ? 1.35 : f === 'carrinha' ? 1.9 : f === 'quadrado' || f === 'jipe' || f === 'pickup' ? 1.8 : 1.7;
  const ox = x + 0.1, oy = y + (2 - D) / 2;
  sombra(W, D);
  const alto = f === 'carrinha' ? 0 : f === 'quadrado' || f === 'jipe' || f === 'pickup' ? 5 : f === 'cunha' || f === 'desportivo' || f === 'turbilhao' ? -1 : 2;
  roda(ox + 0.05 - x, oy + 0.3 - y); roda(ox + W - 0.02 - x, oy + 0.3 - y); roda(ox + 0.05 - x, oy + D - 0.3 - y); roda(ox + W - 0.02 - x, oy + D - 0.3 - y);
  const z0 = 3 + alto;
  if (f === 'carrinha') {
    caixa(ctx, ox, oy, W, D, 24, c, 3);
    naFaceX(ctx, ox + W, oy, D, 0.1, D - 0.1, 9, 15, v.ouro ? '#d4af37' : '#2a62c9');
    naFaceY(ctx, ox, oy + D, W, 0.08, W - 0.08, 9, 15, v.ouro ? '#d4af37' : '#2a62c9');
    naFaceX(ctx, ox + W, oy, D, 0.2, D - 0.3, 17, 24, '#24323d');
    naFaceY(ctx, ox, oy + D, W, 0.1, W - 0.1, 17, 25, '#24323d');
    if (v.ouro) caixa(ctx, ox + 0.15, oy + 0.4, W - 0.3, D - 0.8, 2, '#d4af37', 27);
    return;
  }
  const corpoH = f === 'cunha' || f === 'turbilhao' ? 7 : f === 'desportivo' ? 8 : f === 'quadrado' || f === 'jipe' ? 13 : 10;
  caixa(ctx, ox, oy, W, D, corpoH, c, z0);
  // faróis e grelha à frente (face +y)
  naFaceY(ctx, ox, oy + D, W, 0.06, 0.2, z0 + corpoH - 5, z0 + corpoH - 2, '#fff6c9');
  naFaceY(ctx, ox, oy + D, W, W - 0.2, W - 0.06, z0 + corpoH - 5, z0 + corpoH - 2, '#fff6c9');
  if (f === 'quadrado' || f === 'jipe') naFaceY(ctx, ox, oy + D, W, 0.28, W - 0.28, z0 + 3, z0 + corpoH - 3, '#1a1a1a');
  if (v.faixa) naFaceX(ctx, ox + W, oy, D, 0.1, D - 0.1, z0 + 2, z0 + 4, v.faixa);
  if (v.velho) { naFaceX(ctx, ox + W, oy, D, 0.5, 0.8, z0 + 3, z0 + 7, '#6f6a5c'); }   // amolgadela
  const topo = { topo: shade(c, 0.1) };
  if (f === 'pickup') { caixa(ctx, ox + 0.04, oy + D * 0.45, W - 0.08, D * 0.5, 10, vidro, z0 + corpoH, topo); caixa(ctx, ox, oy, W, 0.08, 6, c, z0 + corpoH); return; }
  if (f === 'quadrado') { caixa(ctx, ox + 0.04, oy + 0.15, W - 0.08, D - 0.3, 11, vidro, z0 + corpoH, topo); caixa(ctx, ox + 0.3, oy - 0.08, 0.2, 0.1, 9, '#111', z0 + 4); return; }  // pneu suplente atrás
  if (f === 'jipe') { caixa(ctx, ox + 0.05, oy + 0.2, W - 0.1, D - 0.45, 10, vidro, z0 + corpoH, topo); caixa(ctx, ox + 0.1, oy + 0.3, W - 0.2, D - 0.7, 1, '#888', z0 + corpoH + 10); return; }
  if (f === 'citadino') { caixa(ctx, ox + 0.05, oy + 0.15, W - 0.1, D - 0.35, 9, vidro, z0 + corpoH, topo); return; }
  if (f === 'desportivo') { caixa(ctx, ox + 0.08, oy + D * 0.35, W - 0.16, D * 0.35, 6, vidro, z0 + corpoH, topo); caixa(ctx, ox + 0.1, oy + 0.02, W - 0.2, 0.08, 3, '#111', z0 + corpoH + 1); return; }
  if (f === 'cunha') { caixa(ctx, ox + 0.1, oy + D * 0.38, W - 0.2, D * 0.3, 5, vidro, z0 + corpoH, topo); caixa(ctx, ox + 0.02, oy + 0.02, W - 0.04, 0.12, 2, '#111', z0 + corpoH + 4); return; }
  if (f === 'turbilhao') { caixa(ctx, ox + 0.1, oy + D * 0.35, W - 0.2, D * 0.32, 6, vidro, z0 + corpoH, topo); naFaceY(ctx, ox, oy + D, W, 0.32, W - 0.32, z0 + 1, z0 + corpoH - 1, '#c9ccd2'); return; }
  caixa(ctx, ox + 0.05, oy + D * 0.25, W - 0.1, D * 0.5, 8, vidro, z0 + corpoH, topo);   // sedan
}

/* ---------- telemóveis e outras coisas (desenhadas de frente) ---------- */
function desenhaTelemovel(ctx, id, cx, cy, esc = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(esc, esc); ctx.rotate(-0.12);
  const ouro = id === 'tel_ouro', topo = id === 'tel_topo';
  ctx.fillStyle = 'rgba(0,0,0,.25)'; rrect(ctx, -15, -27, 34, 60, 7); ctx.fill();
  ctx.fillStyle = ouro ? '#d4af37' : topo ? '#3a3f47' : '#1c1c1f'; rrect(ctx, -18, -32, 34, 62, 7); ctx.fill();
  ctx.fillStyle = '#0b0d12'; rrect(ctx, -15.5, -29, 29, 56, 5); ctx.fill();
  const gr = ctx.createLinearGradient(0, -29, 0, 27);
  gr.addColorStop(0, ouro ? '#ffcb00' : topo ? '#6a4cff' : '#2c6fb0'); gr.addColorStop(1, ouro ? '#cc092f' : topo ? '#ff5a8a' : '#4fd0e0');
  ctx.fillStyle = gr; rrect(ctx, -14, -27.5, 26, 53, 4); ctx.fill();
  ctx.fillStyle = '#0b0d12'; rrect(ctx, -4, -26, 6, 2.6, 1.3); ctx.fill();
  // apps
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { rrect(ctx, -11 + k * 8, -18 + r * 9, 5.5, 5.5, 1.5); ctx.fill(); }
  if (topo || ouro) {   // câmaras de trás a espreitar
    ctx.fillStyle = ouro ? '#b8932b' : '#2a2e35'; rrect(ctx, 6, -31, 11, 12, 3); ctx.fill();
    ctx.fillStyle = '#111'; [[9, -27.5], [14, -27.5], [11.5, -22.5]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 1.9, 0, 7); ctx.fill(); });
  }
  ctx.restore();
}
function desenhaGerador(ctx, x, y) {
  losango(ctx, x + 0.12, y + 0.22, 0.8, 0.6, 'rgba(0,0,0,.22)');
  caixa(ctx, x + 0.1, y + 0.2, 0.8, 0.6, 22, '#ffcb00', 4);
  naFaceY(ctx, x + 0.1, y + 0.8, 0.8, 0.12, 0.5, 9, 20, '#2a2a2a');
  naFaceY(ctx, x + 0.1, y + 0.8, 0.8, 0.58, 0.7, 14, 18, '#cc092f');
  caixa(ctx, x + 0.15, y + 0.25, 0.7, 0.06, 6, '#333', 26);            // pega
  [[0.18, 0.78], [0.82, 0.78]].forEach(([a, b]) => { const [px, py] = iso(x + a, y + b, 3); ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill(); });
}

/* ---------- miniaturas (o mesmo desenho, em ponto grande) ---------- */
const ROUPA_DO_ITEM = { pano: 4, fato: 2, vestido: 3, fato_luxo: 5, vestido_marca: 6 };
const CABECA_ITEM = ['oculos', 'oculos_ouro', 'brincos', 'brincos_ouro', 'auscultadores', 'coroa', 'chapeu'];
const _minis = new Map();
// põe uma área de w×d casas (e h px de altura) centrada e à escala dentro de W×H
function enquadrar(ctx, w, d, h, W, H, maxEsc) {
  const pts = [iso(0, 0), iso(w, 0), iso(w, d), iso(0, d)];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - h, y1 = Math.max(...ys);
  const e = Math.min((W - 10) / (x1 - x0), (H - 8) / (y1 - y0), maxEsc);
  ctx.translate(W / 2 - (x0 + x1) / 2 * e, H / 2 - (y0 + y1) / 2 * e);
  ctx.scale(e, e);
}
// devolve um dataURL com o desenho do móvel ou da coisa (tipo: 'movel' | 'item'), em cache
function miniatura(tipo, id, W = 120, H = 96) {
  if (tipo === 'item' && MOD3D.idx?.[id]?.mini) return `img/modelos/${id}_mini.webp`;   // modelo 3D fotografado
  const chave = tipo + ':' + id + ':' + W + 'x' + H;
  if (_minis.has(chave)) return _minis.get(chave);
  const k = 2, cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const ctx = cv.getContext('2d'); ctx.scale(k, k);
  try {
    if (tipo === 'movel') {
      const mv = (typeof D !== 'undefined' && D.moveis || []).find(m => m.id === id) || { tipo: id, w: 1, d: 1, cor: '#888' };
      enquadrar(ctx, mv.w, mv.d, 62, W, H, 1.9);
      desenhaMovelId(ctx, id, mv.tipo, 0, 0, mv.w, mv.d, 0, mv.cor, 1.3);
    } else {
      const it = (typeof D !== 'undefined' && D.itens || []).find(i => i.id === id) || { categoria: '' };
      if (it.categoria === 'veiculo' || VEICULOS[id]) {
        enquadrar(ctx, 1, 2, 34, W, H, 1.6); desenhaVeiculo(ctx, id, 0, 0);
      } else if (it.categoria === 'aviao') {
        desenhaAeronave(ctx, id, W, H);
      } else if (it.categoria === 'telemovel') {
        desenhaTelemovel(ctx, id, W / 2, H / 2 + 2, 1.15);
      } else if (it.categoria === 'animal') {
        ctx.translate(W / 2 - (id === 'galinhas' ? 10 : 2), H / 2 + 22); ctx.scale(3.2, 3.2); desenhaAnimal(ctx, 0, 0, id, 0, false);
        if (id === 'galinhas') { ctx.translate(9, 2); desenhaAnimal(ctx, 0, 0, id, 0.7, false); }
      } else if (id === 'gerador') {
        enquadrar(ctx, 1, 1, 30, W, H, 1.8); desenhaGerador(ctx, 0, 0);
      } else {
        // roupa e acessórios: a tua personagem a usá-los
        const base = typeof minhaAparencia === 'function' && typeof J !== 'undefined' && J ? minhaAparencia() : { pele: 3, cabelo: 1, corCabelo: 0, camisa: '#cc092f', calca: '#2a3b55' };
        const ap = { ...base, animal: null, acess: [] };
        if (ROUPA_DO_ITEM[id] != null) ap.roupa = ROUPA_DO_ITEM[id];
        else ap.acess = [id];
        if (id === 'fato') ap.camisa = '#cc092f';
        if (id === 'vestido') ap.camisa = '#7a1fd0';
        if (id === 'fato_luxo') { ap.camisa = '#1f1f1f'; ap.calca = '#f2f2f2'; }
        if (id === 'vestido_marca') { ap.camisa = '#7a4b8c'; ap.calca = '#7a4b8c'; }
        if (id === 'cor_ouro') { ap.camisa = '#d4af37'; ap.calca = '#d4af37'; }
        const cabeca = CABECA_ITEM.includes(id), pescoco = id === 'colar' || id === 'corrente_ouro' || id === 'colar_diamante', pulso = id === 'relogio' || id === 'relogio_diamante' || id === 'anel_diamante';
        const esc = cabeca ? 3.6 : pescoco ? 3.2 : pulso ? 3.2 : 1.85;
        const yPe = cabeca ? H + 112 : pescoco ? H + 70 : pulso ? H + 40 : H - 6;
        const xPe = pulso ? W / 2 - 22 : W / 2;
        desenhaPessoa(ctx, xPe, yPe, ap, 0.3, false, 1, false, esc);
      }
    }
  } catch (e) { /* sem desenho: fica em branco */ }
  const url = cv.toDataURL(); cv.width = cv.height = 0;   // 8 nov: liberta a memória já (iPhone)
  if (MOD3D.idx !== null) _minis.set(chave, url);   // antes de saber que modelos 3D há, não guardar o desenho antigo
  return url;
}
const miniaturaHTML = (tipo, id, cls = 'mini') => `<img class="${cls}" alt="" src="${miniatura(tipo, id)}" draggable="false">`;
