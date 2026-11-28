/* ============================================================
   Vida em Moz — mundo3d.js
   Motor de renderização 3D em tempo real com Three.js.
   Baseado no motor original de Vida na Banda (25–26 out).
   Coordenadas do jogo: x/y no chão, z para cima (Z=up).
   A raiz troca x/y para Three.js (o jogo usa "mão esquerda").
   Expõe window.M3D com a interface que jogo.js espera:
     M3D.quadro(params)         — desenha uma frame
     M3D.ecra(x, y, zpx)       — tile → coordenadas de ecrã (px)
     M3D.escolher(sx, sy, npcs) — raycasting: o que foi tocado
     M3D.arrastar(dx, dy, zoom) — pan da câmara no modo 3D
     M3D.rodar(angulo, snap)   — rodar câmara
     M3D.esconder()            — remove o canvas WebGL
     M3D.leve()                — modo leve (sem sombras, pixel ratio baixo)
     M3D.normal()              — modo normal
     M3D.info                  — { fps, calls, tris, geo, tex, mb }
     M3D.PORTA                 — sentinel para "tocou na porta"
   ============================================================ */

import * as T from './vendor/three/three.min.js';
import { MODELOS, predio, pessoaRig, QUALIDADE, animal3d } from './modelos3d.js';
import { criarTransito } from './transito3d.js?v=7afd48f';
import { arredores } from './arredores3d.js?v=aa7f40f';

QUALIDADE.folhas = 0.1; QUALIDADE.seg = 0.35;   // leve para telemóveis

/* ── constantes de jogo (iguais a motor.js) ──────────────────── */
const K = 64 / Math.SQRT2;                      // px do ecrã por quadrado (zoom 1)
const E = Math.asin(0.5);                        // elevação isométrica (≈30°)
const PX_Z = K * Math.cos(E);                   // px por unidade de altura (≈39.2)

/* ── conversão de coordenadas: jogo → Three.js ───────────────── */
// O jogo usa (x, y, z) com Z=cima. Three.js usa Y=cima por defeito,
// mas a raiz tem matrixAutoUpdate=false com x/y trocados, logo z=cima na cena.
const g2w = (x, y, z = 0) => new T.Vector3(y, x, z);

/* ── estado interno ─────────────────────────────────────────── */
let renderer = null, cena3 = null, camara = null, raiz = null, sol = null, hemi = null, canvas = null;
let vistaAlta = null;
let construida = null, assinatura = '';
let transito = null, _tT = 0;
const estaticos = [];
const pickaveis = [];
const lampadas = [], vidros = [];
const pessoas = new Map();
const cam3 = { az: Math.PI / 4, azAlvo: Math.PI / 4, alvo: new T.Vector3(), iniciada: false };
const olhos = new T.PerspectiveCamera(68, 1, 0.04, 320);
olhos.up.set(0, 0, 1);
let primeira = false;
let rumo = 0, inclinacao = -0.12;
const mira = new T.Vector3();
const ray = new T.Raycaster();
const chaoPlano = new T.Plane(new T.Vector3(0, 0, 1), 0);  // Z=0 é o chão
let _leve = false;

/* métricas */
const info = { fps: 0, calls: 0, tris: 0, geo: 0, tex: 0, mb: null, _n: 0, _t: 0 };

/* sentinela "porta" */
const PORTA = Symbol('PORTA');

/* ── inicializar renderer ────────────────────────────────────── */
function iniciar() {
  if (renderer) return;
  canvas = document.createElement('canvas');
  canvas.id = 'tela3d';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  const t2 = document.getElementById('tela');
  if (t2) t2.parentNode.insertBefore(canvas, t2);
  else document.body.prepend(canvas);

  renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;

  cena3 = new T.Scene();

  // A raiz troca x e y: o jogo usa coordenadas "mão esquerda" (x→direita, y→cima),
  // Three.js usa "mão direita". A matrix fixa isto sem matrixAutoUpdate.
  raiz = new T.Group();
  raiz.matrixAutoUpdate = false;
  raiz.matrix.set(0, 1, 0, 0,
                  1, 0, 0, 0,
                  0, 0, 1, 0,
                  0, 0, 0, 1);
  cena3.add(raiz);

  hemi = new T.HemisphereLight(0xdfe8ff, 0x5a4a36, 1.1);
  cena3.add(hemi);

  sol = new T.DirectionalLight(0xfff1dc, 2.4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.03;
  sol.shadow.radius = 3;
  cena3.add(sol, sol.target);

  // Vista isométrica: câmara ortogonal, cima = eixo Z
  camara = new T.OrthographicCamera(-1, 1, 1, -1, 1, 400);
  camara.up.set(0, 0, 1);
  vistaAlta = camara;

  cena3.fog = new T.Fog(0x9db8c4, 60, 160);
}

/* ── utilitários ──────────────────────────────────────────────── */
function deitarFora(obj) {
  obj.traverse(m => {
    if (m.isMesh || m.isInstancedMesh) {
      m.geometry?.dispose();
      [].concat(m.material).forEach(x => { x?.map?.dispose(); x?.dispose?.(); });
    }
  });
}

// Junta peças dum modelo parado numa malha por material (menos draw calls)
function fundir(obj) {
  obj.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(obj.matrixWorld).invert();
  const grupos = new Map(), out = new T.Group(), soltos = [];
  obj.traverse(m => {
    if (m.isInstancedMesh) { soltos.push(m); return; }
    if (!m.isMesh) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    for (const n of Object.keys(g.attributes))
      if (!['position', 'normal', 'uv', 'color'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    const chave = m.material.uuid + '|' + Object.keys(g.attributes).sort().join(',');
    if (!grupos.has(chave)) grupos.set(chave, { mat: m.material, gs: [] });
    grupos.get(chave).gs.push(g);
  });
  for (const { mat, gs } of grupos.values()) {
    const g = gs.length === 1 ? gs[0] : T.mergeGeometries(gs, false);
    gs.forEach(x => x !== g && x.dispose());
    if (!g) continue;
    const m = new T.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    out.add(m);
  }
  for (const s of soltos) {
    const base = s.geometry.index ? s.geometry.toNonIndexed() : s.geometry;
    const gs = [], mi = new T.Matrix4(), c = new T.Color();
    const rel = new T.Matrix4().multiplyMatrices(inv, s.matrixWorld);
    for (let i = 0; i < s.count; i++) {
      s.getMatrixAt(i, mi);
      const g = base.clone();
      g.applyMatrix4(new T.Matrix4().multiplyMatrices(rel, mi));
      if (s.instanceColor) s.getColorAt(i, c); else c.set(0xffffff);
      const n = g.attributes.position.count, cor = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { cor[k * 3] = c.r; cor[k * 3 + 1] = c.g; cor[k * 3 + 2] = c.b; }
      g.setAttribute('color', new T.BufferAttribute(cor, 3));
      gs.push(g);
    }
    if (!gs.length) continue;
    const mat = s.material.clone(); mat.vertexColors = true;
    const m = new T.Mesh(T.mergeGeometries(gs, false), mat);
    m.castShadow = true; out.add(m);
  }
  return out;
}

// Protótipos fundidos (cada espécie de árvore, carro… feito uma vez)
const protos = new Map();
function proto(nome, criar) {
  if (!protos.has(nome)) protos.set(nome, fundir(criar()));
  const p = protos.get(nome), c = new T.Group();
  for (const m of p.children) {
    const k = m.isInstancedMesh ? m.clone() : new T.Mesh(m.geometry, m.material);
    if (m.isInstancedMesh) { k.matrixAutoUpdate = false; k.matrix.copy(m.matrix); }
    k.castShadow = true; k.receiveShadow = !m.isInstancedMesh;
    c.add(k);
  }
  return c;
}
const modelo = id => proto(id, () => MODELOS[id].criar(T));

// Repetidos (árvores, candeeiros): instâncias para uma chamada de desenho
let repetidos = new Map();
function repetir(id, criar, x, y, rot, arvore = false) {
  if (!repetidos.has(id)) repetidos.set(id, { criar, arvore, pos: [] });
  repetidos.get(id).pos.push([x, y, rot]);
}
function instanciarRepetidos() {
  const o = new T.Object3D();
  for (const [id, { criar, pos, arvore }] of repetidos) {
    if (!protos.has(id)) protos.set(id, fundir(criar()));
    for (const m of protos.get(id).children) {
      const im = new T.InstancedMesh(m.geometry, m.material, pos.length);
      pos.forEach(([x, y, r], i) => {
        o.position.set(x, y, 0); o.rotation.set(0, 0, r); o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      im.castShadow = true; im.receiveShadow = true;
      im.userData.proto = true; im.computeBoundingSphere();
      raiz.add(im); estaticos.push(im);
      if (m.material.userData?.lampada) lampadas.push(m.material);
    }
  }
  repetidos = new Map();
}

/* ── chão interior com textura canvas (tipo string) ──────────────── */
function texturaChaoInterior(W, H, tipo) {
  const S = 32;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  const r = () => Math.random();

  if (tipo === 'tijoleira') {
    // terracotta tile com juntas brancas
    g.fillStyle = '#c9704a';
    g.fillRect(0, 0, c.width, c.height);
    const tW = S * 0.92, tH = S * 0.92;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const offset = (y % 2 === 0) ? 0 : S / 2;
      const lum = 0.85 + r() * 0.3;
      const r_ = Math.min(255, Math.round(201 * lum)), g_ = Math.min(255, Math.round(112 * lum)), b = Math.min(255, Math.round(74 * lum));
      g.fillStyle = `rgb(${r_},${g_},${b})`;
      g.fillRect((x * S + offset) % (W * S), y * S, tW, tH);
    }
  } else if (tipo === 'madeira') {
    // tábuas de madeira horizontais
    for (let y = 0; y < H * 2; y++) {
      const lum = 0.8 + r() * 0.4;
      g.fillStyle = `hsl(28,${Math.round(55 + r() * 20)}%,${Math.round(38 * lum)}%)`;
      g.fillRect(0, y * S / 2, c.width, S / 2 - 1);
      // veio da madeira
      for (let v = 0; v < 3; v++) {
        g.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(r() * c.width, y * S / 2); g.lineTo(r() * c.width, (y + 1) * S / 2); g.stroke();
      }
    }
  } else if (tipo === 'mosaico') {
    // mosaico cerâmico branco com juntas
    g.fillStyle = '#d8d4cd';
    g.fillRect(0, 0, c.width, c.height);
    const tS = S * 0.46;
    for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) {
      const lum = 0.92 + r() * 0.1;
      g.fillStyle = `hsl(40,10%,${Math.round(88 * lum)}%)`;
      g.fillRect(x * tS + 1, y * tS + 1, tS - 2, tS - 2);
    }
  } else if (tipo === 'alcatifa') {
    // carpete — textura granulada
    g.fillStyle = '#8b6a4a';
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < W * H * 60; i++) {
      const lum = 0.6 + r() * 0.6;
      g.fillStyle = `rgba(${Math.round(139 * lum)},${Math.round(106 * lum)},${Math.round(74 * lum)},0.4)`;
      g.fillRect(r() * c.width, r() * c.height, 1.5, 1.5);
    }
  } else if (tipo === 'xadrez') {
    // xadrez preto e branco (discoteca / bar)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#1a1a1a' : '#e8e8e8';
      g.fillRect(x * S, y * S, S, S);
    }
  } else if (tipo === 'cimento') {
    // cimento cinzento (ginásio)
    g.fillStyle = '#b0b8b8';
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < W * H * 20; i++) {
      g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
      g.fillRect(r() * c.width, r() * c.height, 2 + r() * 4, 1 + r() * 2);
    }
    // juntas de dilatação
    for (let y = 1; y < H; y++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y * S); g.lineTo(c.width, y * S); g.stroke(); }
    for (let x = 1; x < W; x++) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, c.height); g.stroke(); }
  } else {
    // fallback neutro
    g.fillStyle = '#c8bfb0';
    g.fillRect(0, 0, c.width, c.height);
  }

  const tex = new T.CanvasTexture(c);
  tex.flipY = false; tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/* ── chão com textura canvas (exterior/bairro — array numérico) ─── */
