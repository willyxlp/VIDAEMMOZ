/* ============================================================
   Vida na Banda — viagens em 3D a sério (FILA item 0, 26 out)
   Cada viagem é uma cena three.js vista de dentro do veículo, com os MESMOS modelos do jogo (js/modelos3d.js):
   prédios e casas, as 5 árvores, carros no trânsito, e os passageiros são as personagens 3D sentadas.
   O mundo anda para trás (o veículo fica parado): tudo o que se repete é instanciado e reciclado ao longo de um anel.
   Dia/noite com a hora de Luanda, chuva quando chove no bairro. Se o WebGL falhar, o viagem.js volta ao desenho 2D.
   Interface: window.V3D.criar(o) → { canvas, quadro(t), parar(), foto() }   o = { meio, destino, ad, ad2, passageiros, noite, tempo, eu, carro, mota, musica }
   ============================================================ */
import * as T from './vendor/three/three.min.js';
import { MODELOS, predio, pessoaRig, QUALIDADE } from './modelos3d.js';

QUALIDADE.folhas = Math.min(QUALIDADE.folhas, 0.1); QUALIDADE.seg = Math.min(QUALIDADE.seg, 0.35);   // leve para telemóveis (igual ao mundo 3D)
const TR = s => (typeof tr === 'function' ? tr(s) : s);

/* ---------- renderizador (um só, reaproveitado em todas as viagens) ---------- */
let R = null;
function renderizador() {
  if (R) { R.setPixelRatio(window.__poupanca ? 1 : Math.min(devicePixelRatio || 1, 1.5)); return R; }   // LL40: modo poupança
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  R = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(window.__poupanca ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  return R;
}

/* ---------- utilitários ---------- */
const mat = (cor, o = {}) => new T.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0, ...o });
const brilho = (cor, int = 1) => new T.MeshBasicMaterial({ color: cor, toneMapped: false, transparent: true, opacity: int, depthWrite: false, blending: T.AdditiveBlending });
function caixa(pai, w, d, h, m, x, y, z, rx = 0, ry = 0, rz = 0) { const me = new T.Mesh(new T.BoxGeometry(w, d, h), m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); pai.add(me); return me; }
function cil(pai, r1, r2, h, m, x, y, z, eixo = 'z', seg = 16) {
  const g = new T.CylinderGeometry(r1, r2, h, seg); if (eixo === 'z') g.rotateX(Math.PI / 2); if (eixo === 'x') g.rotateZ(Math.PI / 2);
  const me = new T.Mesh(g, m); me.position.set(x, y, z); pai.add(me); return me;
}
function esfera(pai, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const me = new T.Mesh(new T.SphereGeometry(r, 16, 12), m); me.scale.set(sx, sy, sz); me.position.set(x, y, z); pai.add(me); return me; }
// placa virada para −y (para a câmara, que olha para +y)
function placa(pai, w, h, m, x, y, z, ry = 0) { const g = new T.PlaneGeometry(w, h); g.rotateX(Math.PI / 2); const me = new T.Mesh(g, m); me.position.set(x, y, z); me.rotation.z = ry; pai.add(me); return me; }
function texCanvas(w, h, desenhar, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); desenhar(g, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...rep); } t.anisotropy = 4; return t;
}
function ruido(g, w, h, n, a, claro = false) { let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) { const v = claro ? 255 : (r() < 0.5 ? 0 : 255); g.fillStyle = `rgba(${v},${v},${v},${a * r()})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); } }
function semente(n) { let s = (n * 9301 + 49297) % 233280 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function deitarFora(obj, manter) {
  obj.traverse(m => { if (!(m.isMesh || m.isPoints || m.isLineSegments || m.isSprite)) return; if (manter.has(m.geometry)) return; m.geometry?.dispose();
    [].concat(m.material).forEach(x => { if (!x || manter.has(x)) return; if (x.map && !manter.has(x.map)) x.map.dispose(); x.dispose(); }); });
}

// materiais com o mesmo aspeto (cor, rugosidade, textura…) contam como um só ao juntar malhas
function assinatura(mt) {
  if (mt.userData?.janela || mt.userData?.lampada || mt.userData?.camada === undefined && mt.onBeforeCompile?.toString().length > 30) return mt.uuid;
  return [mt.type, mt.color?.getHexString(), mt.roughness, mt.metalness, mt.map?.uuid || '', mt.transparent, mt.opacity, mt.side, mt.emissive?.getHexString() || '', mt.emissiveIntensity ?? '', mt.clearcoat ?? '', mt.vertexColors, mt.toneMapped, mt.blending].join('|');
}
// junta as peças de um modelo parado numa malha por material (as folhas instanciadas são cozidas com a cor de cada uma)
function fundir(obj) {
  obj.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(obj.matrixWorld).invert(), grupos = new Map(), out = new T.Group(), soltos = [];
  obj.traverse(m => {
    if (m.isInstancedMesh) { soltos.push(m); return; }
    if (!m.isMesh || !m.visible) return;
    let p = m.parent, vis = true; while (p) { if (!p.visible) vis = false; p = p.parent; } if (!vis) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const chave = assinatura(m.material);
    if (!grupos.has(chave)) grupos.set(chave, { mat: m.material, gs: [] });
    grupos.get(chave).gs.push(g);
  });
  for (const { mat: mt, gs } of grupos.values()) {
    const g = gs.length === 1 ? gs[0] : T.mergeGeometries(gs, false); gs.forEach(x => x !== g && x.dispose()); if (!g) continue;
    out.add(new T.Mesh(g, mt));
  }
  for (const s of soltos) {
    const base = s.geometry.index ? s.geometry.toNonIndexed() : s.geometry, gs = [], mi = new T.Matrix4(), c = new T.Color();
    const rel = new T.Matrix4().multiplyMatrices(inv, s.matrixWorld);
    for (let i = 0; i < s.count; i++) {
      s.getMatrixAt(i, mi); const g = base.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(rel, mi));
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      if (s.instanceColor) s.getColorAt(i, c); else c.set(0xffffff);
      const n = g.attributes.position.count, cor = new Float32Array(n * 3); for (let k = 0; k < n; k++) { cor[k * 3] = c.r; cor[k * 3 + 1] = c.g; cor[k * 3 + 2] = c.b; }
      g.setAttribute('color', new T.BufferAttribute(cor, 3)); gs.push(g);
    }
    if (!gs.length) continue;
    const mt = s.material.clone(); mt.vertexColors = true;
    out.add(new T.Mesh(T.mergeGeometries(gs, false), mt));
  }
  return out;
}

/* ---------- protótipos guardados entre viagens (feitos uma vez) ---------- */
const PROTOS = new Map(), GUARDADOS = new Set();
function guardar(o) { o.traverse(m => { if (m.geometry) GUARDADOS.add(m.geometry); [].concat(m.material || []).forEach(x => { GUARDADOS.add(x); if (x.map) GUARDADOS.add(x.map); }); }); return o; }
function proto(id, criar, escala = 1, centrar = null) {
  if (!PROTOS.has(id)) {
    const fora = new T.Group(), g = new T.Group(), m = criar(); if (centrar) m.position.set(-centrar[0], -centrar[1], 0); g.add(m); g.scale.setScalar(escala); fora.add(g);
    const f = guardar(fundir(fora)); PROTOS.set(id, f);
  }
  return PROTOS.get(id);
}
// cópia leve (mesmas malhas e materiais)
function copia(p) { const c = new T.Group(); for (const m of p.children) c.add(new T.Mesh(m.geometry, m.material)); return c; }
// um conjunto de instâncias de um protótipo (uma chamada de desenho por material)
function instancias(p, n) {
  const g = new T.Group(); g.userData.ims = [];
  for (const m of p.children) { const im = new T.InstancedMesh(m.geometry, m.material, n); im.frustumCulled = false; im.instanceMatrix.setUsage(T.DynamicDrawUsage); g.add(im); g.userData.ims.push(im); }
  return g;
}
const _o = new T.Object3D();
function porInst(g, i, x, y, z, rz = 0, s = 1) { _o.position.set(x, y, z); _o.rotation.set(0, 0, rz); _o.scale.setScalar(s); _o.updateMatrix(); for (const im of g.userData.ims) im.setMatrixAt(i, _o.matrix); }
function feitoInst(g) { for (const im of g.userData.ims) im.instanceMatrix.needsUpdate = true; }

// escala do mundo: 1 unidade ≈ 1,3 m (uma personagem tem 1,33). Os modelos do jogo 2.5D são "de brincar" — aqui crescem.
const ESC_CARRO = 1.6, ESC_PREDIO = 2.4, ESC_ARVORE = 3.0;
const CARROS_RUA = ['citadino', 'sedan', 'carro', 'pickup', 'jipe', 'carrinha', 'sedan', 'citadino'];
const ARVORES = ['palmeira', 'mangueira', 'acacia', 'arvore_verde', 'imbondeiro'];
const CORES_PREDIO = ['#e9dcc4', '#f3d36b', '#8fc4e8', '#e9a3b4', '#f5f1e8', '#cdb79a', '#d98f5c', '#b9d98f', '#f2c6a0'];
function specsPredios(tipo) {
  const r = semente(tipo === 'aldeia' ? 77 : 31), L = [];
  const n = tipo === 'aldeia' ? 5 : 11;
  for (let i = 0; i < n; i++) {
    const cor = CORES_PREDIO[Math.floor(r() * CORES_PREDIO.length)];
    if (tipo === 'aldeia' || i % 3 === 0) L.push({ k: 'casinha', w: 2 + Math.floor(r() * 2), d: 2, h: 34 + r() * 8, cor, t: r() < 0.55 ? 'zinco' : 'telha', p: 'y', ta: r() < 0.3 });
    else { const andares = 1 + Math.floor(r() * r() * 7); L.push({ k: 'edificio', w: 2 + Math.floor(r() * 3), d: 2 + Math.floor(r() * 2), h: 12 + andares * 26 + 6, cor, t: 'plano', p: 'y', to: r() < 0.4 ? ['#cc092f', '#2c6fb0', '#2f8f5b', '#f5b81c'][i % 4] : '', an: r() < 0.4, ta: r() < 0.5 }); }
  }
  return L;
}
const protoPredio = (tipo, i, sp) => proto('predio_' + tipo + i, () => predio(T, sp), ESC_PREDIO, [sp.w / 2, sp.d / 2]);
const protoCarro = id => proto('carro_' + id, () => MODELOS[id].criar(T), ESC_CARRO, [0.5, 1]);
const protoArvore = id => proto('arv_' + id, () => MODELOS[id].criar(T), ESC_ARVORE);

/* ---------- personagens (as mesmas do jogo, com as cores de cada um) ---------- */
function corDe(cam, ap) {
  const est = ap.cabelo ?? 1, camisa = ap.camisa || '#e0313f';
  if (cam === 'pele') return PELES[ap.pele ?? 3] || PELES[3];
  if (cam === 'cima') return camisa;
  if (cam === 'baixo') return ap.calca || '#2a3b55';
  if (cam === 'cabelo') return est === 5 ? shade(camisa, 0.15) : (CORES_CABELO[ap.corCabelo ?? 0] || CORES_CABELO[0]);
  return null;
}
function rig(ap, o = {}) {
  const g = pessoaRig(T, { roupa: Math.min(6, ap.roupa || 0), cabelo: ap.cabelo ?? 1, acc: o.acc || ap.acess || [] });
  g.traverse(m => { if (!m.isMesh) return; const c = corDe(m.material.userData.camada, ap); if (c) m.material.color.set(c); if ((ap.cabelo ?? 1) === 0 && m.material.userData.camada === 'cabelo') m.visible = false; });
  return g;
}
// pessoa parada numa pose, fundida (poucas chamadas de desenho); origem nos pés, virada para +y
function pessoa(ap, pose = 'sentado', f = 0, o = {}) { const g = rig(ap, o); g.userData.pose(pose, f); const fz = fundir(g); g.traverse(m => m.isMesh && m.geometry.dispose()); return fz; }
function capacete(cor, ad) {   // capacete de mota (com um autocolante de publicidade atrás)
  const g = new T.Group(), m = mat(cor, { roughness: 0.25, metalness: 0.2 });
  const c = new T.Mesh(new T.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), m); c.rotation.x = Math.PI / 2; c.scale.set(1, 1, 1.12); g.add(c);
  const vis = new T.Mesh(new T.SphereGeometry(0.137, 20, 10, -0.9, 1.8, 0.75, 0.55), mat(0x111418, { roughness: 0.1, metalness: 0.5 })); vis.rotation.x = Math.PI / 2; vis.rotation.z = Math.PI / 2; g.add(vis);
  if (ad) { const p = new T.Mesh(new T.PlaneGeometry(0.17, 0.085), new T.MeshStandardMaterial({ map: ad, roughness: 0.4 })); p.rotation.x = Math.PI / 2; p.position.set(0, -0.137, 0.035); p.rotation.y = 0; g.add(p); }
  return g;
}

/* ---------- anúncios (o anúncio real dos outdoors) ---------- */
function texAnuncio(ad, w = 640, h = 320) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const pintar = img => { g.clearRect(0, 0, w, h); try { painelAnuncio(g, 5, 5, w - 10, h - 10, { ...ad, img }, '#141012'); } catch { g.fillStyle = '#FFCB00'; g.fillRect(0, 0, w, h); } tex.needsUpdate = true; };
  pintar(null);
  if (ad?.url) {   // a imagem com CORS (sem isso o WebGL não a pode usar); se falhar fica o texto
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    im.onload = () => pintar(im); im.src = ad.url;
  }
  return tex;
}
// 0l: um anúncio com o nome do seu lugar (para medir quanto tempo cada lugar fica à vista)
function texAd(ad, lugar, w, h) {   // 0u: se uma marca comprou este lugar na loja, é o anúncio dela que aparece
  const comprado = typeof window.anuncioParaViagem === 'function' ? window.anuncioParaViagem(lugar) : null; if (comprado) ad = comprado;
  const t = texAnuncio(ad, w, h); t.userData.ad = ad || null; t.userData.lugar = lugar; return t; }
function outdoor3d(tex, L = 6.5) {
  const g = new T.Group(), ferro = mat(0x2b2e33, { metalness: 0.6, roughness: 0.45 });
  for (const s of [-1, 1]) cil(g, 0.09, 0.11, 4.2, ferro, s * L * 0.3, 0, 2.1);
  caixa(g, L + 0.25, 0.18, L / 2 + 0.25, ferro, 0, 0.05, 4.2 + L / 4);
  const p = placa(g, L, L / 2, new T.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 }), 0, -0.05, 4.2 + L / 4);
  p.userData.anuncio = true;
  for (const s of [-1, 1]) { const l = caixa(g, 0.5, 0.25, 0.08, ferro, s * L * 0.25, -0.6, 4.25 + L / 2); l.rotation.x = 0.4; }
  return g;
}

/* ---------- céu, sol, nuvens, estrelas, chuva ---------- */
function ceu(n, chuva) {
  const g = new T.Group();
  const cima = new T.Color(chuva ? 0x5c6b78 : 0x2f86d6).lerp(new T.Color(0x070d22), n);
  const baixo = new T.Color(chuva ? 0xa4adb4 : 0xcfe9ff).lerp(new T.Color(0x232a48), n);
  if (n > 0.5 && !chuva) baixo.lerp(new T.Color(0x3a2c4a), 0.3);
  const geo = new T.SphereGeometry(380, 32, 16), cor = [], P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) { const k = Math.max(0, P.getY(i) / 380); const c = baixo.clone().lerp(cima, Math.pow(k, 0.55)); cor.push(c.r, c.g, c.b); }
  geo.rotateX(Math.PI / 2); geo.setAttribute('color', new T.Float32BufferAttribute(cor, 3));
  const dome = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; g.add(dome);
  if (!chuva) {
    if (n < 0.6) { const sol = new T.Mesh(new T.CircleGeometry(9, 32), brilho(0xfff2c0, 1)); sol.material.fog = false; sol.up.set(0, 0, 1); sol.position.set(-120, 300, 110); sol.lookAt(0, 0, 0); g.add(sol);
      const halo = new T.Mesh(new T.CircleGeometry(30, 32), brilho(0xffe7a0, 0.18)); halo.material.fog = false; halo.up.set(0, 0, 1); halo.position.copy(sol.position).multiplyScalar(0.99); halo.lookAt(0, 0, 0); g.add(halo); }
    else {
      const lua = new T.Mesh(new T.CircleGeometry(6, 32), brilho(0xf2f0e6, 0.95)); lua.material.fog = false; lua.up.set(0, 0, 1); lua.position.set(90, 320, 140); lua.lookAt(0, 0, 0); g.add(lua);
      const r = semente(5), pts = []; for (let i = 0; i < 700; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.3; pts.push(Math.cos(a) * Math.cos(e) * 360, Math.sin(a) * Math.cos(e) * 360, Math.sin(e) * 360); }
      const gs = new T.BufferGeometry(); gs.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      g.add(new T.Points(gs, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
    }
    // nuvens (cartões com uma nuvem desenhada)
    const tnuv = texCanvas(256, 128, (x, w, h) => { const r = semente(2); for (let i = 0; i < 26; i++) { const cx = w * (0.18 + r() * 0.64), cy = h * (0.45 + r() * 0.25), rr = 18 + r() * 30; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); } });
    const mn = new T.MeshBasicMaterial({ map: tnuv, transparent: true, depthWrite: false, fog: false, opacity: n > 0.5 ? 0.12 : 0.85, color: n > 0.5 ? 0x8890a8 : 0xffffff });
    const r = semente(8);
    for (let i = 0; i < 9; i++) { const a = -1.2 + r() * 2.4, d = 250 + r() * 80, w = 60 + r() * 70; const m = new T.Mesh(new T.PlaneGeometry(w, w / 2), mn); m.up.set(0, 0, 1); m.position.set(Math.sin(a) * d, Math.cos(a) * d, 40 + r() * 70); m.lookAt(0, 0, m.position.z); g.add(m); }
  }
  return g;
}
function chuvaParticulas(forte) {
  const N = forte ? 1400 : 800, pos = new Float32Array(N * 6), r = semente(13), dados = [];
  for (let i = 0; i < N; i++) dados.push([(r() - 0.5) * 26, r() * 44 - 4, r() * 14, 0.8 + r() * 0.5]);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const ls = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: forte ? 0.75 : 0.6 })); ls.frustumCulled = false;
  ls.userData.mexer = (t, vel) => {
    for (let i = 0; i < N; i++) { const [x, y0, z0, k] = dados[i]; const z = ((z0 - t * 14 * k) % 14 + 14) % 14, y = ((y0 - t * vel * 0.6) % 44 + 44) % 44 - 4;
      pos.set([x, y, z, x - 0.05, y + vel * 0.02, z + 0.7], i * 6); }
    geo.attributes.position.needsUpdate = true;
  };
  return ls;
}
// gotas no vidro (canvas com gotas; o limpa-vidros apaga por onde passa)
function texGotas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; const gotas = [];
  const desenhar = (limpo) => {
    g.clearRect(0, 0, 512, 256);
    for (const d of gotas) { if (limpo && limpo(d.x / 512)) continue; const gr = g.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(200,215,230,.25)'); gr.addColorStop(1, 'rgba(120,140,160,.05)'); g.fillStyle = gr; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill(); }
    tex.needsUpdate = true;
  };
  return { tex, chover: (n, limpo) => { for (let i = 0; i < n; i++) gotas.push({ x: Math.random() * 512, y: Math.random() * 256, r: 1.5 + Math.random() * 3.5 }); if (gotas.length > 420) gotas.splice(0, gotas.length - 420); desenhar(limpo); }, limpar: f => { for (let i = gotas.length - 1; i >= 0; i--) if (f(gotas[i].x / 512)) gotas.splice(i, 1); } };
}

/* ---------- a estrada (chão, alcatrão, passeios com lancis pintados) ---------- */
function texturaAlcatrao() {
  return texCanvas(256, 512, (g, w, h) => {
    g.fillStyle = '#4a4b50'; g.fillRect(0, 0, w, h); ruido(g, w, h, 9000, 0.12);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,20,22,.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 6 + Math.random() * 20, Math.random(), 0, 7); g.fill(); }
    g.fillStyle = '#f2f2f2'; g.fillRect(w / 2 - 3, 0, 6, h * 0.45);                         // traço do meio
    g.fillStyle = '#e9e9e9'; g.fillRect(6, 0, 5, h); g.fillRect(w - 11, 0, 5, h);           // linhas de berma
  }, [1, 1]);
}
function texturaPasseio() {
  return texCanvas(128, 128, (g, w, h) => { g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, w, h); ruido(g, w, h, 1500, 0.12); g.strokeStyle = 'rgba(60,50,40,.25)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 32); g.lineTo(w, k * 32); g.stroke(); g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, h); g.stroke(); } }, [1, 1]);
}
function texturaLancil() { return texCanvas(64, 128, (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f2f2f2'; g.fillRect(0, h / 2, w, h / 2); ruido(g, w, h, 300, 0.12); }, [1, 1]); }
function texturaTerra(cor, erva) {
  return texCanvas(256, 256, (g, w, h) => { g.fillStyle = cor; g.fillRect(0, 0, w, h); ruido(g, w, h, 6000, 0.14);
    if (erva) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + Math.random() * 40},${110 + Math.random() * 50},${40 + Math.random() * 20},.7)`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 3 + Math.random() * 4); } }, [1, 1]);
}
// faixa ao longo de y, com a textura a correr (o veículo anda): devolve a malha; userData.passo = unidades por repetição
function faixa(w, cx, z, tex, passo, o = {}) {
  const L = 420, m = new T.Mesh(new T.PlaneGeometry(w, L), new T.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.92, metalness: o.metal ?? 0, ...(o.cor ? { color: o.cor } : {}) }));
  tex.repeat.set(o.repX || 1, L / passo); m.position.set(cx, L / 2 - 40, z); m.userData.passo = passo; return m;
}

