// 9 nov 2026 (dono 07:38): «in private rooms people should be able to hear each other through their microphone if they are
// close to each other, but only in private rooms … in the most light weight and non wasteful way possible».
// Como: o som vai DIRETO entre os telemóveis (WebRTC), sem servidor de áudio. O nosso servidor de tempo real só passa o «aperto
// de mão» (e só numa sala privada, e só para a pessoa certa). Liga-se apenas a quem também tem a voz ligada e está perto
// (até 6 pessoas mais próximas, a menos de 9 passos); o volume baixa com a distância; longe → desliga. Nada disto fala com a base.
const VOZ_PERTO = 9, VOZ_LONGE = 13, VOZ_MAX = 6;
const VOZ_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
let vozLigada = false, vozMic = null, vozCtx = null, vozTick = 0;
const vozPares = new Map();   // id -> { pc, ganho, audio }
const vozSalaPrivada = () => cena?.tipo === 'bairro' && typeof salaAtual !== 'undefined' && salaAtual >= 1000 && !!canal?._rt;
function vozBotao() {
  const b = document.getElementById('bVoz'); if (!b) return;
  const pode = vozSalaPrivada();
  b.classList.toggle('hide', !pode);
  b.classList.toggle('on', vozLigada);
  b.querySelector('b').textContent = tr(vozLigada ? 'Voz ligada' : 'Voz');
  if (!pode && vozLigada) vozParar();
}
async function vozAlternar() {
  if (vozLigada) return vozParar();
  if (!vozSalaPrivada()) { toast(tr('A voz só funciona nas salas privadas.'), 'info'); return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection !== 'function') { toast(tr('Este telemóvel não deixa usar o microfone no jogo.'), 'mau'); return; }
  try {
    vozMic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: false });
  } catch { toast(tr('Sem acesso ao microfone. Permite o microfone nas definições do navegador.'), 'mau'); return; }
  try { vozCtx = vozCtx || new (window.AudioContext || window.webkitAudioContext)(); await vozCtx.resume(); } catch { }
  vozLigada = true; vozBotao();
  if (typeof presencaAgora === 'function') presencaAgora(true);   // os outros ficam a saber que tens a voz ligada
  clearInterval(vozTick); vozTick = setInterval(vozAtualizar, 1000);
  toast(tr('Voz ligada: quem estiver perto de ti na sala ouve-te.'), 'bom');
}
function vozParar() {
  vozLigada = false; clearInterval(vozTick);
  for (const id of [...vozPares.keys()]) vozFechar(id);
  try { vozMic?.getTracks().forEach(t => t.stop()); } catch { }
  vozMic = null; vozBotao();
  if (typeof presencaAgora === 'function' && canal) presencaAgora(true);
}
function vozFechar(id) {
  const p = vozPares.get(id); if (!p) return;
  try { p.pc.close(); } catch { } try { p.audio?.remove(); } catch { } try { p.ganho?.disconnect(); } catch { }
  vozPares.delete(id);
}
function vozSinal(para, d) { canal?.send({ type: 'broadcast', event: 'voz', payload: { para, d } }); }
function vozNovoPar(id) {
  const pc = new RTCPeerConnection({ iceServers: VOZ_ICE });
  const par = { pc, ganho: null, audio: null };
  vozPares.set(id, par);
  vozMic?.getTracks().forEach(t => pc.addTrack(t, vozMic));
  pc.onicecandidate = e => { if (e.candidate) vozSinal(id, { ice: e.candidate }); };
  pc.ontrack = e => {
    const st = e.streams[0]; if (!st || par.audio) return;
    const a = new Audio(); a.srcObject = st; a.muted = !!vozCtx; a.autoplay = true; a.playsInline = true; par.audio = a;
    a.play?.().catch(() => { });
    if (vozCtx) { try { const src = vozCtx.createMediaStreamSource(st); par.ganho = vozCtx.createGain(); src.connect(par.ganho).connect(vozCtx.destination); } catch { a.muted = false; } }
  };
  pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) vozFechar(id); };
  return par;
}
// chega um sinal de outra pessoa (pelo canal da sala)
async function vozReceber(p) {
  if (!vozLigada || !p?.de || p.para !== uid || !vozSalaPrivada()) return;
  const d = p.d || {}; let par = vozPares.get(p.de);
  try {
    if (d.sdp) {
      if (d.sdp.type === 'offer') { if (par) vozFechar(p.de); par = vozNovoPar(p.de); }
      if (!par) return;
      await par.pc.setRemoteDescription(d.sdp);
      if (d.sdp.type === 'offer') { await par.pc.setLocalDescription(await par.pc.createAnswer()); vozSinal(p.de, { sdp: par.pc.localDescription }); }
    } else if (d.ice && par) await par.pc.addIceCandidate(d.ice);
  } catch { }
}
// de segundo a segundo (só com a voz ligada, sem pedidos): quem está perto, volume pela distância, liga/desliga
function vozAtualizar() {
  if (!vozLigada || !eu) return;
  if (!vozSalaPrivada()) return vozParar();
  const perto = [...outros.values()].filter(o => o.vz).map(o => ({ o, d: Math.hypot(o.x - eu.x, o.y - eu.y) }))
    .filter(x => x.d < VOZ_LONGE).sort((a, z) => a.d - z.d).slice(0, VOZ_MAX);
  const ids = new Set(perto.map(x => x.o.id));
  for (const id of [...vozPares.keys()]) if (!ids.has(id)) vozFechar(id);
  for (const { o, d } of perto) {
    let par = vozPares.get(o.id);
    if (!par && d < VOZ_PERTO && uid < o.id) {   // quem tem o id "menor" começa (para não ligarem os dois ao mesmo tempo)
      par = vozNovoPar(o.id);
      par.pc.createOffer({ offerToReceiveAudio: true }).then(of => par.pc.setLocalDescription(of)).then(() => vozSinal(o.id, { sdp: par.pc.localDescription })).catch(() => vozFechar(o.id));
    }
    const v = Math.max(0, Math.min(1, 1 - (d - 2) / (VOZ_PERTO - 2)));
    if (par?.ganho) par.ganho.gain.value = v; else if (par?.audio && !vozCtx) par.audio.volume = v;
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && vozLigada) vozParar(); });
document.addEventListener('click', e => { if (e.target.closest?.('#bVoz')) vozAlternar(); });
