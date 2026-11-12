/* ============================================================
   Vida na Banda — a personagem 3D do ecrã de entrada (FILA 0ab, dono 30 out:
   «the character that's there should be the 3d character emoting, a different emote every time»).
   O mesmo modelo do jogo (pessoaRig de js/modelos3d.js), desenhado ao vivo no #pvGrande; muda quando mudas o visual.
   Cada visita começa num gesto diferente da anterior e depois vai variando. Sem WebGL fica o desenho de sempre.
   window.ENTRADA3D = { iniciar(canvas, ap), atualizar(ap), parar(), gesto(nome) }
   ============================================================ */
import * as T from './vendor/three/three.min.js';
import { pessoaRig } from './modelos3d.js';

const GESTOS = ['acenar', 'dancar', 'rir', 'palmas', 'vitoria', 'pensar'];
let R = null, cena, cam, g = null, cv = null, raf = 0, gesto = null, desde = 0, ultimoAp = null, primeiro = null;
const shade = (hex, k) => { const c = new T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function corDe(cam2, ap) {
  const est = ap.cabelo ?? 1, camisa = ap.camisa || '#e0313f';
  if (cam2 === 'pele') return PELES[ap.pele ?? 3] || PELES[3];
  if (cam2 === 'cima') return camisa;
  if (cam2 === 'baixo') return ap.calca || '#2a3b55';
  if (cam2 === 'cabelo') return est === 5 ? shade(camisa, 0.15) : (CORES_CABELO[ap.corCabelo ?? 0] || CORES_CABELO[0]);
  return null;
}
function construir(ap) {
  if (g) { cena.remove(g); g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); }
  g = pessoaRig(T, { roupa: Math.min(6, ap.roupa || 0), cabelo: ap.cabelo ?? 1, acc: ap.acess || [] });
  g.traverse(m => { if (!m.isMesh) return; const c = corDe(m.material.userData.camada, ap); if (c) m.material.color.set(c); if ((ap.cabelo ?? 1) === 0 && m.material.userData.camada === 'cabelo') m.visible = false; });
  g.rotation.z = 0.22;   // um pouco de lado, a olhar para quem está a criar a conta
  cena.add(g);
}
function proximo(inicio) {
  let ult = null, abriu = null; try { ult = localStorage.getItem('vel_gesto'); abriu = localStorage.getItem('vel_gesto_1'); } catch (e) { }
  const opcoes = GESTOS.filter(x => x !== gesto && x !== ult && !(inicio && x === abriu));   // cada visita abre com um gesto diferente da anterior
  gesto = opcoes[Math.floor(Math.random() * opcoes.length)];
  try { localStorage.setItem('vel_gesto', gesto); } catch (e) { }
  desde = performance.now();
}
function tamanho() {
  const w = cv.clientWidth || 260, h = cv.clientHeight || 330, pr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.floor(w * pr) || cv.height !== Math.floor(h * pr)) { R.setPixelRatio(pr); R.setSize(w, h, false); }
  cam.aspect = w / h; cam.updateProjectionMatrix();
}
// misturar duas poses: cada junta fica entre a pose parada e a do gesto (w 0 → 1), para entrar e sair sem saltos
const foto = () => g.userData.juntas.map(j => [j.rotation.x, j.rotation.y, j.rotation.z, j.position.x, j.position.y, j.position.z]);
const suave = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const ENTRA = 0.55, CHEIO = 3.0, SAI = 0.7, PAUSA = 1.0;   // segundos de cada parte do gesto
function quadro() {
  raf = requestAnimationFrame(quadro);
  if (!g || document.hidden) return;
  const agora = performance.now(), t = (agora - desde) / 1000;
  if (t > ENTRA + CHEIO + SAI + PAUSA) { proximo(); }
  const w = t < ENTRA ? suave(t / ENTRA) : t < ENTRA + CHEIO ? 1 : suave(1 - (t - ENTRA - CHEIO) / SAI);
  const resp = Math.sin(agora / 900);   // respirar: parada nunca fica rígida
  g.userData.pose('parado', 0); const P = foto();
  if (w > 0) {
    g.userData.pose(gesto, (t / 2) % 1); const G = foto();
    g.userData.juntas.forEach((j, k) => { const a = P[k], b = G[k];
      j.rotation.set(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w);
      j.position.set(a[3] + (b[3] - a[3]) * w, a[4] + (b[4] - a[4]) * w, a[5] + (b[5] - a[5]) * w); });
  }
  const cab = g.userData.juntas[g.userData.juntas.length - 1], corpo = g.userData.juntas[g.userData.juntas.length - 2];
  corpo.position.z += resp * 0.004; cab.rotation.z += Math.sin(agora / 1700) * 0.03 * (1 - w);
  g.rotation.z = 0.22 + Math.sin(performance.now() / 2600) * 0.08;
  tamanho(); R.render(cena, cam);
}
function iniciar(canvas, ap) {
  if (R) { atualizar(ap); return true; }
  try { R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { R = null; return false; }
  cv = canvas; R.outputColorSpace = T.SRGBColorSpace; R.setClearColor(0x000000, 0);
  cena = new T.Scene();
  cam = new T.PerspectiveCamera(30, 0.8, 0.1, 40); cam.up.set(0, 0, 1); cam.position.set(-0.4, 3.95, 1.2); cam.lookAt(0, 0, 0.86);   // o modelo olha para +y: a câmara fica à frente dele
  cena.add(new T.HemisphereLight(0xfff1dc, 0x3a2416, 1.6));
  const sol = new T.DirectionalLight(0xffe2b8, 2.4); sol.position.set(-2, 3, 4); cena.add(sol);
  const recorte = new T.DirectionalLight(0xffcb00, 1.2); recorte.position.set(3, -2, 2.5); cena.add(recorte);
  const sombra = new T.Mesh(new T.CircleGeometry(0.42, 40), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sombra.position.z = 0.002; cena.add(sombra);
  construir(ap); ultimoAp = JSON.stringify(ap); proximo(true); primeiro = gesto; try { localStorage.setItem('vel_gesto_1', gesto); } catch (e) { }
  raf = requestAnimationFrame(quadro);
  return true;
}
function atualizar(ap) { const k = JSON.stringify(ap); if (!R || k === ultimoAp) return; ultimoAp = k; construir(ap); }
function parar() { cancelAnimationFrame(raf); if (g) g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); try { R && R.dispose(); } catch (e) { } R = null; g = null; }
window.ENTRADA3D = { iniciar, atualizar, parar, gesto: n => { if (GESTOS.includes(n)) { gesto = n; desde = performance.now(); } }, get atual() { return gesto; }, get primeiro() { return primeiro; }, get juntas() { return g && g.userData.juntas; } };