/* ---------- a cena genérica ---------- */
class Cena {
  constructor(o) {
    this.o = o; this.R = renderizador(); this.canvas = this.R.domElement;
    this.cena = new T.Scene(); this.mundo = new T.Group(); this.cena.add(this.mundo);
    this.veic = new T.Group(); this.cena.add(this.veic);
    this.cam = new T.PerspectiveCamera(70, 1, 0.04, 600); this.cam.up.set(0, 0, 1); this.veic.add(this.cam);
    this.n = Math.min(1, (o.noite || 0) / 0.48);
    this.chuva = o.tempo === 'chuva' || o.tempo === 'tempestade' ? o.tempo : null;
    this.correm = [];      // faixas com textura a correr
    this.aneis = [];       // conjuntos reciclados ao longo do anel: { g, itens:[{y, x, z, rz, s}], L, k (fator de velocidade) }
    this.anima = [];       // funções (t, dt) chamadas a cada imagem
    this.janelas = []; this.lampadas = []; this.anuncios = []; this.brilhos = [];
    this.s = 0; this.vel = 10; this.tAnt = 0; this.hfov = 72;
    this.adsVis = []; this._ads = [];   // 0l: lugares de anúncio à vista e quanto tempo
    this.luzes();
  }
  luzes() {
    const n = this.n, ch = !!this.chuva;
    this.hemi = new T.HemisphereLight(new T.Color(0xdfe8ff).lerp(new T.Color(0x3a4a7a), n), new T.Color(0x6a5a44).lerp(new T.Color(0x1a1620), n), (ch ? 0.75 : 0.9) * (1 - n * 0.55));
    this.sol = new T.DirectionalLight(new T.Color(0xfff1dc).lerp(new T.Color(0x9fb2ff), n), (ch ? 0.9 : 2.3) * (1 - n * 0.82));
    this.sol.position.set(-40, 60, 90); this.cena.add(this.hemi, this.sol);
    this.amb = new T.AmbientLight(0xfff4e6, 0.45 * (1 - n * 0.7)); this.cena.add(this.amb);   // luz que entra pelas janelas (os interiores não ficam pretos)
    const corNevoa = new T.Color(ch ? 0x9aa4ad : 0xcfe2f2).lerp(new T.Color(0x151a30), n);
    this.cena.fog = new T.Fog(corNevoa, ch ? 25 : 60, ch ? 140 : 260);
    this.cena.add(ceu(n, ch));
    this.R.toneMappingExposure = 1.0 - n * 0.1;
    // reflexos (metais, vidros, pintura): um ambiente feito do próprio céu e de um chão
    try {
      const amb = new T.Scene(), d = ceu(n, ch); amb.add(d);
      const chao = new T.Mesh(new T.CircleGeometry(300, 24), new T.MeshBasicMaterial({ color: new T.Color(0x8a7a62).lerp(new T.Color(0x14121a), n) })); chao.position.z = -20; amb.add(chao);
      if (!Cena.pmrem) Cena.pmrem = new T.PMREMGenerator(this.R);
      this.env = Cena.pmrem.fromScene(amb, 0.04).texture; this.cena.environment = this.env; this.cena.environmentIntensity = 0.55;
      deitarFora(amb, GUARDADOS);
    } catch (e) { }
  }
  // um anel de coisas que passam (y relativo à câmara); k = fração da velocidade (1 = paradas no chão)
  anel(g, itens, L, y0 = -25, k = 1) { this.mundo.add(g); const a = { g, itens, L, y0, k }; this.aneis.push(a); return a; }
  atualizarAneis() {
    for (const a of this.aneis) {
      if (a.g && a.g.userData.ims) { a.itens.forEach((it, i) => { const y = ((it.y - this.s * a.k) % a.L + a.L) % a.L + a.y0; porInst(a.g, i, it.x, y, it.z || 0, it.rz || 0, it.s || 1); }); feitoInst(a.g); }
      else a.itens.forEach(it => { const y = ((it.y - this.s * a.k) % a.L + a.L) % a.L + a.y0; it.obj.position.set(it.x, y, it.z || 0); });
    }
  }
  depois(f) { this.anima.push(f); }
  // o k-ésimo anúncio desta viagem: ad, ad2 e depois outros diferentes (se houver)
  adN(k) { if (k === 0) return this.o.ad; if (k === 1) return this.o.ad2 || this.o.ad; while (this._ads.length < k - 1) this._ads.push(typeof this.o.novoAd === 'function' ? this.o.novoAd() : (this._ads.length % 2 ? this.o.ad : this.o.ad2 || this.o.ad)); return this._ads[k - 2]; }
  // depois de montar a cena: encontrar todas as superfícies com anúncio
  juntarAds() {
    const vistos = new Set();
    this.cena.traverse(m => { const tx = m.isMesh && [].concat(m.material || []).map(x => x.map).find(x => x && x.userData && x.userData.lugar); if (tx && !vistos.has(m)) { vistos.add(m); if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); this.adsVis.push({ mesh: m, ad: tx.userData.ad, lugar: tx.userData.lugar, seg: 0 }); } });
  }
  // conta o tempo em que cada anúncio está no ecrã (dentro da imagem, a menos de 45 m, e não escondido)
  medirAds(dt) {
    if (!dt || !this.adsVis.length) return;
    const v = Cena._v || (Cena._v = new T.Vector3()), cp = Cena._cp || (Cena._cp = new T.Vector3());
    cp.setFromMatrixPosition(this.cam.matrixWorld);
    for (const e of this.adsVis) {
      let o = e.mesh, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
      if (!vis) continue;
      const bs = e.mesh.geometry.boundingSphere;
      v.copy(bs.center).applyMatrix4(e.mesh.matrixWorld);
      if (v.distanceTo(cp) > 45) continue;
      // conta se pelo menos parte do anúncio está no ecrã (o centro ou um dos lados — no telemóvel ao alto os encostos ficam nas bordas)
      const r = bs.radius * 0.7;
      for (const [dx, dy, dz] of Cena._amostras || (Cena._amostras = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]])) {
        v.set(bs.center.x + dx * r, bs.center.y + dy * r, bs.center.z + dz * r).applyMatrix4(e.mesh.matrixWorld).project(this.cam);
        if (v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1) { e.seg += dt; break; }
      }
    }
  }
  // ---- peças do mundo à beira da estrada ----
  estrada(o = {}) {
    const terra = o.terra || '#a98a5e';
    const chao = new T.Mesh(new T.PlaneGeometry(700, 700), new T.MeshStandardMaterial({ map: texturaTerra(terra, o.erva), roughness: 1 }));
    chao.material.map.repeat.set(90, 90); chao.position.set(0, 200, -0.03); this.mundo.add(chao);
    this.correm.push({ tex: chao.material.map, passo: 700 / 90 });
    const molhado = !!this.chuva;
    const alc = faixa(5.6, 0, 0, texturaAlcatrao(), 7, { rough: molhado ? 0.35 : 0.9, metal: molhado ? 0.25 : 0 });
    this.mundo.add(alc); this.correm.push({ tex: alc.material.map, passo: 7 });
    for (const s of [-1, 1]) {
      const p = faixa(2.4, s * 4.0, 0.16, texturaPasseio(), 2.4); this.mundo.add(p); this.correm.push({ tex: p.material.map, passo: 2.4 });
      const lan = new T.Mesh(new T.BoxGeometry(0.22, 420, 0.18), new T.MeshStandardMaterial({ map: texturaLancil(), roughness: 0.8 }));
      lan.material.map.repeat.set(1, 420 / 1.6); lan.position.set(s * 2.88, 170, 0.09); this.mundo.add(lan); this.correm.push({ tex: lan.material.map, passo: 1.6 });
    }
  }
  beiraCidade(tipo = 'cidade') {
    const specs = specsPredios(tipo), r = semente(tipo === 'aldeia' ? 3 : 1), L = 168;
    // prédios dos dois lados (cada protótipo num conjunto de instâncias)
    const porProto = specs.map(() => []);
    for (const lado of [-1, 1]) {
      let y = r() * 4;
      while (y < L - 6) {
        const i = Math.floor(r() * specs.length), sp = specs[i], w = sp.w * ESC_PREDIO, d = sp.d * ESC_PREDIO;
        const recuo = (tipo === 'aldeia' ? 7 + r() * 8 : 5.6) + d / 2 + r() * 0.6;
        porProto[i].push({ x: lado * recuo, y: y + w / 2, rz: lado > 0 ? Math.PI / 2 : -Math.PI / 2 });
        y += w + (tipo === 'aldeia' ? 3 + r() * 9 : 0.6 + r() * 2.4);
      }
    }
    specs.forEach((sp, i) => { if (!porProto[i].length) return; const p = protoPredio(tipo, i, sp); this.anel(instancias(p, porProto[i].length), porProto[i], L);
      p.traverse(m => { if (m.material?.userData?.janela) this.janelas.push(m.material); }); });
    // árvores no passeio e entre as casas
    const porArv = ARVORES.map(() => []);
    for (const lado of [-1, 1]) for (let y = 2 + r() * 5; y < L; y += 6 + r() * 9) { const k = r() < 0.4 ? 0 : 1 + Math.floor(r() * (tipo === 'aldeia' ? 4 : 3)); porArv[k].push({ x: lado * (4.3 + r() * 0.4), y, rz: r() * 6, s: 0.85 + r() * 0.35 }); }
    ARVORES.forEach((id, k) => { if (porArv[k].length) this.anel(instancias(protoArvore(id), porArv[k].length), porArv[k], L); });
    this.candeeiros(L);
  }
  candeeiros(L) {
    if (!PROTOS.has('candeeiro')) {
      const g = new T.Group(), ferro = mat(0x2b2e33, { metalness: 0.6, roughness: 0.4 });
      cil(g, 0.06, 0.09, 4.6, ferro, 0, 0, 2.3); caixa(g, 1.3, 0.08, 0.08, ferro, -0.6, 0, 4.55);
      const luz = new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc864, emissiveIntensity: 0 }); luz.userData.lampada = true;
      caixa(g, 0.42, 0.24, 0.1, ferro, -1.2, 0, 4.58); caixa(g, 0.36, 0.2, 0.03, luz, -1.2, 0, 4.52);
      PROTOS.set('candeeiro', guardar(fundir(g)));
    }
    const p = PROTOS.get('candeeiro'), itens = [], glows = [];
    for (let y = 0; y < L; y += 14) for (const lado of [-1, 1]) { itens.push({ x: lado * 3.3, y: y + (lado > 0 ? 7 : 0), rz: lado > 0 ? 0 : Math.PI }); glows.push({ x: lado * 3.3 - lado * 1.2, y: y + (lado > 0 ? 7 : 0), z: 4.4 }); }
    this.anel(instancias(p, itens.length), itens, L);
    p.traverse(m => { if (m.material?.userData?.lampada) this.lampadas.push(m.material); });
    if (this.n > 0.3) {   // à noite: halos dos candeeiros e poças de luz no chão
      const tg = texCanvas(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
      const halo = new T.Group(), ph = new T.Mesh(new T.PlaneGeometry(1.6, 1.6).rotateX(Math.PI / 2), brilho(0xffd59a, 0.8 * this.n)); ph.material.map = tg; halo.add(ph);
      this.anel(instancias(halo, glows.length), glows, L);
      const poca = new T.Group(), pc = new T.Mesh(new T.PlaneGeometry(5, 5), brilho(0xffc070, 0.35 * this.n)); pc.material.map = tg; poca.add(pc);
      this.anel(instancias(poca, glows.length), glows.map(g => ({ ...g, z: 0.2 })), L);
    }
  }
  outdoors(L = 168, lados = [1, -1, 1, -1]) {   // 0l (dono, 27 out): 4 outdoors por volta (eram 2), cada um com o seu anúncio
    const itens = [];
    lados.forEach((lado, k) => { const tex = texAd(this.adN(k), `${this.o.meio}:outdoor${k + 1}`); const g = outdoor3d(tex); g.rotation.z = lado > 0 ? -0.3 : 0.3; this.mundo.add(g); itens.push({ obj: g, x: lado * 4.9, y: 40 + k * L / lados.length });
      g.traverse(m => { if (m.userData.anuncio) this.anuncios.push(m.material); }); });
    this.aneis.push({ itens, L, y0: -25, k: 1, g: null });
  }
  // trânsito: carros em sentido contrário (faixa da esquerda) e à nossa frente (a nossa faixa)
  transito(o = {}) {
    const r = semente(41), carros = [];
    const meuX = o.meuX ?? 1.4;
    for (let i = 0; i < 6; i++) {
      const id = CARROS_RUA[i % CARROS_RUA.length], c = copia(protoCarro(id)); this.mundo.add(c);
      const contra = i < 4;
      c.rotation.z = contra ? Math.PI : 0;
      const it = { c, contra, y: contra ? 40 + i * 45 : 18 + (i - 4) * 30, x: contra ? -1.4 : meuX, v: contra ? 9 + r() * 4 : 0 };
      if (this.n > 0.3) {   // faróis acesos à noite
        const tg = texCanvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
        const cor = contra ? 0xfff6dc : 0xff2a2a;
        for (const sx of [-1, 1]) { const f = new T.Mesh(new T.PlaneGeometry(contra ? 1.1 : 0.6, contra ? 1.1 : 0.6).rotateX(Math.PI / 2), brilho(cor, 0.9)); f.material.map = tg; f.position.set(sx * 0.45, contra ? 1.6 : -1.65, 0.6); f.rotation.z = contra ? Math.PI : 0; c.add(f); }
      }
      carros.push(it);
    }
    this.depois((t, dt) => {
      for (const it of carros) {
        if (it.contra) { it.y -= (it.v + this.vel) * dt; if (it.y < -20) { it.y += 230; } }
        else { it.y += (Math.sin(t * 0.3 + it.y) * 0.5) * dt; if (it.y < 9) it.y = 9; }
        it.c.position.set(it.x, it.y, 0);
      }
    });
  }
  // ---- a câmara e cada imagem ----
  olhar(px, py, pz, ax, ay, az, hfov = 72) { this.cam.position.set(px, py, pz); this.veic.updateMatrixWorld(true); this.cam.lookAt(this.veic.localToWorld(new T.Vector3(ax, ay, az))); this.hfov = hfov; this.olharBase = this.cam.quaternion.clone(); }
  // olhar à volta (arrastar o dedo): rodar a cabeça para os lados (eixo de cima do veículo) e para cima/baixo
  rodar(dy, dp) { this.yaw = Math.max(-2.7, Math.min(2.7, (this.yaw || 0) + dy)); this.pitch = Math.max(-0.75, Math.min(0.6, (this.pitch || 0) + dp)); }
  cabeca() {
    if (!this.olharBase) return;
    const qy = Cena._qy || (Cena._qy = new T.Quaternion()), qp = Cena._qp || (Cena._qp = new T.Quaternion());
    qy.setFromAxisAngle(Cena._Z || (Cena._Z = new T.Vector3(0, 0, 1)), this.yaw || 0); qp.setFromAxisAngle(Cena._X || (Cena._X = new T.Vector3(1, 0, 0)), this.pitch || 0);
    this.cam.quaternion.copy(qy).multiply(this.olharBase).multiply(qp);
  }
  tamanho() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    const pr = this.R.getPixelRatio();
    if (this.canvas.width !== Math.floor(w * pr) || this.canvas.height !== Math.floor(h * pr)) this.R.setSize(w, h, false);
    const asp = w / h; this.cam.aspect = asp;
    const vf = 2 * Math.atan(Math.tan(this.hfov * Math.PI / 360) / asp) * 180 / Math.PI;
    this.cam.fov = Math.max(48, Math.min(this.vmax || 84, vf)); this.cam.updateProjectionMatrix();
  }
  quadro(t) {
    const dtReal = Math.min(0.5, Math.max(0, t - this.tAnt));   // 0l: para medir o tempo dos anúncios (o dt da animação tem teto)
    const dt = Math.min(0.05, dtReal); this.tAnt = t;
    this.s += this.vel * dt;
    for (const c of this.correm) c.tex.offset.y = this.s / c.passo;   // a textura da estrada corre
    this.atualizarAneis();
    for (const f of this.anima) f(t, dt);
    const n = this.n;
    for (const l of this.lampadas) l.emissiveIntensity = n * 2.4;
    for (const v of this.janelas) { v.emissive.setHex(0xffc864); v.emissiveIntensity = n * 0.6; }
    for (const a of this.anuncios) a.emissiveIntensity = 0.3 + n * 0.3;
    this.cabeca();
    this.tamanho();
    this.R.render(this.cena, this.cam);
    this.medirAds(dtReal);
  }
  parar() { deitarFora(this.cena, GUARDADOS); this.cena.clear(); this.env?.dispose(); }
}

