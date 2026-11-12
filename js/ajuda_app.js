/* ============================================================
   Vida na Banda — 📱 AJUDA redesenhada (FILA 0gm, dono 10 nov 07:24 «it isn't really helpful. It needs to be fully redesigned»)
   · Uma caixa de procura grande que responde em perguntas e respostas (as mesmas do site: ajuda/perguntas.json)
   · «O que fazer agora» (fome, energia, sem emprego…) no topo, temas em botões, as perguntas mais comuns
   · Cada resposta tem «Levar-me lá»; também aparecem sítios e apps que batem com a procura
   · Não encontraste? Pergunta-nos: a pergunta vai para a lista do dia (perguntar); a resposta sai no guia e no jogo
   ============================================================ */
let ajTema = null;
const AJ_COMUNS = ['how-do-i-make-money-kumbu', 'how-do-i-get-a-job', 'why-do-i-have-to-wait-in-a-queue-to-get-in', 'i-don-t-have-money-to-open-a-business-what-now',
  'how-do-i-rent-or-buy-a-house', 'how-do-i-make-friends', 'how-do-i-get-my-energy-back', 'i-bought-gold-and-it-hasn-t-shown-up-what-do-i-d'];
const ajSite = () => 'https://www.vidanabanda.com/guia/' + (typeof lingua !== 'undefined' && lingua !== 'pt' && ['en', 'fr'].includes(lingua) ? lingua + '/' : '') + 'perguntas.html';
const ajNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function ajProcurar(q) {
  const termos = ajNorm(q).split(/[^a-z0-9]+/).filter(x => x.length > 2 && !['como', 'que', 'para', 'the', 'how', 'and', 'what', 'comment', 'pour', 'est', 'uma', 'meu', 'minha'].includes(x));
  if (!termos.length) return [];
  const r = [];
  for (const p of AJUDA_DADOS.perguntas) {
    const g = p.guia && typeof GUIAS !== 'undefined' ? GUIAS.find(x => x.t === p.guia) : null;
    const tit = ajNorm(p.q + ' ' + tr(p.q)), resto = ajNorm(p.a + ' ' + tr(p.a) + ' ' + (g?.k || ''));
    let pts = 0, todos = true;
    for (const t of termos) { if (tit.includes(t)) pts += 3; else if (resto.includes(t)) pts += 1; else todos = false; }
    if (pts > 0) r.push([pts + (todos ? 4 : 0), p]);
  }
  return r.sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
}
function ajBotao(p) {
  const g = p.guia && typeof GUIAS !== 'undefined' ? GUIAS.find(x => x.t === p.guia) : null;
  const app = p.app || g?.app, f = g?.f;
  if (app) return `<button class="btn sm" data-aj-app="${app}">${esc(tr('Levar-me lá'))}</button>`;
  if (f) return `<button class="btn sm" data-aj-f="${f}">${esc(tr('Levar-me lá'))}</button>`;
  return '';
}
function ajItem(p) {
  return `<details class="aj-q" data-id="${p.id}"><summary>${esc(tr(p.q))}</summary><div class="aj-r"><p>${esc(tr(p.a))}</p>${ajBotao(p)}</div></details>`;
}
function ajLigar(body) {
  body.querySelectorAll('[data-aj-app]').forEach(b => b.onclick = () => abrirTelemovel(b.dataset.ajApp));
  body.querySelectorAll('[data-aj-f]').forEach(b => b.onclick = () => {
    const f = b.dataset.ajF;
    if (f === 'visual') { abrirTelemovel('eu'); setTimeout(() => typeof abrirVisual === 'function' && abrirVisual(), 50); }
    if (f === 'casa') { fecharTelemovel(); $('#bCasa')?.click(); }
    if (f === 'paragem') typeof irParaParagem === 'function' && irParaParagem();
  });
}
function ajPerguntarHTML(texto) {
  return `<section class="aj-perg" id="ajPerg"><b>${esc(tr('Não encontraste a resposta?'))}</b>
    <p>${esc(tr('Pergunta-nos. Lemos todas as perguntas e a resposta aparece aqui na Ajuda e no guia do site.'))}</p>
    <label class="hide" for="ajTxt">${esc(tr('A tua pergunta'))}</label>
    <textarea id="ajTxt" maxlength="300" rows="3" placeholder="${esc(tr('Escreve a tua pergunta sobre o jogo…'))}">${esc(texto || '')}</textarea>
    <button class="btn full" id="ajEnviar">${esc(tr('Enviar pergunta'))}</button><small id="ajMsg" role="status"></small></section>`;
}
function renderAjudaNova(body) {
  const agora = typeof ui2AjudaAgora === 'function' ? ui2AjudaAgora() : [];
  const T = AJUDA_DADOS.temas;
  body.innerHTML = `<div class="aj">
    <h2 class="aj-tit">${esc(tr('Como podemos ajudar?'))}</h2>
    <label class="aj-busca">${icone('procurar', 18)}<input type="search" id="ajBusca" placeholder="${esc(tr('Escreve a tua dúvida (ex: casar, emprego, Ouro)'))}" aria-label="${esc(tr('Procurar na ajuda'))}" autocomplete="off"></label>
    <div id="ajRes"></div>
    <div id="ajInicio">
      ${agora.length ? `<div class="aj-rot">${esc(tr('O que fazer agora'))}</div>${agora.map(([e, t, s], i) => `<button class="aj-agora" data-ag="${i}"><span aria-hidden="true">${e}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div></button>`).join('')}` : ''}
      <div class="aj-rot">${esc(tr('Temas'))}</div>
      <div class="aj-temas">${Object.entries(T).map(([k, [e, n]]) => `<button class="aj-tema${ajTema === k ? ' on' : ''}" data-tema="${k}" aria-pressed="${ajTema === k}"><span aria-hidden="true">${e}</span>${esc(tr(n))}</button>`).join('')}</div>
      <div class="aj-rot" id="ajListaRot">${esc(ajTema ? tr(T[ajTema][1]) : tr('Perguntas mais comuns'))}</div>
      <div class="aj-lista" id="ajLista"></div>
    </div>
    ${ajPerguntarHTML('')}
    <div class="aj-fim"><a class="btn ghost full" href="${ajSite()}" target="_blank" rel="noopener">${esc(tr('Ver todas as perguntas no site'))}</a>
      <button class="link" id="ajTudo">${esc(tr('Tudo o que se pode fazer no jogo'))}</button></div>
  </div>`;
  const lista = body.querySelector('#ajLista');
  const desenharLista = () => {
    const ps = ajTema ? AJUDA_DADOS.perguntas.filter(p => p.tema === ajTema) : AJ_COMUNS.map(id => AJUDA_DADOS.perguntas.find(p => p.id === id)).filter(Boolean);
    lista.innerHTML = ps.map(ajItem).join(''); ajLigar(lista);
  };
  desenharLista();
  body.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => abrirResultado(agora[+b.dataset.ag][3]));
  body.querySelectorAll('[data-tema]').forEach(b => b.onclick = () => {
    ajTema = ajTema === b.dataset.tema ? null : b.dataset.tema;
    body.querySelectorAll('[data-tema]').forEach(x => { x.classList.toggle('on', x.dataset.tema === ajTema); x.setAttribute('aria-pressed', x.dataset.tema === ajTema); });
    body.querySelector('#ajListaRot').textContent = ajTema ? tr(T[ajTema][1]) : tr('Perguntas mais comuns');
    desenharLista();
  });
  const inp = body.querySelector('#ajBusca'), res = body.querySelector('#ajRes'), ini = body.querySelector('#ajInicio'), txt = body.querySelector('#ajTxt');
  let ultima = '';
  inp.oninput = () => {
    const q = inp.value.trim(); ini.classList.toggle('hide', q.length >= 2);
    if (q.length < 2) { res.innerHTML = ''; return; }
    const ps = ajProcurar(q), outros = (typeof procurarNoJogo === 'function' ? procurarNoJogo(q) : []).filter(e => e.tipo !== 'guia').slice(0, 4);
    res.innerHTML = (ps.length ? `<div class="aj-lista">${ps.map(ajItem).join('')}</div>` : `<div class="aj-nada">${esc(tr('Ainda não temos resposta para isso.'))}</div>`)
      + (outros.length ? `<div class="aj-rot">${esc(tr('Sítios e apps'))}</div><div class="list">${outros.map(linhaProcura).join('')}</div>` : '');
    if (ps.length) res.querySelector('details')?.setAttribute('open', '');
    ajLigar(res);
    res.querySelectorAll('[data-res]').forEach(b => b.onclick = () => abrirResultado(outros[+b.dataset.res]));
    if (!ps.length && (!txt.value || txt.value === ultima)) { txt.value = q; ultima = q; }
  };
  body.querySelector('#ajTudo').onclick = () => { window._ajudaTudo = true; abrirTelemovel('ajuda'); };
  body.querySelector('#ajEnviar').onclick = async () => {
    const b = body.querySelector('#ajEnviar'), msg = body.querySelector('#ajMsg'), t = txt.value.trim();
    if (t.length < 8) { msg.textContent = tr('Escreve a tua pergunta com um pouco mais de detalhe.'); return; }
    b.disabled = true; msg.textContent = '';
    const { error } = await sb.rpc('perguntar', { p_texto: t, p_lingua: typeof lingua !== 'undefined' ? lingua : 'pt', p_origem: 'jogo' });
    b.disabled = false;
    if (error) { msg.textContent = tr(String(error.message || '').replace(/^.*?: /, '')) || tr('Não foi possível enviar. Tenta outra vez.'); return; }
    txt.value = ''; msg.textContent = tr('Obrigado! Recebemos a tua pergunta. Quando a resposta sair, recebes uma notificação.');
  };
}
