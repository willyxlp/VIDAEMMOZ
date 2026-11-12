// 9 nov 2026: tempo real barato. Presença, andar, falar, gestos (dentro de cada bairro/sala e de cada casa) passam pelo nosso
// servidor na Cloudflare (tempo-real/), que não cobra as mensagens entregues — a Supabase cobrava cada uma (≈ 9 000 US$/mês).
// O objeto devolvido por rtCanal() imita o canal da Supabase (on / subscribe / track / untrack / send / presenceState),
// por isso o resto do jogo quase não muda. Se o servidor falhar 2 vezes seguidas, o jogo volta sozinho à Supabase.
// Ligar/desligar para todos: RT_PARTE (0–100 % dos jogadores). Testar à mão: ?rt=1 (liga só para ti) · ?rt=0 (desliga).
const RT_URL_VIVO = 'wss://vnb-tempo-real.vidanabanda.workers.dev';
const RT_PARTE = 100;   // % dos jogadores no servidor novo (todos na mesma sala têm de usar o mesmo: 0 ou 100)
const rtLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
try { const q = new URLSearchParams(location.search).get('rt'); if (q === '1' || q === '0') localStorage.setItem('vel_rt', q); } catch { }
const rtLer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const RT_URL = rtLocal ? (rtLer('vel_rt_url') || '') : RT_URL_VIVO;
let rtFalhas = 0;
// 9 nov (0fx, dono «go a-c»): ~11 mil ligações/h ainda iam à Supabase — 2 falhas de 8 s (servidor lento a arrancar) mandavam a sessão
// inteira para a Supabase para sempre. Agora: 3 tentativas com mais tempo cada (8/12/16 s); se mesmo assim cair, volta a tentar o
// nosso servidor ao fim de 5 min (10, 20… até 30 min) e conta-o no pulso (anuncio_exposicao, lugar «diag:rt_reserva» / «diag:rt_volta»).
const RT_MAX_FALHAS = 3;
let rtVoltarEspera = 5 * 60e3, rtVoltarTimer = 0, rtCaiu = false;
window.rtDiag = window.rtDiag || [];
function rtDesistiu() {
  if (!rtCaiu) { rtCaiu = true; window.rtDiag.push({ lugar: 'diag:rt_reserva', id: 0, seg: 1 }); }
  clearTimeout(rtVoltarTimer);
  rtVoltarTimer = setTimeout(rtTentarVoltar, rtVoltarEspera * (0.75 + Math.random() * 0.5));
  rtVoltarEspera = Math.min(30 * 60e3, rtVoltarEspera * 2);
}
function rtTentarVoltar() {
  if (rtFalhas < RT_MAX_FALHAS) return;
  if (document.hidden || typeof J === 'undefined' || !J) { rtVoltarTimer = setTimeout(rtTentarVoltar, 60e3); return; }
  rtFalhas = 0;
  if (typeof voltarAoServidorProprio === 'function') voltarAoServidorProprio();
}
const rtCanais = new Set();
function rtRef() { return (/^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(typeof SUPA_URL === 'string' ? SUPA_URL : '') || [])[1] || ''; }
function rtUsar() {
  if (!RT_URL || rtFalhas >= RT_MAX_FALHAS || !rtRef() || typeof WebSocket !== 'function') return false;
  const f = rtLer('vel_rt'); if (f === '1') return true; if (f === '0') return false;
  if (RT_PARTE >= 100) return true; if (RT_PARTE <= 0) return false;
  let h = 0; for (const c of String(typeof uid !== 'undefined' ? uid : '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 100 < RT_PARTE;
}
class RtCanal {
  constructor(nome, cfg) {
    this._rt = true; this.nome = nome; this.key = cfg?.config?.presence?.key || (typeof uid !== 'undefined' ? uid : '');
    this.hp = []; this.hb = {}; this.ps = {}; this.meu = null; this.fila = []; this.ok = false; this.fechado = false; this.cb = () => { };
    rtCanais.add(this);
  }
  on(tipo, filtro, fn) { if (tipo === 'presence') this.hp.push(fn); else if (tipo === 'broadcast') (this.hb[filtro.event] ||= []).push(fn); return this; }
  subscribe(cb) { if (cb) this.cb = cb; this._abrir(); return this; }
  async _abrir() {
    let token = null;
    try { token = (await sb.auth.getSession())?.data?.session?.access_token || null; } catch { }
    if (rtLocal && !token && rtLer('vel_rt_url') && typeof uid !== 'undefined') token = 'teste:' + uid;   // só no teste local
    if (this.fechado) return;
    if (!token) return this._falhou();
    let ws; try { ws = this.ws = new WebSocket(RT_URL + '/c/' + rtRef() + '/' + encodeURIComponent(this.nome)); } catch { return this._falhou(); }
    const limite = setTimeout(() => { if (!this.ok) { try { ws.close(); } catch { } this._falhou(); } }, 8000 + 4000 * Math.min(2, rtFalhas));
    ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token, k: this.key }));
    ws.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'ok') {
        clearTimeout(limite); this.ok = true; rtFalhas = 0; this.ps = m.ps || {};
        if (rtCaiu) { rtCaiu = false; rtVoltarEspera = 5 * 60e3; window.rtDiag.push({ lugar: 'diag:rt_volta', id: 0, seg: 1 }); }
        const f = this.fila; this.fila = []; f.forEach(s => ws.send(s));
        // um «ping» de 45 em 45 s só para a ligação não ser cortada pela rede (o servidor responde sem acordar a sala; não custa nada)
        this._ping = setInterval(() => { if (ws.readyState === 1 && !document.hidden) ws.send('ping'); }, 45000);
        this.cb('SUBSCRIBED'); this._sync();
      } else if (m.t === 'pj') { this.ps[m.k] = m.s; this._sync(); }
      else if (m.t === 'pl') { delete this.ps[m.k]; this._sync(); }
      else if (m.t === 'b') (this.hb[m.e] || []).forEach(fn => { try { fn({ payload: m.p }); } catch (e) { console.error(e); } });
      else if (m.t === 'rpc_r' || m.t === 'rpc_e') { const f = _rapEsp.get(m.n); if (f) { _rapEsp.delete(m.n); f(m); } }
      else if (m.t === 'chat_ok' || m.t === 'chat_erro') { const f = this._esp?.[m.n]; if (f) { delete this._esp[m.n]; f(m.t === 'chat_ok' ? { ok: true } : m.falta ? {} : { erro: m.m || 'Erro' }); } }
    };
    ws.onerror = () => { };
    ws.onclose = () => {
      clearTimeout(limite); clearInterval(this._ping);
      if (this.fechado) return;
      if (!this.ok) this._falhou(); else { this.ok = false; this.cb('CLOSED'); }
    };
  }
  _falhou() { if (this._f || this.fechado) return; this._f = true; if (++rtFalhas >= RT_MAX_FALHAS) rtDesistiu(); this.cb('CHANNEL_ERROR'); }
  _sync() { this.hp.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  _env(o) { const s = JSON.stringify(o); if (this.ok && this.ws?.readyState === 1) this.ws.send(s); else if (this.fila.length < 20) this.fila.push(s); }
  presenceState() { const o = {}; for (const [k, s] of Object.entries(this.ps)) o[k] = [s]; if (this.meu) o[this.key] = [this.meu]; return o; }
  track(s) { this.meu = s; this._env({ t: 'tr', s }); return Promise.resolve('ok'); }
  untrack() { const t = !!this.meu; this.meu = null; if (t) this._env({ t: 'ut' }); return Promise.resolve('ok'); }
  send(x) { if (x?.type === 'broadcast') this._env({ t: 'b', e: x.event, p: x.payload }); return Promise.resolve('ok'); }
  // 9 nov: chat da rua pelo nosso servidor (a base confere e guarda; o servidor entrega à sala). {} = sem resposta → o jogo usa a Supabase
  async chat(texto) {
    let token = null;
    try { token = (await sb.auth.getSession())?.data?.session?.access_token || null; } catch { }
    if (rtLocal && !token && rtLer('vel_rt_url') && typeof uid !== 'undefined') token = 'teste:' + uid;
    if (!token || !this.ok) return {};
    const n = (this._n = (this._n || 0) + 1);
    return new Promise(res => {
      const t = setTimeout(() => { if (this._esp) delete this._esp[n]; res({}); }, 8000);
      (this._esp ||= {})[n] = r => { clearTimeout(t); res(r); };
      this._env({ t: 'chat', texto, token, n });
    });
  }
  fechar() { this.fechado = true; clearInterval(this._ping); rtCanais.delete(this); try { this.ws?.close(1000); } catch { } }
  unsubscribe() { this.fechar(); return Promise.resolve('ok'); }
}
// canal de presença/movimento: o nosso servidor quando ligado, senão o da Supabase (igual a antes)
function rtCanal(nome, cfg) { return rtUsar() ? new RtCanal(nome, cfg) : sb.channel(nome, cfg); }
function rtRemover(ch) { if (!ch) return; if (ch._rt) ch.fechar(); else { try { sb.removeChannel(ch); } catch { } } }