/* ---------- abanar (estrada aos solavancos) ---------- */
const abanao = (t, f) => (Math.sin(t * 13) * 0.004 + Math.sin(t * 5.3) * 0.006 + Math.sin(t * 23.7) * 0.002) * f;

/* ============================================================
   CENAS POR MEIO DE TRANSPORTE
   ============================================================ */
const PANO = (base, risca) => texCanvas(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = risca; g.fillRect(0, y, w, 3); } ruido(g, w, h, 900, 0.12); }, [2, 2]);
function sentar(pai, ap, x, y, z, rz = 0, o = {}) { const p = pessoa(ap, 'sentado', 0, o); p.position.set(x, y, z); p.rotation.z = rz; pai.add(p); return p; }
function bancoComEncosto(pai, w, x, y, z, mBanco, mEnc, alt = 0.62) {
  caixa(pai, w, 0.5, 0.12, mBanco, x, y, z + 0.32);                                // assento
  caixa(pai, w, 0.1, alt, mEnc, x, y - 0.27, z + 0.38 + alt / 2, -0.12);          // encosto
  caixa(pai, w * 0.96, 0.4, 0.3, mat(0x2a2a2e), x, y, z + 0.13);                   // base
}
// para-brisas com gotas e limpa-vidros (quando chove)
function vidroDaFrente(c, w, h, x, y, z, incl, limpas = 2) {
  const vidroM = new T.MeshPhysicalMaterial({ color: 0xbfd8e6, transparent: true, opacity: c.chuva ? 0.16 : 0.07, roughness: 0.05, metalness: 0, depthWrite: false });
  const v = new T.Group(); v.position.set(x, y, z); v.rotation.x = incl; c.veic.add(v);
  const pl = new T.Mesh(new T.PlaneGeometry(w, h).rotateX(Math.PI / 2), vidroM); v.add(pl);
  if (!c.chuva) return;
  const gt = texGotas(), gm = new T.Mesh(new T.PlaneGeometry(w, h).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ map: gt.tex, transparent: true, depthWrite: false })); gm.position.y = -0.005; v.add(gm);
  const escovas = [];
  for (let k = 0; k < limpas; k++) {
    const b = new T.Group(); b.position.set(-w / 2 + w * (0.25 + k * 0.5), -0.01, -h / 2 + 0.03); v.add(b);
    caixa(b, 0.025, 0.02, h * 0.8, mat(0x111111, { roughness: 0.6 }), 0, 0, h * 0.4); escovas.push(b);
  }
  let ult = 0;
  c.depois(t => {
    const a = Math.sin(t * 2.4) * 1.05; escovas.forEach(b => b.rotation.y = a);
    if (t - ult > 0.12) { ult = t; const ang = a, ext = 0.42; gt.limpar(u => escovas.some((b, k) => Math.abs(u - (0.25 + k * 0.5) - Math.sin(-ang) * ext * 0.5) < 0.12)); gt.chover(c.chuva === 'tempestade' ? 14 : 7); }
  });
}
// parede de trás com o vidro traseiro (para quem olha para trás não ver o veículo «aberto»)
function traseira(c, pai, W, y, F, TOPO, m, o = {}) {
  const baixo = o.baixo ?? 0.85, cima = o.cima ?? 0.18, pil = o.pilar ?? 0.22;
  caixa(pai, W, 0.06, baixo, m, 0, y, F + baixo / 2);
  caixa(pai, W, 0.06, cima, m, 0, y, TOPO - cima / 2);
  for (const s of [-1, 1]) caixa(pai, pil, 0.06, TOPO - F - baixo - cima, m, s * (W / 2 - pil / 2), y, (F + baixo + TOPO - cima) / 2);
  if (o.prateleira) caixa(pai, W - 0.1, 0.35, 0.04, o.prateleira, 0, y + 0.18, F + baixo);
  const vid = new T.Mesh(new T.PlaneGeometry(W - pil * 2, TOPO - F - baixo - cima).rotateX(Math.PI / 2), new T.MeshPhysicalMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.08, roughness: 0.05, depthWrite: false }));
  vid.position.set(pai.position.x, y - 0.01, (F + baixo + TOPO - cima) / 2); c.veic.add(vid);
}
// junta tudo o que está parado dentro do veículo (bancos, paredes, passageiros) em poucas malhas
function fixar(c, i) { const f = fundir(i); f.position.copy(i.position); f.rotation.copy(i.rotation); c.veic.remove(i); c.veic.add(f); deitarFora(i, new Set([...GUARDADOS, ...f.children.map(m => m.material)])); return f; }
function abanarVeic(c, f, roll = 0) { c.depois(t => { c.veic.position.z = abanao(t, f) * 10; c.veic.rotation.y = Math.sin(t * 1.7) * 0.004 * f + Math.sin(t * 0.6) * roll; c.veic.rotation.x = abanao(t + 1, f) * 0.6; }); }

