/* ============================================================
   Vida na Banda — mundo3d.js
   Motor de renderização 3D em tempo real com Three.js.
   Expõe window.M3D com a interface que jogo.js espera:
     M3D.quadro(params)         — desenha uma frame
     M3D.ecra(x, y, z)         — tile → coordenadas de ecrã (px)
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
import { pessoaRig } from './modelos3d.js';

/* ── constantes de jogo (iguais a motor.js) ──────────────────── */
const TW = 64, TH = 32;        // largura e altura de um tile em px (modo 2D)
const TILE = 1;                 // 1 unidade Three.js = 1 tile de jogo

/* ── estado interno ─────────────────────────────────────────── */
let renderer, scene, camera, raycaster;
let raf = 0;
let _leve = false;
let _angulo = 0;               // rotação horizontal da câmara (rad)
const CAM_PITCH = Math.PI / 4; // inclinação fixa (45°)
const CAM_DIST = 18;          // distância câmara–alvo

/* meshes e grupos que persistem entre frames */
const _chaoMesh = new Map(); // key='tipo' → Mesh
const _predioMesh = new Map(); // key='objId' → Group
const _pessoaMesh = new Map(); // key=personagem.id → {rig, t, ap}
const _arvoreMesh = [];
let _cenaId = null;      // para detectar mudança de cena
let _infoTimer = 0;

/* métricas */
const info = { fps: 0, calls: 0, tris: 0, geo: 0, tex: 0, mb: null };
let _fpsT = 0, _fpsN = 0;

/* objecto sentinela "porta" */
const PORTA = Symbol('PORTA');

/* ── inicializar renderer ────────────────────────────────────── */
function init() {
  if (renderer) return;

  const canvas3d = document.createElement('canvas');
  canvas3d.id = 'tela3d';
  canvas3d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
  document.body.prepend(canvas3d);

  renderer = new T.WebGLRenderer({ canvas: canvas3d, antialias: !_leve, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(_leve ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !_leve;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  _resize();

  window.addEventListener('resize', _resize);

  scene = new T.Scene();

  /* câmara perspetiva — ângulo de visão largo mas sem distorção excessiva */
  camera = new T.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);

  raycaster = new T.Raycaster();

  _buildLights();
}

function _resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  if (camera) camera.aspect = innerWidth / innerHeight, camera.updateProjectionMatrix();
}

/* ── iluminação ─────────────────────────────────────────────── */
let _sunLight, _ambLight;
function _buildLights() {
  scene.children = scene.children.filter(c => !(c.isLight));

  _ambLight = new T.AmbientLight(0xfff0d8, 0.55);
  scene.add(_ambLight);

  _sunLight = new T.DirectionalLight(0xfff4e0, 1.1);
  _sunLight.position.set(12, 20, 20);
  _sunLight.castShadow = !_leve;
  if (_sunLight.castShadow) {
    _sunLight.shadow.mapSize.set(1024, 1024);
    _sunLight.shadow.camera.near = 1;
    _sunLight.shadow.camera.far = 120;
    _sunLight.shadow.camera.left = _sunLight.shadow.camera.bottom = -40;
    _sunLight.shadow.camera.right = _sunLight.shadow.camera.top = 40;
    _sunLight.shadow.bias = -0.001;
  }
  scene.add(_sunLight);
}

/* ── cores e materiais ─────────────────────────────────────── */
const matCache = new Map();
function mat(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new T.MeshLambertMaterial({
      color: new T.Color(hex),
      side: opts.double ? T.DoubleSide : T.FrontSide,
      transparent: opts.alpha != null,
      opacity: opts.alpha ?? 1,
    }));
  }
  return matCache.get(key);
}
const MAT_CHAO_TERRA = mat('#c8b98a');
const MAT_CHAO_CIMENTO = mat('#b0a898');
const MAT_CHAO_HERBA = mat('#6aad4c');
const MAT_CHAO_AREIA = mat('#d8c89a');
const MAT_ESTRADA = mat('#404040');
const MAT_FAIXA = mat('#ffffff');
const MAT_PAREDE = mat('#d8c8a8');
const MAT_TELHADO_ZC = mat('#8a7a68');
const MAT_TELHADO_PL = mat('#a09080');
const MAT_TELHADO_TL = mat('#c05030');
const MAT_VIDRO = mat('#89cff0', { alpha: 0.4, double: true });
const MAT_PORTA3D = mat('#8b4513');
const MAT_SOMBRA = mat('#000000', { alpha: 0.18, double: true });