// 9 nov: canal pessoal (u-<id>) — notificações («novo») e DMs («dm») chegam pelo nosso servidor (a base avisa-o; ver rt_pessoal.sql).
// Um só canal para os dois. Se falhar, cada parte volta ao seu canal de reserva da Supabase (aoFalhar).
let _rtP = null, _rtPespera = 0;
const _rtPh = {}, _rtPfalha = {};
function rtPessoal(evento, fn, aoFalhar) {
  if (!rtUsar() || typeof uid === 'undefined' || !uid) return false;
  _rtPh[evento] = fn; if (aoFalhar) _rtPfalha[evento] = aoFalhar;
  if (!_rtP) rtPessoalAbrir();
  return true;
}
function rtPessoalAbrir() {
  const c = new RtCanal('u-' + uid, { config: {} });
  c.on('broadcast', { event: 'novo' }, x => _rtPh.novo?.(x)).on('broadcast', { event: 'dm' }, x => _rtPh.dm?.(x));
  _rtP = c;
  c.subscribe(st => {
    if (_rtP !== c) return;
    if (st === 'SUBSCRIBED') { _rtPespera = 0; return; }
    _rtP = null;
    if (st === 'CHANNEL_ERROR' && rtUsar()) { _rtPespera = Math.min(60000, (_rtPespera || 2000) * 2); setTimeout(() => { if (!_rtP && Object.keys(_rtPh).length && typeof J !== 'undefined' && J) rtPessoalAbrir(); }, _rtPespera * (0.75 + Math.random() * 0.5)); return; }   // 0fx: tenta outra vez antes de ir para a Supabase
    if (st === 'CHANNEL_ERROR') { const f = { ..._rtPfalha }; for (const k in _rtPh) delete _rtPh[k]; for (const k in _rtPfalha) delete _rtPfalha[k]; Object.values(f).forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); return; }
    if (st === 'CLOSED') { _rtPespera = Math.min(60000, (_rtPespera || 2000) * 2); setTimeout(() => { if (!_rtP && Object.keys(_rtPh).length && !document.hidden && typeof J !== 'undefined' && J) rtPessoalAbrir(); }, _rtPespera * (0.75 + Math.random() * 0.5)); }
  });
}
function rtPessoalFechar() { const c = _rtP; _rtP = null; try { c?.fechar(); } catch { } }