/* ---- candongueiro: azul e branco, 3.ª fila; cobrador à porta, painel no topo do para-brisas ---- */
function candongueiro(c) {
  c.estrada(); c.beiraCidade(); c.outdoors(); c.transito(); c.vel = 9;
  const v = c.veic; v.position.x = 1.4;
  const branco = mat(0xf2f2f2, { roughness: 0.5 }), azul = mat(0x2a62c9, { roughness: 0.45 }), plast = mat(0xe8e4dc, { roughness: 0.7, emissive: 0x2a2824 });
  const panoM = new T.MeshStandardMaterial({ map: PANO('#2b3f6b', '#d0a83a'), roughness: 0.9 }), encM = new T.MeshStandardMaterial({ map: PANO('#3a2a22', '#8a5a33'), roughness: 0.9 });
  const F = 0.5, W = 1.7, TOPO = 2.15;
  const i = new T.Group(); v.add(i);
  caixa(i, W, 4.6, 0.06, mat(0x2a2a2e, { roughness: 0.95 }), 0, 0.2, F - 0.03);                 // chão
  caixa(i, W + 0.1, 4.6, 0.06, plast, 0, 0.2, TOPO); for (let y = -1.6; y < 2; y += 1.1) caixa(i, W, 0.04, 0.025, mat(0xcfc9bd, { emissive: 0x2a2824 }), 0, y, TOPO - 0.03);   // teto com nervuras
  caixa(i, 0.3, 0.16, 0.04, mat(0x2a2a2e), -0.4, 0.4, TOPO - 0.04); cil(i, 0.012, 0.012, 1.4, mat(0x9aa1a8, { metalness: 0.8 }), 0.45, 0.1, TOPO - 0.12, 'y');   // altifalante e corrimão
  for (const s of [-1, 1]) {
    caixa(i, 0.06, 4.6, 0.7, branco, s * W / 2, 0.2, F + 0.35);                                   // parede de baixo
    caixa(i, 0.07, 4.6, 0.12, azul, s * W / 2, 0.2, F + 0.75);                                    // a faixa azul
    for (const y of [-1.6, -0.5, 0.6, 1.55]) caixa(i, 0.08, 0.12, 0.9, branco, s * W / 2, y, F + 1.2);   // pilares
    caixa(i, 0.08, 4.6, 0.1, branco, s * W / 2, 0.2, TOPO - 0.04);
  }
  // frente: tablier azul (com pelúcia), volante, motorista, terço no espelho, autocolante
  const yF = 1.75;
  caixa(i, W, 0.5, 0.5, azul, 0, yF, F + 0.55); caixa(i, W * 0.98, 0.42, 0.04, mat(0x3a7bd5, { roughness: 1 }), 0, yF - 0.02, F + 0.82);
  const vol = new T.Mesh(new T.TorusGeometry(0.2, 0.028, 10, 28), mat(0x15171a, { roughness: 0.5 })); vol.position.set(-0.42, yF - 0.38, F + 0.98); vol.rotation.x = 1.15; i.add(vol);
  vidroDaFrente(c, W - 0.1, 0.95, 0, yF + 0.02, F + 1.32, -0.18, 2);
  caixa(i, W, 0.12, 0.1, branco, 0, yF + 0.1, F + 1.83);
  // painel de publicidade no topo do para-brisas
  const ad = texAd(c.o.ad, 'candongueiro:painel'); placa(i, 1.34, 0.32, new T.MeshBasicMaterial({ map: ad }), 0, yF - 0.04, TOPO - 0.2); caixa(i, 1.42, 0.03, 0.4, branco, 0, yF - 0.02, TOPO - 0.2);
  const esp = caixa(i, 0.3, 0.04, 0.09, mat(0x15171a), 0, yF - 0.15, TOPO - 0.42);
  for (let k = 0; k < 9; k++) esfera(i, 0.016, mat(k % 3 ? 0xf2f2f2 : 0xcc092f, { roughness: 0.3 }), 0.02 * Math.sin(k), yF - 0.15, TOPO - 0.48 - k * 0.03);   // terço
  const autoc = texCanvas(256, 48, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = '#ffcb00'; g.font = '800 30px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(TR('Deus é fiel'), w / 2, 34); });
  placa(i, 0.6, 0.11, new T.MeshBasicMaterial({ map: autoc, transparent: true }), 0.45, yF + 0.05, F + 1.76);
  // passageiros (de costas): motorista + 1 à frente; 3 na fila do meio; nós na 3.ª
  const P = c.o.passageiros;
  sentar(i, P[0], -0.45, 1.1, F); sentar(i, P[1], 0.42, 1.1, F);
  bancoComEncosto(i, W - 0.2, 0, 1.12, F, panoM, encM, 0.55);
  [-0.5, 0, 0.5].forEach((x, k) => sentar(i, P[2 + k], x, 0.22, F));
  bancoComEncosto(i, W - 0.2, 0, 0.24, F, panoM, encM, 0.55);
  bancoComEncosto(i, W - 0.2, 0, -0.66, F, panoM, encM, 0.55);
  // o cobrador agachado à porta (do lado direito), a olhar para dentro
  traseira(c, i, W, -1.2, F, TOPO, branco, { prateleira: azul });
  const cob = pessoa(P[6], 'parado'); cob.position.set(0.66, 0.68, F); cob.rotation.z = Math.PI / 2 + 0.5; cob.scale.set(1, 1, 0.9); i.add(cob);
  fixar(c, i);
  c.olhar(0.3, -0.62, F + 1.4, 0.05, 6, F + 0.55, 70); c.vmax = 76;
  abanarVeic(c, 1.6, 0.004);
}

/* ---- autocarro: corredor, filas de bancos, 2 painéis e o letreiro com o destino ---- */
function autocarro(c) {
  c.estrada({ terra: '#b49a6a', erva: true }); c.beiraCidade('aldeia'); c.outdoors(); c.transito({ meuX: 1.6 }); c.vel = 11;
  const v = c.veic; v.position.x = 1.5;
  const F = 1.0, W = 2.4, TOPO = 3.3;
  const i = new T.Group(); v.add(i);
  const cinza = mat(0xd9d9d9, { roughness: 0.6 }), cromado = mat(0xd5d8dc, { metalness: 0.9, roughness: 0.2 });
  const assento = new T.MeshStandardMaterial({ map: PANO('#2c6fb0', '#1f4f84'), roughness: 0.9 }), capa = mat(0xf2f2f2);
  caixa(i, W, 10, 0.06, mat(0x3a3d42, { roughness: 0.95 }), 0, 3, F - 0.03); caixa(i, W, 10, 0.06, cinza, 0, 3, TOPO);
  for (const s of [-1, 1]) { caixa(i, 0.06, 10, 0.9, cinza, s * W / 2, 3, F + 0.45); for (let y = -1; y < 8; y += 1.6) caixa(i, 0.08, 0.1, 1.3, cinza, s * W / 2, y, F + 1.55); caixa(i, 0.08, 10, 0.25, cinza, s * W / 2, 3, TOPO - 0.12);
    cil(i, 0.025, 0.025, 10, cromado, s * 0.32, 3, TOPO - 0.25, 'y'); caixa(i, 0.4, 10, 0.08, cinza, s * (W / 2 - 0.25), 3, TOPO - 0.42); }   // corrimões e prateleiras
  // filas de bancos 2+2 (passageiros sentados de costas)
  const P = c.o.passageiros; let k = 0;
  for (let fila = 0; fila < 7; fila++) {
    const y = 0.4 + fila * 0.95;
    for (const x of [-0.85, -0.38, 0.38, 0.85]) {
      bancoComEncosto(i, 0.44, x, y, F, assento, assento, 0.55); caixa(i, 0.4, 0.04, 0.16, capa, x, y - 0.33, F + 0.88);
      if (fila < 6 && (fila * 5 + Math.round(x * 10)) % 7 !== 3) sentar(i, P[k++ % P.length], x, y - 0.02, F);
    }
  }
  bancoComEncosto(i, 0.44, 0.38, -0.55, F, assento, assento, 0.68); bancoComEncosto(i, 0.44, 0.85, -0.55, F, assento, assento, 0.68);
  traseira(c, i, W, -1.05, F, TOPO, cinza, { baixo: 0.95, cima: 0.5 });
  // frente: tablier, motorista, 2 painéis e o letreiro
  const yF = 7.6;
  caixa(i, W, 0.6, 0.7, mat(0x2a2a2e), 0, yF, F + 0.4); sentar(i, P[7], -0.7, yF - 0.75, F + 0.1);
  vidroDaFrente(c, W - 0.12, 1.5, 0, yF + 0.2, F + 1.55, -0.05, 2);
  for (const s of [-1, 1]) { const ad = texAd(s < 0 ? c.o.ad : c.o.ad2 || c.o.ad, s < 0 ? 'autocarro:painel_esq' : 'autocarro:painel_dir'); placa(i, 1.0, 0.4, new T.MeshBasicMaterial({ map: ad }), s * 0.56, yF - 0.05, TOPO - 0.32); }
  const letreiro = texCanvas(512, 64, (g, w, h) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb000'; g.font = '700 38px monospace'; g.textAlign = 'center'; g.fillText((c.o.destino || '').toUpperCase(), w / 2, 46); });
  placa(i, 1.6, 0.2, new T.MeshBasicMaterial({ map: letreiro }), 0, yF - 0.06, TOPO - 0.62);
  fixar(c, i);
  c.olhar(0.4, -0.6, F + 1.48, -0.15, 9, F + 0.85, 72);
  abanarVeic(c, 0.8, 0.003);
}

/* ---- táxi: banco de trás; ecrã com publicidade no encosto da frente ---- */
function taxi(c) {
  c.estrada(); c.beiraCidade(); c.outdoors(); c.transito(); c.vel = 12;
  const v = c.veic; v.position.x = 1.4;
  const F = 0.3, W = 1.5, TOPO = 1.72;
  const i = new T.Group(); v.add(i);
  const pele = mat(0x8a8178, { roughness: 0.7 }), tecto = mat(0xcfc8bc, { roughness: 0.95 }), preto = mat(0x111214, { roughness: 0.5 });
  caixa(i, W, 3, 0.05, mat(0x202024, { roughness: 1 }), 0, 0.5, F - 0.03); caixa(i, W, 3, 0.05, tecto, 0, 0.5, TOPO);
  for (const s of [-1, 1]) { caixa(i, 0.08, 3, 0.65, pele, s * W / 2, 0.5, F + 0.32); caixa(i, 0.1, 0.12, 0.6, pele, s * W / 2, 0.15, F + 0.95); caixa(i, 0.1, 0.3, 0.6, pele, s * W / 2, -0.75, F + 0.95); caixa(i, 0.1, 0.3, TOPO - F - 1.25, pele, s * W / 2, -0.75, (F + 1.25 + TOPO) / 2); caixa(i, 0.1, 3, 0.12, pele, s * W / 2, 0.5, TOPO - 0.06); }
  // bancos da frente (motorista à esquerda), ecrã no encosto do passageiro
  const P = c.o.passageiros;
  sentar(i, P[0], -0.36, 0.55, F);
  for (const x of [-0.36, 0.36]) { caixa(i, 0.52, 0.5, 0.12, pele, x, 0.58, F + 0.32); caixa(i, 0.5, 0.14, 0.62, pele, x, 0.28, F + 0.68, -0.15); caixa(i, 0.24, 0.1, 0.13, pele, x, 0.25, F + 1.04); cil(i, 0.01, 0.01, 0.1, mat(0x9aa1a8, { metalness: 0.9, roughness: 0.2 }), x - 0.07, 0.25, F + 0.97); cil(i, 0.01, 0.01, 0.1, mat(0x9aa1a8, { metalness: 0.9, roughness: 0.2 }), x + 0.07, 0.25, F + 0.97); }
  // um ecrã com publicidade em CADA encosto da frente (dono, 27 out)
  const ecraAd = texAd(c.adN(4), `${c.o.meio}:encosto_esq`, 512, 300), ecraAd2 = texAd(c.adN(5), `${c.o.meio}:encosto_dir`, 512, 300);
  placa(i, 0.32, 0.19, new T.MeshBasicMaterial({ map: ecraAd }), -0.36, 0.19, F + 0.82, 0); caixa(i, 0.36, 0.02, 0.23, preto, -0.36, 0.2, F + 0.82);
  placa(i, 0.32, 0.19, new T.MeshBasicMaterial({ map: ecraAd2 }), 0.36, 0.19, F + 0.82, 0); caixa(i, 0.36, 0.02, 0.23, preto, 0.36, 0.2, F + 0.82);
  // tablier, volante, telemóvel com o mapa
  const yF = 1.3; caixa(i, W, 0.5, 0.35, mat(0x1a1b1e, { roughness: 0.6 }), 0, yF, F + 0.6);
  const vol = new T.Mesh(new T.TorusGeometry(0.17, 0.025, 10, 28), preto); vol.position.set(-0.36, yF - 0.3, F + 0.85); vol.rotation.x = 1.2; i.add(vol);
  const mapa = texCanvas(128, 220, (g, w, h) => { g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.moveTo(20, h); g.lineTo(60, 120); g.lineTo(110, 0); g.stroke(); g.strokeStyle = '#2c6fb0'; g.lineWidth = 5; g.beginPath(); g.moveTo(20, h); g.lineTo(60, 120); g.lineTo(110, 0); g.stroke(); g.fillStyle = '#cc092f'; g.beginPath(); g.arc(110, 12, 8, 0, 7); g.fill(); });
  placa(i, 0.1, 0.17, new T.MeshBasicMaterial({ map: mapa }), 0.05, yF - 0.24, F + 0.92);
  vidroDaFrente(c, W - 0.1, 0.65, 0, yF + 0.15, F + 1.05, -0.6, 2);
  caixa(i, 0.22, 0.04, 0.06, preto, 0, yF - 0.2, TOPO - 0.12);
  bancoComEncosto(i, W - 0.1, 0, -0.45, F, pele, pele, 0.6);
  traseira(c, i, W, -0.95, F, TOPO, pele, { baixo: 0.95, cima: 0.12, pilar: 0.3, prateleira: mat(0x202024, { roughness: 1 }) });
  fixar(c, i);
  c.olhar(0.04, -0.62, F + 1.24, -0.1, 7, F + 0.62, 72); c.vmax = 72;
  abanarVeic(c, 0.9);
}

/* ---- o teu carro: volante, conta-quilómetros, rádio com a música, capô com a cor do carro ---- */
function carroProprio(c) {
  c.estrada(); c.beiraCidade(); c.outdoors(); c.transito(); c.vel = 13;
  const v = c.veic; v.position.x = 1.4;
  const F = 0.3, W = 1.5, TOPO = 1.55, id = c.o.carro || 'sedan';
  const corCarro = (typeof VEICULOS !== 'undefined' && VEICULOS[id]?.cor) || '#1f2e44';
  const i = new T.Group(); v.add(i);
  const preto = mat(0x141517, { roughness: 0.55 }), pele = mat(0x2a2522, { roughness: 0.6 });
  // 6 nov (Gold Exclusive C): capô dourado / diamante (as mesmas tintas do modelo) e a tua matrícula no tablier
  const ac = typeof acabDe === 'function' ? acabDe(id) : {};
  const tinta = ac.pintura === 'ouro' ? new T.MeshPhysicalMaterial({ color: 0xa87a12, metalness: 1, roughness: 0.3, clearcoat: 0.4 })
    : ac.pintura === 'diamante' ? new T.MeshPhysicalMaterial({ color: 0xd3dcf3, metalness: 0.6, roughness: 0.16, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, sheen: 0.8, sheenColor: new T.Color(0xb9d2ff) })
    : new T.MeshPhysicalMaterial({ color: corCarro, roughness: 0.3, metalness: 0.15, clearcoat: 0.9 });
  caixa(i, W, 2.6, 0.05, mat(0xcfc8bc, { roughness: 0.95 }), 0, 0.3, TOPO);
  caixa(i, W, 2.8, 0.06, mat(0x1c1c1f, { roughness: 1 }), 0, 0.2, F - 0.03);                         // chão (alcatifa)
  caixa(i, 0.24, 1.3, 0.3, pele, 0, 0.35, F + 0.15);                                                    // consola do meio
  cil(i, 0.02, 0.02, 0.22, preto, 0.0, 0.2, F + 0.38); esfera(i, 0.04, mat(0x3a3d42, { metalness: 0.5 }), 0, 0.2, F + 0.5);   // alavanca das mudanças
  bancoComEncosto(i, 0.55, -0.36, -0.15, F, pele, pele, 0.7); bancoComEncosto(i, 0.55, 0.36, -0.15, F, pele, pele, 0.7);
  bancoComEncosto(i, W - 0.1, 0, -1.05, F, pele, pele, 0.6); traseira(c, i, W, -1.55, F, TOPO, pele, { baixo: 0.95, cima: 0.1, pilar: 0.32, prateleira: mat(0x1c1c1f, { roughness: 1 }) });
  for (const s of [-1, 1]) caixa(i, 0.08, 1.4, 0.55, pele, s * W / 2, -0.9, F + 0.35);
  // capô na cor do teu carro (desce para a frente)
  const capo = caixa(i, W + 0.1, 1.7, 0.08, tinta, 0, 2.2, F + 0.66, -0.06);
  // tablier, painel de instrumentos, rádio
  const yF = 1.05;
  caixa(i, W, 0.6, 0.62, preto, 0, yF, F + 0.31); caixa(i, W, 0.3, 0.06, pele, 0, yF - 0.1, F + 0.62);
  if (ac.matricula) {
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 64; const pg = pc.getContext('2d');
    pg.fillStyle = '#f4f1e6'; pg.fillRect(0, 0, 256, 64); pg.strokeStyle = '#1a1a1a'; pg.lineWidth = 6; pg.strokeRect(3, 3, 250, 58);
    pg.fillStyle = '#1d4fa8'; pg.fillRect(6, 6, 30, 52); pg.fillStyle = '#ffcb00'; pg.font = '700 14px sans-serif'; pg.textAlign = 'center'; pg.fillText('ANG', 21, 50);
    pg.fillStyle = '#111'; pg.font = '800 40px monospace'; pg.textBaseline = 'middle'; pg.fillText(ac.matricula, 146, 34);
    const pt = new T.CanvasTexture(pc); pt.colorSpace = T.SRGBColorSpace;
    placa(i, 0.32, 0.08, new T.MeshBasicMaterial({ map: pt }), -0.36, yF - 0.315, F + 0.46);
  }
  const conta = texCanvas(256, 128, (g, w, h) => { g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h); for (const cx of [70, 186]) { g.strokeStyle = '#3b3f48'; g.lineWidth = 4; g.beginPath(); g.arc(cx, 70, 48, Math.PI * 0.8, Math.PI * 2.2); g.stroke(); g.fillStyle = '#9fd3ea'; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.8 + 1.4 * k / 8); g.fillRect(cx + Math.cos(a) * 40 - 1, 70 + Math.sin(a) * 40 - 1, 3, 3); } }
    g.fillStyle = '#e8e8e8'; g.font = '700 22px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('60', 70, 78); g.font = '600 11px Inter'; g.fillText('km/h', 70, 96); g.fillText('x1000', 186, 96); });
  const ctaM = new T.MeshBasicMaterial({ map: conta }); placa(i, 0.34, 0.17, ctaM, -0.36, yF - 0.31, F + 0.58); caixa(i, 0.42, 0.2, 0.06, preto, -0.36, yF - 0.22, F + 0.68);
  const vol = new T.Group(); vol.position.set(-0.36, yF - 0.45, F + 0.66); vol.rotation.x = 1.15; i.add(vol);
  vol.add(new T.Mesh(new T.TorusGeometry(0.19, 0.03, 12, 32), preto)); caixa(vol, 0.32, 0.03, 0.05, preto, 0, 0, 0); caixa(vol, 0.05, 0.03, 0.18, preto, 0, 0, -0.09);
  esfera(vol, 0.045, mat(0x3a3d42, { metalness: 0.5 }), 0, 0.01, 0, 1, 0.5, 1);
  // rádio com a música a tocar (texto a correr)
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 96; const rg = rc.getContext('2d'); const rt = new T.CanvasTexture(rc); rt.colorSpace = T.SRGBColorSpace;
  const titulo = '📻 ' + (c.o.musica || TR('Rádio Luanda'));
  placa(i, 0.26, 0.1, new T.MeshBasicMaterial({ map: rt }), 0.1, yF - 0.31, F + 0.52);
  let ultR = -1;
  c.depois(t => { if (t - ultR < 0.15) return; ultR = t; rg.fillStyle = '#071214'; rg.fillRect(0, 0, 256, 96); rg.fillStyle = '#16d3d3'; rg.font = '700 26px Inter, sans-serif'; rg.textAlign = 'left';
    const w = rg.measureText(titulo).width, x = w > 230 ? 12 - ((t * 40) % (w + 40)) : 12; rg.fillText(titulo, x, 40); if (w > 230) rg.fillText(titulo, x + w + 40, 40);
    for (let k = 0; k < 16; k++) { const hh = 6 + Math.abs(Math.sin(t * 6 + k * 1.7)) * 30; rg.fillRect(12 + k * 14, 90 - hh, 9, hh); } rt.needsUpdate = true; });
  // espelho retrovisor, pilares, porta
  caixa(i, 0.3, 0.05, 0.09, preto, 0, yF - 0.05, TOPO - 0.12); placa(i, 0.27, 0.07, new T.MeshBasicMaterial({ map: texCanvas(128, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fb4c4'); gr.addColorStop(0.55, '#c9d6de'); gr.addColorStop(0.56, '#55585e'); gr.addColorStop(1, '#3a3d42'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }), 0, yF - 0.08, TOPO - 0.12);
  for (const s of [-1, 1]) { const p = caixa(i, 0.08, 0.08, 0.75, tinta, s * (W / 2 - 0.02), yF + 0.1, F + 1.2, -0.55); caixa(i, 0.08, 1.2, 0.5, pele, s * W / 2, -0.1, F + 0.4); }
  for (const x of [-0.36, 0.36]) caixa(i, 0.5, 0.26, 0.03, mat(0xbdb5a8, { roughness: 0.95 }), x, yF + 0.0, TOPO - 0.06, 0.25);   // palas do sol
  vidroDaFrente(c, W - 0.12, 0.7, 0, yF + 0.22, F + 1.0, -0.6, 2);
  fixar(c, i);
  c.olhar(-0.36, -0.3, F + 1.02, -0.2, 7, F + 0.55, 70); c.vmax = 72;
  abanarVeic(c, 0.6);
}

/* ---- mota: guiador, espelhos, conta-quilómetros, o depósito e as tuas mãos; vento ---- */
function motaPropria(c, kupa) {
  c.estrada(); c.beiraCidade(); c.outdoors(); c.transito({ meuX: 1.9 }); c.vel = 8;   // 0cz (9): mais devagar (era 12–14) para se verem os anúncios
  const v = c.veic; v.position.x = 1.9;
  const i = new T.Group(); v.add(i);
  const id = c.o.mota || 'mota', cor = (typeof VEICULOS !== 'undefined' && VEICULOS[id]?.cor) || '#cc092f';
  const tinta = new T.MeshPhysicalMaterial({ color: kupa ? '#16181b' : cor, roughness: 0.3, clearcoat: 0.9 }), preto = mat(0x16181b, { roughness: 0.5 }), cromado = mat(0xd5d8dc, { metalness: 0.9, roughness: 0.18 });
  const Zg = 1.15;
  // depósito e guiador
  const dep = esfera(i, 0.24, tinta, 0, 0.3, 0.92, 0.85, 1.5, 0.5); caixa(i, 0.14, 0.04, 0.02, mat(0x9aa1a8, { metalness: 0.9, roughness: 0.2 }), 0, 0.15, 1.03); esfera(i, 0.06, cromado, 0, 0.42, 1.04, 1, 1, 0.3);   // tampa do depósito
  caixa(i, 0.86, 0.04, 0.04, preto, 0, 0.62, Zg);
  for (const s of [-1, 1]) { cil(i, 0.022, 0.022, 0.14, mat(0x0d0d0d, { roughness: 0.95 }), s * 0.36, 0.62, Zg, 'x'); cil(i, 0.012, 0.012, 0.28, cromado, s * 0.3, 0.68, Zg + 0.14); esfera(i, 0.05, cromado, s * 0.32, 0.7, Zg + 0.3, 1.4, 0.4, 1); }
  const conta = texCanvas(128, 128, (g, w, h) => { g.fillStyle = '#0c0d10'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#e8e8e8'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 50, Math.PI * 0.75, Math.PI * 2.25); g.stroke(); g.strokeStyle = '#cc092f'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(28, 50); g.stroke(); g.fillStyle = '#e8e8e8'; g.font = '700 16px Inter'; g.textAlign = 'center'; g.fillText('km/h', 64, 100); });
  const ct = new T.Mesh(new T.CircleGeometry(0.08, 24), new T.MeshBasicMaterial({ map: conta })); ct.rotation.x = Math.PI / 2 + 0.6; ct.rotation.z = Math.PI; ct.position.set(0, 0.7, Zg + 0.07); i.add(ct);
  esfera(i, 0.09, preto, 0, 0.72, Zg + 0.03, 1.2, 0.9, 0.8);
  if (kupa) {
    // o motoqueiro à tua frente: colete amarelo e capacete com o autocolante de publicidade
    const ap = { ...c.o.passageiros[0], camisa: '#f5b81c', roupa: 0 };
    const mq = pessoa({ ...ap, cabelo: 1 }, 'sentado'); mq.position.set(0, 0.05, 0.42); i.add(mq);
    const cap = capacete(0x141012, null); cap.scale.setScalar(1.12);   // (sem anúncio no capacete: tapava a vista — os anúncios estão nos outdoors à beira da estrada) cap.position.set(0, 0.04, 0.42 + 1.12 - 0.26 + 0.13); i.add(cap);
    c.olhar(0.18, -1.0, 1.95, 0.1, 8, 1.15, 74);
  } else {
    // as tuas mãos nos punhos
    const eu = c.o.eu || {}, pele = mat(PELES[eu.pele ?? 3] || '#8d5527', { roughness: 0.5 }), manga = mat(eu.camisa || '#2c6fb0', { roughness: 0.85 });
    const luva = mat(0x1b1c1f, { roughness: 0.7 }); for (const s of [-1, 1]) { esfera(i, 0.058, luva, s * 0.36, 0.6, Zg + 0.035, 1.2, 1.3, 0.9); esfera(i, 0.03, pele, s * 0.33, 0.56, Zg + 0.0, 1, 1, 1); }
    c.olhar(0, -0.12, 1.62, 0, 6, 0.75, 76);
  }
  fixar(c, i);
  // vento: riscos transparentes a passar
  const N = 26, pos = new Float32Array(N * 6), geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const vento = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })); vento.frustumCulled = false; v.add(vento);
  const r = semente(4), riscos = Array.from({ length: N }, () => [(r() - 0.5) * 3, r() * 8, 0.6 + r() * 2]);
  c.depois((t, dt) => { riscos.forEach((q, k) => { q[1] -= dt * 30; if (q[1] < -0.5) { q[1] += 8; q[0] = (r() - 0.5) * 3; if (Math.abs(q[0]) < 0.5) q[0] = Math.sign(q[0] || 1) * (0.5 + r()); } pos.set([q[0], q[1], q[2], q[0], q[1] + 0.9, q[2]], k * 6); }); geo.attributes.position.needsUpdate = true; });
  abanarVeic(c, 2, 0.02);
}

/* ---- comboio: janela grande, a paisagem de Angola a passar; cartaz na parede ---- */
function comboio(c) {
  c.vel = 12;
  const chao = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ map: texturaTerra('#9c8a52', true), roughness: 1 }));
  chao.material.map.repeat.set(120, 120); chao.position.set(200, 200, -0.03); c.mundo.add(chao); c.correm.push({ tex: chao.material.map, passo: 900 / 120 });
  // a linha (travessas + carris) mesmo ao lado, e balastro
  const linha = texCanvas(128, 128, (g, w, h) => { g.fillStyle = '#7a6e62'; g.fillRect(0, 0, w, h); ruido(g, w, h, 2000, 0.25); g.fillStyle = '#5a3f2a'; for (let y = 0; y < h; y += 32) g.fillRect(8, y, w - 16, 14); g.fillStyle = '#9aa1a8'; g.fillRect(28, 0, 8, h); g.fillRect(w - 36, 0, 8, h); });
  const fl = faixa(3.2, 3.6, 0.02, linha, 2.2); c.mundo.add(fl); c.correm.push({ tex: fl.material.map, passo: 2.2 });
  // postes de telégrafo (passam rápido), imbondeiros, acácias, aldeias e montes ao longe
  if (!PROTOS.has('poste')) { const g = new T.Group(), m = mat(0x5a3f2a, { roughness: 0.9 }); cil(g, 0.08, 0.1, 6, m, 0, 0, 3); caixa(g, 1.4, 0.1, 0.1, m, 0, 0, 5.6); for (const s of [-1, 1]) esfera(g, 0.06, mat(0xe8e8e8), s * 0.5, 0, 5.7); PROTOS.set('poste', guardar(fundir(g))); }
  const L = 220, postes = []; for (let y = 0; y < L; y += 18) postes.push({ x: 6.5, y });
  c.anel(instancias(PROTOS.get('poste'), postes.length), postes, L, -30);
  const r = semente(19), porArv = ARVORES.map(() => []);
  for (let k = 0; k < 70; k++) { const a = r() < 0.35 ? 4 : r() < 0.5 ? 2 : r() < 0.5 ? 0 : 3; porArv[a].push({ x: 12 + r() * 70, y: r() * L, rz: r() * 6, s: a === 4 ? 1.4 + r() * 0.8 : 0.9 + r() * 0.4 }); }
  ARVORES.forEach((id, k) => { if (porArv[k].length) c.anel(instancias(protoArvore(id), porArv[k].length), porArv[k], L, -30); });
  const specs = specsPredios('aldeia'), porP = specs.map(() => []);
  for (let a = 0; a < 5; a++) { const ya = r() * L, xa = 25 + r() * 40; for (let k = 0; k < 4; k++) porP[Math.floor(r() * specs.length)].push({ x: xa + r() * 12, y: ya + k * 7, rz: Math.floor(r() * 4) * Math.PI / 2 }); }
  specs.forEach((sp, k) => { if (porP[k].length) c.anel(instancias(protoPredio('aldeia', k, sp), porP[k].length), porP[k], L, -30); });
  // montes ao longe (passam devagar)
  const monte = new T.Group(); monte.add(new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1.8, 1.2, 0.35), new T.MeshStandardMaterial({ color: 0x7d8a5a, roughness: 1 })));
  const montes = []; for (let k = 0; k < 14; k++) montes.push({ x: 160 + r() * 60, y: k * 40 + r() * 20, s: 30 + r() * 35 });
  c.anel(instancias(monte, montes.length), montes, 560, -100, 0.25);
  // a carruagem: parede com janelas grandes, cartaz, bancos e passageiros
  const v = c.veic; v.position.x = 0;
  const i = new T.Group(); v.add(i);
  const F = 0.9, parede = mat(0xe6e2da, { roughness: 0.6 }), azul = new T.MeshStandardMaterial({ map: PANO('#2c6fb0', '#24598f'), roughness: 0.9 });
  caixa(i, 2.6, 12, 0.06, mat(0x6a6e74, { roughness: 0.95 }), 0, 0, F - 0.03); caixa(i, 2.6, 12, 0.06, parede, 0, 0, F + 2.3);
  const xp = 1.3;
  caixa(i, 0.08, 12, 0.85, parede, xp, 0, F + 0.42); caixa(i, 0.08, 12, 0.5, parede, xp, 0, F + 2.05);
  for (let y = -2.9; y <= 6; y += 2.2) caixa(i, 0.1, 0.4, 1.0, parede, xp, y, F + 1.32);
  caixa(i, 0.12, 12, 0.06, mat(0x9aa1a8, { metalness: 0.7 }), xp - 0.05, 0, F + 0.86);
  const vid = new T.MeshPhysicalMaterial({ color: 0xcfe2ea, transparent: true, opacity: 0.06, depthWrite: false }); caixa(i, 0.01, 12, 1.0, vid, xp + 0.03, 0, F + 1.32);
  // o outro lado da carruagem (também com janelas) e as paredes das pontas, com porta
  caixa(i, 0.08, 12, 0.85, parede, -xp, 0, F + 0.42); caixa(i, 0.08, 12, 0.5, parede, -xp, 0, F + 2.05);
  for (let y = -2.9; y <= 6; y += 2.2) caixa(i, 0.1, 0.4, 1.0, parede, -xp, y, F + 1.32);
  for (const [y, sy] of [[-0.85, 1], [5.6, -1]]) { caixa(i, 2.6, 0.08, 2.35, parede, 0, y, F + 1.15); caixa(i, 0.7, 0.02, 1.9, mat(0x9aa0a6, { roughness: 0.5 }), 0, y + sy * 0.05, F + 0.95); caixa(i, 0.4, 0.01, 0.35, new T.MeshPhysicalMaterial({ color: 0xcfe2ea, transparent: true, opacity: 0.3 }), 0, y + sy * 0.065, F + 1.55); }
  // cartaz com o anúncio, entre duas janelas
  const cg = new T.PlaneGeometry(0.9, 0.45); cg.rotateX(Math.PI / 2); cg.rotateZ(-Math.PI / 2); const cart = new T.Mesh(cg, new T.MeshBasicMaterial({ map: texAd(c.o.ad, 'comboio:cartaz') })); cart.position.set(xp - 0.06, 1.85, F + 1.95); i.add(cart);
  caixa(i, 0.04, 1.0, 0.55, mat(0x9aa0a6), xp - 0.03, 1.85, F + 1.95);
  const P = c.o.passageiros;
  for (let fila = 0; fila < 4; fila++) { const y = 0.9 + fila * 1.1; for (const x of [0.85, 0.35, -0.6]) { bancoComEncosto(i, 0.46, x, y, F, azul, azul, 0.75); if (fila < 3 && (fila * 3 + Math.round(x * 2)) % 3 !== 1) sentar(i, P[(fila * 3 + Math.round(x * 2) + 9) % 8], x, y - 0.02, F); } }
  bancoComEncosto(i, 0.46, 0.85, -0.2, F, azul, azul, 0.75);
  fixar(c, i);
  c.olhar(0.6, -0.1, F + 1.45, 6, 3.2, F + 1.15, 80);
  abanarVeic(c, 0.7);
  c.depois(t => { c.veic.position.z += Math.sin(t * 9) * 0.004; });
}

