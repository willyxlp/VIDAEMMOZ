/* ============================================================
   Vida na Banda — o jogo
   ============================================================ */
const SUPA_URL = window.VEL_SUPA?.url || '';   // site de teste → base de teste (ver erros.js)
const SUPA_KEY = window.VEL_SUPA?.key || '';
// 8 nov: quando o tempo real está cheio («Too many connected users»), cada telemóvel tentava de 10 em 10 s (~16 mil tentativas/min).
// Agora espera cada vez mais (2 s, 4 s, 8 s… até 2 min), com folga ao acaso para não voltarem todos ao mesmo tempo.
const sb = supabase.createClient(SUPA_URL, SUPA_KEY, { realtime: { reconnectAfterMs: n => Math.min(120000, 2000 * 2 ** Math.max(0, n - 1)) * (0.7 + Math.random() * 0.6) } });
if (typeof rtRapidoInstalar === 'function') rtRapidoInstalar();   // 9 nov: via rápida (js/tempo_real.js)

// 8 nov (bug: «the bank in the game is not working at all»): o redesenho (js/ui2.js) só está no site de teste, mas o código das
// apps chama ui2()/ui2Social()/ui2LojaLigar()… — no jogo ao vivo isso rebentava o Banco, Loja, Social, Mensagens, Família,
// Imóveis, Ranking, Transferir, Jornal e Grupos. Sem o ui2.js, estas funções passam a não fazer nada (o ui2.js substitui-as).
if (typeof window.ui2 !== 'function') window.ui2 = () => false;
// 9 nov: sem js/tempo_real.js o jogo usa o Realtime da Supabase como antes
if (typeof window.rtCanal !== 'function') window.rtCanal = (n, c) => sb.channel(n, c);
if (typeof window.rtRemover !== 'function') window.rtRemover = ch => { try { ch && (ch._rt ? ch.fechar() : sb.removeChannel(ch)); } catch { } };
for (const n of ['ui2Como', 'ui2LojaLigar', 'ui2Social', 'ui2Conversas', 'ui2Familia']) if (typeof window[n] !== 'function') window[n] = () => { };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// LL10: quem chega por um link de convite (?c=<código>) guarda o código até criar conta
(() => { try { const c = new URLSearchParams(location.search).get('c'); if (c && /^[0-9a-f]{10}$/i.test(c)) localStorage.setItem('vel_convite', c.toLowerCase()); } catch { } })();
function conviteGuardado() { try { const c = localStorage.getItem('vel_convite'); return c && /^[0-9a-f]{10}$/.test(c) ? c : null; } catch { return null; } }
const fmtKz = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
// dono, 3 nov: nas contas da equipa com dinheiro sem fim (9.000.000.000.000.000) o saldo mostra-se como ∞
const saldoKz = () => J?.admin && J.kumbu >= 1e15 ? '∞ Kz' : fmtKz(J.kumbu);
const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };

/* ---------- estado ---------- */
let D = {}, J = null, uid = null;
let cena = null, chaoImg = null, chaoBox = null;
let eu = null; const outros = new Map(); let npcs = [];
let canal = null, chatCanal = null, evCanal = null;
let ocupado = false, entrando = false;
let eventos = [], chatMsgs = [];
let deco = null;        // modo decoração: { sel: {mbId, movel, x, y, rot, novo} }
let minhaMobilia = [];
let floats = [];
let marcaToque = null;
let servidorAntigo = false;

const cv = $('#tela'), ctx = cv.getContext('2d');
let dpr = Math.min(2, window.devicePixelRatio || 1), CW = 0, CH_ = 0;
// telemóveis fracos: se o jogo não aguenta ~40 imagens por segundo, desenha com menos píxeis (e volta a subir se sobrar folga)
let qualidade = 1, qAmostra = [], qMudou = 0;
function vigiarQualidade(now, ms) {
  if (document.hidden || ms > 500) return;
  qAmostra.push(ms); if (qAmostra.length < 90) return;
  qAmostra.sort((a, b) => a - b); const mediana = qAmostra[45]; qAmostra = [];
  if (mediana > 25 && qualidade > 0.5) { qualidade = Math.max(0.5, qualidade - 0.25); qMudou = now; redimensionar(); }
  else if (mediana < 17.5 && qualidade < 1 && now - qMudou > 20000) { qualidade = Math.min(1, qualidade + 0.25); qMudou = now; redimensionar(); }
}
const cam = { x: 0, y: 0, z: 1.1, seguir: true };
function redimensionar() {
  dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * qualidade); CW = innerWidth; CH_ = innerHeight; cv.width = CW * dpr; cv.height = CH_ * dpr;
  if (cena?.tipo === 'casa' || cena?.tipo === 'interior') cam.z = zoomCasa();
}
function zoomBairro() { return Math.max(1.1, Math.min(1.9, Math.min(CW, CH_) / 620)); }
function zoomCasa() {
  const W = cena.W, H = cena.H;
  const zx = (CW - 40) / ((W + H) * TW / 2), zy = (CH_ - (CW >= 760 ? 200 : 300)) / ((W + H) * TH / 2 + 90);
  return Math.max(0.6, Math.min(2.4, zx, zy));
}
addEventListener('resize', redimensionar); redimensionar();

/* ---------- utilidades de UI ---------- */
// pergunta sim/não dentro do jogo (o confirm() do browser não aparece em alguns telemóveis e apps)
function perguntar(texto, sim = 'Sim', nao = 'Cancelar') {
  return new Promise(res => {
    const v = document.createElement('div'); v.className = 'pergunta';
    v.innerHTML = `<div class="pergCaixa"><p></p><div class="pergBot"><button class="btn ghost" data-n></button><button class="btn" data-s></button></div></div>`;
    v.querySelector('p').textContent = texto; v.querySelector('[data-s]').textContent = sim; v.querySelector('[data-n]').textContent = nao;
    const fim = ok => { v.remove(); res(ok); };
    v.querySelector('[data-s]').onclick = () => fim(true); v.querySelector('[data-n]').onclick = () => fim(false);
    v.onclick = e => { if (e.target === v) fim(null); };   // tocar fora = fechar (null), diferente de carregar no botão «não» (false)
    document.body.appendChild(v);
  });
}

// 0bf (Cinnss, 1 nov): as mensagens ficam no ecrã pelo menos 5 minutos; no máximo 3 de cada vez (sai a mais antiga); tocar fecha.
const TOAST_MIN = 6000, TOAST_LIM = 10000, TOAST_MAX = 3;   // dono 6 nov 20:16: «notifications should only stay for like 5-10 seconds» (eram 5 min)
function toast(txt, tipo = 'info', ms = 3400) {
  const caixa = $('#toast'); if (!caixa) return;
  [...caixa.children].forEach(t => { if (t.textContent === String(txt)) t.remove(); });   // a mesma mensagem não aparece duas vezes
  const el = document.createElement('div'); el.className = 'tst ' + tipo; el.textContent = txt;
  el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.title = tr('Toca para fechar');
  el.addEventListener('click', () => el.remove());
  caixa.appendChild(el);
  while (caixa.children.length > TOAST_MAX) caixa.firstElementChild.remove();
  setTimeout(() => el.remove(), Math.min(TOAST_LIM, Math.max(ms, TOAST_MIN)));
}
/* botão «voltar» do Android (e gesto de voltar): fecha o painel ou o telemóvel em vez de sair do jogo */
let ignorarPop = 0;
const empurrarHist = t => { try { history.pushState({ vel: t }, ''); } catch { } };
const recuarHist = t => { if (history.state?.vel === t) { ignorarPop++; history.back(); } };
addEventListener('popstate', () => {
  if (ignorarPop) { ignorarPop--; return; }
  if (document.querySelector('.tel-modal')) { document.querySelectorAll('.tel-modal').forEach(v => v.remove()); if (telAberto) empurrarHist('tel'); return; }
  if (telAberto) { if (telSub) { abrirTelemovel(); empurrarHist('tel'); } else fecharTelemovel(true); return; }
  if (document.querySelector('.veil')) fecharSheets(true);
});
function sheet(html, onclose) {
  if (telAberto && document.getElementById('telVeil')) return sheetTel(html, onclose);
  const havia = !!document.querySelector('.veil');
  document.querySelectorAll('.veil, .tel-modal').forEach(v => v.remove());
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = `<div class="sheet"><div class="puxa"></div>${html}</div>`;
  v.addEventListener('click', e => { if (e.target === v) { fecharSheets(); onclose && onclose(); } });
  document.body.appendChild(v);
  if (!havia || history.state?.vel !== 'sheet') empurrarHist('sheet');
  return v.querySelector('.sheet');
}
// botões "fechar" dentro das janelas: data-fechar (código escrito dentro do HTML é bloqueado pela CSP do site)
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-fechar]')) fecharSheets(); });
function fecharSheets(viaHistorico) {
  const havia = !!document.querySelector('.veil');
  document.querySelectorAll('.veil, .tel-modal').forEach(v => v.remove());
  if (havia && !viaHistorico) recuarHist('sheet');
}
const painelAberto = () => !!document.querySelector('.veil') || telAberto;
const bairro = id => D.bairros.find(b => b.id === id);
const emprego = id => D.empregos.find(e => e.id === id);
const casaDe = id => D.casas.find(c => c.id === id);
const tem = item => (J?.itens || []).includes(item);
// 0cy (5)(6): os veículos e aviões da casa — os teus e os do cônjuge com quem moras (vida.js: carregarCasal → veiculos_do_lar)
let itensDoConjuge = [];
const itensLar = () => [...(J?.itens || []), ...itensDoConjuge];
const temLar = item => itensLar().includes(item);
function tempoRel(iso) { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s / 60) + ' min'; if (s < 86400) return Math.floor(s / 3600) + ' h'; return Math.floor(s / 86400) + ' d'; }
function minhaAparencia() { return ls.get('vel_ap_' + uid) || J.aparencia || {}; }

/* ---------- servidor ---------- */
// 0cz-5 / 0dd-2: pagar com Ouro (1 Ouro = 100 Kz) — as compras normais podem ser pagas em Ouro, por escolha ou quando falta Kz
const PAGA_OURO = new Set(['comprar', 'encomendar_veiculo', 'comprar_movel', 'comprar_casa', 'arrendar']);
const pagarComOuro = () => { try { return localStorage.getItem('vel_pagar') === 'ouro'; } catch { return false; } };
// dono 5 nov (bug): quem escolheu «pagar em Ouro» ficava sem forma de pagar em Kz — agora a pergunta tem sempre «Pagar em Kz»
async function oferecerOuro(fn, args, motivo, podeKz = false) {
  const { data, error } = await sb.rpc('pagar_com_ouro', { p_acao: fn, p_args: args, p_simular: true });
  if (error) {
    if (podeKz) return 'kz';
    if (/Não tens Ouro/i.test(error.message) && typeof sugerirOuro === 'function') { sugerirOuro(null, limparErro(error.message)); return null; }   // 0dp-2: falta Ouro → pacote de 9,99 €
    toast(limparErro(error.message), 'mau'); return null;
  }
  const ok = await perguntar(`${motivo ? motivo + ' ' : ''}${tr('Pagar com {0} Ouro? (tens {1})').replace('{0}', data.ouro).replace('{1}', J.ouro || 0)}`, '🪙 ' + tr('Pagar com Ouro'), podeKz ? tr('Pagar em Kz') : tr('Cancelar'));
  if (ok === false && podeKz) return 'kz';
  if (!ok) return null;
  const r = await acao('pagar_com_ouro', { p_acao: fn, p_args: args });
  if (r?.ouro_gasto) toast(`🪙 −${r.ouro_gasto} ${tr('Ouro')}`, 'info', 3000);
  return r;
}
async function acao(fn, args = {}, { silencio = false } = {}) {
  if (ocupado) return null;
  if (PAGA_OURO.has(fn) && pagarComOuro() && (J?.ouro || 0) > 0) { const r = await oferecerOuro(fn, args, '', true); if (r !== 'kz') return r; }
  ocupado = true;
  try {
    const { data, error } = await sb.rpc(fn, args);
    if (error) {
      let m = limparErro(error.message);
      if (/conta foi suspensa/i.test(error.message) && !document.getElementById('suspensao')) { mostrarSuspensao(); return null; }   // suspenso a meio do jogo
      if (PAGA_OURO.has(fn) && (J?.ouro || 0) > 0 && /kumbu|custa /i.test(error.message)) { ocupado = false; return oferecerOuro(fn, args, m); }   // falta Kz → pagar com Ouro?
      if (/Could not find the function|does not exist/i.test(m)) { m = 'Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!'; servidorAntigo = true; }
      if (!silencio && typeof avisoDoErro === 'function' && avisoDoErro(m)) return null;   // 0am: erro com solução à mão → aviso com botões
      toast(m, 'mau'); return null;
    }
    const kAntes = J?.kumbu, oAntes = J?.ouro;
    if (data?.jogador) setJogador(data.jogador);
    // 8 nov (0fe-4): a confirmação da tua ação já não vem outra vez pelo tempo real — entra aqui na lista de notificações
    if (data?.msg && data?.jogador && Array.isArray(eventos)) { eventos.unshift({ id: 'r' + Date.now(), jogador_id: uid, texto: data.msg, tipo: data.tipo || 'info', criado_em: new Date().toISOString() }); eventos = eventos.slice(0, 20); if (typeof atualizarPontoTel === 'function') atualizarPontoTel(); }
    // 0am: ganhaste kumbu ou Ouro a sério → cartão de recompensa (as palavras do servidor ficam por baixo)
    const ganhou = data?.jogador && kAntes != null ? J.kumbu - kAntes : 0, ganhouOuro = data?.jogador && oAntes != null ? (J.ouro || 0) - oAntes : 0;
    if (!silencio && typeof janelaRecompensa === 'function' && !emJogoAgora() && (ganhouOuro > 0 || (ganhou >= RECOMPENSA_MIN && data.tipo !== 'mau'))) {
      janelaRecompensa(ganhouOuro > 0 ? { etiqueta: tr('Ouro'), valor: '+' + ganhouOuro + ' ' + tr('Ouro'), texto: data.msg ? tr(data.msg) : '', ouro: true }
        : { etiqueta: tr('Recebeste'), valor: '+' + fmtKz(ganhou), texto: data.msg ? tr(data.msg) : '' });
    } else if (data?.msg && !silencio) toast(data.msg, data.tipo || 'info');
    document.dispatchEvent(new CustomEvent('vb:acao', { detail: { fn } }));   // 8 nov (Onboarding): o guia do novato ouve as ações (js/guia.js)
    return data || { ok: true };
  } finally { ocupado = false; }
}
let _jogadorEm = 0;   // 0bp: quando chegou o último jogador do servidor (ações e estado) — evita pedidos repetidos
// FILA 0dn-12 (dono 6 nov): «if you fall sick… explained in the pop up which lets them know they have fallen sick»
const DOENCA_INFO = {
  malaria: ['🦟', 'Malária', 'Febre e cansaço. A saúde desce depressa: trata-te hoje.'], tifoide: ['🤢', 'Febre tifoide', 'Precisa de receita: farmácia não chega, vai ao centro de saúde ou à clínica.'],
  gripe: ['🤧', 'Gripe', 'Passa sozinha num dia, mas com remédio passa já.']
};
function avisoDoente(d) {
  if (document.getElementById('avisoDoente')) return;
  const [e, nome, txt] = DOENCA_INFO[d] || ['🤒', 'Doente', ''];
  const v = document.createElement('div'); v.className = 'pergunta'; v.id = 'avisoDoente';
  v.innerHTML = `<div class="pergCaixa" style="max-width:360px;text-align:center"><div style="font-size:52px">${e}</div>
    <h3 style="margin:4px 0">${esc(tr('Ficaste doente: {0}').replace('{0}', tr(nome)))}</h3>
    <p class="m">${esc(tr(txt))}</p>
    <div class="list" style="text-align:left;margin:10px 0">
      <div class="row"><span class="e">📉</span><div class="t"><b>${esc(tr('O que acontece'))}</b><small>${esc(tr('A saúde e o humor descem até te tratares.'))}</small></div></div>
      <div class="row"><span class="e">💊</span><div class="t"><b>${esc(tr('Como te curas'))}</b><small>${esc(tr('Abre 📱 → Saúde e compra o remédio (chega onde estiveres), ou vai à farmácia, centro de saúde ou clínica.'))}</small></div></div>
      <div class="row"><span class="e">🚿</span><div class="t"><b>${esc(tr('Para não voltar'))}</b><small>${esc(tr('Toma banho: quem anda sujo/a fica doente mais vezes.'))}</small></div></div>
    </div>
    <div class="pergBot"><button class="btn ghost" data-x>${esc(tr('Depois'))}</button><button class="btn" data-ok>💊 ${esc(tr('Abrir Saúde'))}</button></div></div>`;
  v.querySelector('[data-x]').onclick = () => v.remove();
  v.querySelector('[data-ok]').onclick = () => { v.remove(); abrirTelemovel('saude'); };
  document.body.appendChild(v);
}
function setJogador(j) {
  _jogadorEm = Date.now();
  const antes = J?.kumbu, gerAntes = J?.geracao, doenteAntes = J ? J.doenca : undefined; J = j;
  if (doenteAntes === null && j?.doenca) setTimeout(() => avisoDoente(j.doenca), 400);   // FILA 0dn-12: ficaste doente → janela que explica
  if (j?.nome_forcado_motivo) setTimeout(pedirNomeNovo, 0);
  else if (j?.cfb_em && !j.cfb_recurso_em) talvezRecursoCfb();   // 6 nov: «their appeal thing isn't working» — abre sozinho   // (6 nov: tinha ficado dentro do comentário acima)
  if (gerAntes && j.geracao > gerAntes) setTimeout(aoMudarGeracao, 300);
  if (antes != null && antes !== j.kumbu && eu) floats.push({ x: eu.x, y: eu.y, txt: (j.kumbu > antes ? '+' : '−') + fmtKz(Math.abs(j.kumbu - antes)), cor: j.kumbu > antes ? '#7ee39b' : '#ff9b9b', t: 0 });
  hud(); verDetencao(); atualizarPontoTel();
  // mudou de bairro sem viajar (ex.: hospital) → muda de cena
  if (cena && cena.tipo === 'bairro' && cena.id !== J.bairro) irParaBairro(J.bairro, true);
  if (cena && cena.tipo === 'casa' && (cena.casa.bairro !== J.bairro || (cena.dono.id === uid && !J.casa))) irParaBairro(J.bairro, true);
}

/* ============================================================
   ENTRADA + CRIADOR DE PERSONAGEM
   ============================================================ */
let modo = 'criar', apNova = { pele: 3, cabelo: 2, corCabelo: 0, camisa: '#cc092f', calca: '#2a3b55', roupa: 0 };
function criadorHTML(ap, id) {
  const sw = (campo, vals, cor) => `<div class="sw">${vals.map((v, i) => `<button type="button" data-c="${campo}" data-v="${cor ? v : i}" class="${(cor ? ap[campo] === v : ap[campo] === i) ? 'on' : ''}" style="background:${cor ? v : (campo === 'pele' ? PELES[i] : CORES_CABELO[i])}"></button>`).join('')}</div>`;
  const txt = (campo, vals) => `<div class="sw">${vals.map((v, i) => `<button type="button" class="txt ${ap[campo] === i ? 'on' : ''}" data-c="${campo}" data-v="${i}">${v}</button>`).join('')}</div>`;
  return `<div class="criador"><canvas id="${id}" width="240" height="300"></canvas><div>
    <div class="opt"><small>Pele</small>${sw('pele', PELES, false)}</div>
    <div class="opt"><small>Cabelo</small>${txt('cabelo', ESTILOS_CABELO)}</div>
    <div class="opt"><small>Cor do cabelo</small>${sw('corCabelo', CORES_CABELO, false)}</div>
  </div></div>
  <div class="criador" style="grid-template-columns:1fr;margin-top:8px">
    <div class="opt"><small>${(ap.roupa || 0) === 5 ? 'Fato' : (ap.roupa || 0) === 6 ? 'Vestido' : 'Camisa'}</small>${sw('camisa', coresRoupa(), true)}</div>
    <div class="opt"><small>Roupa</small><div class="sw">${ROUPAS.map((n, i) => i < 2 || (J && tem(ROUPA_ITEM[i])) ? `<button type="button" class="txt ${(ap.roupa || 0) === i ? 'on' : ''}" data-c="roupa" data-v="${i}">${n}</button>` : '').join('')}</div></div>
    <div class="opt" style="margin:0"><small>${['Calças', 'Saia', 'Gravata', 'Vestido', 'Pano', 'Camisa', 'Saia do vestido'][ap.roupa || 0]}</small>${sw('calca', coresRoupa(), true)}</div>
    ${J && ACESSORIOS.some(a => tem(a)) ? `<div class="opt" style="margin-top:8px"><small>Acessórios</small><div class="sw">${ACESSORIOS.filter(a => tem(a)).map(a => `<button type="button" class="txt ${(ap.acess || []).includes(a) ? 'on' : ''}" data-acess="${a}">${D.itens.find(x => x.id === a)?.emoji || ''} ${esc(D.itens.find(x => x.id === a)?.nome || a)}</button>`).join('')}</div></div>` : ''}
    ${J && ANIMAIS.some(a => tem(a)) ? `<div class="opt" style="margin-top:8px"><small>Animal ao teu lado</small><div class="sw"><button type="button" class="txt ${ap.animal ? '' : 'on'}" data-animal="">Nenhum</button>${ANIMAIS.filter(a => tem(a)).map(a => `<button type="button" class="txt ${ap.animal === a ? 'on' : ''}" data-animal="${a}">${D.itens.find(x => x.id === a)?.emoji || ''} ${esc(D.itens.find(x => x.id === a)?.nome || a)}</button>`).join('')}</div></div>` : ''}
  </div>`;
}
const ROUPAS = ['Calças', 'Saia', 'Fato', 'Vestido de gala', 'Pano africano', 'Fato de luxo', 'Vestido de marca'], ROUPA_ITEM = [null, null, 'fato', 'vestido', 'pano', 'fato_luxo', 'vestido_marca'];
// 6 nov (Ouro exclusivo): a cor dourada só aparece a quem comprou «cor_ouro»
const coresRoupa = () => J && tem('cor_ouro') ? [...CORES_ROUPA, '#d4af37'] : CORES_ROUPA;
const ACESSORIOS = ['oculos', 'chapeu', 'brincos', 'colar', 'relogio', 'auscultadores', 'oculos_ouro', 'corrente_ouro', 'coroa', 'brincos_ouro', 'anel_diamante', 'colar_diamante', 'relogio_diamante'], ANIMAIS = ['cao', 'gato', 'galinhas', 'papagaio', 'cavalo_branco'];
function ligarCriador(host, ap, id, onChange) {
  if (typeof av3dAtivo === 'function' && av3dAtivo()) av3dPreCarregar(J ? ACESSORIOS.filter(a => tem(a)) : []);
  host.innerHTML = criadorHTML(ap, id);
  host.querySelectorAll('[data-acess]').forEach(b => b.onclick = () => {
    const a = b.dataset.acess, l = new Set(ap.acess || []); l.has(a) ? l.delete(a) : l.add(a); ap.acess = [...l];
    ligarCriador(host, ap, id, onChange); onChange && onChange(ap);
  });
  host.querySelectorAll('[data-animal]').forEach(b => b.onclick = () => {
    if (b.dataset.animal) ap.animal = b.dataset.animal; else delete ap.animal;
    ligarCriador(host, ap, id, onChange); onChange && onChange(ap);
  });
  host.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c, v = b.dataset.v; ap[c] = c === 'camisa' || c === 'calca' ? v : parseInt(v, 10);
    ligarCriador(host, ap, id, onChange); onChange && onChange(ap);
  });
}
let previewAnim = 0;
function animarPreview() {
  const t = performance.now() / 1000;
  document.querySelectorAll('canvas[data-preview]').forEach(c => {
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    const ap = c._ap; if (!ap) return;
    if (!av3dPronta(ap)) {   // a descarregar o visual 3D: um círculo a rodar em vez do desenho antigo
      g.strokeStyle = 'rgba(255,203,0,.7)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.arc(c.width / 2, c.height * 0.55, Math.min(c.width, c.height) * 0.08, t * 5, t * 5 + 4.2); g.stroke(); return;
    }
    g.save(); desenhaPessoa(g, c.width / 2, c.height * 0.88, ap, t, false, Math.sin(t * 0.7) > 0 ? 1 : -1, false, c.width / 60); g.restore();
  });
  previewAnim = requestAnimationFrame(animarPreview);
}
function registarPreview(id, ap) {
  const c = document.getElementById(id); if (!c) return;
  if (id === 'pvGrande' && c._3d) { window.ENTRADA3D && window.ENTRADA3D.atualizar(ap); return; }   // 0ab: a personagem 3D com gestos
  c.dataset.preview = 1; c._ap = ap;
}
// 0ab (dono, 30 out): no ecrã de entrada a personagem é a 3D do jogo, a fazer um gesto diferente cada vez
function personagemEntrada3D() {
  const c = document.getElementById('pvGrande');
  if (!c || c._3d || c._3dTentou || getComputedStyle(c).display === 'none' || !(typeof temWebGL === 'function' && temWebGL())) return;
  c._3dTentou = true;
  import('./entrada3d.js').then(() => {
    const c2 = document.createElement('canvas'); c2.id = 'pvGrande'; c2.className = c.className; c2.setAttribute('aria-label', 'A tua personagem');
    if (!window.ENTRADA3D.iniciar(c2, c._ap || apNova)) return;
    c.replaceWith(c2); c2._3d = true;
  }).catch(e => console.warn('personagem 3D da entrada não carregou', e));
}
function pararEntrada3D() { const c = document.getElementById('pvGrande'); if (c && c._3d && window.ENTRADA3D) { window.ENTRADA3D.parar(); c._3d = false; c._3dTentou = false; const n = document.createElement('canvas'); n.id = 'pvGrande'; n.width = 520; n.height = 660; c.replaceWith(n); } }
function montarEntrada() {
  ligarCriador($('#criador'), apNova, 'pvNovo', ap => { registarPreview('pvNovo', ap); registarPreview('pvGrande', ap); });
  registarPreview('pvNovo', apNova); registarPreview('pvGrande', apNova);
  setTimeout(personagemEntrada3D, 300); addEventListener('resize', personagemEntrada3D);
}
/* Modos do ecrã de entrada:
   criar      — conta nova: email, nome da personagem, senha, visual, 18+
   entrar     — email + senha (e "esqueci-me da senha")
   personagem — já tens conta mas ainda não tens personagem: nome, visual, 18+
   senha      — vieste do link de recuperação: escolhe uma senha nova */
const LINK_VOLTA = location.origin + location.pathname;

/* ---------- anti-bots ----------
   Cloudflare Turnstile. Fica desligado enquanto TURNSTILE_SITE estiver vazio.
   Para ligar: 1) cria o widget no Cloudflare e põe aqui a chave PÚBLICA (site key);
   2) publica; 3) só depois liga «Captcha protection» no Supabase com a chave SECRETA. */
const TURNSTILE_SITE = '';
let tsWidget = null, tsToken = null, tsPronto = null;
function prepararTurnstile() {
  if (!TURNSTILE_SITE) return null;
  if (tsPronto) return tsPronto;
  tsPronto = new Promise(res => {
    window.__tsCarregou = () => {
      const caixa = document.createElement('div'); caixa.id = 'tsCaixa';
      $('#bAuth').before(caixa);
      tsWidget = turnstile.render(caixa, {
        sitekey: TURNSTILE_SITE, theme: document.documentElement.dataset.tema === 'b' ? 'light' : 'dark',
        language: typeof lingua !== 'undefined' ? lingua : 'pt', size: 'flexible',
        callback: t => { tsToken = t; }, 'expired-callback': () => { tsToken = null; }, 'error-callback': () => { tsToken = null; },
      });
      res();
    };
    const sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsCarregou&render=explicit'; sc.async = true;
    document.head.appendChild(sc);
  });
  return tsPronto;
}
async function tokenCaptcha() {
  if (!TURNSTILE_SITE) return undefined;
  await prepararTurnstile();
  for (let i = 0; i < 40 && !tsToken; i++) await new Promise(r => setTimeout(r, 250));
  if (!tsToken) throw new Error('Confirma que não és um robô (o quadrado por cima do botão).');
  const t = tsToken; tsToken = null;
  try { turnstile.reset(tsWidget); } catch { }
  return t;
}
// um código aleatório guardado neste aparelho (ajuda a ver várias contas na mesma pessoa)
// 7 nov (dono: «still more than 3 accounts on the same device»): o código fica no armazenamento, num cookie e no IndexedDB,
// para não mudar quando alguém limpa só uma parte do navegador
function lerCookieDisp() { const m = document.cookie.match(/(?:^|; )vel_disp=([A-Za-z0-9-]{8,64})/); return m ? m[1] : null; }
function gravarDisp(d) {
  try { localStorage.setItem('vel_disp', d); } catch { }
  try { document.cookie = `vel_disp=${d}; max-age=${60 * 60 * 24 * 400}; path=/; SameSite=Lax; Secure`; } catch { }
}
function idAparelho() {
  try { let d = localStorage.getItem('vel_disp') || lerCookieDisp(); if (!d) d = crypto.randomUUID(); gravarDisp(d); return d; }
  catch { return lerCookieDisp() || 'sem-id'; }
}
(function guardarDispIDB() {
  try {
    const r = indexedDB.open('vnb', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('k');
    r.onsuccess = () => {
      const db = r.result, tx = db.transaction('k', 'readwrite'), st = tx.objectStore('k'), g = st.get('disp');
      g.onsuccess = () => {
        const velho = g.result, agora = localStorage.getItem('vel_disp') || lerCookieDisp();
        if (velho && velho !== agora) gravarDisp(velho);          // o código mais antigo ganha
        else if (!velho) st.put(agora || idAparelho(), 'disp');
      };
    };
  } catch { }
})();
// o aparelho já tem 3 contas? (avisa logo no registo, antes de criar a conta)
let aparelhoCheio = false;
async function verAparelhoCheio(forcar) {
  // 9 nov (10 mil jogadores): era pedido sempre que o ecrã de registo abria (~15/s); a resposta fica guardada 15 min no aparelho
  let c = null; try { c = JSON.parse(localStorage.getItem('vel_ap_cheio') || 'null'); } catch { }
  if (!forcar && c && Date.now() - c.t < 15 * 60000) aparelhoCheio = !!c.v;
  else { try { const { data } = await sb.rpc('aparelho_cheio', { p_disp: idAparelho() }); aparelhoCheio = !!data; try { localStorage.setItem('vel_ap_cheio', JSON.stringify({ v: aparelhoCheio, t: Date.now() })); } catch { } } catch { aparelhoCheio = false; } }
  if (aparelhoCheio && modo === 'criar') authMsg(tr('Este aparelho já tem 3 contas, o máximo. Não podes criar outra conta neste aparelho — entra numa das tuas contas.'));
  return aparelhoCheio;
}
document.addEventListener('DOMContentLoaded', () => prepararTurnstile());
// links dos emails: https://vidanabanda.com/?token_hash=…&type=email|recovery (o link fica no nosso domínio, menos spam)
const _q = new URLSearchParams(location.search), TOKEN_LINK = _q.get('token_hash'), TIPO_LINK = _q.get('type');
let recuperando = /type=recovery/.test(location.hash) || (TOKEN_LINK && TIPO_LINK === 'recovery');
const authMsg = (erro, ok = '') => { $('#authErr').textContent = erro || ''; $('#authOk').textContent = ok; };
const limparErro = m => String(m || '').replace(/^.*?ERROR:\s*/, '');
const traduzAuth = m => {
  if (/Invalid login credentials/i.test(m)) return 'Email ou senha errados.';
  if (/Email not confirmed/i.test(m)) return 'Ainda não confirmaste o teu email. Abre o link que te enviámos (vê também o spam).';
  if (/already registered|already been registered|User already exists/i.test(m)) return 'Já existe uma conta com esse email. Entra ou recupera a senha.';
  if (/Password should be at least/i.test(m)) return 'A senha precisa de pelo menos 6 caracteres.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Muitas tentativas seguidas. Espera um minuto e tenta outra vez.';
  if (/valid email|invalid.*email|Unable to validate email/i.test(m)) return 'Esse email não parece válido.';
  return limparErro(m);
};
// 6 nov (dono: «let's add a continue with google button»): só aparece quando o Google está ligado no Supabase
let googleLigado = false;
fetch(SUPA_URL + '/auth/v1/settings', { headers: { apikey: SUPA_KEY } }).then(r => r.json()).then(s => {
  googleLigado = !!(s && s.external && s.external.google);
  if (googleLigado && (modo === 'criar' || modo === 'entrar')) { $('#bGoogle')?.classList.remove('hide'); $('#ouGoogle')?.classList.remove('hide'); }
}).catch(() => { });
if ($('#bGoogle')) $('#bGoogle').onclick = async () => {   // 7 nov: páginas velhas em cache não têm o botão

  $('#bGoogle').disabled = true;
  try {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: LINK_VOLTA } });
    if (error) throw error;
  } catch (e) { authMsg(traduzAuth(e.message || String(e))); $('#bGoogle').disabled = false; }
};
// 6 nov (dono): «he took a lot and his options are fight it in court (cost more for expensive lawyers) or take 10-20% back»
let vendoApreensao = false;
async function verApreensao() {
  if (vendoApreensao || !J) return;
  const pa = pre('apreensao');   // 9 nov: vem no arranque()
  const { data: a } = pa ? { data: pa.v } : await sb.rpc('apreensao_pendente');
  if (!a || !a.id) return;
  vendoApreensao = true;
  try {
    const ok = await perguntar(tr('🏛️ O Governo levou {0} das tuas contas. Aceitas o acordo e recebes {1} de volta, ou contratas advogados ({2}) e lutas em tribunal?')
      .replace('{0}', fmtKz(a.valor)).replace('{1}', fmtKz(a.devolve)).replace('{2}', fmtKz(a.advogados)),
      tr('Aceitar o acordo'), tr('Ir a tribunal'));
    if (ok === true) await acao('apreensao_decidir', { p_id: a.id, p_escolha: 'acordo' });
    else if (ok === false) await acao('apreensao_decidir', { p_id: a.id, p_escolha: 'tribunal' });
  } finally { vendoApreensao = false; }
}
function setModo(m, texto = '') {
  modo = m;
  if (m === 'criar') setTimeout(() => verAparelhoCheio(), 0);
  const conta = m === 'criar' || m === 'entrar';
  $('#segAuth').classList.toggle('hide', !conta);
  $('#segCriar').classList.toggle('on', m === 'criar'); $('#segEntrar').classList.toggle('on', m === 'entrar');
  $('#campoEmail').classList.toggle('hide', !conta);
  $('#campoNome').classList.toggle('hide', !(m === 'criar' || m === 'personagem'));
  $('#campoSenha').classList.toggle('hide', m === 'personagem');
  $('#criadorWrap').classList.toggle('hide', !(m === 'criar' || m === 'personagem'));
  $('#campoMaior').classList.toggle('hide', !(m === 'criar' || m === 'personagem'));
  $('#bEsqueci').classList.toggle('hide', m !== 'entrar');
  $('#authNota').classList.toggle('hide', !conta);
  $('#bGoogle')?.classList.toggle('hide', !conta || !googleLigado); $('#ouGoogle')?.classList.toggle('hide', !conta || !googleLigado);
  $('#aceitar').classList.toggle('hide', !(m === 'criar' || m === 'personagem'));
  $('#iEmail').required = conta;
  $('#iNome').required = m === 'criar' || m === 'personagem';
  $('#iSenha').required = m !== 'personagem';
  $('#iMaior').required = m === 'criar' || m === 'personagem';
  $('#lSenha').textContent = m === 'senha' ? 'Senha nova' : 'Senha';
  $('#iSenha').autocomplete = m === 'entrar' ? 'current-password' : 'new-password';
  $('#bAuth').textContent = { criar: 'Começar a vida 🚀', entrar: 'Entrar', personagem: 'Criar a minha personagem 🚀', senha: 'Guardar a senha nova' }[m];
  $('#msgModo').textContent = texto; $('#msgModo').classList.toggle('hide', !texto);
  authMsg('');
}
// Depois de criar conta (ou ao entrar sem ter confirmado): lembrar de ver o spam, com botão para reenviar o email.
let emailAviso = '', reenvioAte = 0;
function mostrarAvisoSpam(email) {
  emailAviso = email; $('#avEmail').textContent = email;
  $('#avisoSpam').classList.remove('hide');
}
function esconderAvisoSpam() { $('#avisoSpam').classList.add('hide'); }
function contarReenvio() {
  const b = $('#bReenviar'), s = Math.ceil((reenvioAte - Date.now()) / 1000);
  if (s > 0) { b.disabled = true; b.textContent = tr('Reenviar o email') + ` (${s}s)`; setTimeout(contarReenvio, 1000); }
  else { b.disabled = false; b.textContent = 'Reenviar o email'; }
}
// 1 nov (erro de um iPhone no lançamento): com rede fraca o service worker pode servir uma página guardada antiga com este script novo.
// Se faltar um botão recente, recarrega uma vez (sem ficar em ciclo) e não deixa o script parar aqui.
if (!$('#bReenviar')) { try { if (!sessionStorage.getItem('vel_recarregou')) { sessionStorage.setItem('vel_recarregou', '1'); location.reload(); } } catch { /* */ } }
if ($('#bReenviar')) $('#bReenviar').onclick = async () => {
  if (!emailAviso || Date.now() < reenvioAte) return;
  const b = $('#bReenviar'); b.disabled = true; authMsg('');
  try {
    const { error } = await sb.auth.resend({ type: 'signup', email: emailAviso, options: { emailRedirectTo: LINK_VOLTA, captchaToken: await tokenCaptcha() } });
    if (error) throw new Error(traduzAuth(error.message));
    authMsg('', 'Email reenviado. Vê outra vez a caixa de entrada e o spam.');
    reenvioAte = Date.now() + 60000; contarReenvio();
  } catch (err) { authMsg(err.message); b.disabled = false; }
};
$('#segCriar').onclick = () => { setModo('criar'); esconderAvisoSpam(); };
$('#segEntrar').onclick = () => setModo('entrar');

$('#bEsqueci').onclick = async () => {
  const email = $('#iEmail').value.trim();
  if (!email) { authMsg('Escreve primeiro o teu email em cima.'); $('#iEmail').focus(); return; }
  const b = $('#bEsqueci'); b.disabled = true;
  // dono 6 nov (erros nos telemóveis): sem o quadrado do robô o botão ficava preso e sem mensagem
  let error;
  try { ({ error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: LINK_VOLTA, captchaToken: await tokenCaptcha() })); }
  catch (e) { b.disabled = false; authMsg(e.message); return; }
  b.disabled = false;
  if (error) authMsg(traduzAuth(error.message));
  else authMsg('', `Se existir uma conta com ${email}, enviámos um link para criares uma senha nova. Vê também a pasta de spam.`);
};

