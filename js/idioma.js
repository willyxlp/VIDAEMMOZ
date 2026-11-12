/* ============================================================
   Vida na Banda — IDIOMAS
   O jogo é escrito em português. Esta camada traduz o que aparece
   no ecrã (textos, botões, avisos, mensagens do servidor) usando os
   dicionários em i18n/<lingua>.json. O que ainda não tem tradução
   fica em português — nunca parte nada.
   ============================================================ */
const IDIOMAS = [
  ['pt', 'Português', '🇦🇴'], ['en', 'English', '🇬🇧'], ['fr', 'Français', '🇫🇷'],
];
// Ainda por traduzir — só entram no seletor quando o i18n/<l>.json estiver completo:
//   ['es', 'Español', '🇪🇸'], ['zh', '中文', '🇨🇳'], ['ar', 'العربية', '🇸🇦'],
const LINGUA_RTL = new Set(['ar']);
let lingua = (() => {
  try { const g = localStorage.getItem('vel_lingua'); if (g && IDIOMAS.some(i => i[0] === g)) return g; } catch { }
  // /en/ e /fr/ (feitas por tools/gerar_linguas.py) abrem nessa língua; a página principal é a portuguesa para o Google
  const pag = document.documentElement.dataset.lingua;
  if (pag && IDIOMAS.some(i => i[0] === pag)) return pag;
  if (/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|lighthouse/i.test(navigator.userAgent || '')) return 'pt';
  const n =(navigator.language || 'pt').slice(0, 2).toLowerCase();
  return IDIOMAS.some(i => i[0] === n) ? n : 'pt';
})();
let DIC = null;                      // { exatos: Map, padroes: [{ pre, re, out }] }
const DICS = new Map();
const ORIG_TXT = new WeakMap();          // nó de texto -> texto original (português)
const normal = s => s.replace(/\s+/g, ' ').trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// emojis no início/fim de uma frase (o tradutor tenta a frase sem eles)
const EMO_INI = /^(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]+\s*)+/u;
const EMO_FIM = /(?:\s*[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]+)+$/u;
const temLetras = s => /[A-Za-zÀ-ÿ]/.test(s);

function compilarDic(j) {
  const exatos = new Map();
  for (const [k0, v] of Object.entries(j.exatos || {})) {
    const k = normal(k0); if (!exatos.has(k)) exatos.set(k, v);
    const ks = k.replace(EMO_INI, '');   // a mesma frase sem o emoji da frente (ex.: nos títulos do jornal)
    if (ks !== k && temLetras(ks) && !exatos.has(ks)) exatos.set(ks, String(v).replace(EMO_INI, ''));
  }
  const lista = [];
  for (const [k0, out] of Object.entries(j.padroes || {})) {
    const k = normal(k0); lista.push([k, out]);
    const ks = k.replace(EMO_INI, '');
    if (ks !== k && temLetras(ks.replace(/\{\d+\}/g, ''))) lista.push([ks, String(out).replace(EMO_INI, '')]);
  }
  const padroes = lista.map(([kk, out]) => {
    const pre = kk.split(/\{\d+\}/)[0];
    const re = new RegExp('^' + kk.split(/(\{\d+\})/).map(p => /^\{\d+\}$/.test(p) ? '(.*?)' : escRe(p)).join('') + '$', 's');
    const ordem = [...kk.matchAll(/\{(\d+)\}/g)].map(m => +m[1]);
    return { pre, re, out, ordem, peso: kk.replace(/\{\d+\}/g, '').length };
  }).sort((a, z) => z.peso - a.peso);
  return { exatos, padroes };
}
async function carregarLingua(l) {
  if (l === 'pt') { DIC = null; return; }
  if (!DICS.has(l)) {
    try { const r = await fetch(`i18n/${l}.json`, { cache: 'no-cache' }); DICS.set(l, r.ok ? compilarDic(await r.json()) : null); }
    catch { DICS.set(l, null); }
  }
  DIC = DICS.get(l);
}