function texturaChao(cena) {
  const { W, H, chao } = cena;
  // interior usa tipo string
  if (cena.tipo === 'interior' || cena.tipo === 'casa') {
    if (typeof chao === 'string') return texturaChaoInterior(W, H, chao);
    if (!chao || typeof chao !== 'object' || !chao.length) return texturaChaoInterior(W, H, 'mosaico');
  }
  if (!chao || !chao.length) return null;
  const S = 24;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  const r = typeof rng === 'function' ? rng(99) : () => Math.random();
  const COR = typeof COR_CHAO !== 'undefined' ? COR_CHAO
    : ['#6f9b4a', '#b4683f', '#e9d39c', '#2b84ad', '#4b4c52', '#bdb5a8', '#d3c7b2', '#9c5a36'];
  const CH_ = typeof CH !== 'undefined' ? CH
    : { relva: 0, terra: 1, areia: 2, mar: 3, asfalto: 4, passeio: 5, praca: 6, terraEstrada: 7 };
  const shadeFn = typeof shade === 'function' ? shade : (h, f) => {
    const n = parseInt(h.replace('#', ''), 16);
    const clamp = x => Math.min(255, Math.max(0, x));
    const rv = clamp((n >> 16) + Math.round(255 * f));
    const gv = clamp(((n >> 8) & 0xff) + Math.round(255 * f));
    const bv = clamp((n & 0xff) + Math.round(255 * f));
    return '#' + [rv, gv, bv].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = chao[y * W + x];
    g.fillStyle = shadeFn(COR[t] || '#b4683f', (r() - 0.5) * 0.06);
    g.fillRect(x * S, y * S, S, S);
    if (t === CH_.passeio || t === CH_.praca) {
      g.strokeStyle = 'rgba(0,0,0,.07)'; g.strokeRect(x * S + 0.5, y * S + 0.5, S - 1, S - 1);
    }
    if (t === CH_.relva) for (let k = 0; k < 6; k++) {
      g.fillStyle = shadeFn(COR[t], -0.16 + r() * 0.1);
      g.fillRect(x * S + r() * S, y * S + r() * S, 1.5, 3);
    }
    if (t === CH_.terra || t === CH_.terraEstrada) for (let k = 0; k < 4; k++) {
      g.fillStyle = shadeFn(COR[t], -0.2);
      g.beginPath(); g.ellipse(x * S + r() * S, y * S + r() * S, 2, 1.4, 0, 0, 7); g.fill();
    }
    // faixas de passadeira no asfalto
    if (t === CH_.asfalto && cena.estradas) {
      g.fillStyle = 'rgba(255,255,255,.78)';
      for (const e of cena.estradas) {
        if (e.tipo !== CH_.asfalto) continue;
        if (e.eixo === 'h' && y === e.p && chao[y * W + x] === CH_.asfalto)
          g.fillRect((x + 0.2) * S, (y + 1) * S - 1.5, S * 0.5, 3);
        else if (e.eixo !== 'h' && x === e.p && chao[y * W + x] === CH_.asfalto)
          g.fillRect((x + 1) * S - 1.5, (y + 0.2) * S, 3, S * 0.5);
      }
    }
  }
  const tex = new T.CanvasTexture(c);
  tex.flipY = false; tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/* ── construir a cena ─────────────────────────────────────────── */
function por(o, x, y, rot = 0, obj = null) {
  o.position.set(x, y, 0); o.rotation.z = rot;
  raiz.add(o); estaticos.push(o);
  if (obj) o.traverse(m => { if (m.isMesh && !m.isInstancedMesh) { m.userData.obj = obj; pickaveis.push(m); } });
  return o;
}

function limpar() {
  if (transito) { raiz.remove(transito.grupo); transito.grupo.children.forEach(im => im.dispose?.()); transito = null; }
  for (const o of estaticos) { raiz.remove(o); if (!o.userData.proto) deitarFora(o); }
  estaticos.length = 0; pickaveis.length = 0;
  lampadas.length = 0; vidros.length = 0;
  for (const [p, e] of pessoas) { raiz.remove(e.g); deitarFora(e.g); pessoas.delete(p); }
}

function assinaturaDe(cena) {
  return cena.id + '|' + (cena.tipo || '') + '|' + (cena.andar || 0);
}

function construir(cena) {
  iniciar();
  limpar();
  construida = cena;
  assinatura = assinaturaDe(cena);
  const { W, H } = cena;

  // chão
  const tex = texturaChao(cena);
  if (tex) {
    const geo = new T.PlaneGeometry(W, H);
    const mat = new T.MeshStandardMaterial({ map: tex, roughness: 1 });
    const chaoMesh = new T.Mesh(geo, mat);
    chaoMesh.position.set(W / 2, H / 2, 0);
    chaoMesh.receiveShadow = true;
    raiz.add(chaoMesh); estaticos.push(chaoMesh);
  } else {
    // fallback simples se não houver array chao[]
    const corChao = cena.tipo === 'casa' || cena.tipo === 'interior' ? '#c8c0b0' : '#b4683f';
    const geo = new T.PlaneGeometry(W, H);
    const mat = new T.MeshStandardMaterial({ color: corChao, roughness: 1 });
    const chaoMesh = new T.Mesh(geo, mat);
    chaoMesh.position.set(W / 2, H / 2, 0);
    chaoMesh.receiveShadow = true;
    raiz.add(chaoMesh); estaticos.push(chaoMesh);
  }

  // paredes de interior com dado (wainscot) + janelas + identidade moçambicana
  if (cena.tipo === 'interior' || cena.tipo === 'casa') {
    const pCor = cena.parede || '#f3d36b';
    const dadoCor = _shade(pCor, -0.18);   // zona inferior mais escura
    const trim = _shade(pCor, 0.12);        // friso de topo mais claro
    const altParede = 2.6;
    const altDado = 0.72;   // wainscot vai até 0.72 m
    const espessura = 0.07;

    // textura de tinta para a parede superior (canvas 2×2)
    function _texParede(cor, larg, alt) {
      const sc = 48;
      const cv = document.createElement('canvas'); cv.width = Math.round(larg * sc); cv.height = Math.round(alt * sc);
      const gx = cv.getContext('2d');
      gx.fillStyle = cor; gx.fillRect(0, 0, cv.width, cv.height);
      // variação subtil de tinta (pinceladas)
      for (let i = 0; i < 120; i++) {
        const alpha = 0.015 + Math.random() * 0.025;
        gx.fillStyle = `rgba(255,255,255,${alpha})`;
        gx.fillRect(Math.random() * cv.width, Math.random() * cv.height, 2 + Math.random() * 60, 1 + Math.random() * 3);
      }
      const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    }

    // capulana moçambicana no friso inferior — padrão geométrico azul/vermelho/verde
    function _texCapulana(larg) {
      const sc = 32, rep = Math.max(1, Math.round(larg));
      const cv = document.createElement('canvas'); cv.width = rep * sc; cv.height = sc;
      const gx = cv.getContext('2d');
      // bandas de fundo (cores da bandeira moçambicana: verde, preto, amarelo, vermelho)
      const mzCores = ['#009a44', '#000000', '#ffd100', '#d21034'];
      for (let i = 0; i < rep; i++) {
        const faixaW = sc / 4;
        mzCores.forEach((c, ci) => { gx.fillStyle = c; gx.fillRect(i * sc + ci * faixaW, 0, faixaW, sc); });
        // triângulo da bandeira (estrela/faixa branca)
        gx.fillStyle = 'rgba(255,255,255,0.7)';
        gx.beginPath(); gx.moveTo(i * sc, 0); gx.lineTo(i * sc + sc * 0.28, sc / 2); gx.lineTo(i * sc, sc); gx.closePath(); gx.fill();
        // losangos geométricos capulana
        gx.strokeStyle = 'rgba(255,255,255,0.5)'; gx.lineWidth = 1.2;
        for (let d = 0; d < 3; d++) {
          const dx = i * sc + sc * 0.35 + d * sc * 0.22, dy = sc / 2, ds = sc * 0.09;
          gx.beginPath(); gx.moveTo(dx, dy - ds); gx.lineTo(dx + ds, dy); gx.lineTo(dx, dy + ds); gx.lineTo(dx - ds, dy); gx.closePath(); gx.stroke();
        }
      }
      const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; return t;
    }

    // Materiais — sem DoubleSide: BoxGeometry tem faces para todos os lados
    const matSup   = c   => new T.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const matDado  = tex => new T.MeshStandardMaterial({ map: tex, roughness: 0.75 });
    const matFriso = c   => new T.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const matVidro = new T.MeshStandardMaterial({ color: '#aad8f0', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55 });
    const matCaixilho = new T.MeshStandardMaterial({ color: '#f5f2ee', roughness: 0.6 });

    const hSup = altParede - altDado;

    // NOTA: raiz tem matrix x↔y (Three.js X = game Y, Three.js Y = game X).
    // BoxGeometry não precisa de rotation — position em coordenadas de jogo é suficiente.
    // Câmara vê o interior de baixo-esquerda → as paredes visíveis (de fundo) são Sul (y=0) e Oeste (x=0).
    // Norte (y=H) e Este (x=W) são as paredes frontais — omitidas para abrir a vista isométrica.

    // --- Parede SUL (game y=0, parede de fundo visível) ---
    { const m = new T.Mesh(new T.BoxGeometry(W, espessura, hSup), matSup(pCor));
      m.receiveShadow = true; m.position.set(W/2, 0, altDado + hSup/2); raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(W, espessura, altDado), matDado(_texCapulana(W)));
      m.receiveShadow = true; m.position.set(W/2, 0, altDado/2); raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(W, espessura, 0.06), matFriso(trim));
      m.position.set(W/2, 0, altDado + 0.03); m.castShadow = true; raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(W, espessura, 0.08), matFriso('#f5f2ee'));
      m.position.set(W/2, 0, altParede - 0.04); m.castShadow = true; raiz.add(m); estaticos.push(m); }

    // --- Parede OESTE (game x=0, parede lateral esquerda visível) ---
    { const m = new T.Mesh(new T.BoxGeometry(espessura, H, hSup), matSup(pCor));
      m.receiveShadow = true; m.position.set(0, H/2, altDado + hSup/2); raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(espessura, H, altDado), matDado(_texCapulana(H)));
      m.receiveShadow = true; m.position.set(0, H/2, altDado/2); raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(espessura, H, 0.06), matFriso(trim));
      m.position.set(0, H/2, altDado + 0.03); m.castShadow = true; raiz.add(m); estaticos.push(m); }
    { const m = new T.Mesh(new T.BoxGeometry(espessura, H, 0.08), matFriso('#f5f2ee'));
      m.position.set(0, H/2, altParede - 0.04); m.castShadow = true; raiz.add(m); estaticos.push(m); }

    // Norte (y=H) e Este (x=W) omitidas — são as paredes frontais que bloqueariam a câmara isométrica

    // --- Janelas na parede Sul (y=0, a de fundo visível) ---
    // vidro como BoxGeometry fino — sem rotation, compatível com raiz x↔y
    if (W >= 4) {
      const nJan = Math.min(3, Math.floor(W / 3));
      const janW = 0.88, janH = 0.72, janZ = altDado + 0.32;
      const passo = W / (nJan + 1);
      for (let j = 0; j < nJan; j++) {
        const jx = passo * (j + 1);
        { const mv = new T.Mesh(new T.BoxGeometry(janW, espessura, janH), matVidro);
          mv.position.set(jx, 0, janZ + janH/2); raiz.add(mv); estaticos.push(mv); }
        { const mc = new T.Mesh(new T.BoxGeometry(janW + 0.08, espessura, 0.05), matCaixilho);
          mc.position.set(jx, 0, janZ + janH + 0.025); raiz.add(mc); estaticos.push(mc); }
        { const mc = new T.Mesh(new T.BoxGeometry(janW + 0.08, espessura, 0.05), matCaixilho);
          mc.position.set(jx, 0, janZ - 0.025); raiz.add(mc); estaticos.push(mc); }
        { const mc = new T.Mesh(new T.BoxGeometry(0.05, espessura, janH + 0.08), matCaixilho);
          mc.position.set(jx - janW/2 - 0.025, 0, janZ + janH/2); raiz.add(mc); estaticos.push(mc); }
        { const mc = new T.Mesh(new T.BoxGeometry(0.05, espessura, janH + 0.08), matCaixilho);
          mc.position.set(jx + janW/2 + 0.025, 0, janZ + janH/2); raiz.add(mc); estaticos.push(mc); }
      }
    }

    // tecto omitido — câmara isométrica vê de cima, tecto taparia toda a vista
  }

  // objetos (edifícios, móveis, árvores…)
  const dentroAgora = cena.tipo === 'casa' || cena.tipo === 'interior';
  for (const o of (cena.objetos || [])) {
    try {
      let g = null;
      if (o.kind === 'edificio' || o.kind === 'casinha') {
        if (typeof predio === 'function') {
          // casinha: adicionar k:'casinha' para que predio() use estilo de casa baixa
          const spec = o.kind === 'casinha' ? { ...o.b, k: 'casinha' } : o.b;
          g = proto('predio|' + JSON.stringify(spec), () => predio(T, spec));
          if (g) {
            g.userData.obj = o;
            // incluir meshes diretos do grupo e dos filhos (fundir pode criar ambos)
            g.traverse(m => { if (m.isMesh) pickaveis.push(m); });
          }
        }
      } else if (o.kind === 'decoracao') {
        const tipo = o.tipo || '';
        if (tipo === 'palmeira' || tipo === 'acacia' || tipo === 'baobab') {
          repetir(tipo, () => MODELOS[tipo]?.criar(T) || _makeArvore(tipo), o.x + 0.5, o.y + 0.5, 0, true);
        } else if (tipo === 'candeeiro') {
          repetir('candeeiro', () => _makeCandeeiro(), o.x + 0.5, o.y + 0.5, 0);
        }
      } else if (o.kind === 'paragem' || o.kind === 'barraca') {
        const corAbrigo = o.cor || '#3a7a9f';
        g = _makeAbrigo(o, corAbrigo);
        if (g) { g.userData.obj = o; }
      } else if (o.kind === 'palmeira') {
        // palmeiras standalone (não via decoracao)
        const tipo = o.tipo || 'palmeira';
        repetir(tipo, () => MODELOS[tipo]?.criar(T) || _makeArvore(tipo), o.x + 0.5, o.y + 0.5, 0, true);
      } else if (o.kind === 'arvore' || o.kind === 'baobab') {
        // 28 nov: árvores de verdade (mangueira, acácia, imbondeiro…) em vez de nada/bolas
        const ids = o.kind === 'baobab' ? ['imbondeiro'] : ['mangueira', 'acacia', 'arvore_verde'];
        const id = ids[Math.abs(o.x * 7 + o.y * 13) % ids.length];
        repetir(id, () => MODELOS[id]?.criar(T) || _makeArvore(id), o.x + 0.5, o.y + 0.5, ((Math.abs(o.x * 31 + o.y * 17) % 628) / 100), true);
      } else if (o.kind === 'candeeiro') {
        repetir('candeeiro', () => _makeCandeeiro(), o.x + 0.5, o.y + 0.5, 0);
      } else if (o.kind === 'carro') {
        g = _carroModelo(o) || _makeCarro(o);
        if (g) { g.userData.obj = o; }
      } else if (o.kind === 'outdoor') {
        g = _makeOutdoor(o);
        if (g) { g.userData.obj = o; }
      } else if (o.kind === 'movel') {
        g = _makeMovel(o);
        if (g) {
          g.userData.obj = o;
          // rot: 0=norte,1=este,2=sul,3=oeste — rotação aplicada antes de por()
          const rot3d = (o.mb?.rot || 0) * Math.PI / 2;
          g.rotation.z = rot3d;
          por(g, o.x + (o.w || 1) / 2, o.y + (o.d || 1) / 2, 0, o);
          g = null; // já colocado, não repor em por() abaixo
        }
      }
      if (g) por(g, o.x, o.y, 0, o);
    } catch (e) {
      console.warn('[mundo3d] objeto falhou:', o.kind, e);
    }
  }

  // arredores: a cidade continua para lá do mapa (sem zona azul vazia)
  let corFundo = 0x9db8c4;
  if (!dentroAgora && cena.chao && cena.estradas) {
    try {
      const ar = arredores(T, cena);
      raiz.add(ar.grupo); estaticos.push(ar.grupo);
      for (const p of ar.palmas) repetir(p.tipo, () => MODELOS[p.tipo]?.criar(T) || _makeArvore(p.tipo), p.x, p.y, 0, true);
      corFundo = ar.fundo;
    } catch (e) { console.warn('[mundo3d] arredores falharam:', e); }
  }

  // trânsito: carros a circular, com semáforos e passadeiras
  if (!dentroAgora && cena.estradas && cena.chao) {
    try {
      transito = criarTransito(T, cena, id => proto('carro|' + id + '|', () => MODELOS[id].criar(T)), { densidade: _leve ? 0.5 : 1 });
      if (transito) raiz.add(transito.grupo);
    } catch (e) { console.warn('[mundo3d] trânsito falhou:', e); transito = null; }
  }

  instanciarRepetidos();

  // nevoeiro adaptado ao contexto
  if (dentroAgora) {
    // interior: sem nevoeiro — salas são pequenas e o nevoeiro azulado distorce as cores
    cena3.fog = null;
  } else {
    cena3.fog = new T.Fog(corFundo, 90, 210);
  }

  cam3.iniciada = false;
}