// corre fn só depois de todos os <script> da página terem sido executados
const quandoPronto = fn => document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 0), { once: true })
  : setTimeout(fn, 0);
let nascimento = null;   // detalhes do nascimento acabado de sortear, para a revelação
async function criarPersonagem(nome, aparencia) {
  const { data, error } = await sb.rpc('criar_personagem', { p_nome: nome, p_aparencia: aparencia, p_maior: true, p_disp: idAparelho() })   // dono 3 nov: no máximo 2 contas por aparelho;
  if (error) throw new Error(limparErro(error.message));
  nascimento = data && data.classe ? data : { classe: null };
  if (typeof medirRegisto === 'function') medirRegisto();   // 0s: evento de registo + de onde veio
}

/* ---------- 🎲 A lotaria da vida: revelação do nascimento ---------- */
const CLASSES_N = {
  musseque: { e: '🏚️', t: 'Luta do Musseque', s: 'A vida não vai ser fácil… mas no musseque ninguém desiste.', c: ['#c0703f', '#4a2312'] },
  media: { e: '🏢', t: 'Filho/a da Centralidade', s: 'Nem rico nem pobre: estudo, trabalho e um bocadinho de sorte.', c: ['#4d9be0', '#1d3c5e'] },
  rica: { e: '💎', t: 'Elite do Petróleo', s: 'Nasceste com a vida feita. Agora é não estragar.', c: ['#ffcb00', '#6e4900'] },
};
function mostrarNascimento(n, depois) {
  const fim = CLASSES_N[n?.classe];
  if (!fim) { depois && depois(); return; }
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.className = 'nasc';
  el.innerHTML = `<div class="nascIn">
    <div class="nascTit">🎲 A lotaria da vida</div>
    <p class="nascSub">Ninguém escolhe onde nasce…</p>
    <div class="cartaN" id="cartaN"><div class="e"></div><div class="t"></div></div>
    <div class="nascTxt hide" id="nascTxt"></div>
    <button class="btn full hide" id="bNasc">Bora viver! 🚀</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  const carta = el.querySelector('#cartaN');
  const pinta = (k, anim) => {
    const c = CLASSES_N[k];
    carta.style.setProperty('--c1', c.c[0]); carta.style.setProperty('--c2', c.c[1]);
    carta.querySelector('.e').textContent = c.e; carta.querySelector('.t').textContent = c.t;
    if (anim) { carta.classList.remove('vira'); void carta.offsetWidth; carta.classList.add('vira'); }
  };
  const ordem = ['musseque', 'media', 'rica'];
  const revelar = () => {
    pinta(n.classe, false); carta.classList.add('final');
    try { navigator.vibrate && navigator.vibrate([40, 60, 90]); } catch { }
    if (!calmo) for (let i = 0; i < 18; i++) {
      const p = document.createElement('span'); p.className = 'conf';
      p.textContent = [fim.e, '✨', '🎉', '⭐'][i % 4];
      const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 160;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
      el.appendChild(p); setTimeout(() => p.remove(), 1400);
    }
    const bairroNome = (D.bairros || []).find(b => b.id === n.bairro)?.nome || n.bairro;
    const origem = n.provincia && n.provincia !== 'Luanda' ? ` A tua família é de <b>${esc(n.provincia)}</b>.` : '';
    const txt = el.querySelector('#nascTxt');
    txt.innerHTML = `<p class="nascS">${esc(fim.s)}</p>
      <p>Nasceste filho/a de <b>${esc(n.pais)}</b>.${origem} Cresceste em <b>${esc(bairroNome)}</b>.</p>
      <p>Começas com <b>${fmtKz(n.kumbu)}</b> e um colchão.</p>`;
    setTimeout(() => { txt.classList.remove('hide'); el.querySelector('#bNasc').classList.remove('hide'); }, calmo ? 0 : 450);
  };
  el.querySelector('#bNasc').onclick = () => {
    el.classList.remove('on'); setTimeout(() => el.remove(), 400);
    depois && depois();
  };
  if (calmo) { revelar(); return; }
  // a roleta: começa rápida e vai abrandando até parar no teu destino
  let i = 0, passo = 70, total = 0;
  const gira = () => {
    pinta(ordem[i++ % 3], true); total += passo; passo *= 1.13;
    if (total < 2600) setTimeout(gira, passo);
    else setTimeout(revelar, 260);
  };
  setTimeout(gira, 500);
}

$('#fAuth').onsubmit = async e => {
  e.preventDefault();
  const email = $('#iEmail').value.trim(), nome = $('#iNome').value.trim(), senha = $('#iSenha').value;
  const b = $('#bAuth'); b.disabled = true; authMsg(''); esconderAvisoSpam();
  try {
    if (modo === 'criar' || modo === 'personagem') {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(nome)) throw new Error('O nome deve ter 3 a 16 caracteres: letras, números ou _');
      if (!$('#iMaior').checked) throw new Error('Confirma que tens 18 anos ou mais para jogar.');
      const { data: disp, error: eDisp } = await sb.rpc('nome_disponivel', { p_nome: nome });
      if (eDisp) throw new Error(limparErro(eDisp.message));
      if (!disp.ok) throw new Error(disp.msg);
    }
    if (modo === 'criar') {
      if (await verAparelhoCheio(true)) throw new Error('Este aparelho já tem 3 contas, o máximo. Não podes criar outra conta neste aparelho — entra numa das tuas contas.');
      const { data, error } = await sb.auth.signUp({
        email, password: senha,
        options: { emailRedirectTo: LINK_VOLTA, captchaToken: await tokenCaptcha(), data: { nome, aparencia: apNova, maior: true, lingua, ...(conviteGuardado() ? { convite: conviteGuardado() } : {}) } }
      });
      if (error) throw new Error(traduzAuth(error.message));
      if (typeof medir === 'function') medir('conta');
      // Com confirmação de email ligada, ainda não há sessão: a personagem nasce quando abrires o link.
      if (!data.session) {
        // O Supabase devolve um utilizador sem identidades quando o email já tem conta (para não o revelar).
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
          throw new Error('Já existe uma conta com esse email. Entra ou recupera a senha.');
        setModo('entrar');
        $('#iEmail').value = email;
        authMsg('', 'Quase lá! Abre o link que te enviámos para confirmar a conta e a tua vida começa.');
        mostrarAvisoSpam(email); reenvioAte = Date.now() + 60000; contarReenvio();
      }
    } else if (modo === 'entrar') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha, options: { captchaToken: await tokenCaptcha() } });
      if (error) { if (/Email not confirmed/i.test(error.message)) mostrarAvisoSpam(email); throw new Error(traduzAuth(error.message)); }
    } else if (modo === 'personagem') {
      await criarPersonagem(nome, apNova);
      const { data } = await sb.auth.getSession();
      if (data.session) await entrarNoJogo(data.session);
    } else if (modo === 'senha') {
      const { error } = await sb.auth.updateUser({ password: senha });
      if (error) throw new Error(traduzAuth(error.message));
      recuperando = false;
      history.replaceState(null, '', LINK_VOLTA);
      toast('🔐 Senha nova guardada!', 'bom');
      const { data } = await sb.auth.getSession();
      if (data.session) await entrarNoJogo(data.session);
    }
  } catch (err) { authMsg(err.message); }
  finally { b.disabled = false; }
};

/* ============================================================
   ARRANQUE
   ============================================================ */
// 8 nov (0fe-3): o que o arranque() trouxe de uma vez; cada carregador usa a sua parte uma vez (depois volta a pedir normalmente)
let _pre = null;
// 9 nov (10 mil jogadores): respostas que mudam pouco ficam guardadas uns minutos no telemóvel (ex.: o teu registo criminal
// e os roubos contra ti, pedidos sempre que abrias o teu perfil)
const _memo = new Map();
function memoRpc(k, ms, fn) {
  const c = _memo.get(k); if (c && Date.now() - c.em < ms) return c.p;
  const p = Promise.resolve(fn()).then(r => { if (r?.error) _memo.delete(k); return r; });
  _memo.set(k, { em: Date.now(), p }); return p;
}
memoRpc.limpar = k => _memo.delete(k);
function pre(k) { if (_pre && k in _pre) { const v = _pre[k]; delete _pre[k]; return { v }; } return null; }
async function carregarDados() {
  // 8 nov (0fe-2): primeiro o catálogo guardado no site (/api/catalogo, 5 min na rede da Vercel) — 0 pedidos à base;
  // se falhar, lê da base como antes.
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('/api/catalogo', { signal: ctl.signal }); clearTimeout(tm);
    const c = r.ok ? await r.json() : null;
    if (c && c.bairros?.length && c.empregos?.length) {
      for (const n of ['bairros', 'empregos', 'casas', 'comidas', 'lazer', 'itens', 'moveis', 'pacotes', 'pacotesKz', 'colegios']) D[n] = c[n] || [];
      if (Array.isArray(c.outdoors)) D.outdoors = c.outdoors; if (Array.isArray(c.musicas)) D.musicas = c.musicas;   // 9 nov
      D.pagaKz = !!c.pagaKz;
      D.bairros.sort((a, z) => a.ordem - z.ordem); D.empregos.sort((a, z) => a.ordem - z.ordem);
      D.comidas.sort((a, z) => a.preco - z.preco); D.moveis.sort((a, z) => a.ordem - z.ordem);
      return;
    }
  } catch { }
  const t = ['bairros', 'empregos', 'casas', 'comidas', 'lazer', 'itens', 'moveis'];
  // 8 nov: com o servidor carregado, um destes pedidos às vezes falhava e a lista ficava vazia em silêncio
  // (ex.: empregos vazio → o 📱 Perfil rebentava em blocoCarreira). Agora tenta 3 vezes antes de desistir.
  const ler = async n => {
    for (let k = 0; k < 3; k++) {
      const { data, error } = await sb.from(n).select('*');
      if (!error && data) return data;
      await new Promise(ok => setTimeout(ok, 800 * (k + 1)));
    }
    return [];
  };
  // 8 nov (dono: «takes too long to open»): tudo ao mesmo tempo em vez de 4 pedidos seguidos depois das tabelas
  const [r, pOuro, pKz, cols, pagaKz] = await Promise.all([Promise.all(t.map(ler)),
  sb.from('pacotes_ouro').select('*').eq('ativo', true).order('ordem'), sb.from('pacotes_kz').select('*').eq('ativo', true).order('ordem'),
  sb.from('colegios').select('*').order('ordem'), sb.rpc('pagamento_local_ativo')]);
  t.forEach((n, i) => D[n] = r[i]);
  D.pacotes = pOuro.data || [];
  D.pacotesKz = pKz.data || [];   // 7 nov 22:33 (dono): «add the buy kz to the live site»   // 6 nov: 1,99 · 9,99 (melhor valor) · 29,99
  D.colegios = cols.data || [];
  D.pagaKz = !!pagaKz.data;
  D.bairros.sort((a, z) => a.ordem - z.ordem); D.empregos.sort((a, z) => a.ordem - z.ordem);
  D.comidas.sort((a, z) => a.preco - z.preco); D.moveis.sort((a, z) => a.ordem - z.ordem);
}
// A língua fica guardada na conta: os emails (confirmar conta, senha nova) chegam na língua do jogador.
// Sem língua guardada o email sai em português, por isso só se grava quando é preciso.
function guardarLinguaConta(user) {
  const tem = user && user.user_metadata && user.user_metadata.lingua;
  if (!user || tem === lingua || (!tem && lingua === 'pt')) return;
  sb.auth.updateUser({ data: { lingua } }).then(({ data }) => { if (data && data.user) user.user_metadata = data.user.user_metadata; }).catch(() => { });
}
// dono 5 nov: quem tem um nome que não é permitido vê uma janela (que não se fecha) com o motivo e uma caixa para o nome novo
function pedirNomeNovo() {
  if (!J?.nome_forcado_motivo || document.getElementById('nomeForcado')) return;
  const v = document.createElement('div'); v.id = 'nomeForcado'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.style.cssText = 'position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(10,8,6,.72);padding:16px';
  v.innerHTML = `<div class="card" style="max-width:360px;width:100%;background:var(--bg,#fff);color:var(--ink,#141012);border:2px solid #141012;border-radius:16px;padding:18px;box-shadow:4px 4px 0 #141012">
    <h3 style="margin:0 0 8px">🪪 ${esc(tr('Muda o teu nome'))}</h3>
    <p class="m" style="margin:0 0 6px">${esc(tr('O teu nome não é permitido no Vida na Banda, por isso tens de escolher outro para continuar a jogar.'))}</p>
    <p class="m" style="margin:0 0 12px"><b>${esc(tr('Motivo'))}:</b> ${esc(tr(J.nome_forcado_motivo))}</p>
    <label for="nfNome" style="font-weight:700;font-size:13px">${esc(tr('Nome novo'))}</label>
    <input class="inp" id="nfNome" maxlength="16" autocomplete="off" placeholder="${esc(tr('3 a 16 letras, números ou _'))}" style="margin:4px 0 8px;width:100%">
    <small id="nfErro" style="display:block;color:#cc092f;min-height:18px"></small>
    <button class="btn full" id="nfOk" type="button">${esc(tr('Guardar o nome novo'))}</button></div>`;
  document.body.appendChild(v);
  const inp = v.querySelector('#nfNome'), err = v.querySelector('#nfErro'), ok = v.querySelector('#nfOk');
  const enviar = async () => {
    const n = inp.value.trim(); if (!n) return;
    ok.disabled = true; err.textContent = '';
    const { error } = await sb.rpc('mudar_nome', { p_nome: n });
    ok.disabled = false;
    if (error) { err.textContent = limparErro(error.message); return; }
    J.nome = n; J.nome_forcado_motivo = null; v.remove(); hud(); toast(tr('Nome mudado. Obrigado!'), 'bom');
  };
  ok.onclick = enviar; inp.onkeydown = e => { if (e.key === 'Enter') enviar(); };
  setTimeout(() => inp.focus(), 100);
}
// se o jogo não abrir, em vez de ficar a carregar para sempre aparece um botão para tentar outra vez
// 8 nov (0ff): sala de espera — com o servidor cheio, espera aqui até haver lugar (o servidor guarda a vez)
let _naFila = false;
// 9 nov (dono, 0gb): «Skip the queue» — aparece ao fim de 4–5 min à espera; o preço só no passo seguinte, antes de pagar
const _filaPagou = /[?&]fila=ok\b/.test(location.search);
// 9 nov 23:09 (dono): «arbitrage it between 45 sec and 5 minutes, find which pays the most and narrow in» — cada aparelho fica
// com um atraso ao acaso (45 s, 90 s, 150 s ou 300 s); contamos quem viu, quem tocou e quem pagou por atraso (anuncio_exposicao
// «diag:fila_ver_<s>» / «diag:fila_tocar_<s>»; checkouts.pacote «saltar_fila_<s>») e depois estreitamos para o que rende mais.
const FILA_ATRASOS = [45, 90, 150];   // 10 nov 00:52 (dono): os 5 min saíram do teste
const _filaAtraso = (() => {
  let a = null; try { a = +localStorage.getItem('vel_fila_atraso'); } catch { }
  if (!FILA_ATRASOS.includes(a)) { a = FILA_ATRASOS[Math.floor(Math.random() * FILA_ATRASOS.length)]; try { localStorage.setItem('vel_fila_atraso', a); } catch { } }
  return a;
})();
// 10 nov 00:52 (dono): «experiment with .99 as well» — cada aparelho fica com um preço ao acaso (0,99 ou 1,99)
const FILA_PRECOS = [99, 199];
const _filaPreco = (() => {
  let a = null; try { a = +localStorage.getItem('vel_fila_preco'); } catch { }
  if (!FILA_PRECOS.includes(a)) { a = FILA_PRECOS[Math.floor(Math.random() * FILA_PRECOS.length)]; try { localStorage.setItem('vel_fila_preco', a); } catch { } }
  return a;
})();
const _filaSaltarEm = Date.now() + (window.__FILA_SALTAR_MS ?? _filaAtraso * 1000);
const filaDiag = l => { try { sb.rpc('registar_exposicao', { p_itens: [{ lugar: 'diag:fila_' + l + '_' + _filaAtraso + '_p' + _filaPreco, id: 0, seg: 1 }] }).then(() => { }, () => { }); } catch { } };
function filaSaltarDesenhar(el) {
  const eur = typeof moedaOuro !== 'function' || moedaOuro() === 'eur', pt = _filaPreco === 99 ? '0,99' : '1,99', preco = eur ? pt + ' €' : 'US$ ' + pt;
  if (!filaSaltarDesenhar._visto) { filaSaltarDesenhar._visto = true; filaDiag('ver'); }
  el.innerHTML = `<button type="button" class="fv-saltar" data-fs="abrir"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"></path></svg>${esc(tr('Saltar a fila'))}</button><p class="fv-opc">${esc(tr('Opcional. Se esperares, entras na mesma.'))}</p>`;
  el.querySelector('[data-fs="abrir"]').onclick = () => {
    filaDiag('tocar');
    el.innerHTML = `<div class="fv-pagar">
      <p style="margin:0 0 4px;font-weight:800;font-size:16px">${esc(tr('Entra já no jogo por {0}.').replace('{0}', preco))}</p>
      <p style="margin:0 0 10px;font-size:12.5px;opacity:.8">${esc(tr('Pagas na Stripe. Se entrares sozinho/a antes de o pagamento acabar, recebes {0} Ouro.').replace('{0}', _filaPreco === 99 ? 100 : 200))}</p>
      <button type="button" class="btn" data-fs="pagar" style="width:100%;font-size:15px;padding:10px 14px;line-height:1.2">${esc(tr('Pagar {0}').replace('{0}', preco))}</button>
      <button type="button" class="btn ghost" data-fs="nao" style="width:100%;margin-top:6px;font-size:14px;padding:8px 14px;line-height:1.2">${esc(tr('Agora não'))}</button>
      <p data-fs="msg" style="margin:6px 0 0;font-size:13px;color:#ffb3b3"></p></div>`;
    el.querySelector('[data-fs="nao"]').onclick = () => filaSaltarDesenhar(el);
    el.querySelector('[data-fs="pagar"]').onclick = async ev => {
      ev.currentTarget.disabled = true;
      const { data, error } = await sb.functions.invoke('stripe-checkout', { body: { tipo: 'fila', moeda: eur ? 'eur' : 'usd', atraso: _filaAtraso, preco: _filaPreco } });
      if (data?.url) { location.href = data.url; return; }
      let m = data?.erro; if (!m && error?.context?.json) { try { m = (await error.context.json())?.erro; } catch { } }
      const msg = el.querySelector('[data-fs="msg"]'); if (msg) msg.textContent = tr(m || 'Não foi possível abrir o pagamento.');
      ev.currentTarget.disabled = false;
    };
  };
}
async function esperarNaFila() {
  let caixa = null, saltar = null, voltas = 0, _filaPos0 = 0;
  for (; ;) {
    let r = null;
    try { r = (await sb.rpc('entrar_fila')).data; } catch { }
    if (!r || r.entrar !== false) { if (_naFila) setTimeout(() => { if (!$('#carregar')?.classList.contains('hide')) mostrarFalhaCarregar(); }, 40000); _naFila = false; caixa?.remove(); return true; }   // com erro, entra (nunca fica preso)
    _naFila = true;
    const c = $('#carregar'); c?.querySelector('.falha-carregar')?.remove(); c?.querySelector('.msg-carregar')?.remove();
    if (!caixa) {
      caixa = document.createElement('div'); caixa.className = 'fila-espera fila-v2';   // 9 nov 23:40 (dono): sala de espera redesenhada (Claude Design)
      c?.appendChild(caixa);
    }
    if (!caixa.querySelector('.fila-info')) { caixa.innerHTML = '<div class="fv-faixa"></div><div class="fv-corpo"><div class="fila-info"></div><div class="fila-saltar"></div></div>'; saltar = caixa.querySelector('.fila-saltar'); }
    if (saltar && !saltar.childElementCount && !_filaPagou && Date.now() >= _filaSaltarEm && r.posicao > (window.__FILA_SALTAR_POS ?? 3)) filaSaltarDesenhar(saltar);
    _filaPos0 = Math.max(_filaPos0 || 0, r.posicao);
    { const fa = document.getElementById('faixaAviso'), co = caixa.querySelector('.fv-corpo'); if (co) co.style.paddingTop = fa ? Math.round(fa.getBoundingClientRect().bottom + 16) + 'px' : ''; }   // a faixa de aviso não tapa o topo
    const prog = Math.max(4, Math.min(100, Math.round((1 - (r.posicao - 1) / Math.max(1, _filaPos0)) * 100)));
    caixa.querySelector('.fila-info').innerHTML = `<div class="fv-topo"><b>Vida na Banda</b><span class="fv-chip"><i></i>${esc(tr('Lugar guardado'))}</span></div>
      ${_filaPagou ? `<p class="fv-pago">${esc(tr('Pagamento recebido! A abrir o jogo…'))}</p>` : ''}
      <div class="fv-cartao"><div class="fv-sob">${esc(tr('O jogo está cheio'))}</div>
        <div class="fv-num-t">${esc(tr('És o número'))}</div><div class="fv-num">${Number(r.posicao).toLocaleString('pt-PT')}</div><div class="fv-num-t">${esc(tr('na fila'))}</div>
        <div class="fv-barra"><div style="width:${prog}%"></div></div><div class="fv-pontas"><span>${esc(tr('Entraste na fila'))}</span><span>${esc(tr('Dentro do jogo'))}</span></div>
        <div class="fv-tempo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg><span>${esc(tr('Entras em cerca de {0} min').replace('{0}', r.minutos))}</span></div>
        <div class="fv-nota">${esc(tr('Não feches o jogo: entras sozinho/a quando chegar a tua vez.'))}</div></div>
      <div class="fv-info verde"><span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"></path><path d="M15 7h6v6"></path></svg></span><div><b>${esc(tr('A fila não é para sempre'))}</b><small>${esc(tr('Estamos a aumentar a capacidade do jogo nos próximos dias.'))} ${esc(tr('A espera vai ficar cada vez mais curta.'))}</small></div></div>
      <div class="fv-info azul"><span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"></path><circle cx="17.5" cy="9" r="2.5"></circle><path d="M17 14.5c2.4.2 4 1.8 4.5 4.5"></path></svg></span><div><b>${esc(tr('Porquê esperar?'))}</b><small>${esc(tr('Há muita gente a jogar agora.'))} ${esc(tr('As entradas são feitas aos poucos para o jogo não ficar lento para ninguém.'))}</small></div></div>`;
    // 9 nov 21:20: a própria fila era o pedido n.º 1 à Supabase (~140/s com 3.700 à espera). Quem está longe pergunta menos vezes
    // (o lugar só se perde sem sinal durante 2–3 min, por isso nunca mais de 75 s).
    const espera = _filaPagou && ++voltas <= 24 ? 5000 : r.posicao <= 100 ? 20000 : r.posicao <= 1000 ? 45000 : 75000;   // pagou: pergunta de 5 em 5 s até a Stripe confirmar
    await new Promise(ok => setTimeout(ok, espera * (0.9 + Math.random() * 0.2)));
  }
}
function mostrarFalhaCarregar() {
  if (_naFila) return;
  const c = $('#carregar'); if (!c || c.classList.contains('hide') || c.querySelector('.falha-carregar')) return;
  const d = document.createElement('div'); d.className = 'falha-carregar';
  d.style.cssText = 'position:absolute;left:16px;right:16px;bottom:calc(40px + env(safe-area-inset-bottom));text-align:center;z-index:5';
  d.innerHTML = `<p style="margin:0 0 10px;color:#fff;font-weight:700">${esc(tr('O jogo está a demorar a abrir. O servidor pode estar ocupado.'))}</p><button class="btn red" type="button">${esc(tr('Tentar outra vez'))}</button>`;
  d.querySelector('button').onclick = () => location.reload();
  c.appendChild(d);
}
async function entrarNoJogo(session) {
  setTimeout(() => { if (!$('#carregar')?.classList.contains('hide')) mostrarFalhaCarregar(); }, 40000);
  if (entrando || J) return; entrando = true;
  try {
    uid = session.user.id; guardarLinguaConta(session.user);
    if (session.access_token) { try { sb.realtime.setAuth(session.access_token); } catch { } }   // 7 nov: login no Realtime antes dos canais privados
    const pDados = D.bairros ? null : carregarDados();   // 8 nov: os dados do jogo e o estado do jogador vêm ao mesmo tempo
    await esperarNaFila();   // 8 nov (0ff): com o servidor cheio, espera a vez
    // 1 nov (Cinnss/Mirella presas a carregar): com o servidor muito ocupado, tenta outra vez em vez de ficar parado ou sair da conta
    const estadoComCalma = async () => {
      let r;
      for (let i = 0; i < 4; i++) {
        // 9 nov (10 mil jogadores): arranque_tudo faz também a sessão, o aparelho, as contas do dia, encomendas, encontros… (eram ~12 pedidos)
        const pedido = _arrTudo !== false ? sb.rpc('arranque_tudo', { p_disp: idAparelho(), p_ua: navigator.userAgent, p_sessao: SESSAO }) : sb.rpc('arranque');
        r = await Promise.race([pedido, new Promise(ok => setTimeout(() => ok({ error: { message: 'tempo' } }), 15000))]);   // 8 nov (0fe-3): tudo de uma vez
        if (r.error && _arrTudo !== false && /arranque_tudo|PGRST202|Could not find/i.test((r.error.code || '') + ' ' + (r.error.message || ''))) { _arrTudo = false; i--; continue; }   // base antiga: volta ao arranque()
        if (!r.error && _arrTudo !== false) _arrTudo = true;
        if (!r.error || /personagem|suspensa|conta/i.test(r.error.message)) return r;
        const c = $('#carregar'); if (c && !c.querySelector('.msg-carregar')) { const m = document.createElement('p'); m.className = 'msg-carregar'; m.style.cssText = 'position:absolute;left:16px;right:16px;top:60%;text-align:center;color:#fff;font-weight:700;margin:0'; m.textContent = tr('O servidor está ocupado. A tentar outra vez…'); c.appendChild(m); }
        await new Promise(ok => setTimeout(ok, 1500 * (i + 1)));
      }
      return r;
    };
    let { data, error } = await estadoComCalma();
    if (pDados) await pDados;
    carregarOutdoors(); carregarMusicas();
    if (error && /Ainda não tens personagem/.test(error.message)) {
      // Conta acabada de confirmar: cria a personagem com o que escolheste no registo.
      const meta = session.user.user_metadata || {};
      try {
        if (!meta.nome || !meta.maior) throw new Error('');
        await criarPersonagem(meta.nome, meta.aparencia || apNova);
        ({ data, error } = await sb.rpc('estado'));
      } catch (err) {
        // Sem dados do registo, ou o nome foi apanhado entretanto: escolhe aqui.
        if (meta.nome) $('#iNome').value = meta.nome;
        if (meta.aparencia) Object.assign(apNova, meta.aparencia);
        $('#carregar').classList.add('hide'); $('#entrada').classList.remove('hide');
        setModo('personagem', '✅ Conta confirmada! Só falta criares a tua personagem.');
        if (err.message) authMsg(err.message);
        montarEntrada();
        return;
      }
    }
    if (error && error.message === 'tempo' || error && !/personagem|suspensa|conta/i.test(error.message)) { mostrarFalhaCarregar(); return; }
    if (error && /suspensa/i.test(error.message)) { mostrarSuspensao(); return; }   // 6 nov: em vez de pôr fora, mostra o motivo e o recurso
    if (error) { toast(limparErro(error.message), 'mau'); await sb.auth.signOut(); return; }
    $('#carregar')?.querySelector('.msg-carregar')?.remove();
    setTimeout(() => pedirNomeNovo(), 2500);
    setTimeout(verApreensao, 4000); setInterval(verApreensao, 30 * 60 * 1000);   // 9 nov (custos): era de 10 em 10 min
    setTimeout(() => typeof tycoonDoLink === 'function' && tycoonDoLink(), 2000);   // 0ef: só depois do login
    _pre = { ...data }; delete _pre.jogador;
    setTimeout(() => { _pre = null; }, 60000);   // o que não foi usado no arranque deixa de valer
    J = data.jogador; carregar3D();
    if (_arrTudo !== true) sb.rpc('registar_dispositivo', { p_disp: idAparelho(), p_ua: navigator.userAgent }).then(() => { }, () => { });   // 9 nov: já vem no arranque_tudo
    const pend = ls.get('vel_ap_pendente'); if (pend) { ls.set('vel_ap_' + uid, pend); localStorage.removeItem('vel_ap_pendente'); }
    const pe = pre('eventos');
    const [{ data: ev }] = await Promise.all([pe ? { data: pe.v } : sb.from('eventos').select('*').order('criado_em', { ascending: false }).limit(20), carregarMinhaMobilia()]);
    eventos = ev || [];
    if (!J) return;   // 6 nov: saíste a meio do arranque
    pararEntrada3D(); $('#entrada').classList.add('hide'); $('#hud').classList.remove('hide'); $('#carregar').classList.remove('hide');   // (fica até a arte estar pronta)
    cancelAnimationFrame(previewAnim); previewAnim = 0;
    ligarEventos();
    await Promise.all([iniciarVida(), iniciarCrime(), carregarGoverno()]); if (!J) return;   // 8 nov: ao mesmo tempo (eram seguidos)
    carregarObjetivos();
    carregarDilemas();
    await irParaBairro(J.bairro, false); if (!J) return;
    hud();
    await esperarArte(); if (!J) return;   // o jogo só aparece com tudo descarregado: prédios, árvores, carros e personagens já em 3D
    if (typeof verEncontro === 'function') setTimeout(verEncontro, 1500);   // 0n: encontro aceite enquanto estavas fora
    if (typeof verDesafio === 'function') setTimeout(verDesafio, 2500);
    if (typeof carregarCanal === 'function') setTimeout(carregarCanal, 3000);   // 0cl: para o ponto vermelho do 📢 Canal   // 0ck: desafio aceite enquanto estavas fora
    $('#carregar').classList.add('hide');
    const novo = !J.criado_em || Date.now() - new Date(J.criado_em).getTime() < 36e5 * 6;  // só nas primeiras horas da conta
    setTimeout(() => receberEncomendas(), 4000);
    setTimeout(() => diaDosEmpregados(), 6000);
    setTimeout(() => diaDasPosses(), 8000);
    iniciarDMs();
    vigiarSessao();
    setTimeout(() => diaDoSugar(), 8000);
    setTimeout(() => typeof perguntarCasamentos === 'function' && perguntarCasamentos(), 6000);   // 7 nov: anunciar o casamento só se os dois quiserem
    const pKz = new URLSearchParams(location.search).get('kz');
    if (pKz) { history.replaceState(null, '', location.pathname); toast(pKz === 'ok' ? tr('Pagamento recebido! Os teus Kz chegam em segundos.') : tr('Pagamento cancelado.'), pKz === 'ok' ? 'bom' : 'info', 6000); }
    if (/[?&]fila=/.test(location.search)) history.replaceState(null, '', location.pathname);
    const pOuro = new URLSearchParams(location.search).get('ouro');
    if (pOuro) { history.replaceState(null, '', location.pathname); toast(pOuro === 'ok' ? 'Pagamento recebido! O teu Ouro chega em segundos.' : 'Pagamento cancelado.', pOuro === 'ok' ? 'bom' : 'info', 6000); if (pOuro === 'ok') setTimeout(async () => { const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador); }, 5000); }
    const comTutorial = novo && !ls.get('vel_tut_' + uid);
    if (comTutorial) ls.set('vel_tut_' + uid, 1);
    const primeiro = typeof guiaIniciar === 'function' ? guiaIniciar : tutorial;   // 8 nov (Onboarding): guia do novato em 5 passos (js/guia.js); sem ele, o texto antigo
    if (nascimento) { const n = nascimento; nascimento = null; mostrarNascimento(n, () => comTutorial && setTimeout(primeiro, 500)); }
    else if (comTutorial) setTimeout(primeiro, 600);
    else if (typeof guiaRetomar === 'function') setTimeout(guiaRetomar, 5000);   // guia a meio, ou prémio de entrada dos dias 2, 3, 5 e 7
  } finally { entrando = false; }
}
// espera que a primeira rua esteja toda desenhada com a arte nova (índices, imagens 3D e, para quem tem o teste, o mundo 3D) — no máximo 12 s
function esperarArte(max = 7000) {   // 8 nov: 7 s no máximo (eram 12); o resto da arte continua a chegar com o jogo já aberto
  const t0 = performance.now();
  return new Promise(res => {
    let calmo = 0;
    const ver = () => {
      const indices = MOD3D.idx && typeof PRED3D.idx === 'object' && PRED3D.idx !== null && (!av3dAtivo() || (AV3D.idx && typeof AV3D.idx === 'object'));
      const tresD = !m3dPedido || (window.M3D && M3D.info.calls > 0);
      calmo = indices && tresD && CARGA.size === 0 && performance.now() - t0 > 400 ? calmo + 1 : 0;
      if (calmo >= 3 || performance.now() - t0 > max) return res();
      setTimeout(ver, 120);
    };
    ver();
  });
}
function sair() {
  pararRadio();
  fecharTelemovel(); pararVida(); sairDoCanal(); if (chatCanal) sb.removeChannel(chatCanal); if (evCanal) sb.removeChannel(evCanal);
  chatCanal = evCanal = null; J = null; uid = null; cena = null; eu = null; outros.clear(); npcs = []; deco = null;
  $('#hud').classList.add('hide'); $('#entrada').classList.remove('hide'); $('#carregar').classList.add('hide');
  fecharSheets(); setModo('entrar'); montarEntrada(); animarPreview();
}
sb.auth.onAuthStateChange((ev, session) => {
  // 7 nov: o Realtime só recebia o login em SIGNED_IN/TOKEN_REFRESHED; ao reabrir o jogo com a sessão guardada ficava com a chave
  // pública → canais privados "Unauthorized" → canal de reserva pesado e sem avisos ao vivo. Passa sempre o login atual.
  if (session?.access_token && ev !== 'SIGNED_OUT') { try { sb.realtime.setAuth(session.access_token); } catch { } }
  if (ev === 'PASSWORD_RECOVERY') recuperando = true;
  if (session && recuperando) {
    // Veio do link "esqueci-me da senha": primeiro escolhe a senha nova, só depois entra.
    setTimeout(() => {
      $('#carregar').classList.add('hide'); $('#hud').classList.add('hide'); $('#entrada').classList.remove('hide');
      setModo('senha', '🔐 Escolhe uma senha nova para a tua conta.');
      $('#iSenha').value = ''; $('#iSenha').focus();
    }, 0);
    return;
  }
  // Com rede lenta a sessão pode chegar antes de todos os scripts do jogo descarregarem: espera por eles.
  if (session && !J && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) quandoPronto(() => entrarNoJogo(session));
  else if (!session && ev === 'SIGNED_OUT') sair();
});
// 0bp (1 nov, jogo mais leve): pede o estado só quando o jogador não chegou do servidor há 2 min (quem joga já o recebe em cada ação)
// 8 nov (0fe-1): o estado chega no pulso de minuto a minuto (era um pedido próprio de 30 em 30 s)
// 0br (dono, 1 nov): manutenção marcada pelo admin (mudar o tamanho da base reinicia-a uns minutos) → faixa no topo, nas 3 línguas
// 9 nov (10 mil jogadores): o que é igual para todos vem de /api/publico (guardado 30 s na Vercel), não da base.
// null = falhou → quem chamou pergunta à base como antes.
let _publico = null, _publicoEm = 0, _publicoP = null;
function publico() {
  if (_publico && Date.now() - _publicoEm < 30000) return Promise.resolve(_publico);
  if (_publicoP) return _publicoP;
  _publicoP = fetch('/api/publico' + (window.VEL_SUPA ? '?teste=1' : ''))
    .then(r => r.ok ? r.json() : null, () => null).then(d => { _publicoP = null; if (d?.gerado) { _publico = d; _publicoEm = Date.now(); } return d?.gerado ? d : null; });
  return _publicoP;
}
async function verManutencao(dado) {
  let m = null;
  if (dado !== undefined) m = dado;
  else { const pm = pre('manut'); if (pm) m = pm.v; else { const pb = await publico(); if (pb && 'manut' in pb) m = pb.manut; else try { const { data } = await sb.rpc('aviso_manutencao'); m = data; } catch { } } }   // 9 nov: arranque() ou /api/publico
  let f = document.getElementById('faixaManut');
  if (!m) { f?.remove(); return; }
  const em = new Date(m.em), agora = Date.now(), fim = em.getTime() + m.minutos * 60000;
  if (em.getTime() - agora > 12 * 3600000 || fim < agora) { f?.remove(); return; }
  const hora = em.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const txt = em.getTime() <= agora
    ? tr('🔧 A aumentar a capacidade do jogo por causa do número de jogadores (cerca de {0} min). Obrigado por jogares! Se o jogo parar, volta a abrir daqui a pouco.').replace('{0}', m.minutos)
    : tr('🔧 Às {0} vamos aumentar a capacidade do jogo por causa do número de jogadores (cerca de {1} min). Obrigado por jogares Vida na Banda!').replace('{0}', hora).replace('{1}', m.minutos);
  if (!f) {
    f = document.createElement('div'); f.id = 'faixaManut'; f.setAttribute('role', 'status');
    f.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:60;padding:10px 14px;border:2px solid #141012;border-radius:12px;background:#ffcb00;color:#141012;font-weight:700;font-size:14px;text-align:center;box-shadow:3px 3px 0 #141012;cursor:pointer';
    f.title = tr('Toca para fechar'); f.onclick = () => f.remove();
    document.body.appendChild(f);
  }
  f.textContent = txt;
}
setTimeout(verManutencao, 3000);   // depois vem no pulso
document.addEventListener('visibilitychange', async () => { if (J && !document.hidden && Date.now() - _jogadorEm >= 30000) { const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador); } });

// dono: opcional — a casa do/a cônjuge, quando lá estás a decorar
const podeMexer = id => ehMeuLar(id) || (casal && id === casal.id) || (String(id).startsWith('imovel-') && !!cena?.propMinha);
// móveis postos numa casa (de qualquer dono: os teus, do/a cônjuge, do senhorio) — servidor: mobilia_lugar
async function mobiliaDaCena(f) {
  const { data, error } = await sb.rpc('mobilia_lugar', f.prop ? { p_prop: f.prop } : { p_dono: f.dono });
  if (error) { console.warn('mobilia_lugar', error.message); return []; }
  return data || [];
}
// é teu (ou do teu lar / cônjuge) e por isso podes mexer-lhe? (os móveis do senhorio só se usam)
const meuMovel = mb => mb && (mb.jogador_id === uid || mb.jogador_id === donoLar() || (casal && mb.jogador_id === casal.id));
async function carregarMinhaMobilia(dono) {
  const id = dono || (cena?.tipo === 'casa' && casal && cena.dono?.id === casal.id ? casal.id : null) || donoLar() || uid;
  const pm = id === uid ? pre('mobilia') : null;
  const { data } = pm ? { data: pm.v } : await sb.from('mobilia').select('*').eq('jogador_id', id).order('id');
  minhaMobilia = data || [];
}

