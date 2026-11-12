/* ============================================================
   Vida na Banda — COMO GANHAR DINHEIRO (FILA 0gj, dono 10 nov 00:46–00:52, «go»)
   «1 should be on the guide site, 2 should be a popup for people whose net worth is low (say they can buy a business with
   ouro on the number 2 popup), 3 they can get a loan…» — loan: o crédito do banco (0fy) fica como está (25/30/35 %, 1 dia).
   · App 💰 «Ganhar dinheiro» no telemóvel (sempre a um toque): a escada emprego → estudo → 1.º negócio → crescer,
     com os números verdadeiros do jogo, botões para cada passo e o guia completo no site (partilhável no WhatsApp).
   · Cartão único no início (depois do tutorial) a apontar para o guia.
   · «Estou sem dinheiro»: com menos de 23.000 Kz (carteira + banco), 1× por dia, as 3 melhores coisas a fazer agora,
     quanto paga cada uma, e abrir uma Cantina já: com Ouro (o que falta) ou com o crédito do banco.
   ============================================================ */
const SEM_DINHEIRO_KZ = 23000;
const GUIA_DINHEIRO = { pt: 'https://www.vidanabanda.com/guia/dinheiro.html', en: 'https://www.vidanabanda.com/guia/en/dinheiro.html', fr: 'https://www.vidanabanda.com/guia/fr/dinheiro.html' };
const guiaDinheiroUrl = () => GUIA_DINHEIRO[typeof lingua !== 'undefined' && GUIA_DINHEIRO[lingua] ? lingua : 'pt'];
const milhar = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, typeof lingua !== 'undefined' && lingua === 'en' ? ',' : '.');
const hojeLuanda = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);

// o melhor emprego que já podes ter, e o melhor que o estudo abre a seguir
function empregosParaMim() {
  const lista = (typeof D !== 'undefined' && D.empregos) || [];
  const est = J?.estudo || 0, rep = J?.reputacao || 0;
  // longe de Luanda (Cabinda, Huambo…) só se já lá estás: para quem está sem dinheiro, um avião não é solução
  const aqui = e => !e.bairro || e.bairro === J?.bairro || !/^(cabinda|huambo|namibe|lubango|benguela)$/.test(e.bairro);
  const posso = lista.filter(e => aqui(e) && (e.estudo_min || 0) <= est && (e.reputacao_min || 0) <= rep).sort((a, b) => b.salario - a.salario);
  const proximo = lista.filter(e => aqui(e) && (e.estudo_min || 0) === est + 1 && (e.reputacao_min || 0) <= rep).sort((a, b) => b.salario - a.salario)[0]
    || lista.filter(e => aqui(e) && (e.estudo_min || 0) > est).sort((a, b) => a.estudo_min - b.estudo_min || b.salario - a.salario)[0];
  return { melhor: posso[0], proximo, semEstudo: lista.filter(e => aqui(e) && !(e.estudo_min || 0)).sort((a, b) => b.salario - a.salario)[0] };
}
const custoModulo = () => 5000 * ((J?.estudo || 0) + 1);   // universidade normal (as caras multiplicam)
const custoCantina = () => (typeof TIPOS_EMP !== 'undefined' && TIPOS_EMP.cantina?.custo || 150000) + 25000;   // + licença
const ouroParaCantina = () => Math.max(0, Math.ceil((custoCantina() - Math.max(0, J?.kumbu || 0)) / 100));
const podeCredito = () => J && J.criado_em && Date.now() - Date.parse(J.criado_em) >= 864e5;

