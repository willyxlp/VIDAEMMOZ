/* ============================================================
   Vida em Moz — TRÂNSITO 3D
   Carros a circular nas ruas do bairro e dos arredores, a conduzir pela esquerda (como em Moçambique):
   respeitam semáforos nos cruzamentos, mantêm distância uns dos outros e PARAM nas passadeiras quando há gente na estrada.
   Tudo é visual (não bloqueia ninguém) e usa uma InstancedMesh por peça de cada modelo → poucos pedidos de desenho.
   ============================================================ */

const PASSO = 11, LARG = 2, MARGEM = 24;
const MODELOS_TRANSITO = ['citadino', 'sedan', 'carro', 'pickup', 'jipe', 'carrinha', 'suv_luxo', 'carrinha'];   // a carrinha (chapa) aparece duas vezes: é o transporte de todos
const CICLO = 16;                                                  // s: h verde 0–6,5 · tudo vermelho · v verde 8–14,5 · tudo vermelho
const verde = (eixo, t) => { const f = t % CICLO; return eixo === 'h' ? f < 6.5 : (f >= 8 && f < 14.5); };

function semente(s) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * cena: { id, W, H, chao, estradas }.   criarModelo(id) → Group com malhas (ex.: proto('carro|id|', …)).
 * devolve { grupo, atualizar(dt, pessoas), n } ou null se não houver ruas.
 */
export function criarTransito(T, cena, criarModelo, opcoes = {}) {
  const { W, H } = cena, rnd = semente([...String(cena.id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 3));
  const ps = (cena.estradas || []).filter(e => e.eixo === 'h').map(e => e.p);
  if (!ps.length) return null;
  const e0 = Math.min(...ps);
  let marL = 0; if (cena.chao && cena.chao[0] === 3) while (marL < W && cena.chao[marL] === 3) marL++;     // ilha: o mar não tem estradas
  const lo = marL ? e0 : -MARGEM, todas = [];
  for (let e = e0 - PASSO * 6; e <= Math.max(W, H) + MARGEM; e += PASSO) todas.push(e);
  const horizontais = todas.filter(e => e >= -MARGEM && e <= H + MARGEM), verticais = todas.filter(e => e >= lo && e <= W + MARGEM);
  const densidade = opcoes.densidade ?? 1, espaco = 90 / densidade;

  // faixas: conduz-se pela esquerda → para a direção +, a faixa fica do lado "esquerdo" (+y para h, −x para v)
  const faixas = [];
  for (const e of horizontais) {
    faixas.push({ eixo: 'h', c: e + 1.5, dir: 1, min: lo, max: W + MARGEM, cars: [] }, { eixo: 'h', c: e + 0.5, dir: -1, min: lo, max: W + MARGEM, cars: [] });
  }
  for (const e of verticais) {
    faixas.push({ eixo: 'v', c: e + 0.5, dir: 1, min: -MARGEM, max: H + MARGEM, cars: [] }, { eixo: 'v', c: e + 1.5, dir: -1, min: -MARGEM, max: H + MARGEM, cars: [] });
  }
  const carros = [];
  for (const f of faixas) {
    const len = f.max - f.min, n = Math.max(1, Math.round(len / espaco));
    for (let i = 0; i < n; i++) {
      const c = { f, s: (i + rnd() * 0.6) * (len / n), v: 0, vmax: 2.4 + rnd() * 1.3, m: Math.floor(rnd() * MODELOS_TRANSITO.length), x: 0, y: 0 };
      f.cars.push(c); carros.push(c);
    }
  }

  // uma InstancedMesh por peça de cada modelo
  const grupo = new T.Group(), porModelo = MODELOS_TRANSITO.map((id, i) => ({ id, i, lista: [], inst: [] }));
  for (const c of carros) porModelo[c.m].lista.push(c);
  const feitos = new Map();
  for (const pm of porModelo) {
    if (!pm.lista.length) continue;
    if (!feitos.has(pm.id)) feitos.set(pm.id, criarModelo(pm.id));
    const base = feitos.get(pm.id); if (!base) continue;
    for (const m of base.children) {
      if (!m.isMesh) continue;
      const im = new T.InstancedMesh(m.geometry, m.material, pm.lista.length);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
      pm.inst.push(im); grupo.add(im);
    }
  }

  const M = new T.Matrix4(), Rz = new T.Matrix4(), Tr = new T.Matrix4(), Tc = new T.Matrix4().makeTranslation(-0.5, -1.0, 0), P = new T.Matrix4();
  let t = rnd() * CICLO;

  function atualizar(dt, pessoas = []) {
    dt = Math.min(dt, 0.1); t += dt;
    for (const f of faixas) {
      const len = f.max - f.min, l = f.cars;
      l.sort((a, b) => a.s - b.s);
      for (let i = 0; i < l.length; i++) {
        const c = l[i], u = f.dir > 0 ? f.min + c.s : f.max - c.s, frente = u + f.dir * 1.1;
        let alvo = c.vmax;
        // 1) semáforo antes de cada cruzamento
        const cruz = f.eixo === 'h' ? verticais : horizontais, eixoPerp = f.eixo === 'h' ? 'v' : 'h';
        for (const e2 of cruz) {
          const d = f.dir > 0 ? (e2 - 0.35) - frente : frente - (e2 + LARG + 0.35);
          if (d >= -0.05 && d < 3.4 && !verde(f.eixo, t)) alvo = Math.min(alvo, d < 0.12 ? 0 : Math.sqrt(2 * 5 * d));
        }
        // 2) distância ao carro da frente (o seguinte na ordem, com a volta da faixa)
        const lider = l[(i + 1) % l.length];
        if (lider !== c) {
          let gap = lider.s - c.s - 2.4; if (gap < -len / 2) gap += len; if (gap < 0 && lider.s < c.s) gap += len;
          if (gap < 3) alvo = Math.min(alvo, gap < 0.25 ? 0 : Math.min(lider.v + 0.2, Math.sqrt(2 * 5 * (gap - 0.1))));
        }
        // 3) passadeiras / gente na estrada
        for (const p of pessoas) {
          if (!p || p.x == null) continue;
          const pu = f.eixo === 'h' ? p.x : p.y, pc = f.eixo === 'h' ? p.y : p.x;
          const a = (pu - frente) * f.dir;
          if (a > -0.6 && a < 2.8 && Math.abs(pc - f.c) < 0.95) alvo = Math.min(alvo, a < 1.2 ? 0 : 0.8);
        }
        c.v += Math.max(-6 * dt, Math.min(2.2 * dt, alvo - c.v));
        c.s += c.v * dt;
        if (c.s >= len) c.s -= len;
      }
    }
    for (const pm of porModelo) {
      pm.lista.forEach((c, k) => {
        const f = c.f, u = f.dir > 0 ? f.min + c.s : f.max - c.s;
        const x = f.eixo === 'h' ? u : f.c, y = f.eixo === 'h' ? f.c : u;
        const rot = f.eixo === 'h' ? (f.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (f.dir > 0 ? 0 : Math.PI);
        Tr.makeTranslation(x, y, 0); Rz.makeRotationZ(rot);
        M.copy(Tr).multiply(Rz).multiply(Tc);
        for (const im of pm.inst) im.setMatrixAt(k, M);
      });
      for (const im of pm.inst) im.instanceMatrix.needsUpdate = true;
    }
  }
  atualizar(0.016, []);
  return { grupo, atualizar, n: carros.length };
}