/* ---- barco para o Mussulo: mar com ondas, a ilha a crescer, a boia com o anúncio ---- */
function aguaMaterial(c, cor) {
  const m = new T.MeshStandardMaterial({ color: cor, roughness: 0.18, metalness: 0.1 });
  const u = { t: { value: 0 }, s: { value: 0 } }; m.userData.u = u;
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = u.t; sh.uniforms.uS = u.s;
    sh.vertexShader = 'uniform float uT; uniform float uS;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz; float yy = wp0.y + uS;
        float dx = 0.0, dy = 0.0;
        dx += cos(wp0.x * 0.35 + uT * 1.3) * 0.35 * 0.12; dy += cos(yy * 0.28 - uT * 1.7) * 0.28 * 0.16;
        dx += cos((wp0.x + yy) * 0.7 + uT * 2.1) * 0.7 * 0.05; dy += cos((wp0.x + yy) * 0.7 + uT * 2.1) * 0.7 * 0.05;
        vec3 objectNormal = normalize(vec3(-dx, -dy, 1.0));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.z += sin(wp0.x * 0.35 + uT * 1.3) * 0.12 + sin(yy * 0.28 - uT * 1.7) * 0.16 + sin((wp0.x + yy) * 0.7 + uT * 2.1) * 0.05;`);
  };
  c.depois(t => { u.t.value = t; u.s.value = c.s; });
  return m;
}
function barco(c) {
  c.vel = 7;
  const n = c.n;
  const mar = new T.Mesh(new T.PlaneGeometry(260, 260, 130, 130), aguaMaterial(c, new T.Color(0x1f86b0).lerp(new T.Color(0x0b1a2e), n)));
  mar.position.set(0, 100, 0); c.mundo.add(mar);
  const esp = texCanvas(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 140; k++) { g.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.3})`; g.lineWidth = 1.5; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x - 8, y); g.quadraticCurveTo(x, y - 3, x + 8, y); g.stroke(); } }, [40, 40]);
  const espuma = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshBasicMaterial({ map: esp, transparent: true, depthWrite: false, opacity: 0.6 - n * 0.4 })); espuma.position.set(0, 100, 0.22); c.mundo.add(espuma); c.correm.push({ tex: esp, passo: 260 / 40 });
  // a ilha do Mussulo: areia, palmeiras, casinhas e um cais (aproxima-se com a viagem)
  const ilha = new T.Group(); c.mundo.add(ilha);
  const areia = new T.Mesh(new T.CylinderGeometry(1, 1.15, 1, 48).rotateX(Math.PI / 2), mat(0xe9d39c, { roughness: 1 })); areia.scale.set(70, 14, 0.8); areia.position.z = 0.1; ilha.add(areia);
  const r = semente(23), palm = protoArvore('palmeira'), pts = [];
  for (let k = 0; k < 40; k++) pts.push({ x: (r() - 0.5) * 120, y: (r() - 0.2) * 14, z: 0.5, rz: r() * 6, s: 0.8 + r() * 0.5 });
  const ip = instancias(palm, pts.length); pts.forEach((p, k) => porInst(ip, k, p.x, p.y, p.z, p.rz, p.s)); feitoInst(ip); ilha.add(ip);
  const specs = specsPredios('aldeia'); specs.forEach((sp, k) => { const p = copia(protoPredio('aldeia', k, sp)); p.position.set(-25 + k * 13, 3 + (k % 2) * 3, 0.5); ilha.add(p); p.traverse(m => { if (m.material?.userData?.janela) c.janelas.push(m.material); }); });
  caixa(ilha, 2, 14, 0.25, mat(0x7a5a3a), 6, -12, 0.5); for (let y = -18; y < -5; y += 2) for (const s of [-1, 1]) cil(ilha, 0.1, 0.1, 1.5, mat(0x5a3f2a), 6 + s * 0.9, y, 0);
  c.depois(t => { const k = Math.min(1, t / (c.o.dur || 11)); ilha.position.set(0, 190 - k * 140, 0); });
  // 0l (dono, 27 out): 4 boias com anúncio (era só 1), cada uma com o seu, aos dois lados do barco
  const boias = [], bitems = [];
  for (let k = 0; k < 4; k++) {
    const boia = new T.Group(); c.mundo.add(boia);
    cil(boia, 0.5, 0.6, 1.0, mat(0xcc092f, { roughness: 0.4 }), 0, 0, 0.2); cil(boia, 0.08, 0.08, 1.4, mat(0xdddddd), 0, 0, 1.2);
    const ad = texAd(c.adN(k), `barco:boia${k + 1}`); placa(boia, 2.0, 1.0, new T.MeshStandardMaterial({ map: ad, emissive: 0xffffff, emissiveMap: ad, emissiveIntensity: n * 0.5 }), 0, -0.05, 2.2); caixa(boia, 2.1, 0.06, 1.1, mat(0xcc092f), 0, 0.02, 2.2);
    boia.rotation.z = k % 2 ? 0.35 : -0.35;   // viradas para o barco
    boias.push(boia); bitems.push({ obj: boia, x: (k % 2 ? -1 : 1) * 4.5, y: 22 + k * 38 });
  }
  for (let k = 0; k < 3; k++) { const b = new T.Group(); caixa(b, 1.2, 3.6, 0.6, mat(0xf2f2f2, { roughness: 0.4 }), 0, 0, 0.1); caixa(b, 0.9, 1.0, 0.6, mat([0xcc092f, 0x2c6fb0, 0xf5b81c][k]), 0, -0.5, 0.6); c.mundo.add(b); b.rotation.z = r() * 6; bitems.push({ obj: b, x: (k % 2 ? -1 : 1) * (14 + r() * 30), y: 40 + k * 50 }); }
  c.aneis.push({ itens: bitems, L: 160, y0: -10, k: 1, g: null });
  c.depois(t => boias.forEach((b, k) => { b.rotation.y = Math.sin(t * 1.4 + k) * 0.08; b.position.z = Math.sin(t * 1.9 + k * 1.3) * 0.15; }));
  // o barco: casco branco, bancos com passageiros de colete laranja, toldo
  const v = c.veic; const i = new T.Group(); v.add(i);
  const casco = mat(0xf5f1e8, { roughness: 0.35 }), F = 0.7;
  caixa(i, 2.2, 5, 0.08, mat(0xd8d2c4, { roughness: 0.9 }), 0, 0.5, F);
  for (const s of [-1, 1]) { const b = caixa(i, 0.12, 5.2, 0.55, casco, s * 1.1, 0.5, F + 0.25); caixa(i, 0.06, 5, 0.04, mat(0x9aa1a8, { metalness: 0.8, roughness: 0.2 }), s * 1.1, 0.5, F + 0.95); for (let y = -1.5; y < 3; y += 1) cil(i, 0.015, 0.015, 0.45, mat(0x9aa1a8, { metalness: 0.8 }), s * 1.1, y, F + 0.72); }
  // proa
  const proa = new T.Shape([new T.Vector2(-1.1, 0), new T.Vector2(1.1, 0), new T.Vector2(0, 1.6)]);
  const pg = new T.ExtrudeGeometry(proa, { depth: 0.55, bevelEnabled: false }); const pm = new T.Mesh(pg, casco); pm.position.set(0, 3.0, F - 0.05); i.add(pm);
  caixa(i, 2.3, 1.6, 0.05, mat(0x2c6fb0, { roughness: 0.8 }), 0, -1.3, F + 2.0); for (const s of [-1, 1]) for (const y of [-2.0, -0.55]) cil(i, 0.025, 0.025, 1.3, mat(0x9aa1a8, { metalness: 0.8 }), s * 1.0, y, F + 1.35);
  const P = c.o.passageiros;
  [[-0.5, 1.6], [0.5, 1.6], [-0.5, 0.7], [0.5, 0.7]].forEach(([x, y], k) => { const p = sentar(i, { ...P[k], camisa: '#f07c2a' }, x, y, F); });
  for (const y of [1.62, 0.72, -0.2]) bancoComEncosto(i, 1.9, 0, y, F, mat(0xf2f2f2), mat(0xf2f2f2), 0.4);
  fixar(c, i);
  c.olhar(0.25, -0.75, F + 1.45, 0.1, 12, F + 0.6, 74);
  c.depois(t => { v.rotation.x = Math.sin(t * 1.2) * 0.03; v.rotation.y = Math.sin(t * 0.9) * 0.035; v.position.z = Math.sin(t * 1.2 + 0.5) * 0.12; });
  // salpicos à proa
  const N = 60, sp = new Float32Array(N * 3), sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const gotaTex = texCanvas(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const salp = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.06, map: gotaTex, transparent: true, opacity: 0.85, depthWrite: false })); salp.frustumCulled = false; v.add(salp);
  const gotas = Array.from({ length: N }, () => [0, 0, 0, 0, 0, 0, 9]);
  c.depois((t, dt) => { gotas.forEach((g, k) => { g[6] += dt; if (g[6] > 0.9) { const s = k % 2 ? 1 : -1; g.splice(0, 7, s * 0.9, 4.4, F, s * (1 + Math.random() * 2), -2 - Math.random() * 2, 1.5 + Math.random() * 2, Math.random() * 0.3); } g[0] += g[3] * dt; g[1] += g[4] * dt; g[5] -= 6 * dt; g[2] += g[5] * dt; sp.set(g.slice(0, 3), k * 3); }); sg.attributes.position.needsUpdate = true; });
}