// 9 nov (dono: «I need to be able to hold 10k people») — via rápida: os pedidos mais frequentes vão pelo canal pessoal ao nosso
// servidor, que fala direto com a base (Hyperdrive), sem passar pelo servidor da Supabase que encravou às 14:00.
// Se o canal não estiver pronto, a função não estiver na lista, ou o servidor disser que não pode, vai pela Supabase como antes.
const RT_RAPIDO_PARTE = 100;   // % dos jogadores na via rápida (sobe aos poucos: 0 → 10 → 50 → 100). Testar: ?rapido=1 / ?rapido=0
const RT_RAPIDAS = new Set(['pulso', 'objetivos', 'diario', 'comer', 'escolher_sala', 'perfil_de', 'registo_criminal_de', 'meus_roubos', 'estado',
  'usar_movel', 'trabalhar', 'grupos_resumo', 'amigos_salas', 'ludo_estado', 'cozinhar2', 'dormir', 'biscato', 'estudar']);
try { const q = new URLSearchParams(location.search).get('rapido'); if (q === '1' || q === '0') localStorage.setItem('vel_rapido', q); } catch { }
const _rapEsp = new Map(); let _rapN = 0, _rapDesligado = false, _rapFalhas = 0;
function rtRapidoUsar() {
  if (_rapDesligado || _rapFalhas >= 3) return false;
  const f = rtLer('vel_rapido'); if (f === '1') return true; if (f === '0') return false;
  if (RT_RAPIDO_PARTE >= 100) return true; if (RT_RAPIDO_PARTE <= 0) return false;
  let h = 7; for (const c of String(typeof uid !== 'undefined' ? uid : '')) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return h % 100 < RT_RAPIDO_PARTE;
}
async function rtRapido(fn, args) {
  const c = _rtP; if (!c || !c.ok || c.ws?.readyState !== 1) return null;
  let token = null;
  try { token = (await sb.auth.getSession())?.data?.session?.access_token || null; } catch { }
  if (rtLocal && !token && rtLer('vel_rt_url') && typeof uid !== 'undefined') token = 'teste:' + uid;
  if (!token) return null;
  const n = ++_rapN;
  const m = await new Promise(res => {
    const t = setTimeout(() => { _rapEsp.delete(n); res(null); }, 8000);
    _rapEsp.set(n, x => { clearTimeout(t); res(x); });
    try { c.ws.send(JSON.stringify({ t: 'rpc', fn, a: args || {}, n, token })); } catch { clearTimeout(t); _rapEsp.delete(n); res(null); }
  });
  if (!m) { _rapFalhas++; return null; }   // sem resposta: esta vai pela Supabase; 3 seguidas → via rápida desligada nesta sessão
  if (m.t === 'rpc_r') { _rapFalhas = 0; return { data: m.d ?? null, error: null }; }
  const code = m.e?.code || '';
  if (code === 'rapido_off') { _rapDesligado = true; return null; }
  if (/^rapido_|PGRST202/.test(code)) return null;
  // só os erros da própria função (raise exception P0xxx, dados inválidos 22xxx/23xxx) vão para o jogador; ligação, permissões,
  // tempo esgotado… → este pedido vai pela Supabase, e 3 seguidas desligam a via rápida nesta sessão
  if (!/^(P0|22|23)/.test(code)) { _rapFalhas++; return null; }
  return { data: null, error: m.e };   // erro da própria função (ex.: «Estás sem energia…»): igual ao da Supabase
}
// troca sb.rpc por uma versão que tenta a via rápida primeiro (só nas funções da lista; o resto não muda)
// 9 nov 21:50: via rápida por HTTP (antes de o canal pessoal abrir — o arranque e a fila). Falha → Supabase, como antes.
const RT_HTTP = new Set(['entrar_fila', 'arranque_tudo', 'aparelho_cheio', 'objetivos_tudo', 'tycoon_coroas', 'guia_estado', 'estado', 'prov_estado',
  'meu_preco_kota', 'apreensao_pendente', 'pulso', 'objetivos']);