/* ── modelos de fallback para quando MODELOS[tipo] não existe ──── */
function _makeArvore(tipo) {
  const g = new T.Group();
  const tronco = new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 1.2, 6), new T.MeshStandardMaterial({ color: tipo === 'palmeira' ? 0x8b6914 : 0x6b4f28, roughness: 1 }));
  tronco.position.z = 0.6; tronco.rotation.x = Math.PI / 2; g.add(tronco);
  const copa = new T.Mesh(new T.SphereGeometry(tipo === 'baobab' ? 0.9 : 0.6, 6, 5), new T.MeshStandardMaterial({ color: tipo === 'palmeira' ? 0x3d8c40 : 0x2d7030, roughness: 1 }));
  copa.position.z = tipo === 'palmeira' ? 1.5 : 1.3; g.add(copa);
  return g;
}
function _makeCandeeiro() {
  const g = new T.Group();
  const ferro = new T.MeshStandardMaterial({ color: 0x2b2e33, metalness: 0.6, roughness: 0.4 });
  const poste = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 1.7, 8), ferro);
  poste.rotation.x = Math.PI / 2; poste.position.z = 0.85; g.add(poste);
  const luz = new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc864, emissiveIntensity: 0 });
  luz.userData.lampada = true;
  const b = new T.Mesh(new T.BoxGeometry(0.18, 0.12, 0.06), luz);
  b.position.set(0.34, 0, 1.64); g.add(b);
  return g;
}
function _makeAbrigo(o, cor) {
  const g = new T.Group();
  const w = o.w || 2, d = o.d || 1;
  const mat = new T.MeshStandardMaterial({ color: cor, roughness: 0.74 });
  // postes de suporte
  const matPoste = new T.MeshStandardMaterial({ color: '#888888', metalness: 0.4, roughness: 0.5 });
  const posteGeo = new T.CylinderGeometry(0.04, 0.05, 1.6, 6);
  const postes = [[0.1, 0.1], [w - 0.1, 0.1], [0.1, d - 0.1], [w - 0.1, d - 0.1]];
  for (const [px, py] of postes) {
    const p = new T.Mesh(posteGeo, matPoste);
    p.rotation.x = Math.PI / 2; p.position.set(px, py, 0.8); g.add(p);
  }
  const telhado = new T.Mesh(new T.BoxGeometry(w, d, 0.08), mat);
  telhado.position.set(w / 2, d / 2, 1.62); g.add(telhado);
  return g;
}

