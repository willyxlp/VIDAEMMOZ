/* ============================================================
   Vida em Moz — ARREDORES 3D
   Continua a cidade para lá da borda do mapa (ruas, passeios, quarteirões, prédios, palmeiras),
   para não haver zona azul vazia à volta do bairro. Tudo é gerado por código, a partir do id do bairro
   (cada bairro fica com a sua cara) e junta-se em muito poucas malhas (barato em telemóveis).
   ============================================================ */

const R_ANEL = 64;            // quantos quadrados a cidade se estende para cada lado
const PASSO = 11;             // as ruas do jogo repetem-se de 11 em 11 (quarteirão 9 + rua 2)
const LARG_RUA = 2;

function semente(s) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const PAREDES = ['#e8dcc4', '#d9c0a0', '#c98f6f', '#b9a58a', '#d7d2c8', '#c47c5e', '#a9b4b8', '#e2c7a5', '#bfa88a', '#9fb1bd'];
const TELHADOS = ['#cfc6b4', '#b8ad9a', '#a89d8c', '#c9b79c', '#8f8a82'];

function texturaJanelas(T, cor) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = cor; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, 60, 64, 4);                     // friso de andar
  g.fillStyle = '#2d4150'; g.fillRect(17, 13, 30, 32);                            // vidro
  g.fillStyle = '#4b6a80'; g.fillRect(17, 13, 30, 9);                             // reflexo do céu
  g.fillStyle = '#efe9dd'; g.fillRect(15, 45, 34, 4); g.fillRect(31, 13, 2, 32);  // peitoril e caixilho
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// acumulador de caixas numa só geometria
function acumulador() { return { pos: [], nor: [], uv: [], col: [], idx: [] }; }
function face(a, v, n, uv, cor) {
  const b = a.pos.length / 3;
  for (let i = 0; i < 4; i++) { a.pos.push(...v[i]); a.nor.push(...n); a.uv.push(...uv[i]); if (cor) a.col.push(...cor); }
  a.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}
function caixaParedes(a, x0, y0, z0, w, d, h, pisos) {
  const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h, uw = Math.max(1, Math.round(w / 1.3)), ud = Math.max(1, Math.round(d / 1.3));
  face(a, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], [[0, 0], [ud, 0], [ud, pisos], [0, pisos]]);
  face(a, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], [-1, 0, 0], [[0, 0], [ud, 0], [ud, pisos], [0, pisos]]);
  face(a, [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], [0, 1, 0], [[0, 0], [uw, 0], [uw, pisos], [0, pisos]]);
  face(a, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [[0, 0], [uw, 0], [uw, pisos], [0, pisos]]);
}
function caixaCompleta(a, x0, y0, z0, w, d, h, cor) {   // roof slab / cubos de cobertura (cor por vértice, sem textura)
  const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h, u = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const lado = [cor[0] * 0.85, cor[1] * 0.85, cor[2] * 0.85];
  face(a, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], u, lado);
  face(a, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], [-1, 0, 0], u, lado);
  face(a, [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], [0, 1, 0], u, lado);
  face(a, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], u, lado);
  face(a, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], u, cor);
}
function malha(T, a, mat, sombra) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(a.uv, 2));
  if (a.col.length) g.setAttribute('color', new T.Float32BufferAttribute(a.col, 3));
  g.setIndex(a.idx);
  const m = new T.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

/**
 * cena: { id, W, H, chao, estradas }.  CH: constantes do chão (mar = 3).
 * devolve { grupo, palmas:[{tipo,x,y}], mar }
 */