/* ---------- 1) a app «Ganhar dinheiro» ---------- */
function renderGuiaDinheiro(body) {
  const { melhor, proximo, semEstudo } = empregosParaMim();
  const nm = e => e ? tr(e.nome) : '';
  const passos = [
    ['💼', tr('1. Arranja um emprego'),
      melhor ? tr('O melhor que podes ter agora: {0}, {1} por turno.').replace('{0}', nm(melhor)).replace('{1}', fmtKz(melhor.salario))
             : tr('Sem estudos já há trabalho: até {0} por turno.').replace('{0}', fmtKz(semEstudo?.salario || 9500)),
      tr('Os 2 primeiros turnos do dia pagam tudo; a partir do 3.º pagam menos.'), 'vagas', tr('Ver vagas')],
    ['🎓', tr('2. Estuda para ganhar mais'),
      proximo ? tr('Com estudo nível {0}: {1}, {2} por turno.').replace('{0}', proximo.estudo_min).replace('{1}', nm(proximo)).replace('{2}', fmtKz(proximo.salario)) : tr('Já tens o estudo máximo. Doutor!'),
      tr('O próximo módulo custa {0} (até 3 por dia).').replace('{0}', fmtKz(custoModulo())), 'universidade', tr('Universidade')],
    ['🍲', tr('3. Abre o teu primeiro negócio'),
      tr('Uma Cantina custa {0} com a licença e vende todos os dias às 18:00, mesmo quando não jogas.').replace('{0}', fmtKz(custoCantina())),
      tr('Sem dinheiro? O banco empresta e pagas com uma parte do que o negócio faturar. Ou paga o que falta com Ouro.'), 'empresas', tr('Abrir negócio')],
    ['📈', tr('4. Faz o negócio crescer'),
      tr('Passa de quiosque a loja e a plaza, abre filiais noutros bairros e depois negócios maiores: candongueiros (500 mil) e discoteca (800 mil).'),
      tr('Guarda o lucro no banco: os ladrões não roubam o que está no banco.'), 'empresas', tr('Os meus negócios')],
  ];
  body.innerHTML = `<div class="guia-din">
    <p class="m">${esc(tr('Do primeiro turno ao teu próprio negócio, passo a passo.'))}</p>
    ${passos.map(([ic, t, a, b, app, bt]) => `<div class="gd-passo"><span class="gd-ic" aria-hidden="true">${ic}</span><div class="gd-t"><b>${esc(t)}</b><p>${esc(a)}</p><small>${esc(b)}</small>
      <button class="btn sm" data-gd="${app}">${esc(bt)}</button></div></div>`).join('')}
    <div class="gd-fim"><a class="btn ghost full" href="${guiaDinheiroUrl()}" target="_blank" rel="noopener">${esc(tr('Ver o guia completo'))}</a>
      <a class="btn ghost full" href="https://wa.me/?text=${encodeURIComponent(tr('Como ganhar kumbu no Vida na Banda:') + ' ' + guiaDinheiroUrl())}" target="_blank" rel="noopener">${esc(tr('Partilhar no WhatsApp'))}</a></div>
  </div>`;
  body.querySelectorAll('[data-gd]').forEach(b => b.onclick = () => abrirTelemovel(b.dataset.gd));
}

