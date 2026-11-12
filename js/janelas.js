/* ============================================================
   Vida na Banda — 🪟 janelas com forma própria (FILA 0am, fase 2; dono 31 out: «start stage 2 now»)
   Desenho aprovado no Claude Design (Linguagem visual): sabes o que é antes de ler — e as palavras ficam.
   · Recompensa: cartão ao centro com brilho dourado, moeda grande, número grande, um botão («Recolher»).
   · Aviso: sobe de baixo com faixa vermelha e triângulo, diz o que falta e dá botões para resolver.
   · Pedido: desce de cima com a cara (inicial) da pessoa, em rosa; Aceitar / Agora não.
   ============================================================ */
const RECOMPENSA_MIN = 1000;   // a partir de quanto kumbu ganho aparece o cartão (abaixo disso fica o aviso curto)
const emJogoAgora = () => !!document.getElementById('jetski') || !!document.getElementById('kart') || !!document.querySelector('.mj-veil, #viagem:not(.hide)');

function fecharJanela(el) { if (!el || el.__fecha) return; el.__fecha = true; el.classList.add('sai'); setTimeout(() => el.remove(), 220); }

// 🪙 recompensa
function janelaRecompensa({ etiqueta, valor, texto, ouro = false }) {
  document.querySelectorAll('.jn-recompensa').forEach(e => e.remove());
  const el = document.createElement('div'); el.className = 'jn-veu jn-recompensa'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', etiqueta);
  el.innerHTML = `<div class="jn-cartao">
      <div class="jn-moeda">${icone(ouro ? 'ouro' : 'dinheiro', 54)}</div>
      <div class="jn-etq">${esc(etiqueta)}</div>
      <div class="jn-valor">${esc(valor)}</div>
      ${texto ? `<p class="jn-txt">${esc(texto)}</p>` : ''}
      <button class="btn full jn-ok">${esc(tr('Recolher'))}</button>
    </div>`;
  document.body.appendChild(el);
  const fecha = () => fecharJanela(el);
  el.querySelector('.jn-ok').onclick = fecha;
  el.addEventListener('click', e => { if (e.target === el) fecha(); });
  setTimeout(fecha, 7000);
  el.querySelector('.jn-ok').focus({ preventScroll: true });
  return el;
}

// ⚠️ aviso (com botões para resolver)
function janelaAviso({ titulo, texto, medidor, acoes = [] }) {
  document.querySelectorAll('.jn-aviso').forEach(e => e.remove());
  const el = document.createElement('div'); el.className = 'jn-veu jn-aviso'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', titulo);
  el.innerHTML = `<div class="jn-folha">
      <div class="jn-topo"><div class="jn-tri" aria-hidden="true">${icone('aviso', 26)}</div>
        <div><div class="jn-tit">${esc(titulo)}</div>${texto ? `<div class="jn-sub">${esc(texto)}</div>` : ''}</div></div>
      ${medidor ? `<div class="jn-med"><span class="jn-med-ic" data-cat="${medidor.cat}">${icone(medidor.ic, 22)}</span><div class="jn-barra"><u style="width:${Math.max(3, Math.min(100, medidor.v / medidor.max * 100))}%"></u></div><b>${Math.round(medidor.v)}<span> / ${medidor.max}</span></b></div>` : ''}
      ${acoes.length ? `<div class="jn-acoes">${acoes.map((a, i) => `<button class="jn-acao${i ? '' : ' jn-prim'}" data-i="${i}"><span class="jn-acao-ic" data-cat="${a.cat}">${icone(a.ic, 26)}</span><b>${esc(a.nome)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</button>`).join('')}</div>` : ''}
      <button class="jn-nao">${esc(tr('Agora não'))}</button>
    </div>`;
  document.body.appendChild(el);
  const fecha = () => fecharJanela(el);
  el.querySelector('.jn-nao').onclick = fecha;
  el.addEventListener('click', e => { if (e.target === el) fecha(); });
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { fecha(); acoes[+b.dataset.i].fn(); });
  return el;
}