/* ── helpers geométricos ───────────────────────────────────── */

/* converte tile(x,y,z) → Three.js world (y=up) */
function tw(x, y, z = 0) {
  return new T.Vector3(x * TILE, z * TILE * 0.5, y * TILE);
}

/* um simples box centrado no ponto correto */
function box(w, h, d, material, rx = 0) {
  const g = new T.BoxGeometry(w, h, d);
  const m = new T.Mesh(g, material);
  if (rx) m.rotation.x = rx;
  return m;
}

/* ── construir chão ──────────────────────────────────────────── */
function _buildChao(cena) {
  /* remove chão anterior */
  scene.children.filter(c => c.userData.chao).forEach(c => scene.remove(c));

  const W = cena.W, H = cena.H;
  const spec = typeof BAIRROS_MAPA !== 'undefined' ? BAIRROS_MAPA[cena.id] : null;
  const tipo = cena.tipo;

  /* chão base — um plano grande */
  const corChao = tipo === 'casa' || tipo === 'interior'
    ? '#c8c0b0'
    : spec?.praia
      ? '#d8c89a'
      : spec?.chao?.base || '#c8b98a';

  const geo = new T.PlaneGeometry(W, H);
  const mesh = new T.Mesh(geo, mat(corChao));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(W / 2, 0, H / 2);
  mesh.receiveShadow = true;
  mesh.userData.chao = true;
  scene.add(mesh);

  /* estradas e passeios para bairro */
  if (tipo === 'bairro' && spec?.grade != null) {
    const grade = spec.grade || 3;
    const corE = spec.estradaFora?.base || '#3a3a3a';
    const TileSz = 11; // tiles por quarteirão

    for (let q = 0; q <= grade; q++) {
      const px = q * TileSz;
      const ew = new T.PlaneGeometry(1.6, H);
      const em = new T.Mesh(ew, mat(corE));
      em.rotation.x = -Math.PI / 2;
      em.position.set(px + 0.8, 0.01, H / 2);
      em.receiveShadow = true;
      em.userData.chao = true;
      scene.add(em);

      const eh = new T.PlaneGeometry(W, 1.6);
      const em2 = new T.Mesh(eh, mat(corE));
      em2.rotation.x = -Math.PI / 2;
      em2.position.set(W / 2, 0.01, px + 0.8);
      em2.receiveShadow = true;
      em2.userData.chao = true;
      scene.add(em2);
    }
  }

  /* passeio dentro de casa */
  if (tipo === 'casa' || tipo === 'interior') {
    const pg = new T.PlaneGeometry(W, H);
    const pm = new T.Mesh(pg, mat('#d4ccbc'));
    pm.rotation.x = -Math.PI / 2;
    pm.position.set(W / 2, 0.005, H / 2);
    pm.receiveShadow = true;
    pm.userData.chao = true;
    scene.add(pm);
  }
}

/* ── construir prédios / objetos ──────────────────────────────── */
function _buildObjetos(cena) {
  /* limpar prédios antigos */
  _predioMesh.forEach(g => scene.remove(g));
  _predioMesh.clear();

  for (const o of cena.objetos) {
    let group;
    if (o.kind === 'predio' || o.kind === 'casinha') {
      group = _makeEdificio(o);
    } else if (o.kind === 'movel') {
      group = _makeMovel(o);
    } else if (o.kind === 'decoracao') {
      group = _makeDecor(o);
    } else if (o.kind === 'escada') {
      group = _makeEscada(o);
    } else if (o.kind === 'candeeiro') {
      group = _makeCandeeiro(o);
    } else if (o.kind === 'veiculo') {
      group = _makeVeiculo(o);
    }
    if (group) {
      group.userData.obj3d = o;
      _predioMesh.set(o.id ?? (o.x + ',' + o.y), group);
      scene.add(group);
    }
  }
}

