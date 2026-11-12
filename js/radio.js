/* ============================================================
   Vida na Banda — 📻 RÁDIO E MÚSICA PROMOVIDA
   Artistas pagam para a sua música tocar no jogo: na app Rádio
   e nos bares e discotecas ("🎶 A tocar agora"). Mini-leitor
   que continua a tocar enquanto andas pela cidade.
   ============================================================ */
const CONTACTO_MUSICA = 'vidanabanda@gmail.com';
let musicas = [];                       // músicas ativas (da tabela 'musicas')
const radio = { audio: null, lista: [], i: 0, synth: null };

/* 0g-C · a Rádio Luanda tem sempre música: batidas feitas aqui mesmo (WebAudio, sem ficheiros), kuduro, kizomba e semba.
   As músicas promovidas pelos artistas aparecem por cima, quando as houver. */
const ESTACOES = [
  { id: -1, gen: 'kuduro', titulo: 'Batida da Banda', artista: 'DJ Rádio Luanda', capa: '', bpm: 136 },
  { id: -2, gen: 'kizomba', titulo: 'Kizomba da Meia-Noite', artista: 'Rádio Luanda', capa: '', bpm: 92 },
  { id: -3, gen: 'semba', titulo: 'Semba de Domingo', artista: 'Rádio Luanda', capa: '', bpm: 112 },
];
function batida(est) {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ac = new AC(), mestre = ac.createGain(); mestre.gain.value = 0.32; mestre.connect(ac.destination);
  const ruido = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const env = (g, t, a, v, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); };
  const bombo = t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); env(g, t, 0.004, 1, 0.3); o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.32); };
  const chiar = (t, v, dur, freq) => { const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = ruido; f.type = 'highpass'; f.frequency.value = freq; env(g, t, 0.002, v, dur); n.connect(f).connect(g).connect(mestre); n.start(t); n.stop(t + dur + 0.02); };
  const tom = (t, hz, v, dur, tipo = 'triangle', corte = 2400) => { const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = tipo; o.frequency.value = hz; f.type = 'lowpass'; f.frequency.value = corte; env(g, t, 0.01, v, dur); o.connect(f).connect(g).connect(mestre); o.start(t); o.stop(t + dur + 0.05); };
  const conga = (t, hz, v) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(hz * 1.5, t); o.frequency.exponentialRampToValueAtTime(hz, t + 0.04); env(g, t, 0.003, v, 0.18); o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.2); };
  const nota = n => 440 * Math.pow(2, (n - 69) / 12);
  // acordes (lá menor – fá – dó – sol) e linhas de baixo por estilo
  const ACORDES = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const passo = 60 / est.bpm / 4;
  let prox = ac.currentTime + 0.08, k = 0, tid = null;
  const tocarPasso = (t, i, comp) => {
    const s16 = i % 16, ac4 = ACORDES[comp % 4];
    if (est.gen === 'kuduro') {
      if (s16 % 4 === 0 || s16 === 10) bombo(t);
      if (s16 === 4 || s16 === 12) chiar(t, 0.5, 0.16, 1500);
      if (s16 % 2 === 1) chiar(t, 0.12, 0.04, 7000);
      if ([0, 3, 6, 10, 13].includes(s16)) tom(t, nota(ac4[0] - 24), 0.5, passo * 1.6, 'sawtooth', 380);
      if ([2, 7, 11].includes(s16)) tom(t, nota(ac4[(s16 / 2 | 0) % 3] + 12), 0.14, passo * 1.2, 'square', 1800);
    } else if (est.gen === 'kizomba') {
      if (s16 === 0 || s16 === 8) bombo(t);
      if ([3, 6, 11, 14].includes(s16)) chiar(t, 0.22, 0.07, 3200);
      if (s16 % 4 === 2) chiar(t, 0.07, 0.03, 8000);
      if (s16 === 0) ac4.forEach(n => tom(t, nota(n), 0.08, passo * 15, 'sine', 1200));
      if ([0, 6, 10].includes(s16)) tom(t, nota(ac4[0] - 24), 0.55, passo * 3, 'sine', 300);
      if ([4, 12].includes(s16) && comp % 2) tom(t, nota(ac4[2] + 12), 0.1, passo * 3, 'triangle', 2200);
    } else {   // semba: congas, guitarra dedilhada, baixo a andar
      if ([0, 3, 8, 11].includes(s16)) conga(t, 180, 0.45); if ([6, 14].includes(s16)) conga(t, 260, 0.35); if (s16 % 2) chiar(t, 0.06, 0.03, 9000);
      if (s16 % 2 === 0) tom(t, nota(ac4[(s16 / 2) % 3] + 12), 0.16, passo * 2.2, 'triangle', 2600);
      if (s16 % 4 === 0) tom(t, nota(ac4[(s16 / 4) % 3] - 12), 0.45, passo * 3.5, 'sine', 500);
    }
  };
  const agendar = () => { while (prox < ac.currentTime + 0.25) { tocarPasso(prox, k, Math.floor(k / 16)); prox += passo; k++; } };
  return {
    ativo: true, get paused() { return ac.state !== 'running'; },
    play() { ac.resume(); if (!tid) { prox = ac.currentTime + 0.08; tid = setInterval(agendar, 60); } miniRadio(); return Promise.resolve(); },
    pause() { clearInterval(tid); tid = null; ac.suspend(); miniRadio(); },
    fechar() { clearInterval(tid); tid = null; this.ativo = false; ac.close().catch(() => { }); },
  };
}
const leitor = () => radio.synth?.ativo ? radio.synth : radio.audio;