/* ============================================================
   CENAS
   ============================================================ */
function novoPersonagem(id, nome, ap, x, y, extra = {}) {
  return { id, nome, ap, x: x + 0.5, y: y + 0.5, path: [], dir: 1, costas: false, fala: null, t: Math.random() * 10, ...extra };
}
function construirChao() {
  const casa = cena.tipo === 'casa' || cena.tipo === 'interior';
  definirRotacao(rotVista, cena.W, cena.H);
  const W = VR % 2 ? cena.H : cena.W, H = VR % 2 ? cena.W : cena.H, topo = casa ? 90 : 10;   // tamanho na vista
  const minX = -H * TW / 2 - 4, maxX = W * TW / 2 + 4, minY = -topo, maxY = (W + H) * TH / 2 + 4;
  const S = casa ? 2.5 : 1.25;
  const c = document.createElement('canvas'); c.width = Math.ceil((maxX - minX) * S); c.height = Math.ceil((maxY - minY) * S);
  const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, -minX * S, -minY * S);
  if (casa) desenhaChaoCasa(g, cena); else desenhaChaoBairro(g, cena);
  chaoImg = c; chaoBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
async function irParaBairro(id, comViagem, emPorta) {
  sairDoCanal();
  if (deco) sairDeco();
  cena = gerarBairro(id);
  construirChao();
  const [sx, sy] = emPorta || cena.spawn;
  eu = novoPersonagem(uid, J.nome, minhaAparencia(), sx, sy, { eu: true });
  outros.clear();
  criarNpcs();
  if (cam.z < 1.1 || !irParaBairro._ja) { cam.z = zoomBairro(); irParaBairro._ja = true; }
  centrarCamera(true);
  // 8 nov (0ez): salas — na entrada a sala já vem no arranque() (regra 3 do Dev); só as viagens pedem outra
  {
    const ps = id === J?.bairro ? pre('sala') : null;
    if (ps?.v && typeof salaAtual !== 'undefined') { salaAtiva = !!ps.v.ativo; salaAtual = ps.v.sala || 1; }
    else if (typeof escolherSala === 'function') await escolherSala();
  }
  entrarNoCanal(typeof salaCanal === 'function' ? salaCanal(id) : 'b-' + id);
  if (typeof ligarFofocas === 'function' && J?.bairro && fofBairro !== J.bairro) ligarFofocas();   // 6 nov: fofocas só do teu bairro
  registarVisita(id);
  await ligarChat(id);
  hud();
}
// 0bo (dono, 1 nov): à casa de outra pessoa só se entra se ela lá estiver. Quem já está dentro pode ficar quando ela sai;
// ao sair, só volta a entrar quando ela voltar. Vê-se pela presença em tempo real na casa dela (sem aparecer lá).
function espreitarCanal(topico, ids) {
  return new Promise(res => {
    let feito = false;
    const ch = rtCanal(topico, { config: { presence: { key: 'espreita-' + uid } } });   // 9 nov: servidor de tempo real próprio (js/tempo_real.js)
    const fim = v => { if (feito) return; feito = true; try { rtRemover(ch); } catch { } res(v); };
    ch.on('presence', { event: 'sync' }, () => { if (Object.keys(ch.presenceState() || {}).some(k => ids.includes(k))) fim(true); });
    ch.subscribe(st => { if (st === 'SUBSCRIBED') setTimeout(() => fim(Object.keys(ch.presenceState() || {}).some(k => ids.includes(k))), 1500); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') fim(null); });
    setTimeout(() => fim(null), 5000);
  });
}
// 1 nov 22:05 (Cinnss não entrava com o amigo lá): conta quem mora na casa (dono + quem tem lá o lar, p. ex. o cônjuge)
// e os dois andares (o 1.º andar é outro canal). Se não der para ver (rede), deixa entrar em vez de bloquear.
async function donoEmCasa(id) {
  const ids = [String(id)];
  try { const { data } = await sb.from('jogadores').select('id').eq('lar', id).limit(8); (data || []).forEach(x => ids.push(String(x.id))); } catch { }
  const r = await Promise.all([espreitarCanal('c-' + id, ids), espreitarCanal('c-' + id + '-1', ids)]);
  if (r.includes(true)) return true;
  return r.every(v => v === null) ? null : false;
}
async function irParaCasa(dono, op = {}) {
  // dono: {id, nome, casa, parede, chao} · op.vazia: casa tua onde não moras (sem móveis, não se decora)
  const casa = casaDe(dono.casa); if (!casa) return;
  if (!op.prop && !op.convite && !ehMeuLar(dono.id) && dono.id !== casal?.id) {
    // dono 4 nov: se te puseram fora desta casa, só voltas daqui a 30 minutos
    const { data: fora } = await sb.from('casa_expulsoes').select('ate').eq('dono', dono.id).eq('visitante', uid).gt('ate', new Date().toISOString()).maybeSingle();
    if (fora) return toast(tr('{0} pôs-te fora de casa. Podes voltar às {1}.').replace('{0}', dono.nome).replace('{1}', new Date(fora.ate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 'mau');
    const la = await donoEmCasa(dono.id);
    if (la === false) {
      // FILA 0dn-5: com as portas abertas entra-se mesmo sem o dono lá
      const { data: pa } = await sb.from('jogadores').select('casa_aberta').eq('id', dono.id).maybeSingle();
      if (!pa?.casa_aberta) return toast(tr('{0} não está em casa. Só podes entrar quando estiver lá.').replace('{0}', dono.nome), 'info');
    }

  }
  // dono: {id, nome, casa, parede, chao} · op.prop: casa tua onde não moras (id do imóvel)
  const fonte = op.prop ? { prop: op.prop } : { dono: dono.id };
  if (op.prop || ehMeuLar(dono.id) || dono.id === casal?.id) await carregarMinhaMobilia(dono.id === casal?.id ? casal.id : donoLar() || uid);
  const mob = await mobiliaDaCena(fonte);
  sairDoCanal();
  cena = gerarCasa(casa, mob, D.moveis, dono); cena._mob = mob; cena.fonte = fonte; cena.prop = op.prop || null; cena.propMinha = !!op.prop;
  cena.voltar = { bairro: J.bairro, porta: portaDaCasa(dono.casa) };
  construirChao();
  let ent = [cena.spawn[0], cena.spawn[1] + 1];
  if (cena.bloq[ent[1] * cena.W + ent[0]]) ent = livreProximo(cena.bloq, cena.W, cena.H, ent[0], ent[1]) || cena.spawn;
  eu = novoPersonagem(uid, J.nome, minhaAparencia(), ent[0], ent[1], { eu: true });
  outros.clear(); npcs = [];
  cam.z = zoomCasa();
  centrarCamera(true);
  entrarNoCanal(op.prop ? 'cp-' + op.prop : 'c-' + dono.id);   // 0dc-4: as outras casas que tens não partilham o canal com a casa onde moras
  hud();
  if (op.prop) return;  // casa tua onde não moras: sem filhos/festas
  filhosNaCasa(dono.id);
  if (!ehMeuLar(dono.id)) toast(`Estás em casa de ${dono.nome}. 🏠`);
  else if (minhaMobilia.some(m => m.x == null)) { toast('Tens móveis no armazém! Carrega em 🔨 Decorar para os pôr na casa.', 'bom', 5000); const bd = $('#bDeco'); bd.classList.add('on'); setTimeout(() => bd.classList.remove('on'), 6000); }
}
function portaDaCasa(casaId) {
  const g = gerarBairro(J.bairro);
  const o = g.objetos.find(o => o.spec?.acao?.some(a => a.t === 'casa' && a.id === casaId));
  return o ? o.porta : g.spawn;
}
function recarregarCasa() {
  if (!cena || cena.tipo !== 'casa') return;
  const pos = [eu.x, eu.y], dono = cena.dono, voltar = cena.voltar, mob = cena._mob, fonte = cena.fonte, prop = cena.prop, propMinha = cena.propMinha;
  cena = gerarCasa(cena.casa, mob, D.moveis, dono, cena.andar || 0); Object.assign(cena, { voltar, _mob: mob, fonte, prop, propMinha });
  construirChao(); eu.x = pos[0]; eu.y = pos[1];
  if (cena.bloq[Math.floor(eu.y) * cena.W + Math.floor(eu.x)]) { const l = livreProximo(cena.bloq, cena.W, cena.H, Math.floor(eu.x), Math.floor(eu.y)); if (l) { eu.x = l[0] + 0.5; eu.y = l[1] + 0.5; } }
}
// subir ou descer a escada: outro ecrã, a mesma casa
function mudarAndar(n) {
  const dono = cena.dono, voltar = cena.voltar, mob = cena._mob, casa = cena.casa, fonte = cena.fonte, prop = cena.prop, propMinha = cena.propMinha;
  sairDoCanal(); if (deco) sairDeco();
  cena = gerarCasa(casa, mob, D.moveis, dono, n); Object.assign(cena, { voltar, _mob: mob, fonte, prop, propMinha });
  construirChao();
  const [ex, ey] = casa.planta.escada;
  const l = livreProximo(cena.bloq, cena.W, cena.H, Math.max(0, ex - 1), ey) || [Math.max(0, ex - 1), ey];
  eu = novoPersonagem(uid, J.nome, minhaAparencia(), l[0], l[1], { eu: true });
  outros.clear(); centrarCamera(true);
  entrarNoCanal((prop ? 'cp-' + prop : 'c-' + dono.id) + (n ? '-' + n : ''));
  if (typeof filhosNoAndar === 'function') filhosNoAndar();   // 0cy (1): os filhos não te seguem pelas escadas — cada um está no seu andar
  if (ehMeuLar(dono.id)) empregadosNaCasa(dono.id, Math.random);
  hud(); toast(n ? '⬆️ Subiste ao 1.º andar.' : '⬇️ Desceste ao rés-do-chão.');
}
function sairDeCasa() {
  const v = cena.voltar;
  cam.z = zoomBairro();
  irParaBairro(v.bairro, false, v.porta);
}

/* ---------- NPCs ---------- */
const FALAS_NPC = ['Bom dia, mano!', 'Tá-se bem?', 'Epá, este calor…', 'A gasolina subiu outra vez!', 'Vais ao jogo do Petro?', 'Kumbu não cai do céu, né?', 'Olha a zungueira!', 'Bué de trânsito hoje.', 'Já comeste?', 'Fixe! 👍', 'A luz foi ontem a noite toda…', 'Mambo é esse?'];
function criarNpcs() {
  npcs = [];
  if (cena.tipo !== 'bairro') return;
  const r = rng(Date.now() & 0xffff);
  for (let i = 0; i < 7; i++) {
    let x, y, k = 0;
    do { x = Math.floor(r() * cena.W); y = Math.floor(r() * cena.H); k++; } while ((cena.bloq[y * cena.W + x] || ![CH.passeio, CH.asfalto, CH.praca, CH.areia, CH.terraEstrada].includes(cena.chao[y * cena.W + x])) && k < 200);
    npcs.push(novoPersonagem('npc' + i, null, aparenciaAleatoria(r), x, y, { npc: true, espera: r() * 4 }));
  }
}
// motorista lá fora: anda pelas duas faixas da entrada (junto à casa e junto à rua) e só atravessa entre carros
function rotaFora(n, p) {
  if (!n.faixas) return [p];
  const cx = n.x - 0.5, cy = n.y - 0.5, [fa, fb] = n.faixas, perto = (a, b) => Math.abs(a - b) < 0.3;
  if (perto(cx, p[0])) return [p];
  const yc = n.cruzes.reduce((m, y) => Math.abs(y - (cy + p[1]) / 2) < Math.abs(m - (cy + p[1]) / 2) ? y : m, n.cruzes[0]);
  const lado = perto(cx, fa) || perto(cx, fb) ? cx : (Math.abs(cx - fa) < Math.abs(cx - fb) ? fa : fb);
  return [[lado, yc], [p[0], yc], p];
}
function moverNpc(n, dt) {
  if (n.path.length) return;
  n.espera -= dt; if (n.espera > 0) return;
  n.espera = 2 + Math.random() * 6;
  // empregados: motorista lá fora (linha reta na entrada da garagem); cozinheiro/segurança só na sua zona
  if (n.fora) { const p = n.fora[Math.floor(Math.random() * n.fora.length)]; n.path = rotaFora(n, p); n.vel = 1.4; return; }
  if (n.zona) {
    for (let k = 0; k < 8; k++) {
      const [tx, ty] = n.zona[Math.floor(Math.random() * n.zona.length)];
      if (cena.bloq[ty * cena.W + tx]) continue;
      const p = caminho(cena.bloq, cena.W, cena.H, Math.floor(n.x), Math.floor(n.y), tx, ty);
      if (p && p.length > 1 && p.every(([x, y]) => n.zona.some(z => z[0] === x && z[1] === y))) { n.path = p.slice(1); n.vel = 1.4; return; }
    }
    return;
  }
  for (let k = 0; k < 10; k++) {
    const tx = Math.floor(n.x + (Math.random() - 0.5) * 14), ty = Math.floor(n.y + (Math.random() - 0.5) * 14);
    if (tx < 0 || ty < 0 || tx >= cena.W || ty >= cena.H) continue;
    if (cena.bloq[ty * cena.W + tx]) continue;
    const p = caminho(cena.bloq, cena.W, cena.H, Math.floor(n.x), Math.floor(n.y), tx, ty);
    if (p && p.length > 1) { n.path = p.slice(1); n.vel = 1.6 + Math.random() * 0.8; return; }
  }
}

/* ============================================================
   MOVIMENTO
   ============================================================ */
// pose num móvel (#37): a personagem vai para o meio do móvel (cama/sofá) e volta ao sítio onde estava quando acaba
function comecarPose(p, tipo, o, ms) {
  // camas: a cabeceira fica do lado de y pequeno, por isso o corpo vai ao longo de y (mesmo nas camas quadradas)
  const long = o.mv?.tipo === 'cama' ? o.d < o.w : o.w >= o.d, [a0, b0] = iso(0, 0), [a1, b1] = long ? iso(1, 0) : iso(0, 1);
  const naDiagonal = (a1 - a0) * (b1 - b0) > 0;                                     // eixo comprido a descer para a direita
  p.pose = {
    tipo, ate: performance.now() + ms, volta: [p.x, p.y], dir: naDiagonal ? 1 : -1, caixa: tipo === 'trabalhar' ? null : [o.x, o.y, o.x + o.w, o.y + o.d],
    rot: tipo === 'sentado' && o.mb ? (o.mb.rot || 0) : null
  };   // 0cy (4): sentado fica virado para a frente do assento (no 3D)
  if (tipo !== 'trabalhar') { p.x = o.x + o.w / 2; p.y = o.y + o.d / 2; }
}
function acabarPose(p) { if (!p.pose) return; if (p.pose.caixa) { p.x = p.pose.volta[0]; p.y = p.pose.volta[1]; } p.pose = null; }
function andarPara(p, tx, ty, aoChegar) {
  if (p.pose) acabarPose(p);
  const sx = Math.floor(p.x), sy = Math.floor(p.y);
  if (sx === tx && sy === ty) { p.path = []; aoChegar && aoChegar(); return true; }
  const c = caminho(cena.bloq, cena.W, cena.H, sx, sy, tx, ty);
  if (!c) return false;
  p.path = c.slice(1); p.aoChegar = aoChegar;
  if (p.eu) { cam.seguir = true; anunciarMovimento(); }
  return true;
}
function atualizarPersonagem(p, dt) {
  p.t += dt;
  if (!p.path.length) { p.andando = false; return; }
  const [tx, ty] = p.path[0], gx = tx + 0.5, gy = ty + 0.5;
  const dx = gx - p.x, dy = gy - p.y, dist = Math.hypot(dx, dy);
  const v = (p.vel || 3.3) * dt;
  // direção no ecrã (conta com a rotação da vista): 8 direções para as personagens 3D; dir/costas para o desenho antigo
  const [a0, b0] = iso(p.x, p.y), [a1, b1] = iso(p.x + dx, p.y + dy), ex = a1 - a0, ey = b1 - b0;
  if (Math.abs(ex) > 0.01) p.dir = ex > 0 ? 1 : -1;
  p.costas = ey < -0.01;
  if (Math.hypot(ex, ey) > 0.01) p.d8 = direcao8(ex, ey);
  p.andando = true;
  if (dist <= v) {
    p.x = gx; p.y = gy; p.path.shift();
    if (!p.path.length) { p.andando = false; const f = p.aoChegar; p.aoChegar = null; if (p.eu) presencaAgora(); f && f(); }
  } else { p.x += dx / dist * v; p.y += dy / dist * v; }
}

/* ============================================================
   MULTIJOGADOR (tempo real)
   ============================================================ */
function estadoPresenca() { return { n: J.nome, a: minhaAparencia(), i: idadeDe(J), x: Math.floor(eu.x), y: Math.floor(eu.y), v: J.vip_ate && new Date(J.vip_ate) > new Date() ? 1 : 0, ...(typeof vozLigada !== 'undefined' && vozLigada ? { vz: 1 } : {}) }; }   // vz: voz ligada (9 nov, salas privadas)
// 6 nov (dono: «they feel like there is a diff server… with 300 people on the app they can't see anyone»): os registos do Realtime
// mostravam 87 mil «Too many connected users» e 1.655 «presence rate limit» em 6 h — o plano Pro com limite de gastos aceita 500 ligações
// e 50 atualizações de presença por segundo. No jogo: (1) presença enviada com muito menos frequência, (2) se a ligação cair ou for
// recusada, tenta outra vez sozinho (com espera crescente) em vez de ficar num bairro vazio para sempre.
let canalTentativas = 0, canalReligar = 0, canalNome = null;
function entrarNoCanal(nome) {
  clearTimeout(canalReligar); canalNome = nome;
  canal = rtCanal(nome, { config: { presence: { key: uid }, broadcast: { self: false } } });   // 9 nov: servidor de tempo real próprio (js/tempo_real.js)
  const meu = canal;   // (só religa se este canal ainda for o atual — um CLOSED atrasado de um canal antigo não conta)
  if (!canal._rt && chatPeloRt && chatBairro) { chatPeloRt = false; setTimeout(() => ligarChat(chatBairro), 0); }   // 9 nov: o servidor próprio falhou → chat volta à Supabase
  canal.on('presence', { event: 'sync' }, sincronizarPresenca)
    .on('broadcast', { event: 'anda' }, ({ payload }) => {
      const o = outros.get(payload.id); if (!o) return;
      if (Math.hypot(o.x - payload.de[0] - 0.5, o.y - payload.de[1] - 0.5) > 2) { o.x = payload.de[0] + 0.5; o.y = payload.de[1] + 0.5; }
      o.path = payload.path;
    })
    .on('broadcast', { event: 'fala' }, ({ payload }) => { if (bloqueados.has(payload.id)) return; const o = outros.get(payload.id); if (o) mostrarFala(o, filtrarTexto(payload.texto), payload.nome); })
    .on('broadcast', { event: 'boleia' }, ({ payload }) => { if (Array.isArray(payload?.para) && payload.para.includes(uid) && !bloqueados.has(payload.de)) verificarBoleias(); })
    .on('broadcast', { event: 'porFora' }, async ({ payload }) => {   // aviso rápido; quem decide é o servidor (casa_expulsoes)
      if (payload?.id !== uid || cena?.tipo !== 'casa' || !cena.dono || ehMeuLar(cena.dono.id)) return;
      const { data } = await sb.from('casa_expulsoes').select('ate').eq('dono', cena.dono.id).eq('visitante', uid).gt('ate', new Date().toISOString()).maybeSingle();
      if (data && cena?.tipo === 'casa') { toast(tr('Puseram-te fora de casa.'), 'mau', 5000); sairDeCasa(); }
    })
    .on('broadcast', { event: 'nova' }, ({ payload }) => { if (chatAoMsg) chatAoMsg({ new: payload }); })   // 9 nov: chat da rua (tempo real próprio)
    .on('broadcast', { event: 'voz' }, ({ payload }) => { if (typeof vozReceber === 'function') vozReceber(payload); })   // 9 nov: voz nas salas privadas (só o sinal)
    .on('broadcast', { event: 'gesto' }, ({ payload }) => { if (bloqueados.has(payload.id)) return; const o = outros.get(payload.id); if (o) o.fala = { txt: payload.txt, ate: performance.now() + 3500 }; })
    .on('broadcast', { event: 'mobilia' }, async ({ payload }) => {
      if (cena?.tipo === 'casa' && cena.dono.id === payload.dono) {
        cena._mob = await mobiliaDaCena(cena.fonte);
        if (podeMexer(payload.dono)) await carregarMinhaMobilia();
        if (payload.parede) { cena.dono.parede = payload.parede; cena.dono.chao = payload.chao; }
        recarregarCasa();
      }
    })
    .subscribe(async st => {
      if (st === 'SUBSCRIBED') { canalTentativas = 0; try { await canal.track(estadoPresenca()); ultimaPresenca = Date.now(); } catch { } return; }
      if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') && canal === meu) {
        const este = meu; const espera = Math.min(60000, 3000 * 2 ** canalTentativas++) * (0.75 + Math.random() * 0.5);   // espera crescente, com folga aleatória para não voltarem todos ao mesmo tempo
        clearTimeout(canalReligar);
        canalReligar = setTimeout(() => { if (canal !== este) return; try { rtRemover(este); } catch { } canal = null; outros.clear(); if (J) entrarNoCanal(nome); }, espera);
      }
    });
}
// 0k-B: alguém convidou-me para o carro/jato dele/a (o convite vem da base de dados — a mensagem em tempo real só avisa)
let aVerBoleias = false;
async function verificarBoleias() {
  if (aVerBoleias) return; aVerBoleias = true;
  try {
    const { data } = await sb.rpc('minhas_boleias');
    const b = (data || [])[0]; if (!b) return;
    const dest = bairro(b.destino)?.nome || b.destino;
    const sim = await perguntar(`${b.meio === 'privado' ? '🛩️' : '🚗'} ${b.dono} ${tr(b.meio === 'privado' ? 'convida-te para ir no jato dele/a até' : 'convida-te para ir no carro dele/a até')} ${dest}.`, tr('Vou!'), tr('Não, obrigado/a'));
    const r = await acao('boleia_responder', { p_id: b.id, p_aceitar: sim }, { silencio: !sim });
    if (sim && r) {
      fecharSheets();
      const fp = viagemPrimeiraPessoa(b.meio === 'privado' ? 'privado' : 'boleia', dest);
      await fp.promessa;
      await irParaBairro(b.destino, true); toast(r.msg, 'bom', 4500);
    }
  } finally { aVerBoleias = false; }
}
function sairDoCanal() { clearTimeout(canalReligar); canalTentativas = 0; if (canal) { try { canal.untrack(); } catch { } rtRemover(canal); canal = null; } outros.clear(); }
let ultimaPresenca = 0;
function presencaAgora(forcar) {   // 6 nov: no máximo 1 vez a cada 8 s (a posição ao andar já vai pelo broadcast «anda»)
  if (!canal || !J) return;
  if (!forcar && Date.now() - ultimaPresenca < 60000) return;   // 8 nov: 8 s → 60 s (quem já está na sala vê-te andar pelo «anda»; só quem chega usa esta posição)
  ultimaPresenca = Date.now(); canal.track(estadoPresenca()).catch(() => { });
}
// 6 nov (poupar mensagens do Realtime): toques seguidos ao andar → no máximo 1 mensagem por segundo; a última segue sempre (os outros veem o destino certo)
let movUltimo = 0, movPendente = 0;
function anunciarMovimento() {
  if (!canal || !eu) return;
  const falta = 1000 - (Date.now() - movUltimo);
  if (falta > 0) { clearTimeout(movPendente); movPendente = setTimeout(anunciarMovimento, falta); return; }
  movUltimo = Date.now();
  canal.send({ type: 'broadcast', event: 'anda', payload: { id: uid, de: [Math.floor(eu.x), Math.floor(eu.y)], path: eu.path } }).catch(() => { });
}
// 6 nov (dono: «we cannot ruin gameplay… be economical»): jogo escondido há 2 min (outra app, ecrã desligado) → larga a ligação ao
// Realtime (cada ligação conta para o limite e para a conta). Ao voltar, liga tudo outra vez e atualiza o estado — o jogador não nota.
let ocultoTimer = 0, desligadoOculto = false;
// 0fx: o nosso servidor voltou a responder depois de uma queda → larga os canais da Supabase e volta a ele (o jogador não nota)
function voltarAoServidorProprio() {
  if (!J || desligadoOculto) return;
  const nome = canalNome; sairDoCanal(); canalNome = nome;
  religarTempoReal();
}
async function religarTempoReal() {
  // 7 nov: ao voltar de 2+ min escondido o login pode ter expirado ou não estar no Realtime → pede a sessão atual (renova se preciso) primeiro
  // (no máximo 3 s: se a sessão demorar, religa na mesma como antes — o jogador nunca fica à espera)
  try {
    const r = await Promise.race([sb.auth.getSession(), new Promise(ok => setTimeout(() => ok(null), 3000))]);
    const t = r?.data?.session?.access_token; if (t) sb.realtime.setAuth(t);
  } catch { }
  // 9 nov: com o servidor próprio não se abre a ligação da Supabase à toa (os canais de reserva ligam-na sozinhos se precisarem)
  if (!(typeof rtUsar === 'function' && rtUsar())) { try { sb.realtime.connect(); } catch { } }
  if (!J) return;
  if (canalNome) entrarNoCanal(canalNome);
  if (chatBairro) ligarChat(chatBairro);
  ligarEventos();
  if (typeof ligarFofocas === 'function') ligarFofocas();
  if (typeof iniciarDMs === 'function') iniciarDMs();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(ocultoTimer);
    ocultoTimer = setTimeout(() => {
      if (!document.hidden || !J || desligadoOculto) return;
      desligadoOculto = true; const nome = canalNome;
      sairDoCanal(); canalNome = nome;
      if (typeof rtPessoalFechar === 'function') rtPessoalFechar();   // 9 nov: canal pessoal (notificações/DMs)
      try { sb.removeAllChannels(); } catch { }
      chatCanal = evCanal = null; if (typeof fofCanal !== 'undefined') fofCanal = null; if (typeof dmCanal !== 'undefined') dmCanal = null;
      try { sb.realtime.disconnect(); } catch { }
    }, 120000);
  } else {
    clearTimeout(ocultoTimer);
    if (desligadoOculto) { desligadoOculto = false; religarTempoReal(); }
  }
});
// 0cy (4): durante a cena do encontro vê-se o par sentado à mesa (uma cópia); a pessoa verdadeira fica escondida até acabar
let parOculto = { id: null, ate: 0 };
function sincronizarPresenca() {
  const st = canal.presenceState(); const vistos = new Set();
  for (const [k, metas] of Object.entries(st)) {
    if (k === uid || (k === parOculto.id && Date.now() < parOculto.ate)) continue;
    const m = metas[metas.length - 1]; vistos.add(k); VIPS.set(k, { ate: m.v ? Date.now() + 600000 : 0, visto: Date.now() }); if (typeof lembrarNome === 'function') lembrarNome(k, m.n);
    let o = outros.get(k);
    if (!o) { o = novoPersonagem(k, m.n, m.a, m.x, m.y, { idade: m.i }); outros.set(k, o); }
    else { o.ap = m.a; o.nome = m.n; o.idade = m.i; if (!o.path.length && (Math.floor(o.x) !== m.x || Math.floor(o.y) !== m.y)) { const p = caminho(cena.bloq, cena.W, cena.H, Math.floor(o.x), Math.floor(o.y), m.x, m.y); if (p) o.path = p.slice(1); else { o.x = m.x + 0.5; o.y = m.y + 0.5; } } }
    o.vz = !!m.vz;   // 9 nov: voz ligada (salas privadas)
  }
  for (const k of [...outros.keys()]) if (!vistos.has(k)) outros.delete(k);
  hud();
}
function mostrarFala(p, texto, nome) {
  p.fala = { txt: texto, ate: performance.now() + 15000 };
  if (nome) adicionarChatLog(nome, texto);
}
function adicionarChatLog(nome, texto) {
  chatMsgs.push({ nome, texto }); chatMsgs = chatMsgs.slice(-4);
  $('#chatLog').innerHTML = chatMsgs.map(m => `<div><b>${esc(m.nome)}:</b> ${esc(m.texto)}</div>`).join('');
  clearTimeout(adicionarChatLog._t); adicionarChatLog._t = setTimeout(() => { chatMsgs = []; $('#chatLog').innerHTML = ''; }, 30000);
}
let chatBairro = null;
let evPrivadoRecusado = false, chatPrivadoRecusado = false;   // 0fx
let chatAoMsg = null, chatPeloRt = false;   // 9 nov: com o tempo real próprio, o chat da rua chega pelo canal da sala (evento «nova»)
async function ligarChat(b) {
  chatBairro = b;
  if (chatCanal) { sb.removeChannel(chatCanal); chatCanal = null; }
  // 0bp passo C (2 nov): chat por Broadcast privado (o servidor envia a mensagem nova); se falhar, volta ao canal antigo (postgres_changes)
  const aoMsg = p => {
    if (cena?.tipo !== 'bairro') return;
    const m = p.new; if (!m || m.bairro !== b || bloqueados.has(m.jogador_id)) return;
    if (typeof salaAtual !== 'undefined' && (m.sala || 1) !== salaAtual) return;   // 8 nov (0ez): salas
    const quem = m.jogador_id === uid ? eu : outros.get(m.jogador_id);
    if (quem) quem.fala = { txt: m.texto, ate: performance.now() + 15000 };
    if (m.jogador_id === uid || (typeof amigos !== 'undefined' && amigos.has(m.jogador_id))) adicionarChatLog(m.nome, m.texto);   // no canto: só amigos
  };
  chatAoMsg = aoMsg;
  if (canal?._rt) { chatPeloRt = true; return; }   // 9 nov: sem ligação à Supabase para o chat
  chatPeloRt = false;
  if (chatPrivadoRecusado) { chatCanal = sb.channel('chat-' + b).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'bairro=eq.' + b }, aoMsg).subscribe(); return; }   // 0fx
  let reserva = false, ligou = false;
  let este = null;
  este = chatCanal = sb.channel(typeof salaChat === 'function' ? salaChat(b) : 'bairro:' + b, { config: { private: true } }) // 8 nov (0ez): salas
    .on('broadcast', { event: 'nova' }, ({ payload }) => aoMsg({ new: payload }))
    .subscribe(st => {   // 8 nov: depois de ligado, uma falha de rede é passageira (a biblioteca volta a ligar sozinha) — só vai para o canal de reserva se nunca chegou a ligar
      if (st === 'SUBSCRIBED') { ligou = true; return; }
      if (ligou || reserva || chatCanal !== este || (st !== 'CHANNEL_ERROR' && st !== 'TIMED_OUT')) return;
      reserva = true; chatPrivadoRecusado = true; sb.removeChannel(chatCanal);
      chatCanal = sb.channel('chat-' + b)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'bairro=eq.' + b }, aoMsg).subscribe();
    });
}
function ligarEventos() {
  // 0bp (1 nov): canal privado por Broadcast (o servidor envia a linha nova de `eventos`) — muito mais leve para a base que postgres_changes
  // Se o canal privado falhar, volta ao canal antigo (postgres_changes) — o jogador nunca fica sem avisos.
  const vistos = new Set(), meu = uid;
  const aoEvento = async p => {
    if (!p.new || p.new.jogador_id !== uid || vistos.has(p.new.id)) return;
    vistos.add(p.new.id);
    if (/^💍 .*Estão casados!/.test(p.new.texto || '') && typeof perguntarCasamentos === 'function') setTimeout(perguntarCasamentos, 1500);   // quem pediu também escolhe se conta a toda a gente
    eventos.unshift(p.new); eventos = eventos.slice(0, 20); atualizarPontoTel();
    if (telAberto && !telSub) telHome();
    if (p.new.texto.startsWith('🚦') && p.new.tipo === 'mau') sb.rpc('estado').then(({ data }) => data && setJogador(data.jogador));   // 8 nov (0ex): taxa de Talatona — a carteira atualiza
    if (p.new.texto.startsWith('💸')) { toast(p.new.texto, 'bom', 5000); const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador); }
    if (p.new.tipo === 'mau' || p.new.tipo === 'renda') toast(p.new.texto, p.new.tipo === 'mau' ? 'mau' : 'info', 5000);
    if (p.new.tipo === 'social') { toast(p.new.texto, 'bom', 6000); atualizarPedidos(); }
    if (p.new.tipo === 'dilema') carregarDilemas();
    if (p.new.tipo === 'objetivo') { toast(p.new.texto, 'ouro', 5000); carregarObjetivos(); }
    if (p.new.texto.startsWith('🚪') && cena?.tipo === 'casa' && cena.dono && !ehMeuLar(cena.dono.id) && cena.dono.id !== casal?.id) sairDeCasa();   // puseram-te fora de casa
    if (p.new.texto.startsWith('🌹') && typeof verEncontro === 'function') verEncontro();   // 0n: aceitaram o teu encontro → ir lá
    if (p.new.texto.startsWith('🏁') && p.new.texto.includes('aceitou o teu desafio') && typeof verDesafio === 'function') verDesafio();   // 0ck
    if (/^(🌹|🏠|🏦|⚖️|💍|💔|👶|🤰|🧸|🕊️|🎓|🏫)/u.test(p.new.texto)) { if (p.new.tipo !== 'social') toast(p.new.texto, p.new.tipo === 'mau' ? 'mau' : 'bom', 6000); await carregarCasal(); const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador); }
    if (p.new.tipo === 'mau' && /💔|🔇/.test(p.new.texto)) atualizarPedidos();
  };
  // 9 nov: pelo nosso servidor (canal pessoal); se falhar, o canal de reserva (postgres_changes) como antes
  const reservaEv = () => { if (uid !== meu) return; if (evCanal) { try { sb.removeChannel(evCanal); } catch { } } evCanal = sb.channel('ev-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos', filter: 'jogador_id=eq.' + uid }, aoEvento).subscribe(); };
  if (typeof rtPessoal === 'function' && rtPessoal('novo', ({ payload }) => aoEvento({ new: payload }), reservaEv)) { if (evCanal) { try { sb.removeChannel(evCanal); } catch { } evCanal = null; } return; }
  if (evPrivadoRecusado) return reservaEv();   // 0fx: canal privado já recusado nesta sessão — não insistir
  let reserva = false, ligou = false;
  evCanal = sb.channel('jogador:' + uid, { config: { private: true } })
    .on('broadcast', { event: 'novo' }, ({ payload }) => aoEvento({ new: payload }))
    .subscribe(st => {   // 8 nov: depois de ligado, uma falha de rede é passageira (a biblioteca volta a ligar sozinha) — só vai para o canal de reserva se nunca chegou a ligar
      if (st === 'SUBSCRIBED') { ligou = true; return; }
      if (ligou || reserva || uid !== meu || (st !== 'CHANNEL_ERROR' && st !== 'TIMED_OUT')) return;
      reserva = true; evPrivadoRecusado = true; if (evCanal) sb.removeChannel(evCanal);
      evCanal = sb.channel('ev-' + uid)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos', filter: 'jogador_id=eq.' + uid }, aoEvento).subscribe();
    });
}

$('#fChat').onsubmit = async e => {
  e.preventDefault(); const t = $('#iMsg').value.trim(); if (!t) return;
  $('#iMsg').value = '';
  if (cena.tipo === 'casa' || cena.tipo === 'interior') {
    if (J.mudo_ate && new Date(J.mudo_ate) > new Date()) { toast('Estás silenciado/a por agora.', 'mau'); $('#iMsg').value = t; return; }
    eu.fala = { txt: filtrarTexto(t), ate: performance.now() + 15000 }; adicionarChatLog(J.nome, filtrarTexto(t));
    canal?.send({ type: 'broadcast', event: 'fala', payload: { id: uid, nome: J.nome, texto: t } });
    return;
  }
  if (canal?._rt && canal.ok && typeof canal.chat === 'function') {   // 9 nov: pelo tempo real próprio
    const r = await canal.chat(t);
    if (r.ok) return;
    if (r.erro) { toast(limparErro(r.erro), 'mau'); $('#iMsg').value = t; return; }
  }
  const { error } = await sb.rpc('enviar_mensagem', { p_texto: t });
  if (error) { toast(limparErro(error.message), 'mau'); $('#iMsg').value = t; }
};
$('#bFalar').onclick = () => { $('#chatBox').classList.remove('hide'); $('#barraBaixo').classList.add('hide'); setTimeout(() => $('#iMsg').focus(), 50); };
$('#fecharChat').onclick = () => { $('#chatBox').classList.add('hide'); $('#barraBaixo').classList.remove('hide'); $('#iMsg').blur(); };

/* ============================================================
   DESENHO
   ============================================================ */
let ultimo = performance.now(), ordemDesenho = [];
function horaLuanda() { if (typeof window.__horaLuanda === 'number') return window.__horaLuanda; const d = new Date(); return (d.getUTCHours() + 1 + d.getUTCMinutes() / 60) % 24; }   // (os testes podem fixar a hora)
function escuridao() { const h = horaLuanda(); if (h >= 19.5 || h < 5.5) return 0.48; if (h >= 18) return (h - 18) / 1.5 * 0.48; if (h < 7) return (7 - h) / 1.5 * 0.48; return 0; }