/* ---- avião (e jato privado): corredor, janelas com nuvens a passar, hospedeira 3D com o panfleto ---- */
function texJanela(n) {
  return texCanvas(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, n > 0.5 ? '#0a1430' : '#2f86d6'); gr.addColorStop(0.6, n > 0.5 ? '#1a2550' : '#bfe6ff'); gr.addColorStop(1, n > 0.5 ? '#22284a' : '#f4f8ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 30; k++) { const x = Math.random() * w, y = h * (0.55 + Math.random() * 0.45), rr = 14 + Math.random() * 30; const c = g.createRadialGradient(x, y, 0, x, y, rr); c.addColorStop(0, n > 0.5 ? 'rgba(90,100,140,.6)' : 'rgba(255,255,255,.95)'); c.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = c; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    if (n > 0.5) { g.fillStyle = '#fff'; for (let k = 0; k < 40; k++) g.fillRect(Math.random() * w, Math.random() * h * 0.5, 1.5, 1.5); }
  }, [1, 1]);
}
function aviao(c, luxo) {
  c.vel = 0;
  const n = c.n, v = c.veic, i = new T.Group(); v.add(i);
  // fundo do céu visto pelas janelas: um céu à volta, mais nuvens grandes a passar lá fora
  const F = 0, W = 2.8, TOPO = 2.3, L = 14;
  const parede = mat(luxo ? 0xece2cf : 0xeef1f3, { roughness: 0.55 }), tapete = mat(luxo ? 0x7a5a3a : 0x5d6770, { roughness: 1 }), madeira = mat(0x5a3720, { roughness: 0.35, metalness: 0.1 }), ouro = mat(0xd4af37, { metalness: 0.9, roughness: 0.25 });
  caixa(i, W, L, 0.06, parede, 0, L / 2 - 2, F - 0.03); caixa(i, luxo ? 0.9 : 0.5, L, 0.07, tapete, 0, L / 2 - 2, F);
  // paredes curvas (meio cilindro por dentro)
  const tubo = new T.Mesh(new T.CylinderGeometry(1.55, 1.55, L, 40, 1, true, -Math.PI * 0.6, Math.PI * 1.2), new T.MeshStandardMaterial({ color: luxo ? 0xf2ead8 : 0xf4f6f8, roughness: 0.6, side: T.BackSide }));
  tubo.position.set(0, L / 2 - 2, 0.95); tubo.scale.set(1, 1, 0.95); i.add(tubo);
  for (const s of [-1, 1]) caixa(i, 0.06, L, 0.55, parede, s * 1.45, L / 2 - 2, 0.27);
  // janelas (com o céu a passar) e as luzes do teto
  const tj = texJanela(n); const jm = new T.MeshBasicMaterial({ map: tj }); tj.wrapS = T.RepeatWrapping;
  for (let y = -1; y < L - 2; y += luxo ? 1.6 : 0.85) for (const s of [-1, 1]) {
    const j = new T.Mesh(new T.CircleGeometry(0.15, 20), jm); j.scale.set(0.9, 1.35, 1); j.up.set(0, 0, 1); j.position.set(s * 1.47, y, 1.25); j.lookAt(0, y, 1.45); i.add(j);
    const aro = new T.Mesh(new T.RingGeometry(0.15, 0.19, 20), mat(luxo ? 0xd4af37 : 0xdfe3e6, { roughness: 0.4 })); aro.position.copy(j.position); aro.scale.copy(j.scale); aro.quaternion.copy(j.quaternion); aro.position.x -= s * 0.005; i.add(aro);
  }
  c.depois((t, dt) => { tj.offset.x = (t * 0.25) % 1; });
  const luzT = new T.MeshBasicMaterial({ color: luxo ? 0xc9ae7c : 0xc4cad2 });
  for (const [y, porta] of [[L - 2, true], [-2, false]]) { const d = new T.Mesh(new T.CircleGeometry(1.56, 40), mat(luxo ? 0xe6dcc8 : 0xe9ecef, { roughness: 0.6 })); d.up.set(0, 0, 1); d.position.set(0, y, 0.95); d.scale.set(1, 0.95, 1); d.lookAt(0, porta ? -10 : 10, 0.95); i.add(d);
    if (porta) { caixa(i, 0.7, 0.05, 1.85, mat(luxo ? 0x5a3720 : 0xb9c0c7, { roughness: 0.5 }), 0, y - 0.03, 0.93); caixa(i, 0.5, 0.02, 0.25, new T.MeshBasicMaterial({ color: 0x1a7a3a }), 0.0, y - 0.07, 2.0); } }
  for (let y = -1.5; y < L - 2.5; y += 1.2) caixa(i, 0.16, 0.5, 0.02, luzT, 0, y, 2.36);
  // atrás: a copa (armários de metal) e a cortina no corredor; no jato, uma porta de madeira com frisos dourados
  if (!luxo) { const inox = mat(0xc4cad0, { metalness: 0.6, roughness: 0.35 }); for (const s of [-1, 1]) { caixa(i, 1.0, 0.5, 1.9, inox, s * 0.85, -1.72, 0.95); for (let z = 0.3; z < 1.9; z += 0.4) caixa(i, 0.95, 0.01, 0.01, mat(0x8a9096), s * 0.85, -1.46, z); }
    const cort = new T.MeshStandardMaterial({ map: PANO('#2c6fb0', '#255f98'), roughness: 0.95, side: T.DoubleSide }); for (let k = 0; k < 6; k++) caixa(i, 0.12, 0.04, 1.95, cort, -0.3 + k * 0.12, -1.6 + (k % 2) * 0.04, 0.98); }
  else { caixa(i, 0.8, 0.06, 1.95, madeira, 0, -1.9, 0.98); caixa(i, 0.86, 0.04, 0.04, ouro, 0, -1.86, 1.96); for (const s of [-1, 1]) caixa(i, 0.04, 0.04, 1.95, ouro, s * 0.42, -1.86, 0.98); esfera(i, 0.03, ouro, 0.3, -1.86, 1.0); }
  const P = c.o.passageiros;
  if (!luxo) {
    // bagageiras, bancos 3+3 azuis com capas brancas, passageiros
    for (const s of [-1, 1]) { caixa(i, 0.9, L, 0.45, mat(0xe4e7ea, { roughness: 0.6 }), s * 1.05, L / 2 - 2, 2.05); for (let y = -1; y < L - 2; y += 1.7) caixa(i, 0.02, 0.02, 0.4, mat(0xb8bec4), s * 0.6, y, 2.05); }
    const azul = new T.MeshStandardMaterial({ map: PANO('#2c6fb0', '#255f98'), roughness: 0.9 }), capa = mat(0xf7f7f7);
    let k = 0;
    for (let fila = 0; fila < 12; fila++) {
      const y = 0.5 + fila * 0.85;
      for (const s of [-1, 1]) for (let b = 0; b < 3; b++) {
        const x = s * (0.42 + b * 0.43);
        bancoComEncosto(i, 0.4, x, y, F, azul, azul, 0.66); caixa(i, 0.36, 0.04, 0.16, capa, x, y - 0.33, F + 0.98);
        if ((fila * 7 + b * 3 + s) % 4 && fila < 11) sentar(i, P[k++ % P.length], x, y - 0.02, F);
      }
    }
    for (const s of [-1, 1]) for (let b = 0; b < 3; b++) bancoComEncosto(i, 0.4, s * (0.42 + b * 0.43), -0.35, F, azul, azul, 0.66);
  } else {
    // cabine de luxo: cadeirões de pele creme em pares virados uns para os outros, mesas de madeira, frisos dourados
    const pele = mat(0xe9dcc4, { roughness: 0.45 });
    for (const s of [-1, 1]) { caixa(i, 0.3, L, 0.6, madeira, s * 1.2, L / 2 - 2, 0.7); caixa(i, 0.32, L, 0.03, ouro, s * 1.2, L / 2 - 2, 1.01); }
    const cadeirao = (x, y, vira) => { const g = new T.Group(); g.position.set(x, y, 0); g.rotation.z = vira ? Math.PI : 0; i.add(g);
      caixa(g, 0.7, 0.62, 0.2, pele, 0, 0, 0.36); caixa(g, 0.7, 0.18, 0.75, pele, 0, -0.3, 0.75, -0.1); for (const sx of [-1, 1]) caixa(g, 0.12, 0.6, 0.22, pele, sx * 0.36, 0, 0.55); caixa(g, 0.6, 0.5, 0.25, mat(0x2a2522), 0, 0, 0.13); };
    // nós: cadeirão à direita, virado para a frente; à frente, um cadeirão virado para nós e a mesa com o champanhe
    for (const s of [-1, 1]) for (const y0 of [-0.2, 3.6]) { cadeirao(s * 0.82, y0, false); cadeirao(s * 0.82, y0 + 1.9, true); caixa(i, 0.6, 0.8, 0.04, madeira, s * 0.82, y0 + 0.95, 0.68); caixa(i, 0.62, 0.82, 0.01, ouro, s * 0.82, y0 + 0.95, 0.705);
      for (const dx of [-0.12, 0.14]) { cil(i, 0.035, 0.025, 0.12, new T.MeshPhysicalMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.5, roughness: 0.05 }), s * 0.82 + dx, y0 + 0.95 + dx, 0.79); cil(i, 0.006, 0.006, 0.08, mat(0xeeeeee), s * 0.82 + dx, y0 + 0.95 + dx, 0.73); } }
    sentar(i, P[1], -0.82, 1.7 - 0.0, 0, Math.PI); sentar(i, P[3], -0.82, -0.2, 0); sentar(i, P[2], 0.82, 5.5, 0, Math.PI);
  }
  // a hospedeira (ou o comissário, no jato) vem pelo corredor e mostra-te o panfleto
  const apH = luxo ? { pele: 3, cabelo: 1, corCabelo: 0, camisa: '#141012', calca: '#141012', roupa: 2 } : { pele: 2, cabelo: 4, corCabelo: 0, camisa: '#cc092f', calca: '#cc092f', roupa: 1 };
  const h = rig(apH); v.add(h); h.rotation.z = Math.PI;
  const chapeu = new T.Group(); if (!luxo) { cil(chapeu, 0.075, 0.085, 0.07, mat(0xcc092f, { roughness: 0.6 }), 0, 0, 0); caixa(chapeu, 0.17, 0.02, 0.02, mat(0xffcb00), 0, -0.07, -0.02); chapeu.position.set(0, 0.02, 1.38); h.add(chapeu); }
  fixar(c, i);
  // a hospedeira vem pelo corredor, para AO TEU LADO, vira-se para ti e mostra o panfleto nas mãos (à altura do peito, sem tapar a vista);
  // depois volta para a frente. Quem não quiser ver, olha pela janela (arrastar).
  const camX = luxo ? 0.78 : 0.24, camY = luxo ? -0.25 : -0.32;
  // 0l/0k-A (dono, 27 out): o panfleto fica muito mais tempo à vista (avião 9→31 s; jato 7→15 s)
  const ent = 3, chega = luxo ? 7 : 9, mostra = luxo ? 15 : 31, sai = mostra + 1.2, longe = mostra + 6;
  const yIni = luxo ? 9 : 10.5, pX = luxo ? 0.2 : -0.05, pY = camY + (luxo ? 1.45 : 0.95);
  const virar = Math.atan2(-(camX - pX), camY - pY);   // ângulo para ficar de frente para ti (o rig olha para +y)
  const panf = new T.Group(); h.add(panf); panf.visible = false;
  const fol = new T.Mesh(new T.PlaneGeometry(0.42, 0.26).rotateX(Math.PI / 2).rotateZ(Math.PI), new T.MeshBasicMaterial({ map: texAd(c.o.ad, luxo ? 'jato:panfleto' : 'aviao:panfleto') })); fol.position.y = 0.004; panf.add(fol);
  caixa(panf, 0.445, 0.004, 0.28, new T.MeshBasicMaterial({ color: 0xffffff }), 0, -0.001, 0);
  panf.position.set(0, 0.36, 1.0); panf.rotation.x = 0.32;   // nas mãos, inclinado para cima, para os teus olhos
  const angDe = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  c.depois((t, dt) => {
    h.visible = t > 1;
    if (t <= chega) { const k = Math.max(0, Math.min(1, (t - ent) / (chega - ent))); h.position.set(pX * k, yIni + (pY - yIni) * k, 0); h.rotation.z = Math.PI; h.userData.pose(t > ent && k < 1 ? 'andar' : 'parado', (t * 1.6) % 1); panf.visible = false; }
    else if (t <= mostra) { const k = Math.min(1, (t - chega) / 0.7); h.position.set(pX, pY, 0); h.rotation.z = angDe(Math.PI, virar, k); h.userData.pose(k < 1 ? 'parado' : 'mostrar'); panf.visible = k >= 1; }
    else { const k = Math.min(1, (t - sai) / (longe - sai)); panf.visible = false; h.rotation.z = angDe(virar, 0, Math.min(1, (t - mostra) / 0.8)); h.position.set(pX * (1 - k), pY + (yIni - pY) * Math.max(0, k), 0); h.userData.pose(t > sai && k < 1 ? 'andar' : 'parado', (t * 1.6) % 1); }
  });
  c.olhar(luxo ? 0.78 : 0.24, luxo ? -0.25 : -0.32, luxo ? 1.2 : 1.28, luxo ? 0.1 : -0.15, 8, luxo ? 0.75 : 0.85, 76);
  c.depois(t => { v.position.z = Math.sin(t * 1.3) * 0.006 + (Math.sin(t * 7.1) * Math.sin(t * 0.7) > 0.6 ? Math.sin(t * 31) * 0.006 : 0); v.rotation.y = Math.sin(t * 0.4) * 0.01; });
  c.cena.fog = null; c.hemi.intensity = luxo ? 1.0 : 1.2; c.sol.intensity = 0.8; c.sol.position.set(-20, 10, 30);
  const lz = new T.PointLight(luxo ? 0xffd9a0 : 0xffffff, luxo ? 3 : 2, 9, 1.2); lz.position.set(0, 2.5, 1.9); v.add(lz);
}