// as mensagens de erro do servidor que têm solução à mão viram um aviso com botões; as outras ficam como aviso curto
function comerPerto() {
  const r = (typeof procurarNoJogo === 'function' ? procurarNoJogo('comer comida restaurante') : []).filter(e => e.tipo === 'lugar' && e.bairro === J?.bairro);
  if (r.length) return abrirResultado(r[0]);
  abrirTelemovel('vida');
}
function avisoDoErro(m) {   // m vem do servidor sempre em português; o texto mostrado vai traduzido
  if (!J || emJogoAgora()) return false;
  const t = tr(m);
  if (/cansad|energia|exaust/i.test(m)) {
    janelaAviso({ titulo: tr('Sem energia'), texto: t, medidor: { ic: 'energia', cat: 'corpo', v: J.energia ?? 0, max: 100 },
      acoes: [{ ic: 'cama', cat: 'corpo', nome: tr('Dormir'), sub: tr('Ir para casa'), fn: () => { fecharSheets?.(); fecharTelemovel?.(); $('#bCasa')?.click(); } },
              { ic: 'fome', cat: 'corpo', nome: tr('Comer'), sub: tr('Aqui perto'), fn: () => { fecharSheets?.(); comerPerto(); } }] });
    return true;
  }
  if (/fome|com fome/i.test(m)) {
    janelaAviso({ titulo: tr('Com fome'), texto: t, medidor: { ic: 'fome', cat: 'corpo', v: J.fome ?? 0, max: 100 },
      acoes: [{ ic: 'fome', cat: 'corpo', nome: tr('Comer'), sub: tr('Aqui perto'), fn: () => { fecharSheets?.(); comerPerto(); } }] });
    return true;
  }
  if (/kumbu|dinheiro suficiente|não tens dinheiro|faltam/i.test(m) && !/conta do casal/i.test(m)) {
    janelaAviso({ titulo: tr('Falta kumbu'), texto: t,
      acoes: [{ ic: 'vagas', cat: 'trabalho', nome: tr('Trabalhar'), sub: tr('Ver vagas'), fn: () => abrirTelemovel('vagas') },
              { ic: 'banco', cat: 'dinheiro', nome: tr('Banco'), sub: tr('Poupanças e empréstimos'), fn: () => abrirTelemovel('banco') }] });
    return true;
  }
  return false;
}

// 💌 pedido de outro jogador (desce de cima)
const PEDIDO_CAT = { namoro: ['vida', 'amor'], casamento: ['anel', 'amor'], noivado: ['anel', 'amor'], filho: ['bebe', 'amor'], encontro: ['vida', 'amor'],
  amizade: ['mao', 'pessoas'], familia: ['social', 'pessoas'], visita: ['casa', 'pessoas'] };
let _pedidosVistos = new Set();
try { _pedidosVistos = new Set(JSON.parse(sessionStorage.getItem('vel_pedidos_vistos') || '[]')); } catch { }
function janelaPedido(p, texto) {
  const [ic, cat] = PEDIDO_CAT[p.tipo] || ['social', 'pessoas'];
  const el = document.createElement('div'); el.className = 'jn-pedido'; el.dataset.cat = cat; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', p.nome);
  el.innerHTML = `<div class="jn-cara" aria-hidden="true">${esc((p.nome || '?').slice(0, 1).toUpperCase())}<span class="jn-cara-ic">${icone(ic, 14)}</span></div>
    <div class="jn-ped-t"><b data-sem-traducao>${esc(p.nome)}</b><small>${texto}</small>
      <div class="jn-ped-b"><button class="btn sm jn-sim">✓ ${esc(tr('Aceitar'))}</button><button class="btn sm ghost jn-nao2">${esc(tr('Recusar'))}</button></div></div>`;
  document.body.appendChild(el);
  const fecha = () => fecharJanela(el);
  // 9 nov (dono: «when I decline them, they don't actually decline and come up again»): «Recusar» recusa mesmo no servidor
  // (antes só fechava a janela). Se o jogo ainda estiver ocupado (p. ex. a abrir), espera um pouco em vez de não fazer nada.
  const livre = async () => { for (let i = 0; i < 25 && typeof ocupado !== 'undefined' && ocupado; i++) await new Promise(r => setTimeout(r, 200)); };
  el.querySelector('.jn-nao2').onclick = async () => { fecha(); await livre(); await responderPedido(p.id, false); };
  el.querySelector('.jn-sim').onclick = async () => { fecha(); await livre(); await responderPedido(p.id, true); };
  setTimeout(fecha, 12000);
  return el;
}
function mostrarPedidosNovos(lista, nomes) {
  if (emJogoAgora()) return;
  // 9 nov: nada de pedidos por cima do ecrã de carregamento — aparecem quando o jogo já está aberto
  const carregar = document.getElementById('carregar');
  if (carregar && !carregar.classList.contains('hide')) { clearTimeout(mostrarPedidosNovos._t); mostrarPedidosNovos._t = setTimeout(() => mostrarPedidosNovos(lista, nomes), 1500); return; }
  const novos = (lista || []).filter(p => !_pedidosVistos.has(p.id)).slice(0, 2);
  novos.forEach((p, k) => { _pedidosVistos.add(p.id); setTimeout(() => janelaPedido(p, nomes(p)), k * 600); });
  try { sessionStorage.setItem('vel_pedidos_vistos', JSON.stringify([..._pedidosVistos].slice(-60))); } catch { }
}