// traduz uma frase (devolve o original quando não há tradução)
function tr(s, prof = 0) {
  if (lingua === 'pt' || !DIC || s == null) return s;
  const str = String(s), k = normal(str);
  if (!k || !temLetras(k)) return str;
  const r = traduzirChave(k, prof);
  if (r == null) return str;
  return str.match(/^\s*/)[0] + r + str.match(/\s*$/)[0];
}
// inteiro: a frase tem de ter tradução toda (sem um {0} a engolir outras frases) — usado ao partir mensagens em frases
function traduzirChave(k, prof, inteiro = false) {
  let r = DIC.exatos.get(k);
  if (r != null) return r;
  for (const p of DIC.padroes) {
    if (p.pre && !k.startsWith(p.pre)) continue;
    const m = k.match(p.re);
    if (m && inteiro && m.slice(1).some(v => /[.!?…]\s+\S/.test(v))) continue;   // 0r: «Gastaste {2}.» não pode engolir «Com a tempestade…»
    if (m) { const vals = {}; p.ordem.forEach((n, i) => { vals[n] = m[i + 1]; }); return p.out.replace(/\{(\d+)\}/g, (_, n) => tr(vals[n] ?? '', prof + 1)); }
  }
  if (prof > 4) return null;
  if (inteiro && /[.!?…]\s+\S/.test(k)) return null;   // várias frases juntas: só com tradução exata ou por padrão
  // a mesma palavra com maiúscula ("milho" → "Milho")
  const c0 = k.charAt(0);
  if (c0 !== c0.toUpperCase()) { const t = DIC.exatos.get(c0.toUpperCase() + k.slice(1)); if (t != null) return t.charAt(0).toLowerCase() + t.slice(1); }
  // texto montado no ecrã a partir de pedaços que já têm tradução:
  // 1) emojis à volta ("😄 Feliz", "Sofá de pele 💎")
  const a = k.match(EMO_INI)?.[0] || '', z = k.slice(a.length).match(EMO_FIM)?.[0] || '';
  if (a || z) { const meio = k.slice(a.length, k.length - z.length);
    if (meio && temLetras(meio)) { const t = traduzirChave(meio, prof + 1); if (t != null) return a + t + z; } }
  // 2) partes separadas por " · " ("Programador · Talatona")
  if (k.includes(' · ')) { const ps = k.split(' · '), ts = ps.map(x => tr(x, prof + 1)); if (ts.some((t, i) => t !== ps[i])) return ts.join(' · '); }
  // 3) várias frases seguidas (mensagens do servidor que juntam duas frases)
  const fr = inteiro ? [k] : k.replace(/([.!?…])\s+(?=\S)/g, '$1\u0000').split('\u0000');   // 0ca: sem «lookbehind» (Safari antigo)
  if (fr.length > 1) for (let n = fr.length - 1; n >= 1; n--) {   // o maior começo que tenha tradução, e depois o resto
    const t = traduzirChave(fr.slice(0, n).join(' '), prof + 1, true);
    if (t != null) return t + ' ' + tr(fr.slice(n).join(' '), prof + 1);
  }
  if (fr.length > 1) { const ts = fr.map(x => tr(x, prof + 1)); if (ts.some((t, i) => t !== fr[i])) return ts.join(' '); }
  // 4) a mesma frase com outra pontuação no fim
  const pf = k.match(/^(.*?[^.!?…:])([.!?…:]+)$/);
  if (pf) { const t = traduzirChave(pf[1], prof + 1); if (t != null) return t + pf[2]; }
  // 5) "Rótulo: valor"
  const i = k.indexOf(': ');
  if (i > 0) { const l = traduzirChave(k.slice(0, i + 1), prof + 1); if (l != null) return l + ' ' + tr(k.slice(i + 2), prof + 1); }
  return null;
}