/* ---------- 2) «estou sem dinheiro» ---------- */
function semDinheiroAgora() { return J && (Math.max(0, J.kumbu || 0) + Math.max(0, J.poupanca || 0)) < SEM_DINHEIRO_KZ && !J.preso; }
function melhoresTres() {
  const { melhor, proximo } = empregosParaMim(), r = [];
  if (J.emprego) { const e = emprego(J.emprego); if (e) r.push(['💼', tr('Trabalha um turno como {0}').replace('{0}', tr(e.nome)), '+' + fmtKz(e.salario), 'vagas']); }
  else if (melhor) r.push(['💼', tr('Aceita o emprego de {0}').replace('{0}', tr(melhor.nome)), '+' + fmtKz(melhor.salario) + ' ' + tr('por turno'), 'vagas']);
  if (J.pais_dia !== hojeLuanda()) r.push(['💸', tr('Pede dinheiro aos pais (1 vez por dia)'), tr('grátis'), 'pais']);
  if (proximo && (J.kumbu || 0) >= custoModulo()) r.push(['🎓', tr('Estuda um módulo: abre {0}').replace('{0}', tr(proximo.nome)), fmtKz(proximo.salario) + ' ' + tr('por turno'), 'universidade']);
  if (r.length < 3 && melhor && J.emprego && melhor.id !== J.emprego && melhor.salario > (emprego(J.emprego)?.salario || 0))
    r.push(['⬆️', tr('Muda para {0}').replace('{0}', tr(melhor.nome)), '+' + fmtKz(melhor.salario) + ' ' + tr('por turno'), 'vagas']);
  if (r.length < 3) r.push(['🛍️', tr('Faz biscates ou vende na zunga'), tr('dinheiro na hora'), 'mapa']);
  if (r.length < 3) r.push(['🏦', tr('Guarda o que ganhares no banco'), tr('a salvo de ladrões'), 'banco']);
  return r.slice(0, 3);
}
function mostrarSemDinheiro(forcar) {
  if (!J || document.querySelector('.sem-din')) return;
  const ouro = ouroParaCantina(), temOuro = (J.ouro || 0) >= ouro;
  const v = document.createElement('div'); v.className = 'novidades sem-din'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<div class="nov-caixa">
      <button class="nov-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <div class="nov-topo"><div class="nov-emo" aria-hidden="true" data-sem-traducao>💸</div><small>${esc(tr('Pouco kumbu?'))}</small>
        <h2>${esc(tr('Faz isto agora'))}</h2><p>${esc(tr('As 3 coisas que mais te rendem neste momento:'))}</p></div>
      <div class="sd-lista">${melhoresTres().map(([ic, t, v2, a]) => `<button class="sd-acao" data-sd="${a}"><span aria-hidden="true">${ic}</span><b>${esc(t)}</b><em>${esc(v2)}</em></button>`).join('')}</div>
      <div class="sd-neg"><b>${esc(tr('Ou abre já o teu negócio'))}</b><p>${esc(tr('Uma Cantina vende todos os dias, mesmo quando não jogas.'))}</p>
        <button class="btn full" data-sd="ouro">🪙 ${esc((temOuro ? tr('Abrir uma Cantina com {0} Ouro') : tr('Abrir uma Cantina com Ouro ({0} Ouro)')).replace('{0}', milhar(ouro)))}</button>
        ${podeCredito() ? `<button class="btn ghost full" data-sd="credito">🏦 ${esc(tr('Pedir crédito ao banco'))}</button>` : `<small>${esc(tr('O crédito do banco fica disponível depois do teu 1.º dia de jogo.'))}</small>`}
      </div>
      <div class="nov-botoes"><button class="btn ghost full" data-sd="guia">💰 ${esc(tr('Como ganhar dinheiro'))}</button></div>
    </div>`;
  const fechar = () => v.remove();
  v.querySelector('.nov-x').onclick = fechar;
  v.querySelectorAll('[data-sd]').forEach(b => b.onclick = async () => {
    const a = b.dataset.sd; fechar();
    if (a === 'pais') { if (await acao('pedir_dinheiro_pais')) abrirTelemovel('eu'); return; }
    if (a === 'mapa') { toast(tr('Procura os edifícios com biscates no mapa, ou aceita a vaga de zungueiro/a em Vagas.'), 'info'); return; }
    if (a === 'ouro') { if (!temOuro && typeof sugerirOuro === 'function') return sugerirOuro(ouro); empPagarOuro = true; return abrirTelemovel('empresas'); }
    if (a === 'credito' || a === 'empresas') return abrirTelemovel('empresas');
    if (a === 'guia') return abrirTelemovel('dinheiro');
    abrirTelemovel(a);
  });
  document.body.appendChild(v);
}
let empPagarOuro = false;   // veio do «abrir com Ouro»: o formulário das empresas oferece logo o Ouro

/* ---------- 3) cartão único no início ---------- */
function mostrarCartaoGuia() {
  if (document.querySelector('.cartao-guia')) return;
  const c = document.createElement('div'); c.className = 'cartao-guia'; c.setAttribute('role', 'status');
  c.innerHTML = `<span aria-hidden="true">💰</span><div><b>${esc(tr('Queres ganhar kumbu?'))}</b><small>${esc(tr('Do primeiro emprego ao teu negócio, passo a passo.'))}</small></div>
    <button class="btn sm" data-cg="ir">${esc(tr('Ver'))}</button><button class="cg-x" data-cg="x" aria-label="${esc(tr('Fechar'))}">✕</button>`;
  const fim = () => { try { localStorage.setItem('vel_cartao_guia_' + uid, '1'); } catch { } c.remove(); };
  c.querySelector('[data-cg="x"]').onclick = fim;
  c.querySelector('[data-cg="ir"]').onclick = () => { fim(); abrirTelemovel('dinheiro'); };
  document.body.appendChild(c);
  setTimeout(() => c.isConnected && fim(), 30000);
}

// quando o jogo está aberto, sem outras janelas e sem tutorial: primeiro o cartão (1 vez), depois o «sem dinheiro» (1× por dia)
// 10 nov 01:05 (dono): «make sure it's rightly timed and not a nuisance for everybody» —
// · nunca logo ao entrar: o cartão aparece 2–6 min depois de entrar; o «Pouco kumbu?» 5–12 min depois (ao acaso, para não ser tudo ao mesmo tempo)
// · nunca nos primeiros 30 min de uma conta nova (ainda está a aprender o jogo), nem com outra janela aberta, nem dentro de um negócio
// · o «Pouco kumbu?» no máximo 1 vez por dia, e só se continuar sem dinheiro nesse momento; o cartão só 1 vez por conta
const _dinEntrou = Date.now(), _dinCartaoEm = _dinEntrou + (window.__DIN_JA ? 0 : (2 + Math.random() * 4) * 60000), _dinSemEm = _dinEntrou + (window.__DIN_JA ? 0 : (5 + Math.random() * 7) * 60000);
(function vigiarDinheiro() {
  let n = 0;
  const t = setInterval(() => {
    if (++n > 600) return clearInterval(t);   // ~30 min
    if (Date.now() < _dinCartaoEm) return;
    if (J?.criado_em && Date.now() - Date.parse(J.criado_em) < 30 * 60000 && !window.__DIN_JA) return;
    const pronto = typeof J !== 'undefined' && J && typeof uid !== 'undefined' && uid && document.querySelector('#carregar.hide');
    if (!pronto) return;
    let tut = false, cartao = false, nov = false, dia = null;
    try { tut = !!localStorage.getItem('vel_tut_' + uid); cartao = !!localStorage.getItem('vel_cartao_guia_' + uid); nov = !!localStorage.getItem(typeof NOVIDADES_CHAVE !== 'undefined' ? NOVIDADES_CHAVE : 'x') || !!window.__SEM_NOV; dia = localStorage.getItem('vel_sem_din_' + uid); } catch { }
    if (!tut || !nov || (typeof tycoonAberto !== 'undefined' && tycoonAberto) || document.querySelector('.veil, .tel-modal, .pergunta, .novidades, #telVeil:not([hidden])')) return;
    if (!cartao) { mostrarCartaoGuia(); return; }
    if (Date.now() >= _dinSemEm && dia !== hojeLuanda() && semDinheiroAgora()) {
      try { localStorage.setItem('vel_sem_din_' + uid, hojeLuanda()); } catch { }
      clearInterval(t); mostrarSemDinheiro();
    }
  }, 3000);
})();