/* ---------- escolher a cena ---------- */
const CENAS = { candongueiro, autocarro, taxi, carro: carroProprio, mota: c => motaPropria(c, false), kupapata: c => motaPropria(c, true), comboio, barco, aviao: c => aviao(c, false), privado: c => aviao(c, true), fretado: c => aviao(c, true) };
function criar(o) {
  const _t = [performance.now()];
  const c = new Cena(o); _t.push(performance.now());
  (CENAS[o.meio === 'boleia' ? 'taxi' : o.meio] || CENAS.carro)(c); _t.push(performance.now());   // boleia: no banco de trás do carro de alguém
  if (c.chuva && o.meio !== 'aviao' && o.meio !== 'privado' && o.meio !== 'fretado') { const p = chuvaParticulas(c.chuva === 'tempestade'); c.veic.add(p); c.depois(t => p.userData.mexer(t, c.vel)); }
  if (c.chuva === 'tempestade' && o.meio !== 'aviao' && o.meio !== 'privado' && o.meio !== 'fretado') { let rel = 0; c.depois((t, dt) => { if (rel <= 0 && Math.random() < 0.004) rel = 0.25; if (rel > 0) { rel -= dt; c.hemi.intensity = 3 * rel / 0.25 + 0.6; } }); }
  if (o.meio !== 'aviao' && o.meio !== 'privado' && o.meio !== 'fretado') { const lz = new T.PointLight(0xffe6c0, c.n * 0.7, 3, 1.8); lz.position.set(0, 0.2, 1.2); c.veic.add(lz); }
  c.juntarAds();
  if (o.debug === 'fora') { c.veic.children.forEach(ch => { if (ch !== c.cam) ch.visible = false; }); c.olhar(-3, -10, 5, 3, 30, 2.5, 80); }
  // os shaders compilam em paralelo (sem prender o jogo); quando estiverem prontos o viagem.js mostra o 3D
  const pronto = (c.R.compileAsync ? c.R.compileAsync(c.cena, c.cam) : Promise.resolve()).catch(() => { }).then(() => { _t.push(performance.now()); V3D.tempos = _t.slice(1).map((x, k) => Math.round(x - _t[k])); });
  return { canvas: c.canvas, pronto, quadro: t => c.quadro(t), parar: () => c.parar(), rodar: (a, b) => c.rodar(a, b), get vista() { return [c.yaw || 0, c.pitch || 0]; }, foto: () => { c.quadro(c.tAnt); return c.canvas.toDataURL('image/png'); }, exposicao: () => c.adsVis.map(e => ({ id: e.ad && e.ad.id || 0, lugar: e.lugar, seg: Math.round(e.seg * 10) / 10 })), _c: c };
}
// aquecer: faz os modelos partilhados (prédios, árvores, carros) aos poucos, enquanto o jogador não está a fazer nada
function aquecer() {
  const tarefas = [...specsPredios('cidade').map((sp, i) => () => protoPredio('cidade', i, sp)), ...specsPredios('aldeia').map((sp, i) => () => protoPredio('aldeia', i, sp)),
    ...ARVORES.map(id => () => protoArvore(id)), ...[...new Set(CARROS_RUA)].map(id => () => protoCarro(id))];
  const passo = () => { const f = tarefas.shift(); if (!f) return; try { f(); } catch { } (window.requestIdleCallback || (cb => setTimeout(cb, 50)))(passo, { timeout: 3000 }); };
  passo();
}
setTimeout(aquecer, 1500);
window.V3D = { criar, info: () => R ? { calls: R.info.render.calls, tris: R.info.render.triangles } : null };
window.dispatchEvent(new Event('v3d-pronto'));
// peças partilhadas com o Jet Ski (js/jetski.js): o mesmo céu, prédios, árvores, personagens e renderizador
export { renderizador, mat, caixa, cil, esfera, texCanvas, semente, fundir, guardar, copia, instancias, porInst, feitoInst, protoPredio, protoArvore, specsPredios, ceu, rig, deitarFora, GUARDADOS, brilho, texAnuncio, texAd, outdoor3d, PROTOS };
