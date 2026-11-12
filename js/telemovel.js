/* ============================================================
   Vida na Banda — O TELEMÓVEL
   Um telemóvel a sério: ecrã inicial com apps, widgets,
   notificações, dock; cada app abre em ecrã inteiro.
   ============================================================ */
let telAberto = false;
const APPS = [
  { id: 'objetivos', ic: 'objetivos', tom: 'g', n: 'Objetivos', e: '⭐', c: ['#ffd56b', '#e08a1c'] },
  { id: 'muxima', ic: 'muxima', tom: 'r', n: 'Muxima', e: '💛', c: ['#ff9ad5', '#a03fd0'] },
  { id: 'jornal', ic: 'jornal', tom: 'k', n: 'Jornal', e: '📰', c: ['#efe6cf', '#7a6a48'] },
  { id: 'eu', ic: 'eu', tom: 'k', n: 'Perfil', e: '👤', c: ['#6f8cff', '#3b4fb0'] },
  { id: 'social', ic: 'social', tom: 'r', n: 'Social', e: '💞', c: ['#ff7aa8', '#c7306b'] },
  { id: 'familia', ic: 'familia', tom: 'k', n: 'Família', e: '👶', c: ['#ffc07a', '#e0712d'] },
  { id: 'saude', ic: 'saude', tom: 'r', n: 'Saúde', e: '🏥', c: ['#ff8fa0', '#d93a50'] },
  { id: 'mensagens', ic: 'mensagens', tom: 'k', n: 'Mensagens', e: '💬', c: ['#7be08a', '#25a244'] },
  { id: 'justica', ic: 'justica', tom: 'k', n: 'Justiça', e: '⚖️', c: ['#8fa7c9', '#2b3f63'] },
  { id: 'governo', ic: 'governo', tom: 'k', n: 'Governo', e: '🏛️', c: ['#e3cc84', '#8a6d1f'] },
  { id: 'grupos', ic: 'grupos', tom: 'k', n: 'Grupos', e: '🤝', c: ['#7ed39a', '#2f8f5b'] },
  { id: 'empregados', ic: 'casa', tom: 'k', n: 'Empregados', e: '🧹', c: ['#b5e3c4', '#2f8f5b'] },
  { id: 'dinheiro', ic: 'kumbu', tom: 'g', n: 'Ganhar dinheiro', e: '💰', c: ['#ffe27a', '#2f8f5b'] },   // 0gj (10 nov): como ganhar dinheiro
  { id: 'universidade', ic: 'capelo', tom: 'k', n: 'Universidade', e: '🎓', c: ['#8fb3ff', '#2b4fa8'] },
  { id: 'vagas', ic: 'vagas', tom: 'r', n: 'Vagas', e: '💼', c: ['#9aa0b5', '#4d5266'] },
  { id: 'empresas', ic: 'empresas', tom: 'k', n: 'Empresas', e: '🏢', c: ['#7387a3', '#2a3b55'] },
  { id: 'banco', ic: 'banco', tom: 'k', n: 'Banco', e: '🏦', c: ['#4fd0e0', '#16768a'] },
  { id: 'dolares', ic: 'dolares', tom: 'k', n: 'Câmbio', e: '💵', c: ['#8fe07b', '#2f8f3a'] },
  { id: 'kumbu', ic: 'kumbu', tom: 'g', n: 'Transferir', e: '💸', c: ['#ffdc6b', '#e0a31c'] },
  { id: 'imoveis', ic: 'imoveis', tom: 'k', n: 'Imóveis', e: '🏘️', c: ['#d9ab7b', '#8a5a2b'] },
  { id: 'loja', ic: 'loja', tom: 'g', n: 'Loja', e: '🛒', c: ['#ff9a6b', '#cc092f'] },
  { id: 'ouro', ic: 'ouro', tom: 'g', n: 'Ouro', e: '🪙', c: ['#ffe27a', '#c9962a'] },
  { id: 'radio', ic: 'radio', tom: 'k', n: 'Rádio', e: '📻', c: ['#c08cff', '#3b1f4a'] },
  { id: 'lavras', ic: 'lavras', tom: 'k', n: 'Lavras', e: '🌱', c: ['#b0dc6b', '#4f8a2a'] },
  { id: 'sorte', ic: 'sorte', tom: 'k', n: 'Sorte', e: '🎲', c: ['#c08cff', '#6a2fc0'] },
  { id: 'bandabet', ic: 'sorte', tom: 'k', n: 'BandaBet', e: '⚽', c: ['#ffcb00', '#141012'], teste: true },   // 7 nov: apostas desportivas (primeiro no teste)
  { id: 'ranking', ic: 'ranking', tom: 'g', n: 'Ricos', e: '🏆', c: ['#ffe07b', '#c9962a'] },
  { id: 'tempo', ic: 'tempo', tom: 'k', n: 'Tempo', e: '⛅', c: ['#9fdcff', '#3a8fd0'] },
  { id: 'noticias', ic: 'noticias', tom: 'r', n: 'Notícias', e: '🔔', c: ['#ff8a7b', '#c0392b'] },
  { id: 'canal', ic: 'megafone', tom: 'r', n: 'Canal', e: '📢', c: ['#ffb36b', '#d9531e'] },   // 0cl (3 nov): publicações da equipa
  { id: 'ajuda', ic: 'ajuda', tom: 'k', n: 'Ajuda', e: '❓', c: ['#b5b5b5', '#5a5a5a'] },
  { id: 'admin', ic: 'admin', tom: 'k', n: 'Admin', e: '🛡️', c: ['#555', '#111'], admin: true },
];
const DOCK = ['objetivos', 'social', 'mensagens', 'noticias'];

