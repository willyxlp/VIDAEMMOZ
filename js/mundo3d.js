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

/* ── chão com textura canvas ───────────────────────────────────── */
function texturaChao(cena) {
  const { W, H, chao } = cena;
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
      } else if (o.kind === 'carro') {
        g = _makeCarro(o);
        if (g) { g.userData.obj = o; }
      } else if (o.kind === 'outdoor') {
        g = _makeOutdoor(o);
        if (g) { g.userData.obj = o; }
      }
      if (g) por(g, o.x, o.y, 0, o);
    } catch (e) {
      console.warn('[mundo3d] objeto falhou:', o.kind, e);
    }
  }

  instanciarRepetidos();

  // nevoeiro adaptado ao contexto
  if (dentroAgora) {
    cena3.fog = new T.Fog(0xbdd5dd, 140, 320);
  } else {
    cena3.fog = new T.Fog(0x9db8c4, 80, 180);
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
