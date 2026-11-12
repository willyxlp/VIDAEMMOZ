/* Modelos 3D do Vida na Banda — usados pelo estúdio (tools/modelos, fotografa-os) e pelo mundo 3D em tempo real (js/mundo3d.js). Coordenadas do jogo: x e y no chão (quadrados), z para cima.
   A origem (0,0,0) de cada modelo é o ponto onde o jogo o "pousa". Os aviões apontam o nariz para +y. */

// ---------- utilitários ----------
export const QUALIDADE = { folhas: 1, seg: 1 };   // seg: detalhe das curvas (pessoas, copas, troncos)
const SEG = (n, min = 3) => Math.max(min, Math.round(n * QUALIDADE.seg));

function placa(T, pts, esp, eixo = 'z', bevel = 0.025, suave = 0) {
  // forma 2D (pts) extrudida com espessura esp; eixo = direção da espessura: 'z' (forma no plano x,y) ou 'x' (forma no plano y,z)
  // suave = n: os primeiros n pontos são ligados por uma curva (linha de cima dos carros), o resto por retas
  let s;
  if (suave > 2) {
    s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    s.splineThru(pts.slice(1, suave).map(([a, b]) => new T.Vector2(a, b)));
    for (const [a, b] of pts.slice(suave)) s.lineTo(a, b);
  } else s = new T.Shape(pts.map(([a, b]) => new T.Vector2(a, b)));
  const g = new T.ExtrudeGeometry(s, { depth: esp, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: suave ? SEG(5, 1) : SEG(3, 1), curveSegments: suave ? SEG(24, 6) : SEG(8, 3) });
  g.translate(0, 0, -esp / 2);
  if (eixo === 'x') g.applyMatrix4(new T.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));   // (a,b,d) → (d,a,b)
  g.computeVertexNormals();
  return g;
}
function torno(T, perfil, seg = 64, n = 120) {
  // corpo redondo ao longo de y: perfil = [[t, raio], …] (t ao longo do comprimento)
  const curva = new T.SplineCurve(perfil.map(([t, r]) => new T.Vector2(r, t)));
  const pts = curva.getPoints(n).map(p => new T.Vector2(Math.max(p.x, 0.0001), p.y));
  const g = new T.LatheGeometry(pts, seg);
  // v da textura proporcional ao comprimento (o spline não reparte os pontos por igual)
  const P = g.attributes.position, UV = g.attributes.uv, y0 = perfil[0][0], y1 = perfil[perfil.length - 1][0];
  for (let i = 0; i < P.count; i++) UV.setY(i, (P.getY(i) - y0) / (y1 - y0));
  return g;
}
const tinta = (T, o) => new T.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.12, ...o });
const metal = (T, cor, o = {}) => new T.MeshStandardMaterial({ color: cor, metalness: 0.85, roughness: 0.32, ...o });
const borracha = T => new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92, metalness: 0 });
const vidro = T => new T.MeshPhysicalMaterial({ color: 0x0d1b2a, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
function roda(T, r, l) { const g = new T.CylinderGeometry(r, r, l, SEG(28, 10)); g.rotateZ(Math.PI / 2); return g; }
function cilindro(T, r, h, eixo = 'z') { const g = new T.CylinderGeometry(r, r, h, 16); if (eixo === 'z') g.rotateX(Math.PI / 2); if (eixo === 'x') g.rotateZ(Math.PI / 2); return g; }
const M = (T, g, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(g, mat); m.position.set(x, y, z); return m; };
function espelho(T, obj) { const g = new T.Group(); g.add(obj); const e = new T.Group(); e.scale.x = -1; e.add(obj.clone()); return [g, e]; }

// pintura da fuselagem: u = à volta (0 topo, .25 lado direito +x, .5 barriga, .75 lado esquerdo), v = ao longo (0 cauda → 1 nariz)
function pintura(T, L, R, o) {
  const W = 2048, H = 4096, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const Y = t => (1 - t / L) * H, U = u => u * W, pu = 1 / (2 * Math.PI * R);   // pu: fração de u por quadrado
  g.fillStyle = o.base; g.fillRect(0, 0, W, H);
  g.fillStyle = o.barriga; g.fillRect(U(0.36), 0, U(0.28), H);
  // faixas laterais (afinam para a cauda e para o nariz)
  const faixa = (u0, larg, cor, t0, t1) => {
    g.fillStyle = cor;
    for (const lado of [1, -1]) {
      const uc = lado === 1 ? u0 : 1 - u0;
      g.beginPath(); g.moveTo(U(uc), Y(t0));
      g.bezierCurveTo(U(uc - lado * larg * 0.2), Y(t0 + 1.2), U(uc - lado * larg), Y(t0 + 1.4), U(uc - lado * larg), Y(t0 + 2.2));
      g.lineTo(U(uc - lado * larg), Y(t1 - 0.6)); g.quadraticCurveTo(U(uc - lado * larg), Y(t1), U(uc), Y(t1 + 0.15));
      g.lineTo(U(uc), Y(t0)); g.fill();
    }
  };
  if (o.faixa) faixa(0.335, 0.06, o.faixa, 0.4, L - 0.9);
  if (o.filete) faixa(0.272, 0.012, o.filete, 1.2, L - 1.3);
  // janelas da cabine (ovais) dos dois lados, um pouco acima do meio
  g.fillStyle = '#0e1a26';
  const jw = o.janL || 0.17, jh = o.janA || 0.21;
  for (let k = 0; k < (o.janelas || 0); k++) {
    const t = o.jan0 + k * o.janPasso;
    for (const uc of [0.205, 0.795]) {
      g.beginPath(); g.ellipse(U(uc), Y(t), (jh * pu * W) / 2, (jw / L * H) / 2, 0, 0, Math.PI * 2); g.fill();
    }
  }
  // para-brisas: banda escura à volta do topo do nariz, com corte inclinado
  g.fillStyle = '#0b1622';
  const pb0 = L - 0.95, pb1 = L - 0.5;
  if (o.parabrisas !== false) for (const [a, b, s] of [[0.0, 0.17, 1], [0.83, 1.0, -1]]) {
    g.beginPath(); g.moveTo(U(a), Y(pb1)); g.lineTo(U(b), Y(pb1 - 0.1)); g.lineTo(U(b), Y(pb0 + 0.12)); g.lineTo(U(a), Y(pb0 - 0.05)); g.fill();
  }
  // porta (lado esquerdo, à frente)
  g.strokeStyle = 'rgba(60,60,60,.55)'; g.lineWidth = 5;
  const pr = (u0, u1, t0, t1) => { g.beginPath(); g.roundRect(U(u0), Y(t1), U(u1 - u0), Y(t0) - Y(t1), 18); g.stroke(); };
  if (o.porta !== false) pr(0.76, 0.85, L - 1.75, L - 1.25);
  if (o.extra) o.extra(g, U, Y, pu, W, H);
  // matrícula angolana (D2-) atrás, nos dois lados
  if (o.matricula) {
    g.fillStyle = o.letras || '#222'; g.font = `700 ${Math.round(0.2 / L * H)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [uc, rot] of [[0.21, -Math.PI / 2], [0.79, Math.PI / 2]]) { g.save(); g.translate(U(uc), Y(1.55)); g.rotate(rot); g.scale(-1, 1); g.fillText(o.matricula, 0, 0); g.restore(); }
  }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; return tex;
}

// ---------- jato executivo ----------
function jato(T, o) {
  const grupo = new T.Group();
  const L = o.L, R = o.R, zc = R + 0.36;
  const corpo = torno(T, [[0, 0.04], [0.5, 0.15], [1.4, 0.3 * R / 0.42], [2.3, R * 0.97], [2.8, R], [L - 1.6, R], [L - 1.1, R * 0.96], [L - 0.7, R * 0.82], [L - 0.38, R * 0.58], [L - 0.14, R * 0.3], [L, 0.0]]);
  // cauda levantada e nariz ligeiramente para baixo
  const p = corpo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); let z = p.getZ(i);
    if (y < 2.4) z += Math.pow((2.4 - y) / 2.4, 1.6) * 0.3;
    if (y > L - 1.0) z -= Math.pow((y - (L - 1.0)) / 1.0, 2) * 0.07;
    p.setZ(i, z);
  }
  corpo.computeVertexNormals();
  const cor = tinta(T, { map: pintura(T, L, R, o.pintura), ...(o.tinta || {}) });
  grupo.add(M(T, corpo, cor, 0, 0, zc));
  const corAsa = tinta(T, { color: o.asa, ...(o.tinta || {}) });
  // asas (baixas, em flecha, com diedro) + winglets
  const asaG = new T.Group();
  const asa = new T.Mesh(placa(T, [[0, o.asaY + 1.55], [o.env, o.asaY + 0.55], [o.env, o.asaY + 0.05], [0, o.asaY]], 0.09, 'z', 0.035), corAsa);
  asa.rotation.y = -0.075; asaG.add(asa);
  const wl = new T.Mesh(placa(T, [[o.asaY + 0.02, 0], [o.asaY + 0.5, 0], [o.asaY + 0.25, 0.48], [o.asaY + 0.05, 0.48]], 0.05, 'x', 0.015), tinta(T, { color: o.winglet || o.asa }));
  wl.position.set(o.env - 0.02, 0, o.env * 0.075 + 0.02); wl.rotation.y = -0.25; asaG.add(wl);
  asaG.position.z = zc - R * 0.55;
  espelho(T, asaG).forEach(g => grupo.add(g));
  // deriva em T
  const zt = zc + R * 0.7;
  grupo.add(new T.Mesh(placa(T, [[0.2, zt - 0.1], [1.45, zt - 0.1], [0.45, zt + 1.05], [-0.05, zt + 1.05]], 0.08, 'x', 0.03), corAsa));
  const est = new T.Mesh(placa(T, [[0, 0.42], [0.95, 0.0], [0.95, -0.28], [0, -0.22]], 0.06, 'z', 0.02), corAsa);
  espelho(T, est).forEach(g => { g.position.z = zt + 1.07; grupo.add(g); });
  // motores na cauda
  const nac = torno(T, [[0, 0.15], [0.15, 0.19], [0.5, 0.22], [1.0, 0.21], [1.3, 0.17]], 40, 40);
  const motor = new T.Group();
  motor.add(M(T, nac, tinta(T, { color: o.motor || 0xf2f2f2, ...(o.tinta || {}) })));
  const boca = new T.Mesh(new T.CircleGeometry(0.14, 32), metal(T, 0x2b2f34)); boca.rotation.x = -Math.PI / 2; boca.position.y = 1.31; motor.add(boca);
  const esc = new T.Mesh(new T.CircleGeometry(0.15, 32), metal(T, 0x3a3a3a, { roughness: 0.6 })); esc.rotation.x = Math.PI / 2; esc.position.y = -0.01; motor.add(esc);
  motor.add(M(T, new T.BoxGeometry(0.4, 0.5, 0.06), tinta(T, { color: o.motor || 0xf2f2f2 }), -0.3, 0.6, 0));
  motor.position.set(R + 0.3, 1.15, zc + 0.15);
  espelho(T, motor).forEach(g => grupo.add(g));
  // trem de aterragem
  const pneu = borracha(T), haste = metal(T, 0x9aa1a8);
  const perna = (x, y, r) => { const g = new T.Group(); g.add(M(T, cilindro(T, 0.035, zc - R + 0.02 - r), haste, 0, 0, r + (zc - R - r) / 2)); g.add(M(T, roda(T, r, 0.1), pneu, 0.06, 0, r)); g.add(M(T, roda(T, r, 0.1), pneu, -0.06, 0, r)); g.position.set(x, y, 0); return g; };
  grupo.add(perna(0, L - 1.3, 0.1));
  grupo.add(perna(0.8, o.asaY + 0.45, 0.13), perna(-0.8, o.asaY + 0.45, 0.13));
  return grupo;
}


// ---------- avioneta (asa alta, hélice, trem fixo com carenagens) ----------
function avioneta(T, o) {
  const grupo = new T.Group(), L = 3.9, R = 0.34, zc = 0.62;
  const corpo = torno(T, [[0, 0.05], [0.4, 0.1], [1.3, 0.2], [2.0, 0.31], [2.5, R], [3.2, R], [3.55, 0.29], [3.8, 0.2], [L, 0.1]], 56, 90);
  const p = corpo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); let z = p.getZ(i);
    if (y < 2.0) z += Math.pow((2.0 - y) / 2.0, 1.3) * 0.22;                     // cauda sobe
    if (z > 0 && y > 2.0 && y < 3.4) z *= 1.18;                                  // cabine mais alta
    p.setZ(i, z); }
  corpo.computeVertexNormals();
  const pint = { base: '#f7f7f5', barriga: '#eceae6', faixa: o.cor, filete: '#1d2b44', parabrisas: false, porta: false,
    extra: (g, U, Y) => {
      g.fillStyle = '#0e1a26';
      for (const [u0, u1] of [[0.13, 0.25], [0.75, 0.87]]) { g.beginPath(); g.roundRect(U(u0), Y(3.25), U(u1 - u0), Y(2.45) - Y(3.25), 40); g.fill(); }
      for (const [a, b] of [[0.0, 0.13], [0.87, 1.0]]) { g.beginPath(); g.moveTo(U(a), Y(3.55)); g.lineTo(U(b), Y(3.5)); g.lineTo(U(b), Y(3.22)); g.lineTo(U(a), Y(3.2)); g.fill(); }
      g.fillStyle = o.cor; g.fillRect(U(0), Y(1.0), U(1), Y(0.6) - Y(1.0));
    } };
  const cor = tinta(T, { map: pintura(T, L, R, pint) });
  grupo.add(M(T, corpo, cor, 0, 0, zc));
  const branco = tinta(T, { color: 0xf5f5f3 }), vermelho = tinta(T, { color: o.cor });
  // asa alta, quase reta, com pontas pintadas
  const asaG = new T.Group();
  asaG.add(new T.Mesh(placa(T, [[0, 3.05], [2.35, 2.95], [2.5, 2.85], [2.5, 2.42], [0, 2.38]], 0.07, 'z', 0.03), branco));
  asaG.add(new T.Mesh(placa(T, [[2.2, 2.97], [2.5, 2.85], [2.5, 2.42], [2.2, 2.41]], 0.08, 'z', 0.03), vermelho));
  asaG.children.forEach(m => m.rotation.y = -0.03);
  // escora da asa
  const esc = new T.Mesh(cilindro(T, 0.025, 1.25, 'z'), metal(T, 0xdadada)); esc.position.set(0.85, 2.7, -0.38); esc.rotation.y = 1.0; asaG.add(esc);
  asaG.position.z = zc + R * 1.25;
  espelho(T, asaG).forEach(g => grupo.add(g));
  // cauda
  grupo.add(new T.Mesh(placa(T, [[0.05, zc + 0.15], [0.95, zc + 0.15], [0.35, zc + 0.95], [0.05, zc + 0.95]], 0.06, 'x', 0.02), vermelho));
  const est = new T.Mesh(placa(T, [[0, 0.6], [1.05, 0.42], [1.05, 0.12], [0, 0.05]], 0.05, 'z', 0.02), branco);
  espelho(T, est).forEach(g => { g.position.z = zc + 0.18; grupo.add(g); });
  // capô, cubo e hélice (dois braços + disco a girar)
  const cubo = new T.Mesh(new T.ConeGeometry(0.11, 0.22, 24), vermelho); cubo.rotation.x = -Math.PI / 2; cubo.position.set(0, L + 0.08, zc); grupo.add(cubo);
  const pa = new T.Mesh(new T.BoxGeometry(0.06, 0.03, 1.2), metal(T, 0x26282b, { roughness: 0.5 })); pa.position.set(0, L + 0.02, zc); pa.rotation.y = 0.5; grupo.add(pa);
  const disco = new T.Mesh(new T.CircleGeometry(0.62, 40), new T.MeshBasicMaterial({ color: 0x9aa3ab, transparent: true, opacity: 0.18, depthWrite: false }));
  disco.rotation.x = -Math.PI / 2; disco.position.set(0, L + 0.03, zc); grupo.add(disco);
  // trem fixo com carenagens
  const pneu = borracha(T), haste = metal(T, 0xd8d8d8);
  const rodaC = (x, y) => { const g = new T.Group(); g.add(M(T, roda(T, 0.13, 0.08), pneu, 0, 0, 0.13));
    const car = new T.Mesh(new T.SphereGeometry(0.15, 20, 14), branco); car.scale.set(0.55, 1.6, 0.9); car.position.z = 0.17; g.add(car);
    g.add(M(T, cilindro(T, 0.025, zc - 0.3, 'z'), haste, -Math.sign(x) * 0.08, 0, 0.3 + (zc - 0.3) / 2)); g.position.set(x, y, 0); return g; };
  grupo.add(rodaC(0.55, 2.55), rodaC(-0.55, 2.55), rodaC(0.001, 3.55));
  return grupo;
}

// ---------- helicóptero ----------
function helicoptero(T, o) {
  const grupo = new T.Group(), zc = 0.78;
  const Lc = 2.5, yc = 2.1;     // cabine começa em y=yc
  const corpo = torno(T, [[0, 0.18], [0.3, 0.42], [0.9, 0.56], [1.6, 0.58], [2.15, 0.48], [2.4, 0.3], [Lc, 0.02]], 56, 80);
  const p = corpo.attributes.position;
  for (let i = 0; i < p.count; i++) { let z = p.getZ(i), x = p.getX(i); if (z < 0) z *= 0.75; p.setZ(i, z); p.setX(i, x * 0.86); }
  corpo.computeVertexNormals();
  const pint = { base: o.cor, barriga: '#1b2231', faixa: '#f2f2f2', filete: '#ffcb00', parabrisas: false, porta: false,
    extra: (g, U, Y) => {
      g.fillStyle = '#0b1622';                                                     // bolha de vidro à frente e portas
      for (const [a, b] of [[0, 0.3], [0.7, 1]]) { g.beginPath(); g.moveTo(U(a), Y(Lc)); g.lineTo(U(b), Y(Lc)); g.lineTo(U(b), Y(1.75)); g.quadraticCurveTo(U((a + b) / 2), Y(1.45), U(a), Y(1.75)); g.fill(); }
      for (const [u0, u1] of [[0.14, 0.27], [0.73, 0.86]]) { g.beginPath(); g.roundRect(U(u0), Y(1.45), U(u1 - u0), Y(0.75) - Y(1.45), 30); g.fill(); }
    } };
  grupo.add(M(T, corpo, tinta(T, { map: pintura(T, Lc, 0.58, pint) }), 0, yc, zc));
  const azul = tinta(T, { color: o.cor });
  // cauda: viga, deriva e rotor de cauda
  const viga = torno(T, [[0, 0.07], [1.0, 0.09], [2.2, 0.16]], 24, 20); grupo.add(M(T, viga, azul, 0, 0.1, zc + 0.22));
  grupo.add(new T.Mesh(placa(T, [[0.05, zc + 0.1], [0.5, zc + 0.15], [0.3, zc + 0.85], [0.0, zc + 0.85]], 0.05, 'x', 0.02), azul));
  const est = new T.Mesh(placa(T, [[0, 0.75], [0.45, 0.7], [0.45, 0.5], [0, 0.48]], 0.04, 'z', 0.015), azul);
  espelho(T, est).forEach(g => { g.position.z = zc + 0.25; grupo.add(g); });
  const rc = new T.Group();
  for (const a of [0, Math.PI / 2]) { const pa = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.55), metal(T, 0x2a2a2a)); pa.rotation.x = a; rc.add(pa); }
  rc.position.set(0.09, 0.2, zc + 0.6); grupo.add(rc);
  // mastro e rotor principal (4 pás, ligeiramente rodadas)
  grupo.add(M(T, cilindro(T, 0.06, 0.32, 'z'), metal(T, 0x3a3d42), 0, yc + 1.15, zc + 0.6));
  grupo.add(M(T, new T.CylinderGeometry(0.13, 0.13, 0.08, 20).rotateX(Math.PI / 2), metal(T, 0x3a3d42), 0, yc + 1.15, zc + 0.78));
  for (let k = 0; k < 4; k++) {
    const pa = new T.Mesh(new T.BoxGeometry(0.16, 2.45, 0.025), metal(T, 0x2a2c30, { roughness: 0.55 }));
    const a = k * Math.PI / 2 + 0.35; pa.geometry.translate(0, 1.25, 0); pa.rotation.z = a; pa.position.set(0, yc + 1.15, zc + 0.8); grupo.add(pa);
  }
  // esquis
  const tubo = metal(T, 0x9aa1a8);
  for (const x of [0.48, -0.48]) {
    const esq = new T.Mesh(cilindro(T, 0.035, 2.2, 'y'), tubo); esq.position.set(x, yc + 1.1, 0.05); grupo.add(esq);
    for (const y of [yc + 0.5, yc + 1.6]) { const pe = new T.Mesh(cilindro(T, 0.028, 0.42, 'z'), tubo); pe.position.set(x * 0.8, y, 0.24); pe.rotation.y = -Math.sign(x) * 0.42; grupo.add(pe); }
  }
  return grupo;
}

// ---------- carros ----------
// Perfil lateral (y ao longo, z para cima) extrudido na largura, com cavas das rodas recortadas, pontas arredondadas em planta,
// habitáculo à parte e vidros por cima. A origem é o canto (0,0) de um retângulo 1×2: o carro fica centrado em x=0.5, frente para +y.
function perfilCarro(o) {
  const ra = o.r + 0.03, zc = o.r, [yr, yf] = o.rodas, pts = [...o.topo];
  const arco = yc => { const out = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; const p = [yc + ra * Math.cos(a), zc + ra * Math.sin(a)]; if (p[1] > o.c) out.push(p); } return out; };
  pts.push([o.L - 0.05, o.c], [yf + ra, o.c], ...arco(yf), [yf - ra, o.c], [yr + ra, o.c], ...arco(yr), [yr - ra, o.c], [0.05, o.c]);
  return pts;
}
function quad(T, a, b, c, d, mat) {
  const g = new T.BufferGeometry(); const v = [a, b, c, a, c, d].flat();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return new T.Mesh(g, mat);
}
// 6 nov (Gold Exclusive C): acabamento com Ouro (dourado / diamante) — vale só enquanto se constrói o modelo «<id>__ouro» / «<id>__diamante»
let ACAB_ATUAL = null;
function tintaAcab(T) {
  if (ACAB_ATUAL === 'ouro') return new T.MeshPhysicalMaterial({ color: 0xa87a12, metalness: 1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.12 });
  if (ACAB_ATUAL !== 'diamante') return null;
  // perolado com brilhos: pontinhos que acendem conforme a posição (não precisa de UV nem de imagem)
  const m = new T.MeshPhysicalMaterial({ color: 0xd3dcf3, metalness: 0.6, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 800], sheen: 0.8, sheenColor: new T.Color(0xb9d2ff) });
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vBrilho;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vBrilho = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vBrilho;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  { float hb = fract(sin(dot(floor(vBrilho * 70.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\n    totalEmissiveRadiance += vec3(0.85, 0.92, 1.0) * step(0.972, hb) * 3.0; }');
  };
  m.customProgramCacheKey = () => 'acab-diamante';
  return m;
}
function carro(T, o) {
  const grupo = new T.Group(), W = o.W, L = o.L, x0 = 0.5, y0 = (2 - L) / 2;
  const caixa = new T.Group(); caixa.position.set(x0, y0, 0); grupo.add(caixa);
  const acab = tintaAcab(T);
  const pintura = acab || o.tintaMat || tinta(T, { color: o.cor, ...(o.velho ? { roughness: 0.62, clearcoat: 0, metalness: 0.05 } : {}), ...(o.ouro ? { metalness: 0.75, roughness: 0.22 } : {}) });
  // carroçaria
  // linha de cima suave: os pontos do topo (menos o 1.º e o último, que são os cantos de baixo) passam por uma curva
  const g = placa(T, perfilCarro(o), W - 0.12, 'x', 0.06, o.topo.length - 1);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), t = Math.abs(y - L / 2) / (L / 2);
    const f = 1 - (o.redondo ?? 0.1) * Math.pow(Math.max(0, (t - 0.82) / 0.18), 2);   // só as pontas encolhem um pouco
    P.setX(i, P.getX(i) * f);
  }
  g.computeVertexNormals();
  caixa.add(new T.Mesh(g, pintura));
  // habitáculo (tejadilho e pilares na cor do carro, ou noutra cor)
  const [cr, crt, cft, cf] = o.cab, Wc = W * (o.cabLarg || 0.8), bz = o.belt - 0.02;
  const cabPts = [[cr, bz], [crt, o.roof], [cft, o.roof], [cf, bz]];
  const corCab = acab ? acab : o.corCab ? tinta(T, { color: o.corCab, ...(o.ouro ? { metalness: 0.75, roughness: 0.22 } : {}) }) : pintura;
  const cab = placa(T, cabPts, Wc - 0.08, 'x', 0.04), cabM = new T.Mesh(cab, corCab); cabM.userData.cabine = true; caixa.add(cabM);
  grupo.userData.carro = { W, L, Wc, c: o.c, belt: o.belt, roof: o.roof, cab: o.cab, topo: o.topo, rodas: o.rodas, janelas: o.janelas || 2, corCab, pintura };   // 7 nov: o Stand (poses com o carro) abre portas e janelas
  // vidros
  const vid = vidro(T), hx = Wc / 2 + 0.006, e = 0.026;
  const n = (a, b) => { const dy = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dy, dz); return [dz / l, -dy / l]; };
  const pano = (a, b, sinal) => {   // vidro inclinado entre a (base) e b (topo), um pouco por fora
    const [ny, nz] = n(a, b).map(v => v * sinal * e);
    const A = [a[0] + ny, a[1] + nz + 0.012], B = [b[0] + ny, b[1] + nz - 0.012];
    caixa.add(quad(T, [-hx + 0.03, ...A], [hx - 0.03, ...A], [hx - 0.05, ...B], [-hx + 0.05, ...B], vid)).children.at(-1).userData.vidro = (sinal > 0 ? 'frente' : 'tras');
    caixa.add(quad(T, [hx - 0.03, ...A], [-hx + 0.03, ...A], [-hx + 0.05, ...B], [hx - 0.05, ...B], vid)).children.at(-1).userData.vidro = (sinal > 0 ? 'frente' : 'tras');
  };
  pano([cf, bz], [cft, o.roof], 1);                 // para-brisas
  pano([cr, bz], [crt, o.roof], -1);                // vidro de trás
  // janelas laterais (divididas por pilares)
  const nJan = o.janelas || 2, zb = bz + 0.04, zt = o.roof - 0.035;
  const ladoY = z => { const k = (z - bz) / (o.roof - bz); return [cr + (crt - cr) * k + 0.04, cf + (cft - cf) * k - 0.04]; };
  const [rb0, fb0] = ladoY(zb), [rt0, ft0] = ladoY(zt);
  for (let j = 0; j < nJan; j++) {
    const a = j / nJan, b = (j + 1) / nJan, gap = 0.025;
    const yb0 = rb0 + (fb0 - rb0) * a + (j ? gap : 0), yb1 = rb0 + (fb0 - rb0) * b - (j < nJan - 1 ? gap : 0);
    const yt0 = rt0 + (ft0 - rt0) * a + (j ? gap : 0), yt1 = rt0 + (ft0 - rt0) * b - (j < nJan - 1 ? gap : 0);
    for (const sx of [1, -1]) {
      const X = sx * (hx + 0.002);
      const pts = [[X, yb0, zb], [X, yb1, zb], [X, yt1, zt], [X, yt0, zt]];
      caixa.add(sx > 0 ? quad(T, ...pts, vid) : quad(T, pts[1], pts[0], pts[3], pts[2], vid)); caixa.children.at(-1).userData.vidro = { lado: sx, jan: j, de: nJan };
    }
  }
  // rodas: pneu + jante
  const pneu = borracha(T), jante = ACAB_ATUAL === 'ouro' ? metal(T, 0xe0b53a, { roughness: 0.15 }) : metal(T, o.jante || 0xc9ccd0, { roughness: ACAB_ATUAL === 'diamante' ? 0.1 : 0.25 });
  for (const y of o.rodas) for (const sx of [1, -1]) {
    caixa.add(M(T, roda(T, o.r, 0.11), pneu, sx * (W / 2 - 0.07), y, o.r));
    caixa.add(M(T, roda(T, o.r * 0.62, 0.115), jante, sx * (W / 2 - 0.068), y, o.r));
  }
  // faróis, farolins, grelha, matrículas, espelhos
  const luz = new T.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff3c4, emissiveIntensity: 0.6, roughness: 0.2 });
  const tras = new T.MeshStandardMaterial({ color: 0xc8102e, emissive: 0x8a0a1e, emissiveIntensity: 0.5, roughness: 0.3 });
  const preto = new T.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 });
  const branco = new T.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  const zF = o.zFarol ?? (o.topo.find(p => p[0] >= L - 0.01)?.[1] ?? 0.3) - 0.04;
  for (const sx of [1, -1]) {
    caixa.add(M(T, new T.BoxGeometry(0.15, 0.03, 0.045), luz, sx * (W / 2 - 0.17), L - 0.008, zF));
    caixa.add(M(T, new T.BoxGeometry(0.14, 0.03, 0.045), tras, sx * (W / 2 - 0.17), 0.008, (o.zTras ?? zF)));
    caixa.add(M(T, new T.BoxGeometry(0.05, 0.035, 0.03), corCab, sx * (Wc / 2 + 0.04), cf - 0.02, bz + 0.03));
  }
  caixa.add(M(T, new T.BoxGeometry(W * 0.36, 0.03, 0.07), preto, 0, L - 0.006, zF - 0.08));
  caixa.add(M(T, new T.BoxGeometry(0.16, 0.02, 0.045), branco, 0, L + 0.005, o.c + 0.06));
  caixa.add(M(T, new T.BoxGeometry(0.16, 0.02, 0.045), branco, 0, -0.005, o.c + 0.08));
  if (o.extra) o.extra(T, caixa, { pintura, preto, metal: metal(T, 0x9aa1a8), pneu, jante, W, L });
  return grupo;
}

// ---------- animais de estimação (8 nov): o que anda contigo no 3D (cão, gato, galinha, papagaio no ombro, cavalo branco) ----------
// Origem no chão, frente para +y (como as pessoas). O papagaio tem a origem no ombro (quem o usa põe-no lá).
export function animal3d(T, tipo) {
  const g = new T.Group(), m = (cor, r = 0.8, met = 0) => new T.MeshStandardMaterial({ color: cor, roughness: r, metalness: met });
  const esf = (rr, mt, x, y, z, sx = 1, sy = 1, sz = 1) => { const me = new T.Mesh(new T.SphereGeometry(rr, SEG(16, 8), SEG(12, 6)), mt); me.scale.set(sx, sy, sz); me.position.set(x, y, z); g.add(me); return me; };
  const cil = (r, h, mt, x, y, z) => { const me = new T.Mesh(new T.CylinderGeometry(r, r * 0.85, h, SEG(10, 6)), mt); me.rotation.x = Math.PI / 2; me.position.set(x, y, z + h / 2); g.add(me); return me; };
  const olho = (x, y, z) => esf(0.008, m(0x111111, 0.3), x, y, z);
  if (tipo === 'cao' || tipo === 'gato') {
    const cao = tipo === 'cao', c = m(cao ? 0xa8743f : 0x5b5b66), s = cao ? 1 : 0.8;
    for (const [x, y] of [[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.1], [0.05, -0.1]]) cil(0.018 * s, 0.14 * s, c, x * s, y * s, 0);
    esf(0.08 * s, c, 0, 0, 0.18 * s, 0.9, 1.9, 0.85);
    esf(0.065 * s, c, 0, 0.17 * s, 0.26 * s);
    if (cao) { esf(0.035, c, 0, 0.23, 0.24, 1, 1.3, 0.8); for (const sx of [-1, 1]) esf(0.025, m(0x7a5230), sx * 0.05, 0.16, 0.3, 0.6, 0.6, 1.4); }
    else for (const sx of [-1, 1]) { const o = new T.Mesh(new T.ConeGeometry(0.02, 0.05, 6), c); o.rotation.x = Math.PI / 2; o.position.set(sx * 0.03, 0.15 * s, 0.32 * s); g.add(o); }
    for (const sx of [-1, 1]) olho(sx * 0.025 * s, 0.22 * s, 0.28 * s);
    const cauda = cil(0.012, 0.14 * s, c, 0, -0.17 * s, 0.17 * s); cauda.rotation.x = -0.6;
  } else if (tipo === 'galinhas') {
    const b = m(0xf4efe6);
    esf(0.07, b, 0, 0, 0.12, 0.9, 1.2, 1); esf(0.04, b, 0, 0.07, 0.2); esf(0.015, m(0xe0313f), 0, 0.07, 0.245, 1, 1.4, 1);
    const bico = new T.Mesh(new T.ConeGeometry(0.012, 0.03, 6), m(0xf5b81c)); bico.rotation.x = -Math.PI / 2; bico.position.set(0, 0.11, 0.2); g.add(bico);
    for (const sx of [-1, 1]) cil(0.006, 0.06, m(0xf5b81c), sx * 0.02, 0, 0);
  } else if (tipo === 'papagaio') {
    const cinza = m(0x9aa3ab), claro = m(0xc4cbd1);
    esf(0.032, cinza, 0, 0, 0.04, 0.9, 1, 1.3); esf(0.025, claro, 0, 0.012, 0.09);
    esf(0.012, m(0xf4f2ee), 0, 0.03, 0.093);
    const bico = new T.Mesh(new T.ConeGeometry(0.01, 0.025, 6), m(0x1d1d1f, 0.4)); bico.rotation.x = -Math.PI / 2 - 0.4; bico.position.set(0, 0.04, 0.085); g.add(bico);
    const cauda = new T.Mesh(new T.BoxGeometry(0.02, 0.012, 0.06), m(0xc63a2c)); cauda.position.set(0, -0.025, -0.01); cauda.rotation.x = 0.4; g.add(cauda);
    for (const sx of [-1, 1]) olho(sx * 0.014, 0.025, 0.1);
  } else if (tipo === 'cavalo_branco') {
    const b = m(0xf4f2ee, 0.6), crina = m(0xc9c3b8, 0.9), casco = m(0x3a3a3a);
    for (const [x, y] of [[-0.09, 0.28], [0.09, 0.28], [-0.09, -0.26], [0.09, -0.26]]) { cil(0.03, 0.55, b, x, y, 0.04); cil(0.034, 0.05, casco, x, y, 0); }
    esf(0.17, b, 0, 0, 0.72, 0.85, 2.3, 0.95);
    const pesc = cil(0.07, 0.36, b, 0, 0.36, 0.72); pesc.rotation.x = Math.PI / 2 - 0.65;
    esf(0.07, b, 0, 0.56, 1.02, 0.85, 1.9, 0.9);
    const cr = new T.Mesh(new T.BoxGeometry(0.03, 0.06, 0.34), crina); cr.position.set(0, 0.33, 0.95); cr.rotation.x = 0.65; g.add(cr);
    const cauda = cil(0.03, 0.4, crina, 0, -0.38, 0.4); cauda.rotation.x = -0.35;
    for (const sx of [-1, 1]) { olho(sx * 0.055, 0.6, 1.06); const o = new T.Mesh(new T.ConeGeometry(0.02, 0.06, 6), b); o.rotation.x = Math.PI / 2; o.position.set(sx * 0.03, 0.47, 1.1); g.add(o); }
    const sela = new T.Mesh(new T.BoxGeometry(0.3, 0.26, 0.04), m(0x7a1f2b, 0.6)); sela.position.set(0, 0.02, 0.88); g.add(sela);
    const friso = new T.Mesh(new T.BoxGeometry(0.31, 0.27, 0.012), m(0xd4af37, 0.25, 0.9)); friso.position.set(0, 0.02, 0.9); g.add(friso);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- 0cz-8: monolugar de F1 (origem = canto de um retângulo 1×2, frente para +y; um pouco mais comprido que um carro) ----------
function f1(T, o) {
  const grupo = new T.Group(), c = new T.Group(); c.position.set(0.5, 0, 0); grupo.add(c);
  const corpo = tinta(T, { color: o.cor }), acento = tinta(T, { color: o.acento }), carbono = new T.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.45, metalness: 0.3 });
  const pneu = borracha(T), jante = metal(T, o.jante || 0x2a2c30, { roughness: 0.3 }), preto = new T.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.6 });
  c.add(M(T, new T.BoxGeometry(0.6, 1.55, 0.03), carbono, 0, 1.0, 0.05));                        // fundo plano
  const nariz = new T.Mesh(torno(T, [[0, 0.06], [0.25, 0.14], [0.75, 0.15], [1.2, 0.1], [1.6, 0.055], [1.78, 0.02]], SEG(28, 10), 60), corpo);
  nariz.scale.set(1.15, 1, 0.78); nariz.position.set(0, 0.32, 0.2); c.add(nariz);                // monocoque + bico
  for (const sx of [1, -1]) {
    c.add(M(T, new T.BoxGeometry(0.17, 0.72, 0.15), corpo, sx * 0.23, 0.82, 0.15));               // pontões
    c.add(M(T, new T.BoxGeometry(0.13, 0.04, 0.1), preto, sx * 0.23, 1.19, 0.15));                // entradas de ar
    c.add(M(T, new T.BoxGeometry(0.02, 0.2, 0.11), acento, sx * 0.43, 2.0, 0.1));                 // placas da asa da frente
    c.add(M(T, new T.BoxGeometry(0.02, 0.2, 0.3), acento, sx * 0.3, 0.04, 0.34));                 // placas da asa de trás
  }
  c.add(M(T, new T.BoxGeometry(0.2, 0.6, 0.17), corpo, 0, 0.5, 0.27));                            // tampa do motor
  c.add(M(T, new T.BoxGeometry(0.03, 0.55, 0.12), corpo, 0, 0.42, 0.4));                          // barbatana
  c.add(M(T, new T.BoxGeometry(0.15, 0.3, 0.04), preto, 0, 1.22, 0.29));                          // cockpit
  c.add(M(T, new T.SphereGeometry(0.07, 16, 12), acento, 0, 1.14, 0.33));                         // capacete
  const halo = new T.Mesh(new T.TorusGeometry(0.1, 0.012, 8, 20, Math.PI), carbono); halo.rotation.x = 0; halo.position.set(0, 1.22, 0.33); halo.rotation.z = Math.PI; c.add(halo);
  c.add(M(T, new T.BoxGeometry(0.02, 0.02, 0.08), carbono, 0, 1.33, 0.32));
  c.add(M(T, new T.BoxGeometry(0.86, 0.16, 0.025), acento, 0, 2.0, 0.065));                       // asa da frente
  c.add(M(T, new T.BoxGeometry(0.8, 0.07, 0.02), corpo, 0, 1.95, 0.1));
  c.add(M(T, new T.BoxGeometry(0.6, 0.13, 0.03), corpo, 0, 0.04, 0.46));                          // asa de trás
  c.add(M(T, new T.BoxGeometry(0.6, 0.08, 0.025), acento, 0, 0.09, 0.4));
  c.add(M(T, new T.BoxGeometry(0.04, 0.05, 0.2), carbono, 0, 0.12, 0.3));
  for (const [y, r, l] of [[1.68, 0.16, 0.13], [0.3, 0.175, 0.17]]) for (const sx of [1, -1]) {
    c.add(M(T, roda(T, r, l), pneu, sx * 0.42, y, r));
    c.add(M(T, roda(T, r * 0.6, l + 0.005), jante, sx * 0.42, y, r));
    c.add(M(T, new T.BoxGeometry(0.3, 0.02, 0.015), carbono, sx * 0.22, y, r + 0.02));          // braços da suspensão
  }
  return grupo;
}
// ---------- 0cz-8: super-iate num berço (origem = canto; proa para +y; ~1,5 × 6 quadrados) ----------
function iate(T, o) {
  const grupo = new T.Group(), c = new T.Group(); c.position.set(0.75, 0, 0); grupo.add(c);
  const branco = tinta(T, { color: 0xf4f4f2 }), azul = tinta(T, { color: o.casco || 0x14233d }), ouro = metal(T, 0xd9ad2b, { roughness: 0.22 });
  const vid = vidro(T), teca = new T.MeshStandardMaterial({ color: 0xb88a5a, roughness: 0.8 }), ferro = metal(T, 0x3a3d42, { roughness: 0.5 });
  const casco = (k, z, h, mat) => { const w = 0.72 * k; const g = placa(T, [[-w, 0.1], [w, 0.1], [w, 4.0], [w * 0.6, 5.3], [0, 6.0], [-w * 0.6, 5.3], [-w, 4.0]], h, 'z', 0.03); const m = new T.Mesh(g, mat); m.position.z = z + h / 2; c.add(m); };
  for (const y of [1.0, 2.6, 4.2]) for (const sx of [1, -1]) c.add(M(T, new T.BoxGeometry(0.12, 0.3, 0.36), ferro, sx * 0.42, y, 0.18));   // berço
  casco(0.9, 0.34, 0.26, azul); casco(1.0, 0.6, 0.38, branco);
  for (const sx of [1, -1]) c.add(M(T, new T.BoxGeometry(0.02, 3.9, 0.035), ouro, sx * 0.735, 2.05, 0.62));   // filete dourado
  c.add(M(T, new T.BoxGeometry(1.3, 1.1, 0.02), teca, 0, 0.7, 1.0));                                         // convés de trás
  const nivel = (w, y0, y1, z, h, jan) => {
    c.add(M(T, new T.BoxGeometry(w, y1 - y0, h), branco, 0, (y0 + y1) / 2, z + h / 2));
    if (jan) c.add(M(T, new T.BoxGeometry(w + 0.02, y1 - y0 - 0.12, h * 0.4), vid, 0, (y0 + y1) / 2, z + h * 0.52));
  };
  nivel(1.12, 1.3, 4.3, 0.98, 0.36, true); nivel(0.92, 1.6, 3.7, 1.34, 0.32, true); nivel(0.7, 2.0, 3.1, 1.66, 0.24, true);
  c.add(M(T, new T.BoxGeometry(0.9, 0.2, 0.18), vid, 0, 4.35, 1.1).rotateX(-0.6));                          // para-brisas
  c.add(M(T, new T.BoxGeometry(0.6, 0.9, 0.04), branco, 0, 2.4, 1.94));                                     // tejadilho da ponte
  const mastro = new T.Mesh(cilindro(T, 0.03, 0.5, 'z'), ouro); mastro.position.set(0, 2.55, 2.2); c.add(mastro);
  c.add(M(T, new T.SphereGeometry(0.09, 16, 10), branco, 0, 2.55, 2.45));                                    // radar
  c.add(M(T, new T.BoxGeometry(0.5, 0.03, 0.03), ouro, 0, 2.55, 2.3));
  return grupo;
}

// ---------- motas ----------
function mota(T, o) {
  const grupo = new T.Group(), c = new T.Group(); c.position.set(0.5, 0.45, 0); grupo.add(c);
  const corpo = tintaAcab(T) || tinta(T, { color: o.cor }), preto = new T.MeshStandardMaterial({ color: 0x16181b, roughness: 0.55 }), cromado = metal(T, 0xd5d8dc, { roughness: 0.18 });
  const r = o.r || 0.15, L = o.L || 1.0;
  for (const y of [0.0, L]) { c.add(M(T, roda(T, r, 0.06), borracha(T), 0, y, r)); c.add(M(T, roda(T, r * 0.55, 0.065), cromado, 0, y, r)); }
  for (const [pts, w, mat] of o.pecas(r, L)) c.add(new T.Mesh(placa(T, pts, w, 'x', 0.02), mat === 'p' ? preto : mat === 'c' ? cromado : corpo));
  // garfo, guiador, farol, escape
  const garfo = new T.Mesh(cilindro(T, 0.018, 0.5, 'z'), cromado); garfo.position.set(0, L - 0.08, r + 0.25); garfo.rotation.x = -0.35; c.add(garfo);
  c.add(M(T, new T.BoxGeometry(0.34, 0.03, 0.03), preto, 0, L - 0.16, (o.zGuiador || 0.6)));
  c.add(M(T, new T.SphereGeometry(0.045, 16, 12), new T.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff3c4, emissiveIntensity: 0.6 }), 0, L - 0.05, (o.zGuiador || 0.6) - 0.06));
  const esc = new T.Mesh(cilindro(T, 0.03, 0.45, 'y'), cromado); esc.position.set(0.09, 0.2, r + 0.03); esc.rotation.x = 0.15; c.add(esc);
  return grupo;
}

// ---------- pessoas (protótipo do #37: uma pose, de pé, virada para a câmara) ----------
// Altura = 1.33 quadrados (o mesmo tamanho das personagens de hoje). Origem nos pés.
function pessoa(T, o) {
  const g = new T.Group(), c = new T.Group(); g.add(c); c.rotation.z = -Math.PI / 4;   // de frente para quem vê
  const pele = new T.MeshPhysicalMaterial({ color: o.pele, roughness: 0.48, sheen: 0.4, sheenColor: new T.Color(0xffd9c0), clearcoat: 0.08 });
  const tecido = cor => new T.MeshStandardMaterial({ color: cor, roughness: 0.88, metalness: 0 });
  const camisa = tecido(o.camisa), calca = tecido(o.calca), sapato = new T.MeshStandardMaterial({ color: o.sapato || 0x1d1d1f, roughness: 0.4 });
  const cabelo = new T.MeshStandardMaterial({ color: o.cabelo, roughness: 0.95 });
  const caps = (r, l, mat, x, y, z, rx = 0, ry = 0) => { const m = new T.Mesh(new T.CapsuleGeometry(r, l, 8, 18), mat); m.rotation.x = Math.PI / 2 + rx; m.rotation.y = ry; m.position.set(x, y, z); c.add(m); return m; };
  const esf = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(new T.SphereGeometry(r, 28, 20), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); c.add(m); return m; };
  const vestido = o.roupa === 'vestido', fato = o.roupa === 'fato';
  const corTronco = fato ? tecido(0x23262c) : camisa, corPernas = fato ? tecido(0x23262c) : vestido ? pele : calca;
  // pernas e sapatos
  for (const sx of [1, -1]) {
    caps(0.052, 0.5, corPernas, sx * 0.068, 0, 0.36, 0, sx * 0.03);
    const sp = esf(0.05, sapato, sx * 0.07, 0.035, 0.035, 0.85, 1.7, 0.6);
  }
  // tronco (torno à volta de z, mais estreito de frente para trás)
  const perfil = [[0.0, 0.6], [0.125, 0.61], [0.135, 0.66], [0.112, 0.79], [0.135, 0.94], [0.15, 1.04], [0.11, 1.09], [0.05, 1.11], [0.0, 1.115]];
  const tr = new T.LatheGeometry(perfil.map(([r, z]) => new T.Vector2(r, z)), 40); tr.rotateX(Math.PI / 2); tr.scale(1, 0.62, 1);
  c.add(new T.Mesh(tr, corTronco));
  if (!vestido && !fato) { const cinto = new T.Mesh(new T.CylinderGeometry(0.127, 0.127, 0.035, 40).rotateX(Math.PI / 2).scale(1, 0.62, 1), new T.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.5 })); cinto.position.z = 0.63; c.add(cinto); }
  if (vestido) {
    const saia = new T.LatheGeometry([[0.205, 0.44], [0.19, 0.52], [0.155, 0.66], [0.125, 0.76], [0.113, 0.8]].map(([r, z]) => new T.Vector2(r, z)), 48);
    saia.rotateX(Math.PI / 2); saia.scale(1, 0.75, 1);
    const ms = tecido(o.camisa); ms.side = T.DoubleSide; c.add(new T.Mesh(saia, ms));
  }
  if (fato) {   // camisa branca em V e gravata
    const v = new T.Mesh(new T.ConeGeometry(0.045, 0.16, 3), tecido(0xf2f2f2)); v.rotation.x = -Math.PI / 2; v.rotation.y = Math.PI; v.position.set(0, 0.085, 0.99); c.add(v);
    const gr = new T.Mesh(new T.BoxGeometry(0.022, 0.01, 0.14), tecido(o.camisa)); gr.position.set(0, 0.093, 0.96); c.add(gr);
  }
  // braços (manga + antebraço + mão)
  for (const sx of [1, -1]) {
    caps(0.042, 0.2, corTronco, sx * 0.172, 0, 0.93, 0, sx * 0.12);
    caps(0.034, 0.2, fato ? corTronco : pele, sx * 0.19, 0.01, 0.73, 0, sx * 0.05);
    esf(0.036, pele, sx * 0.195, 0.015, 0.6, 0.8, 0.9, 1.1);
  }
  // pescoço, cabeça e cara
  caps(0.038, 0.05, pele, 0, 0, 1.13);
  esf(0.083, pele, 0, 0, 1.235, 0.95, 1.0, 1.12);
  esf(0.05, pele, 0, 0.022, 1.18, 1.0, 1.0, 0.8);                                                   // queixo
  for (const sx of [1, -1]) {
    esf(0.016, pele, sx * 0.08, -0.005, 1.235, 0.6, 1, 1.3);                                          // orelhas
    esf(0.0095, new T.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.3 }), sx * 0.03, 0.073, 1.245, 1.25, 0.6, 0.8);   // olhos
    esf(0.0062, new T.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.2 }), sx * 0.03, 0.079, 1.245);
    const sob = new T.Mesh(new T.BoxGeometry(0.03, 0.008, 0.007), new T.MeshStandardMaterial({ color: o.cabelo, roughness: 0.9 })); sob.position.set(sx * 0.031, 0.079, 1.272); sob.rotation.y = sx * 0.15; c.add(sob);
  }
  esf(0.016, pele, 0, 0.084, 1.222, 1.1, 0.9, 1);                                                    // nariz
  const boca = new T.Mesh(new T.BoxGeometry(0.03, 0.006, 0.008), new T.MeshStandardMaterial({ color: 0x7a3a32, roughness: 0.5 })); boca.position.set(0, 0.079, 1.195); c.add(boca);
  // cabelo
  // calote de cabelo inclinada para trás: a linha do cabelo fica acima da testa e desce atrás
  const capa = (r, z, sz = 1) => { const m = new T.Mesh(new T.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), cabelo); m.rotation.x = Math.PI / 2 + 0.55; m.scale.set(1, sz, 1); m.position.set(0, -0.012, z); c.add(m); return m; };
  if (o.estilo === 'curto') capa(0.088, 1.25, 1.04);
  if (o.estilo === 'afro') { capa(0.089, 1.25); esf(0.125, cabelo, 0, -0.045, 1.315, 1.0, 0.9, 0.85); }
  if (o.estilo === 'trancas') {
    capa(0.089, 1.25);
    for (let k = 0; k < 14; k++) { const a = Math.PI * (0.15 + 0.7 * k / 13) + Math.PI; const x = Math.cos(a) * 0.085, y = Math.sin(a) * 0.07 - 0.01;
      const t = new T.Mesh(new T.CapsuleGeometry(0.012, 0.24, 4, 8), cabelo); t.position.set(x * 1.05, y * 1.05, 1.12); c.add(t); t.rotation.x = Math.PI / 2; }
  }
  return g;
}

// ---------- personagem animada (#37): peças com "camada" para fotografar cada uma à parte ----------
// camadas: 'pele' | 'cima' | 'baixo' | 'cabelo' (pintadas no jogo), 'fixo' (cores próprias: sapatos, cara, fato, cinto)
// e 'acc' (o acessório o.acc). roupa: 0 camisa+calças · 1 saia · 2 fato · 3 vestido · 4 pano
// cabelo: 0 careca · 1 curto · 2 afro · 3 tranças · 4 puff · 5 lenço · o.crianca: corpo de criança (cabeça maior, membros curtos)
// Virada para +y. g.userData.pose(tipo, f): tipo 'parado' | 'andar' | 'sentado' | 'deitado' | 'trabalhar' | 'mostrar', f = fase 0..1.
export function pessoaRig(T, o) {
  // o.acc: um acessório (as folhas do estúdio) ou a lista de acessórios da aparência (o jogo) — antes só aceitava um, por isso no 3D ninguém tinha chapéu, óculos…
  const temAcc = a => Array.isArray(o.acc) ? o.acc.includes(a) : o.acc === a;
  const g = new T.Group(), corpo = new T.Group(); g.add(corpo);
  const BR = 0xffffff, mat = (cam, cor = BR, rough = 0.85) => { const m = new T.MeshStandardMaterial({ color: cor, roughness: rough, metalness: 0 }); m.userData.camada = cam; return m; };
  const mPele = mat('pele', BR, 0.5), mCima = mat('cima'), mBaixo = mat('baixo'), mCab = mat('cabelo', BR, 0.95);
  const fixo = (cor, r = 0.6) => mat('fixo', cor, r);
  const acc = (cor, r = 0.35, m = 0.6) => { const x = new T.MeshStandardMaterial({ color: cor, roughness: r, metalness: m }); x.userData.camada = 'acc'; return x; };
  const mSapato = fixo(0x1d1d1f, 0.4), mFato = fixo(0x24272d, 0.8);
  const r = o.roupa || 0, saia = r === 1, fato = r === 2, vestido = r === 3, pano = r === 4, luxo = r === 5, marca = r === 6;   // 5 fato de luxo · 6 vestido de marca (Ouro)
  const mDourado = fixo(0xd9b04a, 0.3);
  const caps = (pai, rr, l, m, x, y, z) => { const me = new T.Mesh(new T.CapsuleGeometry(rr, l, SEG(8, 2), SEG(18, 6)), m); me.rotation.x = Math.PI / 2; me.position.set(x, y, z); pai.add(me); return me; };
  const esf = (pai, rr, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const me = new T.Mesh(new T.SphereGeometry(rr, SEG(28, 8), SEG(20, 6)), m); me.scale.set(sx, sy, sz); me.position.set(x, y, z); pai.add(me); return me; };
  const torno = (pai, perf, m, sy = 0.62) => { const ge = new T.LatheGeometry(perf.map(([a, b]) => new T.Vector2(a, b)), SEG(40, 10)); ge.rotateX(Math.PI / 2); ge.scale(1, sy, 1); const me = new T.Mesh(ge, m); pai.add(me); return me; };
  const piv = (pai, x, y, z) => { const p = new T.Group(); p.position.set(x, y, z); pai.add(p); return p; };
  const corPerna = fato ? mFato : luxo ? mCima : (saia || vestido || pano || marca) ? mPele : mBaixo;
  // pernas: anca → coxa → joelho → canela + sapato
  const ancas = [], joelhos = [], coxas = [], canelas = [];
  for (const sx of [1, -1]) {
    const a = piv(corpo, sx * 0.068, 0, 0.64); ancas.push(a);
    coxas.push(caps(a, 0.054, 0.22, corPerna, 0, 0, -0.15));
    const j = piv(a, 0, 0, -0.3); joelhos.push(j);
    canelas.push(caps(j, 0.047, 0.24, corPerna, 0, 0, -0.15));
    esf(j, 0.05, mSapato, 0, 0.035, -0.305, 0.85, 1.7, 0.6);
  }
  // tronco
  torno(corpo, [[0.0, 0.6], [0.125, 0.61], [0.135, 0.66], [0.112, 0.79], [0.135, 0.94], [0.15, 1.04], [0.11, 1.09], [0.05, 1.11], [0.0, 1.115]], fato ? mFato : mCima);
  if (r === 0) { const ci = new T.Mesh(new T.CylinderGeometry(0.127, 0.127, 0.035, 40).rotateX(Math.PI / 2).scale(1, 0.62, 1), fixo(0x2a1d14, 0.5)); ci.position.z = 0.63; corpo.add(ci); }
  let saiaM = null, matSaia = null;
  if (saia) { saiaM = torno(corpo, [[0.2, 0.42], [0.18, 0.5], [0.145, 0.64], [0.127, 0.7]], mBaixo, 0.75); matSaia = mBaixo; }
  if (vestido) { saiaM = torno(corpo, [[0.205, 0.44], [0.19, 0.52], [0.155, 0.66], [0.125, 0.76], [0.113, 0.8]], mCima, 0.75); matSaia = mCima; }
  if (pano) { saiaM = torno(corpo, [[0.15, 0.06], [0.155, 0.2], [0.15, 0.45], [0.135, 0.66], [0.127, 0.72]], mBaixo, 0.7); matSaia = mBaixo; }
  if (marca) {   // vestido justo até aos pés, a abrir em baixo (sereia), com cinto dourado
    saiaM = torno(corpo, [[0.2, 0.03], [0.155, 0.12], [0.128, 0.3], [0.146, 0.5], [0.138, 0.63], [0.125, 0.71]], mBaixo, 0.72); matSaia = mBaixo;
    const ci = new T.Mesh(new T.CylinderGeometry(0.118, 0.118, 0.03, 40).rotateX(Math.PI / 2).scale(1, 0.62, 1), mDourado); ci.position.z = 0.8; corpo.add(ci);
    const dec = new T.Mesh(new T.TorusGeometry(0.075, 0.007, 6, 24, Math.PI), mDourado); dec.rotation.x = Math.PI / 2; dec.rotation.y = Math.PI; dec.scale.set(1, 0.7, 1); dec.position.set(0, 0.068, 1.07); corpo.add(dec);
  }
  const passo = (pano || marca) ? 0.16 : (saia || vestido) ? 0.3 : 0.45;                        // saias compridas: passos mais curtos
  [...corpo.children].filter(m => m.isMesh && m.material && (m.material === mCima || m.material === mBaixo) && m.geometry.type === 'LatheGeometry').forEach(m => m.material.side = T.DoubleSide);
  if (luxo) {   // camisa (cor de baixo) em V, lapelas, botões e lenço dourados
    const v = new T.Mesh(new T.ConeGeometry(0.045, 0.16, 3), mBaixo); v.rotation.x = -Math.PI / 2; v.rotation.y = Math.PI; v.position.set(0, 0.085, 0.99); corpo.add(v);
    for (const sx of [1, -1]) { const l = new T.Mesh(new T.BoxGeometry(0.012, 0.008, 0.17), mDourado); l.position.set(sx * 0.026, 0.09, 0.985); l.rotation.y = -sx * 0.28; corpo.add(l); }
    for (const z of [0.86, 0.8]) esf(corpo, 0.009, mDourado, 0, 0.087, z);
    const le = new T.Mesh(new T.BoxGeometry(0.03, 0.01, 0.02), mDourado); le.position.set(0.07, 0.093, 1.0); corpo.add(le);
  }
  if (fato) {
    const v = new T.Mesh(new T.ConeGeometry(0.045, 0.16, 3), fixo(0xf2f2f2)); v.rotation.x = -Math.PI / 2; v.rotation.y = Math.PI; v.position.set(0, 0.085, 0.99); corpo.add(v);
    const gr = new T.Mesh(new T.BoxGeometry(0.022, 0.01, 0.14), mCima); gr.position.set(0, 0.093, 0.96); corpo.add(gr);
  }
  // Cintya 5 nov: «gold chains are not appearing on players' avatars» — o anel antigo ficava DENTRO do peito (raio menor que o tronco).
  // Agora a corrente é um tubo que segue a superfície da frente do tronco (dos ombros até ao peito), um pouco por fora — vê-se sempre, com qualquer roupa.
  const raioTronco = z => { const P = [[0.15, 1.04], [0.11, 1.09], [0.05, 1.11]]; if (z <= 1.04) return 0.135 + (0.15 - 0.135) * Math.max(0, (z - 0.94) / 0.1); for (let i = 0; i < P.length - 1; i++) if (z <= P[i + 1][1]) return P[i][0] + (P[i + 1][0] - P[i][0]) * (z - P[i][1]) / (P[i + 1][1] - P[i][1]); return 0.05; };
  const corrente = (largura, fundo, esp, mat, pendente, fora = 0.004) => {   // 6 nov: «fora» = distância ao peito (a de ouro um pouco mais fora, para se ver de lado)
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16 * 2 - 1, x = u * largura, z = 1.085 - (1 - u * u) * fundo + (fato ? 0.004 : 0);
      const r = raioTronco(z) + (fato ? 0.012 : fora), y = 0.62 * Math.sqrt(Math.max(0, r * r - x * x)) + esp + 0.006;
      pts.push(new T.Vector3(x, y, z));
    }
    const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, esp, 6, false), mat); corpo.add(m);
    if (pendente) { const zp = 1.085 - fundo - 0.018, rp = raioTronco(zp) + (fato ? 0.012 : fora); esf(corpo, pendente, mat, 0, 0.62 * rp + esp + 0.012, zp); }
  };
  if (temAcc('colar')) corrente(0.075, 0.075, 0.0065, acc(0xf2c84b), 0.009);
  if (temAcc('corrente_ouro')) corrente(0.09, 0.1, 0.011, acc(0xffcf3a, 0.25, 0.9), 0.02, 0.014);
  // 6 nov (Ouro exclusivo): colar de diamantes — fio de platina e pedra grande e clara ao peito
  if (temAcc('colar_diamante')) corrente(0.082, 0.09, 0.0085, acc(0xe9eef4, 0.18, 0.95), 0.024, 0.012);
  // braços: ombro → braço → cotovelo → antebraço + mão
  const ombros = [], cotovelos = [];
  for (const sx of [1, -1]) {
    const om = piv(corpo, sx * 0.165, 0, 1.04); ombros.push(om);
    caps(om, 0.043, 0.16, fato ? mFato : mCima, sx * 0.006, 0, -0.1);
    const co = piv(om, sx * 0.012, 0, -0.21); cotovelos.push(co);
    caps(co, 0.035, 0.17, fato ? mFato : luxo ? mCima : (r === 0 || r === 1 || r === 4 || r === 3) ? mPele : mPele, sx * 0.004, 0.005, -0.1);
    esf(co, 0.038, mPele, sx * 0.006, 0.01, -0.235, 0.8, 0.95, 1.15);
    if (temAcc('relogio_diamante') && sx === -1) {   // pulso esquerdo, para não chocar com o relógio normal
      const rl = new T.Mesh(new T.CylinderGeometry(0.041, 0.041, 0.027, 20), acc(0xdfe6ee, 0.15, 0.95)); rl.position.set(sx * 0.005, 0.005, -0.19); rl.rotation.x = Math.PI / 2; co.add(rl);
      const aro = new T.Mesh(new T.TorusGeometry(0.041, 0.008, 6, 20), acc(0xcff2ff, 0.05, 0.3)); aro.position.set(sx * 0.005, 0.005, -0.19); aro.rotation.x = Math.PI / 2; co.add(aro);
    }
    if (temAcc('anel_diamante') && sx === 1) { const an = new T.Mesh(new T.TorusGeometry(0.03, 0.009, 6, 14), acc(0xe9eef4, 0.18, 0.95)); an.position.set(sx * 0.006, 0.012, -0.262); co.add(an); esf(co, 0.018, acc(0xcff2ff, 0.05, 0.3), sx * 0.006, 0.042, -0.262); }
    if (temAcc('relogio') && sx === 1) { const rl = new T.Mesh(new T.CylinderGeometry(0.039, 0.039, 0.025, 20), acc(0xf2c84b)); rl.rotation.x = 0; rl.position.set(sx * 0.005, 0.005, -0.19); rl.rotation.x = Math.PI / 2; co.add(rl); }
  }
  // cabeça (roda no pescoço; nas crianças é maior)
  caps(corpo, 0.038, 0.05, mPele, 0, 0, 1.13);
  const cab = piv(corpo, 0, 0, 1.12), Z = z => z - 1.12;
  esf(cab, 0.083, mPele, 0, 0, Z(1.235), 0.95, 1.0, 1.12);
  esf(cab, 0.05, mPele, 0, 0.022, Z(1.18), 1.0, 1.0, 0.8);
  esf(cab, 0.016, mPele, 0, 0.084, Z(1.222), 1.15, 0.9, 1);
  const olhos = [];
  for (const sx of [1, -1]) {
    esf(cab, 0.016, mPele, sx * 0.08, -0.005, Z(1.235), 0.6, 1, 1.3);
    olhos.push(esf(cab, 0.0095, fixo(0xf6f2ea, 0.3), sx * 0.03, 0.073, Z(1.245), 1.25, 0.6, 0.8));
    olhos.push(esf(cab, 0.0062, fixo(0x1a0f08, 0.2), sx * 0.03, 0.079, Z(1.245)));
    const sob = new T.Mesh(new T.BoxGeometry(0.03, 0.008, 0.007), fixo(0x1a1310, 0.9)); sob.position.set(sx * 0.031, 0.079, Z(1.268)); sob.rotation.y = sx * 0.15; cab.add(sob);
    if (temAcc('brincos')) esf(cab, 0.009, acc(0xf2c84b), sx * 0.083, 0.0, Z(1.205));
    if (temAcc('brincos_ouro')) { const ar = new T.Mesh(new T.TorusGeometry(0.018, 0.004, 6, 16), acc(0xffcf3a, 0.25, 0.9)); ar.position.set(sx * 0.085, 0.0, Z(1.19)); ar.rotation.y = Math.PI / 2; cab.add(ar); }
  }
  const labio = (y, z, w, cor) => { const m = new T.Mesh(new T.CapsuleGeometry(0.0055, w, 4, 8), fixo(cor, 0.45)); m.rotation.z = Math.PI / 2; m.position.set(0, y, Z(z)); cab.add(m); };
  labio(0.078, 1.198, 0.026, 0x6e3530); labio(0.076, 1.191, 0.022, 0x7d4038);
  // cabelo
  const est = o.cabelo ?? 1;
  const capa = (rr, z, sz = 1, m = mCab) => { const me = new T.Mesh(new T.SphereGeometry(rr, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), m); me.rotation.x = Math.PI / 2 + 0.55; me.scale.set(1, sz, 1); me.position.set(0, -0.012, Z(z)); cab.add(me); return me; };
  if (est === 1) capa(0.088, 1.25, 1.04);
  if (est === 2) { capa(0.089, 1.25); esf(cab, 0.125, mCab, 0, -0.045, Z(1.315), 1.0, 0.9, 0.85); }
  if (est === 3) { capa(0.089, 1.25); for (let k = 0; k < 14; k++) { const a = Math.PI * (0.15 + 0.7 * k / 13) + Math.PI; const t = new T.Mesh(new T.CapsuleGeometry(0.012, 0.24, 4, 8), mCab); t.rotation.x = Math.PI / 2; t.position.set(Math.cos(a) * 0.089, (Math.sin(a) * 0.07 - 0.01) * 1.05, Z(1.12)); cab.add(t); } }
  if (est === 4) { capa(0.088, 1.25); esf(cab, 0.06, mCab, 0, -0.02, Z(1.36)); }
  if (est === 5) { const l = capa(0.095, 1.255, 1.1); l.scale.set(1.05, 1.1, 1.25); esf(cab, 0.07, mCab, 0, -0.04, Z(1.33), 1.1, 1, 0.8); }
  // acessórios da cabeça
  if (temAcc('oculos') || temAcc('oculos_ouro')) {
    const preto = temAcc('oculos');   // com os dois, ficam os pretos
    const aro = acc(preto ? 0x111111 : 0xffcf3a, 0.3, preto ? 0.1 : 0.9), lente = acc(preto ? 0x16181c : 0x3a2f20, 0.05, 0.3);
    for (const sx of [1, -1]) { const l = new T.Mesh(new T.CylinderGeometry(0.019, 0.019, 0.006, 20), lente); l.rotation.x = Math.PI / 2; l.position.set(sx * 0.031, 0.087, Z(1.247)); cab.add(l);
      const a = new T.Mesh(new T.TorusGeometry(0.019, 0.003, 6, 20), aro); a.position.set(sx * 0.031, 0.089, Z(1.247)); a.rotation.x = Math.PI / 2; cab.add(a);
      const h = new T.Mesh(new T.BoxGeometry(0.004, 0.08, 0.004), aro); h.position.set(sx * 0.075, 0.045, Z(1.252)); cab.add(h); }
    const p = new T.Mesh(new T.BoxGeometry(0.022, 0.004, 0.004), aro); p.position.set(0, 0.09, Z(1.252)); cab.add(p);
  }
  if (temAcc('chapeu')) { const c1 = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.012, 32), acc(0xd8c39a, 0.8, 0)); c1.rotation.x = Math.PI / 2; c1.position.set(0, 0, Z(1.31)); cab.add(c1);
    const c2 = new T.Mesh(new T.CylinderGeometry(0.075, 0.088, 0.09, 32), acc(0xd8c39a, 0.8, 0)); c2.rotation.x = Math.PI / 2; c2.position.set(0, -0.005, Z(1.35)); cab.add(c2);
    const fita = new T.Mesh(new T.CylinderGeometry(0.0885, 0.0885, 0.02, 32), acc(0x3a2416, 0.6, 0)); fita.rotation.x = Math.PI / 2; fita.position.set(0, -0.005, Z(1.322)); cab.add(fita); }
  if (temAcc('coroa')) { const base = acc(0xffcf3a, 0.2, 0.95); const c = new T.Mesh(new T.CylinderGeometry(0.075, 0.07, 0.05, 32, 1, true), base); c.rotation.x = Math.PI / 2; c.position.set(0, -0.005, Z(1.335)); cab.add(c);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const p = new T.Mesh(new T.ConeGeometry(0.014, 0.04, 8), base); p.rotation.x = Math.PI / 2; p.position.set(Math.cos(a) * 0.072, Math.sin(a) * 0.072 - 0.005, Z(1.375)); cab.add(p); esf(cab, 0.008, acc(0xcc092f, 0.2, 0.2), Math.cos(a) * 0.072, Math.sin(a) * 0.072 - 0.005, Z(1.34)); } }
  if (temAcc('auscultadores')) { const pr = acc(0x1b1d22, 0.4, 0.3);
    const arco = new T.Mesh(new T.TorusGeometry(0.098, 0.009, 8, 32, Math.PI), pr); arco.rotation.y = 0; arco.rotation.x = 0; arco.position.set(0, -0.01, Z(1.245)); arco.rotation.set(Math.PI / 2, 0, 0); cab.add(arco);
    for (const sx of [1, -1]) { const e = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.022, 20), pr); e.rotation.z = Math.PI / 2; e.position.set(sx * 0.093, -0.01, Z(1.235)); cab.add(e); } }
  // criança: cabeça maior, membros e tronco mais curtos
  if (o.crianca) { corpo.scale.set(0.82, 0.82, 0.66); cab.scale.set(0.9 / 0.82, 0.9 / 0.82, 0.9 / 0.66); }   // cabeça final ≈ 90% da de um adulto
  g.userData.pose = (tipo = 'parado', f = 0) => {
    const s2 = Math.sin(f * Math.PI * 2);
    ancas.forEach(a => a.rotation.set(0, 0, 0)); joelhos.forEach(j => j.rotation.set(0, 0, 0));
    ombros.forEach((o2, k) => o2.rotation.set(0, (k ? -1 : 1) * 0.06, 0)); cotovelos.forEach(c => c.rotation.set(0.18, 0, 0));
    corpo.rotation.set(0, 0, 0); corpo.position.set(0, 0, 0); cab.rotation.set(0, 0, 0);
    olhos.forEach(e => e.visible = true);
    if (saiaM) { saiaM.visible = true; coxas.forEach(m => m.material = corPerna); canelas.forEach(m => m.material = corPerna); }
    if (saiaM && tipo === 'sentado') {                                               // sentada: a saia acompanha as pernas
      saiaM.visible = false; coxas.forEach(m => m.material = matSaia); if (pano) canelas.forEach(m => m.material = matSaia);
    }
    if (tipo === 'andar') {
      ancas[0].rotation.x = s2 * passo; ancas[1].rotation.x = -s2 * passo;
      joelhos[0].rotation.x = -Math.max(0, -s2) * passo * 1.6 - 0.08; joelhos[1].rotation.x = -Math.max(0, s2) * passo * 1.6 - 0.08;
      ombros[0].rotation.x = -s2 * 0.4; ombros[1].rotation.x = s2 * 0.4;
      cotovelos[0].rotation.x = 0.25 + Math.max(0, s2) * 0.35; cotovelos[1].rotation.x = 0.25 + Math.max(0, -s2) * 0.35;
      corpo.position.z = Math.abs(Math.cos(f * Math.PI * 2)) * 0.018;
    } else if (tipo === 'sentado') {
      ancas.forEach(a => a.rotation.x = 1.5); joelhos.forEach(j => j.rotation.x = -1.45);
      ombros.forEach(o2 => o2.rotation.x = 0.35); cotovelos.forEach(c => c.rotation.x = 0.9);
      corpo.position.z = -0.26;
    } else if (tipo === 'deitado') {
      corpo.rotation.x = Math.PI / 2; corpo.position.set(0, 0.62, 0.11);              // de costas, cabeça para trás (−y)
      ombros.forEach((o2, k) => o2.rotation.y = (k ? -1 : 1) * 0.12); cotovelos.forEach(c => c.rotation.x = 0.1);
      olhos.forEach(e => e.visible = false);                                          // olhos fechados
    } else if (tipo === 'mostrar') {                                                 // segurar uma folha à frente do peito, virada para quem está à frente
      ombros.forEach((o2, k) => o2.rotation.set(0.95, (k ? 1 : -1) * 0.32, 0)); cotovelos.forEach(c => c.rotation.x = 0.95);
      cab.rotation.x = 0.12;
    } else if (tipo === 'trabalhar') {
      const b = Math.sin(f * Math.PI * 2);
      ombros[0].rotation.x = 0.85 + b * 0.25; ombros[1].rotation.x = 0.85 - b * 0.25;
      cotovelos.forEach(c => c.rotation.x = 0.75); cab.rotation.x = -0.18; corpo.rotation.x = 0.08;
    // 0ab (dono, 30 out): gestos para o ecrã de entrada. ombros[0] = braço direito (+x); rotation.x + = braço para a frente/cima, rotation.y − = braço direito para fora
    } else if (tipo === 'acenar') {
      ombros[0].rotation.set(0.25, -2.55, 0); cotovelos[0].rotation.set(0, -0.25 + 0.45 * Math.sin(f * Math.PI * 6), 0);
      ombros[1].rotation.set(0.05, 0.1, 0); cab.rotation.set(0.06, 0, -0.08); corpo.rotation.y = -0.05;
    } else if (tipo === 'vitoria') {
      const b = Math.abs(Math.sin(f * Math.PI * 4));
      ombros[0].rotation.set(0.15, -2.75, 0); ombros[1].rotation.set(0.15, 2.75, 0); cotovelos.forEach(c => c.rotation.set(0.25, 0, 0));
      corpo.position.z = b * 0.07; joelhos.forEach(j => j.rotation.x = -b * 0.25); ancas.forEach(a => a.rotation.x = b * 0.12); cab.rotation.x = 0.15;
    } else if (tipo === 'palmas') {
      const b = Math.sin(f * Math.PI * 8);
      ombros[0].rotation.set(1.15, 0.38 + b * 0.18, 0); ombros[1].rotation.set(1.15, -0.38 - b * 0.18, 0); cotovelos.forEach(c => c.rotation.set(0.75, 0, 0));
      corpo.position.z = Math.abs(b) * 0.01;
    } else if (tipo === 'dancar') {
      const b = Math.sin(f * Math.PI * 4), c2 = Math.cos(f * Math.PI * 4);
      corpo.rotation.y = b * 0.18; corpo.rotation.z = c2 * 0.08; corpo.position.z = Math.abs(c2) * 0.03;
      ombros[0].rotation.set(1.0 + b * 0.6, -0.5, 0); ombros[1].rotation.set(1.0 - b * 0.6, 0.5, 0); cotovelos.forEach(c => c.rotation.set(1.2, 0, 0));
      joelhos[0].rotation.x = -Math.max(0, b) * 0.4; joelhos[1].rotation.x = -Math.max(0, -b) * 0.4; ancas[0].rotation.x = Math.max(0, b) * 0.2; ancas[1].rotation.x = Math.max(0, -b) * 0.2;
      cab.rotation.set(0, 0, -b * 0.12);
    } else if (tipo === 'rir') {
      const b = Math.sin(f * Math.PI * 10);
      corpo.rotation.x = 0.1 + b * 0.03; cab.rotation.x = 0.28 + b * 0.05; corpo.position.z = Math.abs(b) * 0.012;
      ombros[0].rotation.set(0.45, 0.42, 0); ombros[1].rotation.set(0.45, -0.42, 0); cotovelos.forEach(c => c.rotation.set(1.45, 0, 0));
    } else if (tipo === 'pensar') {
      const b = Math.sin(f * Math.PI * 2);
      ombros[0].rotation.set(0.85, 0.42, 0); cotovelos[0].rotation.set(2.05, 0, 0);
      ombros[1].rotation.set(0.55, -0.55, 0); cotovelos[1].rotation.set(1.55, 0, 0);
      cab.rotation.set(-0.05, 0, 0.14 + b * 0.04); corpo.rotation.y = 0.06;
    }
  };
  g.userData.pose('parado');
  g.userData.juntas = [...ancas, ...joelhos, ...ombros, ...cotovelos, corpo, cab];   // para misturar poses (gestos que entram e saem suaves)
  g.userData.vivos = [...olhos, saiaM, ...coxas, ...canelas].filter(Boolean);   // peças que a animação liga/desliga ou troca de cor
  return g;
}

// ---------- prédios e casas da cidade (desenhados a partir dos mesmos dados do jogo) ----------
// spec = { k: 'edificio'|'casinha', w, d, h (px do jogo), cor, t: 'zinco'|'telha'|'plano', p: 'x'|'y', to: cor do toldo, an, ta }
// Origem no canto (0,0) da base. As janelas (vidro) levam userData.janela para a camada de luzes da noite.
const PX_Z = 64 / Math.SQRT2 * Math.cos(Math.asin(0.5));                 // px do jogo por quadrado de altura (≈39.2)
const _reboco = new Map();
function texturaReboco(T, cor) {
  const k = String(cor); if (_reboco.has(k)) return _reboco.get(k);
  const t = _texturaReboco(T, cor); _reboco.set(k, t); return t;
}
function _texturaReboco(T, cor) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#' + new T.Color(cor).getHexString(); g.fillRect(0, 0, 256, 256);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2200; i++) { const v = rnd() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.025 + rnd() * 0.03})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t;
}
export function predio(T, sp) {
  const g = new T.Group(), W = sp.w, D = sp.d, H = Math.max(0.15, sp.h / PX_Z), casa = sp.k === 'casinha';
  const parede = new T.MeshStandardMaterial({ color: 0xffffff, map: texturaReboco(T, sp.cor), roughness: 0.92 });
  parede.map.repeat.set(2, 2);
  const escuro = new T.MeshStandardMaterial({ color: new T.Color(sp.cor).multiplyScalar(0.62), roughness: 0.9 });
  const vidro = new T.MeshPhysicalMaterial({ color: 0x24394a, roughness: 0.08, metalness: 0.25, clearcoat: 1 }); vidro.userData.janela = true;
  const caixilho = new T.MeshStandardMaterial({ color: 0xece8df, roughness: 0.6 });
  const madeira = new T.MeshStandardMaterial({ color: 0x4a3122, roughness: 0.7 });
  const M = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const box = (w, d, h, mat, x, y, z) => M(new T.BoxGeometry(w, d, h), mat, x + w / 2, y + d / 2, z + h / 2);
  // base (rodapé) e paredes
  box(W, D, Math.min(0.12, H), escuro, 0, 0, 0);
  box(W - 0.02, D - 0.02, H - 0.12, parede, 0.01, 0.01, 0.12);
  // janelas nas 4 faces, por andar
  const andares = Math.max(1, Math.floor((sp.h - 8) / 26)), aJan = 0.3, lJan = casa ? 0.34 : 0.4;
  const porta = { face: sp.p === 'x' ? 'x' : 'y' };
  const faces = [['x', W, D, 1], ['x', 0, D, -1], ['y', D, W, 1], ['y', 0, W, -1]];   // [eixo, posição, comprimento, sentido]
  for (let a = 0; a < andares; a++) {
    const z0 = (10 + a * 26) / PX_Z; if (z0 + aJan > H - 0.08) break;
    for (const [eixo, pos, comp, sen] of faces) {
      for (let u = 0.25; u < comp - 0.3; u += 0.75) {
        const meio = u + lJan / 2;
        if (a === 0 && eixo === porta.face && sen === 1 && Math.abs(meio - comp / 2) < 0.6) continue;     // lugar da porta
        const vit = (a === 0 && sp.to && eixo === porta.face && sen === 1);                               // montra no rés-do-chão
        const lw = vit ? lJan * 1.5 : lJan, ah = vit ? aJan * 1.4 : aJan, zz = vit ? 0.16 : z0;
        const off = sen * 0.012;
        if (eixo === 'x') {
          const x = pos === 0 ? 0 : W;
          box(0.03, lw + 0.06, ah + 0.06, caixilho, x - 0.015 + off, u - 0.03, zz - 0.03);
          const v = box(0.02, lw, ah, vidro, x - 0.01 + off * 2, u, zz);
          if (!vit) box(0.06, lw + 0.08, 0.025, caixilho, x - 0.03 + off * 2.5, u - 0.04, zz - 0.04);            // peitoril
        } else {
          const y = pos === 0 ? 0 : D;
          box(lw + 0.06, 0.03, ah + 0.06, caixilho, u - 0.03, y - 0.015 + off, zz - 0.03);
          box(lw, 0.02, ah, vidro, u, y - 0.01 + off * 2, zz);
          if (!vit) box(lw + 0.08, 0.06, 0.025, caixilho, u - 0.04, y - 0.03 + off * 2.5, zz - 0.04);
        }
      }
    }
  }
  // porta, degrau e toldo
  const hp = Math.min(20 / PX_Z, H - 0.05);
  if (porta.face === 'x') {
    box(0.05, 0.62, hp + 0.04, caixilho, W - 0.02, D / 2 - 0.31, 0); box(0.04, 0.54, hp, madeira, W, D / 2 - 0.27, 0);
    box(0.25, 0.8, 0.05, escuro, W, D / 2 - 0.4, 0);
    if (sp.to) { const tl = box(0.38, 1.25, 0.04, new T.MeshStandardMaterial({ color: sp.to, roughness: 0.8 }), W, D / 2 - 0.62, hp + 0.12); tl.rotation.y = 0.35; tl.position.x += 0.14; }
  } else {
    box(0.62, 0.05, hp + 0.04, caixilho, W / 2 - 0.31, D - 0.02, 0); box(0.54, 0.04, hp, madeira, W / 2 - 0.27, D, 0);
    box(0.8, 0.25, 0.05, escuro, W / 2 - 0.4, D, 0);
    if (sp.to) { const tl = box(1.25, 0.38, 0.04, new T.MeshStandardMaterial({ color: sp.to, roughness: 0.8 }), W / 2 - 0.62, D, hp + 0.12); tl.rotation.x = -0.35; tl.position.y += 0.14; }
  }
  // telhados
  if (sp.t === 'plano') {
    const laje = new T.MeshStandardMaterial({ color: 0xffffff, map: texturaReboco(T, 0x9a9690), roughness: 0.97 }); laje.map.repeat.set(W, D);
    box(W, D, 0.05, laje, 0, 0, H);
    box(0.3, 0.3, 0.12, escuro, W * 0.45, D * 0.6, H + 0.05);                       // saída da escada
    for (let k = 0; k < Math.min(3, W - 1); k++) box(0.06, 0.06, 0.1, new T.MeshStandardMaterial({ color: 0x777b80, metalness: 0.6, roughness: 0.4 }), 0.6 + k * 0.9, D - 0.5, H + 0.05);   // tubos de ventilação
    for (const [x, y, w, d] of [[0, 0, W, 0.08], [0, D - 0.08, W, 0.08], [0, 0, 0.08, D], [W - 0.08, 0, 0.08, D]]) box(w, d, 0.14, parede, x, y, H);
    if (sp.ta) { const t = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.45, 24), new T.MeshStandardMaterial({ color: 0x2f5f9e, roughness: 0.6 })); t.rotation.x = Math.PI / 2; t.position.set(W * 0.7, 0.55, H + 0.05 + 0.225); g.add(t); }
    if (sp.an) { const prato = new T.Mesh(new T.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.35), new T.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5, side: T.DoubleSide })); prato.rotation.x = -0.9; prato.rotation.z = 0.8; prato.position.set(W * 0.3, D * 0.3, H + 0.3); g.add(prato); box(0.03, 0.03, 0.3, caixilho, W * 0.3, D * 0.3, H + 0.05); }
    // aparelhos de ar condicionado nos prédios com vários andares
    if (andares >= 2) for (let a = 1; a < Math.min(andares, 6); a += 2) { const z = (10 + a * 26) / PX_Z - 0.05; box(0.22, 0.12, 0.16, new T.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.5 }), W * 0.15, D, z); }
    // varandas nos prédios altos (frente +y)
    if (andares >= 3) for (let a = 1; a < andares; a++) { const z = (6 + a * 26) / PX_Z; if (z > H - 0.3) break; box(W * 0.5, 0.22, 0.04, escuro, W * 0.25, D, z); box(W * 0.5, 0.015, 0.16, new T.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.7, roughness: 0.35 }), W * 0.25, D + 0.2, z + 0.04); }
  } else if (sp.t === 'zinco') {
    // chapa ondulada, uma água, com beiral
    const comp = W + 0.3, larg = D + 0.3, ond = new T.PlaneGeometry(comp, larg, Math.ceil(comp * 12), 1);
    const P = ond.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getX(i) * 40) * 0.012);
    ond.computeVertexNormals();
    const zinco = new T.MeshStandardMaterial({ color: 0xa9b0b4, metalness: 0.75, roughness: 0.45, side: T.DoubleSide });
    const zMeio = H + 0.08 + Math.sin(0.12) * larg / 2;                              // a parte mais baixa fica acima das paredes
    const tz = new T.Mesh(ond, zinco); tz.position.set(W / 2, D / 2, zMeio); tz.rotation.x = 0.12; g.add(tz);
    box(W, D, 0.06, escuro, 0, 0, H);
    // ferrugem: duas chapas mais escuras
    const ferr = new T.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.3, roughness: 0.8, side: T.DoubleSide });
    const f1 = new T.Mesh(new T.PlaneGeometry(comp * 0.25, larg * 0.5), ferr); f1.position.set(W * 0.25, D * 0.35, zMeio + Math.sin(0.12) * (D * 0.35 - D / 2) + 0.016); f1.rotation.x = 0.12; g.add(f1);
    if (sp.ta) { const t = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.42, 24), new T.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 })); t.rotation.x = Math.PI / 2; t.position.set(W * 0.75, D * 0.5, zMeio + 0.24); g.add(t); }
  } else if (sp.t === 'telha') {
    // telhado de duas águas em telha (cumeeira ao longo de x), com beirado
    const ov = 0.15, alt = 18 / PX_Z + 0.1, meia = D / 2 + ov;
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const gg = c.getContext('2d');
    gg.fillStyle = '#b4482c'; gg.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) { gg.fillStyle = 'rgba(60,20,10,.35)'; gg.fillRect(0, y, 256, 3); for (let x = (y / 16 % 2) * 8; x < 256; x += 16) { gg.fillStyle = 'rgba(255,220,190,.12)'; gg.fillRect(x, y + 4, 6, 10); } }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(W * 2, 2); tex.colorSpace = T.SRGBColorSpace;
    const telha = new T.MeshStandardMaterial({ map: tex, roughness: 0.85, side: T.DoubleSide });
    const L = Math.hypot(meia, alt), ang = Math.atan2(alt, meia);
    for (const sx of [1, -1]) { const pl = new T.Mesh(new T.PlaneGeometry(W + ov * 2, L), telha); pl.position.set(W / 2, D / 2 + sx * meia / 2, H + alt / 2); pl.rotation.x = -sx * ang; g.add(pl); }
    // empenas (triângulos nas pontas)
    const tri = new T.Shape([new T.Vector2(0, 0), new T.Vector2(D, 0), new T.Vector2(D / 2, alt - 0.05)]);
    for (const x of [0.01, W - 0.01]) { const e = new T.Mesh(new T.ShapeGeometry(tri), parede); e.material.side = T.DoubleSide; e.rotation.set(Math.PI / 2, Math.PI / 2, 0); e.position.set(x, 0, H); g.add(e); }
  }
  return g;
}


// ---------- natureza: árvores e palmeiras de Luanda (origem no centro do quadrado, no chão) ----------
function semente(n) { let s = (n * 9301 + 49297) % 233280 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// ruído suave (soma de senos) para as copas ficarem irregulares e "fofas"
function ruido3(x, y, z, k) { return Math.sin(x * 3.1 * k + 1.7) * Math.sin(y * 2.7 * k + 0.4) * Math.sin(z * 3.3 * k + 2.1) + 0.5 * Math.sin(x * 7.3 * k + y * 5.1 * k + 0.9) * Math.sin(z * 6.7 * k + 1.3); }
// uma "nuvem" de folhas: esfera deformada, cores a variar (topo mais claro, por baixo mais escuro)
function copa(T, r, rnd, cores, achatar = 1, flores = null) {
  const g = new T.IcosahedronGeometry(r, 5), P = g.attributes.position, cor = [], c = new T.Color(), v = new T.Vector3();
  const k = 1 + rnd() * 0.6, ox = rnd() * 10, oy = rnd() * 10;
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i); const n = v.clone().normalize();
    const grosso = ruido3(n.x + ox, n.y + oy, n.z, k), fino = ruido3(n.x * 3 + oy, n.y * 3 + ox, n.z * 3, 2.2);
    const d = 1 + grosso * 0.16 + fino * 0.07;
    v.copy(n).multiplyScalar(r * d); v.z *= achatar; P.setXYZ(i, v.x, v.y, v.z);
    const alt = (n.z + 1) / 2, t = Math.min(1, Math.max(0, alt * 0.75 + fino * 0.35 + 0.1));
    c.copy(cores[0]).lerp(cores[1], t);
    if (flores && fino > flores.limiar) c.copy(flores.cor).lerp(cores[1], 0.15 * rnd());
    cor.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(cor, 3)); g.computeVertexNormals();
  return g;
}
function texturaCasca(T, base, riscas, vertical = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); const rnd = semente(5);
  for (let i = 0; i < 260; i++) { g.fillStyle = riscas[i % riscas.length]; g.globalAlpha = 0.25 + rnd() * 0.35;
    if (vertical) g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 8 + rnd() * 30); else g.fillRect(rnd() * 128, rnd() * 128, 10 + rnd() * 30, 1 + rnd() * 2); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t;
}
// ramo torto: tubo ao longo de uma curva, mais fino na ponta
function ramo(T, pts, r0, r1, mat) {
  const curva = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
  const NS = SEG(16, 5), NR = SEG(10, 5), g = new T.TubeGeometry(curva, NS, 1, NR, false), P = g.attributes.position, v = new T.Vector3(), seg = NS + 1;
  for (let i = 0; i < P.count; i++) {
    const anel = Math.floor(i / (NR + 1)), t = Math.min(1, anel / (seg - 1)), c = curva.getPointAt(t);
    v.fromBufferAttribute(P, i).sub(c).multiplyScalar(r0 + (r1 - r0) * t).add(c); P.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return new T.Mesh(g, mat);
}

// folhas soltas: milhares de folhinhas pousadas à volta de cada nuvem (com um miolo escuro por dentro a tapar os buracos)
let _texFolha = null;
function texFolha(T) {
  if (_texFolha) return _texFolha;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(4, 32); g.quadraticCurveTo(30, 6, 60, 32); g.quadraticCurveTo(30, 58, 4, 32); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke();
  _texFolha = new T.CanvasTexture(c); _texFolha.colorSpace = T.SRGBColorSpace; return _texFolha;
}
// qualidade: o estúdio usa 1 (fotografias); o mundo em tempo real usa menos folhas, maiores (telemóveis baratos)
function folhagem(T, grupo, nuvens, rnd, cores, o = {}) {
  const q = QUALIDADE.folhas, tam = (o.tam || 0.11) / Math.sqrt(q), porArea = (o.densidade || 5200) * q;
  const miolo = new T.MeshStandardMaterial({ color: new T.Color(cores[0]).multiplyScalar(0.7), roughness: 1 });
  let total = 0; for (const [, , , r] of nuvens) total += Math.round(porArea * r * r * (o.achatar || 1));
  const geo = new T.PlaneGeometry(tam, tam * 0.62);
  const mat = new T.MeshStandardMaterial({ map: texFolha(T), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.75 });
  const inst = new T.InstancedMesh(geo, mat, total), m = new T.Object3D(), c = new T.Color(), escuro = new T.Color(cores[0]), claro = new T.Color(cores[1]);
  let k = 0;
  for (const [x, y, z, r] of nuvens) {
    const ach = o.achatar || 1;
    const cg = new T.SphereGeometry(r * 0.86, SEG(20, 8), SEG(14, 6)); cg.scale(1, 1, ach); grupo.add(M(T, cg, miolo, x, y, z));
    const n = Math.round(porArea * r * r * ach);
    for (let i = 0; i < n && k < total; i++, k++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = new T.Vector3(s * Math.cos(a), s * Math.sin(a), u);
      const rr = r * (0.88 + rnd() * 0.2 + ruido3(d.x, d.y, d.z, 1.3) * 0.1);
      m.position.set(x + d.x * rr, y + d.y * rr, z + d.z * rr * ach);
      m.lookAt(m.position.x + d.x + (rnd() - 0.5), m.position.y + d.y + (rnd() - 0.5), m.position.z + d.z + rnd() * 0.6);
      m.rotateZ(rnd() * Math.PI * 2); const e = 0.75 + rnd() * 0.6; m.scale.set(e, e, e); m.updateMatrix(); inst.setMatrixAt(k, m.matrix);
      const t = Math.min(1, Math.max(0, (u + 1) / 2 * 0.8 + (rnd() - 0.5) * 0.45));
      c.copy(escuro).lerp(claro, t);
      if (o.flores && rnd() < o.flores.p) c.set(o.flores.cor).offsetHSL(0, 0, (rnd() - 0.5) * 0.1);
      inst.setColorAt(k, c);
    }
  }
  inst.count = k; inst.castShadow = true; grupo.add(inst);
}
function arvoreFolhosa(T, o) {
  const g = new T.Group(), rnd = semente(o.seed || 3);
  const casca = new T.MeshStandardMaterial({ color: 0xffffff, map: texturaCasca(T, o.casca || '#5b4130', ['#3b2a1f', '#7a5a42']), roughness: 0.95 });
  // tronco e ramos principais
  g.add(ramo(T, [[0, 0, 0], [0.03, -0.02, o.tronco * 0.5], [0.0, 0.03, o.tronco]], o.rt, o.rt * 0.7, casca));
  for (let i = 0; i < o.ramos; i++) {
    const a = i / o.ramos * Math.PI * 2 + rnd(), l = o.abre * (0.7 + rnd() * 0.4);
    g.add(ramo(T, [[0, 0, o.tronco * 0.85], [Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5, o.tronco + o.sobe * 0.5], [Math.cos(a) * l, Math.sin(a) * l, o.tronco + o.sobe]], o.rt * 0.55, o.rt * 0.25, casca));
  }
  // copa: várias nuvens de folhas
  folhagem(T, g, o.nuvens, rnd, [o.escuro, o.claro], { achatar: o.achatar, flores: o.flores ? { cor: o.flores, p: o.pFlor || 0.3 } : null });
  return g;
}
function palmeira(T, o) {
  const g = new T.Group(), rnd = semente(o.seed || 11), H = o.H;
  const casca = new T.MeshStandardMaterial({ color: 0xffffff, map: texturaCasca(T, '#8c7357', ['#5f4c38', '#a88d6c'], false), roughness: 0.95 });
  // tronco curvo, feito de anéis (como as palmeiras de verdade)
  const curva = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(o.curva * 0.25, 0.02, H * 0.35), new T.Vector3(o.curva * 0.75, 0.04, H * 0.72), new T.Vector3(o.curva, 0.05, H)]);
  const N = SEG(22, 10);
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, a = curva.getPointAt(t0), b = curva.getPointAt(t1), r = 0.085 - 0.03 * t0;
    const cg = new T.CylinderGeometry(r * 0.92, r * 1.06, a.distanceTo(b) * 1.02, SEG(12, 6)); cg.rotateX(Math.PI / 2);
    const m = new T.Mesh(cg, casca); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); g.add(m);
  }
  const topo = curva.getPointAt(1);
  // folhas (fronde): tira dobrada com folíolos recortados por transparência
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.lineCap = 'round';
  for (let i = 10; i < 500; i += 9) { const f = i / 512, comp = 58 * Math.sin(Math.PI * Math.min(1, f * 1.08)) + 6; x.lineWidth = 3.4;
    x.strokeStyle = ['#2e6e2c', '#3b7f33', '#285f27'][(i / 9 | 0) % 3];
    for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(i, 64); x.quadraticCurveTo(i + 10, 64 + sg * comp * 0.5, i + 22, 64 + sg * comp); x.stroke(); } }
  x.strokeStyle = '#7d7034'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, 64); x.lineTo(512, 64); x.stroke();
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const folha = new T.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.8 });
  const nF = o.folhas || 11;
  for (let i = 0; i < nF; i++) {
    const L = o.L * (0.8 + rnd() * 0.35), pg = new T.PlaneGeometry(L, 0.36, SEG(24, 8), SEG(4, 2)), P = pg.attributes.position;
    const queda = 0.9 + rnd() * 0.4;
    for (let k = 0; k < P.count; k++) { const u = (P.getX(k) + L / 2) / L, w = P.getY(k);
      P.setXYZ(k, u * L * (1 - 0.15 * u), w, -(u * u) * L * queda + Math.abs(w) * 0.45); }   // arqueia para baixo, folíolos em V
    pg.computeVertexNormals();
    const m = new T.Mesh(pg, folha), a = i / nF * Math.PI * 2 + rnd() * 0.3, sobe = 0.55 + rnd() * 0.3 - (i % 3 === 0 ? 0.45 : 0);
    m.position.copy(topo); m.rotateZ(a); m.rotateY(-sobe); g.add(m);
  }
  // cocos
  const coco = new T.MeshStandardMaterial({ color: 0x6b8a2a, roughness: 0.6 });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; g.add(M(T, new T.SphereGeometry(0.045, 12, 10), coco, topo.x + Math.cos(a) * 0.07, topo.y + Math.sin(a) * 0.07, topo.z - 0.06)); }
  return g;
}
function imbondeiro(T, o) {
  const g = new T.Group(), rnd = semente(o.seed || 21);
  const casca = new T.MeshStandardMaterial({ color: 0xffffff, map: texturaCasca(T, '#8f7d6c', ['#6e5f51', '#a8968a', '#7c6b5c']), roughness: 0.97 });
  const perfil = [[0, 0.46], [0.1, 0.44], [0.4, 0.5], [0.75, 0.46], [1.0, 0.33], [1.18, 0.2], [1.26, 0.15]];
  const pts = new T.SplineCurve(perfil.map(([z, r]) => new T.Vector2(r, z))).getPoints(40);
  const lg = new T.LatheGeometry(pts, 28); lg.rotateX(Math.PI / 2); g.add(new T.Mesh(lg, casca));
  // ramos grossos e tortos, quase sem folhas (é assim o imbondeiro na estação seca)
  const pontas = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + rnd() * 0.5, l = 0.45 + rnd() * 0.3;
    const p1 = [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 1.2], p2 = [Math.cos(a) * l * 0.55, Math.sin(a) * l * 0.55, 1.42 + rnd() * 0.1], p3 = [Math.cos(a + 0.3) * l, Math.sin(a + 0.3) * l, 1.55 + rnd() * 0.15];
    g.add(ramo(T, [p1, p2, p3], 0.085, 0.025, casca));
    pontas.push([p3[0], p3[1], p3[2] + 0.03, 0.1 + rnd() * 0.05]);
  }
  folhagem(T, g, pontas, rnd, ['#4c6b2a', '#86a447'], { densidade: 4200, achatar: 0.7, tam: 0.08 });
  return g;
}


// ---------- jet ski (desenho próprio): casco em V com proa bicuda, banco, guiador, faixas; origem no centro, à linha de água, frente +y ----------
export function jetski(T, o = {}) {
  const g = new T.Group();
  const casco = tinta(T, { color: o.casco ?? 0xf4f4f2 }), cor = tinta(T, { color: o.cor ?? 0xcc092f }), cor2 = tinta(T, { color: o.cor2 ?? 0xffcb00 });
  const preto = new T.MeshStandardMaterial({ color: 0x17181b, roughness: 0.55 }), banco = new T.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.75 }), cromado = metal(T, 0xd5d8dc, { roughness: 0.2 });
  // casco: perfil lateral (y ao longo, z para cima) extrudido na largura, depois afinado em V por baixo e bicudo à frente
  const perfil = [[-1.12, 0.06], [-1.12, 0.36], [0.55, 0.42], [0.98, 0.44], [1.18, 0.36], [1.2, 0.3], [0.9, 0.08], [0.3, -0.04], [-0.9, -0.03]];
  const hg = placa(T, perfil, 0.86, 'x', 0.05);
  const P = hg.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), z = P.getZ(i);
    let f = 1;
    if (y > 0.15) f *= 1 - Math.pow(Math.min(1, (y - 0.15) / 1.08), 1.7) * 0.88;   // proa bicuda
    f *= 0.55 + 0.45 * Math.min(1, Math.max(0, (z + 0.04) / 0.3));                  // fundo em V
    P.setX(i, P.getX(i) * f);
  }
  hg.computeVertexNormals();
  g.add(new T.Mesh(hg, casco));
  // faixas de cor nos lados e a "capota" da frente
  for (const sx of [1, -1]) {
    const f = new T.Mesh(new T.BoxGeometry(0.02, 1.15, 0.07), cor); f.position.set(sx * 0.39, -0.35, 0.26); g.add(f);
    const f2 = new T.Mesh(new T.BoxGeometry(0.02, 0.8, 0.035), cor2); f2.position.set(sx * 0.395, -0.45, 0.18); g.add(f2);
    const pe = new T.Mesh(new T.BoxGeometry(0.16, 0.95, 0.03), preto); pe.position.set(sx * 0.3, -0.35, 0.42); g.add(pe);         // tapetes dos pés
  }
  const capota = new T.Mesh(new T.SphereGeometry(0.3, SEG(28, 10), SEG(16, 6)), cor); capota.scale.set(1, 1.9, 0.55); capota.position.set(0, 0.62, 0.43); g.add(capota);
  const farol = new T.Mesh(new T.SphereGeometry(0.06, 16, 10), new T.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff3c4, emissiveIntensity: 0.5 })); farol.scale.set(1.6, 0.6, 0.7); farol.position.set(0, 1.05, 0.46); g.add(farol);
  // banco comprido (dois lugares)
  const bg = placa(T, [[-0.85, 0.42], [-0.85, 0.55], [-0.6, 0.62], [0.25, 0.64], [0.38, 0.58], [0.38, 0.42]], 0.34, 'x', 0.04, 5);
  g.add(new T.Mesh(bg, banco));
  // coluna, guiador, punhos e o ecrã pequeno
  const col = new T.Mesh(new T.CylinderGeometry(0.045, 0.06, 0.32, 14), preto); col.rotation.x = Math.PI / 2 - 0.5; col.position.set(0, 0.5, 0.68); g.add(col);
  const gui = new T.Mesh(new T.BoxGeometry(0.72, 0.05, 0.05), preto); gui.position.set(0, 0.42, 0.84); g.add(gui);
  for (const sx of [1, -1]) { const pu = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.13, 12), new T.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.95 })); pu.rotation.z = Math.PI / 2; pu.position.set(sx * 0.34, 0.42, 0.84); g.add(pu);
    const esp = new T.Mesh(new T.BoxGeometry(0.1, 0.02, 0.06), cromado); esp.position.set(sx * 0.3, 0.56, 0.9); g.add(esp); }
  const ecra = new T.Mesh(new T.BoxGeometry(0.16, 0.04, 0.09), preto); ecra.position.set(0, 0.5, 0.86); ecra.rotation.x = -0.4; g.add(ecra);
  // bocal do jato atrás e a grelha da tomada de água
  const bocal = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 0.16, 16), cromado); bocal.position.set(0, -1.18, 0.1); g.add(bocal);
  const deg = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.05), preto); deg.position.set(0, -1.16, 0.33); g.add(deg);                 // degrau de trás
  return g;
}

export const MODELOS = {
  jato_privado: {
    criar: T => jato(T, { L: 7.6, R: 0.42, env: 2.45, asaY: 2.75, asa: 0xeef0f2, winglet: 0xcc092f, motor: 0xf3f3f3,
      pintura: { base: '#f6f6f4', barriga: '#d7dade', faixa: '#cc092f', filete: '#ffcb00', janelas: 6, jan0: 3.3, janPasso: 0.48, matricula: 'D2-VNB' } }),
    comp: 7.6,
  },
  jato_luxo: {
    criar: T => jato(T, { L: 8.6, R: 0.48, env: 2.6, asaY: 3.1, asa: 0xd9ad2b, winglet: 0x141012, motor: 0x141012, tinta: { metalness: 0.7, roughness: 0.2 },
      pintura: { base: '#d9ad2b', barriga: '#b88a1c', faixa: '#141012', filete: '#ffffff', janelas: 8, jan0: 3.4, janPasso: 0.5, janL: 0.2, janA: 0.24, matricula: 'D2-ORO', letras: '#141012' } }),
    comp: 8.6,
  },
  avioneta: { criar: T => avioneta(T, { cor: '#e0313f' }), comp: 4.0 },

  // ---- natureza (origem no centro do quadrado) ----
  palmeira: { criar: T => palmeira(T, { H: 1.7, curva: 0.28, L: 0.62, folhas: 12, seed: 11 }) },
  mangueira: { criar: T => arvoreFolhosa(T, { seed: 4, tronco: 0.55, rt: 0.1, ramos: 4, abre: 0.35, sobe: 0.35, escuro: '#1f4a1c', claro: '#3f7a2c',
    nuvens: [[0, 0, 1.15, 0.55], [0.3, 0.1, 1.0, 0.38], [-0.28, -0.12, 1.02, 0.4], [0.05, -0.3, 1.05, 0.36], [-0.05, 0.28, 1.08, 0.36], [0, 0, 1.45, 0.38]] }) },
  acacia: { criar: T => arvoreFolhosa(T, { seed: 9, tronco: 0.95, rt: 0.08, ramos: 6, abre: 0.7, sobe: 0.22, escuro: '#2d5a22', claro: '#5d8f36', flores: '#e0372a', pFlor: 0.33, achatar: 0.42,
    nuvens: [[0, 0, 1.3, 0.5], [0.55, 0.2, 1.24, 0.42], [-0.55, -0.15, 1.26, 0.42], [0.15, 0.58, 1.25, 0.4], [-0.15, -0.58, 1.24, 0.4], [0.45, -0.45, 1.22, 0.34], [-0.45, 0.45, 1.22, 0.34]] }) },
  arvore_verde: { criar: T => arvoreFolhosa(T, { seed: 15, tronco: 0.7, rt: 0.075, ramos: 3, abre: 0.3, sobe: 0.4, escuro: '#3a6b26', claro: '#79a845',
    nuvens: [[0, 0, 1.25, 0.45], [0.22, 0.12, 1.5, 0.32], [-0.2, -0.05, 1.1, 0.34], [0.05, -0.22, 1.4, 0.3]] }) },
  imbondeiro: { criar: T => { const g = imbondeiro(T, { seed: 21 }); g.scale.setScalar(0.85); return g; } },
  // ---- protótipo de personagens (#37) ----
  pessoa_a: { criar: T => pessoa(T, { pele: 0x8d5527, cabelo: 0x1a1310, estilo: 'curto', camisa: 0xcc092f, calca: 0x2a3b55 }) },
  pessoa_b: { criar: T => pessoa(T, { pele: 0xb97a4c, cabelo: 0x1a1310, estilo: 'trancas', camisa: 0xf5b81c, calca: 0x2a3b55, roupa: 'vestido', sapato: 0x8a4a2a }) },
  pessoa_c: { criar: T => pessoa(T, { pele: 0x4a2912, cabelo: 0x1a1310, estilo: 'curto', camisa: 0xcc092f, calca: 0x23262c, roupa: 'fato' }) },
  pessoa_d: { criar: T => pessoa(T, { pele: 0x6a3c1c, cabelo: 0x4a2a17, estilo: 'afro', camisa: 0x2f8f5b, calca: 0xe8e1d0, sapato: 0xf2f2f2 }) },
  // ---- veículos (origem = canto de um retângulo 1×2, frente para +y) ----
  citadino: { criar: T => carro(T, { L: 1.62, W: 0.74, r: 0.12, c: 0.1, rodas: [0.3, 1.32], belt: 0.4, roof: 0.66, cor: 0xffcb00,
    topo: [[0, 0.14], [0, 0.3], [0.03, 0.4], [1.2, 0.4], [1.48, 0.36], [1.62, 0.3], [1.62, 0.14]], cab: [0.05, 0.14, 0.98, 1.22] }) },
  sedan: { criar: T => carro(T, { L: 1.95, W: 0.8, r: 0.14, c: 0.11, rodas: [0.36, 1.6], belt: 0.43, roof: 0.63, cor: 0x1f2e44,
    topo: [[0, 0.15], [0, 0.31], [0.04, 0.43], [1.4, 0.43], [1.62, 0.41], [1.88, 0.36], [1.95, 0.3], [1.95, 0.15]], cab: [0.42, 0.68, 1.12, 1.42] }) },
  carro: { criar: T => carro(T, { L: 1.9, W: 0.78, r: 0.13, c: 0.11, rodas: [0.36, 1.56], belt: 0.43, roof: 0.65, cor: 0x8a8f96, velho: true, jante: 0x6c7075, redondo: 0.08,
    topo: [[0, 0.15], [0, 0.33], [0.02, 0.43], [1.4, 0.43], [1.88, 0.4], [1.9, 0.33], [1.9, 0.15]], cab: [0.45, 0.6, 1.15, 1.36] }) },
  pickup: { criar: T => carro(T, { L: 2.08, W: 0.82, r: 0.16, c: 0.14, rodas: [0.38, 1.7], belt: 0.5, roof: 0.79, cor: 0xd8d8d8,
    topo: [[0, 0.18], [0, 0.5], [1.55, 0.5], [1.82, 0.48], [2.04, 0.44], [2.08, 0.38], [2.08, 0.18]], cab: [0.86, 0.9, 1.3, 1.55],
    extra: (T, c, k) => { c.add(M(T, new T.BoxGeometry(k.W * 0.74, 0.7, 0.012), k.preto, 0, 0.45, 0.565)); c.add(M(T, new T.BoxGeometry(k.W * 0.8, 0.05, 0.1), k.pintura, 0, 0.83, 0.6)); } }) },
  jipe: { criar: T => carro(T, { L: 2.02, W: 0.84, r: 0.17, c: 0.15, rodas: [0.38, 1.64], belt: 0.53, roof: 0.85, cor: 0x111418, jante: 0x2b2e33,
    topo: [[0, 0.2], [0, 0.5], [0.03, 0.53], [1.5, 0.53], [1.84, 0.5], [2.0, 0.45], [2.02, 0.36], [2.02, 0.2]], cab: [0.06, 0.12, 1.2, 1.5], janelas: 3 }) },
  suv_luxo: { criar: T => carro(T, { L: 1.98, W: 0.84, r: 0.17, c: 0.16, rodas: [0.36, 1.6], belt: 0.55, roof: 0.92, cor: 0x2a2d22, jante: 0x1d1f22, redondo: 0.05, cabLarg: 0.86,
    topo: [[0, 0.2], [0, 0.55], [1.6, 0.55], [1.96, 0.53], [1.98, 0.46], [1.98, 0.2]], cab: [0.03, 0.04, 1.3, 1.4], janelas: 3,
    extra: (T, c, k) => { const s = new T.Group(); s.add(M(T, roda(T, 0.17, 0.1), k.pneu)); s.add(M(T, roda(T, 0.1, 0.105), k.jante)); s.rotation.z = Math.PI / 2; s.position.set(0, -0.06, 0.5); c.add(s); } }) },
  carrinha: { criar: T => carro(T, { L: 2.15, W: 0.84, r: 0.14, c: 0.12, rodas: [0.36, 1.72], belt: 0.45, roof: 1.0, cor: 0x2a62c9, corCab: 0xf4f4f2, cabLarg: 0.94, janelas: 4, redondo: 0.06,
    topo: [[0, 0.15], [0, 0.45], [2.08, 0.45], [2.15, 0.4], [2.15, 0.15]], cab: [0.0, 0.02, 1.92, 2.12] }) },
  candongueiro_ouro: { criar: T => carro(T, { L: 2.15, W: 0.84, r: 0.14, c: 0.12, rodas: [0.36, 1.72], belt: 0.45, roof: 1.0, cor: 0xd9ad2b, corCab: 0xf4f4f2, ouro: true, cabLarg: 0.94, janelas: 4, redondo: 0.06, jante: 0xd9ad2b,
    topo: [[0, 0.15], [0, 0.45], [2.08, 0.45], [2.15, 0.4], [2.15, 0.15]], cab: [0.0, 0.02, 1.92, 2.12] }) },
  desportivo: { criar: T => carro(T, { L: 1.96, W: 0.86, r: 0.14, c: 0.07, rodas: [0.33, 1.55], belt: 0.35, roof: 0.5, cor: 0xcc092f, jante: 0xb9bcc0, zFarol: 0.24, zTras: 0.27,
    topo: [[0, 0.12], [0, 0.28], [0.05, 0.35], [0.4, 0.36], [1.15, 0.34], [1.6, 0.31], [1.9, 0.24], [1.96, 0.18], [1.96, 0.1]], cab: [0.36, 0.62, 0.98, 1.25] }) },
  superdesportivo: { criar: T => carro(T, { L: 1.96, W: 0.9, r: 0.14, c: 0.06, rodas: [0.32, 1.55], belt: 0.32, roof: 0.45, cor: 0xffc400, jante: 0x2a2c30, zFarol: 0.16, zTras: 0.26,
    topo: [[0, 0.1], [0, 0.3], [0.15, 0.33], [0.7, 0.33], [1.25, 0.28], [1.85, 0.18], [1.96, 0.13], [1.96, 0.09]], cab: [0.5, 0.8, 1.05, 1.5] }) },
  hipercarro: { criar: T => carro(T, { L: 1.98, W: 0.9, r: 0.14, c: 0.06, rodas: [0.32, 1.56], belt: 0.32, roof: 0.45, cor: 0xf2f2f2, jante: 0x2a2c30, zFarol: 0.16, zTras: 0.26,
    topo: [[0, 0.1], [0, 0.31], [0.15, 0.33], [0.7, 0.33], [1.25, 0.28], [1.85, 0.18], [1.98, 0.13], [1.98, 0.09]], cab: [0.5, 0.8, 1.05, 1.5],
    extra: (T, c, k) => { const lar = tinta(T, { color: 0xf07c2a });
      for (const sx of [1, -1]) c.add(M(T, new T.BoxGeometry(0.03, 0.75, 0.05), lar, sx * (k.W / 2 - 0.01), 0.95, 0.1));
      c.add(M(T, new T.BoxGeometry(k.W * 0.9, 0.16, 0.025), lar, 0, 0.08, 0.52));
      for (const sx of [1, -1]) c.add(M(T, new T.BoxGeometry(0.03, 0.05, 0.18), k.preto, sx * 0.22, 0.1, 0.42)); } }) },
  turbilhao: { criar: T => carro(T, { L: 1.98, W: 0.9, r: 0.145, c: 0.07, rodas: [0.34, 1.56], belt: 0.36, roof: 0.5, cor: 0x1e3f8a, corCab: 0x0b0b0f, jante: 0x1a1a1d, zFarol: 0.2, zTras: 0.3,
    topo: [[0, 0.12], [0, 0.32], [0.12, 0.36], [0.7, 0.37], [1.3, 0.32], [1.85, 0.24], [1.98, 0.17], [1.98, 0.09]], cab: [0.45, 0.72, 1.08, 1.4] }) },
  scooter: { criar: T => mota(T, { cor: 0x4fb3d9, r: 0.12, L: 0.9, zGuiador: 0.62, pecas: (r, L) => [
    [[[0.05, r + 0.05], [0.6, r + 0.05], [0.72, 0.5], [0.82, 0.58], [0.76, 0.6], [0.6, 0.3], [0.1, 0.32]], 0.18, 'k'],
    [[[0.02, 0.33], [0.42, 0.33], [0.42, 0.4], [0.05, 0.4]], 0.16, 'p']] }) },
  mota: { criar: T => mota(T, { cor: 0xcc092f, r: 0.15, L: 1.0, zGuiador: 0.6, pecas: (r, L) => [
    [[[0.45, 0.42], [0.75, 0.42], [0.72, 0.52], [0.5, 0.52]], 0.16, 'k'],
    [[[0.12, 0.44], [0.48, 0.44], [0.48, 0.49], [0.14, 0.49]], 0.13, 'p'],
    [[[0.3, r + 0.04], [0.7, r + 0.04], [0.75, 0.42], [0.35, 0.42]], 0.07, 'c']] }) },
  superbike: { criar: T => mota(T, { cor: 0xf07c2a, r: 0.15, L: 1.05, zGuiador: 0.52, pecas: (r, L) => [
    [[[0.3, r + 0.05], [0.9, r + 0.05], [1.02, 0.4], [0.9, 0.56], [0.72, 0.52], [0.55, 0.45], [0.25, 0.42]], 0.17, 'k'],
    [[[0.05, 0.45], [0.42, 0.45], [0.42, 0.5], [0.0, 0.55]], 0.13, 'p'],
    [[[0.82, 0.5], [0.92, 0.56], [0.86, 0.66], [0.8, 0.6]], 0.14, 'p']] }) },

  helicoptero: { criar: T => helicoptero(T, { cor: '#1d3c5e' }), comp: 4.6 },
  jetski: { criar: T => jetski(T, {}) },
  // ---- 0cz-8: coisas de trilionário ----
  f1: { criar: T => f1(T, { cor: 0xcc092f, acento: 0xffcb00 }) },
  turbilhao_ouro: { criar: T => carro(T, { L: 1.98, W: 0.9, r: 0.145, c: 0.07, rodas: [0.34, 1.56], belt: 0.36, roof: 0.5, cor: 0xd9ad2b, corCab: 0x0b0b0f, ouro: true, jante: 0xd9ad2b, zFarol: 0.2, zTras: 0.3,
    topo: [[0, 0.12], [0, 0.32], [0.12, 0.36], [0.7, 0.37], [1.3, 0.32], [1.85, 0.24], [1.98, 0.17], [1.98, 0.09]], cab: [0.45, 0.72, 1.08, 1.4] }) },
  iate: { criar: T => iate(T, {}), comp: 6.0 },
  jumbo_vip: {
    criar: T => jato(T, { L: 11, R: 0.66, env: 3.7, asaY: 4.1, asa: 0xeef0f2, winglet: 0xd9ad2b, motor: 0x141012,
      pintura: { base: '#f6f6f4', barriga: '#141012', faixa: '#cc092f', filete: '#d9ad2b', janelas: 12, jan0: 3.2, janPasso: 0.5, janL: 0.2, janA: 0.26, matricula: 'D2-VIP' } }),
    comp: 11,
  },
};

// 6 nov (Gold Exclusive C): versões douradas e diamante de cada carro/mota (as fotos do 2.5D e o 3D usam estes ids)
export const ACAB_CARROS = ['scooter', 'mota', 'superbike', 'carrinha', 'candongueiro_ouro', 'carro', 'citadino', 'sedan', 'pickup', 'jipe', 'suv_luxo', 'desportivo', 'superdesportivo', 'hipercarro', 'turbilhao'];
for (const id of ACAB_CARROS) for (const a of ['ouro', 'diamante']) {
  const base = MODELOS[id]; if (!base || (id === 'candongueiro_ouro' && a === 'ouro')) continue;
  MODELOS[`${id}__${a}`] = { ...base, criar: T => { ACAB_ATUAL = a; try { return base.criar(T); } finally { ACAB_ATUAL = null; } } };
}