const horaTexto = () => new Date(Date.now() + 3600e3).toISOString().slice(11, 16);   // Luanda = UTC+1
const dataTexto = () => { try { const t = new Date().toLocaleDateString(typeof lingua !== 'undefined' && lingua !== 'pt' ? lingua : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Luanda' }); return t.charAt(0).toUpperCase() + t.slice(1); } catch { return ''; } };
function naoLidas() { const l = ls.get('vel_lido_' + uid) || ''; return (eventos || []).filter(e => e.criado_em > l).length; }
function marcarLidas() { ls.set('vel_lido_' + uid, new Date().toISOString()); atualizarPontoTel(); }
function atualizarPontoTel() { $('#telDot')?.classList.toggle('hide', !(pedidosPendentes.length || (typeof dmNaoLidas !== 'undefined' && dmNaoLidas) || naoLidas() || (typeof canalNaoLidos === 'function' && canalNaoLidos()) || (typeof smsNovas !== 'undefined' && smsNovas) || J?.detencao || (typeof premiosPorRecolher === 'function' && premiosPorRecolher()))); }

function garantirTelefone() {
  let v = document.getElementById('telVeil');
  if (!v) {
    v = document.createElement('div'); v.id = 'telVeil';
    v.innerHTML = `<div id="telefone"><div class="ilha"></div><div class="tela">
      <div class="ecra"></div>
      <div class="barra"><span id="telHora"></span><span class="dir">▂▄▆ 4G&nbsp; <span id="telBat"></span></span></div>
      <button class="homebar" aria-label="Ecrã inicial"><span class="hbTxt"></span></button></div></div>`;
    v.addEventListener('click', e => { if (e.target === v) fecharTelemovel(); });
    v.querySelector('.homebar').onclick = () => (telSub ? abrirTelemovel() : fecharTelemovel());
    document.body.appendChild(v); telAberto = true; document.body.classList.add('com-tel');
    if (typeof empurrarHist === 'function' && history.state?.vel !== 'tel') empurrarHist('tel');
  }
  v.querySelector('#telefone').dataset.modelo = typeof melhorTelemovel === 'function' ? melhorTelemovel() : '';
  atualizarBarraTel();
  return v;
}
function fecharTelemovel(viaHistorico) {
  const estava = !!document.getElementById('telVeil');
  document.getElementById('telVeil')?.remove(); telAberto = false; telSub = null; document.body.classList.remove('com-tel');
  if (estava && !viaHistorico && typeof recuarHist === 'function') recuarHist('tel');
}
function atualizarBarraTel() {
  const h = document.getElementById('telHora'); if (!h || !J) return;
  h.textContent = horaTexto();
  const b = Math.round(Math.max(0, Math.min(100, J.energia)));
  document.getElementById('telBat').innerHTML = `<span class="bat"><i style="width:${b}%;background:${b < 20 ? '#ff3b30' : '#fff'}"></i></span>${b}%`;
}
setInterval(() => { if (telAberto) { atualizarBarraTel(); const w = document.querySelector('.widget .hora'); if (w) w.textContent = horaTexto(); } }, 15000);

function iconeApp(a) {
  const n = a.id === 'social' ? pedidosPendentes.length : a.id === 'noticias' ? naoLidas() : a.id === 'canal' ? (typeof canalNaoLidos === 'function' ? canalNaoLidos() : 0) : a.id === 'mensagens' ? smsNovas : a.id === 'justica' ? (J.detencao ? 1 : 0) : a.id === 'objetivos' ? premiosPorRecolher() : 0;
  return `<button class="icapp" data-app="${a.id}"><span class="ic tom-${a.tom || 'k'}">${icone(a.ic || 'ajuda', 28)}${n ? `<i class="badge">${n > 9 ? '9+' : n}</i>` : ''}</span><span class="nm">${a.n}</span></button>`;
}
// LL43 · quantas pessoas jogaram hoje (o servidor só dá o número; atualiza a cada 5 min)
let jogamHoje = null, jogamHojeEm = 0;
function textoJogamHoje() { return jogamHoje == null ? '' : `${jogamHoje.toLocaleString(lingua === 'pt' ? 'pt-PT' : lingua)} ${tr(jogamHoje === 1 ? 'pessoa a jogar hoje' : 'pessoas a jogar hoje')}`; }
async function carregarJogamHoje() {
  if (Date.now() - jogamHojeEm < 5 * 60e3 && jogamHoje != null) return jogamHoje;
  const ph = typeof pre === 'function' ? pre('jogam_hoje') : null;   // 9 nov: vem no arranque()
  const pb = ph?.v != null ? null : await publico();   // 9 nov: /api/publico (guardado na Vercel)
  const { data, error } = ph?.v != null ? { data: ph.v, error: null } : pb?.hoje != null ? { data: pb.hoje, error: null } : await sb.rpc('jogadores_hoje'); if (error) return null;
  jogamHoje = data; jogamHojeEm = Date.now();
  const el = document.getElementById('wJogamHoje'); if (el) el.textContent = textoJogamHoje();
  return jogamHoje;
}
function telHome() {
  carregarJogamHoje();
  const v = garantirTelefone(), ecra = v.querySelector('.ecra');
  ecra.className = 'ecra home';
  const hb = v.querySelector('.hbTxt'); if (hb) { hb.textContent = 'Fechar o telemóvel'; v.querySelector('.homebar').setAttribute('aria-label', 'Fechar o telemóvel'); }
  const lista = APPS.filter(a => (!a.admin || J?.admin) && (!a.teste || window.VEL_TESTE) && !DOCK.includes(a.id));
  const t = tempoAqui();
  ecra.innerHTML = `<div class="widget">
      <div class="hora">${horaTexto()}</div><div class="data">${esc(dataTexto())}</div>
      <div class="wl"><span>${t ? TEMPO[t][0] + ' ' : ''}${esc(bairro(J.bairro)?.nome || '')}${protecaoDias() ? ' · 🛡️' : ''}</span><span class="wkz">${saldoKz()}</span></div>
      <div class="wl" style="margin-top:6px"><span id="wJogamHoje" class="online">${textoJogamHoje()}</span></div>
    </div>
    <label class="busca"><span aria-hidden="true">${icone('procurar', 18)}</span><input id="telBusca" type="search" autocomplete="off" enterkeyhint="search" placeholder="Procurar (ex.: convidar para casa)"></label>
    <div id="telRes"></div>
    ${widgetHoje()}
    <div class="grade">${lista.map(iconeApp).join('')}</div>
    <div class="dock">${DOCK.map(id => iconeApp(APPS.find(a => a.id === id))).join('')}</div>`;
  ecra.querySelectorAll('[data-app]').forEach(b => b.onclick = () => abrirTelemovel(b.dataset.app));
  if (typeof ligarProcuraTel === 'function') ligarProcuraTel(ecra);
}
function telApp(id) {
  const v = garantirTelefone(), ecra = v.querySelector('.ecra');
  const a = APPS.find(x => x.id === id) || { n: id, ic: 'telefone', tom: 'k' };
  ecra.className = 'ecra app' + (typeof ui2 === 'function' && ui2() ? ' ui2 ui2-' + id : '');   // 8 nov: redesenho (9 nov 21:00: para todos)
  { const hb = v.querySelector('.hbTxt'); if (hb) { hb.textContent = 'Ecrã inicial'; v.querySelector('.homebar').setAttribute('aria-label', 'Ecrã inicial'); } }
  ecra.innerHTML = `<div class="topo tom-${a.tom || 'k'}"><button class="voltar" aria-label="Voltar">${icone('voltar', 24)}</button><span class="t">${icone(a.ic || 'telefone', 20)} ${a.n}</span><span></span></div><div class="app-body" id="telBody"></div>`;
  ecra.querySelector('.voltar').onclick = () => abrirTelemovel();
  return ecra.querySelector('.app-body');
}
// janelas por cima, dentro do telemóvel
function sheetTel(html, onclose) {
  const tela = document.querySelector('#telefone .tela');
  tela.querySelectorAll('.tel-modal').forEach(x => x.remove());
  const m = document.createElement('div'); m.className = 'tel-modal';
  m.innerHTML = `<div class="painel"><div class="puxa"></div>${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) { m.remove(); onclose && onclose(); } });
  tela.appendChild(m); return m.querySelector('.painel');
}

/* ---------- ⛅ Tempo ---------- */
async function renderTempo(body) {
  if (!climaHoje) await carregarClima();
  if (typeof ui2 === 'function' && ui2()) return ui2Tempo(body);   // 8 nov: redesenho (teste)
  const r = climaHoje?.regioes || {};
  const nomes = { luanda: 'Luanda', benguela: 'Benguela', huambo: 'Huambo', 'huíla': 'Lubango (Huíla)', namibe: 'Namibe', malanje: 'Malanje', cabinda: 'Cabinda' };
  const aqui = tempoAqui();
  // 0g-C: à noite o sol não aparece (a hora é a mesma em todo o país)
  const noite = escuridao() > 0.24, ver = t => t === 'sol' && noite ? ['🌙', 'Céu limpo'] : t === 'nublado' && noite ? ['☁️', 'Nublado'] : TEMPO[t];
  body.innerHTML = `<div class="rel" style="margin-top:0;text-align:center;padding:18px">
      <div style="font-size:56px;line-height:1">${aqui ? ver(aqui)[0] : '…'}</div>
      <div style="font-weight:800;font-size:20px;margin-top:6px">${aqui ? ver(aqui)[1] : ''}</div>${(() => { const j = J && janelaChuva(regiaoDe(J.bairro)); return j ? `<div class="m">${esc((climaHoje.regioes[regiaoDe(J.bairro)] === 'tempestade' ? tr('Tempestade das {0}h às {1}h') : tr('Chuva das {0}h às {1}h')).replace('{0}', j[0]).replace('{1}', j[1]))}</div>` : ''; })()}
      <div class="m" style="color:var(--muted)">${esc(bairro(J.bairro)?.nome || '')} · ${String(Math.floor(horaLuanda())).padStart(2, '0')}:${String(Math.floor(horaLuanda() % 1 * 60)).padStart(2, '0')} · ${noite ? 'noite' : 'dia'}</div></div>
    <p class="m" style="margin-top:12px">${climaHoje?.epoca === 'chuvas' ? '🌧️ Época das chuvas (outubro a abril): cuidado com as tempestades, as estradas e as inundações. Boa altura para as lavras.' : '🌫️ Cacimbo (maio a setembro): céu cinzento, noites frescas, quase sem chuva. Rega as lavras!'}</p>
    <div class="list">${Object.entries(nomes).filter(([k]) => r[k]).map(([k, n]) => { const t = tempoEm(k), j = janelaChuva(k);
      const quando = j ? (r[k] === 'tempestade' ? tr('Tempestade das {0}h às {1}h') : tr('Chuva das {0}h às {1}h')).replace('{0}', j[0]).replace('{1}', j[1]) : '';
      return `<div class="row"><span class="e">${ver(t)[0]}</span><div class="t"><b>${n}</b><small>${tr(ver(t)[1])}${quando ? ' · ' + esc(quando) : ''}</small></div></div>`; }).join('')}</div>`;
}
