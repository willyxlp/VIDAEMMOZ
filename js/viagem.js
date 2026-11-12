/* ============================================================
   Vida na Banda — viagens na primeira pessoa
   Candongueiro, autocarro, táxi, carro, mota, kupapata, comboio,
   barco e avião: vês tudo de dentro, com painéis de publicidade
   (e a hospedeira a mostrar um panfleto, no avião).
   ============================================================ */

const DUR_VIAGEM = { boleia: 12, candongueiro: 9, kupapata: 13, taxi: 9, mota: 13, carro: 9, autocarro: 16, comboio: 16, barco: 11, aviao: 40, privado: 18, fretado: 18 };   // 0cz (9): de mota a viagem é mais longa e mais lenta (mais tempo para os anúncios)
// só os meios relativamente caros deixam saltar a viagem (dono, 27 out); os baratos vêem-se até ao fim
const SALTAR_APOS = { aviao: 33, privado: 16, fretado: 16, taxi: 7 };   // 0l (dono, 27 out): mais tempo de anúncios antes de poder saltar (o panfleto do avião fica até aos 31 s)

// um anúncio real dos outdoors (ou o convite para anunciar)
function anuncioViagem() {
  // os anúncios da loja (slot «lugar:…») só aparecem no lugar que compraram (ver anuncioParaViagem)
  const todos = typeof outdoors !== 'undefined' ? [...outdoors].filter(([s]) => !s.startsWith('lugar:')).flatMap(([, l]) => l) : [];
  return adViagemDe(todos.length ? todos[Math.floor(Math.random() * todos.length)] : null);
}
// 0u: o anúncio comprado na loja para este lugar exato (painel do candongueiro, boias…), ou null
function anuncioParaViagem(lugar) {
  const ad = typeof window.anuncioPara === 'function' ? window.anuncioPara(lugar) : null;
  return ad ? adViagemDe(ad) : null;
}
window.anuncioParaViagem = anuncioParaViagem;
function adViagemDe(ad) {
  let img = null;
  if (ad?.imagem) { img = (typeof imagensOutdoor !== 'undefined' && imagensOutdoor.get(ad.imagem)) || null; if (!img) { img = new Image(); img.crossOrigin = 'anonymous'; img.src = ad.imagem; } }
  if (ad?.id && typeof vistoAnuncio === 'function') vistoAnuncio(ad.id);   // #41a: conta como vista
  if (ad) return { id: ad.id, marca: ad.marca, texto: ad.texto || '', img, url: ad.imagem || null };
  // sem anúncio vendido: o convite (frase traduzida + o email numa linha só dele, nunca cortado)
  return { marca: 'O teu anúncio aqui', texto: 'Anuncia no Vida na Banda', contacto: 'vidanabanda.com/anunciar', img: null };   // 0u: a loja online
}

/* ---------- viagens em 3D a sério (js/viagem3d.js, three.js): para todos os aparelhos com WebGL ----------
   localStorage vel_viagem3d = '0' volta ao desenho 2D (que fica sempre como reserva se o 3D falhar). */
function usarViagem3D() {
  try { if (localStorage.getItem('vel_viagem3d') === '0') return false; } catch { }
  return typeof temWebGL === 'function' && temWebGL();
}
function carregarViagem3D() {
  if (window.V3D || carregarViagem3D._a || !usarViagem3D()) return;
  carregarViagem3D._a = true;
  import('./viagem3d.js').catch(e => { console.warn('viagens 3D não carregaram', e); carregarViagem3D._a = false; carregarViagem3D._erro = true; });
}
// descarrega cedo (sem pressa) para a primeira viagem já ser em 3D
setTimeout(() => { if (typeof requestIdleCallback === 'function') requestIdleCallback(carregarViagem3D, { timeout: 8000 }); else carregarViagem3D(); }, 4000);