let _httpFalhas = 0;
async function rtHttp(fn, args) {
  if (_httpFalhas >= 3 || !RT_URL || !rtRef() || typeof fetch !== 'function') return null;
  let token = null;
  try { token = (await sb.auth.getSession())?.data?.session?.access_token || null; } catch { }
  if (rtLocal && !token && rtLer('vel_rt_url') && typeof uid !== 'undefined' && uid) token = 'teste:' + uid;
  if (!token) return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(() => ctl?.abort(), 8000);
  try {
    const r = await fetch(RT_URL.replace(/^ws/, 'http') + '/rpc/' + rtRef() + '/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(args || {}), signal: ctl?.signal });
    const j = await r.json().catch(() => null);
    if (j && 'data' in j) { _httpFalhas = 0; return { data: j.data ?? null, error: null }; }
    if (/^(P0|22|23)/.test(j?.error?.code || '')) { _httpFalhas = 0; return { data: null, error: j.error }; }   // erro da própria função: igual à Supabase
    _httpFalhas++; return null;
  } catch { _httpFalhas++; return null; } finally { clearTimeout(t); }
}
function rtRapidoInstalar() {
  if (typeof sb === 'undefined' || sb.__rapido) return;
  const original = sb.rpc.bind(sb); sb.__rapido = true;
  sb.rpc = (fn, args, opts) => {
    if (opts || !rtRapidoUsar()) return original(fn, args, opts);
    if (RT_RAPIDAS.has(fn) && _rtP?.ok) return rtRapido(fn, args).then(r => r || original(fn, args, opts));
    if (RT_HTTP.has(fn)) return rtHttp(fn, args).then(r => r || original(fn, args, opts));
    return original(fn, args, opts);
  };
}