async function carregarMusicas() {
  const cs = typeof catalogoSite === 'function' ? await catalogoSite('musicas') : null;   // 9 nov: do catálogo do site
  const { data, error } = cs ? { data: cs } : await sb.from('musicas').select('id,artista,titulo,audio,capa,link,onde').order('id');
  if (!error) musicas = data || [];
}
setInterval(() => { if (J && !document.hidden) carregarMusicas(); }, 10 * 60 * 1000);
const musicasPara = onde => musicas.filter(m => m.onde === 'todos' || m.onde === onde);

function tocarMusica(id, lista) {
  radio.lista = lista && lista.length ? lista : [...musicas, ...ESTACOES];
  radio.i = Math.max(0, radio.lista.findIndex(m => m.id === id));
  radio.synth?.fechar(); radio.synth = null;
  const m0 = radio.lista[radio.i];
  if (m0 && m0.gen) {   // estação da casa: batida feita aqui
    if (radio.audio) { radio.audio.pause(); radio.audio.removeAttribute('src'); }
    radio.synth = batida(m0); if (!radio.synth) return toast('Não deu para tocar agora. Tenta outra vez.', 'mau');
    radio.synth.play(); return;
  }
  if (!radio.audio) {
    radio.audio = new Audio(); radio.audio.preload = 'none';
    radio.audio.addEventListener('ended', () => proximaMusica());
    radio.audio.addEventListener('play', miniRadio); radio.audio.addEventListener('pause', miniRadio);
  }
  const m = radio.lista[radio.i]; if (!m) return;
  radio.audio.src = m.audio;
  radio.audio.play().catch(() => toast('Não deu para tocar agora. Tenta outra vez.', 'mau'));
  miniRadio();
}
function proximaMusica() {
  if (!radio.lista.length) return;
  radio.i = (radio.i + 1) % radio.lista.length;
  tocarMusica(radio.lista[radio.i].id, radio.lista);
}
function pararRadio() {
  radio.synth?.fechar(); radio.synth = null;
  if (radio.audio) { radio.audio.pause(); radio.audio.removeAttribute('src'); radio.audio.load(); }
  radio.lista = []; miniRadio();
}
const musicaAtual = () => radio.synth?.ativo || (radio.audio && radio.audio.getAttribute('src')) ? radio.lista[radio.i] : null;

// mini-leitor por cima da barra de baixo
function miniRadio() {
  let el = document.getElementById('radioMini');
  const m = musicaAtual();
  if (!m) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'radioMini'; document.getElementById('hud').appendChild(el); }
  const aTocar = !leitor().paused;
  el.innerHTML = `<span class="rmIco ${aTocar ? 'on' : ''}">${aTocar ? '🎶' : '📻'}</span>
    <div class="rmT" data-sem-traducao><b>${esc(m.gen ? tr(m.titulo) : m.titulo)}</b><small>${esc(m.gen ? tr(m.artista) : m.artista)}</small></div>
    <button data-rm="pp" aria-label="${aTocar ? 'Pausa' : 'Tocar'}">${aTocar ? '⏸' : '▶️'}</button>
    ${radio.lista.length > 1 ? '<button data-rm="next" aria-label="Seguinte">⏭</button>' : ''}
    <button data-rm="x" aria-label="Fechar">✕</button>`;
}
document.addEventListener('click', e => {
  const r = e.target.closest('[data-rm]');
  if (r) {
    const a = r.dataset.rm;
    if (a === 'pp') { const l = leitor(); l.paused ? l.play() : l.pause(); }
    if (a === 'next') proximaMusica();
    if (a === 'x') pararRadio();
    return;
  }
  const b = e.target.closest('[data-musica]');
  if (b) {
    const id = +b.dataset.musica;
    const atual = musicaAtual();
    if (atual && atual.id === id && !leitor().paused) { leitor().pause(); return; }
    if (atual && atual.id === id) { leitor().play(); return; }
    tocarMusica(id, b.dataset.lista === 'bares' ? musicasPara('bares') : [...musicasPara('radio'), ...ESTACOES]);
  }
});