function _makeEdificio(o) {
  const g = new T.Group();
  const hPx = (o.h || 24) * 0.03;
  const w = o.w || 3, d = o.d || 3;
  const corBase = o.cor || '#d4c9a8';

  /* paredes principais */
  const wm = new T.Mesh(new T.BoxGeometry(w, hPx, d), mat(corBase));
  wm.position.set(w / 2, hPx / 2, d / 2);
  wm.castShadow = !_leve;
  wm.receiveShadow = true;
  g.add(wm);

  /* faixa de base (sócalo) — cor mais escura */
  const socCor = _shadeHex(corBase, -0.18);
  const soc = new T.Mesh(new T.BoxGeometry(w + 0.02, 0.18, d + 0.02), mat(socCor));
  soc.position.set(w / 2, 0.09, d / 2);
  g.add(soc);

  /* cornija no topo da parede */
  const corCor = _shadeHex(corBase, 0.12);
  const corn = new T.Mesh(new T.BoxGeometry(w + 0.08, 0.1, d + 0.08), mat(corCor));
  corn.position.set(w / 2, hPx - 0.05, d / 2);
  g.add(corn);

  /* telhado */
  const tCor = o.telhado === 'zinco' ? '#7a8a78'
    : o.telhado === 'telha' ? '#b04828'
    : o.telhado === 'laje' ? '#9a9a8a'
    : '#8a9888';
  const tm = new T.Mesh(new T.BoxGeometry(w + 0.14, 0.14, d + 0.14), mat(tCor));
  tm.position.set(w / 2, hPx + 0.07, d / 2);
  tm.castShadow = !_leve;
  g.add(tm);

  if (!_leve) {
    /* janelas em grelha na fachada frontal (z=0) */
    const nCols = Math.max(1, Math.round(w / 1.1));
    const nRows = Math.max(1, Math.round((hPx - 0.3) / 0.75));
    const jW = Math.min(0.42, (w - 0.3) / nCols * 0.7);
    const jH = 0.38;
    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nCols; col++) {
        const jm = new T.Mesh(new T.PlaneGeometry(jW, jH), MAT_VIDRO);
        jm.position.set(
          (col + 0.5) * (w / nCols) + (w / nCols - jW) * 0.5 - (w / nCols - jW) * 0.5,
          0.28 + row * 0.75 + jH / 2,
          0.015
        );
        g.add(jm);

        /* moldura de janela */
        const moldura = new T.Mesh(
          new T.BoxGeometry(jW + 0.08, jH + 0.08, 0.04),
          mat(_shadeHex(corBase, -0.1))
        );
        moldura.position.set(jm.position.x, jm.position.y, 0.008);
        g.add(moldura);
      }
    }

    /* janelas na fachada lateral (x=0) */
    const nColsL = Math.max(1, Math.round(d / 1.1));
    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nColsL; col++) {
        const jm2 = new T.Mesh(new T.PlaneGeometry(jW, jH), MAT_VIDRO);
        jm2.rotation.y = Math.PI / 2;
        jm2.position.set(
          0.015,
          0.28 + row * 0.75 + jH / 2,
          (col + 0.5) * (d / nColsL)
        );
        g.add(jm2);
      }
    }

    /* porta na fachada frontal (centrada, piso térreo) */
    const portaW = Math.min(0.55, w * 0.22);
    const portaH = 0.65;
    const portaMat = mat(_shadeHex(corBase, -0.3));
    const porta = new T.Mesh(new T.PlaneGeometry(portaW, portaH), portaMat);
    porta.position.set(w / 2, portaH / 2 + 0.02, 0.016);
    g.add(porta);

    /* degrau da entrada */
    const deg = new T.Mesh(new T.BoxGeometry(portaW + 0.3, 0.06, 0.3), mat(socCor));
    deg.position.set(w / 2, 0.03, -0.1);
    g.add(deg);
  }

  /* toldo / varanda */
  if (o.toldo) {
    const tdm = new T.Mesh(new T.BoxGeometry(w * 0.65, 0.06, 0.55), mat(o.toldo));
    tdm.position.set(w / 2, hPx * 0.55, 0.28);
    g.add(tdm);
    /* suportes do toldo */
    for (const sx of [-w * 0.25, w * 0.25]) {
      const sup = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.3, 4), mat(o.toldo));
      sup.position.set(w / 2 + sx, hPx * 0.55 - 0.18, 0.5);
      g.add(sup);
    }
  }

  g.position.set(o.x, 0, o.y);
  return g;
}