// carro parado com os modelos detalhados (citadino, sedan, pickup, jipe, carrinha…), na cor do objeto
const CARROS_PARADOS = ['citadino', 'sedan', 'carro', 'pickup', 'jipe', 'carrinha', 'suv_luxo'];
function _carroModelo(o) {
  const id = o.tipo === 'candongueiro' ? 'carrinha' : CARROS_PARADOS[Math.abs(o.x * 5 + o.y * 11) % CARROS_PARADOS.length];
  if (!MODELOS[id]) return null;
  const cor = o.tipo === 'candongueiro' || id === 'carrinha' ? '' : (o.cor || '');
  return proto('carro|' + id + '|' + cor, () => { const m = MODELOS[id].criar(T); const u = m.userData.carro; if (cor && u?.pintura?.color) u.pintura.color.set(cor); return m; });
}
function _makeCarro(o) {
  const g = new T.Group();
  const cor = o.cor || '#c0392b';
  const matCarro = new T.MeshStandardMaterial({ color: cor, roughness: 0.35, metalness: 0.3 });
  const matVidro = new T.MeshStandardMaterial({ color: '#aaccee', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.7 });
  const matRoda = new T.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
  const matAro = new T.MeshStandardMaterial({ color: '#cccccc', metalness: 0.6, roughness: 0.3 });
  // chassi
  const chassi = new T.Mesh(new T.BoxGeometry(1.8, 0.95, 0.42), matCarro);
  chassi.position.set(0.9, 0.475, 0.32); chassi.castShadow = true; g.add(chassi);
  // habitáculo
  const hab = new T.Mesh(new T.BoxGeometry(1.1, 0.85, 0.36), matCarro);
  hab.position.set(0.8, 0.475, 0.74); hab.castShadow = true; g.add(hab);
  // vidros laterais
  const vidLat = new T.Mesh(new T.BoxGeometry(1.0, 0.02, 0.28), matVidro);
  vidLat.position.set(0.8, 0.07, 0.74); g.add(vidLat);
  const vidLat2 = vidLat.clone(); vidLat2.position.y = 0.88; g.add(vidLat2);
  // para-brisas
  const paraBrisas = new T.Mesh(new T.BoxGeometry(0.02, 0.8, 0.28), matVidro);
  paraBrisas.position.set(0.25, 0.475, 0.74); g.add(paraBrisas);
  const paraTras = paraBrisas.clone(); paraTras.position.x = 1.35; g.add(paraTras);
  // rodas (4 rodas)
  const rodaGeo = new T.CylinderGeometry(0.17, 0.17, 0.12, 10);
  const aroGeo = new T.CylinderGeometry(0.09, 0.09, 0.14, 8);
  const posRodas = [[0.32, 0.08], [0.32, 0.87], [1.48, 0.08], [1.48, 0.87]];
  for (const [rx, ry] of posRodas) {
    const roda = new T.Mesh(rodaGeo, matRoda);
    roda.rotation.x = Math.PI / 2; roda.position.set(rx, ry, 0.17); roda.castShadow = true; g.add(roda);
    const aro = new T.Mesh(aroGeo, matAro);
    aro.rotation.x = Math.PI / 2; aro.position.set(rx, ry, 0.17); g.add(aro);
  }
  return g;
}

function _makeOutdoor(o) {
  const g = new T.Group();
  const w = o.w || 2, d = o.d || 0.3;
  const corFundo = o.cor || '#1a3a6a';
  const matPoste = new T.MeshStandardMaterial({ color: '#777', metalness: 0.5, roughness: 0.5 });
  const matPainel = new T.MeshStandardMaterial({ color: corFundo, roughness: 0.5 });
  const matPainelFace = new T.MeshStandardMaterial({ color: '#ffe9a0', roughness: 0.4, emissive: 0xffe9a0, emissiveIntensity: 0.05 });
  // poste vertical
  const poste = new T.Mesh(new T.CylinderGeometry(0.055, 0.07, 3.2, 8), matPoste);
  poste.rotation.x = Math.PI / 2; poste.position.set(w / 2, d / 2, 1.6); g.add(poste);
  // painel
  const painel = new T.Mesh(new T.BoxGeometry(w, 0.1, w * 0.55), matPainel);
  painel.position.set(w / 2, d / 2, 2.9); painel.castShadow = true; g.add(painel);
  // face do outdoor (ligeiramente em frente)
  const face = new T.Mesh(new T.BoxGeometry(w - 0.1, 0.02, (w - 0.1) * 0.55), matPainelFace);
  face.position.set(w / 2, d / 2 - 0.06, 2.9); g.add(face);
  return g;
}