function linhaMusica(m, lista) {
  const atual = musicaAtual(), aTocar = atual && atual.id === m.id && !leitor().paused;
  const link = linkSeguro(m.link);
  return `<div class="row musica"><span class="e capa">${m.capa ? `<img src="${esc(m.capa)}" alt="">` : m.gen ? '📻' : '🎵'}</span>
    <div class="t"><b ${m.gen ? '' : 'data-sem-traducao'}>${esc(m.gen ? tr(m.titulo) : m.titulo)}</b><small><span ${m.gen ? '' : 'data-sem-traducao'}>${esc(m.gen ? tr(m.artista) : m.artista)}</span>${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener sponsored">Ouvir completo</a>` : ''}</small></div>
    <button class="btn sm" data-musica="${m.id}" data-lista="${lista}">${aTocar ? '⏸' : '▶️'}</button></div>`;
}

// 📻 app Rádio
function noArAgora() {   // 0g-C: o locutor — hora, tempo e trânsito (a mesma hora e o mesmo tempo do resto do jogo)
  const h = horaLuanda(), hh = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`;
  const t = typeof tempoAqui === 'function' ? tempoAqui() : null, noite = escuridao() > 0.24;
  const tempo = !t ? '' : t === 'sol' ? (noite ? 'Noite de céu limpo.' : 'Sol e calor.') : t === 'nublado' ? 'Céu nublado.' : t === 'cacimbo' ? 'Cacimbo: céu cinzento e fresco.' : t === 'chuva' ? 'Está a chover: cuidado na estrada.' : 'Tempestade: estradas alagadas e barcos parados.';
  const transito = (h >= 6.5 && h < 9.5) || (h >= 16.5 && h < 19.5) ? 'Hora de ponta: muito trânsito nas estradas principais.' : h >= 22 || h < 5 ? 'Estradas calmas a esta hora.' : 'Trânsito normal na cidade.';
  return [`🕒 ${hh} em Luanda.`, tempo, transito].filter(Boolean).map(x => `<span>${esc(tr(x))}</span>`).join(' ');
}
function renderRadio(body) {
  const lista = musicasPara('radio');
  if (typeof ui2 === 'function' && ui2()) return ui2Radio(body, lista);   // 8 nov: redesenho (teste)
  body.innerHTML = `<div class="radioTopo"><div class="radioNome">📻 ${esc(tr('Rádio Luanda'))}</div><p class="m">A música que está a dar em Luanda. Carrega ▶️ e continua a ouvir enquanto andas pela cidade.</p><p class="m" style="margin-top:6px">🎙️ ${noArAgora()}</p></div>
    <div class="sec"><h4>${esc(tr('As nossas estações'))}</h4></div>
    <div class="list">${ESTACOES.map(m => linhaMusica(m, 'radio')).join('')}</div>
    ${lista.length ? `<div class="sec"><h4>${esc(tr('Música dos artistas'))}</h4></div><div class="list">${lista.map(m => linhaMusica(m, 'radio')).join('')}</div><p class="adPub">Músicas promovidas pelos artistas</p>` : ''}
    <div class="sec"><h4>És artista?</h4></div>
    <p class="m">Põe a tua música a tocar na Rádio Luanda e nos bares e discotecas do jogo.</p>
    <a class="btn full ghost" href="mailto:${CONTACTO_MUSICA}?subject=${encodeURIComponent('Promover música no Vida na Banda')}">Quero promover a minha música</a>`;
  const atualizar = () => { if (telSub === 'radio' && body.isConnected) renderRadio(body); };
  if (radio.audio) { radio.audio.onplay = atualizar; radio.audio.onpause = atualizar; }
  body.querySelectorAll('[data-musica]').forEach(b => b.addEventListener('click', () => setTimeout(atualizar, 120)));
}

// 🎶 nos bares e discotecas
function musicaLugarHTML() {
  const lista = musicasPara('bares');
  if (!lista.length) return '';
  const m = lista[Math.floor(Date.now() / 600000) % lista.length];   // muda a cada 10 minutos
  return `<div class="sec"><h4>🎶 A tocar agora</h4></div><div class="list">${linhaMusica(m, 'bares')}</div>`;
}