/* helper: clarear/escurecer cor hex */
function _shadeHex(hex, amt) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * amt)));
  const gv = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * amt)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * amt)));
  return '#' + [r, gv, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function _makeMovel(o) {
  const g = new T.Group();
  const w = o.w || 1, d = o.d || 1;
  const hPx = 0.5;
  const corBase = o.mb?.cor || o.mv?.cor || '#a08060';
  const mesh = box(w * 0.8, hPx, d * 0.8, mat(corBase));
  mesh.position.set(w / 2, hPx / 2, d / 2);
  mesh.castShadow = !_leve;
  mesh.receiveShadow = true;
  g.add(mesh);
  g.position.set(o.x, 0, o.y);
  g.userData.obj3d = o;
  return g;
}

function _makeDecor(o) {
  const g = new T.Group();
  if (o.tipo === 'palmeira' || o.tipo === 'arvore' || o.tipo === 'baobab') {
    const tg = new T.CylinderGeometry(0.1, 0.14, 1.2, _leve ? 5 : 8);
    const tm = new T.Mesh(tg, mat(o.tipo === 'palmeira' ? '#8b6914' : '#6b4f28'));
    tm.position.y = 0.6;
    tm.castShadow = !_leve;
    g.add(tm);

    const cg = new T.SphereGeometry(o.tipo === 'baobab' ? 0.9 : 0.6, _leve ? 5 : 8, _leve ? 4 : 6);
    const cm = new T.Mesh(cg, mat(o.tipo === 'palmeira' ? '#3d8c40' : '#2d7030'));
    cm.position.y = o.tipo === 'palmeira' ? 1.5 : 1.3;
    cm.castShadow = !_leve;
    g.add(cm);
  }
  g.position.set((o.x || 0) + 0.5, 0, (o.y || 0) + 0.5);
  return g;
}

function _makeEscada(o) {
  const g = new T.Group();
  for (let i = 0; i < 3; i++) {
    const sg = new T.BoxGeometry(0.8, 0.12, 0.3);
    const sm = new T.Mesh(sg, mat('#b0a090'));
    sm.position.set(0.5, 0.06 + i * 0.12, 0.15 + i * 0.3);
    g.add(sm);
  }
  g.position.set(o.x, 0, o.y);
  return g;
}

function _makeCandeeiro(o) {
  const g = new T.Group();
  const pg = new T.CylinderGeometry(0.04, 0.04, 2.0, 5);
  const pm = new T.Mesh(pg, mat('#404040'));
  pm.position.set(0.5, 1.0, 0.5);
  g.add(pm);
  if (!_leve) {
    const pl = new T.PointLight(0xffe0a0, 1.2, 8);
    pl.position.set(0.5, 2.1, 0.5);
    g.add(pl);
  }
  g.position.set(o.x, 0, o.y);
  return g;
}

function _makeVeiculo(o) {
  const g = new T.Group();
  const w = o.w || 2, d = o.d || 4;
  const corpo = box(w * 0.85, 0.5, d * 0.85, mat(o.cor || '#3d7cc9'));
  corpo.position.set(w / 2, 0.4, d / 2);
  corpo.castShadow = !_leve;
  g.add(corpo);
  const tecto = box(w * 0.65, 0.35, d * 0.5, mat(o.cor || '#3d7cc9'));
  tecto.position.set(w / 2, 0.83, d / 2);
  g.add(tecto);
  g.position.set(o.x, 0, o.y);
  return g;
}

/* ── pessoas ─────────────────────────────────────────────────── */
const PELES = ['#FFDBB4', '#C68642', '#8D5524', '#4A2912', '#F1C27D', '#E8A87C', '#7B4F3A', '#A0522D'];

function _pessoaCor(camada, ap) {
  if (camada === 'pele') return PELES[ap.pele ?? 3] || PELES[3];
  if (camada === 'cima') return ap.camisa || '#e0313f';
  if (camada === 'baixo') return ap.calca || '#2a3b55';
  if (camada === 'cabelo') return ap.corCabelo ? '#' + String(ap.corCabelo).replace('#', '') : '#1a0a00';
  return null;
}

function _buildPessoa(id, ap) {
  // pessoaRig usa Z como eixo "cima" (Z=0 pés, Z≈1.3 cabeça).
  // O mundo 3D usa Y como cima. Envolve o rig num pivot e roda -90° em X
  // para que Z-cima → Y-cima, ficando o personagem de pé no plano do chão.
  // O pivot é o que vai para a cena e recebe posição/rotação de direcção.
  try {
    const inner = pessoaRig(T, {
      roupa: Math.min(6, ap.roupa || 0),
      cabelo: ap.cabelo ?? 1,
      acc: ap.acess || [],
    });
    inner.traverse(m => {
      if (!m.isMesh) return;
      const c = _pessoaCor(m.material.userData.camada, ap);
      if (c) m.material = m.material.clone(), m.material.color.set(c);
      m.castShadow = !_leve;
    });
    inner.rotation.x = -Math.PI / 2;  // Z-up → Y-up: personagem fica de pé
    const pivot = new T.Group();
    pivot.add(inner);
    // expor userData do inner no pivot para animações e cores
    pivot.userData = inner.userData;
    scene.add(pivot);
    _pessoaMesh.set(id, { rig: pivot, ap: JSON.stringify(ap) });
    return pivot;
  } catch (e) {
    console.warn('mundo3d: pessoaRig falhou', e);
    const g = new T.Group();
    const corpo = box(0.4, 1.0, 0.25, mat(ap.camisa || '#e0313f'));
    corpo.position.y = 0.5;
    const cab = new T.Mesh(new T.SphereGeometry(0.22, _leve ? 5 : 8), mat(PELES[ap.pele ?? 3] || PELES[3]));
    cab.position.y = 1.2;
    cab.castShadow = !_leve;
    g.add(corpo, cab);
    scene.add(g);
    _pessoaMesh.set(id, { rig: g, ap: JSON.stringify(ap) });
    return g;
  }
}

function _atualizarPessoas(lista, noite) {
  const vivos = new Set();

  for (const p of lista) {
    const id = p.id ?? 'eu';
    vivos.add(id);

    const apStr = JSON.stringify(p.ap || {});
    let entry = _pessoaMesh.get(id);

    if (!entry || entry.ap !== apStr) {
      if (entry) scene.remove(entry.rig);
      entry = null;
    }

    const rig = entry ? entry.rig : _buildPessoa(id, p.ap || {});
    if (!rig) continue;

    if (!entry) rig.scale.setScalar(1.6); // VEM: personagens estavam pequenos vs edifícios
    // posiciona no centro do tile (p.x/p.y já são tx+0.5, ty+0.5)
    rig.position.set(p.x, 0, p.y);

    if (p.d8 != null) {
      rig.rotation.y = -(p.d8 * Math.PI / 4) + Math.PI;
    } else {
      rig.rotation.y = p.dir < 0 ? Math.PI : 0;
    }

    if (typeof rig.userData.animar === 'function') {
      rig.userData.animar(p.t || 0, p.andando || false, p.pose?.tipo || null);
    }

    rig.visible = true;
  }

  for (const [id, entry] of _pessoaMesh) {
    if (!vivos.has(id)) entry.rig.visible = false;
  }
}

/* ── posicionar câmara ───────────────────────────────────────── */
function _posicionarCamera(cam, cena) {
  const alvoX = cam.x + (cena?.W || 10) * 0.0;
  const alvoZ = cam.y + (cena?.H || 10) * 0.0;
  const alvo = new T.Vector3(alvoX, 0, alvoZ);

  const dist = CAM_DIST / Math.max(0.45, cam.z);
  const ex = alvoX + Math.sin(_angulo) * dist;
  const ey = dist * Math.tan(CAM_PITCH) + 2;
  const ez = alvoZ + Math.cos(_angulo) * dist;

  camera.position.set(ex, ey, ez);
  camera.lookAt(alvoX, 0.5, alvoZ);

  _sunLight.target.position.set(alvoX, 0, alvoZ);
  _sunLight.target.updateMatrixWorld();
  _sunLight.position.set(alvoX + 12, 20, alvoZ - 10);
}

/* ── converter tile → pixel de ecrã ─────────────────────────── */
function ecra(x, y, z = 0) {
  const v = new T.Vector3(x, z * 0.5, y);
  v.project(camera);
  return [
    (v.x * 0.5 + 0.5) * innerWidth,
    (-v.y * 0.5 + 0.5) * innerHeight,
  ];
}

/* ── raycasting ──────────────────────────────────────────────── */
function escolher(sx, sy, npcs) {
  if (!renderer || !scene || !camera) return {};

  const ndc = new T.Vector2(
    (sx / innerWidth) * 2 - 1,
    -(sy / innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);

  for (const p of npcs) {
    const entry = _pessoaMesh.get(p.id ?? 'eu');
    if (!entry || !entry.rig.visible) continue;
    const hits = raycaster.intersectObject(entry.rig, true);
    if (hits.length) return { pessoa: p };
  }

  const objs = [];
  _predioMesh.forEach(g => objs.push(g));
  const hits = raycaster.intersectObjects(objs, true);
  if (hits.length) {
    let g = hits[0].object;
    while (g.parent && !g.userData.obj3d) g = g.parent;
    if (g.userData.obj3d) {
      const o = g.userData.obj3d;
      if (o.kind === 'escada' || o.spec || o.kind === 'movel' || o.kind === 'veiculo') return { obj: o };
      if ((o.kind === 'predio' || o.kind === 'casinha') && hits[0].point.z < o.y + 0.5) return { obj: PORTA };
    }
  }

  const chaoMeshes = scene.children.filter(c => c.userData.chao);
  const hitsChao = raycaster.intersectObjects(chaoMeshes);
  if (hitsChao.length) {
    const pt = hitsChao[0].point;
    return { tile: [Math.floor(pt.x), Math.floor(pt.z)] };
  }

  return {};
}

/* ── arrastar câmara (pan) ────────────────────────────────────── */
function arrastar(dx, dy, zoom) {
  const escala = CAM_DIST / (zoom * 400);
  window._cam3dPanX = (window._cam3dPanX || 0) - dx * escala;
  window._cam3dPanY = (window._cam3dPanY || 0) - dy * escala;
  if (typeof _onPan === 'function') _onPan(dx * escala, dy * escala);
}
let _onPan = null;

/* ── rodar câmara ─────────────────────────────────────────────── */
function rodar(angulo, snap = true) {
  if (snap) {
    _angulo = Math.round((_angulo + angulo) / (Math.PI / 2)) * (Math.PI / 2);
  } else {
    _angulo += angulo;
  }
}

/* ── esconder (voltar ao 2D) ─────────────────────────────────── */
function esconder() {
  if (!renderer) return;
  renderer.domElement.style.display = 'none';
}

/* ── modos ───────────────────────────────────────────────────── */
function leve() {
  _leve = true;
  if (!renderer) return;
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
  _buildLights();
}
function normal() {
  _leve = false;
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  _buildLights();
}

/* ── quadro principal ────────────────────────────────────────── */
function quadro({ cena, eu, lista, cam, t, noite, tempo, deco }) {
  if (!renderer) init();
  if (!renderer) return;

  renderer.domElement.style.display = '';

  if (cena.id !== _cenaId || cena.tipo + (cena.andar || 0) !== (_cenaTag || '')) {
    _cenaId = cena.id;
    _cenaTag = cena.tipo + (cena.andar || 0);
    _buildChao(cena);
    _buildObjetos(cena);
  }

  if (_ambLight && _sunLight) {
    const n = noite || 0;
    _ambLight.intensity = 0.55 - n * 0.35;
    _sunLight.intensity = 1.1 - n * 0.8;
    scene.background = null; // transparente — mapa 2D mostra por baixo
  }

  _posicionarCamera(cam, cena);
  _atualizarPessoas(lista, noite);
  renderer.render(scene, camera);

  _fpsN++;
  const now = performance.now();
  if (now - _fpsT >= 1000) {
    info.fps = Math.round(_fpsN * 1000 / (now - _fpsT));
    _fpsN = 0; _fpsT = now;
    const ren = renderer.info;
    info.calls = ren.render.calls;
    info.tris = ren.render.triangles;
    info.geo = ren.memory.geometries;
    info.tex = ren.memory.textures;
  }
}
let _cenaTag = '';

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
  get info() { return info; },
  PORTA,
};

console.log('[mundo3d] carregado');