/* ── móveis de interior ──────────────────────────────────────── */
function _makeMovel(o) {
  const mv = o.mv || {};
  const tipo = mv.tipo || 'caixa';
  const cor = mv.cor || '#8a5a32';
  const w = o.w || 1, d = o.d || 1;
  const g = new T.Group();
  const mat = c => new T.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const matMet = c => new T.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.4 });
  const caixa = (cx, cy, cz, bw, bd, bh, c) => {
    const m = new T.Mesh(new T.BoxGeometry(bw, bd, bh), mat(c)); m.position.set(cx, cy, cz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  // centrado em 0,0 — por() coloca na posição certa
  const X = w / 2, Y = d / 2;
  switch (tipo) {
    case 'mesa': {
      const mvId = mv.id || '';
      if (mvId === 'int_dj') {
        // Cabine de DJ: consola larga em L com monitores e mixer
        const matDj = new T.MeshStandardMaterial({ color: '#1e1e24', roughness: 0.6, metalness: 0.15 });
        const matLed = new T.MeshStandardMaterial({ color: '#00e5ff', emissive: '#00e5ff', emissiveIntensity: 1.2, roughness: 0.1 });
        const matEcra = new T.MeshStandardMaterial({ color: '#050a0f', roughness: 0.1, emissive: '#0a2040', emissiveIntensity: 0.5 });
        // bancada principal
        caixa(0, 0, 0.44, w - 0.08, d - 0.08, 0.88, '#1e1e24');
        caixa(0, 0, 0.9, w + 0.04, d + 0.04, 0.06, '#14141a');
        // mixer central (caixa mais alta)
        { const mx = new T.Mesh(new T.BoxGeometry(0.6, d - 0.2, 0.22), matDj); mx.position.set(0, 0, 1.0); mx.castShadow = true; g.add(mx); }
        // ecrã do mixer
        { const ec = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 0.16), matEcra); ec.position.set(0, -(d/2 - 0.1), 1.1); g.add(ec); }
        // faders — 4 barrinhas LED
        for (let f = 0; f < 4; f++) {
          const fx = -0.22 + f * 0.15;
          caixa(fx, -(d/2 - 0.08), 0.97, 0.04, 0.04, 0.12, '#888');
          const led = new T.Mesh(new T.BoxGeometry(0.06, 0.04, 0.03), matLed); led.position.set(fx, -(d/2 - 0.08), 1.04); g.add(led);
        }
        // 2 pratos de vinil (CDJs)
        for (const sx of [-1, 1]) {
          const disk = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.04, 16), new T.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.4, metalness: 0.2 }));
          disk.rotation.x = Math.PI / 2; disk.position.set(sx * (w / 2 - 0.35), 0, 0.97); disk.castShadow = true; g.add(disk);
          const label = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.045, 12), new T.MeshStandardMaterial({ color: '#d21034' }));
          label.rotation.x = Math.PI / 2; label.position.set(sx * (w / 2 - 0.35), 0, 0.99); g.add(label);
        }
        // 2 monitores de estúdio
        for (const sx of [-1, 1]) {
          caixa(sx * (w / 2 - 0.18), -(d/2 - 0.14), 1.22, 0.28, 0.24, 0.36, '#111');
          const tw = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.04, 10), new T.MeshStandardMaterial({ color: '#888' }));
          tw.rotation.x = Math.PI / 2; tw.position.set(sx * (w / 2 - 0.18), -(d/2 - 0.26), 1.3); g.add(tw);
        }
        // aro LED na frente da bancada
        { const led = new T.Mesh(new T.BoxGeometry(w - 0.12, 0.03, 0.04), matLed); led.position.set(0, d/2 - 0.02, 0.6); g.add(led); }
      } else if (mvId === 'int_secretaria' || mvId === 'int_mesa_rest') {
        // Secretária de escritório com monitor + teclado; mesa de restaurante simples
        const isEsc = mvId === 'int_secretaria';
        caixa(0, 0, 0.72, w - 0.1, d - 0.1, 0.05, cor);
        const pLeg2 = 0.07, hL = 0.72;
        [[-X + 0.14, -Y + 0.14], [X - 0.14, -Y + 0.14], [-X + 0.14, Y - 0.14], [X - 0.14, Y - 0.14]].forEach(([lx, ly]) =>
          caixa(lx, ly, hL / 2 - 0.03, pLeg2, pLeg2, hL, _shade(cor, -0.2)));
        if (isEsc) {
          // monitor (ecrã fino + base)
          caixa(X - 0.3, 0, 1.08, 0.04, 0.42, 0.3, '#111');   // ecrã
          caixa(X - 0.3, 0, 0.78, 0.12, 0.08, 0.06, '#333');   // base
          caixa(X - 0.3, 0, 0.84, 0.03, 0.03, 0.24, '#555');   // pé
          // teclado
          caixa(0, -(Y - 0.2), 0.75, w * 0.55, 0.22, 0.03, '#c8c8c8');
          // rato
          const rato = new T.Mesh(new T.SphereGeometry(0.055, 8, 5), new T.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.6 }));
          rato.scale.z = 0.6; rato.position.set(-X + 0.5, -(Y - 0.2), 0.75); g.add(rato);
        }
      } else {
        // tampo genérico
        caixa(0, 0, 0.72, w - 0.1, d - 0.1, 0.06, cor);
        const pLeg = 0.08, h = 0.72;
        [[-X + 0.15, -Y + 0.15], [X - 0.15, -Y + 0.15], [-X + 0.15, Y - 0.15], [X - 0.15, Y - 0.15]].forEach(([lx, ly]) =>
          caixa(lx, ly, h / 2 - 0.03, pLeg, pLeg, h, _shade(cor, -0.15)));
      }
      break;
    }
    case 'cadeira': {
      // assento
      caixa(0, 0, 0.44, 0.44, 0.44, 0.06, cor);
      // encosto
      caixa(0, -0.19, 0.72, 0.44, 0.06, 0.52, _shade(cor, -0.1));
      // pernas
      [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([lx, ly]) =>
        caixa(lx, ly, 0.21, 0.07, 0.07, 0.42, _shade(cor, -0.2)));
      break;
    }
    case 'balcao': {
      caixa(0, 0, 0.5, w - 0.05, d - 0.05, 1.0, cor);
      caixa(0, 0, 1.03, w + 0.05, d + 0.05, 0.06, _shade(cor, 0.1));
      break;
    }
    case 'sofa': {
      // assento
      caixa(0, 0, 0.3, w - 0.1, d - 0.3, 0.3, cor);
      // encosto traseiro
      caixa(0, -d / 2 + 0.12, 0.6, w - 0.1, 0.22, 0.56, _shade(cor, -0.08));
      // braços
      caixa(-w / 2 + 0.1, 0, 0.5, 0.18, d - 0.1, 0.4, _shade(cor, -0.12));
      caixa(w / 2 - 0.1, 0, 0.5, 0.18, d - 0.1, 0.4, _shade(cor, -0.12));
      break;
    }
    case 'cama': {
      const isHosp = (mv.id || '').includes('simples') || cor === '#bfe3f2';
      if (isHosp) {
        // cama de hospital: estrutura metálica branca, lençol azul claro, grades laterais
        const matMetal = new T.MeshStandardMaterial({ color: '#d8dde0', roughness: 0.4, metalness: 0.5 });
        // estrutura
        caixa(0, 0, 0.3, w - 0.06, d - 0.06, 0.08, '#d8dde0');
        // pernas metálicas (4)
        [[-w/2+0.1, -d/2+0.1], [w/2-0.1, -d/2+0.1], [-w/2+0.1, d/2-0.1], [w/2-0.1, d/2-0.1]].forEach(([lx, ly]) => {
          const p = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.3, 6), matMetal);
          p.rotation.x = Math.PI / 2; p.position.set(lx, ly, 0.15); g.add(p);
        });
        // colchão
        caixa(0, 0, 0.44, w - 0.1, d - 0.1, 0.16, '#f0f7ff');
        // lençol
        caixa(0, d * 0.1, 0.52, w - 0.14, d * 0.72, 0.06, '#bfe3f2');
        // almofada
        caixa(0, -d/2 + 0.2, 0.55, w * 0.7, 0.28, 0.08, '#f8f8ff');
        // grades laterais (barras metálicas)
        for (const sx of [-1, 1]) {
          const gr = new T.Mesh(new T.BoxGeometry(0.015, d - 0.3, 0.22), matMetal);
          gr.position.set(sx * (w/2 - 0.06), 0, 0.52); g.add(gr);
          for (let b = 0; b < 3; b++) {
            const bar = new T.Mesh(new T.BoxGeometry(0.015, 0.015, 0.22), matMetal);
            bar.position.set(sx * (w/2 - 0.06), -d/2 + 0.25 + b * ((d-0.4)/3), 0.52); g.add(bar);
          }
        }
        // cabeceira metálica
        const cab = new T.Mesh(new T.BoxGeometry(w - 0.08, 0.06, 0.52), matMetal);
        cab.position.set(0, -d/2 + 0.04, 0.78); g.add(cab);
      } else {
        // cama normal
        caixa(0, 0, 0.18, w - 0.08, d - 0.08, 0.36, _shade(cor, -0.2));
        caixa(0, 0, 0.42, w - 0.12, d - 0.12, 0.2, '#f0ede6');
        caixa(0, -d / 2 + 0.25, 0.56, w * 0.6, 0.35, 0.1, '#ffffffcc');
        caixa(0, -d / 2 + 0.07, 0.72, w - 0.08, 0.14, 0.72, cor);
      }
      break;
    }
    case 'estante': {
      // estrutura
      caixa(0, 0, 0.9, w - 0.08, 0.3, 1.8, cor);
      // prateleiras
      for (let s = 0; s < 4; s++) caixa(0, 0, 0.3 + s * 0.42, w - 0.1, 0.32, 0.03, _shade(cor, 0.1));
      // livros coloridos
      const cores = ['#c0392b', '#2c6fb0', '#f5b81c', '#2f8f5b', '#9b59b6'];
      for (let s = 0; s < 4; s++) for (let b = 0; b < Math.floor(w * 2); b++) {
        const bk = new T.Mesh(new T.BoxGeometry(0.08 + Math.random() * 0.06, 0.26, 0.28), mat(cores[(s * 3 + b) % cores.length]));
        bk.position.set(-w / 2 + 0.12 + b * 0.14, 0, 0.3 + s * 0.42 + 0.17); bk.castShadow = true; g.add(bk);
      }
      break;
    }
    case 'fogao': {
      caixa(0, 0, 0.44, 0.9, 0.9, 0.88, '#ddd');
      // placa de aquecimento
      caixa(0, 0, 0.9, 0.86, 0.86, 0.02, '#333');
      [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(([bx, by]) => {
        const e = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 10), mat('#111'));
        e.rotation.x = Math.PI / 2; e.position.set(bx, by, 0.93); g.add(e);
      });
      break;
    }
    case 'frigorifico': {
      caixa(0, 0, 0.9, 0.85, 0.75, 1.8, '#f0f0f0');
      caixa(0, -0.38, 0.72, 0.83, 0.03, 0.6, '#e0e0e0');  // divisória
      caixa(0.3, -0.42, 0.9, 0.06, 0.04, 0.12, matMet('#bbb').color.getHex ? '#bbb' : '#bbb');  // puxador
      break;
    }
    case 'tapete': {
      const m = new T.Mesh(new T.BoxGeometry(w - 0.2, d - 0.2, 0.03), mat(cor));
      m.position.set(0, 0, 0.015); g.add(m);
      const inner = new T.Mesh(new T.BoxGeometry(w - 0.5, d - 0.5, 0.032), mat(_shade(cor, 0.2)));
      inner.position.set(0, 0, 0.016); g.add(inner);
      break;
    }
    case 'tv': {
      caixa(0, 0, 0.44, 0.3, w - 0.1, 0.5, '#3a2a1a');  // suporte
      const matTela = new T.MeshStandardMaterial({ color: '#050505', roughness: 0.05, metalness: 0.3, emissive: 0x1a2a3a, emissiveIntensity: 0.4 });
      const tela = new T.Mesh(new T.BoxGeometry(0.06, w - 0.15, d + 0.1), matTela);
      tela.position.set(0, 0, 0.72); tela.castShadow = true; g.add(tela);
      break;
    }
    case 'som': {
      caixa(0, 0, 0.44, 0.65, 0.65, 0.88, '#1a1a1a');
      const c2 = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.04, 16), mat('#333'));
      c2.rotation.x = Math.PI / 2; c2.position.set(0, -0.33, 0.6); g.add(c2);
      break;
    }
    case 'multibanco': {
      caixa(0, 0, 0.9, 0.5, 0.35, 1.8, '#cc092f');
      caixa(0, -0.19, 1.1, 0.4, 0.04, 0.4, '#111');  // ecrã
      caixa(0, -0.19, 0.78, 0.3, 0.04, 0.12, '#888');  // teclado
      break;
    }
    case 'passadeira': {
      // passadeira de ginásio
      caixa(0, 0, 0.1, w - 0.1, d - 0.1, 0.2, '#333');
      caixa(0, -d / 2 + 0.1, 0.9, w - 0.15, 0.08, 1.4, '#555');  // barras de suporte
      caixa(0, -d / 2 + 0.1, 1.6, 0.4, 0.06, 0.08, '#f5b81c');   // painel
      break;
    }
    case 'halteres': {
      for (let i = 0; i < 3; i++) {
        const h = 0.3 + i * 0.08;
        caixa(-w / 2 + 0.25 + i * 0.3, 0, h + 0.05, 0.08, d - 0.1, 0.1, '#555');
        caixa(-w / 2 + 0.25 + i * 0.3 - 0.14, 0, h + 0.05, 0.12, 0.1, 0.18, '#333');
        caixa(-w / 2 + 0.25 + i * 0.3 + 0.14, 0, h + 0.05, 0.12, 0.1, 0.18, '#333');
      }
      break;
    }
    case 'expositor': {
      caixa(0, 0, 0.44, w - 0.1, d - 0.1, 0.88, _shade(cor, -0.1));
      caixa(0, 0, 0.9, w + 0.05, d + 0.05, 0.04, cor);
      break;
    }
    case 'quadro': {
      caixa(0, -0.05, 0.9, w - 0.1, 0.06, d - 0.1, '#5a3a22');  // moldura
      // arte moçambicana — capulana geométrica ou bandeira
      const _cvQ = document.createElement('canvas'); _cvQ.width = 128; _cvQ.height = 128;
      const _gQ = _cvQ.getContext('2d');
      // fundo bandeira MZ: verde, preto, amarelo, vermelho
      _gQ.fillStyle = '#009a44'; _gQ.fillRect(0, 0, 128, 51);
      _gQ.fillStyle = '#000000'; _gQ.fillRect(0, 51, 128, 26);
      _gQ.fillStyle = '#d21034'; _gQ.fillRect(0, 77, 128, 51);
      _gQ.fillStyle = '#ffd100'; _gQ.strokeStyle = '#ffd100'; _gQ.lineWidth = 3;
      _gQ.beginPath(); _gQ.moveTo(0, 0); _gQ.lineTo(0, 128); _gQ.lineTo(50, 64); _gQ.closePath(); _gQ.fill();
      // estrela AK+livro — simplificado como estrela de 5 pontas
      _gQ.fillStyle = '#000000';
      _gQ.save(); _gQ.translate(18, 64); _gQ.rotate(-Math.PI / 10);
      for (let si = 0; si < 5; si++) {
        _gQ.rotate((Math.PI * 2) / 5);
        _gQ.beginPath(); _gQ.moveTo(0, -11); _gQ.lineTo(2.5, -4); _gQ.lineTo(10, -4); _gQ.lineTo(4, 1); _gQ.lineTo(6.5, 8);
        _gQ.lineTo(0, 4); _gQ.lineTo(-6.5, 8); _gQ.lineTo(-4, 1); _gQ.lineTo(-10, -4); _gQ.lineTo(-2.5, -4); _gQ.closePath(); _gQ.fill();
      }
      _gQ.restore();
      // losangos capulana no lado direito
      _gQ.strokeStyle = 'rgba(255,215,0,0.7)'; _gQ.lineWidth = 2;
      [[80, 40], [100, 64], [80, 88], [60, 64]].forEach(([cx, cy]) => {
        _gQ.beginPath(); _gQ.moveTo(cx, cy - 20); _gQ.lineTo(cx + 20, cy); _gQ.lineTo(cx, cy + 20); _gQ.lineTo(cx - 20, cy); _gQ.closePath(); _gQ.stroke();
      });
      const _texQ = new T.CanvasTexture(_cvQ); _texQ.colorSpace = T.SRGBColorSpace;
      const matQuadro = new T.MeshStandardMaterial({ map: _texQ, roughness: 0.5 });
      const q = new T.Mesh(new T.BoxGeometry(w - 0.18, 0.04, d - 0.18), matQuadro);
      q.position.set(0, -0.06, 0.9); g.add(q);
      break;
    }
    case 'candeeiro': {
      const p = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 1.4, 8), mat('#444'));
      p.rotation.x = Math.PI / 2; p.position.set(0, 0, 0.7); g.add(p);
      const ab = new T.Mesh(new T.ConeGeometry(0.22, 0.28, 10, 1, true), new T.MeshStandardMaterial({ color: cor, roughness: 0.5, side: T.DoubleSide }));
      ab.rotation.x = Math.PI / 2; ab.position.set(0, 0, 1.3); g.add(ab);
      const bulb = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), new T.MeshStandardMaterial({ color: 0xfffde0, emissive: 0xffee88, emissiveIntensity: 1.5 }));
      bulb.position.set(0, 0, 1.3); g.add(bulb);
      break;
    }
    case 'planta': {
      // vaso de terracotta + folhagem — estilo Moçambique: planta tropical
      const corVaso = cor || '#a0522d';
      // vaso (cone truncado)
      const vaso = new T.Mesh(new T.CylinderGeometry(0.17, 0.12, 0.28, 10), mat(corVaso));
      vaso.rotation.x = Math.PI / 2; vaso.position.set(0, 0, 0.14); vaso.castShadow = true; g.add(vaso);
      // terra no topo do vaso
      const terra = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.04, 10), mat('#4a3220'));
      terra.rotation.x = Math.PI / 2; terra.position.set(0, 0, 0.3); g.add(terra);
      // caule
      const caule = new T.Mesh(new T.CylinderGeometry(0.025, 0.035, 0.45, 6), mat('#2d5a1b'));
      caule.rotation.x = Math.PI / 2; caule.position.set(0, 0, 0.55); caule.castShadow = true; g.add(caule);
      // folhagem principal (esfera achatada)
      const folhaCor = mv.cor2 || '#2f8f5b';
      const folha1 = new T.Mesh(new T.SphereGeometry(0.3, 8, 6), new T.MeshStandardMaterial({ color: folhaCor, roughness: 0.9 }));
      folha1.scale.z = 0.72; folha1.position.set(0, 0, 0.9); folha1.castShadow = true; g.add(folha1);
      // folhas laterais para dar volume tropical
      const folhaLat = new T.Mesh(new T.SphereGeometry(0.18, 6, 5), new T.MeshStandardMaterial({ color: _shade(folhaCor, 0.08), roughness: 0.9 }));
      folhaLat.scale.set(1.2, 0.8, 0.5);
      [[-0.22, 0, 0.78], [0.22, 0, 0.78], [0, -0.2, 0.84], [0, 0.2, 0.84]].forEach(([fx, fy, fz]) => {
        const f = folhaLat.clone(); f.position.set(fx, fy, fz); g.add(f);
      });
      break;
    }
    default: {
      // fallback: caixa genérica na cor do móvel
      caixa(0, 0, 0.44, (w || 1) - 0.1, (d || 1) - 0.1, 0.88, cor);
    }
  }
  return g;
}