export function arredores(T, cena) {
  const { W, H } = cena, rnd = semente(hash(cena.id) + 17), hid = hash(cena.id);
  const R = R_ANEL, x0 = -R, y0 = -R, LX = W + 2 * R, LY = H + 2 * R;
  const mar = !!(cena.chao && cena.chao[0] === 3);                    // bairro de ilha/praia: o lado oeste continua mar
  const alto = hid % 3 === 0 ? 1.35 : hid % 3 === 1 ? 1 : 0.8;        // cada bairro com a sua altura de prédios
  const area = Math.max(1, hid % 5);
  const ruasP = (cena.estradas || []).filter(e => e.eixo === 'h').map(e => e.p);
  const e0 = ruasP.length ? Math.min(...ruasP) : 9;
  const comeco = e0 - PASSO * Math.ceil((e0 - x0) / PASSO);
  const ruas = []; for (let e = comeco; e < W + R; e += PASSO) ruas.push(e);

  // ── chão: areia, passeios, asfalto, relvados e mar, numa só textura ──
  const S = 8, cv = document.createElement('canvas'); cv.width = LX * S; cv.height = LY * S;
  const g = cv.getContext('2d');
  g.fillStyle = '#d9c9a8'; g.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${150 + rnd() * 40},${120 + rnd() * 40},${70 + rnd() * 30},.06)`; g.fillRect(rnd() * cv.width, rnd() * cv.height, 2 + rnd() * 8, 2 + rnd() * 5); }
  const px = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect((x - x0) * S, (y - y0) * S, w * S, h * S); };
  // passeios e asfalto
  for (const e of ruas) {
    px(e - 1, y0, LARG_RUA + 2, LY, '#cdbfa3'); px(x0, e - 1, LX, LARG_RUA + 2, '#cdbfa3');
    px(e, y0, LARG_RUA, LY, '#4a4b51'); px(x0, e, LX, LARG_RUA, '#4a4b51');
  }
  g.fillStyle = 'rgba(255,255,255,.55)';
  const emRua = t => ruas.some(e => t > e - 1.5 && t < e + LARG_RUA + 0.5);
  for (const e of ruas) for (let t = y0; t < y0 + LY; t += 2) { if (emRua(t)) continue; g.fillRect((e + 0.95 - x0) * S, (t - y0) * S, 0.1 * S, 1 * S); g.fillRect((t - x0) * S, (e + 0.95 - y0) * S, 1 * S, 0.1 * S); }
  if (mar) { px(x0, y0, -x0, LY, '#2b84ad'); for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(rnd() * (-x0) * S, rnd() * cv.height, 6 + rnd() * 14, 2); } }
  // ── quarteirões ──
  const palmas = [], parede = new Map(), A = { teto: acumulador() }, tex = [];
  const matPar = cor => { if (!parede.has(cor)) { const t = texturaJanelas(T, cor); tex.push(t); parede.set(cor, { a: acumulador(), mat: new T.MeshStandardMaterial({ map: t, roughness: 0.92 }) }); } return parede.get(cor); };
  const cor3 = hex => { const c = new T.Color(hex); return [c.r, c.g, c.b]; };
  const dentroMapa = (x, y, w, d) => x + w > 0 && x < W && y + d > 0 && y < H;
  const lonjas = [];
  for (let i = 0; i + 1 < ruas.length; i++) for (let j = 0; j + 1 < ruas.length; j++) {
    const bx = ruas[i] + LARG_RUA + 1, by = ruas[j] + LARG_RUA + 1, bw = PASSO - LARG_RUA - 2, bd = bw;   // 7×7 dentro dos passeios
    if (dentroMapa(bx, by, bw, bd)) continue;
    if (mar && bx < 0) continue;
    const dist = Math.max(0, bx < 0 ? -bx : bx - W, by < 0 ? -by : by - H);
    const t = rnd();
    if (t < 0.13) {                                      // parque: relva + palmeiras
      px(bx, by, bw, bd, '#6f9b4a'); for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(40,90,30,.25)'; g.fillRect((bx - x0 + rnd() * bw) * S, (by - y0 + rnd() * bd) * S, 2, 4); }
      for (let k = 0; k < 4; k++) palmas.push({ tipo: rnd() < 0.7 ? 'palmeira' : 'acacia', x: bx + 1 + rnd() * (bw - 2), y: by + 1 + rnd() * (bd - 2) });
      continue;
    }
    if (t < 0.55) {                                      // um prédio grande
      const w = 4.5 + Math.floor(rnd() * 3), d = 4.5 + Math.floor(rnd() * 3);
      lonjas.push({ x: bx + (bw - w) / 2, y: by + (bd - d) / 2, w, d, dist, grande: true });
    } else {                                             // vários mais pequenos
      const n = 2 + Math.floor(rnd() * 3), cw = bw / 2;
      const cel = [[0, 0], [1, 0], [0, 1], [1, 1]].sort(() => rnd() - 0.5).slice(0, n);
      for (const [cx, cy] of cel) lonjas.push({ x: bx + cx * cw + 0.25, y: by + cy * cw + 0.25, w: cw - 0.5 - rnd() * 0.6, d: cw - 0.5 - rnd() * 0.6, dist, grande: false });
    }
    // palmeiras nos passeios (a ocupar só alguns sítios)
    for (let k = 0; k < 3; k++) if (rnd() < 0.5) {
      const l = rnd() < 0.5;
      palmas.push({ tipo: 'palmeira', x: l ? bx - 0.5 + rnd() * (bw + 1) : (rnd() < 0.5 ? bx - 0.6 : bx + bw + 0.6), y: l ? (rnd() < 0.5 ? by - 0.6 : by + bd + 0.6) : by + rnd() * bd });
    }
  }
  for (const L of lonjas) {
    const base = L.grande ? 3 + Math.floor(rnd() * 3 * alto) + Math.floor(L.dist / 16) : 1 + Math.floor(rnd() * 2) + Math.floor(L.dist / 28);
    const pisos = Math.max(1, Math.min(13, Math.round(base * (L.grande ? alto : 1) + area * 0.1)));
    const h = pisos * 0.62, cor = PAREDES[Math.floor(rnd() * PAREDES.length)], P = matPar(cor);
    caixaParedes(P.a, L.x, L.y, 0, L.w, L.d, h, pisos);
    const tc = cor3(TELHADOS[Math.floor(rnd() * TELHADOS.length)]);
    caixaCompleta(A.teto, L.x - 0.06, L.y - 0.06, h, L.w + 0.12, L.d + 0.12, 0.14, tc);
    if (rnd() < 0.7) {                                    // casota da escada / depósito de água
      const cw = Math.min(1.4, L.w * 0.3), cd = Math.min(1.2, L.d * 0.3);
      caixaCompleta(A.teto, L.x + 0.4 + rnd() * (L.w - cw - 0.8), L.y + 0.4 + rnd() * (L.d - cd - 0.8), h + 0.14, cw, cd, 0.5, [tc[0] * 0.8, tc[1] * 0.8, tc[2] * 0.8]);
    }
  }
  const grupo = new T.Group();
  const chaoTex = new T.CanvasTexture(cv); chaoTex.flipY = false; chaoTex.colorSpace = T.SRGBColorSpace; chaoTex.anisotropy = 4;
  const chao = new T.Mesh(new T.PlaneGeometry(LX, LY), new T.MeshStandardMaterial({ map: chaoTex, roughness: 1 }));
  chao.position.set(x0 + LX / 2, y0 + LY / 2, -0.03); chao.receiveShadow = true; grupo.add(chao);
  for (const { a, mat } of parede.values()) grupo.add(malha(T, a, mat, true));
  grupo.add(malha(T, A.teto, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), true));
  return { grupo, palmas, mar };
}