function loop(now) {
  const ms = now - ultimo, dt = Math.min(0.05, ms / 1000); ultimo = now;
  // no telemóvel o ecrã do telemóvel do jogo tapa a cidade toda: não vale a pena desenhá-la
  const tapada = (telAberto && innerWidth < 760) || !!document.getElementById('viagemFP');   // durante uma viagem a cidade está tapada
  if (cena && eu) { atualizar(dt); if (!tapada) { desenhar(now / 1000); vigiarQualidade(now, ms); } }
  requestAnimationFrame(loop);
}
function atualizar(dt) {
  atualizarPersonagem(eu, dt);
  outros.forEach(o => atualizarPersonagem(o, dt));
  npcs.forEach(n => { moverNpc(n, dt); atualizarPersonagem(n, dt); });
  if (cam.seguir) { const [tx, ty] = alvoCamera(); cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 6); }
  floats.forEach(f => f.t += dt); floats = floats.filter(f => f.t < 1.8);
  // 8 nov (conta do Tempo Real: 119 M mensagens num dia): a presença fica ativa sem reenviar — cada reenvio ia para as ~65 pessoas da sala
}
function alvoCamera() {
  if (cena.tipo === 'casa' || cena.tipo === 'interior') { const [cx, cy] = iso(cena.W / 2, cena.H / 2); return [cx, cy - 30]; }
  const [tx, ty] = iso(eu.x, eu.y); return [tx, ty - 20];
}
function centrarCamera(ja) { const [tx, ty] = alvoCamera(); if (ja) { cam.x = tx; cam.y = ty; } cam.seguir = true; }
function paraEcra(wx, wy) { return [(wx - cam.x) * cam.z + CW / 2, (wy - cam.y) * cam.z + CH_ / 2]; }
function paraMundo(sx, sy) { return [(sx - CW / 2) / cam.z + cam.x, (sy - CH_ / 2) / cam.z + cam.y]; }
function paraTile(wx, wy) {
  const vx = wy / TH + wx / TW, vy = wy / TH - wx / TW;
  if (!VR) return [Math.floor(vx), Math.floor(vy)];
  const [x, y] = desrodarP(Math.floor(vx) + 0.5, Math.floor(vy) + 0.5); return [Math.floor(x), Math.floor(y)];
}
let rotVista = 0;
try { rotVista = +localStorage.getItem('vel_rot') || 0; } catch { }
// #21: rodar com transição suave — a vista atual gira e desvanece enquanto a nova entra a rodar (~0,5 s)
let _rodando = false;
function rodarVista() {
  if (_rodando) return;
  const animar = cena && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let foto = null;
  if (animar) {
    foto = document.createElement('canvas'); foto.width = cv.width; foto.height = cv.height; foto.className = 'rodarFoto';
    try { foto.getContext('2d').drawImage(cv, 0, 0); } catch { foto = null; }
  }
  rotVista = (rotVista + 1) % 4; try { localStorage.setItem('vel_rot', rotVista); } catch { }
  if (!cena) return; construirChao(); centrarCamera(true);
  if (!foto) return;
  _rodando = true;
  cv.parentNode.insertBefore(foto, cv.nextSibling);
  cv.classList.add('rodarEntra');
  requestAnimationFrame(() => requestAnimationFrame(() => { foto.classList.add('sai'); cv.classList.add('ja'); }));
  setTimeout(() => { foto.remove(); cv.classList.remove('rodarEntra', 'ja'); _rodando = false; }, 560);
}

/* ============================================================
   📣 OUTDOORS — publicidade no mundo do jogo
   ============================================================ */
let outdoors = new Map();            // slot -> [anúncios ativos] (rodam a cada 15 s)
const ROTACAO_MS = 15000;
const adDe = slot => {   // 0u: os outdoors da cidade também mostram os anúncios comprados na loja para «Outdoors da cidade»
  const l = [...(outdoors.get(slot) || []), ...(outdoors.get('lugar:cidade') || [])];
  return l.length ? l[Math.floor(Date.now() / ROTACAO_MS + (slot.charCodeAt(0) || 0)) % l.length] : null;
};
// 0u (dono, 30 out): loja de anúncios — cada produto da loja (anunciar/) corresponde a estes lugares do jogo (igual a loja_lugares.padroes)
const LOJA_LUGARES = [
  ['candongueiro', /^candongueiro:painel/], ['taxi', /^(taxi|boleia):encosto/], ['aviao', /:panfleto$/], ['barco', /^barco:boia/],
  ['comboio', /^comboio:/], ['autocarro', /^autocarro:painel/], ['kart', /^kart:/], ['cidade', /^cidade:/], ['outdoor', /:outdoor/],
];
const produtoDoLugar = lugar => (LOJA_LUGARES.find(([, re]) => re.test(lugar || '')) || [])[0] || null;
// um anúncio comprado para este lugar (roda entre as marcas), ou null
function anuncioPara(lugar) {
  const p = produtoDoLugar(lugar), l = p && outdoors.get('lugar:' + p);
  return l && l.length ? l[Math.floor(Date.now() / ROTACAO_MS + Math.random() * l.length) % l.length] : null;
}
window.anuncioPara = anuncioPara;
const imagensOutdoor = new Map();    // url -> Image
// 9 nov: outdoors e músicas vêm do catálogo do site (/api/catalogo, guardado na Vercel) — sem pedidos à base; se falhar, lê da base
async function catalogoSite(campo) {
  if (D[campo]) { const v = D[campo]; delete D[campo]; return v; }   // o do arranque, uma vez
  try { const r = await fetch('/api/catalogo'); const c = r.ok ? await r.json() : null; return c && Array.isArray(c[campo]) ? c[campo] : null; } catch { return null; }
}
async function carregarOutdoors() {
  const cs = await catalogoSite('outdoors');
  const { data, error } = cs ? { data: cs } : await sb.from('outdoors').select('id,slot,marca,imagem,texto,link,ativo_ate').order('ativo_ate');
  if (error) return;
  const m = new Map();
  for (const a of data || []) { if (!m.has(a.slot)) m.set(a.slot, []); m.get(a.slot).push(a); }
  outdoors = m;
  for (const a of [...m.values()].flat()) if (a.imagem && !imagensOutdoor.has(a.imagem)) {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async'; img.src = a.imagem; imagensOutdoor.set(a.imagem, img);
  }
}
setInterval(() => { if (J && !document.hidden) carregarOutdoors(); }, 10 * 60 * 1000);
// #41a métricas: que anúncios estão no ecrã (outdoors visíveis e viagens). Junta-se e envia de 15 em 15 s (o servidor conta 1 impressão por rotação).
const _adsVistos = new Set();
function vistoAnuncio(id) { if (id) _adsVistos.add(id); }
// outdoors da cidade que estão no ecrã agora (2D ou 3D)
function outdoorsNoEcra() {
  if (!cena || cena.tipo !== 'bairro') return [];
  // 0bz (2 nov): no 3D (o modo normal agora) a posição no ecrã vem da câmara 3D — antes usava sempre a conta do 2D e os outdoors da cidade ficavam com 0 s vistos
  const em3d = typeof m3dAtivo === 'function' && m3dAtivo() && !!window.M3D?.ecra;
  const W = em3d ? innerWidth : CW, H = em3d ? innerHeight : CH_;
  return cena.objetos.filter(o => {
    if (o.kind !== 'outdoor') return false;
    const [sx, sy, sz] = em3d ? M3D.ecra(o.x + 1, o.y + 0.5, 60) : paraEcra(...iso(o.x + 1, o.y + 0.5, 60));
    if (em3d && !(sz > -1 && sz < 1)) return false;   // atrás da câmara
    return sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40;
  });
}
setInterval(() => {
  if (!J || document.hidden) return;
  for (const o of outdoorsNoEcra()) { const a = adDe(o.slot); vistoAnuncio(a?.id); registarExposicao([{ id: a?.id || 0, lugar: `cidade:outdoor:${o.slot}`, seg: 5 }]); }
}, 5000);
// 0l (dono, 27 out): tempo à vista por lugar de anúncio (outdoors da cidade, encostos, boias, panfletos…), enviado de 20 em 20 s
const _expo = new Map();
function registarExposicao(lista) {
  for (const e of lista || []) {
    if (!e || !e.lugar || !(e.seg > 0)) continue;
    const k = e.lugar + '|' + (e.id || 0);
    _expo.set(k, Math.min(600, (_expo.get(k) || 0) + e.seg));
  }
}
function enviarExposicao() {
  if (!J || !_expo.size) return;
  const itens = [..._expo].slice(0, 20).map(([k, seg]) => { const [lugar, id] = k.split('|'); return { lugar, id: +id || 0, seg: Math.round(seg * 10) / 10 }; });
  itens.forEach(x => _expo.delete(x.lugar + '|' + x.id));
  return sb.rpc('registar_exposicao', { p_itens: itens }).then(() => { }, () => { });
}
// 8 nov (0fe-1): o tempo à vista vai no pulso
// 0y (dono, 30 out): que bairros e sítios os jogadores visitam mais (para crescer primeiro onde há gente). Só totais no Admin.
// 9 nov (10 mil jogadores): as visitas vão no pulso (era um pedido cada, ~25/s); a lista das já contadas fica no aparelho
// (30 min) para não contar outra vez cada vez que o jogo recarrega.
const _visitas = new Map(), _visitasFila = [];
try { for (const [k, t] of Object.entries(JSON.parse(localStorage.getItem('vel_visitas') || '{}'))) if (Date.now() - t < 30 * 60 * 1000) _visitas.set(k, t); } catch { }
function registarVisita(bairro, lugar = '') {
  if (!J || !bairro) return;
  const k = bairro + '|' + lugar, agora = Date.now();
  if (agora - (_visitas.get(k) || 0) < 30 * 60 * 1000) return;   // a mesma ida conta uma vez a cada 30 min
  _visitas.set(k, agora);
  try { localStorage.setItem('vel_visitas', JSON.stringify(Object.fromEntries([..._visitas].filter(([, t]) => agora - t < 30 * 60 * 1000)))); } catch { }
  if (_visitasFila.length < 10) _visitasFila.push({ v: bairro, l: lugar || '' });
}
// 8 nov (0fe-1): UM pedido de minuto a minuto em vez de ~6 (sessão, manutenção, anúncios, sala, SMS, dilema, estado)
let _pulsoSms = null, _pulsoDil = undefined, _pulsoEm = 0;
async function pulsar() {
  if (!J || document.hidden || _pulsoEm > Date.now() - 20000) return;
  _pulsoEm = Date.now();
  const expo = [..._expo].slice(0, 20).map(([k, seg]) => { const [lugar, id] = k.split('|'); return { lugar, id: +id || 0, seg: Math.round(seg * 10) / 10 }; });
  expo.forEach(x => _expo.delete(x.lugar + '|' + x.id));
  const vistas = [..._adsVistos].slice(0, 12); vistas.forEach(i => _adsVistos.delete(i));
  expo.push(..._visitasFila.splice(0, 10));   // 9 nov: visitas no pulso
  if (window.rtDiag?.length) expo.push(...window.rtDiag.splice(0, 2));   // 0fx: contar quem caiu para a Supabase
  if (typeof tempoParaPulso === 'function') expo.push(...tempoParaPulso());   // 0gp: tempo por zona (1 em cada 8 jogadores)
  const { data: p, error } = await sb.rpc('pulso', {
    p_expo: expo.length ? expo : null, p_vistas: vistas.length ? vistas : null,
    p_sala: typeof salaAtiva !== 'undefined' && salaAtiva && cena?.tipo === 'bairro', p_estado: Date.now() - _jogadorEm >= 100000
  });
  if (error || !p || !J) return;
  if (p.jogador) setJogador(p.jogador);
  verManutencao(p.manut ?? null);
  verSessao(p.sessao);
  const sms = JSON.stringify(p.sms || null);
  if (_pulsoSms !== null && sms !== _pulsoSms && typeof carregarSms === 'function') carregarSms();
  _pulsoSms = sms;
  if (_pulsoDil !== undefined && (p.dil ?? null) !== _pulsoDil && typeof carregarDilemas === 'function') carregarDilemas();
  _pulsoDil = p.dil ?? null;
  if (typeof vidaBoaPulso === 'function') vidaBoaPulso(p.vb ?? null);
  if (Array.isArray(p.fof) && typeof fofocasDoPulso === 'function') fofocasDoPulso(p.fof.slice().reverse());   // 9 nov: fofocas pelo pulso   // 9 nov: Pacote Vida Boa (o estado vem no pulso — sem pedido novo)
}
setInterval(pulsar, 60000);
// 8 nov (0fe-6): atualização automática. De 5 em 5 min compara /versao.json (do site, não da base) com a versão desta página;
// se houver nova, recarrega só quando o jogo estiver em segundo plano (nunca a meio de uma jogada), com um atraso ao acaso
// para não chegarem todos ao mesmo tempo.
const _minhaVersao = document.querySelector('meta[name="versao"]')?.content || '';
let _atualizarPendente = false;
function atualizarDepois() {
  if (_atualizarPendente) return; _atualizarPendente = true;
  const tentar = () => { if (document.hidden) location.reload(); };
  setTimeout(() => { tentar(); document.addEventListener('visibilitychange', tentar); }, Math.random() * 10 * 60000);
}
setInterval(() => {
  if (!_minhaVersao || _atualizarPendente) return;
  fetch('/versao.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => { if (v?.v && v.v !== _minhaVersao) atualizarDepois(); }).catch(() => { });
}, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(pulsar, 1500); });
function toqueAnuncio(id, tipo) { if (id) sb.rpc('registar_toque', { p_id: id, p_tipo: tipo }).then(() => { }, () => { }); }
const linkSeguro = u => /^https:\/\/[^"'<>\s]+$/.test(u || '') ? u : null;

function desenhaOutdoor(o, noite, ctx = cv.getContext('2d')) {
  const { x, y } = o;
  // dois postes e o painel virado para a rua (+y)
  caixa(ctx, x + 0.32, y + 0.52, 0.09, 0.09, 42, '#4a4a4a');
  caixa(ctx, x + 1.59, y + 0.52, 0.09, 0.09, 42, '#4a4a4a');
  caixa(ctx, x + 0.04, y + 0.38, 1.92, 0.12, 36, '#1d1d1d', 42);
  const yf = y + 0.5, x0 = x + 0.1, larg = 1.8, alto = 30, topo = 42 + 33;
  const [ox, oy] = iso(x0, yf, topo);
  const ux = TW / 2 * larg, uy = TH / 2 * larg;
  const ad = adDe(o.slot), img = ad?.imagem && imagensOutdoor.get(ad.imagem);
  ctx.save();
  if (img && img.complete && img.naturalWidth) {
    ctx.transform(ux / img.naturalWidth, uy / img.naturalWidth, 0, alto / img.naturalHeight, ox, oy);
    ctx.drawImage(img, 0, 0);
  } else {
    // painel desenhado: a marca (sem imagem) ou "Anuncia aqui"
    const VW = 360, VH = 140;
    ctx.transform(ux / VW, uy / VW, 0, alto / VH, ox, oy);
    ctx.fillStyle = ad ? '#f7ecdc' : '#ffcb00'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#1c1405'; ctx.textAlign = 'center';
    // escreve centrado, encolhendo a letra até caber no painel
    const cabe = (txt, peso, tam, yy) => {
      do { ctx.font = `${peso} ${tam}px Figtree, sans-serif`; tam -= 2; } while (ctx.measureText(txt).width > VW - 36 && tam > 10);
      ctx.fillText(txt, VW / 2, yy);
    };
    if (ad) {
      cabe(ad.marca, 800, 54, 78);   // a marca não se traduz
      if (ad.texto) cabe(ad.texto, 600, 24, 116);
    } else {
      cabe(tr('ANUNCIA AQUI'), 800, 50, 74);
      cabe(tr('A tua marca vista por toda a cidade'), 700, 22, 114);
    }
  }
  ctx.restore();
  // moldura e, à noite, os holofotes
  naFaceY(ctx, x0 - 0.02, yf + 0.001, larg + 0.04, 0, 0.03, topo - alto, topo, '#111');
  naFaceY(ctx, x0 - 0.02, yf + 0.001, larg + 0.04, larg + 0.01, larg + 0.04, topo - alto, topo, '#111');
  if (noite) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18;
    poly(ctx, [iso(x0, yf, topo + 6), iso(x0 + larg, yf, topo + 6), iso(x0 + larg, yf, topo - alto), iso(x0, yf, topo - alto)], '#fff2b0');
    ctx.restore();
  }
}

function outdoorHTML(slot) {
  const lista = [...(outdoors.get(slot) || []), ...(outdoors.get('lugar:cidade') || [])];
  // 0u: a loja de anúncios (escolher o lugar, enviar a imagem e pagar online)
  const pedir = `<a class="btn full ${lista.length ? 'ghost' : ''}" href="/anunciar/?lugar=cidade" target="_blank" rel="noopener">Quero anunciar aqui</a>`;
  if (!lista.length) return `<div class="adLivre"><div class="adLivreT">Este outdoor está livre</div>
    <p class="m">Queres a tua marca, o teu negócio ou a tua música num outdoor do Vida na Banda? Todos os jogadores que passam por ${esc(bairro(J.bairro)?.nome || 'aqui')} vão ver.</p>${pedir}</div>`;
  const cartao = ad => {
    const link = linkSeguro(ad.link);
    return `<div class="adCartao">${ad.imagem ? `<img class="adImg" src="${esc(ad.imagem)}" alt="${esc(ad.marca)}">` : ''}<div class="adMarca" data-sem-traducao>${esc(ad.marca)}</div>${ad.texto ? `<p class="m" data-sem-traducao>${esc(ad.texto)}</p>` : ''}
    ${link ? `<a class="btn full" href="${esc(link)}" target="_blank" rel="noopener sponsored" data-ad-link="${ad.id}">Saber mais</a>` : ''}<p class="adPub">Publicidade</p></div>`;
  };
  return `<p class="m">Outdoor digital: ${lista.length} anúncio${lista.length > 1 ? 's' : ''} a rodar, 15 segundos cada.</p>` + lista.map(cartao).join('<div style="height:10px"></div>') +
    `<div style="height:12px"></div>${pedir}`;
}