/* ── pessoas ─────────────────────────────────────────────────── */
const PELES_3D = ['#f3cfae', '#dca77c', '#b97a4c', '#8d5527', '#6a3c1c', '#4a2912'];
const CORS_CABELO_3D = ['#1a1310', '#4a2a17', '#8a5a2b', '#c9a24a', '#a8322d', '#9a9a9a'];

function corDe(cam, ap) {
  const est = ap.cabelo ?? 1, camisa = ap.camisa || '#e0313f';
  if (cam === 'pele') return PELES_3D[ap.pele ?? 3] || PELES_3D[3];
  if (cam === 'cima') return camisa;
  if (cam === 'baixo') return ap.calca || '#2a3b55';
  if (cam === 'cabelo') return est === 5 ? _shade(camisa, 0.15) : (CORS_CABELO_3D[ap.corCabelo ?? 0] || CORS_CABELO_3D[0]);
  return null;
}

function _shade(h, f) {
  if (typeof shade === 'function') return shade(h, f);
  const n = parseInt(h.replace('#', ''), 16);
  const clamp = x => Math.min(255, Math.max(0, x));
  return '#' + [n >> 16, (n >> 8) & 0xff, n & 0xff]
    .map(c => clamp(c + Math.round(255 * f)).toString(16).padStart(2, '0')).join('');
}