// relógio da viagem (os testes podem pôr um relógio próprio em window.__relogioViagem para fotografar momentos exatos)
const relogioViagem = () => (typeof window.__relogioViagem === 'function' ? window.__relogioViagem() : performance.now());
// quanto tempo esperamos pelo 3D (descarregar + preparar os gráficos) antes de usar o desenho 2D; o relógio da viagem só conta depois
const ESPERA_3D = 15000;
let somBuzina = null;
function buzinar(mota) {
  try {
    const A = somBuzina || (somBuzina = new (window.AudioContext || window.webkitAudioContext)());
    if (A.state === 'suspended') A.resume();
    const t = A.currentTime, g = A.createGain(), f = A.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = mota ? 2600 : 1800; g.connect(A.destination); f.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.setValueAtTime(0.16, t + 0.42); g.gain.linearRampToValueAtTime(0, t + 0.5);
    for (const hz of mota ? [520, 660] : [410, 515]) { const o = A.createOscillator(); o.type = 'square'; o.frequency.value = hz; o.connect(f); o.start(t); o.stop(t + 0.52); }
  } catch { }
}
function viagemPrimeiraPessoa(meio, destino, opts = {}) {   // opts.com: aparência de quem vai contigo (encontros)
  const dur = (DUR_VIAGEM[meio] || 9) * 1000, saltar = (SALTAR_APOS[meio] || 999) * 1000;
  const v = document.createElement('div'); v.id = 'viagemFP';
  v.style.cssText = 'position:fixed;inset:0;z-index:40;background:#000;touch-action:none;user-select:none;-webkit-user-select:none';
  v.innerHTML = `<canvas style="width:100%;height:100%;display:block;position:absolute;inset:0"></canvas>
    <div id="vfCarga" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none;transition:opacity .4s">
      <div style="width:38px;height:38px;border-radius:50%;border:3px solid #ffffff22;border-top-color:#FFCB00;animation:vfGira .9s linear infinite"></div>
      <div style="color:#ffffffcc;font:600 13px Inter,system-ui,sans-serif">${tr('A preparar a viagem…')}</div></div>
    <div id="vfDica" style="position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 18px);display:flex;justify-content:center;pointer-events:none;opacity:0;transition:opacity .5s">
      <div style="background:rgba(14,11,9,.72);color:#fff;padding:7px 13px;border-radius:999px;font:600 13px Inter,system-ui,sans-serif">👆 ${tr('Arrasta para olhar à volta')}</div></div>
    <div style="position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 70px);display:flex;justify-content:center;pointer-events:none">
      <div style="background:rgba(14,11,9,.72);color:#fff;padding:8px 14px;border-radius:14px;font:700 14px Inter,system-ui,sans-serif;text-align:center;min-width:220px">
        <div id="vfTxt"></div><div style="height:4px;background:#ffffff33;border-radius:3px;margin-top:6px;overflow:hidden"><div id="vfBar" style="height:100%;width:0;background:#FFCB00"></div></div></div></div>
    ${['carro', 'mota'].includes(meio) ? `<button id="vfBuzina" class="btn sm ghost" style="position:absolute;left:14px;bottom:calc(env(safe-area-inset-bottom) + 16px)">📯 ${tr('Buzinar')}</button>
    <div id="vfBii" style="position:absolute;left:0;right:0;top:38%;text-align:center;font:900 34px 'Bricolage Grotesque',Inter,sans-serif;color:#FFCB00;text-shadow:0 3px 12px #000;opacity:0;transition:opacity .25s;pointer-events:none">BII-BIII!</div>` : ''}
    <button id="vfSaltar" class="btn sm ghost" style="position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom) + 16px);display:none">${tr('Saltar')} ⏭</button>
    <style>@keyframes vfGira{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(v);
  v.querySelector('#vfTxt').textContent = `${MEIOS[meio] ? MEIOS[meio](1).e : ''} ${tr('A caminho de')} ${tr(destino)}`;   // 0t: o nome do bairro também se traduz («Luanda Island»)
  const cv = v.querySelector('canvas'), ctx = cv.getContext('2d'), carga = v.querySelector('#vfCarga'), dica = v.querySelector('#vfDica');
  const ad = anuncioViagem(), ad2 = anuncioViagem(), r = rng((Date.now() & 0xffff) + 7);
  const passageiros = Array.from({ length: 8 }, () => aparenciaAleatoria(r));
  if (opts.com) passageiros[1] = opts.com;   // quem vai contigo senta-se ao teu lado
  const noite = typeof escuridao === 'function' ? escuridao() : 0;
  // modo: 'espera' (a preparar o 3D, ecrã escuro com a roda a girar) → '3d' ou '2d'. O relógio da viagem só começa depois.
  let c3 = null, modo = usarViagem3D() ? 'espera' : '2d', t0 = null, tEspera = relogioViagem();
  if (modo === 'espera') cv.style.display = 'none';
  const usar2D = (porque) => { if (porque) console.warn('viagem 3D: fica o desenho 2D —', porque); try { c3?.parar(); } catch { } if (c3?.canvas.parentNode) c3.canvas.remove(); c3 = null; window.V3D_FOTO = null; cv.style.display = ''; modo = '2d'; };
  const criar3 = () => {
    try {
      const meus = J?.itens || [];
      c3 = window.V3D.criar({ meio, destino, ad, ad2, novoAd: anuncioViagem, passageiros, noite, dur: dur / 1000,
        tempo: typeof tempoAqui === 'function' ? tempoAqui() : null,
        eu: typeof minhaAparencia === 'function' ? minhaAparencia() : {},
        carro: typeof veiculosLaFora === 'function' ? veiculosLaFora().carros.find(i => !['scooter', 'mota', 'superbike'].includes(i.id))?.id : null,
        mota: ['superbike', 'mota', 'scooter'].find(id => meus.includes(id)),
        musica: typeof musicaAtual === 'function' && musicaAtual() ? musicaAtual().titulo : null });
      // o 3D aparece (a fundir do preto) quando os gráficos estiverem prontos
      c3.canvas.style.opacity = '0'; c3.canvas.style.transition = 'opacity .45s'; v.insertBefore(c3.canvas, cv);
      c3.pronto.then(() => { if (c3 && modo === 'espera') { c3.visivel = true; c3.canvas.style.opacity = '1'; window.V3D_PRONTO = true; modo = '3d'; } });
      window.V3D_FOTO = c3.foto;
    } catch (e) { usar2D(e); }
  };
  if (modo === 'espera') { if (window.V3D) criar3(); else carregarViagem3D(); }
  let fim, acabou = false, raf;
  const promessa = new Promise(res => { fim = () => { if (acabou) return; acabou = true; cancelAnimationFrame(raf); v.style.transition = 'opacity .35s'; v.style.opacity = '0';
    try { if (c3?.exposicao && typeof registarExposicao === 'function') registarExposicao(c3.exposicao()); } catch { }   // 0l: quanto tempo cada anúncio esteve à vista
    setTimeout(() => { try { c3?.parar(); } catch { } if (c3?.canvas.parentNode === v) v.removeChild(c3.canvas); window.V3D_FOTO = null; window.V3D_PRONTO = false; v.remove(); res(); }, 350); }; });
  v.querySelector('#vfSaltar').onclick = () => fim();
  // LL29: buzinar (carro e mota) — duas notas como uma buzina de verdade, sem ficheiros de som
  const bz = v.querySelector('#vfBuzina');
  if (bz) bz.onclick = () => {
    buzinar(meio === 'mota'); const bi = v.querySelector('#vfBii'); bi.style.opacity = '1'; clearTimeout(bz._t); bz._t = setTimeout(() => { bi.style.opacity = '0'; }, 600);
    if (navigator.vibrate) try { navigator.vibrate(60); } catch { }
  };
  // olhar à volta: arrastar com o dedo (ou o rato) roda a cabeça dentro do veículo
  let arr = null, mexeu = false;
  v.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; arr = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { v.setPointerCapture(e.pointerId); } catch { } });
  v.addEventListener('pointermove', e => { if (!arr || e.pointerId !== arr.id || !c3 || modo !== '3d') return;
    const k = 2.4 / Math.max(320, Math.min(innerWidth, innerHeight * 1.2));   // ~ meia volta a arrastar o ecrã de lado a lado
    c3.rodar((e.clientX - arr.x) * k, (e.clientY - arr.y) * k * 0.8); arr.x = e.clientX; arr.y = e.clientY;
    if (!mexeu) { mexeu = true; dica.style.opacity = '0'; } });
  const largar = e => { if (arr && e.pointerId === arr.id) arr = null; };
  v.addEventListener('pointerup', largar); v.addEventListener('pointercancel', largar);
  const tam = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  tam(); addEventListener('resize', tam);
  const quadro = () => {
    const now = relogioViagem(), W = innerWidth, H = innerHeight;
    if (modo === 'espera') {
      if (!c3 && window.V3D) criar3();
      else if (!c3 && carregarViagem3D._erro) usar2D('não descarregou');
      if (modo === 'espera' && now - tEspera > ESPERA_3D) usar2D('demorou demais');
    }
    if (modo !== 'espera' && t0 === null) { t0 = now; carga.style.opacity = '0'; if (modo === '3d' && !mexeu) { dica.style.opacity = '1'; setTimeout(() => { dica.style.opacity = '0'; }, 4500); } }
    const t = t0 === null ? 0 : (now - t0) / 1000;
    if (modo === '3d' && c3) {
      try { c3.quadro(t); }
      catch (e) { usar2D(e); }
    }
    if (modo === '2d') { ctx.clearRect(0, 0, W, H); try { DESENHO_VIAGEM[cenaDe(meio)](ctx, W, H, t, { ad, passageiros, noite: Math.min(1, noite / 0.48), meio })   /* 0g-C: a mesma noite do 3D */; } catch (e) { } }
    v.querySelector('#vfBar').style.width = (t0 === null ? 0 : Math.min(100, (now - t0) / dur * 100)) + '%';
    if (t0 !== null && now - t0 > saltar) v.querySelector('#vfSaltar').style.display = '';
    if (t0 !== null && now - t0 >= dur) return fim();
    raf = requestAnimationFrame(quadro);
  };
  raf = requestAnimationFrame(quadro);
  promessa.then(() => removeEventListener('resize', tam));
  return { promessa, fim, get em3d() { return modo === '3d' && !!c3; }, c3: () => c3 };
}
const cenaDe = m => ({ candongueiro: 'van', autocarro: 'autocarro', taxi: 'taxi', boleia: 'taxi', carro: 'carro', mota: 'mota', kupapata: 'kupapata', comboio: 'comboio', barco: 'barco', aviao: 'aviao', privado: 'privado', fretado: 'privado' })[m] || 'carro';

/* ---------- peças comuns ---------- */
function ceuViagem(ctx, W, H, hy, noite) {
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, noite > 0.5 ? '#0b1430' : '#4aa3df'); g.addColorStop(1, noite > 0.5 ? '#2a2a4a' : '#bfe6ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
  if (noite < 0.5) { ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(W * 0.8, hy * 0.35, 18, 0, 7); ctx.fill(); }
}
// estrada em perspetiva, com palmeiras, prédios e um outdoor com o anúncio
function estradaViagem(ctx, W, H, t, o, vel = 1.3) {
  const hy = H * 0.42, cx = W / 2;
  ceuViagem(ctx, W, H, hy, o.noite);
  ctx.fillStyle = o.noite > 0.5 ? '#1e2a1a' : '#6f9b4a'; ctx.fillRect(0, hy, W, H - hy);
  ctx.fillStyle = o.noite > 0.5 ? '#2a2a30' : '#4b4c52';
  ctx.beginPath(); ctx.moveTo(cx - 6, hy); ctx.lineTo(cx + 6, hy); ctx.lineTo(W * 0.95, H); ctx.lineTo(W * 0.05, H); ctx.closePath(); ctx.fill();
  const prof = z => hy + (H - hy) * z * z;          // z 0..1 (longe → perto)
  ctx.fillStyle = '#f2f2f2';
  for (let i = 0; i < 10; i++) {
    const z = ((i / 10) + t * vel * 0.25) % 1, z2 = Math.min(1, z + 0.04);
    const y1 = prof(z), y2 = prof(z2), w1 = 1 + z * 6, w2 = 1 + z2 * 6;
    ctx.beginPath(); ctx.moveTo(cx - w1, y1); ctx.lineTo(cx + w1, y1); ctx.lineTo(cx + w2, y2); ctx.lineTo(cx - w2, y2); ctx.fill();
  }
  // coisas à beira da estrada (de longe para perto)
  const coisas = [];
  for (let i = 0; i < 14; i++) { const z = ((i / 14) + t * vel * 0.25) % 1; coisas.push({ z, lado: i % 2 ? 1 : -1, tipo: i % 7 === 3 ? 'outdoor' : i % 3 ? 'palmeira' : 'predio', k: i }); }
  coisas.sort((a, b) => a.z - b.z);
  for (const c of coisas) {
    const y = prof(c.z), esc = 0.05 + c.z * c.z * 1.6, x = cx + c.lado * (W * 0.08 + (W * 0.75) * c.z * c.z);
    if (c.tipo === 'palmeira') {
      ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 6 * esc; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10 * esc, y - 60 * esc, x + 4 * esc, y - 120 * esc); ctx.stroke();
      ctx.fillStyle = '#2f7d3b'; for (let f = 0; f < 6; f++) { ctx.beginPath(); ctx.ellipse(x + 4 * esc + Math.cos(f) * 22 * esc, y - 120 * esc + Math.sin(f) * 8 * esc, 26 * esc, 7 * esc, f, 0, 7); ctx.fill(); }
    } else if (c.tipo === 'predio') {
      const cores = ['#e9dcc4', '#f3d36b', '#8fc4e8', '#e9a3b4', '#f5f1e8'], bw = 90 * esc, bh = (140 + (c.k % 4) * 40) * esc;
      ctx.fillStyle = cores[c.k % cores.length]; ctx.fillRect(x - bw / 2, y - bh, bw, bh);
      ctx.fillStyle = o.noite > 0.5 ? '#ffd76a' : '#2b3a46'; for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) ctx.fillRect(x - bw / 2 + bw * (0.12 + a * 0.3), y - bh + bh * (0.1 + b * 0.22), bw * 0.16, bh * 0.1);
    } else {
      const bw = 150 * esc, bh = 80 * esc;
      ctx.fillStyle = '#333'; ctx.fillRect(x - 3 * esc, y - 120 * esc, 6 * esc, 120 * esc);
      painelAnuncio(ctx, x - bw / 2, y - 120 * esc - bh, bw, bh, o.ad);
    }
  }
}
function painelAnuncio(ctx, x, y, w, h, ad, borda = '#141012') {
  ctx.fillStyle = borda; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  if (ad.img && ad.img.complete && ad.img.naturalWidth) { ctx.drawImage(ad.img, x, y, w, h); return; }
  ctx.fillStyle = '#FFCB00'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#141012'; ctx.textAlign = 'center';
  // cada linha encolhe até caber na largura do painel (nada de texto cortado a meio)
  const linha = (txt, peso, tam, yy) => { let f = tam; ctx.font = `${peso} ${f}px Inter, system-ui, sans-serif`;
    while (f > 5 && ctx.measureText(txt).width > w * 0.92) { f -= 0.5; ctx.font = `${peso} ${f}px Inter, system-ui, sans-serif`; }
    ctx.fillText(txt, x + w / 2, yy); };
  const conv = !!ad.contacto;
  linha(tr(ad.marca), 800, Math.max(8, h * 0.26), y + h * (conv ? 0.4 : 0.45));
  if (ad.texto) linha(conv ? tr(ad.texto) : ad.texto, 600, Math.max(6, h * 0.13), y + h * (conv ? 0.66 : 0.75));
  if (conv) linha(ad.contacto, 600, Math.max(6, h * 0.12), y + h * 0.86);
}
function cabecaDeCostas(ctx, x, y, s, ap) {
  ctx.fillStyle = PELES[(ap.pele || 3) - 1] || '#8d5527'; ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 19 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = CORES_CABELO[ap.corCabelo || 0]; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 17 * s, ap.cabelo === 2 ? 20 * s : 15 * s, 0, Math.PI, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = ap.camisa || '#2c6fb0'; ctx.beginPath(); ctx.ellipse(x, y + 34 * s, 30 * s, 18 * s, 0, Math.PI, 2 * Math.PI); ctx.fill();
}
function abanao(t, f = 1) { return Math.sin(t * 13) * 1.2 * f + Math.sin(t * 5.3) * 0.8 * f; }

/* ---------- cenas ---------- */
const DESENHO_VIAGEM = {
  // candongueiro azul e branco: bancos, gente, cobrador e o painel de publicidade no teto
  van(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 1.6));
    estradaViagem(ctx, W, H, t, o, 1.2);
    // moldura do para-brisas e interior
    ctx.fillStyle = '#1d2e4a';
    ctx.fillRect(0, 0, W, H * 0.12); ctx.fillRect(0, 0, W * 0.06, H); ctx.fillRect(W * 0.94, 0, W * 0.06, H);
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, H * 0.1, W, 6);
    painelAnuncio(ctx, W * 0.2, H * 0.015, W * 0.6, H * 0.085, o.ad, '#f2f2f2');
    ctx.fillStyle = '#2c6fb0'; ctx.fillRect(0, H * 0.52, W, H * 0.08);           // tablier azul
    ctx.fillStyle = '#141012'; ctx.beginPath(); ctx.arc(W * 0.24, H * 0.6, W * 0.11, Math.PI, 2 * Math.PI); ctx.lineWidth = 10; ctx.strokeStyle = '#141012'; ctx.stroke();
    cabecaDeCostas(ctx, W * 0.24, H * 0.47, W / 420, o.passageiros[0]);         // motorista
    // filas de bancos com passageiros
    for (let fila = 0; fila < 2; fila++) {
      const y = H * (0.68 + fila * 0.17), s = W / 360 * (1 + fila * 0.35);
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(0, y + 10 * s, W, H * 0.2);
      for (let k = 0; k < 3; k++) cabecaDeCostas(ctx, W * (0.2 + k * 0.3), y, s, o.passageiros[1 + fila * 3 + k]);
    }
    ctx.restore();
  },
  autocarro(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 0.8));
    estradaViagem(ctx, W, H, t, o, 0.9);
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, W, H * 0.14); ctx.fillRect(0, 0, W * 0.05, H); ctx.fillRect(W * 0.95, 0, W * 0.05, H);
    for (let k = 0; k < 2; k++) painelAnuncio(ctx, W * (0.06 + k * 0.46), H * 0.02, W * 0.42, H * 0.1, k ? anuncioViagem() : o.ad, '#9aa0a6');
    for (let fila = 0; fila < 3; fila++) {
      const y = H * (0.6 + fila * 0.13), s = W / 400 * (1 + fila * 0.3);
      for (let k = 0; k < 4; k++) { if (k === 2) continue; ctx.fillStyle = '#2c6fb0'; ctx.fillRect(W * (0.08 + k * 0.23) - 4, y + 12 * s, W * 0.18, H * 0.2); cabecaDeCostas(ctx, W * (0.17 + k * 0.23), y, s, o.passageiros[(fila * 3 + k) % 8]); }
    }
    ctx.restore();
  },
  // táxi: vais no banco de trás, com um ecrã de publicidade no encosto do motorista
  taxi(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 0.9));
    estradaViagem(ctx, W, H, t, o, 1.5);
    ctx.fillStyle = '#1e1e24'; ctx.fillRect(0, 0, W, H * 0.08); ctx.fillRect(0, 0, W * 0.08, H); ctx.fillRect(W * 0.92, 0, W * 0.08, H);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    cabecaDeCostas(ctx, W * 0.3, H * 0.45, W / 380, o.passageiros[0]);
    ctx.fillStyle = '#141012'; ctx.fillRect(W * 0.12, H * 0.55, W * 0.36, H * 0.32); ctx.fillRect(W * 0.52, H * 0.55, W * 0.36, H * 0.32);
    painelAnuncio(ctx, W * 0.16, H * 0.6, W * 0.28, H * 0.12, o.ad, '#333');                   // ecrã no encosto
    ctx.fillStyle = '#f5b81c'; ctx.fillRect(W * 0.6, H * 0.6, W * 0.24, H * 0.05);
    ctx.restore();
  },
  // o teu carro: volante, tablier e espelho
  carro(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 0.6));
    estradaViagem(ctx, W, H, t, o, 1.7);
    ctx.fillStyle = '#141012'; ctx.fillRect(0, 0, W, H * 0.06); ctx.fillRect(0, 0, W * 0.07, H); ctx.fillRect(W * 0.93, 0, W * 0.07, H);
    ctx.fillStyle = '#141012'; ctx.fillRect(W * 0.4, H * 0.06, W * 0.2, H * 0.04);               // espelho
    ctx.fillStyle = '#1e1e24'; ctx.beginPath(); ctx.moveTo(0, H * 0.68); ctx.quadraticCurveTo(W / 2, H * 0.6, W, H * 0.68); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = W * 0.035; ctx.beginPath(); ctx.arc(W * 0.3, H * 0.86, W * 0.18, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#2b3a46'; ctx.fillRect(W * 0.58, H * 0.72, W * 0.2, H * 0.08);               // ecrã do carro
    ctx.fillStyle = '#16a3a3'; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📻 ' + (typeof musicaAtual === 'function' && musicaAtual() ? musicaAtual().titulo : tr('Rádio Luanda')), W * 0.68, H * 0.765);
    ctx.restore();
  },
  // mota: guiador, espelhos e o vento
  mota(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 2));
    estradaViagem(ctx, W, H, t, o, 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) { const y = (i * 71 + t * 600) % H, x = (i * 137) % W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x < W / 2 ? -30 : 30), y + 8); ctx.stroke(); }
    ctx.fillStyle = '#141012'; ctx.fillRect(W * 0.15, H * 0.82, W * 0.7, H * 0.03);
    ctx.fillRect(W * 0.1, H * 0.8, W * 0.08, H * 0.05); ctx.fillRect(W * 0.82, H * 0.8, W * 0.08, H * 0.05);
    ctx.fillStyle = '#cc092f'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.95, W * 0.22, H * 0.1, 0, Math.PI, 2 * Math.PI); ctx.fill();
    for (const s of [-1, 1]) { ctx.fillStyle = '#333'; ctx.fillRect(W / 2 + s * W * 0.32 - 2, H * 0.68, 4, H * 0.12); ctx.fillStyle = '#9fb7c4'; ctx.beginPath(); ctx.ellipse(W / 2 + s * W * 0.32, H * 0.66, 16, 11, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  },
  // kupapata: vais atrás do motoqueiro (e há um autocolante de publicidade no capacete dele)
  kupapata(ctx, W, H, t, o) {
    DESENHO_VIAGEM.mota(ctx, W, H, t, o);
    const s = W / 300;
    ctx.save(); ctx.translate(0, abanao(t, 2));
    ctx.fillStyle = '#f5b81c'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.98, 90 * s, 110 * s, 0, Math.PI, 2 * Math.PI); ctx.fill();   // colete
    ctx.fillStyle = '#141012'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.6, 34 * s, 38 * s, 0, 0, 7); ctx.fill();                  // capacete
    painelAnuncio(ctx, W / 2 - 22 * s, H * 0.58, 44 * s, 16 * s, o.ad, '#141012');
    ctx.restore();
  },
  // comboio: janela lateral com o país a passar e um cartaz na parede
  comboio(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, abanao(t, 0.7));
    const hy = H * 0.45; ceuViagem(ctx, W, H, hy, o.noite);
    ctx.fillStyle = '#7da35a'; ctx.beginPath(); ctx.moveTo(0, hy);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, hy - 40 - Math.sin((x + t * 60) / 90) * 25); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#b4683f'; ctx.fillRect(0, hy + 40, W, H);
    for (let i = 0; i < 8; i++) { const x = W - ((i * 160 + t * 260) % (W + 200)); ctx.fillStyle = '#2f7d3b'; ctx.beginPath(); ctx.arc(x, hy + 30, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 3, hy + 40, 6, 26); }
    for (let i = 0; i < 5; i++) { const x = W - ((i * 270 + t * 420) % (W + 300)); ctx.fillStyle = '#c8704a'; ctx.fillRect(x, hy + 60, 60, 36); ctx.fillStyle = '#7a4b2c'; ctx.beginPath(); ctx.moveTo(x - 6, hy + 60); ctx.lineTo(x + 30, hy + 38); ctx.lineTo(x + 66, hy + 60); ctx.fill(); }
    // moldura da carruagem
    ctx.fillStyle = '#e6e2da'; ctx.fillRect(0, 0, W, H * 0.16); ctx.fillRect(0, H * 0.72, W, H * 0.28); ctx.fillRect(0, 0, W * 0.07, H); ctx.fillRect(W * 0.93, 0, W * 0.07, H);
    painelAnuncio(ctx, W * 0.2, H * 0.03, W * 0.6, H * 0.11, o.ad, '#9aa0a6');
    ctx.fillStyle = '#2c6fb0'; ctx.fillRect(W * 0.1, H * 0.76, W * 0.8, H * 0.12);
    ctx.restore();
  },
  // barco para o Mussulo: mar, a ilha a crescer e uma boia com publicidade
  barco(ctx, W, H, t, o) {
    ctx.save(); ctx.translate(0, Math.sin(t * 2) * 4);
    const hy = H * 0.42; ceuViagem(ctx, W, H, hy, o.noite);
    ctx.fillStyle = '#2b84ad'; ctx.fillRect(0, hy, W, H - hy);
    const ilha = 0.2 + t / 11 * 0.8;
    ctx.fillStyle = '#e9d39c'; ctx.beginPath(); ctx.ellipse(W / 2, hy + 4, W * 0.25 * ilha, 10 * ilha, 0, Math.PI, 2 * Math.PI); ctx.fill();
    for (let k = -2; k <= 2; k++) { ctx.fillStyle = '#2f7d3b'; ctx.beginPath(); ctx.arc(W / 2 + k * 26 * ilha, hy - 18 * ilha, 10 * ilha, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const z = ((i / 18) + t * 0.3) % 1, y = hy + (H - hy) * z * z, x = (i * 97) % W; ctx.beginPath(); ctx.moveTo(x - 20 * z, y); ctx.quadraticCurveTo(x, y - 4 * z, x + 20 * z, y); ctx.stroke(); }
    ctx.fillStyle = '#f5f1e8'; ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.lineTo(W / 2, H * 0.62); ctx.lineTo(W, H * 0.72); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, H * 0.66); ctx.lineTo(W / 2, H * 0.56); ctx.lineTo(W, H * 0.66); ctx.stroke();
    painelAnuncio(ctx, W * 0.3, H * 0.78, W * 0.4, H * 0.1, o.ad, '#cc092f');
    ctx.restore();
  },
  // avião: corredor, janelas com nuvens e a hospedeira que vem mostrar um panfleto
  aviao(ctx, W, H, t, o) { cabineAviao(ctx, W, H, t, o, false); },
  privado(ctx, W, H, t, o) { cabineAviao(ctx, W, H, t, o, true); },
};

function cabineAviao(ctx, W, H, t, o, luxo) {
  ctx.save(); ctx.translate(0, Math.sin(t * 1.3) * 1.5);
  const vx = W / 2, vy = H * 0.36;                                   // ponto de fuga ao fundo do corredor
  ctx.fillStyle = luxo ? '#2a2018' : '#e9eef2'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = luxo ? '#3a2c20' : '#d9dee3';                      // teto
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(vx + 40, vy - 30); ctx.lineTo(vx - 40, vy - 30); ctx.fill();
  ctx.fillStyle = luxo ? '#5a3a22' : '#8a959c';                       // chão (alcatifa)
  ctx.beginPath(); ctx.moveTo(vx - 30, vy + 30); ctx.lineTo(vx + 30, vy + 30); ctx.lineTo(W * 0.65, H); ctx.lineTo(W * 0.35, H); ctx.fill();
  // filas de bancos (longe → perto), janelas com nuvens
  for (let i = 7; i >= 0; i--) {
    const z = i / 8, k = 1 - z, s = 0.25 + k * 1.1;
    for (const lado of [-1, 1]) {
      const x = vx + lado * (40 + k * W * 0.32), y = vy + 20 + k * H * 0.45;
      const jx = vx + lado * (55 + k * W * 0.42), jy = vy - 10 - k * H * 0.12;
      ctx.fillStyle = '#9fd3ea'; ctx.beginPath(); ctx.ellipse(jx, jy, 8 * s, 12 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(jx + Math.sin(t + i) * 3 * s, jy + 2 * s, 5 * s, 3 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = luxo ? '#c9b48a' : '#2c6fb0'; ctx.fillRect(x - 34 * s, y - 50 * s, 68 * s, 70 * s);
      ctx.fillStyle = luxo ? '#e9dcc4' : '#f2f2f2'; ctx.fillRect(x - 30 * s, y - 50 * s, 60 * s, 10 * s);
      if (!luxo && (i + (lado > 0)) % 3) cabecaDeCostas(ctx, x, y - 58 * s, s * 0.9, o.passageiros[(i * 2 + (lado > 0)) % 8]);
    }
  }
  // a hospedeira (ou o comissário de bordo no jato privado) vem pelo corredor
  const ent = 3, chega = luxo ? 7 : 9, mostra = luxo ? 14 : 18;
  if (t > ent) {
    const k = Math.min(1, (t - ent) / (chega - ent)), s = 0.35 + k * 1.5, x = vx, y = vy + 40 + k * H * 0.42;
    ctx.fillStyle = luxo ? '#141012' : '#cc092f'; ctx.fillRect(x - 22 * s, y - 70 * s, 44 * s, 80 * s);               // farda
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(x, y - 88 * s, 16 * s, 0, 7); ctx.fill();                     // cara
    ctx.fillStyle = '#1a1310'; ctx.beginPath(); ctx.arc(x, y - 94 * s, 17 * s, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = luxo ? '#d4af37' : '#FFCB00'; ctx.fillRect(x - 24 * s, y - 104 * s, 48 * s, 6 * s);              // chapéu
    if (t > chega && t < mostra) {                                   // o panfleto à tua frente
      const a = Math.min(1, (t - chega) / 0.6);
      const fw = W * 0.7 * a, fh = fw * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.rotate(-0.04);
      ctx.fillStyle = '#fff'; ctx.fillRect(-fw / 2 - 8, -fh / 2 - 8, fw + 16, fh + 34);
      painelAnuncio(ctx, -fw / 2, -fh / 2, fw, fh, o.ad, '#fff');
      ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(-fw / 2 + 4, fh / 2 + 14, 18, 10, 0, 0, 7); ctx.ellipse(fw / 2 - 4, fh / 2 + 14, 18, 10, 0, 0, 7); ctx.fill();   // mãos
      ctx.restore();
    }
  }
  ctx.restore();
}