// ✈️ avião/helicóptero estacionado no chão (vista isométrica), apontado para +y
function desenhaAviaoChao(id, x, y, L, soChao = false) {
  const cor = { avioneta: '#e0313f', helicoptero: '#1d3c5e', jato_privado: '#f5f5f5', jato_luxo: '#d4af37' }[id] || '#eee';
  const P = (a, b, z = 0) => iso(x + a, y + b, z);
  const poly2 = (pts, c, z) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([a, b], k) => { const [px, py] = P(a, b, z); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fill(); };
  if (temModelo(id)) {
    // pista privada: asfalto com bordas brancas, linha amarela ao centro, luzes na ponta e manga de vento
    const Lp = Math.max(L, (MOD3D.idx[id].comp || 7.6) + 0.8);
    losango(ctx, x - 0.4, y - 0.4, 5.4, Lp + 0.8, '#3f4147');
    losango(ctx, x - 0.25, y - 0.25, 0.08, Lp + 0.5, '#e8e4d8', 0.02); losango(ctx, x + 4.77, y - 0.25, 0.08, Lp + 0.5, '#e8e4d8', 0.02);
    if (id === 'helicoptero') {
      // heliponto: círculo amarelo com H branco, debaixo do rotor
      const [cx, cy] = iso(x + 2.1, y + 3.75, 0.02);
      ctx.strokeStyle = '#ffcb00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 2.1 * TW / 2 * 1.41, 2.1 * TH / 2 * 1.41, 0, 0, 7); ctx.stroke();
      const H = [[0.55, -0.7, 0.25, 1.4], [-0.8, -0.7, 0.25, 1.4], [-0.55, -0.13, 1.1, 0.26]];
      for (const [a, b, w, d] of H) losango(ctx, x + 2.1 + a, y + 3.75 + b, w, d, '#f2efe6', 0.03);
    } else for (let k = 0; k < Lp; k += 1.1) losango(ctx, x + 2.07, y + k, 0.1, 0.55, '#ffcb00', 0.03);
    for (let k = 0; k < 5; k++) { const [px, py] = iso(x - 0.1 + k * 1.2, y + Lp + 0.2, 2); ctx.fillStyle = k % 2 ? '#7fd36b' : '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); }
    const [mx, my] = iso(x - 0.2, y + Lp + 0.15, 0), [tx, ty] = iso(x - 0.2, y + Lp + 0.15, 30);
    ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
    const sopro = Math.sin(performance.now() / 700) * 2;
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(tx, ty - 2.5); ctx.lineTo(tx + 11, ty + 1 + sopro); ctx.lineTo(tx + 11, ty + 3 + sopro); ctx.lineTo(tx, ty + 2.5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(tx + 3.5, ty - 1.8 + sopro * 0.3, 2.5, 4);
    if (soChao || desenhaModelo(ctx, id, x + 2.1, y + 0.5)) return;
  }
  losango(ctx, x - 0.3, y - 0.3, 5.2, L + 0.6, '#5d5f66');                       // placa de estacionamento
  for (let k = 0; k < L; k += 1.2) losango(ctx, x + 2.15, y + k, 0.12, 0.6, '#e9e1c8', 0.05);
  if (id === 'helicoptero') {
    poly2([[1, 2], [3.4, 2], [3.4, 4], [1, 4]], 'rgba(0,0,0,.25)', 0);
    caixa(ctx, x + 1.3, y + 2, 1.6, 1.8, 13, cor, 2, { topo: shade(cor, 0.15) });
    caixa(ctx, x + 1.9, y + 3.8, 0.4, 2.4, 4, cor, 9);
    caixa(ctx, x + 1.95, y + 6, 0.3, 0.3, 8, cor, 9);
    caixa(ctx, x + 1.2, y + 2.2, 0.15, 1.6, 2, '#333', 0); caixa(ctx, x + 2.9, y + 2.2, 0.15, 1.6, 2, '#333', 0);
    ctx.strokeStyle = 'rgba(30,30,30,.85)'; ctx.lineWidth = 2.2;
    for (const [a0, b0, a1, b1] of [[-0.6, 2.9, 4.8, 2.9], [2.1, 0.3, 2.1, 5.5]]) { const [p0x, p0y] = P(a0, b0, 17), [p1x, p1y] = P(a1, b1, 17); ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); ctx.stroke(); }
    return;
  }
  const curto = id === 'avioneta', comp = curto ? L * 0.7 : L, cx = 2.1, raio = curto ? 0.32 : 0.45, wz = curto ? 9 : 5;
  poly2([[cx - 2.2, comp * 0.45], [cx + 2.2, comp * 0.45], [cx + 0.6, comp * 0.7], [cx - 0.6, comp * 0.7]], 'rgba(0,0,0,.22)', 0);
  caixa(ctx, x + cx - raio, y + 0.6, raio * 2, comp - 1.2, raio * 14, cor, 3, { topo: shade(cor, 0.12) });   // fuselagem
  poly2([[cx - raio, comp - 0.6], [cx + raio, comp - 0.6], [cx, comp + 0.3]], shade(cor, -0.05), 3 + raio * 14);  // nariz
  poly2([[cx - raio, 0.6], [cx + raio, 0.6], [cx, 0.05]], shade(cor, -0.1), 3 + raio * 14);                        // cauda
  const asa = curto ? [[cx, comp * 0.5], [cx - 2.3, comp * 0.52], [cx - 2.3, comp * 0.62], [cx, comp * 0.64]] : [[cx, comp * 0.42], [cx - 2.3, comp * 0.3], [cx - 2.3, comp * 0.38], [cx, comp * 0.62]];
  poly2(asa, shade(cor, -0.12), wz); poly2(asa.map(([a, b]) => [2 * cx - a, b]), shade(cor, -0.12), wz);
  poly2([[cx - 0.9, 0.4], [cx + 0.9, 0.4], [cx + 0.3, 1.2], [cx - 0.3, 1.2]], shade(cor, -0.12), 3 + raio * 14);   // estabilizador
  caixa(ctx, x + cx - 0.05, y + 0.3, 0.1, 0.9, 10, shade(cor, -0.2), 3 + raio * 14);                              // leme
  if (!curto) { caixa(ctx, x + cx - raio - 0.35, y + 1.2, 0.3, 0.9, 5, '#8a959c', 4); caixa(ctx, x + cx + raio + 0.05, y + 1.2, 0.3, 0.9, 5, '#8a959c', 4); }
  ctx.fillStyle = '#2b3a46'; for (let k = 0; k < (curto ? 3 : 7); k++) { const [px, py] = P(cx + raio + 0.01, comp - 1.6 - k * 0.55, 3 + raio * 10); ctx.fillRect(px - 1.5, py - 2, 3, 2.5); }
  if (id === 'jato_luxo') caixa(ctx, x + cx - raio - 0.01, y + 0.9, raio * 2 + 0.02, comp - 1.8, 1.2, '#141012', 3 + raio * 7);
  if (curto) { const [px, py] = P(cx, comp + 0.3, 3 + raio * 14); ctx.fillStyle = '#333'; ctx.fillRect(px - 9, py - 1, 18, 2); }
}

// 🌳 o que se vê lá fora quando estás em casa: jardim, entrada e os teus carros (e o teu avião)
function desenhaExteriorCasa(t) {
  const W = cena.W, H = cena.H, M = 7, pistas = pistasLaFora(), extra = Math.max(0, pistas.length - 1) * PISTA_PASSO;
  losango(ctx, -M - extra, -M, W + 2 * M + extra, H + 2 * M, '#5b8a43');
  losango(ctx, W + 0.5, -0.5, 3, H + 1, '#bdb5a8');                            // garagem / entrada
  losango(ctx, W + 4, -M, 3.2, H + 2 * M, '#4b4c52');                         // rua ao lado
  for (let y = -M + 0.5; y < H + M; y += 1.6) losango(ctx, W + 5.5, y, 0.2, 0.8, '#e9e1c8', 0.1);
  losango(ctx, 0.5, H + 0.4, 2.2, M - 0.6, '#bdb5a8');                        // caminho até ao portão
  // canteiros e árvores (os mesmos desenhos da cidade)
  for (const [px, py] of [[-3, -3], [W - 1, -4], [-4, H - 2], [-2, H + 4], [W - 3, H + 4.5]]) losango(ctx, px - 0.4, py - 0.4, 1.8, 1.8, '#4f7a35');
  desenhaArvore(ctx, -3, -3, t); desenhaPalmeira(ctx, W - 1, -4, t); desenhaArvore(ctx, -4, H - 2, t, '#3f7f35');
  desenhaPalmeira(ctx, -2, H + 4, t); desenhaArvore(ctx, W - 3, H + 4.5, t, '#5a9a3e');
  if (!ehMeuLar(cena.dono?.id) || !D.itens) return;
  const meus = itensLar().map(id => D.itens.find(i => i.id === id)).filter(Boolean);
  // carros/aviões com modelo 3D entram na ordenação com as pessoas (foraParaOrdenar); aqui só o chão e os desenhos antigos
  meus.filter(i => i.categoria === 'veiculo').sort((a, z) => z.preco - a.preco).slice(0, 4).forEach((i, k) => {
    const neon = acabDe(i.id).neon; if (neon) try { brilhoNeon(ctx, neon, W + 1.5, 0.3 + k * 2.4, t); } catch { }
    if (!temModelo(i.id)) try { desenhaVeiculo(ctx, i.id, W + 1.5, 0.3 + k * 2.4); } catch { }
  });
  for (const p of pistas) desenhaAviaoChao(p.item.id, p.x, p.y, p.L, true);
}
// veículos lá fora (com modelo 3D) como caixas no mundo, para as pessoas passarem à frente/atrás deles corretamente
function foraParaOrdenar() {
  if (cena?.tipo !== 'casa' || cena.andar || !ehMeuLar(cena.dono?.id) || !D.itens) return [];
  const W = cena.W, H = cena.H, M = 7, out = [];
  const meus = itensLar().map(id => D.itens.find(i => i.id === id)).filter(Boolean);
  meus.filter(i => i.categoria === 'veiculo').sort((a, z) => z.preco - a.preco).slice(0, 4).forEach((i, k) => {
    if (!temModelo(i.id)) return;
    const y = 0.3 + k * 2.4;
    out.push({ x0: W + 1.6, y0: y + 0.05, x1: W + 2.4, y1: y + 1.95, h: 40, draw: () => desenhaModelo(ctx, idVisual(i.id), W + 1.5, y) || desenhaModelo(ctx, i.id, W + 1.5, y) });
  });
  for (const { item: av, x, y } of pistasLaFora()) if (temModelo(av.id)) out.push({ x0: x - 0.4, y0: y - 0.4, x1: x + 5, y1: y + (MOD3D.idx[av.id].comp || 7.6) + 0.8, h: 80, draw: () => desenhaModelo(ctx, av.id, x + 2.1, y + 0.5) });
  return out;

}

/* ---------- mundo 3D em tempo real (teste) — js/mundo3d.js ---------- */
// ligado para as contas de teste (admin/sem limites) ou com ?3d=1 no endereço; ?3d=0 desliga; ?3d=info mostra fps e chamadas
let m3dPedido = false, m3dInfo = false;
try {
  const q = new URLSearchParams(location.search).get('3d');
  if (q === '0' || q === '1') localStorage.setItem('vel_3d', q);
  if (q === 'info') { localStorage.setItem('vel_3d', '1'); localStorage.setItem('vel_3d_info', '1'); }
  m3dInfo = localStorage.getItem('vel_3d_info') === '1';
} catch { }
// 26 out (dono): o 3D é para todos. Quem escolheu no Perfil manda; se o aparelho for lento demais, volta sozinho ao desenho clássico.
function querer3D() {
  let v = null, auto = null; try { v = localStorage.getItem('vel_3d'); auto = localStorage.getItem('vel_3d_auto'); } catch { }
  if (v === '1') return true;
  if (v === '0') return false;
  return auto !== '0';
}
function temWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
let m3dFalhou = '';
function carregar3D() {
  m3dPedido = querer3D();
  if (m3dPedido && !temWebGL()) { m3dPedido = false; m3dFalhou = 'Este aparelho/navegador não tem os gráficos 3D (WebGL) ligados.'; }
  if (!m3dPedido || window.M3D || carregar3D._a) return;
  carregar3D._a = true;
  import('./mundo3d.js').catch(e => { console.warn('3D não carregou', e); m3dPedido = false; m3dFalhou = 'O mundo 3D não carregou neste aparelho.'; });
}
const m3dAtivo = () => m3dPedido && !!window.M3D && !!cena && (cena.tipo === 'bairro' || cena.tipo === 'casa' || cena.tipo === 'interior') && !!eu;
function desenhar3D(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, CW, CH_);
  cv.style.background = 'transparent';
  const mvSel = deco?.sel ? movelDe(deco.sel.movel) : null;
  const dc = deco ? { sel: mvSel ? { ...deco.sel, mv: mvSel, ok: posicaoValida(deco.sel) } : null } : null;
  try { M3D.quadro({ cena, eu, lista: [eu, ...npcs, ...outros.values()], cam, t, noite: escuridao(), tempo: cena.tipo === 'bairro' ? tempoAqui() : null, deco: dc }); }
  catch (e) {   // se o 3D falhar neste aparelho, volta ao desenho de sempre (o jogo nunca pode ficar parado)
    console.warn('3D falhou, a voltar ao 2.5D', e); m3dPedido = false; m3dFalhou = 'O mundo 3D falhou neste aparelho; voltou ao normal.';
    try { M3D.esconder(); } catch { } cv.style.background = ''; return;
  }
  if (cena.tipo === 'bairro') { desenhaTempo(t); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }   // 0g-C: a chuva do app Tempo vê-se também no 3D
  ordemDesenho = cena.objetos.map(o => ({ o }));
  if (marcaToque && performance.now() < marcaToque.ate) {   // o quadrado tocado, no chão
    const a = 1 - (marcaToque.ate - performance.now()) / 700, { x, y } = marcaToque;
    const pts = [[x + 0.1, y + 0.1], [x + 0.9, y + 0.1], [x + 0.9, y + 0.9], [x + 0.1, y + 0.9]].map(([a1, b1]) => M3D.ecra(a1, b1, 0));
    ctx.globalAlpha = 1 - a; ctx.strokeStyle = '#ffcb00'; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
  }
  sobreposicoes(t, (x, y, z = 0) => M3D.ecra(x, y, z));
  // dentro de casa: a etiqueta das escadas (↑ 1.º andar / ↓ rés-do-chão), como no desenho de sempre
  for (const o of cena.objetos) if (o.kind === 'escada') {
    const [lx, ly] = M3D.ecra(o.x + o.w / 2, o.y + o.d / 2, 56), sobe = o.andar === 0;
    ctx.font = '800 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(ctx, lx - 46, ly - 12, 92, 18, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText((sobe ? '↑ ' : '↓ ') + tr(sobe ? '1.º andar' : 'Rés-do-chão'), lx, ly + 2);
  }
  vigiar3D();
  if (m3dInfo) { const i = M3D.info; ctx.font = '700 12px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(8, CH_ - 150, 330, 22); ctx.fillStyle = '#7CFC00'; ctx.fillText(`3D ${i.fps} fps · ${i.calls} draws · ${Math.round(i.tris / 1000)}k tri · ${i.geo} geo · ${i.tex} tex${i.mb != null ? ` · ${i.mb} MB` : ''}`, 14, CH_ - 134); }
}
// vigia: se o 3D andar lento (menos de 18 imagens por segundo durante 5 s), primeiro fica mais leve (sem sombras, menos pixéis);
// se mesmo assim ficar abaixo de 10, volta ao desenho clássico neste aparelho (e avisa: pode-se ligar outra vez no Perfil)
const vigia = { t0: null, lentos: 0, nivel: 0, ult: 0, poup: false };
// LL40 · modo poupança: com a bateria fraca (≤ 20% e sem carregar) ou a rede lenta (2G / poupança de dados), gráficos mais leves
let poupanca = false;
function aplicarPoupanca(ligar, porque) {
  if (ligar === poupanca) return;
  poupanca = ligar; window.__poupanca = ligar;
  if (!ligar) { vigia.poup = false; if (window.M3D && vigia.nivel === 0 && M3D.normal) M3D.normal(); }   // (se o aparelho também for lento, fica leve)
  if (ligar) {   // o aviso só aparece com o jogo já no ecrã (não por baixo do ecrã de carregar)
    const avisar = () => {
      if (!poupanca) return; if (!document.getElementById('carregar')?.classList.contains('hide') || !J) return setTimeout(avisar, 1000);
      toast(tr(porque === 'bateria' ? '🔋 Bateria fraca: modo poupança ligado (gráficos mais leves até carregares).' : '📶 Rede lenta: modo poupança ligado (gráficos mais leves).'), 'info', 5000);
    };
    avisar();
  }
}
async function vigiarBateria() {
  const con = navigator.connection, rede = () => !!(con && (con.saveData || /(^|-)2g$/.test(con.effectiveType || '')));
  let bat = null; try { if (navigator.getBattery) bat = await navigator.getBattery(); } catch { }
  const ver = () => { const fraca = !!bat && !bat.charging && bat.level <= 0.2; aplicarPoupanca(fraca || rede(), fraca ? 'bateria' : 'rede'); };
  bat?.addEventListener('levelchange', ver); bat?.addEventListener('chargingchange', ver); con?.addEventListener?.('change', ver);
  ver();
}
setTimeout(vigiarBateria, 3000);
function vigiar3D() {
  const agora = performance.now();
  if (poupanca && !vigia.poup && M3D.leve) { M3D.leve(); vigia.poup = true; }
  if (document.hidden || viagemAtiva()) { vigia.t0 = null; vigia.lentos = 0; return; }
  if (vigia.t0 === null) vigia.t0 = agora;
  if (agora - vigia.t0 < 8000 || agora - vigia.ult < 1000) return;
  vigia.ult = agora;
  let forcado = false; try { forcado = localStorage.getItem('vel_3d') === '1'; } catch { }
  const f = M3D.info.fps;
  if (f && f < 18) vigia.lentos++; else vigia.lentos = 0;
  if (vigia.lentos < 5) return;
  vigia.lentos = 0; vigia.t0 = agora;
  if (vigia.nivel === 0 && M3D.leve) { M3D.leve(); vigia.nivel = 1; return; }
  if (f < 10 && !forcado) {
    m3dPedido = false; try { localStorage.setItem('vel_3d_auto', '0'); } catch { }
    M3D.esconder(); cv.style.background = '';
    toast(tr('Os gráficos 3D estavam lentos neste aparelho — voltámos ao desenho clássico. Podes ligar outra vez no Perfil.'));
  }
}
const viagemAtiva = () => !!document.getElementById('viagemFP') || !!document.getElementById('jetski');
function desenhar(t) {
  if (m3dAtivo()) return desenhar3D(t);
  if (window.M3D) { M3D.esconder(); cv.style.background = ''; }
  const noite = cena.tipo === 'bairro' ? escuridao() : escuridao() * 0.35;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cena.tipo === 'casa' || cena.tipo === 'interior' ? '#0e0b09' : (BAIRROS_MAPA[cena.id]?.praia ? '#2b84ad' : '#2a2018'); ctx.fillRect(0, 0, CW, CH_);
  ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (CW / 2 - cam.x * cam.z), dpr * (CH_ / 2 - cam.y * cam.z));
  ctx.imageSmoothingEnabled = true;
  if (cena.tipo === 'casa') desenhaExteriorCasa(t);
  ctx.drawImage(chaoImg, chaoBox.x, chaoBox.y, chaoBox.w, chaoBox.h);

  // vista
  const [vx0, vy0] = paraMundo(-80, -160), [vx1, vy1] = paraMundo(CW + 80, CH_ + 80);
  const itens = [];
  const add = (o, x0, y0, x1, y1, h, draw) => {
    if (VR) { const [a, b, w, d] = rectV(x0, y0, x1 - x0, y1 - y0); x0 = a; y0 = b; x1 = a + w; y1 = b + d; }
    const r = retanguloEcra(x0, y0, x1, y1, h);
    if (r.sx1 < vx0 || r.sx0 > vx1 || r.sy1 < vy0 || r.sy0 > vy1) return;
    itens.push({ o, x0, y0, x1, y1, ...r, draw });
  };
  const ehNoite = noite > 0.2 && !(cena.tipo === 'bairro' && semLuzAqui());
  for (const o of cena.objetos) {
    if (deco?.sel && o.mb && o.mb.id === deco.sel.mbId) continue;
    if (o.kind === 'movel' && o.pisavel) continue; // tapetes vão por baixo
    const ox = o.x + (o.ox || 0), oy = o.y + (o.ox || 0);
    add(o, ox, oy, ox + o.w, oy + o.d, o.h, () => desenhaObjeto(o, t, ehNoite));
  }
  for (const v of foraParaOrdenar()) add({ kind: 'fora' }, v.x0, v.y0, v.x1, v.y1, v.h, v.draw);
  // poses (#37, só com as personagens 3D): deitado/sentado num móvel por uns segundos; empregados a trabalhar quando param
  const agora = performance.now();
  for (const p of [eu, ...npcs]) if (p?.pose && (agora > p.pose.ate || p.path.length)) acabarPose(p);
  const av3d = av3dAtivo();
  const poseDe = p => p.pose ? p.pose.tipo : av3d && !p.andando && (p.empregado === 'empregada' || p.empregado === 'cozinheiro' || (p.empregado === 'motorista' && Math.sin(p.t * 0.3) > 0.2)) ? 'trabalhar' : null;
  const pessoa = p => {
    const c = p.pose?.caixa;
    add(p, c ? c[0] + 0.01 : p.x - 0.22, c ? c[1] + 0.01 : p.y - 0.22, c ? c[2] + 0.01 : p.x + 0.22, c ? c[3] + 0.01 : p.y + 0.22, 52, () => {
      const [sx, sy] = iso(p.x, p.y);
      desenhaPessoa(ctx, sx, sy, apVisivel(p.ap, p.eu ? idadeDe(J) : p.idade), p.t, p.andando, p.pose ? p.pose.dir : p.dir, p.pose ? false : p.costas, p.escala || 1, poseDe(p), p.pose ? null : p.d8);
    });
  };
  npcs.forEach(pessoa); outros.forEach(pessoa); pessoa(eu);

  // tapetes primeiro (no chão)
  for (const o of cena.objetos) if (o.kind === 'movel' && o.pisavel && !(deco?.sel && o.mb.id === deco.sel.mbId)) desenhaObjeto(o, t, ehNoite);
  if (marcaToque && performance.now() < marcaToque.ate) { const a = 1 - (marcaToque.ate - performance.now()) / 700; ctx.globalAlpha = 1 - a; losango(ctx, marcaToque.x + 0.15, marcaToque.y + 0.15, 0.7, 0.7, null, 0, '#ffcb00'); ctx.strokeStyle = '#ffcb00'; ctx.lineWidth = 2; poly(ctx, [iso(marcaToque.x + 0.1, marcaToque.y + 0.1), iso(marcaToque.x + 0.9, marcaToque.y + 0.1), iso(marcaToque.x + 0.9, marcaToque.y + 0.9), iso(marcaToque.x + 0.1, marcaToque.y + 0.9)], null, '#ffcb00'); ctx.globalAlpha = 1; }
  if (deco) desenhaGrelhaDeco();

  ordemDesenho = ordenar(itens);
  for (const it of ordemDesenho) it.draw();
  if (deco?.sel) desenhaFantasma(t);

  // noite
  if (noite > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(12,18,48,${noite})`; ctx.fillRect(0, 0, CW, CH_);
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (CW / 2 - cam.x * cam.z), dpr * (CH_ / 2 - cam.y * cam.z));
    if (ehNoite && cena.tipo === 'bairro') { ctx.globalCompositeOperation = 'lighter'; for (const it of ordemDesenho) if (it.o.kind === 'candeeiro') { const [bx, by] = iso(it.o.x + 0.5, it.o.y + 0.5); const g = ctx.createRadialGradient(bx + 8, by - 30, 2, bx + 8, by - 10, 60); g.addColorStop(0, `rgba(255,200,110,${noite * 0.5})`); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx + 8, by - 6, 60, 32, 0, 0, 7); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }
  }
  if (cena.tipo === 'bairro') desenhaTempo(t);
  if (cena.tipo === 'interior' && cena.cat === 'discoteca') {   // luzes da discoteca
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ['#7a1fd0', '#cc092f', '#16a3a3', '#f5b81c'].forEach((c, k) => {
      const a = t / 900 + k * 1.57, [bx, by] = iso(cena.W / 2 + Math.cos(a) * 2.5, cena.H / 2 + Math.sin(a) * 2.5);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 70); g.addColorStop(0, c + '66'); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 70, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  // sobreposições no ecrã
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sobreposicoes(t, (x, y, z = 0) => paraEcra(...iso(x, y, z)));
}
// nomes, balões, etiquetas dos edifícios e números a flutuar: iguais no 2.5D e no 3D (só muda a projeção)
function sobreposicoes(t, ecraDe) {
  for (const it of ordemDesenho) {
    const o = it.o;
    if (o.spec && (o.kind === 'edificio' || o.kind === 'paragem' || o.kind === 'barraca')) {
      const [sx, sy] = ecraDe(o.x + o.w / 2, o.y + o.d / 2, o.h + 14);
      etiqueta(sx, sy, cam.z >= 0.75 ? o.spec.nome : '', o.spec.acao?.some(a => a.t === 'casa' && a.id === meuLar()?.casa), icDoEmoji(o.spec.emoji || '') || 'ponto');
    }
    // lá dentro: um marcador a saltitar por cima de cada estação (onde se faz alguma coisa)
    if (cena.tipo === 'interior' && o.estacao && cena.objetos.find(x => x.rotulo === o.rotulo) === o) {
      const [sx, sy] = ecraDe(o.x + o.w / 2, o.y + o.d / 2, (o.h || 24) + 18 + Math.sin(t / 300 + o.x) * 3);
      etiqueta(sx, sy, cam.z >= 0.9 ? tr(o.rotulo || '').split(' — ')[1] || '' : '', false, ESTACAO_IC[o.estacao[0]] || 'ponto');
    }
  }
  if (cena.tipo === 'casa' && !cena.andar && ehMeuLar(cena.dono?.id) && cam.z >= 0.6) {
    const v = veiculosLaFora();
    if (v.carros.length) { const [sx, sy] = ecraDe(cena.W + 2, 1.3, 46 + Math.sin(t / 300) * 3); etiqueta(sx, sy, tr('Viajar'), true, icDoEmoji('🚗') || 'ponto'); }
    if (v.aviao) { const [sx, sy] = ecraDe(-4.5, 2, 70 + Math.sin(t / 300 + 1) * 3); etiqueta(sx, sy, tr('Voar'), true, icDoEmoji('✈️') || 'ponto'); }
  }
  const nomeP = (p, cor, vip) => { const [sx, sy] = ecraDe(p.x, p.y, 60); if (p.nome) nomeTag(sx, sy, p.nome, cor, vip); if (p.fala && performance.now() < p.fala.ate) balao(sx, sy - (p.nome ? 16 : 2), p.fala.txt); };
  if (typeof guiaPino === 'function') guiaPino(ecraDe, t);   // 8 nov: guia do novato — marcador por cima do sítio do passo
  npcs.forEach(n => nomeP(n)); outros.forEach(o => nomeP(o, '#fff', ehVip(o.id))); nomeP(eu, '#ffcb00', ehVip(uid));
  floats.forEach(f => { const [sx, sy] = ecraDe(f.x, f.y, 70 + f.t * 30); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.8); ctx.font = '800 16px Figtree, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; const ft = partirEmojis(tr(f.txt))[0]; ctx.strokeText(ft, sx, sy); ctx.fillStyle = f.cor; ctx.fillText(ft, sx, sy); ctx.globalAlpha = 1; });
}
const ESTACAO_IC = { comida: 'fome', lazer: 'musica', treino: 'forca', saude: 'saude', banco: 'banco', univ: 'capelo', itens: 'loja', moveis: 'sofa', emprego: 'vagas', grupos: 'igreja', policia: 'admin', governo: 'governo', aeroporto: 'aviao' };
const _caminhos = new Map();
const caminhoIcone = n => { if (!_caminhos.has(n)) _caminhos.set(n, new Path2D(ICONES[n] || ICONES.ponto)); return _caminhos.get(n); };
function etiqueta(sx, sy, txt, minha, ic = 'ponto') {
  txt = txt ? partirEmojis(tr(txt))[0] : '';
  ctx.font = '700 11.5px Figtree, sans-serif'; ctx.textAlign = 'left';
  const tw = txt ? ctx.measureText(txt).width : 0, w = 20 + (txt ? tw + 18 : 8);
  ctx.fillStyle = minha ? 'rgba(245,184,28,.95)' : 'rgba(20,15,11,.8)'; rrect(ctx, sx - w / 2, sy - 11, w, 22, 11); ctx.fill();
  const cor = minha ? '#1c1405' : '#f7ecdc', x0 = sx - w / 2 + 7;
  ctx.save(); ctx.translate(x0, sy - 7); ctx.scale(14 / 24, 14 / 24);
  ctx.strokeStyle = minha ? cor : '#ffcb00'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(caminhoIcone(ic)); ctx.restore();
  if (txt) { ctx.fillStyle = cor; ctx.fillText(txt, x0 + 19, sy + 4); }
}
function nomeTag(sx, sy, txt, cor, vip) {
  ctx.font = '800 11px Figtree, sans-serif'; ctx.textAlign = 'center';
  if (vip) {   // 👑 VIP (só com Ouro): nome dourado com brilho e o selo «VIP» à esquerda
    const tw = ctx.measureText(txt).width, pw = 24, x0 = sx - (tw + pw + 4) / 2;
    const g = ctx.createLinearGradient(0, sy - 10, 0, sy + 2); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffcb00'); g.addColorStop(1, '#c9962a');
    ctx.fillStyle = g; rrect(ctx, x0, sy - 10, pw, 13, 6.5); ctx.fill();
    ctx.font = '900 8.5px Figtree, sans-serif'; ctx.fillStyle = '#3a2600'; ctx.fillText('VIP', x0 + pw / 2, sy);
    ctx.font = '800 11px Figtree, sans-serif'; const nx = x0 + pw + 4 + tw / 2;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,24,0,.85)'; ctx.strokeText(txt, nx, sy);
    ctx.shadowColor = 'rgba(255,203,0,.8)'; ctx.shadowBlur = 6; ctx.fillStyle = g; ctx.fillText(txt, nx, sy); ctx.shadowBlur = 0;
    return;
  }
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(txt, sx, sy); ctx.fillStyle = cor || '#fff'; ctx.fillText(txt, sx, sy);
}
// 👑 quem é VIP (o servidor é que sabe: jogadores.vip_ate; pergunta-se uma vez por pessoa a cada 10 min)
const VIPS = new Map();   // id -> { ate, visto }
function ehVip(id) {
  if (id === uid) return !!(J?.vip_ate && new Date(J.vip_ate) > new Date());
  const v = VIPS.get(id); return !!(v?.ate && v.ate > Date.now());
}
// 8 nov: o VIP dos outros vem na presença (campo v) — antes perguntava-se ao servidor a cada pessoa nova e, com 2.900 online,
// eram ~600 pedidos por segundo e o jogo deixou de abrir.
function balao(sx, sy, txt) {
  const [limpo, ic] = partirEmojis(typeof tr === 'function' ? tr(txt) : txt); txt = limpo;   // falas dos NPCs na língua do jogador (as conversas entre jogadores ficam como foram escritas)
  if (!txt) {   // só um emoji: um balão pequeno com o ícone desenhado
    if (!ic) return;
    ctx.fillStyle = '#fff'; rrect(ctx, sx - 17, sy - 40, 34, 32, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 5, sy - 8); ctx.lineTo(sx, sy - 1); ctx.lineTo(sx + 5, sy - 8); ctx.fill();
    ctx.save(); ctx.translate(sx - 10, sy - 34); ctx.scale(20 / 24, 20 / 24);
    ctx.strokeStyle = '#1c1405'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(caminhoIcone(ic)); ctx.restore();
    return;
  }
  ctx.font = '600 12.5px Figtree, sans-serif'; ctx.textAlign = 'left';
  const palavras = txt.split(' '), linhas = []; let l = '';
  for (const p of palavras) { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > 150 && l) { linhas.push(l); l = p; } else l = t; }
  linhas.push(l);
  const w = Math.min(170, Math.max(...linhas.map(x => ctx.measureText(x).width)) + 16), h = linhas.length * 15 + 10;
  const x = sx - w / 2, y = sy - h - 8;
  ctx.fillStyle = '#fff'; rrect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx - 5, y + h); ctx.lineTo(sx, y + h + 7); ctx.lineTo(sx + 5, y + h); ctx.fill();
  ctx.fillStyle = '#1c1405'; linhas.forEach((li, i) => ctx.fillText(li, x + 8, y + 17 + i * 15));
}
function desenhaObjeto(o, t, noite, ctx = cv.getContext('2d')) {
  switch (o.kind) {
    case 'edificio': case 'casinha': desenhaEdificio(ctx, o.b, noite, o.kind); break;
    case 'palmeira': desenhaPalmeira(ctx, o.x, o.y, t); break;
    case 'arvore': desenhaArvore(ctx, o.x, o.y, t, o.cor); break;
    case 'baobab': desenhaArvore(ctx, o.x, o.y, t, null, true); break;
    case 'carro': desenhaCarro(ctx, o.x, o.y, o.cor, o.rot, o.tipo); break;
    case 'parede': {
      const T = 0.22, m = (1 - T) / 2, top = { topo: shade(cena.parede, -0.45) }, dr = o.dir || 'p';
      if (dr.includes('h')) caixa(ctx, o.x, o.y + m, 1, T, 34, cena.parede, 0, top);
      if (dr.includes('v')) caixa(ctx, o.x + m, o.y, T, 1, 34, cena.parede, 0, top);
      if (!dr.includes('h') && !dr.includes('v')) caixa(ctx, o.x + m, o.y + m, T, T, 34, cena.parede, 0, top);
      break;
    }
    case 'escada': {
      const n = 6, sobe = o.andar === 0;
      for (let i = 0; i < n; i++) caixa(ctx, o.x + (sobe ? i : n - 1 - i) * o.w / n, o.y, o.w / n + 0.01, o.d, 6 + i * 6, i % 2 ? '#a06c3b' : '#b07a46');
      caixa(ctx, o.x, o.y + o.d - 0.08, o.w, 0.08, 46, '#5a3a22', 0);
      const [lx, ly] = iso(o.x + o.w / 2, o.y + o.d / 2, 56); ctx.font = '800 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(ctx, lx - 46, ly - 12, 92, 18, 9); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText((sobe ? '↑ ' : '↓ ') + tr(sobe ? '1.º andar' : 'Rés-do-chão'), lx, ly + 2);
      break;
    }
    case 'candeeiro': desenhaCandeeiroRua(ctx, o.x, o.y, noite); break;
    case 'campa': caixa(ctx, o.x + 0.3, o.y + 0.42, 0.4, 0.14, 12, o.cor, o.z0 || 0); caixa(ctx, o.x + 0.46, o.y + 0.45, 0.08, 0.08, 22, shade(o.cor, -0.15), (o.z0 || 0) + 12); break;   // FILA 0dn-9
    case 'outdoor': desenhaOutdoor(o, noite, ctx); break;
    case 'paragem': {
      const { x, y } = o;
      caixa(ctx, x + 0.2, y + 0.3, 1.6, 0.4, 10, '#8a5a32');
      [[0.1, 0.1], [1.8, 0.1], [0.1, 1.8], [1.8, 1.8]].forEach(([a, b]) => caixa(ctx, x + a, y + b, 0.1, 0.1, 34, '#555'));
      caixa(ctx, x, y, 2, 2, 4, '#2a62c9', 34);
      naFaceY(ctx, x, y + 2, 2, 0.4, 1.6, 36, 44, '#ffcb00');
      break;
    }
    case 'barraca': {
      const [bx, by] = iso(o.x + 0.5, o.y + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(bx + 10, by, 26, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ddd'; ctx.fillRect(bx - 1.5, by - 40, 3, 40);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : o.cor; ctx.beginPath(); ctx.moveTo(bx, by - 46); const a1 = i / 8 * Math.PI * 2, a2 = (i + 1) / 8 * Math.PI * 2; ctx.lineTo(bx + Math.cos(a1) * 28, by - 34 + Math.sin(a1) * 11); ctx.lineTo(bx + Math.cos(a2) * 28, by - 34 + Math.sin(a2) * 11); ctx.fill(); }
      caixa(ctx, o.x + 0.55, o.y + 0.2, 0.35, 0.6, 3, '#e86aa6', 0);
      break;
    }
    case 'movel': desenhaMovelId(ctx, o.mv.id, o.mv.tipo, o.x, o.y, o.w, o.d, o.mb.rot, o.mb.cor || o.mv.cor, t, o.mb.cor); break;
  }
}

/* ============================================================
   TOQUES
   ============================================================ */
let toque = null; const pontos = new Map();
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); pontos.set(e.pointerId, [e.clientX, e.clientY]);
  if (pontos.size === 1) toque = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, cx: cam.x, cy: cam.y, arrastou: false };
  else if (pontos.size === 2) { const [a, b] = [...pontos.values()]; toque = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), z: cam.z, arrastou: true }; }
});
cv.addEventListener('pointermove', e => {
  if (!pontos.has(e.pointerId) || !toque) return;
  pontos.set(e.pointerId, [e.clientX, e.clientY]);
  if (toque.pinch && pontos.size === 2) {
    const [a, b] = [...pontos.values()]; cam.z = Math.max(0.45, Math.min(2.4, toque.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / toque.pinch));
    if (m3dAtivo()) { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); M3D.rodar(ang - toque.ang, false); toque.ang = ang; }   // 3D: rodar com dois dedos
    return;
  }
  const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
  if (!toque.arrastou && Math.hypot(dx, dy) > 10) toque.arrastou = true;
  if (toque.arrastou && !toque.pinch && m3dAtivo()) { cam.seguir = false; M3D.arrastar(e.clientX - toque.lx, e.clientY - toque.ly, cam.z); toque.lx = e.clientX; toque.ly = e.clientY; return; }
  toque.lx = e.clientX; toque.ly = e.clientY;
  if (toque.arrastou && !toque.pinch) { cam.seguir = false; cam.x = toque.cx - dx / cam.z; cam.y = toque.cy - dy / cam.z; }
});
const fimToque = e => {
  pontos.delete(e.pointerId);
  if (!toque) return;
  if (!toque.arrastou && pontos.size === 0) tocar(e.clientX, e.clientY);
  if (pontos.size === 0) toque = null;
};
cv.addEventListener('pointerup', fimToque); cv.addEventListener('pointercancel', e => { pontos.delete(e.pointerId); toque = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = Math.max(0.45, Math.min(2.4, cam.z * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false });
$('#zMais').onclick = () => cam.z = Math.min(2.4, cam.z * 1.2);
$('#zMenos').onclick = () => cam.z = Math.max(0.45, cam.z / 1.2);
$('#centrar').onclick = () => centrarCamera(false);
$('#rodar').onclick = () => m3dAtivo() ? M3D.rodar(Math.PI / 2) : rodarVista();
addEventListener('keydown', e => { if (!m3dAtivo() || /input|textarea/i.test(document.activeElement?.tagName || '')) return; if (e.key === 'q' || e.key === 'Q') M3D.rodar(Math.PI / 8); if (e.key === 'e' || e.key === 'E') M3D.rodar(-Math.PI / 8); });

function silhueta(o) {
  const { x, y, w, d } = o, h = o.h;
  return [iso(x, y, h), iso(x + w, y, h), iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x, y + d, 0), iso(x, y + d, h)];
}
function dentro(pt, pol) {
  let c = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  } return c;
}
function tocar(sx, sy) {
  if (!cena || !eu) return;
  if (m3dAtivo()) {   // no 3D quem diz o que foi tocado é o mundo 3D (pessoa, edifício ou quadrado do chão)
    if (deco) return tocarDeco3D(M3D.escolher(sx, sy, []));
    const h = M3D.escolher(sx, sy, [...outros.values(), ...npcs]);
    if (h.pessoa) return tocarPessoa(h.pessoa);
    if (h.obj && h.obj === M3D.PORTA && cena.saida) { const [dx, dy] = cena.saida; return andarPara(eu, dx, dy, () => sairDeCasa()) || sairDeCasa(); }
    if (h.obj) return tocarObjeto(h.obj);
    if (h.tile && cena.tipo === 'casa') { const fora = veiculoLaFora(h.tile[0], h.tile[1]); if (fora) return garagem(fora); }
    if (h.tile) andarAoQuadrado(h.tile[0], h.tile[1]);
    return;
  }
  const [wx, wy] = paraMundo(sx, sy);
  const [tx, ty] = paraTile(wx, wy);
  if (deco) return tocarDeco(wx, wy, tx, ty);
  // 1) pessoas
  const pessoas = [...outros.values(), ...npcs];
  for (const p of pessoas) { const [px, py] = iso(p.x, p.y); if (Math.abs(wx - px) < 13 && wy < py + 4 && wy > py - 54) return tocarPessoa(p); }
  // 1b) #26 o teu carro / avião lá fora (só na tua casa, rés-do-chão)
  const fora = veiculoLaFora(tx, ty); if (fora) return garagem(fora);
  // 2) objetos (da frente para trás)
  for (let i = ordemDesenho.length - 1; i >= 0; i--) {
    const o = ordemDesenho[i].o;
    if (!(o.spec || o.kind === 'movel' || o.kind === 'escada')) continue;
    if (dentro([wx, wy], silhueta(o))) return tocarObjeto(o);
  }
  // 3) porta da casa (parede)
  if ((cena.tipo === 'casa' || cena.tipo === 'interior') && cena.saida) {
    const [dx, dy] = cena.saida;
    const pol = [iso(dx, 0, 56), iso(dx + 1, 0, 56), iso(dx + 1, 0, 0), iso(dx, 0, 0)];
    if (dentro([wx, wy], pol) || (tx === dx && ty === dy)) return andarPara(eu, dx, dy, () => sairDeCasa());
  }
  // 4) chão
  andarAoQuadrado(tx, ty);
}
function andarAoQuadrado(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= cena.W || ty >= cena.H) return;
  let alvo = [tx, ty];
  if (cena.bloq[ty * cena.W + tx]) alvo = livreProximo(cena.bloq, cena.W, cena.H, tx, ty);
  if (!alvo) return;
  if (andarPara(eu, alvo[0], alvo[1])) marcaToque = { x: alvo[0], y: alvo[1], ate: performance.now() + 700 };
}
function tocarObjeto(o) {
  if (o.kind === 'escada') {
    const alvo = adjacenteLivre(o); const ir = () => mudarAndar(o.andar === 0 ? 1 : 0);
    if (!alvo) return ir();
    return andarPara(eu, alvo[0], alvo[1], ir) || ir();
  }
  if (o.kind === 'movel' && cena.tipo === 'interior') {
    const adj = adjacenteLivre(o);
    const usar = () => o.estacao ? usarEstacao(o) : toast(`${o.mv.emoji || '✨'} ${tr(o.mv.nome)}`);
    if (!adj) return usar();
    return andarPara(eu, adj[0], adj[1], usar) || usar();
  }
  if (o.kind === 'movel') {
    const adj = adjacenteLivre(o);
    const usar = () => {
      if (!podeMexer(cena.dono.id)) {
        const el = sheet(`<h3>${o.mv.emoji} ${esc(o.mv.nome)}</h3><p class="m">É de ${esc(cena.dono.nome)}. Bonito!</p>
          <button class="btn full red" id="bRoubar">🤫 Roubar (arriscado)</button><button class="btn full ghost" style="margin-top:8px" data-fechar>Deixar estar</button>`);
        el.querySelector('#bRoubar').onclick = async () => { if (!await perguntar('Roubar isto? Se fores apanhado/a, vais preso/a e ficas com cadastro.')) return; fecharSheets(); if (await acao('roubar_movel', { p_id: o.mb.id })) recarregarCasa(); };
        return;
      }
      usarMovel(o);
    };
    if (!adj) return usar();
    return andarPara(eu, adj[0], adj[1], usar) || usar();
  }
  const [px, py] = o.porta;
  marcaToque = { x: px, y: py, ate: performance.now() + 700 };
  const fechado = o.spec && horarioLugar(o.spec)?.aberto === false;   // LL14: fechado → não se entra; abre o painel com o aviso
  const ir = () => (cena.tipo === 'bairro' && o.spec && !fechado && categoriaInterior(o.spec) ? entrarEdificio(o) : false) || abrirLugar(o);
  if (!andarPara(eu, px, py, ir)) ir();
}
function adjacenteLivre(o) {
  let melhor = null, md = 1e9;
  for (let i = o.x - 1; i <= o.x + o.w; i++) for (let j = o.y - 1; j <= o.y + o.d; j++) {
    if (i >= o.x && i < o.x + o.w && j >= o.y && j < o.y + o.d) continue;
    if (i < 0 || j < 0 || i >= cena.W || j >= cena.H || cena.bloq[j * cena.W + i]) continue;
    const dd = Math.hypot(i + 0.5 - eu.x, j + 0.5 - eu.y); if (dd < md) { md = dd; melhor = [i, j]; }
  }
  return melhor;
}
// 🍳 cozinhar em casa (FILA 0c): no fogão escolhes um prato de casa; pagas só os ingredientes (~55% do preço do restaurante)
const custoCozinhar = f => Math.max(100, Math.round(f.preco * 0.55 / 50) * 50);
function abrirCozinha(o) {
  const pratos = (D.comidas || []).filter(f => f.caseira).sort((a, b) => a.preco - b.preco);
  const el = sheet(`<h3>🍳 ${tr('Cozinhar em casa')}</h3><p class="m">${tr('Com os ingredientes do mercado, fazes tu a comida: sai mais barato do que no restaurante e sabe a casa.')}</p>
    <div class="list"><div class="row">${arteListaHTML('comida', 'funge_bombo', '🍲')}<div class="t"><b>${tr('Prato rápido (funge com peixe)')}</b><small>Barriga +35</small></div><button class="btn sm" data-cz="">${fmtKz(600)}</button></div>
    ${pratos.map(f => `<div class="row">${arteListaHTML('comida', f.id, f.emoji)}<div class="t"><b>${esc(f.nome)}</b><small>Barriga +${f.fome}${' · Humor +' + (f.felicidade + 2)}</small></div><button class="btn sm" data-cz="${f.id}">${fmtKz(custoCozinhar(f))}</button></div>`).join('')}</div>`);
  el.querySelectorAll('[data-cz]').forEach(b => b.addEventListener('click', async () => {
    let est = null;
    if (b.dataset.cz) { est = await jogoCozinha(pratos.find(f => f.id === b.dataset.cz)); if (est === undefined) return; }   // LL13
    const r = b.dataset.cz ? await acao('cozinhar2', { p_movel: o.mb.id, p_comida: b.dataset.cz, p_estrelas: est }) : await acao('usar_movel', { p_id: o.mb.id });
    if (r) { fecharSheets(); if (av3dAtivo()) comecarPose(eu, 'trabalhar', o, 4000); eu.fala = { txt: '🍳', ate: performance.now() + 2500 }; }
  }));
}
async function usarMovel(o) {
  if (o.mv.tipo === 'fogao') return abrirCozinha(o);
  const r = await acao('usar_movel', { p_id: o.mb.id });
  if (r && av3dAtivo()) {                                                           // #37: deitar, sentar, cozinhar…
    const t = o.mv.tipo, tipo = t === 'cama' ? 'deitado' : t === 'sofa' ? 'sentado' : ['fogao', 'microondas', 'maquina', 'lavatorio'].includes(t) ? 'trabalhar' : null;
    if (tipo) comecarPose(eu, tipo, o, tipo === 'deitado' ? 8000 : tipo === 'sentado' ? 7000 : 4000);
  }
  if (r) { const em = { cama: '😴', tv: '📺', som: '🎶', fogao: '🍳', frigorifico: '🥪', chuveiro: '🚿', banheira: '🛁', jacuzzi: '🫧', sanita: '🚽', lavatorio: '🚰', microondas: '🍲', maquina: '🧺', sofa: '😌', estante: '📖' }[o.mv.tipo]; if (em) eu.fala = { txt: em, ate: performance.now() + 2500 }; }
}

/* ============================================================
   LUGARES (painéis dos edifícios)
   ============================================================ */
function linhaComida(f) { return `<div class="row">${arteListaHTML('comida', f.id, f.emoji)}<div class="t"><b>${esc(f.nome)}${f.alcool ? ' <span class="tag" style="color:var(--red)">18+</span>' : ''}</b><small>Barriga +${f.fome}${f.felicidade ? ' · Humor +' + f.felicidade : ''}</small></div><button class="btn sm" data-a="comer" data-v="${f.id}">${fmtKz(f.preco)}</button></div>`; }
function linhaLazer(l) { return `<div class="row">${arteListaHTML('lazer', l.id, l.emoji)}<div class="t"><b>${esc(l.nome)}</b><small>${esc(l.descricao)} · Humor +${l.felicidade}</small></div><button class="btn sm ghost" data-a="divertir" data-v="${l.id}">${l.preco ? fmtKz(l.preco) : 'Grátis'}</button></div>`; }
// cada pedaço traduzido à parte (a frase "Precisas: {0}" não traduz o que vai dentro do {0})
function requisitos(e) {
  const f = [];
  if (J.estudo < e.estudo_min) f.push(tr('estudo') + ' ' + e.estudo_min);
  if (J.reputacao < e.reputacao_min) f.push(tr('reputação') + ' ' + e.reputacao_min);
  if (e.item_req && !tem(e.item_req)) f.push(tr('ter') + ' ' + tr(D.itens.find(x => x.id === e.item_req)?.nome || e.item_req));
  return f;
}
// 8 nov (FILA 0ey, pedido de um jogador): «que os trabalhadores vejam qnts turnos já fizeram» — total (nunca volta a 0) e no cargo
function turnosFeitosHTML() {
  const t = J.turnos_total ?? J.turnos ?? 0;
  return `<small style="color:var(--gold)">🔁 ${esc(tr('Turnos feitos: {0} · neste cargo: {1}').replace('{0}', t.toLocaleString('pt-PT')).replace('{1}', J.turnos || 0))}</small>`;
}
function blocoEmprego(e) {
  if (J.emprego === e.id) return `<div class="row mine">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>Trabalhas aqui: ${esc(e.nome)}</b><small>+${fmtKz(e.salario)} por turno · −${e.energia} energia</small>${turnosFeitosHTML()}</div><button class="btn sm red" data-a="trabalhar">Trabalhar</button></div>`;
  const f = requisitos(e), atual = J.emprego ? emprego(J.emprego) : null, mesma = atual && atual.pericia && atual.pericia === e.pericia && (J.cargo_nivel || 1) > 1;
  return `<div class="row ${f.length ? 'lock' : ''}">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>Vaga: ${esc(e.nome)} · <span style="color:var(--gold)">${fmtKz(e.salario)}</span>/turno</b><small>${esc(e.descricao)}</small>${mesma ? `<small style="color:var(--green)">✨ ${tr('Mesma perícia: entras como')} ${tr(CARGOS[(J.cargo_nivel || 1) - 1])}</small>` : ''}${f.length ? `<small style="color:#ff9b9b">Precisas: ${f.join(', ')}</small>` : ''}</div><button class="btn sm" data-a="escolher_emprego" data-v="${e.id}" ${f.length ? 'disabled' : ''}>Aceitar</button></div>`;
}
function cabecaLugar(o) {
  const s = o.spec, b = bairro(J.bairro);
  return `<div class="heroi"><img alt="" src="${retratoLugar(o)}" draggable="false"><button class="fechaSheet" data-fecha-sheet aria-label="Fechar">${icone('fechar', 20)}</button></div>
    <div class="heroiT"><h3>${esc(s.nome)}</h3>${b ? `<small>${esc(b.nome)}</small>` : ''}</div>`;
}
// 0k-D: onde há jogos de mesa — bares, cafés e cantinas (não nas paragens nem nas bancas de rua)
function temMesa(spec) {
  const ac = spec?.acao || [];
  if (!ac.some(a => a.t === 'comida') || ac.some(a => a.t === 'paragem')) return false;
  const t = tipoSitioComida(spec.nome, spec.emoji);
  return t === 'bar' || t === 'cafe' || (t === 'cantina' && /cantina|tasca|restaurante|largo/i.test(spec.nome || ''));
}
async function abrirLugar(o) {
  const s = o.spec; let h = cabecaLugar(o);
  registarVisita(J.bairro, s.nome || '');   // 0y
  if (s.acao.some(a => a.t === 'casa')) h += '<div id="vizinhos"></div>';   // amigos que moram aqui: logo no topo, com o botão Visitar
  const b = bairro(J.bairro), hr = horarioLugar(s), fechado = hr && !hr.aberto;
  if (fechado) h += `<div class="row lock" id="fechadoAgora" style="margin-top:8px"><span class="e">🌙</span><div class="t"><b>${tr('Fechado agora')}</b><small>${tr(hr.tipo === 'discoteca' ? 'A discoteca abre às {0}h e fecha às {1}h (hora de Luanda).' : 'O bar abre às {0}h e fecha às {1}h (hora de Luanda).').replace('{0}', hr.abre).replace('{1}', hr.fecha)}</small></div></div>`;
  for (const a of s.acao) {
    if (fechado && (a.t === 'comida' || a.t === 'lazer')) continue;
    if (a.t === 'comida') h += `<div class="sec"><h4>Comer e beber</h4></div><div class="list">${a.ids.map(id => D.comidas.find(c => c.id === id)).filter(Boolean).map(linhaComida).join('')}</div>`;
    if (a.t === 'lazer') { const l = D.lazer.find(x => x.id === a.id); if (l) h += `<div class="sec"><h4>Curtir</h4></div><div class="list">${linhaLazer(l)}</div>`; }
    if (a.t === 'emprego') { const e = emprego(a.id); if (e) h += `<div class="sec"><h4>Trabalho</h4></div><div class="list">${blocoEmprego(e)}</div>`; }
    if (a.t === 'info') h += `<p class="m" style="margin-top:8px">${esc(a.txt)}</p>`;
    if (a.t === 'biscato') h += `<div class="sec"><h4>Biscato</h4></div><div class="list"><div class="row">${arteListaHTML('acao', 'biscato')}<div class="t"><b>Fazer um biscato</b><small>Trabalho rápido, pagamento incerto · −15 energia</small></div><button class="btn sm" data-a="biscato">Fazer</button></div></div>`;
    if (a.t === 'univ') h += univHTML(a.id || 'uan', false);
    if (a.t === 'itens') h += lojaFisicaHTML(a.cats || ['telemovel', 'outros']);
    if (a.t === 'moveis') {
      const lista = D.moveis.filter(m => m.preco > 0 && (a.loja === 'fina' || m.preco <= 16000));
      h += `<p class="m">Compra e depois vai a casa carregar em 🔨 Decorar para pôr onde quiseres.</p><div class="list">${lista.map(m => `<div class="row">${miniaturaHTML('movel', m.id)}<div class="t"><b>${esc(m.nome)}</b><small>${esc(m.efeito)}</small></div><button class="btn sm" data-a="comprar_movel" data-v="${m.id}">${fmtKz(m.preco)}</button></div>`).join('')}</div>`;
      if (a.loja !== 'fina') h += `<p class="m" style="margin-top:10px">Móveis de luxo (cama de casal, TV, geleira, AC…) estão no Casa & Design, em Talatona.</p>`;
    }
    if (a.t === 'casa') {
      const c = casaDe(a.id);
      // casas tuas aqui: a tua (ou a do casal, se moras com o/a cônjuge) e a casa separada do/a cônjuge no mesmo prédio
      const linhaCasa = (titulo, k) => `<div class="row mine"><img class="mini" alt="" src="${retratoLugar(o, 120, 96)}"><div class="t"><b>${titulo} · ${esc(c.nome)}</b><small>${fmtKz(c.renda)}/dia · ${c.largura}×${c.fundo} · conforto ${'★'.repeat(c.conforto)}</small></div><button class="btn sm" data-entrar="${k}">Entrar em casa</button></div>`;
      const minhas = [];
      if (J.casa === c.id || (donoLar() && casal?.casa === c.id)) minhas.push(linhaCasa(J.casa === c.id ? 'A tua casa' : 'A vossa casa', 'eu'));
      if (casal?.casa === c.id && casal.id !== donoLar() && !(casal.lar === uid && !casal.casa)) minhas.push(linhaCasa(`Casa de ${esc(casal.nome)}`, 'conjuge'));
      if (minhas.length) h += `<div class="list">${minhas.join('')}</div>`;
      else if (c.preco_ouro) h += `<p class="m">${esc(tr(c.descricao))}</p>`;   // 8 nov: casa VIP — só se compra com Ouro (em baixo)
      else h += `<p class="m">${esc(c.descricao)}</p><div class="list"><div class="row"><img class="mini" alt="" src="${retratoLugar(o, 120, 96)}"><div class="t"><b>${esc(c.nome)}</b><small>Renda diária, cobrada automaticamente · ${c.largura}×${c.fundo} · conforto ${'★'.repeat(c.conforto)}</small></div><button class="btn sm" data-a="arrendar" data-v="${c.id}">${fmtKz(c.renda)}/dia</button></div></div>`;
      h += `<div data-imoveis="${c.id}"></div>`;
    }
    if (a.t === 'paragem') h += J.bairro === 'cadeia' ? '<p class="m">⛓️ Daqui não sai nenhum autocarro para ti. Cumpre a pena ou paga a fiança na secretaria.</p>' : paragemHTML() + corridaHTML();
    if (a.t === 'crime') h += crimeHTML(a.tipos);
    if (a.t === 'governo') h += governoHTML();
    if (a.t === 'policia') h += policiaHTML();
    if (a.t === 'cadeia') h += cadeiaHTML(a.o);
    if (a.t === 'aeroporto') h += aeroportoHTML();
    if (a.t === 'outdoor') h += outdoorHTML(a.slot);
    if (a.t === 'lazer' && (a.id === 'kizomba' || a.id === 'bola') && !h.includes('A tocar agora')) h += musicaLugarHTML();
    if (a.t === 'estacao') h += estacaoHTML();
    if (a.t === 'grupos' && a.tipo === 'clube') h += `<div class="sec"><h4>⚽ ${tr('Penáltis')}</h4><span>${tr('até 5 por dia')}</span></div><div class="list"><div class="row"><span class="e">🥅</span><div class="t"><b>${tr('Bater penáltis')}</b><small>${tr('5 remates contra o guarda-redes do bairro. Até 900 Kz.')}</small></div><button class="btn sm" data-penaltis>${tr('Jogar')}</button></div></div>`;
    if (a.t === 'moda') h += `<div class="sec"><h4>💃 ${tr('Desafio de estilo')}</h4><span>${tr('até 5 por dia')}</span></div><div class="list"><div class="row"><span class="e">👗</span><div class="t"><b>${tr('Vestir uma cliente')}</b><small>${tr('Ela diz o tema; tu escolhes roupa, cores, penteado e acessórios. Até 1.200 Kz.')}</small></div><button class="btn sm" data-moda>${tr('Jogar')}</button></div></div>`;
    if (a.t === 'barco') h += barcoHTML();
    if (a.t === 'moda_loja') h +=   /* 9 nov: lojas de roupa no jogo a sério */ `<div class="sec"><h4>👗 ${esc(tr('Loja de moda'))}</h4><span>${esc(tr('coleção da semana'))}</span></div><div class="list"><div class="row"><span class="e">🛍️</span><div class="t"><b>${esc(tr('Ver a coleção e experimentar'))}</b><small>${esc(tr('Peças em Kz e edições limitadas em Ouro.'))}</small></div><button class="btn sm" data-loja-moda>${esc(tr('Entrar'))}</button></div>
      <div class="row"><span class="e">👗</span><div class="t"><b>${esc(tr('O meu guarda-roupa'))}</b><small>${esc(tr('Experimenta e veste o que já compraste.'))}</small></div><button class="btn sm ghost" data-guarda-roupa>${esc(tr('Abrir'))}</button></div></div>`;
    if (a.t === 'cemiterio') h += `<div class="sec"><h4>🪦 ${esc(tr('Campas'))}</h4><span>💐 ${fmtKz(2000)}</span></div><div class="list" id="campas"><div class="empty">…</div></div>
      <div class="sec"><h4>👻 ${esc(tr('Histórias de fantasmas'))}</h4><span>${esc(tr('só à noite'))}</span></div><div class="list"><div class="row"><span class="e">👻</span><div class="t"><b>${esc(tr('Ouvir histórias à volta da fogueira'))}</b><small>${esc(tr('Das 20h às 5h. Diversão garantida… e às vezes um susto.'))}</small></div><button class="btn sm" data-fantasmas>${esc(tr('Ouvir'))}</button></div></div>`;
    if (a.t === 'jetski' && typeof jetskiHTML === 'function') h += jetskiHTML();
    if (a.t === 'kart' && typeof kartHTML === 'function') h += kartHTML();
    if (a.t === 'saude') h += `<div class="sec"><h4>Saúde</h4></div><p class="m">${esc(a.txt || '')}</p><div class="list"><div class="row">${arteListaHTML('acao', 'saude')}<div class="t"><b>Tratar-me aqui</b><small>${J.doenca ? 'Estás doente!' : 'Consulta, farmácia, seguro'}</small></div><button class="btn sm" data-abrir-saude>Abrir</button></div></div>`;
    if (a.t === 'lavras') h += `<div class="sec"><h4>Lavras</h4></div><div class="list"><div class="row">${arteListaHTML('acao', 'lavras')}<div class="t"><b>Plantar, regar e colher</b><small>Milho, feijão, mandioca e batata</small></div><button class="btn sm" data-abrir-lavras>Abrir</button></div></div>`;
    if (a.t === 'banco') h += `<div class="sec"><h4>Balcão</h4></div><div class="list"><div class="row">${arteListaHTML('acao', 'banco')}<div class="t"><b>Poupança e empréstimos</b><small>Os empréstimos só se pedem aqui, ao balcão</small></div><button class="btn sm" data-abrir-banco>Abrir</button></div></div>`;
    if (a.t === 'treino') h += a.onde === 'ginasio'
      ? `<div class="sec"><h4>Treinar</h4><span>Forma ${Math.round(J.forma ?? 50)}</span></div><div class="list"><div class="row">${arteListaHTML('acao', 'ginasio')}<div class="t"><b>Sessão de ginásio</b><small>Forma +10 · stress −15 · −20 energia</small></div><button class="btn sm" data-a="treinar" data-v="ginasio">${fmtKz(1500)}</button></div></div>`
      : `<div class="sec"><h4>Correr</h4><span>Forma ${Math.round(J.forma ?? 50)}</span></div><div class="list"><div class="row">${arteListaHTML('acao', 'correr')}<div class="t"><b>Ir correr</b><small>Forma +7 · stress −10 · −15 energia</small></div><button class="btn sm" data-a="treinar" data-v="correr">Grátis</button></div></div>`;
    if (a.t === 'grupos' && a.tipo === 'igreja') h += `<div class="list"><div class="row"><span class="e">🙏</span><div class="t"><b>${tr('Ir ao culto')}</b><small>${tr('Rezar e cantar com o coro: tira stress e solidão. Uma vez a cada 6 horas.')}</small></div><button class="btn sm" data-rezar>${tr('Rezar')}</button></div></div>`;
    if (a.t === 'grupos') h += `<div class="sec"><h4>${{ igreja: 'Igrejas', clube: 'Equipas de futebol', associacao: 'Associações' }[a.tipo]} do bairro</h4></div><div class="list" data-grupos="${a.tipo}"><div class="empty">A procurar…</div></div>`;
  }
  // 0k-D: jogos de mesa nos bares, cafés e cantinas
  if (temMesa(o.spec) && typeof mesaHTML === 'function') h += mesaHTML();
  const el = sheet(h); el.classList.add('lugar');
  el.querySelector('[data-fecha-sheet]')?.addEventListener('click', fecharSheets);
  if (typeof ligarMesa === 'function') ligarMesa(el);
  if (typeof ligarKart === 'function') ligarKart(el);
  ligarBotoes(el, () => { const nova = o._dentro || cena.objetos.find(x => x === o); if (nova && el.isConnected) abrirLugar(o); });
  el.querySelectorAll('[data-entrar]').forEach(bt => bt.addEventListener('click', () => { fecharSheets(); irParaCasa(bt.dataset.entrar === 'conjuge' ? { id: casal.id, nome: casal.nome, casa: casal.casa, parede: casal.parede, chao: casal.chao } : meuLar()); }));
  el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = () => viajar(bt.dataset.viajar, bt.dataset.meio));
  if (s.acao.some(a => a.t === 'jetski') && typeof ligarJetski === 'function') ligarJetski(el);
  // #41a: tocar num outdoor conta como abertura do anúncio que estava a passar; "Saber mais" conta como clique
  { const ao = o.spec?.acao?.find(a => a.t === 'outdoor'); if (ao) toqueAnuncio(adDe(ao.slot)?.id, 'abrir'); }
  el.querySelectorAll('[data-ad-link]').forEach(a => a.addEventListener('click', () => toqueAnuncio(+a.dataset.adLink, 'link')));
  ligarVender(el, () => { const nova = cena.objetos.find(x => x === o); if (nova && el.isConnected) abrirLugar(o); });
  ligarPosses(el, () => { const nova = cena.objetos.find(x => x === o); if (nova && el.isConnected) abrirLugar(o); });
  ligarCrime(el, () => { const nova = cena.objetos.find(x => x === o); if (nova && el.isConnected) abrirLugar(o); });
  el.querySelector('[data-abrir-governo]')?.addEventListener('click', () => abrirTelemovel('governo'));
  el.querySelector('[data-abrir-banco]')?.addEventListener('click', () => abrirTelemovel('banco'));
  el.querySelector('[data-moda]')?.addEventListener('click', () => desafioModa());   // 0k-F
  el.querySelector('[data-penaltis]')?.addEventListener('click', async () => { const e = await jogoPenaltis(); if (e !== undefined && e !== null) await acao('penaltis', { p_estrelas: e }); });
  el.querySelector('[data-abrir-lavras]')?.addEventListener('click', () => abrirTelemovel('lavras'));
  el.querySelector('[data-abrir-saude]')?.addEventListener('click', () => abrirTelemovel('saude'));
  el.querySelectorAll('[data-imoveis]').forEach(div => imoveisNoLugar(div, div.dataset.imoveis));
  el.querySelector('[data-loja-moda]')?.addEventListener('click', () => { fecharSheets(); abrirLojaModa('loja'); });
  el.querySelector('[data-guarda-roupa]')?.addEventListener('click', () => { fecharSheets(); abrirLojaModa('casa'); });
  el.querySelector('[data-fantasmas]')?.addEventListener('click', async ev => { const bt = ev.currentTarget; bt.disabled = true; await acao('cemiterio_fantasmas'); bt.disabled = false; });
  if (el.querySelector('#campas')) campasCemiterio(el.querySelector('#campas'));
  el.querySelectorAll('[data-grupos]').forEach(div => listaGrupos(div, div.dataset.grupos, J.bairro, () => abrirLugar(o)));
  el.querySelectorAll('[data-rezar]').forEach(b => b.onclick = async () => { b.disabled = true; if (!await acao('rezar')) b.disabled = false; });
  if (typeof ui2 === 'function' && ui2()) ui2Lugar(el, o);   // 8 nov: redesenho (teste)
  const casaA = s.acao.find(a => a.t === 'casa');
  if (casaA) {
    if (typeof carregarAmigos === 'function') await carregarAmigos(true);   // sempre fresco: um amigo novo aparece logo, sem recarregar a página
    const conhecidos = typeof amigos !== 'undefined' ? [...amigos] : [];   // privacidade: só amigos, família e parceiros/as
    const [{ data: d1 }, { data: abertas }] = await Promise.all([
      conhecidos.length ? sb.from('jogadores').select('id,nome,casa,parede,chao,aparencia').eq('casa', casaA.id).in('id', conhecidos).limit(12) : { data: [] },
      sb.from('jogadores').select('id,nome,casa,parede,chao,aparencia').eq('casa', casaA.id).eq('casa_aberta', true).neq('id', uid).limit(12)]);   // FILA 0dn-5: casas de portas abertas (qualquer um)
    const data = [...(d1 || []), ...(abertas || []).filter(a => !(d1 || []).some(x => x.id === a.id) && !(typeof bloqueados !== 'undefined' && bloqueados.has(a.id))).map(a => ({ ...a, aberta: true }))];
    const v = el.querySelector('#vizinhos'); if (!v) return;
    v.innerHTML = (data && data.length) ? `<div class="sec"><h4>🏠 Mora aqui</h4></div><div class="list">${data.map(p => `<div class="row mine">${arteListaHTML('acao', 'porta')}<div class="t"><b>${esc(p.nome)}</b><small>${p.aberta ? '🔓 ' + esc(tr('Portas abertas · qualquer um pode entrar')) : 'Mora aqui · é tua pessoa'}</small></div><button class="btn sm" data-visitar="${p.id}">Visitar</button></div>`).join('')}</div>` : '';
    v.querySelectorAll('[data-visitar]').forEach(bt => bt.onclick = () => { const p = data.find(x => x.id === bt.dataset.visitar); fecharSheets(); irParaCasa(p); });
  }
}
// 📱 só um aparelho de cada vez: se entrares noutro sítio, este fica em pausa
const SESSAO = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
let _sessaoInt = null;
let _arrTudo;   // 9 nov: true quando o arranque_tudo respondeu (então a sessão, o aparelho e as contas do dia já foram feitos)
async function vigiarSessao() {
  if (_arrTudo === true) return;
  await sb.rpc('reclamar_sessao', { p_sessao: SESSAO });
}
// chamada pelo pulso com a sessão guardada no servidor
function verSessao(sessao) {
  if (!sessao || document.getElementById('outraSessao')) return;
  if (String(sessao).startsWith('atualizar-')) { sb.rpc('reclamar_sessao', { p_sessao: SESSAO }).then(() => { }, () => { }); atualizarDepois(); return; }
  const data = { sessao };
  if (data && data.sessao !== SESSAO) {
    const v = document.createElement('div'); v.id = 'outraSessao'; v.className = 'pergunta';
    v.innerHTML = `<div class="pergCaixa"><p>Abriste o Vida na Banda noutro aparelho ou separador. Só podes jogar num de cada vez.</p><div class="pergBot"><button class="btn">Jogar aqui</button></div></div>`;
    v.querySelector('button').onclick = async () => { await sb.rpc('reclamar_sessao', { p_sessao: SESSAO }); v.remove(); location.reload(); };
    document.body.appendChild(v);
  }
}

/* ---------- 🧹 empregados de casa ---------- */
const EMPREGADOS = {
  empregada: ['🧹', 'Empregada doméstica', 6000, 'Casa limpa todos os dias: humor +5, saúde +3.'],
  cozinheiro: ['🍲', 'Cozinheiro/a', 8000, 'Comida feita todos os dias: barriga +40.'],
  seguranca: ['🛡️', 'Segurança', 12000, 'Guarda a casa: reputação +1 por dia, mais tranquilidade.'],
  motorista: ['🚘', 'Motorista', 15000, 'Leva-te a todo o lado: energia +15 por dia.'],
};
async function diaDosEmpregados() { const pd = pre('dia_emp'); const { data } = pd ? { data: pd.v } : await sb.rpc('dia_dos_empregados'); if (data?.msg) { if (data.jogador) setJogador(data.jogador); toast(data.msg, data.tipo || 'info', 6000); } }
// 0aq: custos diários dos aviões e carros caros; 7 dias sem pagar → o banco fica com eles (aviso grande)
async function diaDasPosses() {
  const pd = pre('dia_posses'); const { data, error } = pd ? { data: pd.v } : await sb.rpc('dia_das_posses'); if (error || !data?.msg) return;
  if (data.jogador) setJogador(data.jogador);
  if (/banco ficou/i.test(data.msg) && typeof janelaAviso === 'function') janelaAviso({ titulo: tr('O banco ficou com ele'), texto: tr(data.msg) });
  else toast(data.msg, data.tipo || 'info', 7000);
}
async function renderEmpregados(body) {
  const { data } = await sb.from('empregados_casa').select('tipo');
  const meus = new Set((data || []).map(x => x.tipo));
  if (typeof ui2 === 'function' && ui2()) return ui2Empregados(body, meus);   // 8 nov: redesenho (teste)
  body.innerHTML = `<p class="m">${J.casa ? 'Contrata ajuda para a tua casa. O salário paga-se sozinho todos os dias; se ficares sem kumbu, vão-se embora.' : 'Primeiro precisas de uma casa (arrenda ou compra em 📱 → Imóveis).'}</p>
    <div class="list">${Object.entries(EMPREGADOS).map(([k, [e, n, sal, txt]]) => `<div class="row ${meus.has(k) ? 'mine' : ''}"><span class="e">${e}</span><div class="t"><b>${n}</b><small>${txt} · ${fmtKz(sal)}/dia</small></div>
      ${meus.has(k) ? `<button class="btn sm ghost" data-desp="${k}">Despedir</button>` : `<button class="btn sm" data-contr="${k}" ${J.casa ? '' : 'disabled'}>Contratar</button>`}</div>`).join('')}</div>`;
  body.querySelectorAll('[data-contr]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('contratar_empregado', { p_tipo: b.dataset.contr })) renderEmpregados(body); else b.disabled = false; });
  body.querySelectorAll('[data-desp]').forEach(b => b.onclick = async () => { if (!await perguntar('Despedir?')) return; if (await acao('contratar_empregado', { p_tipo: b.dataset.desp, p_sim: false })) renderEmpregados(body); });
}

/* ---------- 🎓 universidades ---------- */
const UNIVS = {
  uan: { nome: 'Universidade Agostinho Neto', bairro: 'mutamba', mult: 1, txt: 'Pública e barata. A mais antiga do país.', cursos: ['direito', 'medicina', 'economia', 'engenharia'] },
  isaf: { nome: 'ISAF', bairro: 'maianga', mult: 1.3, txt: 'Instituto Superior de Administração e Finanças.', cursos: ['financas', 'gestao', 'economia'] },
  uor: { nome: 'Universidade Óscar Ribas', bairro: 'talatona', mult: 1.6, txt: 'Privada. Dá reputação (+1 por módulo).', cursos: ['gestao', 'direito', 'informatica', 'comunicacao'] },
  isptec: { nome: 'ISPTEC', bairro: 'talatona', mult: 2, txt: 'A mais cara e a mais respeitada. +1 reputação por módulo.', cursos: ['engenharia', 'petroleo', 'informatica'] },
};
const CURSOS = { direito: 'Direito', medicina: 'Medicina', economia: 'Economia', engenharia: 'Engenharia', financas: 'Finanças', gestao: 'Gestão', informatica: 'Informática', comunicacao: 'Comunicação', petroleo: 'Engenharia de Petróleos' };
let cursoEscolhido = {};
function univHTML(id, online) {
  const u = UNIVS[id]; if (!u) return '';
  const meu = J.universidade === id ? J.curso : null, cur = cursoEscolhido[id] || meu || u.cursos[0];
  const custo = Math.round(5000 * (J.estudo + 1) * u.mult * (online ? 1.5 : 1));
  return `<div class="sec"><h4>${esc(u.nome)}</h4><span>Estudo: ${J.estudo}/10</span></div><p class="m">${esc(u.txt)}${meu ? ` <span>O teu curso:</span> <b>${esc(CURSOS[meu])}</b>` : ''}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px">${u.cursos.map(c => `<button type="button" class="btn sm ${c === cur ? '' : 'ghost'}" data-curso="${c}" data-univ="${id}">${esc(CURSOS[c])}</button>`).join('')}</div>
    <div class="list"><div class="row">${arteListaHTML('acao', 'univ')}<div class="t"><b>Módulo ${J.estudo + 1}${online ? ' · à distância' : ''}</b><small>Abre vagas melhores · −35 energia${online ? ' · +50% no preço' : ''}</small></div>
    <button class="btn sm" data-estudar="${id}" data-online="${online ? 1 : ''}" ${J.estudo >= 10 ? 'disabled' : ''}>${fmtKz(custo)}</button></div></div>`;
}
function ligarUniv(el, depois) {
  el.querySelectorAll('[data-curso]').forEach(b => b.onclick = () => { cursoEscolhido[b.dataset.univ] = b.dataset.curso; depois && depois(); });
  el.querySelectorAll('[data-estudar]').forEach(b => b.onclick = async () => {
    const id = b.dataset.estudar, u = UNIVS[id], cur = cursoEscolhido[id] || (J.universidade === id ? J.curso : null) || u.cursos[0];
    if (J.curso && (J.universidade !== id || J.curso !== cur) && !await perguntar(`Mudar para ${CURSOS[cur]} na ${u.nome}? O teu nível de estudo mantém-se.`)) return;
    b.disabled = true; const r = await acao('estudar', { p_univ: id, p_curso: cur, p_online: !!b.dataset.online }); b.disabled = false;
    if (r) depois && depois();
  });
}
function renderUniversidade(body) {
  if (typeof ui2 === 'function' && ui2()) return ui2Universidade(body);   // 8 nov: redesenho (teste)
  body.innerHTML = `<p class="m">Estuda à distância em qualquer universidade (+50% nas propinas), ou vai lá pessoalmente e paga o preço normal. Mais estudo abre vagas melhores.</p>` +
    Object.keys(UNIVS).map(id => univHTML(id, true) + `<p class="m" style="margin-top:4px">📍 ${esc(bairro(UNIVS[id].bairro)?.nome || '')}</p>`).join('');
  ligarUniv(body, () => renderUniversidade(body));
}

function ligarBotoes(el, depois) {
  ligarUniv(el, depois);
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const a = b.dataset.a, v = b.dataset.v;
    const args = { comer: { p_comida: v }, divertir: { p_lazer: v }, arrendar: { p_casa: v }, escolher_emprego: { p_emprego: v }, comprar: { p_item: v }, comprar_movel: { p_movel: v }, comprar_online: { p_movel: v, p_online: true }, treinar: { p_onde: v } }[a] || {};
    if (a === 'arrendar' && J.casa && !await perguntar('Vais deixar a tua casa atual (os móveis vão para o armazém). Continuar?')) return;
    if (a === 'comprar') { const it = D.itens.find(x => x.id === v); if (!await perguntar(`Comprar ${it.nome} por ${fmtKz(it.preco)}?`)) return; }
    // 0g-B: um turno de rua (zungar) faz-se na rua, não no quarto; e cada turno leva uns segundos a fazer
    if (a === 'trabalhar') {
      const e = emprego(J.emprego);
      if (e && !e.bairro && (cena?.tipo === 'casa' || cena?.tipo === 'interior')) { toast(tr('Para trabalhar como {0} tens de sair à rua.').replace('{0}', tr(e.nome)), 'info'); return; }
    }
    // LL13: antes de treinar, o mini-jogo (as estrelas mexem um bocadinho na forma)
    if (a === 'treinar') {
      const est = v === 'ginasio' ? await jogoRitmo('segurar') : await jogoPassadeira();   // 0k-G: correr = passadeira com música
      if (est === undefined) return;
      b.disabled = true;
      const r = await acao('treinar2', { p_onde: v, p_estrelas: est });
      b.disabled = false;
      if (r) depois && depois();
      return;
    }
    b.disabled = true;
    if (a === 'trabalhar' || a === 'biscato') {
      const txt0 = b.innerHTML; b.innerHTML = '⏳ ' + esc(tr('A trabalhar…'));
      eu.fala = { txt: a === 'trabalhar' ? '💪' : '🔨', ate: performance.now() + 3000 };
      await new Promise(ok => setTimeout(ok, 2500));
      b.innerHTML = txt0;
    }
    const r = await acao(a === 'comprar_online' ? 'comprar_movel' : a, args);
    b.disabled = false;
    if (r) {
      if (a === 'trabalhar' || a === 'biscato') eu.fala = { txt: a === 'trabalhar' ? '💪' : '🔨', ate: performance.now() + 2000 };
      if (a === 'comprar_movel' || a === 'comprar_online') { await carregarMinhaMobilia(); if (deco) renderDeco(); }
      depois && depois();
    }
  });
}

/* ---------- viagens ---------- */
const MEIOS = {
  candongueiro: d => ({ p: 150 + Math.round(d * 60 / 50) * 50, en: 8 + Math.round(d * 2), n: 'Candongueiro', e: '🚐' }),
  kupapata: d => ({ p: 300 + Math.round(d * 180 / 50) * 50, en: 5 + Math.round(d), n: 'Kupapata', e: '🏍️' }),
  taxi: d => ({ p: 1000 + Math.round(d * 600 / 100) * 100, en: 3, n: 'Táxi', e: '🚕' }),
  mota: d => ({ p: 100 + Math.round(d * 40 / 50) * 50, en: 4 + Math.round(d), n: 'A tua mota', e: '🛵' }),
  carro: d => d > 30 ? { p: Math.round(d * 30 / 100) * 100, en: 35, n: 'O teu carro', e: '🚗' } : { p: Math.max(300 + Math.round(d * 100 / 50) * 50, gasolinaCarro()), en: 2, n: 'O teu carro', e: '🚗' },
  autocarro: d => ({ p: 2000 + Math.round(d * 30 / 100) * 100, en: 40, n: 'Autocarro interprovincial', e: '🚌' }),
  aviao: d => ({ p: 15000 + Math.round(d * 150 / 1000) * 1000, en: 10, n: 'Avião', e: '✈️' }),
  comboio: () => ({ p: 4000, en: 25, n: 'Comboio', e: '🚂' }),
  barco: () => ({ p: 3000, en: 5, n: 'Barco', e: '🛥️' }),
  privado: () => ({ p: custoVoo(), en: 2, n: 'O teu avião', e: '🛩️' }),
  fretado: () => ({ p: 2500000, en: 2, n: 'Jato fretado', e: '✈️' }),   // economia C (2 nov): igual ao servidor (viajar 'fretado')   // 0aq: 0,01% do preço do avião (igual ao servidor: _custo_voo)
  boleia: d => d > 30 ? { p: 0, en: 45, n: 'Boleia de camionista', e: '👍' } : { p: 0, en: 12 + Math.round(d * 2), n: 'Boleia', e: '👍' },   // 27 out: só para quem não tem dinheiro nem para o mais barato
};
const AEROPORTOS = ['maianga', 'benguela', 'huambo', 'lubango', 'namibe', 'malanje', 'cabinda'];
const LINHAS = [['benguela', 'huambo', 'Caminho de Ferro de Benguela'], ['namibe', 'lubango', 'Caminho de Ferro de Moçâmedes'], ['viana', 'malanje', 'Caminho de Ferro de Luanda']];
const provDe = id => bairro(id)?.provincia || 'Luanda';
// quem não tem dinheiro nem para o candongueiro (ou o autocarro, para outra província) pode apanhar boleia — ninguém fica preso
function comBoleia(meios, d, dest) {
  const base = meios.filter(m => m === 'candongueiro' || m === 'autocarro');
  if (!base.length || ['mussulo', 'cabinda'].includes(dest) || ['mussulo', 'cabinda'].includes(J.bairro)) return meios;
  const barato = Math.min(...base.map(m => ajustarViagem(m, MEIOS[m](d), dest).p));
  return J.kumbu < barato ? [...meios, 'boleia'] : meios;
}
// dono 3 nov 20:53: destinos em cartões, 2 por linha, com uma fotografia do bairro (tirada no próprio jogo: tools/fotos_bairros.py)
// 0cz (7): com um só transporte, tocar no cartão viaja logo; com vários, abre os transportes em cartões (com fotografia, preço e energia)
function linhaDestino(b, meios, nota) {
  const a = bairro(J.bairro), d = Math.hypot(a.x - b.x, a.y - b.y), ms = comBoleia(meios, d, b.id);
  const xs = ms.map(m => [m, ajustarViagem(m, MEIOS[m](d), b.id)]), barato = Math.min(...xs.map(([, x]) => x.p));
  const foto = `<div class="dest-foto"><span class="e">${b.emoji}</span><img src="img/bairros/${esc(b.id)}.webp" alt="" loading="lazy" draggable="false"></div>`;
  if (ms.length === 1) {
    const [m, x] = xs[0], ok = J.kumbu >= x.p;   // 27 out: o cansaço nunca impede de viajar (chega-se exausto/a)
    const porque = ok ? (J.energia < x.en ? tr('Vais chegar exausto/a') : '') : tr('Faltam') + ' ' + fmtKz(x.p - J.kumbu);
    return `<button class="row dest-card" data-viajar="${b.id}" data-meio="${m}" ${ok ? '' : 'disabled'} title="${esc(porque || b.descricao || '')}">${foto}
      <div class="t"><b>${esc(b.nome)}</b>${nota ? `<small>${esc(nota)}</small>` : ''}</div>
      <span class="dest-preco">${x.e} ${m === 'boleia' ? esc(tr('Grátis')) : fmtKz(x.p)}${porque ? `<small>${esc(porque)}</small>` : ''}</span></button>`;
  }
  return `<button class="row dest-card" data-dest="${b.id}" data-meios="${ms.join(',')}" title="${esc(b.descricao || '')}">${foto}
    <div class="t"><b>${esc(b.nome)}</b>${nota ? `<small>${esc(nota)}</small>` : ''}</div>
    <span class="dest-preco">${esc(tr('desde'))} ${barato ? fmtKz(barato) : esc(tr('Grátis'))} ›</span></button>`;
}
// FILA 0dn-9 (dono 6 nov): Cemitério do Camama — campas das personagens que morreram e das figuras do bairro; pôr flores
async function campasCemiterio(div) {
  const { data, error } = await sb.rpc('cemiterio_campas');
  if (error || !data) { div.innerHTML = `<div class="empty">${esc(tr('Tenta outra vez daqui a pouco.'))}</div>`; return; }
  const campa = (c, sub) => `<div class="row"><span class="e">🪦</span><div class="t"><b>${esc(c.nome)}</b><small>${esc(sub)}${c.flores ? ` · 💐 ${c.flores}` : ''}</small></div><button class="btn sm ghost" data-flores="${esc(c.id)}">💐 ${esc(tr('Flores'))}</button></div>`;
  div.innerHTML = [...(data.jogadores || []).map(c => campa(c, tr('{0} anos · família de {1}').replace('{0}', c.idade ?? '?').replace('{1}', c.familia))),
  ...(data.bairro || []).map(c => campa(c, c.anos + ' · ' + tr(c.frase)))].join('') || `<div class="empty">${esc(tr('Ainda não há campas.'))}</div>`;
  div.querySelectorAll('[data-flores]').forEach(bt => bt.onclick = async () => { bt.disabled = true; if (await acao('cemiterio_flores', { p_campa: bt.dataset.flores })) campasCemiterio(div); else bt.disabled = false; });
}
// passo 2: os transportes para esse destino
function abrirMeiosDestino(dest, meios) {
  const b = bairro(dest); if (!b) return;
  const el = sheet(`<h3>${b.emoji} ${esc(b.nome)}</h3><p class="m">${esc(tr('Como vais até lá?'))}</p>${grelhaDestinos(meios.map(m => opcaoViagem(dest, m)))}`);
  el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = () => viajar(bt.dataset.viajar, bt.dataset.meio));
}
document.addEventListener('click', e => { const c = e.target.closest?.('[data-dest]'); if (c && c.dataset.meios) abrirMeiosDestino(c.dataset.dest, c.dataset.meios.split(',')); });
const grelhaDestinos = lista => `<div class="dest-grelha${lista.length === 1 ? ' um' : ''}">${lista.join('')}</div>`;
// 0aq: o avião mais barato que tens voa (0,01% do preço por viagem); o carro mais caro gasta mais gasolina (0,005%)
const meusItensCat = c => itensLar().map(id => D.itens?.find(i => i.id === id)).filter(i => i && i.categoria === c);
const custoVoo = () => { const a = meusItensCat('aviao').sort((x, y) => x.preco - y.preco)[0]; return a ? Math.max(1000, Math.round(a.preco * 0.0001 / 1000) * 1000) : 0; };
const gasolinaCarro = () => Math.max(0, ...meusItensCat('veiculo').filter(i => !['mota', 'scooter', 'superbike', 'candongueiro_ouro'].includes(i.id)).map(i => Math.round(i.preco * 0.00005 / 500) * 500));
const temAviaoProprio = () => itensLar().some(id => D.itens?.find(i => i.id === id)?.categoria === 'aviao');
// dono 6 nov: na paragem vêem-se só as cidades (cada uma uma vez); só depois de tocar numa aparecem os transportes
function meiosParaDestino(dest) {
  const aqui = provDe(J.bairro), mesma = provDe(dest) === aqui, ms = [];
  if (mesma) { ms.push('candongueiro', 'kupapata', 'taxi'); if (temMota()) ms.push('mota'); if (temCarro()) ms.push('carro'); }
  else { ms.push('autocarro'); if (temCarro()) ms.push('carro'); }
  if (temAviaoProprio()) ms.push('privado');
  const a = bairro(J.bairro), b = bairro(dest);
  return comBoleia(ms, Math.hypot(a.x - b.x, a.y - b.y), dest);
}
function cartaoCidade(b) {
  const foto = `<div class="dest-foto"><span class="e">${b.emoji}</span><img src="img/bairros/${esc(b.id)}.webp" alt="" loading="lazy" draggable="false"></div>`;
  const prov = provDe(b.id) !== provDe(J.bairro) ? b.provincia : '';
  return `<button class="row dest-card" data-dest="${b.id}" data-meios="${meiosParaDestino(b.id).join(',')}" title="${esc(b.descricao || '')}">${foto}
    <div class="t"><b>${esc(b.nome)}</b>${prov ? `<small>${esc(prov)}</small>` : ''}</div><span class="dest-preco">›</span></button>`;
}
function paragemHTML() {
  const aqui = provDe(J.bairro);
  if (J.bairro === 'mussulo') return `<p class="m">${esc(tr('Estás numa ilha! Para sair, apanha o barco no cais.'))}</p>` + grelhaDestinos([linhaDestino(bairro('ilha'), ['barco'])]);
  const perto = D.bairros.filter(b => b.id !== J.bairro && provDe(b.id) === aqui && b.id !== 'mussulo' && b.id !== 'cadeia');
  const longe = D.bairros.filter(b => provDe(b.id) !== aqui && b.id !== 'cabinda' && b.id !== 'mussulo' && b.id !== 'cadeia');
  const dica = (J.bairro !== 'ilha' && bairro('mussulo') && provDe('mussulo') === aqui) ? `<p class="m" style="margin-top:10px">🏝️ ${esc(tr('Queres ir ao Mussulo? Vai à Ilha e apanha o barco no Cais do Mussulo.'))}</p>` : '';
  return `<p class="m">${esc(tr('Para onde vais? Escolhe a cidade; a seguir escolhes o transporte.'))}</p>` +
    (perto.length ? grelhaDestinos(perto.map(cartaoCidade)) : '') + dica +
    (longe.length ? `<div class="sec"><h4>🗺️ ${esc(tr('Outras províncias'))}</h4></div>` + grelhaDestinos(longe.map(cartaoCidade)) : '');
}
function aeroportoHTML() {
  const voos = D.bairros.filter(b => AEROPORTOS.includes(b.id) && provDe(b.id) !== provDe(J.bairro));
  const fret = D.bairros.filter(b => b.id !== J.bairro && b.id !== 'cadeia');
  return `<p class="m">Voos domésticos. Caro, mas chegas descansado/a (−10 energia). Às vezes atrasa…</p>` + grelhaDestinos(voos.map(b => linhaDestino(b, ['aviao'], b.provincia))) +
    `<div class="sec" style="margin-top:14px"><h4>✈️ Jato fretado</h4><span>Para qualquer bairro</span></div><p class="m">Ainda não tens jato? Aluga um com piloto, só para esta viagem. Sem filas e sem contas por mês.</p>` +
    grelhaDestinos(fret.map(b => linhaDestino(b, ['fretado'], b.provincia)));
}
function estacaoHTML() {
  const l = LINHAS.find(x => x.includes(J.bairro)); if (!l) return '';
  const dest = bairro(l[0] === J.bairro ? l[1] : l[0]); if (!dest) return '';
  return `<div class="sec"><h4>🚂 Comboio</h4><span>${l[2]}</span></div><p class="m">Barato, devagar e com uma paisagem linda.</p>` + grelhaDestinos([linhaDestino(dest, ['comboio'])]);
}
function barcoHTML() {
  const dest = bairro(J.bairro === 'mussulo' ? 'ilha' : 'mussulo'); if (!dest) return '';
  return `<p class="m">Barcos para ${J.bairro === 'mussulo' ? 'a Ilha de Luanda' : 'o Mussulo'}. Com tempestade não saem.</p>` + grelhaDestinos([linhaDestino(dest, ['barco'])]);
}
// #26 sair de casa direto no teu carro ou avião
function veiculosLaFora() {
  const meus = itensLar().map(id => D.itens?.find(i => i.id === id)).filter(Boolean);
  const avioes = meus.filter(i => i.categoria === 'aviao').sort((a, z) => z.preco - a.preco);
  return { carros: meus.filter(i => i.categoria === 'veiculo').sort((a, z) => z.preco - a.preco).slice(0, 4), aviao: avioes[0] || null, avioes };
}
// 6 nov (Gold Exclusive C): acabamentos dos carros — os teus (J.acabamentos) e os do cônjuge com quem moras (vida.js → acabamentos_do_lar)
let acabConjuge = {};
function acabDe(id) { return { ...(acabConjuge[id] || {}), ...(J?.acabamentos?.[id] || {}) }; }
const idPintado = id => { const p = acabDe(id).pintura; return p ? `${id}__${p}` : id; };
function idVisual(id) { const v = idPintado(id); return v !== id && temModelo(v) ? v : id; }   // 2.5D: só se já houver fotografia
function assinaturaCarros() { try { return veiculosLaFora().carros.map(i => i.id + ':' + JSON.stringify(acabDe(i.id))).join(','); } catch { return ''; } }
// luz néon por baixo do carro (1×2 com o canto em x, y): mais forte à noite, a pulsar devagar
function brilhoNeon(ctx, cor, x, y, t) {
  const a = (0.3 + 1.4 * escuridao()) * (0.85 + 0.15 * Math.sin(t * 2.6));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = cor; ctx.shadowBlur = 22;
  ctx.globalAlpha = Math.min(0.9, a); losango(ctx, x - 0.12, y - 0.1, 1.24, 2.2, cor);
  ctx.globalAlpha = Math.min(0.6, a * 0.6); losango(ctx, x - 0.35, y - 0.3, 1.7, 2.6, cor);
  ctx.restore();
}
// dono 3 nov 21:13 («I can't see all of my planes and helicopters»): todos os aviões e helicópteros lá fora,
// cada um na sua pista, lado a lado à esquerda da casa (o mais caro mais perto). Igual no 2.5D e no 3D.
const PISTA_PASSO = 6;
function pistasLaFora() {
  if (cena?.tipo !== 'casa' || cena.andar || !ehMeuLar(cena.dono?.id) || !D.itens) return [];
  return veiculosLaFora().avioes.map((item, k) => ({ item, x: -7 + 0.5 - k * PISTA_PASSO, y: 0.5, L: Math.min(cena.H + 2, 9) }));
}
function veiculoLaFora(tx, ty) {
  if (cena?.tipo !== 'casa' || cena.andar || !ehMeuLar(cena.dono?.id)) return null;
  const W = cena.W, H = cena.H, v = veiculosLaFora();
  // carros: entrada da garagem, à direita da casa (desenhados em W+1.5, 0.3 + k·2.4)
  if (tx >= W && tx <= W + 3) for (let k = 0; k < v.carros.length; k++) { const y0 = Math.floor(0.3 + k * 2.4); if (ty >= y0 - 1 && ty <= y0 + 2) return 'carro'; }
  // avião: pista à esquerda da casa
  if (v.aviao && tx <= -1 && tx >= -8 - (v.avioes.length - 1) * PISTA_PASSO && ty >= 0 && ty <= Math.min(H + 2, 9) + 1) return 'privado';
  return null;
}
async function garagem(meio) {
  const aqui = provDe(J.bairro);
  let lista, ent = null;
  if (meio === 'privado') lista = D.bairros.filter(b => b.id !== J.bairro && b.id !== 'cadeia').map(b => linhaDestino(b, ['privado'], b.provincia));
  else {
    if (J.bairro === 'mussulo') return toast('Estás numa ilha: o carro fica na Ilha de Luanda. Apanha o barco no cais.', 'info', 5000);
    // dono 1 nov (bug): quem só tem mota tocava na mota e ia «de carro» → «Ainda não tens carro». Sem carro, vai de mota (só na mesma província).
    meio = temCarro() ? 'carro' : 'mota';
    const destinos = D.bairros.filter(b => b.id !== J.bairro && !['mussulo', 'cadeia', 'cabinda'].includes(b.id) && (meio === 'carro' || provDe(b.id) === aqui));
    // LL29: entrega pelo caminho — o destino do embrulho vem primeiro, marcado com 📦
    ({ data: ent } = await sb.rpc('minha_entrega'));
    const ord = [...destinos.filter(b => provDe(b.id) === aqui), ...destinos.filter(b => provDe(b.id) !== aqui)].sort((x, y) => (y.id === ent?.destino) - (x.id === ent?.destino));
    lista = ord.map(b => linhaDestino(b, [meio], b.id === ent?.destino ? `📦 ${tr('Entrega aqui')}: +${fmtKz(ent.pago)}` : provDe(b.id) !== aqui ? b.provincia : ''));
  }
  const entHTML = !ent ? '' : ent.destino
    ? `<div class="row entrega"><span class="e">📦</span><div class="t"><b>${tr('Embrulho para')} ${esc(bairro(ent.destino)?.nome || '')}</b><small>${tr('Paga quando chegares lá de carro ou mota. Vale 2 horas.')}</small></div><span class="price">+${fmtKz(ent.pago)}</span></div>`
    : `<button class="row entrega" id="bEntrega" ${ent.hoje >= ent.max ? 'disabled' : ''}><span class="e">📦</span><div class="t"><b>${tr('Fazer uma entrega pelo caminho')}</b><small>1.500–4.000 Kz · ${ent.hoje}/${ent.max} ${tr('hoje')}</small></div><span class="price">›</span></button>`;
  // 0k-B: levar contigo quem está em tua casa (convite; cada um aceita no seu telemóvel)
  const naCasa = cena?.tipo === 'casa' && meio !== 'mota' ? [...outros.entries()].filter(([id]) => !bloqueados.has(id)) : [];
  const maxi = meio === 'privado' ? 8 : 4, levar = new Set();
  const levarHTML = naCasa.length ? `<div class="sec"><h4>👥 ${tr('Levar contigo')}</h4><span>${tr('máx.')} ${maxi}</span></div><div class="levar">${naCasa.map(([id, o]) => `<button class="chip-levar" data-levar="${esc(id)}">${esc(o.nome || '?')}</button>`).join('')}</div><p class="m" style="margin:4px 0 10px">${tr('Escolhe quem vai contigo e depois o destino. Cada pessoa recebe o convite e aceita.')}</p>` : '';
  // Gold Exclusive C: personalizar os carros a partir da garagem
  const acabHTML = meio !== 'privado' && typeof meusCarros === 'function' && meusCarros().length ? `<button class="row" id="bAcab" style="margin-bottom:10px"><span class="e">✨</span><div class="t"><b>${tr('Personalizar o carro')}</b><small>${tr('Dourado, diamante, néon, matrícula')}</small></div><span class="price">›</span></button>` : '';
  const el = sheet(`<h3>${meio === 'privado' ? '🛩️ O teu avião' : meio === 'mota' ? '🛵 A tua mota' : '🚗 O teu carro'}</h3><p class="m">${meio === 'privado' ? 'Descolas da tua pista privada. Para onde vamos?' : 'Sais direto de casa. Para onde vamos?'}</p>${acabHTML ? `<div class="list">${acabHTML}</div>` : ''}${levarHTML}${entHTML ? `<div class="list" style="margin-bottom:10px">${entHTML}</div>` : ''}${grelhaDestinos(lista)}`);
  el.querySelectorAll('[data-levar]').forEach(b => b.onclick = () => {
    const id = b.dataset.levar;
    if (levar.has(id)) levar.delete(id); else if (levar.size < maxi) levar.add(id); else return toast(tr('Não cabe mais ninguém.'), 'info');
    b.classList.toggle('on', levar.has(id));
  });
  el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = async () => {
    if (levar.size) {
      const { data, error } = await sb.rpc('boleia_convidar', { p_ids: [...levar], p_destino: bt.dataset.viajar, p_meio: meio === 'privado' ? 'privado' : 'carro' });
      if (error) toast(limparErro(error.message), 'mau');
      else if (data?.convidados) { canal?.send({ type: 'broadcast', event: 'boleia', payload: { de: uid, para: [...levar] } }).catch(() => { }); toast(`👥 ${tr('Convite enviado')}: ${data.convidados}`, 'bom'); }
    }
    viajar(bt.dataset.viajar, bt.dataset.meio);
  });
  const ba = el.querySelector('#bAcab');
  if (ba) ba.onclick = () => {
    const cs = meusCarros(); if (cs.length === 1) return abrirAcabamentos(cs[0].id);
    const lista = sheet(`<h3>✨ ${tr('Personalizar o carro')}</h3>${acabamentosListaHTML()}`);
    lista.querySelectorAll('[data-acab]').forEach(b => b.onclick = () => abrirAcabamentos(b.dataset.acab));
  };
  const be = el.querySelector('#bEntrega');
  if (be) be.onclick = async () => { be.disabled = true; if (await acao('aceitar_entrega')) { fecharSheets(); garagem(meio); } else be.disabled = false; };
}
// 6 nov: «Ir para <bairro do emprego>» no telemóvel — o meio mais barato que tens (candongueiro, autocarro…), com confirmação
async function irTrabalhar() {
  const e = emprego(J.emprego); if (!e?.bairro || e.bairro === J.bairro) return;
  const m = meiosParaDestino(e.bairro)[0] || 'candongueiro';
  const nomeMeio = { candongueiro: 'candongueiro', kupapata: 'kupapata', taxi: 'táxi', autocarro: 'autocarro', carro: 'carro', mota: 'mota', privado: 'jato', boleia: 'boleia' }[m] || m;
  if (!await perguntar(tr('Ir para {0} de {1}? Ao chegar, toca em «Trabalhar».').replace('{0}', bairro(e.bairro).nome).replace('{1}', tr(nomeMeio)))) return;
  viajar(e.bairro, m);
}
async function viajar(dest, meio, opts = {}) {   // opts.com: aparência de quem vai contigo (desafios, encontros)
  fecharSheets();
  // a viagem vê-se por dentro (primeira pessoa), enquanto o servidor trata da viagem
  const fp = viagemPrimeiraPessoa(meio, bairro(dest).nome, opts);
  const r = await acao('viajar', { p_destino: dest, p_meio: meio });
  if (!r) { fp.fim(); return; }
  await fp.promessa;
  await irParaBairro(dest, true); toast(r.msg, 'info', 4500);
  // LL5: às vezes há um encontro à chegada (vem como uma escolha)
  if (typeof carregarDilemas === 'function') setTimeout(carregarDilemas, 1800);
}

/* ============================================================
   CASA: MODO DECORAÇÃO
   ============================================================ */
$('#bDeco').onclick = () => deco ? sairDeco() : entrarDeco();
if ($('#bPorta')) $('#bPorta').onclick = async () => {   // FILA 0dn-5 (6 nov: página antiga em cache sem o botão parava o jogo todo)
  const ab = !!(J.lar ? cena?.dono?.casa_aberta : J.casa_aberta);
  if (!ab && !await perguntar(tr('Deixar as portas abertas? Qualquer pessoa pode entrar em tua casa, mesmo quando não estás. Não podem mexer em nada.'), '🔓 ' + tr('Abrir'))) return;
  const r = await acao('casa_porta', { p_aberta: !ab });
  if (r) { if (J.lar && cena?.dono) cena.dono.casa_aberta = !ab; else J.casa_aberta = !ab; hud(); }
};
$('#bVeic').onclick = () => {
  const v = veiculosLaFora();
  if (v.carros.length && v.aviao) {
    const el = sheet(`<h3>${tr('Viajar')}</h3><div class="grelha"><button data-g="carro"><span class="e">🚗</span><span>${tr('O teu carro')}</span></button><button data-g="privado"><span class="e">🛩️</span><span>${tr('O teu avião')}</span></button></div>`);
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { fecharSheets(); garagem(b.dataset.g); });
  } else garagem(v.aviao ? 'privado' : 'carro');
};
function entrarDeco() {
  if (cena?.tipo !== 'casa' || !podeMexer(cena.dono.id)) return;
  deco = { sel: null };
  $('#barraBaixo').classList.add('hide'); $('#deco').classList.remove('hide');
  renderDeco();
}
function corPendente() {   // um móvel da casa com uma cor escolhida mas ainda não gravada: grava-a e mostra-a já
  const s = deco?.sel; if (!s || s.novo || (s.cor || null) === (s.cor0 || null)) return;
  gravarCor(s); s.cor0 = s.cor;
  const m = (cena._mob || []).find(x => x.id === s.mbId); if (m) m.cor = s.cor;
  const o = cena.objetos.find(o => o.mb?.id === s.mbId); if (o) o.mb.cor = s.cor;
}
function sairDeco() { corPendente(); deco = null; $('#deco').classList.add('hide'); $('#barraBaixo').classList.remove('hide'); hud(); }
function movelDe(id) { return D.moveis.find(m => m.id === id); }
function renderDeco() {
  if (!deco) return;   // (pode chegar depois de se fechar o decorar, quando uma gravação acaba)
  const el = $('#deco');
  const guardados = minhaMobilia.filter(m => m.x == null);
  if (deco.sel) {
    const mv = movelDe(deco.sel.movel), ok = posicaoValida(deco.sel);
    el.innerHTML = `<div class="hd">${miniaturaHTML('movel', mv.id, 'mini sm')}<b>${esc(mv.nome)}</b><span style="font-size:12px;color:var(--muted)">Toca no chão para mover</span></div>
      <div class="acoesDeco"><button class="btn ghost" id="dRodar">↻ Rodar</button><button class="btn" id="dPor" ${ok ? '' : 'disabled'}>✔ Pôr aqui</button>
      ${deco.sel.novo ? '' : '<button class="btn ghost" id="dGuardar">📦 Guardar</button>'}<button class="btn ghost" id="dVender">💰 ${tr('Vender')} · ${fmtKz(Math.floor(mv.preco / 2))}</button><button class="btn ghost" id="dCancel">✕</button></div>`;
    $('#dRodar').onclick = () => { deco.sel.rot = ((deco.sel.rot || 0) + 1) % 4; ajustarRodado(); renderDeco(); };
    $('#dPor').onclick = async () => {
      const s = deco?.sel; if (!s) return; const r = await acao('colocar_movel', { p_id: s.mbId, p_x: s.x, p_y: s.y, p_rot: s.rot, p_andar: cena.andar || 0, ...(cena.prop ? { p_prop: cena.prop } : { p_dono: cena.dono.id }) });
      if (r) await gravarCor(s);
      if (r) { if (deco) deco.sel = null; await depoisDeMudarMobilia(); }
    };
    $('#dGuardar') && ($('#dGuardar').onclick = async () => { const s = deco?.sel; if (!s) return; const r = await acao('guardar_movel', { p_id: s.mbId }); if (r) { await gravarCor(s); if (deco) deco.sel = null; await depoisDeMudarMobilia(); } });
    $('#dVender').onclick = async () => { const s = deco?.sel; if (!s || !await perguntar(`Vender ${mv.nome} por ${fmtKz(Math.floor(mv.preco / 2))}?`)) return; const r = await acao('vender_movel', { p_id: s.mbId }); if (r) { if (deco) deco.sel = null; await depoisDeMudarMobilia(); } };
    $('#dCancel').onclick = () => { deco.sel = null; renderDeco(); };
    {
      const CORES = ['#cc092f', '#e86aa6', '#f5b81c', '#2f8f5b', '#16a3a3', '#2c6fb0', '#7a1fd0', '#141012', '#f5f1e8', '#8a5a32', '#d4af37', '#9aa0a6'];
      const cx = document.createElement('div'); cx.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center';
      const aSel = c => (deco.sel.cor || '') === c;
      cx.innerHTML = `<small style="color:var(--muted)">Cor:</small>` + CORES.map(c => `<button data-cor="${c}" aria-label="${c}" style="width:26px;height:26px;border-radius:50%;border:${aSel(c) ? '3px solid var(--gold)' : '2px solid #fff3'};background:${c}"></button>`).join('') + `<button class="btn sm ${aSel('') ? '' : 'ghost'}" data-cor="">Original</button>`;
      el.appendChild(cx);
      // #28: muda logo no ecrã; grava-se ao carregar em "Pôr aqui" (ou Guardar); ✕ desfaz
      // 27 out (0g-B): a cor escolhida também se grava ao carregar em «Feito» ou ao escolher outro móvel (antes voltava à cor antiga)
      cx.querySelectorAll('[data-cor]').forEach(b => b.onclick = () => { const s = deco?.sel; if (!s) return; s.cor = b.dataset.cor || null; renderDeco(); });
    }
    return;
  }
  el.innerHTML = `<div class="hd"><b>🔨 Decorar</b><button class="btn sm ghost" id="dLoja">🛒 Comprar</button><button class="btn sm ghost" id="dPintar">🎨 Paredes</button><button class="btn sm" id="dSair">Feito</button></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${guardados.length ? 'Escolhe um móvel do armazém, ou toca num móvel da casa para o mudar.' : 'Toca num móvel da casa para o mudar, ou carrega em 🛒 Comprar para encomendar mais.'}</div>
    ${(() => { // 0dc-4: os móveis das outras casas ficam lá postos; daqui trazes para o armazém
      if (cena.prop || donoLar()) return '';
      const aqui = J.propriedade ? 'p:' + J.propriedade : 'r:' + uid + ':' + J.casa;
      return minhaMobilia.some(m => m.x != null && m.lugar && m.lugar !== aqui) ? `<button class="btn sm ghost" id="dRecolher" style="margin-bottom:6px">📦 ${tr('Trazer os móveis das outras casas')}</button>` : '';
    })()}
    ${guardados.length ? gruposMoveis(guardados, ms => `<div class="inv">${ms.map(m => { const mv = movelDe(m.movel); return `<button data-mb="${m.id}">${miniaturaHTML('movel', mv.id)}${esc(mv.nome)}</button>`; }).join('')}</div>`) : '<div class="inv"><span class="empty" style="padding:6px">Armazém vazio — carrega em 🛒 Comprar</span></div>'}`;
  $('#dSair').onclick = sairDeco;
  $('#dRecolher') && ($('#dRecolher').onclick = async () => { if (await acao('recolher_moveis')) { await carregarMinhaMobilia(); renderDeco(); } });
  $('#dPintar').onclick = abrirPintura;
  $('#dLoja').onclick = () => abrirTelemovel('loja');
  el.querySelectorAll('[data-mb]').forEach(b => b.onclick = () => {
    const m = minhaMobilia.find(x => x.id == b.dataset.mb);
    const livre = livreProximo(cena.bloq, cena.W, cena.H, Math.floor(eu.x), Math.floor(eu.y)) || [1, 1];
    deco.sel = { mbId: m.id, movel: m.movel, x: Math.min(livre[0], cena.W - 1), y: Math.min(livre[1] + 1, cena.H - 1), rot: 0, novo: true, cor: m.cor || null, cor0: m.cor || null };
    renderDeco();
  });
}
async function gravarCor(s) {
  if (!s || (s.cor || null) === (s.cor0 || null)) return;
  const { error } = await sb.rpc('pintar_movel', { p_id: s.mbId, p_cor: s.cor || null });
  if (error) toast(limparErro(error.message), 'mau');
}
async function depoisDeMudarMobilia() {
  await carregarMinhaMobilia(); if (cena?.fonte) cena._mob = await mobiliaDaCena(cena.fonte); recarregarCasa(); renderDeco();
  if (cena?.dono) canal?.send({ type: 'broadcast', event: 'mobilia', payload: { dono: cena.dono.id } });   // (o jogador pode já ter saído de casa)
}
function dimsSel(s) { const mv = movelDe(s.movel), r = (s.rot || 0) % 2; return [r ? mv.d : mv.w, r ? mv.w : mv.d, mv]; }
// depois de rodar, manter o móvel dentro da casa
function ajustarRodado() { const [w, d] = dimsSel(deco.sel); deco.sel.x = Math.max(0, Math.min(cena.W - w, deco.sel.x)); deco.sel.y = Math.max(0, Math.min(cena.H - d, deco.sel.y)); }
function posicaoValida(s) {
  const [w, d, mv] = dimsSel(s), W = cena.W, H = cena.H;
  if (s.x < 0 || s.y < 0 || s.x + w > W || s.y + d > H) return false;
  if (!cena.andar && !mv.pisavel && W - 2 >= s.x && W - 2 < s.x + w && 0 >= s.y && 0 < s.y + d) return false;
  for (let x = s.x; x < s.x + w; x++) for (let y = s.y; y < s.y + d; y++) if (cena.ocupado?.has(x + ',' + y)) return false;
  for (const m of cena._mob || []) {
    if (m.x == null || m.id === s.mbId || (m.andar || 0) !== (cena.andar || 0)) continue;
    const o = movelDe(m.movel); if (o.pisavel !== mv.pisavel) continue;
    const ow = m.rot % 2 ? o.d : o.w, od = m.rot % 2 ? o.w : o.d;
    if (m.x < s.x + w && s.x < m.x + ow && m.y < s.y + d && s.y < m.y + od) return false;
  }
  return true;
}
// decorar em 3D: tocar num móvel escolhe-o; com um escolhido, tocar no chão leva-o para lá (as mesmas regras e a mesma gravação do desenho clássico)
function escolherDeco(o) {
  if (!o.mb || !movelDe(o.mb.movel)) return;
  if (!meuMovel(o.mb)) { toast('Este móvel é do senhorio: podes usá-lo, mas não mexer nele.', 'info'); return; }
  corPendente();
  deco.sel = { mbId: o.mb.id, movel: o.mb.movel, x: o.mb.x, y: o.mb.y, rot: o.mb.rot, novo: false, cor: o.mb.cor || null, cor0: o.mb.cor || null }; renderDeco();
}
function tocarDeco3D(h) {
  if (!deco.sel) {
    let o = h.obj && h.obj.kind === 'movel' ? h.obj : null;
    if (!o && h.tile) o = cena.objetos.find(x => x.kind === 'movel' && x.pisavel && h.tile[0] >= x.x && h.tile[0] < x.x + x.w && h.tile[1] >= x.y && h.tile[1] < x.y + x.d);
    if (o) escolherDeco(o);
    return;
  }
  if (!h.tile) return;
  const [w, d] = dimsSel(deco.sel);
  deco.sel.x = Math.max(0, Math.min(cena.W - w, h.tile[0] - Math.floor((w - 1) / 2)));
  deco.sel.y = Math.max(0, Math.min(cena.H - d, h.tile[1] - Math.floor((d - 1) / 2)));
  renderDeco();
}
function tocarDeco(wx, wy, tx, ty) {
  // tocar num móvel colocado → selecionar
  if (!deco.sel) {
    for (let i = ordemDesenho.length - 1; i >= 0; i--) { const o = ordemDesenho[i].o; if (o.kind === 'movel' && dentro([wx, wy], silhueta(o))) { if (!meuMovel(o.mb)) { toast('Este móvel é do senhorio: podes usá-lo, mas não mexer nele.', 'info'); return; } deco.sel = { mbId: o.mb.id, movel: o.mb.movel, x: o.mb.x, y: o.mb.y, rot: o.mb.rot, novo: false, cor: o.mb.cor || null, cor0: o.mb.cor || null }; renderDeco(); return; } }
    const tap = cena.objetos.find(o => o.kind === 'movel' && o.pisavel && tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.d);
    if (tap && !meuMovel(tap.mb)) { toast('Este móvel é do senhorio: podes usá-lo, mas não mexer nele.', 'info'); return; }
    if (tap) { deco.sel = { mbId: tap.mb.id, movel: tap.mb.movel, x: tap.mb.x, y: tap.mb.y, rot: tap.mb.rot, novo: false, cor: tap.mb.cor || null, cor0: tap.mb.cor || null }; renderDeco(); }
    return;
  }
  const [w, d] = dimsSel(deco.sel);
  deco.sel.x = Math.max(0, Math.min(cena.W - w, tx - Math.floor((w - 1) / 2)));
  deco.sel.y = Math.max(0, Math.min(cena.H - d, ty - Math.floor((d - 1) / 2)));
  renderDeco();
}
function desenhaGrelhaDeco() {
  ctx.globalAlpha = 0.25;
  for (let y = 0; y < cena.H; y++) for (let x = 0; x < cena.W; x++) losango(ctx, x, y, 1, 1, null, 0, '#ffffff');
  ctx.globalAlpha = 1;
  if (cena.saida) losango(ctx, cena.saida[0], 0, 1, 1, 'rgba(204,9,47,.25)');
  // escada: não se pode pôr móveis em cima
  const e = cena.casa?.planta?.escada; if (e) losango(ctx, e[0], e[1], e[2], e[3], 'rgba(204,9,47,.2)');
}
function desenhaFantasma(t) {
  const s = deco.sel, [w, d, mv] = dimsSel(s), ok = posicaoValida(s);
  losango(ctx, s.x, s.y, w, d, ok ? 'rgba(76,191,116,.35)' : 'rgba(204,9,47,.4)', 0, ok ? '#4cbf74' : '#cc092f');
  ctx.globalAlpha = 0.85; desenhaMovelId(ctx, mv.id, mv.tipo, s.x, s.y, w, d, s.rot, s.cor || mv.cor, t, s.cor); ctx.globalAlpha = 1;
}
function abrirPintura() {
  let parede = cena.dono.parede || '#e9dcc4', chao = cena.dono.chao || 'cimento';
  const render = () => {
    const el = sheet(`<h3>🎨 Paredes e chão</h3><p class="m">Cada mudança custa 500 Kz de tinta e material.</p>
      <div class="sec"><h4>Cor das paredes</h4></div><div class="cores">${CORES_PAREDE.map(c => `<button data-p="${c}" class="${c === parede ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <div class="sec"><h4>Chão</h4></div><div class="tabs" style="flex-wrap:wrap">${Object.keys(CHAOS).map(k => `<button data-c="${k}" class="${k === chao ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
      <button class="btn full" id="aplicar">Aplicar · 500 Kz</button>`);
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { parede = b.dataset.p; preview(); render(); });
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { chao = b.dataset.c; preview(); render(); });
    el.querySelector('#aplicar').onclick = async () => {
      const r = await acao('decorar', { p_parede: parede, p_chao: chao });
      if (r) { fecharSheets(); cena.dono.parede = parede; cena.dono.chao = chao; recarregarCasa(); canal?.send({ type: 'broadcast', event: 'mobilia', payload: { dono: cena.dono.id, parede, chao } }); if (casal && cena.dono.id === casal.id) { casal.parede = parede; casal.chao = chao; } }
    };
  };
  const preview = () => { cena.parede = parede; cena.chao = chao; construirChao(); };
  render();
}

/* ============================================================
   PESSOAS, TELEMÓVEL, PERFIL
   ============================================================ */
// tocarPessoa está em js/vida.js

$('#bTel').onclick = () => (telAberto ? fecharTelemovel() : abrirTelemovel());
$('#bCasa').onclick = () => {
  if (cena.tipo === 'casa' || cena.tipo === 'interior') return cena.saida ? andarPara(eu, cena.saida[0], cena.saida[1], sairDeCasa) : sairDeCasa();
  const lar = meuLar();
  if (!lar) return folhaSemCasa();
  const c = casaDe(lar.casa);
  if (c.bairro !== J.bairro) return folhaLonge(c.bairro);
  const o = cena.objetos.find(o => o.spec?.acao?.some(a => a.t === 'casa' && a.id === lar.casa));
  if (!o) return;
  andarPara(eu, o.porta[0], o.porta[1], () => irParaCasa(lar));
};

// 27 out (FILA 0g-A): longe de casa nunca se fica preso — o caminho para casa e um sítio para dormir aqui mesmo
function rotaPara(dest) {
  const aqui = provDe(J.bairro), longe = provDe(dest) !== aqui;
  if (J.bairro === 'mussulo') return { dest: 'ilha', meios: ['barco'], nota: tr('Primeiro o barco para a Ilha') };
  if (dest === 'mussulo') return J.bairro === 'ilha' ? { dest, meios: ['barco'] } : { dest: 'ilha', meios: ['candongueiro', 'kupapata', 'taxi'], nota: tr('Primeiro até à Ilha; daí, o barco') };
  if (dest === 'cabinda' || J.bairro === 'cabinda') return AEROPORTOS.includes(J.bairro) ? { dest, meios: ['aviao'] } : { dest: 'maianga', meios: ['candongueiro', 'kupapata', 'taxi'], nota: tr('Primeiro até ao aeroporto (Maianga)') };
  const meios = longe ? ['autocarro'] : ['candongueiro', 'kupapata', 'taxi'];
  if (!longe && temMota()) meios.push('mota'); if (temCarro()) meios.push('carro');
  if (longe && AEROPORTOS.includes(J.bairro) && AEROPORTOS.includes(dest)) meios.push('aviao');
  return { dest, meios };
}
// 0an (dono, 30 out): «I have a plane and a driver, why do i have to take public transport» — o teu transporte vem primeiro
// (motorista, avião, carro, mota), o transporte público por baixo; cada opção com imagem grande, nome e preço (menos texto para ler).
function opcaoViagem(dest, m, titulo) {
  const a = bairro(J.bairro), b = bairro(dest), d = Math.hypot(a.x - b.x, a.y - b.y), x = ajustarViagem(m, MEIOS[m](d), dest), ok = J.kumbu >= x.p;
  const nota = ok ? (J.energia < x.en ? tr('Vais chegar exausto/a') : x.en <= 3 ? tr('Quase sem cansaço') : '') : tr('Faltam') + ' ' + fmtKz(x.p - J.kumbu);
  // 0cz (7): cartão com a fotografia do transporte (o teu carro/mota/avião, ou a viagem por dentro: tools/fotos_meios.py)
  return `<button class="row dest-card viagemOp" data-viajar="${dest}" data-meio="${m}" ${ok ? '' : 'disabled'} title="${esc(nota)}">
    <div class="dest-foto"><span class="e">${x.e}</span><img src="${fotoMeio(m)}" alt="" loading="lazy" draggable="false"></div>
    <div class="t"><b>${esc(tr(titulo || x.n))}</b><small>⚡ −${x.en} ${esc(tr('energia'))}${DICA_MEIO[m] ? ' · ' + esc(tr(DICA_MEIO[m])) : ''}</small>${nota ? `<small>${esc(nota)}</small>` : ''}</div>
    <span class="dest-preco">${m === 'boleia' ? tr('Grátis') : fmtKz(x.p)}</span></button>`;
}
const DICA_MEIO = {
  candongueiro: 'barato, mas há engarrafamento', kupapata: 'rápido, mas arriscado', taxi: 'confortável', autocarro: 'viagem longa', comboio: 'devagar, paisagem linda',
  barco: 'com tempestade não sai', aviao: 'chegas descansado/a', fretado: 'jato com piloto, só para ti', privado: 'só pagas o combustível', boleia: 'para quem não tem dinheiro'
};
function fotoMeio(m) {
  const meu = c => meusItensCat(c).sort((x, y) => y.preco - x.preco);
  const id = m === 'carro' ? meu('veiculo').find(i => !['mota', 'scooter', 'superbike', 'candongueiro_ouro'].includes(i.id))?.id
    : m === 'mota' ? meu('veiculo').find(i => ['superbike', 'mota', 'scooter'].includes(i.id))?.id
      : m === 'privado' ? meu('aviao')[0]?.id : null;
  return id && MOD3D.idx?.[id]?.mini ? `img/modelos/${id}_mini.webp` : `img/meios/${m === 'privado' ? 'fretado' : m === 'mota' ? 'kupapata' : m === 'carro' ? 'taxi' : m}.webp`;
}
async function folhaLonge(destCasa) {
  const r = rotaPara(destCasa), pobre = J.kumbu < 2500, b = bairro(destCasa);
  const { data: emp } = await sb.from('empregados_casa').select('tipo');
  const motorista = (emp || []).some(e => e.tipo === 'motorista') && temCarro();
  const agua = ['mussulo', 'cabinda'].includes(destCasa) || ['mussulo', 'cabinda'].includes(J.bairro);   // atravessar água: só barco ou avião
  const meus = [];
  if (temAviaoProprio()) meus.push(opcaoViagem(destCasa, 'privado', 'O teu avião'));
  if (!agua && motorista) meus.push(opcaoViagem(destCasa, 'carro', 'O teu motorista leva-te'));
  else if (!agua && temCarro()) meus.push(opcaoViagem(destCasa, 'carro', 'O teu carro'));
  if (!agua && temMota() && provDe(destCasa) === provDe(J.bairro)) meus.push(opcaoViagem(destCasa, 'mota', 'A tua mota'));
  const publico = comBoleia(r.meios.filter(m => !['carro', 'mota'].includes(m)), Math.hypot(bairro(J.bairro).x - bairro(r.dest).x, bairro(J.bairro).y - bairro(r.dest).y), r.dest)
    .map(m => opcaoViagem(r.dest, m));
  const el = sheet(`<h3>🏠 ${tr('A tua casa fica em')} ${esc(b.nome)}</h3>
    ${meus.length ? `<div class="sec"><h4>⭐ ${tr('O teu transporte')}</h4></div>${grelhaDestinos(meus)}` : ''}
    <div class="sec"><h4>🚏 ${tr(meus.length ? 'Ou transporte público' : 'Transporte público')}</h4>${r.nota ? `<span>${esc(r.nota)}</span>` : ''}</div>
    ${grelhaDestinos(publico)}
    <div class="sec"><h4>🛏️ ${tr('Dormir aqui')}</h4></div>
    <button class="btn full ghost" id="bPensao">${pobre ? '🪑 ' + tr('Dormir no banco da paragem') : '🛏️ ' + tr('Dormir na pensão') + ' · 2.500 Kz'}</button>`);
  el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = () => viajar(bt.dataset.viajar, bt.dataset.meio));
  el.querySelector('#bPensao').onclick = async () => { fecharSheets(); await acao('dormir'); };
}
function folhaSemCasa() {
  const el = sheet(`<h3>🏠 ${tr('Ainda não tens casa')}</h3><p class="m">${tr('Procura um prédio ou quintal para arrendar. Até lá, dormes em casa da tua família.')}</p>
    <button class="btn full" id="bFamilia">🛏️ ${tr('Dormir em casa da família')}</button>`);
  el.querySelector('#bFamilia').onclick = async () => { fecharSheets(); await acao('dormir'); };
}
let telSub = 'eu';
// 6 nov: recurso à CFB (contas de quinta) — no topo do Perfil e aberto sozinho uma vez por sessão a quem ainda não recorreu
function abrirRecursoCfb() {
  if (!J?.cfb_em || J.cfb_recurso_em) return;
  const el = sheet(`<h3>🏛️ ${esc(tr('Recorrer à CFB'))}</h3><p class="m">${esc(tr('A CFB (Comissão de Fiscalização da Banda) apreendeu o que veio de contas falsas. Se achas que é engano, explica porquê. Só podes recorrer uma vez.'))}</p>
    <textarea id="cfbTexto" maxlength="600" rows="5" style="width:100%;box-sizing:border-box;border-radius:10px;padding:10px;font:inherit"></textarea>
    <button class="btn full" id="cfbEnviar" style="margin-top:10px">${esc(tr('Enviar recurso'))}</button>`);
  el.querySelector('#cfbEnviar').onclick = async () => {
    const r = await acao('cfb_recorrer', { p_texto: el.querySelector('#cfbTexto').value });
    if (r) { J.cfb_recurso_em = new Date().toISOString(); if (telAberto && typeof fecharSheetsTel === 'function') fecharSheetsTel(); else fecharSheets(); if (telAberto && telSub === 'eu') abrirTelemovel('eu'); }
  };
}
let _cfbAberto = false, _cfbEspera = null;
function talvezRecursoCfb() {   // espera o jogo carregado e nenhuma janela aberta; abre uma vez por sessão
  if (_cfbAberto || _cfbEspera) return;
  _cfbEspera = setInterval(() => {
    if (!J?.cfb_em || J.cfb_recurso_em) { clearInterval(_cfbEspera); _cfbEspera = null; return; }
    if (!document.querySelector('#carregar.hide') || document.querySelector('.veil, .tel-modal, .pergunta, #nomeForcado') || telAberto) return;
    clearInterval(_cfbEspera); _cfbEspera = null; _cfbAberto = true; abrirRecursoCfb();
  }, 3000);
}
setInterval(() => { if (J?.cfb_em && !J.cfb_recurso_em && !_cfbAberto) talvezRecursoCfb(); }, 5000);   // o jogador do arranque não passa pelo setJogador
// 6 nov (dono: «they will be given a right to appeal though, and this time make sure the appeal actually works»):
// conta suspensa → janela por cima de tudo com o motivo e o recurso (o servidor aceita-o com a conta suspensa)
async function mostrarSuspensao() {
  $('#carregar')?.classList.add('hide');
  const { data: s } = await sb.rpc('minha_suspensao');
  const v = document.createElement('div'); v.id = 'suspensao';
  v.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:rgba(10,8,12,.92);display:grid;place-items:center;padding:16px';
  const pendente = s?.recurso === 'novo';
  v.innerHTML = `<div class="sheet" style="position:relative;max-width:460px;width:100%;margin:auto;border-radius:20px">
    <h3>⛔ ${esc(tr('A tua conta foi suspensa'))}</h3>
    ${s?.motivo ? `<p class="m"><b>${esc(tr('Motivo'))}:</b> ${esc(tr(s.motivo))}</p>` : ''}
    <p class="m">${esc(tr(pendente ? 'Recebemos o teu recurso. Vamos rever e responder-te aqui.' : 'Se achas que é engano, explica porquê. Vamos rever o teu caso.'))}</p>
    ${pendente ? '' : `<textarea id="suspTexto" maxlength="800" rows="5" style="width:100%;box-sizing:border-box;border-radius:10px;padding:10px;font:inherit"></textarea>
    <button class="btn full" id="suspEnviar" style="margin-top:10px">${esc(tr('Enviar recurso'))}</button>`}
    <button class="btn full ghost" id="suspSair" style="margin-top:8px">${esc(tr('Sair da conta'))}</button></div>`;
  document.body.appendChild(v);
  v.querySelector('#suspSair').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  const env = v.querySelector('#suspEnviar');
  if (env) env.onclick = async () => {
    env.disabled = true;
    const { data, error } = await sb.rpc('recorrer_suspensao', { p_texto: v.querySelector('#suspTexto').value });
    if (error) { toast(limparErro(error.message), 'mau'); env.disabled = false; return; }
    toast(data?.msg || tr('Recurso enviado.'), 'bom'); v.remove(); mostrarSuspensao();
  };
}
// 6 nov: aviso a todos (uma vez por aparelho) — quintas de contas e várias contas = suspensão, com direito a recurso
function avisoQuintas() {
  // 7 nov (dono: «please only show people once»): fica guardado no aparelho E na conta
  try { if (localStorage.getItem('vel_aviso_quintas_1')) return; } catch { }
  const espera = setInterval(() => {
    if (!J || !document.querySelector('#carregar.hide') || document.querySelector('.veil, .tel-modal, .pergunta, #nomeForcado, #suspensao') || telAberto) return;
    clearInterval(espera);
    try { localStorage.setItem('vel_aviso_quintas_1', '1'); } catch { }
    if ((J.avisos_vistos || []).includes('quintas')) return;
    sb.rpc('aviso_visto', { p_aviso: 'quintas' }).then(() => { }, () => { });
    J.avisos_vistos = [...(J.avisos_vistos || []), 'quintas'];
    sheet(`<h3>⚠️ ${esc(tr('Aviso importante'))}</h3><p class="m">${esc(tr('Contas de quinta (muitas contas falsas para juntar dinheiro) vão ser desativadas sem aviso. Cada aparelho pode ter no máximo 3 contas. Se a tua conta for desativada por engano, podes recorrer na própria conta.'))}</p><button class="btn full" data-fechar>${esc(tr('Percebi'))}</button>`);
  }, 3000);
}
setTimeout(avisoQuintas, 4000);
async function abrirTelemovel(sub, extra) {
  if (!J) return;   // 6 nov: saíste (ou a sessão foi para outro aparelho) — nada para mostrar
  document.querySelectorAll('.veil, .tel-modal').forEach(v => v.remove());
  if (!sub) { telSub = null; return telHome(); }
  if (sub === 'loja' && telSub !== 'loja' && typeof lojaSecoes !== 'undefined') lojaSecoes = true;   // 8 nov: a loja abre nas secções
  telSub = sub;
  const body = telApp(sub);
  if (telSub === 'tempo') return renderTempo(body);
  if (telSub === 'universidade') return renderUniversidade(body);
  if (telSub === 'dinheiro') return renderGuiaDinheiro(body);   // 0gj
  if (telSub === 'empregados') return renderEmpregados(body);
  if (telSub === 'saude') return renderSaude(body);
  if (telSub === 'justica') return renderJustica(body);
  if (telSub === 'governo') return renderGoverno(body);
  if (telSub === 'objetivos') return renderObjetivos(body);
  if (telSub === 'muxima') return renderMuxima(body);
  if (telSub === 'jornal') return renderJornal(body);
  if (telSub === 'mensagens') return renderMensagensTabs(body);
  if (telSub === 'noticias') {
    if (typeof ui2 === 'function' && ui2()) return ui2Noticias(body);   // 8 nov: redesenho (teste)
    marcarLidas();
  }
  if (telSub === 'canal') return renderCanal(body);
  if (telSub === 'ajuda' && typeof ui2 === 'function' && ui2()) {
    if (!window._ajudaTudo) { ajudaTema = null; return typeof renderAjudaNova === 'function' ? renderAjudaNova(body) : ui2Ajuda(body); }   // 0gm (10 nov): Ajuda redesenhada
    window._ajudaTudo = false; setTimeout(() => ui2AjudaVoltar(body), 0);
  }   // 8 nov: redesenho (teste)
  if (telSub === 'social') return renderSocial(body);
  if (telSub === 'familia') return renderFamilia(body);
  if (telSub === 'grupos') return renderGrupos(body);
  if (telSub === 'banco') return renderBanco(body);
  if (telSub === 'imoveis') return renderImoveis(body);
  if (telSub === 'empresas') return renderEmpresas(body);
  if (telSub === 'dolares') return renderDolares(body);
  if (telSub === 'sorte') return renderSorte(body);
  if (telSub === 'bandabet') { fecharTelemovel(); return typeof abrirBandaBet === 'function' && abrirBandaBet(); }
  if (telSub === 'lavras') return renderLavras(body);
  if (telSub === 'ranking' && await renderRanking(body)) return;
  if (telSub === 'admin') return renderAdmin(body);
  if (telSub === 'eu' && J.empresa_id && minhaEmpresaTrab?.id !== J.empresa_id) await carregarTrabEmp();
  if (telSub === 'eu') {
    const e = J.emprego ? emprego(J.emprego) : null, c = J.casa ? casaDe(J.casa) : null;
    body.innerHTML = `${J.cfb_em ? `<button class="row ${J.cfb_recurso_em ? '' : 'mine'}" id="bCfb" style="text-align:left;margin-bottom:12px;width:100%" ${J.cfb_recurso_em ? 'disabled' : ''}><span class="e">🏛️</span><div class="t"><b>${esc(tr(J.cfb_recurso_em ? 'Recurso enviado à CFB' : 'Recorrer à CFB'))}</b><small>${esc(tr(J.cfb_recurso_em ? 'A CFB vai responder aqui no jogo.' : 'Achas que a CFB se enganou? Explica porquê.'))}</small></div><span class="price">${J.cfb_recurso_em ? '✓' : '›'}</span></button>` : ''}<div id="meusRoubos"></div><div style="display:flex;gap:14px;align-items:center"><canvas id="pvEu" width="160" height="200" style="width:80px;height:100px;border-radius:12px;background:var(--card)"></canvas>
      <div><h3>${esc(J.nome)}</h3><p class="m" style="margin:0">${e ? esc(e.nome) : 'Desempregado'}</p><p class="m" style="margin:2px 0 0">${c ? (J.propriedade ? (J.renda_paga_ate ? `🏠 ${esc(c.nome)} · arrendada a um jogador` : `🔑 ${esc(c.nome)} · casa própria`) : `🏠 ${esc(c.nome)} · ${fmtKz(c.renda)}/dia`) : donoLar() ? `🏠 Casa de ${esc(casal.nome)} (partilhada)` : '🛋️ Sem casa'}</p></div></div>
      ${blocoCasal()}
      ${chipsVida()}
      ${blocoCarreira()}
      ${blocoCorpo()}
      ${blocoPosses()}
      <div id="coroasTycoon"></div><div id="meuRegisto"></div>
      <div class="chips"><span class="chip">🎓 Estudo ${J.estudo}</span><span class="chip">⭐ Reputação ${J.reputacao}</span>${(J.itens || []).map(i => { const it = D.itens.find(x => x.id === i); return it ? `<span class="chip">${it.emoji} ${esc(it.nome)}</span>` : ''; }).join('')}</div>
      <div class="list" style="margin-top:14px">
        ${e && !e.bairro && (cena?.tipo === 'casa' || cena?.tipo === 'interior') ? `<div class="row">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>${esc(tr(e.nome))}</b><small>${esc(tr('Sai à rua (em qualquer bairro) para fazer um turno.'))}</small></div></div>` : ''}
        ${e && !e.bairro && !(cena?.tipo === 'casa' || cena?.tipo === 'interior') ? `<div class="row mine">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>Trabalhar aqui mesmo</b><small>${esc(e.nome)} · ${e.id === 'zungueira' ? 'lucro variável' : '+' + fmtKz(e.salario)}</small></div><button class="btn sm red" data-a="trabalhar">Trabalhar</button></div>` : ''}
        ${e && e.bairro ? (e.bairro === J.bairro && !(cena?.tipo === 'casa')
        ? `<div class="row mine">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>${esc(tr('O teu trabalho'))}: ${esc(tr(e.nome))}</b><small>${esc(bairro(e.bairro).nome)} · +${fmtKz(e.salario)}</small></div><button class="btn sm red" data-a="trabalhar">${esc(tr('Trabalhar'))}</button></div>`
        : `<div class="row">${arteListaHTML('emprego', e.id, e.emoji)}<div class="t"><b>${esc(tr('O teu trabalho'))}: ${esc(tr(e.nome))}</b><small>${esc(tr('Fica em {0}.').replace('{0}', bairro(e.bairro).nome))}</small></div><button class="btn sm" data-irtrab>🚐 ${esc(tr('Ir para {0}').replace('{0}', bairro(e.bairro).nome))}</button></div>`) : ''}
        ${(() => {
        const rico = J.classe === 'rica' && idadeDe(J) < 30, hoje = J.familia_dia === new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
        return `<div class="row"><span class="e">📞</span><div class="t"><b>${esc(tr(rico ? 'Ligar ao Papá' : 'Ligar à família'))}</b><small>${esc(tr(hoje ? 'Já ligaste hoje — amanhã há mais.' : rico ? 'Mesada diária (enquanto fores novo/a).' : 'Uma chamada por dia: menos solidão, mais humor.'))}</small></div><button class="btn sm ${hoje ? 'ghost' : ''}" id="bFamilia" ${hoje ? 'disabled' : ''}>${esc(tr('Ligar'))}</button></div>`;
      })()}
        ${(() => {
        const feito = J.pais_dia === new Date(Date.now() + 3600e3).toISOString().slice(0, 10);   // 0ch: 1× por dia; quanto mandam depende do berço (servidor: pedir_dinheiro_pais)
        return `<div class="row"><span class="e">💸</span><div class="t"><b>${esc(tr('Pedir dinheiro aos pais'))}</b><small>${esc(tr(feito ? 'Já pediste hoje. Amanhã podes pedir outra vez.' : 'Uma vez por dia. Quanto mandam depende da família onde nasceste.'))}</small></div><button class="btn sm ${feito ? 'ghost' : ''}" id="bPais" ${feito ? 'disabled' : ''}>${esc(tr('Pedir'))}</button></div>`;
      })()}
        <button class="row hide" data-instalar style="text-align:left"><span class="e">${icone('telefone', 22)}</span><div class="t"><b>Instalar a app</b><small>Abre o jogo direto do ecrã do telemóvel</small></div></button>
        <button class="row" id="bConvidar" style="text-align:left"><span class="e">🔗</span><div class="t"><b>${esc(tr('Convidar amigos'))}</b><small>${esc(tr('O teu link pessoal e quantos entraram por ele'))}</small></div></button>
        <button class="row" id="mudarVisual" style="text-align:left"><span class="e">💅</span><div class="t"><b>Mudar o visual</b><small>Cabelo, roupa, cores</small></div></button>
        <button class="row" id="bGuardaRoupa" style="text-align:left"><span class="e">👗</span><div class="t"><b>${esc(tr('O meu guarda-roupa'))}</b><small>${esc(tr('As peças das coleções que compraste'))}</small></div></button>
        ${matchMedia('(pointer:fine)').matches ? `<button class="row" id="bAtalhos" style="text-align:left"><span class="e">⌨️</span><div class="t"><b>${esc(tr('Atalhos de teclado'))}</b><small>${esc(tr('Carrega em ? em qualquer altura'))}</small></div></button>` : ''}
        <div class="row"><span class="e">🌍</span><div class="t"><b>Idioma</b><small>A língua do jogo</small></div>${seletorLinguaHTML()}</div>
        ${temWebGL() ? `<div class="row"><span class="e">🧊</span><div class="t"><b>${tr('Gráficos 3D')}</b><small>${m3dFalhou ? esc(tr(m3dFalhou)) : m3dPedido ? (window.M3D ? tr('Ligado — ruas e casas em 3D, a câmara roda') : tr('A carregar…')) : tr('Desligado — o desenho clássico (mais leve)')}</small></div><button class="btn sm ${m3dPedido ? '' : 'ghost'}" id="b3d">${m3dPedido ? tr('Desligar') : tr('Ligar')}</button></div>` : ''}
        <div class="row"><span class="e">${icone('tema', 22)}</span><div class="t"><b>Tema</b><small>Noite de Kizomba, Samakaka ou automático</small></div>${seletorTemaHTML()}</div>
        <a class="row" href="termos.html" target="_blank" rel="noopener" style="text-align:left;color:inherit;text-decoration:none"><span class="e">📜</span><div class="t"><b>Termos e privacidade</b><small>As regras do jogo e o que fazemos com os teus dados</small></div></a>
        <label class="row" style="text-align:left;cursor:pointer"><span class="e">🙈</span><div class="t"><b>${esc(tr('Esconder-me da lista dos mais ricos'))}</b><small>${esc(tr('Ninguém te vê no ranking nem no jornal dos mais ricos'))}</small></div><input type="checkbox" id="bEsconderRicos" ${J.esconder_ricos ? 'checked' : ''} style="width:22px;height:22px"></label>
        <button class="row" id="bNome" style="text-align:left"><span class="e">🪪</span><div class="t"><b>Mudar o nome</b><small>Uma vez por semana</small></div></button>
        <button class="row" id="bSair" style="text-align:left"><span class="e">🚪</span><div class="t"><b>Sair da conta</b></div></button>
      </div>`;
    if (typeof ui2Perfil === 'function') ui2Perfil(body);   // 8 nov: redesenho (teste)
    registarPreview('pvEu', apVisivel(minhaAparencia(), idadeDe(J))); if (!previewAnim) animarPreview();
    ligarBotoes(body, () => abrirTelemovel('eu'));
    body.querySelectorAll('[data-irtrab]').forEach(b => b.onclick = irTrabalhar);
    ligarCasal(body);
    ligarCarreira(body);
    ligarPosses(body, () => abrirTelemovel('eu'));
    body.querySelector('#mudarVisual').onclick = abrirVisual;
    body.querySelector('#bGuardaRoupa').onclick = () => { fecharTelemovel(); abrirLojaModa('casa'); };
    body.querySelector('#bAtalhos')?.addEventListener('click', abrirAtalhos);
    body.querySelector('#bConvidar').addEventListener('click', abrirConvites);
    body.querySelector('#bCfb')?.addEventListener('click', abrirRecursoCfb);
    typeof mostrarCoroas === 'function' && mostrarCoroas(uid, "#coroasTycoon");   // 👑 rankings do tycoon
    memoRpc('rc_eu', 180000, () => sb.rpc('registo_criminal_de', { p_id: uid })).then(({ data: rc }) => { const b2 = body.querySelector('#meuRegisto'); if (b2 && rc && typeof registoCriminalHTML === 'function') b2.innerHTML = registoCriminalHTML(rc); }, () => { });
    // 6 nov: roubos contra ti (últimos 3 dias) — «Fazer queixa» até 24 h depois
    memoRpc('roubos_eu', 180000, () => sb.rpc('meus_roubos')).then(({ data }) => {
      const box = body.querySelector('#meusRoubos'); if (!box || !Array.isArray(data) || !data.length) return;
      const linha = r => `<div class="row"><span class="e">${r.resultado === 'roubado' ? '🦹' : r.resultado === 'apanhado' ? '🚓' : r.resultado === 'protegido' ? '🛡️' : '👀'}</span><div class="t"><b>${esc(r.ladrao)}${r.roubado ? ' · ' + fmtKz(r.roubado) : ''}</b><small>${esc(tr(r.resultado === 'roubado' ? (r.queixa === 'apanhado' ? 'A polícia apanhou-o e devolveu o dinheiro.' : r.queixa === 'fugiu' ? 'Fizeste queixa; a polícia não o apanhou.' : 'Roubou-te da carteira.') : r.resultado === 'apanhado' ? 'Tentou roubar-te e foi apanhado/a.' : r.resultado === 'protegido' ? 'A tua proteção travou o roubo.' : 'Tentou roubar-te sem sucesso.'))} · ${new Date(r.criado_em).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>${r.pode_queixa ? `<button class="btn sm" data-queixa="${r.id}">🚓 ${esc(tr('Fazer queixa'))}</button>` : ''}</div>`;
      box.innerHTML = `<div class="sec"><h4>🚓 ${esc(tr('Roubos contra ti'))}</h4></div><div class="list" style="margin-bottom:12px">${data.map(linha).join('')}</div>`;
      box.querySelectorAll('[data-queixa]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('queixa_roubo', { p_roubo: +b.dataset.queixa })) { memoRpc.limpar('roubos_eu'); abrirTelemovel('eu'); } else b.disabled = false; });
    }, () => { });
    body.querySelector('#bPais')?.addEventListener('click', async ev => { const bt = ev.currentTarget; bt.disabled = true; if (await acao('pedir_dinheiro_pais')) abrirTelemovel('eu'); else bt.disabled = false; });
    body.querySelector('#bFamilia')?.addEventListener('click', async ev => { ev.currentTarget.disabled = true; if (await acao('ligar_familia')) { eu.fala = { txt: '📞', ate: performance.now() + 2500 }; abrirTelemovel('eu'); } else ev.currentTarget.disabled = false; });
    body.querySelector('#b3d')?.addEventListener('click', () => { const ligar = !m3dPedido; try { localStorage.setItem('vel_3d', ligar ? '1' : '0'); localStorage.removeItem('vel_3d_auto'); } catch { } vigia.nivel = 0; vigia.t0 = null; m3dFalhou = ''; carregar3D(); abrirTelemovel('eu'); });
    mostrarBotoesInstalar();
    body.querySelector('#bSair').onclick = () => sb.auth.signOut();
    // dono 5 nov: «a toggle in profile where you can take yourself off the richlist»
    body.querySelector('#bEsconderRicos')?.addEventListener('change', async ev => {
      const cx = ev.currentTarget, q = cx.checked; cx.disabled = true;
      const { error } = await sb.rpc('esconder_da_lista_ricos', { p_esconder: q });
      cx.disabled = false;
      if (error) { cx.checked = !q; return toast(limparErro(error.message), 'mau'); }
      J.esconder_ricos = q; toast(tr(q ? 'Já não apareces na lista dos mais ricos.' : 'Voltaste a aparecer na lista dos mais ricos.'), 'bom');
    });
    body.querySelector('#bNome').onclick = () => {
      const el = sheet(`<h3>Mudar o nome 🪪</h3><p class="m">Se entras com o nome de utilizador, passas a entrar com o nome novo.</p><input class="inp" id="nNome" maxlength="20" value="${esc(J.nome)}"><button class="btn full" id="nOk" style="margin-top:8px">Guardar</button>`);
      el.querySelector('#nOk').onclick = async () => { const v = el.querySelector('#nNome').value.trim(); if (!v) return; if (await acao('mudar_nome', { p_nome: v })) { fecharSheets(); hud(); } };
    };
  } else if (telSub === 'vagas' && typeof ui2 === 'function' && ui2()) {
    ui2Vagas(body); ui2VagasLigar(body);   // 8 nov: redesenho (teste)
  } else if (telSub === 'vagas') {
    body.innerHTML = (J.emprego ? `<div class="row mine" style="margin-bottom:10px"><div class="t"><b>${esc(emprego(J.emprego)?.nome || '')}</b><small>O teu emprego atual</small></div><button class="btn sm ghost" id="bDemitir">Despedir-me</button></div>` : '') + `<p class="m">Aceita uma vaga aqui e depois vai ao local de trabalho para fazer turnos. Estudo e reputação abrem vagas melhores.</p><div class="list">` +
      D.empregos.map(e => blocoEmprego(e).replace('</small></div>', `</small><small>📍 ${e.bairro ? esc(bairro(e.bairro).nome) : 'Qualquer bairro'}</small></div>`)).join('') + `</div>`;
    // 6 nov (bug «employed players cannot work»): longe do posto, o botão desaparecia sem explicação (136 de 214 cobradores nunca trabalharam)
    body.querySelectorAll('[data-a=trabalhar]').forEach(b => { const e = emprego(J.emprego); if (e?.bairro && e.bairro !== J.bairro) b.outerHTML = `<button class="btn sm" data-irtrab>🚐 ${esc(tr('Ir para {0}').replace('{0}', bairro(e.bairro).nome))}</button>`; });
    body.querySelectorAll('[data-irtrab]').forEach(b => b.onclick = irTrabalhar);
    ligarBotoes(body, () => abrirTelemovel('vagas'));
    body.querySelector('#bDemitir')?.addEventListener('click', async () => { if (!await perguntar('Despedir-te deste emprego? Deixas de receber salário.')) return; if (await acao('demitir_me')) abrirTelemovel('vagas'); });
  } else if (telSub === 'loja') {
    renderLoja(body);
  } else if (telSub === 'ouro') {
    renderOuro(body);
  } else if (telSub === 'radio') {
    renderRadio(body);
  } else if (telSub === 'noticias') {
    body.innerHTML = `<div class="feed">${eventos.length ? eventos.map(ev => `<div class="ev ${ev.tipo}">${esc(ev.texto)}<time>${tempoRel(ev.criado_em)}</time></div>`).join('') : '<div class="empty">Nada ainda.</div>'}</div>`;
  } else if (telSub === 'ranking') {
    body.innerHTML = '<div class="empty">A carregar…</div>';
    body.innerHTML = '<div class="empty">Não foi possível carregar a lista dos ricos. Tenta mais tarde.</div>';
  } else if (telSub === 'kumbu') {
    renderKumbu(body, extra);
  } else {
    body.innerHTML = `<div class="feed">
      <div data-tr-html class="ev">👆 <b>Toca no chão</b> para andar. Toca num <b>edifício</b> para entrar. Arrasta para olhar à volta e usa ＋/－ para zoom.</div>
      <div data-tr-html class="ev">🚐 Para mudar de bairro, vai à <b>paragem de candongueiros</b> (a azul, no centro).</div>
      <div data-tr-html class="ev">⚡ <b>Energia</b> volta com o tempo e a dormir. 🍲 <b>Barriga</b> esvazia — se chegar a zero, acabas no hospital.</div>
      <div data-tr-html class="ev renda">🏠 Arrenda uma casa num prédio ou quintal. A renda é cobrada todos os dias. Lá dentro, carrega em <b>🔨 Decorar</b>.</div>
      <div data-tr-html class="ev">🛋️ Móveis compram-se no 📱 <b>Telemóvel → 🛒 Loja</b> (com entrega), ou mais baratos nos <b>Móveis do Mercado</b>, em Viana, e no <b>Casa & Design</b> em Talatona. Cama boa = sono melhor; fogão = comida barata.</div>
      <div data-tr-html class="ev bom">📈 Trabalha para ganhar reputação, estuda na Universidade (Mutamba) e sobe até Engenheiro petrolífero.</div>
      <div data-tr-html class="ev">👥 Toca noutros jogadores para conversar, elogiar, dar presentes, enviar kumbu ou visitar a casa deles. A amizade sobe com cada conversa.</div>
      <div data-tr-html class="ev">💞 Podes <b>namoriscar</b> e pedir em <b>namoro</b> quem quiseres — quanto mais se conhecem, mais fácil é. Para <b>casar</b> têm de namorar primeiro; o alambamento custa 100.000 Kz. Pedidos e fofocas ficam em 📱 → Social.</div>
      <div data-tr-html class="ev">🌹 Toca em alguém → <b>Convidar para sair</b>: praia, Marginal, kizomba, cinema ou jantar. Quem convida paga.</div>
      <div data-tr-html class="ev renda">💍 Casados podem <b>morar juntos</b> (📱 → Perfil → Mudar para a casa…), decorar a mesma casa e ter uma <b>conta do casal</b>. No divórcio, a conta é dividida ao meio e quem se mudou volta a ficar sem casa.</div>
      <div data-tr-html class="ev bom">👶 Casais podem <b>ter um bebé</b> (toca no teu par → Ter um bebé) e qualquer pessoa com casa pode <b>adotar</b>. Os filhos crescem 1 ano por semana: brinca com eles, ajuda nos trabalhos de casa e paga a escola.</div>
      <div data-tr-html class="ev">💪 <b>Forma física</b>: ginásio (Kilamba, Talatona), corrida (Marginal, praia da Ilha) ou treinos da equipa. Quem está em forma recupera energia mais depressa e vive mais anos.</div>
      <div data-tr-html class="ev mau">😰 Trabalhar dá <b>stress</b>. Acima de 80 rendes menos; a 95 é burnout e não consegues trabalhar. Uma boa noite de sono, lazer, desporto, igreja e festas baixam-no.</div>
      <div data-tr-html class="ev">🥀 A <b>solidão</b> cresce quando não falas com ninguém e tira felicidade. Conversa, vai a festas e entra em grupos (📱 → Grupos).</div>
      <div data-tr-html class="ev bom">🎉 Em casa, dá uma <b>festa</b> (📱 → Perfil): os teus amigos são avisados. No dia de anos é festa de aniversário! Para ir à festa de alguém, toca na pessoa → Festejar.</div>
      <div data-tr-html class="ev renda">🔑 Podes <b>comprar casa</b> (60 dias de renda) e deixar de pagar renda. As casas a mais arrendas ou vendes a outros jogadores em 📱 → Imóveis.</div>
      <div data-tr-html class="ev">🏦 No 📱 → Banco: poupança a 0,5% por dia (no primeiro milhão). Empréstimos só no Banco da Baixa: 1,5% por dia e 7 dias de prazo — depois vêm os cobradores e a penhora.</div>
      <div data-tr-html class="ev bom">📈 Nos empregos com requisitos há <b>entrevista</b> (estudo, reputação e a família contam). Começas como estagiário/a: trabalha bem e pede promoção (📱 → Perfil) — cada nível paga +25%. Desempenho abaixo de 15 = despedido/a. Aos 60 podes reformar-te com pensão.</div>
      <div data-tr-html class="ev renda">🏢 Abre um <b>negócio</b> em 📱 → Empresas: cantina, salão, loja, candongueiros, discoteca, construtora ou importadora. Fatura todos os dias, mesmo quando não jogas, e paga-se em cerca de uma semana. Os lugares livres têm ajudantes; outros jogadores podem candidatar-se. Paga 10% de impostos e, se a caixa ficar muito negativa, vai à falência.</div>
      <div data-tr-html class="ev">💵 O kwanza vai perdendo valor. Guarda em <b>dólares</b> (📱 → Dólares): o banco da Baixa vende barato mas só 200 USD por dia; as kinguilas vendem quanto quiseres, mais caro — e às vezes com notas falsas.</div>
      <div data-tr-html class="ev mau">🤫 Podes pôr uma empresa a <b>fugir aos impostos</b>… mas se as Finanças inspecionarem, pagas o triplo.</div>
      <div data-tr-html class="ev">🎲 Em 📱 → Sorte: raspadinha, Lotaria diária (sorteio às 20h, o pote acumula) e apostas na Liga de Luanda. Joga com moderação.</div>
      <div data-tr-html class="ev bom">🗺️ <b>Angola é grande!</b> Da paragem apanhas o autocarro para Benguela, Huambo ou Lubango; do Aeroporto 4 de Fevereiro (Maianga) voas. Entre Benguela e Huambo há o comboio do CFB. Lá fora as casas e a comida são mais baratas, e há Tundavala, Serra da Leba e a Baía Azul para ver.</div>
      <div data-tr-html class="ev">🌧️ De outubro a abril é a <b>época das chuvas</b>; de maio a setembro, o <b>cacimbo</b>. Com tempestade, a praia e os passeios ficam para outro dia, os barcos não saem e as casas fracas dos bairros baixos podem inundar.</div>
      <div data-tr-html class="ev bom">🌱 No Huambo e em Malanje podes ter <b>lavras</b>: planta, rega no cacimbo, colhe e vende — em Luanda pagam mais. 🏝️ O Mussulo é só de barco (cais na Ilha) e Cabinda só de avião.</div>
      <div data-tr-html class="ev mau">🦟 Na época das chuvas há <b>malária</b>; no cacimbo, <b>gripe</b>; em casas fracas, <b>febre tifoide</b>. Trata-te em 📱 → Saúde: farmácia, centro de saúde (grátis mas com filas), clínica privada, hospital ou curandeiro. Uma doença grave sem tratamento pode matar.</div>
      <div data-tr-html class="ev mau">🔪 Só <b>outros jogadores</b> te podem roubar: assaltos na rua e <b>SMS de burla</b> (📱 → Mensagens) — nunca pagues "taxas" de prémios. Faz queixa em 📱 → Justiça.</div>
      <div data-tr-html class="ev bom">😌 <b>Enquanto estás fora, os azares quase param</b> e a fome não desce abaixo de 35; o senhorio espera 4 dias pela renda. Nos primeiros <b>3 dias</b> tens proteção de novato 🛡️. Sem casa, dormes em casa da família.</div>
      <div data-tr-html class="ev">🏠 As casas maiores têm <b>divisões</b> (quarto, sala, cozinha…) e as de luxo (Mussulo e Talatona) têm <b>escada para o 1.º andar</b>: toca na escada para subir ou descer.</div>
      <div data-tr-html class="ev renda">💎 <b>Posses:</b> carros no Stand Automóvel (Talatona) — a carrinha dá para fazer corridas de candongueiro e o jipe 4x4 cansa menos nas viagens longas; telemóveis (melhor câmara = mais alcance no Muxima); moda e acessórios na Boutique; animais na Feira de Viana (o cão afasta ladrões, as galinhas põem ovos). Tudo se pode vender por metade do preço.</div>
      <div data-tr-html class="ev bom">💛 No <b>Muxima</b> (📱) publicas posts com "foto", ganhas gostos, comentários, seguidores e fãs — às vezes um post fica <b>viral</b> 🔥. Com 200 fãs ganhas uma receita diária; com 1.000, as marcas pagam-te posts patrocinados. O <b>📰 Jornal</b> conta tudo o que acontece em Angola.</div>
      <div data-tr-html class="ev">❗ De vez em quando a vida põe-te uma <b>escolha</b>: foi-se a luz, não há água, estás febril, a chuva entrou em casa, a gasolina subiu… Decide no ecrã — algumas escolhas até dão dinheiro (alugar o gerador, vender água, guardar lugar na fila da bomba).</div>
      <div data-tr-html class="ev renda">🏛️ Cada município tem um <b>administrador</b> (📱 → Governo). Todos os domingos às 20h há <b>eleições</b>: candidata-te (cadastro limpo, reputação 10+, casa no município), faz comícios e pede votos. Quem ganha gere o orçamento: investe na luz, água, estradas e segurança, fixa a taxa municipal… ou desvia fundos e arrisca uma auditoria.</div>
      <div data-tr-html class="ev mau">🕯️ Com pouco investimento há <b>cortes de luz</b> (um gerador ajuda) e <b>falta de água</b> (chama o camião-cisterna no 📱 → Governo). Estradas esburacadas cansam e furam pneus, e a <b>gasolina</b> muda de preço todos os dias.</div>
      <div data-tr-html class="ev">🕶️ Nos becos do Cazenga e de Viana há <b>esquemas</b>; em Cabinda, <b>contrabando</b>. Se a polícia te apanha: <b>gasosa</b>, <b>advogado</b> ou defensor oficioso. Condenado/a vais para a <b>Cadeia de Viana</b>: trabalha na oficina para sair mais cedo ou paga fiança. Na esquadra (Baixa) podes entregar-te.</div>
      <div data-tr-html class="ev">🕊️ Ninguém vive para sempre. Quando morreres, continuas a jogar como o/a filho/a do teu testamento (📱 → Família), com a herança. Sem filhos, um/a sobrinho/a herda.</div>
      <div data-tr-html class="ev mau">👀 Namoriscar outra pessoa quando já namoras ou és casado/a pode ser descoberto… e o bairro inteiro fica a saber.</div>
      <div data-tr-html class="ev">🎂 Envelheces um ano por cada semana real. 🛡️ Se alguém te incomodar: toca na pessoa → Bloquear ou Denunciar.</div></div>`;
  }
}
function abrirVisual() {
  const ap = { ...minhaAparencia() };
  const el = sheet(`<h3>💅 O teu visual</h3><div id="criadorEu"></div><button class="btn full" id="guardarVisual">Guardar</button>`);
  const host = el.querySelector('#criadorEu');
  const re = () => { ligarCriador(host, ap, 'pvVisual', () => { registarPreview('pvVisual', ap); }); registarPreview('pvVisual', ap); };
  re(); if (!previewAnim) animarPreview();
  el.querySelector('#guardarVisual').onclick = async () => {
    const { data, error } = await sb.rpc('mudar_aparencia', { p_aparencia: ap });
    if (error) { ls.set('vel_ap_' + uid, ap); toast('Visual guardado neste telemóvel. 💅', 'bom'); }
    else { localStorage.removeItem('vel_ap_' + uid); setJogador(data.jogador); toast('Novo visual! 💅', 'bom'); }
    eu.ap = minhaAparencia(); presencaAgora(true); fecharSheets();
  };
}
function tutorial() {
  sheet(`<h3>Bem-vindo a Luanda! 🌴</h3><p class="m">Estás em ${esc(bairro(J.bairro).nome)}, ao pé da paragem de candongueiros.</p>
    <div class="feed"><div class="ev">👆 Toca no chão para andar e nos edifícios para entrar.</div>
    <div class="ev">💼 Abre o 📱 Telemóvel → Vagas para arranjar emprego. Zungueiro/a dá para começar em qualquer lado.</div>
    <div class="ev">🍲 Come numa cantina antes que a barriga fique vazia.</div>
    <div class="ev">🏠 Junta kumbu, arrenda uma casa e decora-a com 🔨 Decorar. O teu colchão já te espera no armazém.</div>
    <div class="ev">🛒 Compra móveis no 📱 Telemóvel → Loja (entrega em casa) ou mais barato nos Móveis do Mercado, em Viana.</div>
    <div class="ev">💞 Toca noutros jogadores para fazer amigos, namorar e até casar. Vê tudo em 📱 → Social.</div></div>
    <button class="btn full" data-fechar>Bora! 💪</button>`);
}

/* ---------- HUD ---------- */
function hud() {
  if (typeof vozBotao === 'function') vozBotao();   // 9 nov: botão da voz só nas salas privadas
  if (!J) return;
  $('#hNome').textContent = J.nome;
  const onde = cena?.tipo === 'interior' ? tr(cena.lugar.spec.nome) : cena?.tipo === 'casa' ? (ehMeuLar(cena.dono.id) ? 'Em casa' : String(cena.dono.id).startsWith('imovel-') ? 'A tua casa · não moras aqui' : 'Casa de ' + cena.dono.nome) + (cena.andar ? ' · 1.º andar' : '') : bairro(J.bairro)?.nome;
  const gente = outros.size;
  const prov = cena?.tipo === 'bairro' ? bairro(J.bairro)?.provincia : null;
  $('#hLoc').textContent = `📍 ${onde}${cena?.tipo === 'bairro' && typeof salaAtiva !== 'undefined' && salaAtiva ? ' · ' + (typeof nomeSala === 'function' ? nomeSala(salaAtual) : tr('Sala {0}').replace('{0}', salaAtual)) : ''}${prov && prov !== onde ? ' · ' + prov : ''}${gente ? ` · 👥 ${gente + 1}` : ''} · ${cena?.tipo === 'bairro' ? tempoEmoji() : ''}${semLuzAqui() ? '🕯️' : ''}${humor()[0]} ${preso() ? '⛓️ Preso/a · ' + tempoFalta(J.preso_ate) : J.detencao ? '🚔 Detido/a!' : J.emprego ? (emprego(J.emprego)?.nome || J.emprego) : 'Desempregado'}`;
  $('#hKz').textContent = saldoKz();
  const barras = [['energia', J.energia, 'var(--b-energia)', 'Energia'], ['fome', J.fome, 'var(--b-fome)', 'Barriga'], ['humor', J.felicidade, 'var(--b-humor)', 'Humor'], ['vida', J.saude, 'var(--b-saude)', 'Saúde']];
  const htmlBarras = barras.map(([n, v, c, rot]) => `<div class="bar ${v < 25 ? 'low' : ''}"><small><span class="bl" style="color:${c}">${icone(n, 13)}<span class="bn">${rot}</span></span><span>${Math.round(v)}</span></small><i><u style="width:${Math.max(0, Math.min(100, v))}%;background:${c}"></u></i></div>`).join('');
  if (hud._barras !== lingua + htmlBarras) { $('#bars').innerHTML = htmlBarras; hud._barras = lingua + htmlBarras; }   // só refaz as barras quando os números mudam
  const emCasa = cena?.tipo === 'casa' && podeMexer(cena.dono.id);
  $('#bDeco').classList.toggle('hide', !emCasa);
  {
    const minha = cena?.tipo === 'casa' && !cena.prop && ehMeuLar(cena.dono?.id), bp = $('#bPorta');   // FILA 0dn-5: trancar / deixar as portas abertas
    if (bp) bp.classList.toggle('hide', !minha);
    if (minha && bp) {
      const ab = !!(J.lar ? cena.dono?.casa_aberta : J.casa_aberta), ic = ab ? 'cadeado' : 'cadeado', txt = ab ? tr('Abertas') : tr('Trancadas');
      if (bp.dataset.estado !== String(ab) + lingua) { bp.dataset.estado = String(ab) + lingua; bp.innerHTML = `<span class="e">${ab ? '🔓' : '🔒'}</span>${esc(txt)}`; }
    }
  }
  // #26: em tua casa (rés-do-chão), se tens carro ou avião → botão Viajar (os veículos ficam fora do ecrã no telemóvel)
  { const v = cena?.tipo === 'casa' && !cena.andar && ehMeuLar(cena.dono?.id) && D.itens ? veiculosLaFora() : { carros: [] }; $('#bVeic').classList.toggle('hide', !(v.carros.length || v.aviao)); }
  { const ic = cena?.tipo === 'casa' || cena?.tipo === 'interior' ? 'porta' : 'casa', e = $('#bCasa').querySelector('.e'); if (e.dataset.ic !== ic) { e.dataset.ic = ic; e.innerHTML = icone(ic, 22); } }
  $('#bCasa').lastChild.textContent = cena?.tipo === 'casa' || cena?.tipo === 'interior' ? 'Sair' : 'Casa';
  const g = $('#avMini').getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 84, 84);
  g.save(); g.beginPath(); g.arc(42, 42, 42, 0, 7); g.clip(); desenhaPessoa(g, 42, 128, apVisivel(minhaAparencia(), idadeDe(J)), 0, false, 1, false, 2.3); g.restore();
}

/* ---------- teclado e rato (computador) ---------- */
async function abrirConvites() {
  const { data, error } = await sb.rpc('meus_convites'); if (error || !data) return toast(tr('Não deu para abrir agora. Tenta outra vez.'), 'mau');
  const link = `${location.origin}/?c=${data.codigo}`, txt = tr('Vem viver a vida em Luanda comigo no Vida na Banda!');
  const el = sheet(`<h3>🔗 ${esc(tr('Convidar amigos'))}</h3><p class="m">${esc(tr('Partilha o teu link. Quem criar conta por ele fica contado aqui.'))}</p>
    <input class="inp" id="cLink" readonly value="${esc(link)}" data-sem-traducao>
    <div style="display:flex;gap:8px;margin-top:8px"><button class="btn full" id="cPartilhar">📤 ${esc(tr('Partilhar'))}</button><button class="btn full ghost" id="cCopiar">📋 ${esc(tr('Copiar'))}</button></div>
    <div class="chips" style="margin-top:12px"><span class="chip">👥 ${esc(tr('Entraram pelo teu link: {0}').replace('{0}', data.total))}</span><span class="chip">📅 ${esc(tr('Esta semana: {0}').replace('{0}', data.semana))}</span></div>`);
  el.querySelector('#cCopiar').onclick = async () => { try { await navigator.clipboard.writeText(link); toast(tr('Link copiado!'), 'bom'); } catch { el.querySelector('#cLink').select(); } };
  el.querySelector('#cPartilhar').onclick = async () => { if (navigator.share) { try { await navigator.share({ title: 'Vida na Banda', text: txt, url: link }); } catch { } } else el.querySelector('#cCopiar').click(); };
}
const ATALHOS = [['W A S D · ← ↑ → ↓', 'Andar'], ['Enter', 'Falar com quem está perto'], ['T', 'Abrir o telemóvel'], ['/', 'Procurar no telemóvel'], ['H', 'Casa / sair'],
['+ −', 'Aproximar / afastar'], ['Q E', 'Rodar a vista (3D)'], ['R', 'Rodar o móvel (a decorar)'], ['Esc', 'Fechar / voltar'], ['?', 'Esta lista']];
function abrirAtalhos() {
  sheet(`<h3>⌨️ ${esc(tr('Atalhos de teclado'))}</h3><div class="list">${ATALHOS.map(([k, t]) => `<div class="row"><kbd style="min-width:120px;display:inline-block;font:700 13px ui-monospace,monospace;background:var(--card);border:1px solid #fff3;border-radius:6px;padding:4px 8px;text-align:center" data-sem-traducao>${esc(k)}</kbd><div class="t"><b>${esc(tr(t))}</b></div></div>`).join('')}</div>`);
}
const DIR_TECLA = { ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1], ArrowDown: [1, 1], s: [1, 1], S: [1, 1], ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1], ArrowRight: [1, -1], d: [1, -1], D: [1, -1] };
const teclas = new Set();
addEventListener('keydown', e => {
  if (!J || !cena) return;
  const escrever = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    if (document.querySelector('.tel-modal')) return document.querySelector('.tel-modal').remove();
    if (telAberto) return telSub ? abrirTelemovel() : fecharTelemovel();
    if (document.querySelector('.veil')) return fecharSheets();
    if (!$('#chatBox').classList.contains('hide')) return $('#fecharChat').click();
    if (deco?.sel) { deco.sel = null; return renderDeco(); }
    if (deco) return sairDeco();
    return;
  }
  if (escrever) return;
  // LL42: atalhos de teclado — «?» mostra a lista
  if (e.key === '?') { e.preventDefault(); return abrirAtalhos(); }
  if (!painelAberto() && !deco && !telAberto) {
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); return $('#bTel').click(); }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); return $('#bCasa').click(); }
    if (e.key === '/') { e.preventDefault(); abrirTelemovel(); return setTimeout(() => document.querySelector('#telBusca')?.focus(), 80); }
  }
  if (e.key === 'Enter' && !painelAberto() && !deco) { e.preventDefault(); return $('#bFalar').click(); }
  if (e.key === '+' || e.key === '=') return void (cam.z = Math.min(2.4, cam.z * 1.15));
  if (e.key === '-' || e.key === '_') return void (cam.z = Math.max(0.45, cam.z / 1.15));
  if ((e.key === 'r' || e.key === 'R') && deco?.sel) { deco.sel.rot = ((deco.sel.rot || 0) + 1) % 4; ajustarRodado(); return renderDeco(); }
  if (DIR_TECLA[e.key] && !painelAberto() && !deco) { e.preventDefault(); teclas.add(e.key); }
});
addEventListener('keyup', e => teclas.delete(e.key));
addEventListener('blur', () => teclas.clear());
setInterval(() => {
  if (!teclas.size || !eu || !cena || eu.path.length > 1) return;
  let dx = 0, dy = 0; teclas.forEach(k => { dx += DIR_TECLA[k][0]; dy += DIR_TECLA[k][1]; });
  dx = Math.sign(dx); dy = Math.sign(dy); if (!dx && !dy) return;
  const bx = eu.path.length ? eu.path[0][0] : Math.floor(eu.x), by = eu.path.length ? eu.path[0][1] : Math.floor(eu.y);
  const tentar = [[dx, dy], [dx, 0], [0, dy]];
  for (const [ix, iy] of tentar) {
    if (!ix && !iy) continue;
    const nx = bx + ix, ny = by + iy;
    if (nx < 0 || ny < 0 || nx >= cena.W || ny >= cena.H || cena.bloq[ny * cena.W + nx]) continue;
    if (ix && iy && (cena.bloq[by * cena.W + nx] || cena.bloq[ny * cena.W + bx])) continue;
    eu.path = eu.path.length ? [eu.path[0], [nx, ny]] : [[nx, ny]]; eu.aoChegar = null; cam.seguir = true;
    anunciarMovimento(); break;
  }
}, 90);
// cursor de mão por cima de coisas clicáveis
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || e.buttons || !cena || !eu) return;
  if (m3dAtivo()) { const h = M3D.escolher(e.clientX, e.clientY, [...outros.values(), ...npcs]); cv.style.cursor = h.pessoa || h.obj ? 'pointer' : 'default'; return; }
  const [wx, wy] = paraMundo(e.clientX, e.clientY);
  let mao = false;
  for (const p of [...outros.values(), ...npcs]) { const [px, py] = iso(p.x, p.y); if (Math.abs(wx - px) < 13 && wy < py + 4 && wy > py - 54) { mao = true; break; } }
  if (!mao) for (let i = ordemDesenho.length - 1; i >= 0; i--) { const o = ordemDesenho[i].o; if ((o.spec || o.kind === 'movel') && dentro([wx, wy], silhueta(o))) { mao = true; break; } }
  cv.style.cursor = mao ? 'pointer' : (deco ? 'crosshair' : 'default');
});

/* ---------- início ---------- */
setModo(recuperando ? 'senha' : 'criar'); montarEntrada(); animarPreview();
requestAnimationFrame(loop);
if (TOKEN_LINK) {
  history.replaceState(null, '', location.pathname);
  sb.auth.verifyOtp({ token_hash: TOKEN_LINK, type: TIPO_LINK === 'recovery' ? 'recovery' : 'email' }).then(({ error }) => {
    if (!error) return;
    recuperando = false;
    $('#carregar').classList.add('hide'); $('#entrada').classList.remove('hide');
    setModo('entrar'); authMsg('Este link já foi usado ou expirou. Entra com a tua senha, ou pede um link novo.');
  });
} else sb.auth.getSession().then(({ data }) => { if (!data.session) { $('#carregar').classList.add('hide'); $('#entrada').classList.remove('hide'); } });