function fundirRig(g) {
  const vivos = new Set(g.userData.vivos || []), nos = [];
  g.traverse(n => { if (!n.isMesh) nos.push(n); });
  for (const no of nos) {
    const grupos = new Map();
    for (const m of [...no.children]) {
      if (!m.isMesh || vivos.has(m) || m.children.length || !m.visible) continue;
      const mt = m.material;
      const chave = [mt.color.getHexString(), mt.roughness, mt.metalness, mt.side, mt.userData.camada].join('|');
      if (!grupos.has(chave)) grupos.set(chave, { mat: mt, ms: [] });
      grupos.get(chave).ms.push(m);
    }
    for (const { mat, ms } of grupos.values()) {
      if (ms.length < 2) continue;
      const gs = ms.map(m => {
        m.updateMatrix();
        const x = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        x.applyMatrix4(m.matrix);
        for (const a of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(a)) x.deleteAttribute(a);
        if (!x.attributes.uv) x.setAttribute('uv', new T.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
        return x;
      });
      const junto = new T.Mesh(T.mergeGeometries(gs, false), mat);
      junto.castShadow = ms[0].castShadow;
      ms.forEach(m => { no.remove(m); m.geometry.dispose(); });
      no.add(junto);
    }
  }
  return g;
}

function criarPessoa(ap, crianca) {
  try {
    const g = pessoaRig(T, {
      peca: ap.peca,
      roupa: Math.min(crianca ? 4 : 6, ap.roupa || 0),
      cabelo: ap.cabelo ?? 1,
      perfil: ap.perfil,
      crianca,
      acc: crianca ? [] : (ap.acess || []),
    });
    g.traverse(m => {
      if (!m.isMesh) return;
      const c = corDe(m.material.userData.camada, ap);
      m.castShadow = true;
      if (c) m.material.color.set(c);
      if ((ap.cabelo ?? 1) === 0 && m.material.userData.camada === 'cabelo') m.visible = false;
    });
    if (!crianca && ap.animal) {
      try {
        const a = animal3d(T, ap.animal);
        if (ap.animal === 'papagaio') { a.position.set(0.13, -0.01, 1.05); a.scale.setScalar(1.5); }
        else a.position.set(-0.32, 0.06, 0);
        a.userData.animal = true; g.add(a);
      } catch { /* animal opcional */ }
    }
    return fundirRig(g);
  } catch (e) {
    console.warn('[mundo3d] pessoaRig falhou:', e);
    // fallback: boneco simples
    const g = new T.Group();
    const corpo = new T.Mesh(new T.BoxGeometry(0.4, 0.25, 1.0), new T.MeshStandardMaterial({ color: ap.camisa || 0xe0313f }));
    corpo.position.z = 0.5; g.add(corpo);
    const cab = new T.Mesh(new T.SphereGeometry(0.22, 6, 5), new T.MeshStandardMaterial({ color: PELES_3D[ap.pele ?? 3] }));
    cab.position.z = 1.2; g.add(cab);
    g.userData.pose = () => {};
    return g;
  }
}

function sincronizarPessoas(lista, eu) {
  const vistos = new Set();
  const agora = performance.now();

  for (const p of lista) {
    if (!p) continue;
    const crianca = (p.escala || 1) < 0.8;
    const ap = p.ap || {};
    const chave = JSON.stringify([ap.pele, ap.cabelo, ap.corCabelo, ap.camisa, ap.calca, ap.roupa, ap.peca, ap.acess, crianca, ap.animal || '', ap.perfil]);
    const pose = p.pose?.tipo;
    const tipo = pose === 'correr' ? 'correr' : p.andando ? 'andar' : (pose || 'parado');
    let e = pessoas.get(p);

    if (e && e.chave !== chave) {
      raiz.remove(e.g); deitarFora(e.g); e = null;
    }
    if (!e) {
      const g = criarPessoa(ap, crianca);
      e = { g, chave, rz: 0, x: p.x, y: p.y, passo: 0 };
      raiz.add(e.g);
      pessoas.set(p, e);
    }

    vistos.add(p);

    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.002) e.rz = Math.atan2(-dx, dy);
    const passada = crianca ? 1.1 : 1.55;
    if (p.andando && dist < 2) e.passo = (e.passo + dist / passada) % 1;
    e.x = p.x; e.y = p.y;

    const alturaPose = pose === 'deitado' ? 0.36 : pose === 'sentado' ? 0.22 : 0;
    if ((pose === 'sentado' || pose === 'deitado') && p.pose?.rot != null)
      e.rz = [0, -Math.PI / 2, Math.PI, Math.PI / 2][p.pose.rot & 3];

    e.g.position.set(p.x, p.y, alturaPose);
    e.g.rotation.z = e.rz;
    e.g.visible = !(primeira && p.eu && !eu?.seguirAvatar);

    const f = p.andando ? e.passo : ((p.t || 0) * 0.24) % 1;
    if (e.g.visible && typeof e.g.userData.pose === 'function')
      e.g.userData.pose(tipo, f, 1);
  }

  for (const [p, e] of pessoas) {
    if (!vistos.has(p)) { raiz.remove(e.g); deitarFora(e.g); pessoas.delete(p); }
  }
}