/* ---------- traduzir o ecrã ---------- */
// parágrafos com palavras a negrito no meio: traduz-se o parágrafo inteiro (com as tags), para a ordem das palavras fazer sentido
const ORIG_HTML = new WeakMap();
const chaveHtml = h => normal(h.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '));
function traduzirBloco(el) {
  let o = ORIG_HTML.get(el);
  if (o == null || (el.innerHTML !== o && el.innerHTML !== el.__trh)) { o = el.innerHTML; ORIG_HTML.set(el, o); }
  const t = lingua === 'pt' || !DIC ? null : DIC.exatos.get(chaveHtml(o));
  const novo = t ?? o;
  if (t == null) { for (const f of [...el.childNodes]) traduzirNo(f); el.__trh = el.innerHTML; return; }
  if (el.innerHTML !== novo) el.innerHTML = novo;
  limparEmojis(el);
  el.__trh = el.innerHTML;   // como o navegador o escreve (ex.: & → &amp;)
}
const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
/* ---------- sem emojis: o emoji do início vira um ícone desenhado; os outros saem ---------- */
const MANTER_SIMB = new Set(['→', '←', '↑', '↓', '↻', '★', '✕', '✓', '✔', '·', '↗', '⇄']);
const EMO_G = /(?:[\u{1F1E6}-\u{1F1FF}]{2}|(?:[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\u2190-\u21FF\u2122\u2139]\uFE0F?[\u{1F3FB}-\u{1F3FF}]?(?:\u200D[\u{1F000}-\u{1FAFF}\u2600-\u27BF]\uFE0F?)*))/gu;
function partirEmojis(t) {
  if (!t || !EMO_G.test(t)) { EMO_G.lastIndex = 0; return [t, null]; }
  EMO_G.lastIndex = 0;
  const ini = t.match(/^\s*/)[0].length; let ic = null;
  let out = t.replace(EMO_G, (e, off) => {
    if (MANTER_SIMB.has(e)) return e;
    if (off === ini && !ic) { ic = typeof icDoEmoji === 'function' && icDoEmoji(e); if (!ic) { (window.__semIcone ||= new Set()).add(e); ic = 'ponto'; } }
    return '\u0001';
  });
  out = out.replace(/^\s*\u0001\s*/, m => (ic ? '' : m)).replace(/\s*\u0001+\s*/g, ' ').replace(/ {2,}/g, ' ').replace(/ ([.,!?:;)])/g, '$1').replace(/\( /g, '(').replace(/ · ·/g, ' ·').replace(/^\s+·\s*/, '').replace(/\s*·\s*$/, '');
  if (!/\S/.test(out)) out = '';
  return [out, ic];
}
function porIcone(n, ic) {
  const p = n.parentNode; let el = n.__ic;
  if (!ic || !p || p.nodeName === 'OPTION' || p.nodeName === 'TITLE') { if (el) { el.remove(); n.__ic = null; } return; }
  const cat = typeof catDoIcone === 'function' ? catDoIcone(ic) : null;
  if (el && el.parentNode === p && el.nextSibling === n) { if (el.dataset.n !== ic) { el.dataset.n = ic; if (cat) el.dataset.cat = cat; else delete el.dataset.cat; el.innerHTML = icone(ic, 18); } return; }
  if (el) el.remove();
  el = document.createElement('i'); el.className = 'ie'; el.dataset.n = ic; if (cat) el.dataset.cat = cat; el.setAttribute('aria-hidden', 'true'); el.innerHTML = icone(ic, 18);
  p.insertBefore(el, n); n.__ic = el;
}
function limparEmojis(raiz) {
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), nos = [];
  while (w.nextNode()) nos.push(w.currentNode);
  for (const n of nos) { const [t, ic] = partirEmojis(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; n.__tr = t; porIcone(n, ic); }
}
const semTraducao = el => el.closest?.('script,style,textarea,svg,i.ie,[data-sem-traducao]');
function traduzirNo(n) {
  if (n.nodeType === 3) {
    const p = n.parentElement; if (!p || semTraducao(p)) return;
    let o = ORIG_TXT.get(n);
    if (o == null || (n.nodeValue !== o && n.nodeValue !== n.__tr)) { o = n.nodeValue; ORIG_TXT.set(n, o); }
    const [t, ic] = partirEmojis(lingua === 'pt' ? o : tr(o));
    n.__tr = t; if (n.nodeValue !== t) n.nodeValue = t;
    porIcone(n, ic);
  } else if (n.nodeType === 1) {
    if (semTraducao(n)) return;
    if (n.hasAttribute?.('data-tr-html')) { traduzirBloco(n); return; }
    for (const a of ATRIBUTOS) if (n.hasAttribute(a)) {
      const k = 'pt' + a.replace(/-/g, '');
      if (n.dataset[k] == null || (n.getAttribute(a) !== n.dataset[k] && n.getAttribute(a) !== n['__tr' + k])) n.dataset[k] = n.getAttribute(a);
      const t = partirEmojis(lingua === 'pt' ? n.dataset[k] : tr(n.dataset[k]))[0]; n['__tr' + k] = t;
      if (n.getAttribute(a) !== t) n.setAttribute(a, t);
    }
    for (const c of [...n.childNodes]) traduzirNo(c);
  }
}
const observador = new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'characterData') { if (m.target.nodeValue !== m.target.__tr) traduzirNo(m.target); }
    else if (m.type === 'attributes') { if (ATRIBUTOS.includes(m.attributeName)) traduzirNo(m.target); }
    else m.addedNodes.forEach(traduzirNo);
  }
});
function aplicarDirecao() {
  document.documentElement.lang = lingua === 'pt' ? 'pt-AO' : lingua;
  document.documentElement.dir = LINGUA_RTL.has(lingua) ? 'rtl' : 'ltr';
}
async function mudarLingua(l) {
  lingua = l; try { localStorage.setItem('vel_lingua', l); } catch { }
  await carregarLingua(l);
  aplicarDirecao();
  if (l !== 'pt') document.documentElement.dataset.traduzido = '1';
  traduzirNo(document.body);
  document.querySelectorAll('select[data-lingua]').forEach(s => { s.value = l; });
  // o chão das casas tem os nomes das divisões desenhados: refaz na nova língua
  try { if (typeof cena !== 'undefined' && cena && typeof construirChao === 'function') construirChao(); } catch { }
  // com sessão aberta, a conta passa a receber os emails nesta língua
  try { if (typeof uid !== 'undefined' && uid && typeof guardarLinguaConta === 'function') sb.auth.getSession().then(({ data }) => data.session && guardarLinguaConta(data.session.user)); } catch { }
}
// janelas nativas (confirmar, avisar) também traduzidas
const _confirm = window.confirm.bind(window), _alert = window.alert.bind(window), _prompt = window.prompt.bind(window);
const _limpo = m => partirEmojis(tr(String(m)))[0];
window.confirm = m => _confirm(_limpo(m)); window.alert = m => _alert(_limpo(m)); window.prompt = (m, d) => _prompt(_limpo(m), d);

// seletor de língua (no registo e no perfil)
function seletorLinguaHTML() {
  return `<label class="lingua" data-sem-traducao><span aria-hidden="true">${typeof icone === 'function' ? icone('mundo', 16) : ''}</span><select data-lingua aria-label="Idioma / Language">${IDIOMAS.map(([c, n, b]) =>
    `<option value="${c}" ${c === lingua ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
}
document.addEventListener('change', e => { if (e.target.matches?.('select[data-lingua]')) mudarLingua(e.target.value); });

// arranque: começa a observar já, e traduz quando o dicionário chegar
aplicarDirecao();
document.addEventListener('DOMContentLoaded', () => {
  const le = document.getElementById('linguaEntrada'); if (le) le.innerHTML = seletorLinguaHTML();
  observador.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  if (lingua !== 'pt') mudarLingua(lingua); else traduzirNo(document.body);
});