/* ── câmara ───────────────────────────────────────────────────── */
let _ult = [390, 760, 1];
function tamanho() {
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(h * renderer.getPixelRatio()))
    renderer.setSize(w, h, false);
  return [w, h];
}
function atualizarCamara(w, h, z, jogador) {
  _ult = [w, h, z];
  cam3.az += (cam3.azAlvo - cam3.az) * 0.18;
  const dir = new T.Vector3(Math.cos(cam3.az) * Math.cos(E), Math.sin(cam3.az) * Math.cos(E), Math.sin(E));
  const hw = w / 2 / (K * z), hh = h / 2 / (K * z);
  if (primeira) {
    const altura = jogador.pose?.tipo === 'sentado' ? 1.02 : jogador.pose?.tipo === 'deitado' ? 0.62 : 1.24;
    camara.position.set(jogador.y, jogador.x, altura * (jogador.escala || 1));
    mira.set(Math.cos(rumo) * Math.cos(inclinacao), Math.sin(rumo) * Math.cos(inclinacao), Math.sin(inclinacao));
    mira.add(camara.position);
    camara.lookAt(mira);
    if (camara.aspect !== undefined) camara.aspect = w / h;
  } else {
    camara.position.copy(cam3.alvo).addScaledVector(dir, 100);
    camara.lookAt(cam3.alvo);
    camara.left = -hw; camara.right = hw; camara.top = hh; camara.bottom = -hh;
  }
  camara.updateProjectionMatrix();
  camara.updateMatrixWorld();
  // sol segue a câmara
  const centro = primeira ? new T.Vector3(jogador.y, jogador.x, 0) : cam3.alvo;
  sol.position.copy(centro).add(new T.Vector3(-9, 6, 24));
  sol.target.position.copy(centro);
  const R = primeira ? 26 : Math.max(hw, hh) * 1.25 + 4;
  const sc = sol.shadow.camera;
  sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R;
  sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();
}

/* ── quadro principal ────────────────────────────────────────── */
function quadro(o) {
  // o = { cena, eu, lista, cam (z, seguir), t, noite, tempo, deco }
  if (!renderer) iniciar();
  if (renderer?.getContext().isContextLost()) throw new Error('Contexto WebGL perdido');

  if (construida !== o.cena || assinaturaDe(o.cena) !== assinatura)
    construir(o.cena);

  canvas.style.display = '';
  const [w, h] = tamanho();

  // dia e noite
  const n = Math.min(1, (o.noite || 0) / 0.48);
  sol.intensity = 2.4 * (1 - n * 0.8);
  hemi.intensity = 1.1 * (1 - n * 0.35);
  hemi.color.setRGB(0.87 - n * 0.4, 0.91 - n * 0.35, 1);
  renderer.toneMappingExposure = 1.05 - n * 0.12;
  for (const l of lampadas) l.emissiveIntensity = n * 2.2;
  for (const v of vidros) { v.emissive.setHex(0xffc864); v.emissiveIntensity = n * 0.55; }
  if (!o.noite && o.tempo) {
    const k = { nublado: 0.5, cacimbo: 0.55, chuva: 0.3, tempestade: 0.15 }[o.tempo] ?? 1;
    sol.intensity *= k; hemi.intensity *= 0.75 + 0.25 * k;
  }
  if (cena3.fog) renderer.setClearColor(cena3.fog.color.clone().multiplyScalar(1 - n * 0.6));

  // alvo da câmara
  const alvoEu = g2w(o.eu.x, o.eu.y, 0.55);
  if (!cam3.iniciada) { cam3.alvo.copy(alvoEu); cam3.iniciada = true; }
  if (o.cam.seguir) cam3.alvo.lerp(alvoEu, 0.12);

  atualizarCamara(w, h, o.cam.z, o.eu);
  sincronizarPessoas(o.lista, o.eu);
  { const ag = performance.now(), dt = _tT ? (ag - _tT) / 1000 : 0; _tT = ag; if (transito) transito.atualizar(dt, o.lista); }
  renderer.render(cena3, camara);

  // métricas
  info._n++;
  const agora = performance.now();
  if (agora - info._t > 1000) {
    info.fps = Math.round(info._n * 1000 / (agora - info._t || 1));
    info._n = 0; info._t = agora;
  }
  info.calls = renderer.info.render.calls;
  info.tris = renderer.info.render.triangles;
  info.geo = renderer.info.memory.geometries;
  info.tex = renderer.info.memory.textures;
  info.mb = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
}

/* ── ecra: tile → pixel de ecrã ─────────────────────────────── */
const _v = new T.Vector3();
function ecra(x, y, zpx = 0) {
  if (!camara) return [-9999, -9999, 9];
  _v.set(y, x, zpx / PX_Z).project(camara);
  if (primeira && (!Number.isFinite(_v.z) || _v.z < -1 || _v.z > 1)) return [-9999, -9999, 9];
  return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z];
}

/* ── raycasting ──────────────────────────────────────────────── */
function escolher(sx, sy, lista) {
  if (!camara) return {};
  const ndc = new T.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camara);

  // 1) pessoas: critério de ecrã (como no jogo 2.5D)
  for (const p of lista) {
    const [px, py, prof] = ecra(p.x, p.y, 0), [, hy] = ecra(p.x, p.y, 54);
    const lado = Math.max(10, (py - hy) * 0.3);
    if (primeira && (prof < -1 || prof > 1)) continue;
    if (Math.abs(sx - px) < lado && sy < py + 4 && sy > hy - 4) return { pessoa: p };
  }

  // 2) objetos pickaveis
  const hit = ray.intersectObjects(pickaveis, false)[0];
  const pt = ray.ray.intersectPlane(chaoPlano, new T.Vector3());
  const r = {};
  // Para OrthographicCamera, hit.distance não compara diretamente com
  // camara.position.distanceTo(pt). Usamos a distância 3D entre os pontos.
  if (hit) {
    const hitAntesDoChaoPt = !pt || hit.point.distanceTo(pt) > 0.05 || hit.point.z > 0.01;
    if (hitAntesDoChaoPt) r.obj = hit.object.userData.obj;
  }
  if (pt) {
    r.wx = pt.y; r.wy = pt.x;
    r.tile = [Math.floor(pt.y), Math.floor(pt.x)];
  }
  return r;
}

/* ── arrastar câmara ──────────────────────────────────────────── */
function arrastar(dx, dy, z) {
  const k = 1 / (K * z), a = cam3.az;
  const direita = new T.Vector3(-Math.sin(a), Math.cos(a), 0);
  const frente = new T.Vector3(-Math.cos(a), -Math.sin(a), 0);
  cam3.alvo.addScaledVector(direita, -dx * k).addScaledVector(frente, dy * k / Math.sin(E));
}

/* ── rodar câmara ─────────────────────────────────────────────── */
function rodar(rad, suave = true) {
  if (primeira) { rumo += rad; return; }
  cam3.azAlvo += rad;
  if (!suave) { cam3.az = cam3.azAlvo; if (camara) atualizarCamara(..._ult); }
}

/* ── esconder (voltar ao 2D) ─────────────────────────────────── */
function esconder() { if (canvas) canvas.style.display = 'none'; }

/* ── primeira pessoa ─────────────────────────────────────────── */
function primeiraPessoa(ligar) {
  if (primeira === ligar || !vistaAlta) return;
  primeira = ligar;
  camara = ligar ? olhos : vistaAlta;
  if (ligar) { rumo = cam3.az + Math.PI; inclinacao = -0.12; }
  else { cam3.az = cam3.azAlvo = Math.PI / 4; cam3.iniciada = false; }
}
function olhar(dx, dy) {
  dx = Math.max(-40, Math.min(40, dx)); dy = Math.max(-40, Math.min(40, dy));
  rumo += dx * 0.0042;
  inclinacao = Math.max(-1.1, Math.min(1.1, inclinacao + dy * 0.0032));
}
function direcaoMundo(frente, direita) {
  const m = Math.min(1, Math.hypot(frente, direita)); if (!m) return [0, 0];
  const a = rumo - Math.atan2(direita, frente);
  return [Math.sin(a) * m, Math.cos(a) * m];
}
function virarPara(dx, dy, dt) {
  if (Math.hypot(dx, dy) < 0.05) return;
  const alvo = Math.atan2(dx, dy); let d = alvo - rumo; d = Math.atan2(Math.sin(d), Math.cos(d));
  rumo += d * Math.min(1, dt * 5); inclinacao += (-0.12 - inclinacao) * Math.min(1, dt * 3);
}
function passoRelativo(frente, direita) {
  const a = rumo - Math.atan2(direita, frente);
  const passo = Math.round(a / (Math.PI / 4)) * Math.PI / 4;
  return [Math.round(Math.sin(passo)), Math.round(Math.cos(passo))];
}

/* ── modos ───────────────────────────────────────────────────── */
function leve() {
  _leve = true;
  if (!renderer) return;
  renderer.setPixelRatio(1);
  if (sol) sol.castShadow = false;
}
function normal() {
  _leve = false;
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  if (sol) sol.castShadow = true;
}

/* ── expor interface ─────────────────────────────────────────── */
window.M3D = {
  quadro,
  ecra,
  escolher,
  arrastar,
  rodar,
  esconder,
  leve,
  normal,
  primeiraPessoa,
  olhar,
  passoRelativo,
  direcaoMundo,
  virarPara,
  get primeira() { return primeira; },
  get info() { return info; },
  PORTA,
  construir: c => construir(c),
};

window.dispatchEvent(new Event('m3d-pronto'));
console.log('[mundo3d] carregado — Vida em Moz');

