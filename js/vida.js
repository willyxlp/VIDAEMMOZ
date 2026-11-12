/* ============================================================
   Vida na Banda — VIDA E PESSOAS
   Idade e fases da vida, classe de nascimento, relações entre
   jogadores (amizade, namoro, casamento, família), fofocas e
   moderação (filtro, bloquear, denunciar, painel de admin).
   Usa as variáveis globais de jogo.js (sb, J, uid, eu, canal…).
   ============================================================ */
let dmPrivadoRecusado = false;   // 0fx
let bloqueados = new Set(), pedidosPendentes = [], fofocas = [], fofCanal = null, ligarFofocas = null, fofBairro = null, fofPeloPulso = false;
let casal = null; // o cônjuge: {id, nome, casa, parede, chao, lar, cofre, casados_em}
let larDono = null; // dono da casa onde moro, quando não é minha

/* ---------- vida a dois: casa partilhada e conta do casal ---------- */
const LOCAIS = {
  praia: { e: '🏖️', nome: 'Tarde na praia da Ilha', bairro: 'ilha', preco: 0 },
  marginal: { e: '🌅', nome: 'Passeio na Marginal ao pôr do sol', bairro: 'mutamba', preco: 0 },
  kizomba: { e: '💃', nome: 'Noite de kizomba', bairro: 'maianga', preco: 6000 },
  cinema: { e: '🎬', nome: 'Cinema no Belas Shopping', bairro: 'talatona', preco: 8000 },
  restaurante: { e: '🍽️', nome: 'Jantar à beira-mar na Ilha', bairro: 'ilha', preco: 20000 },
};
// FILA 0dm-3 (dono, 5 nov): «Sair juntos» com amigos — a lista vai crescer (igual no servidor: _local_saida)
const SAIDAS = {
  s_karaoke: { e: '🎤', nome: 'Karaoke no Bar do Largo', bairro: 'maianga', preco: 3000 },
  s_futebol: { e: '⚽', nome: 'Futebolada no Campo do Cazenga', bairro: 'cazenga', preco: 0 },
  s_relaxar: { e: '😎', nome: 'Relaxar no Bar da Praia', bairro: 'ilha', preco: 2000 },
  s_shopping: { e: '🛍️', nome: 'Passeio no Talatona Shopping', bairro: 'talatona', preco: 0 },
  s_cinema: { e: '🎬', nome: 'Cinema no Talatona Shopping', bairro: 'talatona', preco: 8000 },
};
const localSaida = id => LOCAIS[id] || SAIDAS[id];
// Colunas de outros jogadores que o servidor deixa ler (migração 20261022001500_seguranca.sql). Os teus dados vêm do RPC estado().
const COLS_PUBLICAS = 'id,nome,avatar,bairro,casa,casa_aberta,emprego,aparencia,parede,chao,lar,visto_em,criado_em,reputacao,maior,classe,provincia,fas,geracao,cadastro,procurado,nascido_em,idade_base,nome_vida,colegio,vip_ate';
// Gold Exclusive C: os carros com acabamentos no perfil (dourado, diamante, néon, matrícula)
function carrosPerfilHTML(ac) {
  const ks = Object.keys(ac || {}).filter(k => Object.keys(ac[k] || {}).length); if (!ks.length) return '';
  return `<div class="carrosPerfil">${ks.map(k => { const a = ac[k], it = D.itens?.find(i => i.id === k);
    return `<span class="chip-carro">${it?.emoji || '🚗'} ${esc(tr(it?.nome || k))}${a.pintura === 'ouro' ? ' 🟡' : a.pintura === 'diamante' ? ' 💎' : ''}${a.neon ? ` <i class="neon-ponto" style="background:${esc(a.neon)}"></i>` : ''}${a.matricula ? ` <b class="matricula" data-sem-traducao>${esc(a.matricula)}</b>` : ''}</span>`; }).join('')}</div>`;
}
// 6 nov: registo criminal (prisões e condenações; o que tem mais de 28 dias está «limpo»)
function registoCriminalHTML(rc) {
  if (!rc || !rc.total) return `<div class="chips" style="margin-top:6px"><span class="chip">📜 ${esc(tr('Registo criminal limpo'))}</span></div>`;
  return `<div class="sec" style="margin-top:10px"><h4>📜 ${esc(tr('Registo criminal'))}</h4><span>${rc.ativos} ${esc(tr('ativos'))}</span></div><div class="list">${(rc.lista || []).map(x => `<div class="row ${x.limpo ? 'lock' : ''}"><span class="e">${x.tipo === 'tribunal' ? '⚖️' : '⛓️'}</span><div class="t"><b>${esc(tr(x.descricao))}</b><small>${new Date(x.criado_em).toLocaleDateString()}${x.limpo ? ' · ' + esc(tr('limpo')) : ''}</small></div></div>`).join('')}</div>`;
}
async function carregarCasal() {
  casal = null; larDono = null; if (!uid) return;
  const pv = pre('veiculos_lar'), pa = pre('acab_lar'), pl = pre('lar_dono'), pc = pre('casal');
  if (pv && pa) {   // 8 nov (0fe-3): veio no arranque
    itensDoConjuge = Array.isArray(pv.v) ? pv.v : []; acabConjuge = pa.v && typeof pa.v === 'object' ? pa.v : {};
    larDono = pl?.v?.casa ? pl.v : null;
    if (pc?.v) casal = pc.v;
    return;
  }
  sb.rpc('veiculos_do_lar').then(({ data }) => { itensDoConjuge = Array.isArray(data) ? data : []; }, () => { itensDoConjuge = []; });   // 0cy (5)(6)
  sb.rpc('acabamentos_do_lar').then(({ data }) => { acabConjuge = data && typeof data === 'object' ? data : {}; }, () => { acabConjuge = {}; });   // Gold Exclusive C
  if (!J.casa && J.lar) { const { data } = await sb.from('jogadores').select('id,nome,casa,parede,chao').eq('id', J.lar).maybeSingle(); larDono = data?.casa ? data : null; }
  const { data: r, error } = await sb.from('relacoes').select('*').or(`a.eq.${uid},b.eq.${uid}`).eq('romance', 'casados').maybeSingle();
  if (error || !r) return;
  const sid = r.a === uid ? r.b : r.a;
  const { data: s } = await sb.from('jogadores').select('id,nome,casa,parede,chao,lar,bairro').eq('id', sid).maybeSingle();
  if (s) casal = { ...s, cofre: r.cofre ?? 0, casados_em: r.casados_em };
}
// id do dono da casa onde moro, quando é a casa do meu cônjuge
function donoLar() { return J && !J.casa && J.lar && larDono && larDono.id === J.lar ? larDono.id : null; }
function ehMeuLar(id) { return id === uid || (id != null && id === donoLar()); }
function meuLar() {
  if (!J) return null;   // 6 nov: a sair do jogo
  if (J.casa) return { id: uid, nome: J.nome, casa: J.casa, parede: J.parede, chao: J.chao };
  return donoLar() ? { id: larDono.id, nome: larDono.nome, casa: larDono.casa, parede: larDono.parede, chao: larDono.chao } : null;
}
function blocoCasal() {
  if (!casal) return '';
  const dias = casal.casados_em ? Math.max(0, Math.floor((Date.now() - new Date(casal.casados_em)) / 864e5)) : null;
  const juntos = donoLar() === casal.id || (casal.lar === uid && !casal.casa && J.casa);
  const podeMudar = casal.casa && !(J.lar === casal.id && !J.casa);
  return `<div class="rel" style="border-color:#a8487a">
    <div class="lbl"><span>💍 Casado/a com ${esc(casal.nome)}</span><span style="color:var(--dim);font-weight:600">${dias != null ? (dias ? `há ${dias} dia${dias > 1 ? 's' : ''}` : 'desde hoje') : ''}</span></div>
    <p class="m" style="margin:6px 0 0">${juntos ? '🏠 Moram juntos.' : casal.casa || J.casa ? '🏠 Ainda não moram juntos.' : '🏠 Nenhum de vocês tem casa — arrendem uma e mudem-se juntos.'}</p>
    ${podeMudar ? `<button class="btn sm" id="bMorar" style="margin-top:8px">🏠 Mudar para a casa de ${esc(casal.nome)}</button>` : ''}
    <div class="lbl" style="margin-top:12px"><span>🏦 Conta do casal</span><span class="price">${fmtKz(casal.cofre)}</span></div>
    <div style="display:flex;gap:6px;margin-top:8px"><input class="inp" id="iCofre" type="number" min="100" step="100" placeholder="Valor (Kz)" style="flex:1;padding:8px 10px">
    <button class="btn sm" id="bPor">Pôr</button><button class="btn sm ghost" id="bTirar">Tirar</button></div>
    <small style="display:block;color:var(--dim);font-size:11.5px;margin-top:6px">Os dois podem pôr e tirar. Se se divorciarem, a conta é dividida ao meio.</small>
  </div>`;
}
function ligarCasal(body) {
  if (!casal) return;
  const valor = () => parseInt(body.querySelector('#iCofre').value, 10);
  const mexer = async sinal => {
    const v = valor(); if (!v || v <= 0) return toast('Escreve um valor.', 'mau');
    const r = await acao('conta_casal', { p_valor: sinal * v });
    if (r) { await carregarCasal(); abrirTelemovel('eu'); }
  };
  body.querySelector('#bPor').onclick = () => mexer(1);
  body.querySelector('#bTirar').onclick = () => mexer(-1);
  body.querySelector('#bMorar')?.addEventListener('click', () => confirmar(`Mudar para a casa de ${esc(casal.nome)}? 🏠`,
    J.casa ? 'Vais deixar a tua casa. Os teus móveis vão para o armazém da casa nova e a renda passa a ser paga por ' + esc(casal.nome) + '.' : 'A renda é paga por ' + esc(casal.nome) + '. Os dois podem decorar.',
    'Mudar', async () => {
      const r = await acao('morar_juntos');
      if (r) { fecharSheets(); await carregarCasal(); await carregarMinhaMobilia(); hud(); if (cena?.tipo === 'casa') irParaBairro(J.bairro, true); }
    }));
}
/* ---------- FILA 0n: o encontro acontece no sítio (dono, 28 out) ----------
   Quem aceita viaja logo até lá; quem convidou recebe «X aceitou — ir ao encontro?» e faz o mesmo.
   O resultado já vem do servidor (responder_pedido / encontro_por_ver); aqui é a viagem e a cena. */
const SITIO_ENCONTRO = {
  praia: { lugar: 'Bar da Praia', dentro: false, falas: ['Que água tão azul! 🌊', 'Anda, vamos molhar os pés 😄', 'Isto é que é vida 🌴'] },
  marginal: { lugar: 'Fortaleza de São Miguel', dentro: false, falas: ['Olha o pôr do sol na baía 🌅', 'Luanda é linda daqui', 'Que brisa boa 😌'] },
  kizomba: { lugar: 'Bar do Largo', dentro: true, falas: ['Dança comigo? 💃', 'Tu danças bem! 😄', 'Mais uma música! 🎶'] },
  cinema: { lugar: 'Talatona Shopping', dentro: true, falas: ['Pipocas ou gelado? 🍿', 'Esse filme é bom?', 'Senta-te aqui ao pé de mim 😊'] },
  restaurante: { lugar: 'Restaurante Coconuts', dentro: true, falas: ['Que vista linda 🌊', 'O peixe está divinal 🐟', 'Brindamos? 🥂'] },
  s_karaoke: { lugar: 'Bar do Largo', dentro: true, falas: ['Escolhe tu a música! 🎤', 'Desafinaste tanto 😂', 'Agora em dueto! 🎶'] },
  s_futebol: { lugar: 'Campo do Cazenga', dentro: false, falas: ['Passa a bola! ⚽', 'Golooo! 🥅', 'Mais um jogo? 😅'] },
  s_relaxar: { lugar: 'Bar da Praia', dentro: false, falas: ['Isto é que é vida 😎', 'Uma Cuca bem gelada? 🍺', 'Olha o pôr do sol 🌅'] },
  s_shopping: { lugar: 'Talatona Shopping', dentro: true, falas: ['Vamos ver ténis? 👟', 'Um gelado? 🍦', 'Tanta coisa gira aqui 🛍️'] },
  s_cinema: { lugar: 'Talatona Shopping', dentro: true, falas: ['Pipocas grandes! 🍿', 'Esse filme é bom?', 'Que final! 😮'] },
};
let emEncontro = false;
async function irAoEncontro(e, meio = 'taxi') {
  const L = localSaida(e.local), S = SITIO_ENCONTRO[e.local], amigos = !!SAIDAS[e.local];
  if (!L || !S || emEncontro) return;
  emEncontro = true;
  parOculto = { id: e.com, ate: Date.now() + 70000 }; outros.delete(e.com);   // a pessoa verdadeira volta a aparecer depois da cena
  setTimeout(() => { try { if (canal) sincronizarPresenca(); } catch { } }, 71000);
  try {
    const [{ data: par }, { data: est }] = await Promise.all([sb.from('jogadores').select('id,nome,aparencia').eq('id', e.com).maybeSingle(), sb.rpc('estado')]);
    if (est?.jogador) setJogador(est.jogador);
    if (typeof fecharTelemovel === 'function' && telAberto) fecharTelemovel();
    fecharSheets();
    // a viagem até lá, os dois juntos, no transporte que quem convidou escolheu (quem convidou já pagou)
    const ja = cena?.tipo === 'bairro' && cena.id === L.bairro;
    // dono 1 nov: «anytime there is a journey, ads» — mesmo no mesmo bairro há a viagem até ao sítio (com os anúncios)
    { const fp = viagemPrimeiraPessoa(meio, ja ? tr(L.nome) : bairro(L.bairro).nome, { com: par?.aparencia }); await fp.promessa; if (!ja) await irParaBairro(L.bairro, true); }
    const o = cena.objetos.find(x => x.spec?.nome === S.lugar);
    if (S.dentro && o && typeof entrarEdificio === 'function') entrarEdificio(o);
    else if (o) {   // ao ar livre: ao lado do sítio
      const alvo = o.porta && !cena.bloq[o.porta[1] * cena.W + o.porta[0]] ? o.porta : livreProximo(cena.bloq, cena.W, cena.H, o.x, o.y + o.d);
      if (alvo) { eu.x = alvo[0] + 0.5; eu.y = alvo[1] + 0.5; eu.path = []; }
    }
    // o teu par aparece ao teu lado
    const livre = (() => { for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const x = Math.floor(eu.x) + dx, y = Math.floor(eu.y) + dy; if (x >= 0 && y >= 0 && x < cena.W && y < cena.H && !cena.bloq[y * cena.W + x]) return [x, y]; } return [Math.floor(eu.x), Math.floor(eu.y)]; })();
    const nomePar = par?.nome || '…', ap = par?.aparencia || aparenciaAleatoria(rng(7));
    const parP = novoPersonagem('encontro', nomePar, ap, livre[0], livre[1], { npc: true, espera: 1e9 });
    npcs.push(parP);
    eu.dir = parP.x >= eu.x ? 1 : -1; parP.dir = -eu.dir;
    // se houver uma mesa com uma cadeira de cada lado (restaurantes), sentam-se os dois frente a frente
    const cad = cena.objetos.filter(c => c.kind === 'movel' && c.mv?.tipo === 'cadeira');
    const par2 = cad.map(c1 => [c1, cad.find(c2 => c2 !== c1 && c2.y === c1.y && c2.x === c1.x + 2 && cena.objetos.some(m => m.kind === 'movel' && m.mv?.tipo === 'mesa' && m.x === c1.x + 1 && m.y === c1.y))]).find(([, c2]) => c2);
    if (par2 && typeof comecarPose === 'function') {
      const ms = 40000;
      eu.path = []; comecarPose(eu, 'sentado', par2[0], ms); comecarPose(parP, 'sentado', par2[1], ms);
      eu.d8 = null; parP.d8 = null; eu.pose.dir = 1; parP.pose.dir = -1;
    }
    cam.z = Math.max(cam.z, 1.9); centrarCamera(true);
    // conversa: falas dos dois, corações
    const falas = [[parP, S.falas[0]], [eu, '😊'], [parP, S.falas[1]], [eu, '😂'], [parP, S.falas[2]], [eu, amigos ? (e.d > 1 ? '🙌' : '😅') : e.d > 0 ? '💖' : '😬']];
    for (const [quem, txt] of falas) { quem.fala = { txt: tr(txt), ate: performance.now() + 2200 }; await new Promise(r => setTimeout(r, 1500)); }
    const sinal = e.d > 0 ? '+' : '';
    const el = sheet(`<h3>${L.e} ${esc(tr(L.nome))}</h3><p class="m">${esc(tr('Com {0}').replace('{0}', nomePar))}</p>
      <div class="row mine"><span class="e">${amigos ? '🎉' : e.d > 0 ? '💖' : '😬'}</span><div class="t"><b>${esc(tr(e.res))}</b><small>${esc(tr('Relação'))} ${sinal}${e.d}</small></div></div>
      <button class="btn full" data-fechar>${esc(tr(e.local === 's_shopping' ? 'Ir à loja de moda' : 'Continuar'))}</button>`);
    if (e.local === 's_shopping' && typeof abrirLojaModa === 'function') el.querySelector('[data-fechar]')?.addEventListener('click', () => abrirLojaModa('loja'));   // dono 6 nov: o passeio no Talatona Shopping leva à loja de moda
    // o par fica mais um bocado e depois vai-se embora
    setTimeout(() => { const i = npcs.indexOf(parP); if (i >= 0) npcs.splice(i, 1); }, 25000);
    return el;
  } finally { emEncontro = false; }
}
// quem convidou: ver se há um encontro aceite à espera (ao entrar no jogo e quando chega o aviso) e escolher o transporte
// 0cy (7): os dois vão juntos no transporte que escolheres (táxi, ou o teu carro, mota ou avião)
const MEIOS_ENCONTRO = [['taxi', '🚕', 'Táxi'], ['carro', '🚗', 'O teu carro'], ['mota', '🛵', 'A tua mota'], ['privado', '🛩️', 'O teu avião']];
function meiosEncontro() {
  return MEIOS_ENCONTRO.filter(([m]) => m === 'taxi' || (m === 'carro' && temCarro()) || (m === 'mota' && temMota()) || (m === 'privado' && temAviaoProprio()));
}
async function verEncontro() {
  const pe = pre('encontro'); const { data, error } = pe ? { data: pe.v } : await sb.rpc('encontro_por_ver');
  if (error || !data?.id) return;
  const L = localSaida(data.local); if (!L) return;
  const { data: par } = await sb.from('jogadores').select('nome').eq('id', data.com).maybeSingle();
  if (typeof fecharTelemovel === 'function' && telAberto) fecharTelemovel();
  const el = sheet(`<h3>${SAIDAS[data.local] ? '🎉' : '🌹'} ${esc(tr('{0} aceitou o teu convite!').replace('{0}', par?.nome || '…'))}</h3><p class="m">${L.e} ${esc(tr(L.nome))} · ${esc(tr('Como vão até lá? Vão os dois juntos.'))}</p>
    <div class="grelha">${meiosEncontro().map(([m, e, n]) => `<button data-meio-enc="${m}"><span class="e">${e}</span><span>${esc(tr(n))}</span></button>`).join('')}</div>`);
  el.querySelectorAll('[data-meio-enc]').forEach(b => b.onclick = async () => {
    const r = await acao('encontro_transporte', { p_id: data.id, p_meio: b.dataset.meioEnc }, { silencio: true });
    if (r) irAoEncontro(data, r.meio || b.dataset.meioEnc);
  });
}
// quem aceitou: espera que quem convidou escolha o transporte (até 1 minuto; depois vai de táxi)
async function esperarEncontro(e) {
  if (typeof fecharTelemovel === 'function' && telAberto) fecharTelemovel();
  fecharSheets();
  const { data: par } = await sb.from('jogadores').select('nome').eq('id', e.com).maybeSingle();
  const el = sheet(`<h3>${SAIDAS[e.local] ? '🎉 ' + esc(tr('Saída marcada!')) : '🌹 ' + esc(tr('Encontro marcado!'))}</h3><p class="m">${esc(tr('À espera que {0} escolha o transporte… Vão os dois juntos.').replace('{0}', par?.nome || '…'))}</p>
    <div class="esperaEnc" style="display:flex;justify-content:center;margin:12px 0"><div style="width:30px;height:30px;border-radius:50%;border:3px solid #ffffff22;border-top-color:#FFCB00;animation:vfGira .9s linear infinite"></div></div>
    <button class="btn full ghost" id="bJaTaxi">${esc(tr('Ir já de táxi'))}</button>`);
  let feito = false;
  const ir = meio => { if (feito) return; feito = true; clearInterval(t); fecharSheets(); irAoEncontro(e, meio); };
  el.querySelector('#bJaTaxi').onclick = () => ir('taxi');
  const ini = Date.now();
  const t = setInterval(async () => {
    if (feito) return clearInterval(t);
    if (!document.body.contains(el) && Date.now() - ini > 2000) { feito = true; return clearInterval(t); }   // fechou a janela: fica para depois
    const { data } = await sb.rpc('encontro_meu', { p_id: e.id });
    if (data?.meio) ir(data.meio); else if (Date.now() - ini > 60000) ir('taxi');
  }, 2000);
}
/* ---------- 0ck (dono, 3 nov): desafios de jet ski e kart ----------
   Quem aceita escolhe logo o transporte, faz a viagem e o jogo abre; quem desafiou recebe «X aceitou» e faz o mesmo.
   O resultado de cada um vem da corrida verificada no servidor (desafio_resultado). */
const DESAFIO_LUGAR = { jetski: { dest: 'ilha', ok: ['ilha', 'mussulo'], nome: 'Jet ski', e: '🌊', onde: 'O jet ski é na Ilha de Luanda. Como vais até lá?' },
  kart: { dest: 'maianga', ok: ['maianga'], nome: 'Kart', e: '🏎️', onde: 'O kartódromo é na Maianga. Como vais até lá?' } };
// 0cz (4): quem desafiou escolhe o transporte e leva o outro (desafio_transporte); juntos = mostra o par na viagem
async function irAoDesafio(d, juntos = false) {
  const L = DESAFIO_LUGAR[d.jogo]; if (!L) return;
  const par = juntos ? (await sb.from('jogadores').select('aparencia').eq('id', d.com).maybeSingle()).data : null;
  if (typeof fecharTelemovel === 'function' && telAberto) fecharTelemovel();
  fecharSheets();
  const jogar = () => d.jogo === 'jetski' ? jogarJetski(false, d) : jogarKart(d);
  if (L.ok.includes(J.bairro)) return jogar();
  const r = rotaPara(L.dest), agua = ['mussulo', 'cabinda'].includes(J.bairro), meus = [];
  if (temAviaoProprio()) meus.push(opcaoViagem(L.dest, 'privado', 'O teu avião'));
  if (!agua && temCarro()) meus.push(opcaoViagem(L.dest, 'carro', 'O teu carro'));
  if (!agua && temMota() && provDe(L.dest) === provDe(J.bairro)) meus.push(opcaoViagem(L.dest, 'mota', 'A tua mota'));
  const publico = comBoleia(r.meios.filter(m => !['carro', 'mota'].includes(m)), Math.hypot(bairro(J.bairro).x - bairro(r.dest).x, bairro(J.bairro).y - bairro(r.dest).y), r.dest).map(m => opcaoViagem(r.dest, m));
  const el = sheet(`<h3>${L.e} ${esc(tr('Desafio com {0}').replace('{0}', d.nome || '…'))}</h3><p class="m">${esc(tr(L.onde))}</p>
    ${meus.length ? `<div class="sec"><h4>⭐ ${tr('O teu transporte')}</h4></div>${grelhaDestinos(meus)}` : ''}
    <div class="sec"><h4>🚏 ${tr(meus.length ? 'Ou transporte público' : 'Transporte público')}</h4>${r.nota ? `<span>${esc(r.nota)}</span>` : ''}</div>
    ${grelhaDestinos(publico)}`);
  el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = async () => {
    if (juntos && d.id) await sb.rpc('desafio_transporte', { p_id: d.id, p_meio: bt.dataset.meio });   // o outro vem contigo
    await viajar(bt.dataset.viajar, bt.dataset.meio, { com: par?.aparencia });
    if (L.ok.includes(J.bairro)) setTimeout(jogar, 600); else if (J.bairro !== bt.dataset.viajar) return; else irAoDesafio(d, juntos);   // 2 pernas (ex.: Mussulo → Ilha → Maianga)
  });
}
async function verDesafio() {
  const pd = pre('desafio'); const { data, error } = pd ? { data: pd.v } : await sb.rpc('desafio_por_ver');
  if (error || !data?.id) return;
  const L = DESAFIO_LUGAR[data.jogo]; if (!L) return;
  const el = sheet(`<h3>🏁 ${esc(tr('{0} aceitou o teu desafio!').replace('{0}', data.nome || '…'))}</h3><p class="m">${L.e} ${esc(tr(L.nome))}</p>
    <button class="btn full" id="bIrDes">${esc(tr('Ir jogar'))}</button><button class="btn full ghost" style="margin-top:8px" data-fechar>${esc(tr('Agora não'))}</button>`);
  el.querySelector('#bIrDes').onclick = () => irAoDesafio(data, true);
}
// 0cz (4): quem aceitou o desafio espera que quem desafiou escolha o transporte; depois vão os dois juntos até ao sítio do jogo
async function esperarDesafio(d) {
  const L = DESAFIO_LUGAR[d.jogo]; if (!L) return;
  if (typeof fecharTelemovel === 'function' && telAberto) fecharTelemovel();
  fecharSheets();
  if (L.ok.includes(J.bairro)) return d.jogo === 'jetski' ? jogarJetski(false, d) : jogarKart(d);   // já estás lá
  const el = sheet(`<h3>${L.e} ${esc(tr('Desafio aceite!'))}</h3><p class="m">${esc(tr('À espera que {0} escolha o transporte… Vão os dois juntos.').replace('{0}', d.nome || '…'))}</p>
    <div style="display:flex;justify-content:center;margin:12px 0"><div style="width:30px;height:30px;border-radius:50%;border:3px solid #ffffff22;border-top-color:#FFCB00;animation:vfGira .9s linear infinite"></div></div>
    <button class="btn full ghost" id="bDesSozinho">${esc(tr('Ir sozinho/a'))}</button>`);
  let feito = false;
  const ini = Date.now();
  const sozinho = () => { if (feito) return; feito = true; clearInterval(t); irAoDesafio(d); };
  el.querySelector('#bDesSozinho').onclick = sozinho;
  const t = setInterval(async () => {
    if (feito) return clearInterval(t);
    if (!document.body.contains(el) && Date.now() - ini > 2000) { feito = true; return clearInterval(t); }
    const { data } = await sb.rpc('desafio_meu', { p_id: d.id });
    if (data?.meio) {
      feito = true; clearInterval(t); fecharSheets();
      const { data: par } = await sb.from('jogadores').select('aparencia').eq('id', d.com).maybeSingle();
      const fp = viagemPrimeiraPessoa(data.meio, bairro(L.dest).nome, { com: par?.aparencia }); await fp.promessa;
      const { data: est } = await sb.rpc('estado'); if (est?.jogador) setJogador(est.jogador);   // o servidor já te pôs lá
      await irParaBairro(J.bairro, true);
      setTimeout(() => d.jogo === 'jetski' ? jogarJetski(false, d) : jogarKart(d), 600);
    } else if (Date.now() - ini > 60000) sozinho();
  }, 2000);
}
async function fecharDesafio(d, corrida) {
  const { data, error } = await sb.rpc('desafio_resultado', { p_desafio: d.id, p_corrida: corrida });
  if (error) return;
  if (data?.espera) toast(tr('Desafio: agora é esperar que {0} jogue.').replace('{0}', d.nome || '…'), 'info', 5000);
}
function escolherSaida(p) {
  const el = sheet(`<h3>${esc(tr('Sair com {0}').replace('{0}', p.nome))} 🎉</h3><p class="m">${esc(tr('Se aceitar, vão os dois para lá e quem convida paga. Sobe o humor e a amizade.'))}</p>
    <div class="list">${Object.entries(SAIDAS).map(([id, l]) => `<button class="row" data-s="${id}" style="text-align:left"><span class="e">${l.e}</span><div class="t"><b>${esc(tr(l.nome))}</b><small>📍 ${esc(bairro(l.bairro)?.nome || l.bairro)}</small></div><span class="price">${l.preco ? fmtKz(l.preco) : esc(tr('Grátis'))}</span></button>`).join('')}</div>`);
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'saida', p_grau: b.dataset.s })) fecharSheets(); });
}
function escolherEncontro(p) {
  const el = sheet(`<h3>Convidar ${esc(p.nome)} para sair 🌹</h3><p class="m">Se aceitar, vão os dois para lá e quem convida paga. Pode correr muito bem… ou não.</p>
    <div class="list">${Object.entries(LOCAIS).map(([id, l]) => `<button class="row" data-l="${id}" style="text-align:left"><span class="e">${l.e}</span><div class="t"><b>${l.nome}</b><small>📍 ${esc(bairro(l.bairro)?.nome || l.bairro)}</small></div><span class="price">${l.preco ? fmtKz(l.preco) : 'Grátis'}</span></button>`).join('')}</div>`);
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'encontro', p_grau: b.dataset.l })) fecharSheets(); });
}

/* ---------- filtro de palavrões (o servidor também filtra) ---------- */
// 0ca (2 nov): sem «lookbehind» (?<!…) — o Safari de iOS antes do 16.4 não o lê e o script inteiro falhava. A letra/dígito antes fica no grupo 1 e volta a ser posta.
const RE_PALAVROES = /(^|[^\p{L}\d])(caralh\p{L}*|crl|put[ao]s?|fdp|pqp|fod\p{L}*|porra|cona|merda|cabr[aã]o|paneleir\p{L}*|viad[ao]s?|vsf|kuiu)(?![\p{L}\d])/giu;
function filtrarTexto(t) { return String(t ?? '').replace(RE_PALAVROES, '$1***'); }

/* ---------- idade, fase da vida, classe ---------- */
const CLASSES = { musseque: ['🏚️', 'Nasceu no musseque'], media: ['🏠', 'Classe média'], rica: ['🏛️', 'Família rica'] };
const DIAS_POR_ANO = 7; // 1 ano de jogo = 1 semana real
function idadeDe(p) {
  if (p?.nascido_em) return Math.floor((Date.now() - new Date(p.nascido_em)) / (DIAS_POR_ANO * 864e5));
  if (!p?.criado_em) return null; return (p.idade_base ?? 18) + Math.floor((Date.now() - new Date(p.criado_em)) / (DIAS_POR_ANO * 864e5));
}
// envelhecer à vista: cabelo grisalho a partir dos 55
function apVisivel(ap, idade) { return idade >= 55 && ap && ap.cabelo !== 0 && ap.cabelo !== 5 ? { ...ap, corCabelo: 5 } : ap; }
function faseDe(i) { return i < 25 ? 'Jovem' : i < 40 ? 'Adulto/a' : i < 60 ? 'Kota' : 'Mais-velho/a'; }
// novatos: 3 dias sem doenças, ladrões, burlas nem taxas
function protecaoDias() {
  const f = J?.criado_em ? new Date(J.criado_em).getTime() + 3 * 864e5 - Date.now() : 0;
  if (f <= 0) return '';
  const h = Math.ceil(f / 3600e3); return h > 24 ? `${Math.ceil(h / 24)} dias` : `${h} h`;
}
function chipsVida(p = J) {
  const i = idadeDe(p); if (i == null || !p.classe) return '';
  const c = CLASSES[p.classe] || ['', p.classe];
  const ord = n => n + '.ª';
  return `<div class="chips">${p.geracao > 1 ? `<span class="chip">👑 ${ord(p.geracao)} geração${p.nome_vida ? ' · vives como ' + esc(p.nome_vida) : ''}</span>` : ''}<span class="chip">🎂 ${i} anos · ${faseDe(i)}</span>${p.colegio ? `<span class="chip">🎓 ${tr('Antigo/a aluno/a')} ${(D.colegios?.find(c => c.id === p.colegio)?.em || 'no')} ${esc(D.colegios?.find(c => c.id === p.colegio)?.nome || p.colegio)}</span>` : ''}<span class="chip">${c[0]} ${c[1]}</span>${p.provincia ? `<span class="chip">📍 Natural de ${esc(p.provincia)}</span>` : ''}${p === J && protecaoDias() ? `<span class="chip" style="border-color:var(--green)">🛡️ Proteção de novato · ${protecaoDias()}</span>` : ''}</div>`;
}

/* ---------- arranque ---------- */
let fofocaUltimoToast = 0;
async function iniciarVida() {
  const pb = pre('bloqueios');
  const b = pb ? { data: pb.v.map(alvo => ({ alvo })) } : await sb.from('bloqueios').select('alvo');
  bloqueados = new Set((b.data || []).map(x => x.alvo));
  // 8 nov: os quatro ao mesmo tempo (eram seguidos)
  const [, , , , f] = await Promise.all([atualizarPedidos(), carregarCasal(), carregarTrabEmp(), carregarClima(),
    (p => p ? { data: p.v } : sb.from('fofocas').select('*').order('criado_em', { ascending: false }).limit(30))(pre('fofocas'))]);
  fofocas = f.data || [];
  if (!f.error) {
    const aoFofoca = n => {
      if (!n || fofocas.some(x => x.id === n.id)) return;
      fofocas.unshift(n); fofocas = fofocas.slice(0, 30);
      // dono 6 nov («we are getting notifications for everything… tone it down»): com muita gente no bairro, as fofocas
      // vão só para o mural; aparecem no ecrã se forem sobre ti, ou no máximo uma notícia grande (casamento/bebé) a cada 10 min
      if (n.bairro !== J?.bairro) return;
      const sobreMim = J?.nome && n.texto.includes(J.nome);
      const grande = /^(💍|🍼)/u.test(n.texto) && Date.now() - fofocaUltimoToast > 10 * 60e3;
      if (sobreMim || grande) { fofocaUltimoToast = Date.now(); toast(n.texto, 'info', 5500); }
    };
    // 9 nov: as fofocas novas do teu bairro chegam no pulso() de minuto a minuto (cada fofoca ia em tempo real para todo o bairro —
    // ~3.500 por hora × centenas de pessoas). Quando o pulso as traz, deixa de haver canal de fofocas.
    window.fofocasDoPulso = lista => { if (!fofPeloPulso) { fofPeloPulso = true; if (fofCanal) { try { sb.removeChannel(fofCanal); } catch { } fofCanal = null; } } (lista || []).forEach(aoFofoca); };
    ligarFofocas = () => {   // 6 nov: também chamada quando o jogo volta de estar escondido e quando mudas de bairro
      if (fofCanal) { try { sb.removeChannel(fofCanal); } catch { } fofCanal = null; }
      if (!J?.bairro) return;
      if (fofPeloPulso || (typeof rtUsar === 'function' && rtUsar())) { fofPeloPulso = true; fofBairro = J.bairro; return; }   // 9 nov: com o servidor próprio, as fofocas vêm já pelo pulso (sem abrir a ligação da Supabase)
      // 6 nov (dono: «reduce the gossip now»): cada fofoca ia para TODOS os jogadores online (~4.400 por dia × 300 pessoas ≈ 1,3 M
      // mensagens do Realtime por dia). Agora só vai para quem está nesse bairro — era o único sítio onde aparecia no ecrã.
      fofBairro = J.bairro;
      let reserva = false, ligou = false;
      fofCanal = sb.channel('fofocas:' + J.bairro, { config: { private: true } })   // 0bp: Broadcast do servidor em vez de postgres_changes
        .on('broadcast', { event: 'nova' }, ({ payload }) => aoFofoca(payload))
        .subscribe(st => {   // se o canal privado falhar, volta ao antigo (8 nov: depois de ligado, uma falha de rede é passageira (a biblioteca volta a ligar sozinha) — só vai para o canal de reserva se nunca chegou a ligar)
          if (st === 'SUBSCRIBED') { ligou = true; return; }
          if (ligou || reserva || (st !== 'CHANNEL_ERROR' && st !== 'TIMED_OUT') || !fofCanal) return;
          reserva = true; sb.removeChannel(fofCanal);
          fofCanal = sb.channel('fofocas-rc').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fofocas', filter: 'bairro=eq.' + J.bairro }, ({ new: n }) => aoFofoca(n)).subscribe();
        });
    };
    ligarFofocas();
  }
  if (!J) return;   // 6 nov: saíste a meio do arranque
  if (J.maior === false) setTimeout(pedirMaioridade, 900);
  else setTimeout(aoMudarGeracao, 900);
}
function pararVida() {
  if (fofCanal) { sb.removeChannel(fofCanal); fofCanal = null; }
  bloqueados = new Set(); pedidosPendentes = []; fofocas = []; casal = null;
}
// o que cada pedido diz (no telemóvel e na janela que desce do topo)
const NOME_PEDIDOS = { ludo: '🎲 convidou-te para jogar Ludo', desafio: '🏁 desafiou-te para uma corrida', visita: '🏡 convidou-te para ir lá a casa', filho: '👶 quer ter um bebé contigo', encontro: '🌹 convidou-te para sair', saida: '🎉 convidou-te para sair juntos', namoro: '💌 quer namorar contigo', casamento: '💍 pediu-te em casamento (alambamento pago por quem pede)', noivado: '💍 pediu-te em noivado, com um anel', familia: '👨‍👩‍👧 quer ser da tua família', amizade: '🤝 quer ser teu/tua amigo/a' };
const textoPedido = p => esc(tr(NOME_PEDIDOS[p.tipo] || p.tipo)) + (p.tipo === 'desafio' && DESAFIO_LUGAR[p.grau] ? ': ' + esc(tr(DESAFIO_LUGAR[p.grau].nome)) : p.tipo === 'encontro' && LOCAIS[p.grau] ? ': ' + esc(tr(LOCAIS[p.grau].nome)) : p.tipo === 'saida' && SAIDAS[p.grau] ? ': ' + esc(tr(SAIDAS[p.grau].nome)) : p.tipo === 'filho' && p.grau ? ' · ' + esc(p.grau) : '');
// 7 nov 22:33 (dono): o casamento só vai para as fofocas se os DOIS disserem que sim (houve quem fosse gozado fora do jogo)
async function perguntarCasamentos() {
  if (!uid) return;
  let lista = []; try { const pc = pre('casamentos'); const { data } = pc ? { data: pc.v } : await sb.rpc('casamento_por_decidir'); lista = data || []; } catch { return; }
  for (const c of lista) {
    const sim = await perguntar(tr('💍 Casaste com {0}! Queres contar a toda a gente? Só aparece nas notícias do bairro se os dois disserem que sim.').replace('{0}', c.nome), tr('Sim, contar'), tr('Não, fica entre nós'));
    if (sim === null) continue;   // fechou sem responder: volta a perguntar mais tarde
    const r = await acao('casamento_anunciar', { p_outro: c.outro, p_sim: !!sim }, { silencio: true });
    if (r?.msg) toast(tr(r.msg), 'info', 5000);
  }
}
async function responderPedido(id, sim) {
  const eraCasamento = sim && pedidosPendentes.find(x => x.id === id)?.tipo === 'casamento';
  const r = await acao('responder_pedido', { p_id: id, p_aceitar: sim });
  if (r && eraCasamento) setTimeout(perguntarCasamentos, 600);
  await atualizarPedidos();
  if (r?.visita) { fecharTelemovel(); fecharSheets?.(); const fp = viagemPrimeiraPessoa('taxi', r.visita.nome || bairro(J.bairro).nome); await fp.promessa; await irParaBairro(J.bairro, true); irParaCasa(r.visita, { convite: true }); return r; }   // convite para casa: vais lá de táxi (com os anúncios da viagem)
  if (r?.encontro) { esperarEncontro(r.encontro); return r; }   // 0cy (7): quem convidou escolhe o transporte e vão os dois   // 0n: o encontro acontece no sítio — vais lá
  if (r?.desafio) { esperarDesafio(r.desafio); return r; }   // 0cz (4): quem desafiou escolhe o transporte e vão os dois juntos
  if (r?.ludo) { fecharTelemovel(); fecharSheets?.(); ludoAbrir(r.ludo); return r; }   // 0cq: sentaste-te à mesa de Ludo   // 0ck: escolher o transporte, viajar e jogar
  return r;
}
async function atualizarPedidos() {
  if (!uid) return;
  const pp = pre('pedidos');
  const { data, error } = pp ? { data: pp.v } : await sb.from('pedidos').select('*').eq('para', uid).eq('estado', 'pendente').order('criado_em');
  pedidosPendentes = error ? [] : data || [];
  if (pedidosPendentes.length) {
    const nomes = pp ? Object.fromEntries(pedidosPendentes.map(p => [p.de, p.nome])) : await nomesDe(pedidosPendentes.map(p => p.de));
    pedidosPendentes.forEach(p => p.nome = nomes[p.de] || '?');
    // 0am: um pedido novo desce do topo do ecrã, com Aceitar / Agora não
    if (typeof mostrarPedidosNovos === 'function') mostrarPedidosNovos(pedidosPendentes, p => textoPedido(p));
  }
  atualizarPontoTel();
}
// 8 nov (capacidade I4): os nomes ficam guardados no telemóvel 10 min — era o pedido mais repetido de todos (~3.800/min):
// Empresas, Imóveis, Mensagens e Amigos pediam os mesmos nomes de cada vez que abriam. Nomes de quem está na rua chegam pela presença.
const _nomes = new Map();   // id -> [nome, quando]
function lembrarNome(id, nome) { if (id && nome) _nomes.set(id, [nome, Date.now()]); }
async function nomesDe(ids) {
  ids = [...new Set(ids)].filter(Boolean); if (!ids.length) return {};
  const agora = Date.now(), out = {}, falta = [];
  for (const id of ids) { const c = _nomes.get(id); if (c && agora - c[1] < 600000) out[id] = c[0]; else falta.push(id); }
  if (!falta.length) return out;
  // 6 nov: aos pedaços de 150 (com 1.000+ empresas o endereço ficava comprido demais e o pedido falhava)
  const partes = []; for (let i = 0; i < falta.length; i += 150) partes.push(falta.slice(i, i + 150));
  const res = await Promise.all(partes.map(c => sb.from('jogadores').select('id,nome').in('id', c)));
  for (const x of res.flatMap(r => r.data || [])) { lembrarNome(x.id, x.nome); out[x.id] = x.nome; }
  return out;
}
function pedirMaioridade() {
  const el = sheet(`<h3>Antes de continuar 🔞</h3>
    <p class="m">Vida na Banda agora tem namoro, casamento e drama entre jogadores (nada explícito). É só para quem tem 18 anos ou mais.</p>
    <button class="btn full" id="simMaior">Tenho 18 anos ou mais</button>
    <button class="btn full ghost" id="naoMaior" style="margin-top:8px">Tenho menos de 18</button>`);
  el.querySelector('#simMaior').onclick = async () => { const r = await acao('confirmar_maioridade'); if (r) fecharSheets(); };
  el.querySelector('#naoMaior').onclick = () => { fecharSheets(); toast('Desculpa — o jogo é só para maiores de 18.', 'mau', 6000); sb.auth.signOut(); };
}

/* ---------- relações ---------- */
function rotuloNivel(n) {
  if (n >= 80) return ['🤝', 'Melhor amigo/a'];
  if (n >= 40) return ['🙂', 'Amigo/a'];
  if (n <= -30) return ['😠', 'Inimigo/a'];
  return ['👋', 'Conhecido/a'];
}
const ROMANCE = { paquera: ['😍', 'A conhecer-se'], namoro: ['💕', 'Namoram'], casados: ['💍', 'Casados'], ex: ['💔', 'Ex'] };
// 0ae (Cinnss, 30 out): o estado da relação com fase (noivos / pausa), divorciados, à distância e secreta
function estadoRomance(r) {
  if (!r?.romance || !ROMANCE[r.romance]) return null;
  let e;
  if (r.romance === 'namoro') e = r.fase === 'noivos' ? ['💍', 'Noivos'] : r.fase === 'pausa' ? ['⏸️', 'Em pausa'] : ROMANCE.namoro;
  else if (r.romance === 'casados') e = r.fase === 'pausa' ? ['⏸️', 'Separados (ainda casados)'] : ROMANCE.casados;
  else if (r.romance === 'ex') e = r.foram_casados ? ['💔', 'Divorciados'] : ROMANCE.ex;
  else e = ROMANCE[r.romance];
  const extra = [r.distancia && r.romance !== 'ex' ? tr('à distância') : '', r.secreta && r.romance !== 'ex' ? tr('em segredo') : ''].filter(Boolean);
  return [e[0], tr(e[1]) + (extra.length ? ' · ' + extra.join(' · ') : '')];
}
function rotuloFamilia(r, outroId, outroNome) {
  if (!r?.familia) return null;
  if (r.familia === 'irmaos') return 'Irmãos';
  if (r.familia === 'primos') return 'Primos';
  if (r.familia === 'pais') return r.familia_de === outroId ? `${esc(outroNome)} é teu pai/tua mãe` : `És pai/mãe de ${esc(outroNome)}`;
  const nome = { tio: 'tio/tia', pai: 'pai/mãe', avo: 'avô/avó' }[r.familia] || 'padrinho/madrinha';
  return r.familia_de === outroId ? `${esc(outroNome)} é teu ${nome}` : `És ${nome} de ${esc(outroNome)}`;
}
function rotuloRelacao(r, outroId, outroNome) {
  const n = r?.nivel ?? 0;
  if (r?.romance && ROMANCE[r.romance] && r.romance !== 'ex') return estadoRomance(r);
  const f = rotuloFamilia(r, outroId, outroNome); if (f) return ['👨‍👩‍👧', f];
  if (r?.romance === 'ex') return estadoRomance(r);
  return rotuloNivel(n);
}
async function lerRelacao(outro) {
  const a = uid < outro ? uid : outro, b = uid < outro ? outro : uid;
  const { data, error } = await sb.from('relacoes').select('*').eq('a', a).eq('b', b).maybeSingle();
  return error ? null : data;
}
function medidor(n) {
  const cor = n >= 0 ? 'var(--green)' : 'var(--red)';
  return `<div class="meter"><u style="left:${n >= 0 ? 50 : 50 + n / 2}%;width:${Math.abs(n) / 2}%;background:${cor}"></u><u style="left:50%;width:2px;background:var(--line)"></u></div>`;
}

/* ---------- tocar noutra pessoa ---------- */
const GESTOS = { conversar: '💬', elogiar: '🌟', piada: '😂', presente: '🎁', insultar: '😤', namoriscar: '😍' };
async function tocarPessoa(p, el) {
  if (p.filho) return abrirFilho(p.filho.id);
  if (p.falas) { p.fala = { txt: tr(p.falas[Math.floor(Math.random() * p.falas.length)]), ate: performance.now() + 4000 }; return; }
  if (p.empregado) { const f = VISUAL_EMPREGADO[p.empregado][2]; p.fala = { txt: tr(f[Math.floor(Math.random() * f.length)]), ate: performance.now() + 4000 }; return; }
  if (p.npc) { p.fala = { txt: tr(FALAS_NPC[Math.floor(Math.random() * FALAS_NPC.length)]), ate: performance.now() + 4000 }; return; }
  // 9 nov (registos: cada toque eram 5 pedidos): perfil, relação, festa, acabamentos e registo criminal num só (perfil_de)
  const pf = await sb.rpc('perfil_de', { p_id: p.id }).then(x => x, () => ({ error: true }));
  const [{ data }, r, { data: fest }, { data: acab }] = !pf.error && pf.data?.j
    ? [{ data: pf.data.j }, pf.data.r || null, { data: pf.data.f ? [pf.data.f] : [] }, { data: { acabamentos: pf.data.j.acabamentos } }]
    : await Promise.all([sb.from('jogadores').select(COLS_PUBLICAS).eq('id', p.id).maybeSingle(), lerRelacao(p.id),
    sb.from('festas').select('*').eq('anfitriao', p.id).gt('acaba', new Date().toISOString()).limit(1),
    sb.from('jogadores').select('acabamentos').eq('id', p.id).maybeSingle().then(x => x, () => ({}))]);   // Gold Exclusive C (pedido à parte: se falhar, o perfil abre na mesma)
  const rcPronto = !pf.error && pf.data && 'rc' in pf.data ? pf.data.rc : undefined;
  const festa = fest?.[0];
  if (!data) return;
  const e = data.emprego ? emprego(data.emprego) : null, c = data.casa ? casaDe(data.casa) : null;
  const n = r?.nivel ?? 0, [re, rt] = rotuloRelacao(r, p.id, p.nome);
  const bloq = bloqueados.has(p.id);
  const romanceOk = J.maior !== false && data.maior !== false && !r?.familia;
  const rom = r?.romance;
  const botao = (ac, emoji, txt, cls = '', off = false, dica = '') => `<button data-ac="${ac}" class="${cls}" ${off ? 'disabled' : ''} title="${esc(dica)}"><span class="e">${emoji}</span><span>${txt}${dica && off ? `<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">${esc(dica)}</small>` : ''}</span></button>`;
  const html = `<div style="display:flex;gap:14px;align-items:center"><canvas id="pvOutro" width="160" height="200" style="width:80px;height:100px;border-radius:12px;background:var(--card)"></canvas>
    <div><h3>${esc(p.nome)}${data.vip_ate && new Date(data.vip_ate) > new Date() ? ' <span class="selo-vip">VIP</span>' : ''}</h3><p class="m" style="margin:0">${e ? esc(e.nome) : 'Desempregado'} · ⭐ ${data.reputacao ?? 0}</p>${c ? `<p class="m" style="margin:2px 0 0">Mora: ${esc(c.nome)} (${esc(bairro(c.bairro).nome)})</p>` : ''}</div></div>
    ${chipsVida(data)}${carrosPerfilHTML(acab?.acabamentos)}<div id="coroasTyPessoa"></div><div id="regCrim"></div>
    <div class="rel"><div class="lbl"><span>${re} ${rt}</span><span>${n > 0 ? '+' : ''}${n}</span></div>${medidor(n)}</div>
    ${festa && !bloq ? `<button class="btn full" data-ac="festejar" style="margin-top:12px">🎉 Festejar${festa.aniversario ? ' e dar os parabéns 🎂' : ''}</button>` : ''}
    ${cena.tipo === 'casa' && cena.dono && (ehMeuLar(cena.dono.id) || (casal && cena.dono.id === casal.id)) && p.id !== casal?.id ? `<button class="btn full ghost" data-ac="porFora" style="margin-top:12px">🚪 ${tr('Pôr fora de casa')}</button>` : ''}
    ${bloq ? `<p class="m" style="margin-top:12px">🚫 Bloqueaste este jogador.</p>` : `
    <div class="sub2">Conviver</div>
    <div class="grelha">
      ${botao('conversar', '💬', 'Conversar')}${botao('elogiar', '🌟', 'Elogiar')}${botao('piada', '😂', 'Contar piada')}
      ${(data.maior !== false) === (J.maior !== false) ? botao('sair', '🎉', 'Sair juntos') : ''}${botao('presente', '🎁', 'Presente · 2.000 Kz')}${botao('ola', '👋', 'Cumprimentar')}${botao('kumbu', '💸', 'Enviar kumbu')}
      ${c && c.bairro === J.bairro && cena.tipo === 'bairro' ? botao('visitar', '🏠', 'Visitar a casa') : ''}
      ${J.casa && (n >= 40 || r?.familia || rom === 'namoro' || rom === 'casados') ? botao('convidarCasa', '🏡', 'Convidar para a minha casa') : ''}
    </div>
    <div class="sub2">Jogar juntos</div>
    <div class="grelha">${botao('desafioJetski', '🌊', 'Corrida de jet ski')}${botao('desafioKart', '🏎️', 'Corrida de kart')}${botao('ludoAmigos', '🎲', 'Ludo')}</div>
    ${J.maior === false ? `<div class="sub2">Romance</div><button class="row" data-ac="maior" style="text-align:left;width:100%"><span class="e">🔞</span><div class="t"><b>Desbloquear o romance</b><small>Confirma que tens 18 anos ou mais</small></div></button>` : romanceOk ? `
    <div class="sub2">Romance</div>
    <div class="grelha">
      ${botao('namoriscar', '😍', 'Namoriscar', 'romance')}${botao('encontro', '🌹', 'Convidar para sair', 'romance')}
      ${!['namoro', 'casados'].includes(rom) ? botao('namoro', '💌', 'Pedir em namoro', 'romance') : ''}
      ${rom === 'namoro' && !r?.fase ? botao('noivado', '💍', 'Pedir em noivado · anel 45.000 Kz', 'romance') : ''}
      ${rom === 'namoro' && r?.fase !== 'pausa' ? botao('casamento', '💍', 'Pedir em casamento', 'romance') : ''}
      ${['namoro', 'casados'].includes(rom) ? (r?.fase === 'pausa' ? botao('voltar', '💞', 'Voltar a estar juntos', 'romance') : botao('pausa', '⏸️', 'Dar um tempo')) : ''}
      ${['paquera', 'namoro', 'casados'].includes(rom) ? botao('distancia', '✈️', r?.distancia ? 'Já não é à distância' : 'Relação à distância') + botao('secreta', '🤫', r?.secreta ? 'Deixar de esconder' : 'Manter em segredo') : ''}
      ${['namoro', 'casados'].includes(rom) ? botao('bebe', '👶', 'Ter um bebé', 'romance') : ''}
      ${['paquera', 'namoro', 'casados'].includes(rom) ? botao('terminar', '💔', rom === 'casados' ? 'Divorciar' : 'Acabar', 'perigo') : ''}
    </div>` : ''}
    <div class="sub2">Família e outros</div>
    <div class="grelha">
      ${n < 40 && !r?.familia && !['namoro', 'casados'].includes(rom) ? botao('amizade', '🤝', 'Pedir amizade') : ''}
      ${n >= 40 && !r?.familia && !['namoro', 'casados'].includes(rom) ? botao('desamigo', '👋', 'Desfazer amizade', 'perigo') : ''}
      ${!r?.familia && (!rom || rom === 'ex') ? botao('familia', '👨‍👩‍👧', 'Pedir para ser família') : ''}
      ${botao('insultar', '😤', 'Insultar', 'perigo')}
      ${(() => { const novo = data.criado_em && Date.now() - new Date(data.criado_em) < 3 * 864e5; return botao('roubar', '🦹', 'Roubar', 'perigo', novo, 'Jogador/a novo/a: protegido/a nos primeiros 3 dias'); })()}
      ${(() => { const novo = data.criado_em && Date.now() - new Date(data.criado_em) < 3 * 864e5; return botao('processar', '⚖️', 'Processar', 'perigo', novo, 'Jogador/a novo/a: protegido/a nos primeiros 3 dias'); })()}
    </div>`}
    <div class="grelha" style="margin-top:16px">
      ${botao('mensagem', '💬', 'Mensagem')}${botao(bloq ? 'desbloquear' : 'bloquear', '🚫', bloq ? 'Desbloquear' : 'Bloquear', 'perigo')}${botao('denunciar', '🚩', 'Denunciar', 'perigo')}
    </div>`;
  if (el && el.isConnected) { el.innerHTML = `<div class="puxa"></div>${html}`; } else el = sheet(html);
  registarPreview('pvOutro', p.ap); if (!previewAnim) animarPreview();
  if (typeof ui2Pessoa === 'function') ui2Pessoa(el);   // 8 nov: redesenho (teste)
  const de = ac => el.querySelector(`[data-ac="${ac}"]`);
  const refaz = () => tocarPessoa(p, el);
  de('mensagem')?.addEventListener('click', () => abrirConversa(p.id, p.nome));
  // dono 4 nov: pôr uma visita fora de casa (sai logo e só volta daqui a 30 min)
  de('porFora')?.addEventListener('click', async () => {
    if (!await perguntar(tr('Pôr {0} fora de casa? Só pode voltar daqui a 30 minutos.').replace('{0}', p.nome), tr('Pôr fora de casa'))) return;
    if (await acao('por_fora_de_casa', { p_dono: cena.dono.id, p_visitante: p.id })) { fecharSheets(); canal?.send({ type: 'broadcast', event: 'porFora', payload: { id: p.id } }).catch(() => { }); }
  });
  for (const ac of Object.keys(GESTOS)) de(ac)?.addEventListener('click', async () => {
    const res = await acao('interagir', { p_alvo: p.id, p_acao: ac });
    if (!res) return;
    if (eu) eu.fala = { txt: GESTOS[ac], ate: performance.now() + 3000 };
    canal?.send({ type: 'broadcast', event: 'gesto', payload: { id: uid, txt: GESTOS[ac] } }).catch(() => { });
    refaz();
  });
  de('ola')?.addEventListener('click', async () => { fecharSheets(); if (cena.tipo === 'casa') { $('#iMsg').value = `Olá ${p.nome}! 👋`; $('#fChat').requestSubmit(); } else await sb.rpc('enviar_mensagem', { p_texto: `Olá ${p.nome}! 👋` }); });
  de('visitar')?.addEventListener('click', () => { fecharSheets(); irParaCasa(data); });
  de('convidarCasa')?.addEventListener('click', async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'visita' })) fecharSheets(); });
  de('kumbu')?.addEventListener('click', () => abrirTelemovel('kumbu', p.nome));
  de('maior')?.addEventListener('click', pedirMaioridade);
  de('namoro')?.addEventListener('click', async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'namoro' })) refaz(); });
  de('casamento')?.addEventListener('click', () => confirmar(`Pedir ${esc(p.nome)} em casamento? 💍`, 'Se aceitar, pagas o alambamento de 100.000 Kz à família.', 'Pedir em casamento',
    async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'casamento' })) fecharSheets(); }));
  de('noivado')?.addEventListener('click', () => confirmar(`Pedir ${esc(p.nome)} em noivado? 💍`, 'Se aceitar, pagas o anel: 45.000 Kz. Depois podem marcar o casamento.', 'Pedir em noivado',
    async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'noivado' })) fecharSheets(); }));
  for (const ac of ['pausa', 'voltar', 'distancia', 'secreta']) de(ac)?.addEventListener('click', async () => {
    if (ac === 'pausa' && !await perguntar(`Dar um tempo com ${p.nome}? Podem voltar quando quiserem.`, 'Dar um tempo')) return;
    if (await acao('mudar_relacao', { p_alvo: p.id, p_acao: ac })) refaz();
  });
  de('terminar')?.addEventListener('click', () => confirmar(rom === 'casados' ? `Divorciar de ${esc(p.nome)}?` : `Acabar com ${esc(p.nome)}?`,
    rom === 'casados' ? 'O advogado custa até 25.000 Kz e toda a gente vai saber.' : 'Não há volta atrás (mas podem voltar a namoriscar).', rom === 'casados' ? 'Divorciar' : 'Acabar',
    async () => { if (await acao('terminar', { p_alvo: p.id })) { fecharSheets(); await depoisDoFim(); } }));
  // #6 assaltar um jogador real (mesmas regras do assalto no beco: risco, polícia, cadastro, vítima protegida)
  // 6 nov (dono): registo criminal no perfil
  typeof mostrarCoroas === 'function' && mostrarCoroas(p.id, "#coroasTyPessoa");   // 👑 rankings do tycoon
  (rcPronto !== undefined ? Promise.resolve({ data: rcPronto }) : sb.rpc('registo_criminal_de', { p_id: p.id })).then(({ data: rc }) => { const alvo = document.querySelector('#regCrim'); if (alvo && rc) alvo.innerHTML = registoCriminalHTML(rc); }, () => { });
  // 6 nov (dono): «when you tap on someone you should be able to sue and it should ask you to input a reason»
  de('processar')?.addEventListener('click', () => {
    const el2 = sheet(`<h3>⚖️ ${esc(tr('Processar'))} ${esc(p.nome)}</h3>
      <p class="m">${esc(tr('Escreve o motivo e quanto pedes. O advogado custa 50.000 Kz. O juiz decide com as provas que existem (roubos contra ti, registo criminal). Sem provas, quase sempre perdes e pagas 25.000 Kz à outra pessoa.'))}</p>
      <textarea id="procMotivo" maxlength="200" rows="3" placeholder="${esc(tr('Motivo (escreve o teu)'))}" style="width:100%;box-sizing:border-box;border-radius:10px;padding:10px;font:inherit"></textarea>
      <input class="inp" id="procValor" type="number" inputmode="numeric" min="1000" step="1000" placeholder="${esc(tr('Quanto pedes (Kz)'))}" style="width:100%;box-sizing:border-box;margin-top:8px">
      <button class="btn full" id="procIr" style="margin-top:10px">⚖️ ${esc(tr('Ir a tribunal'))} · 50.000 Kz</button>`);
    el2.querySelector('#procIr').onclick = async () => {
      const motivo = el2.querySelector('#procMotivo').value.trim(), v = Math.floor(+el2.querySelector('#procValor').value || 0);
      if (motivo.length < 5) return toast(tr('Escreve o motivo do processo (5 a 200 letras).'), 'info');
      if (v < 1000) return toast(tr('Pede entre 1.000 e 50.000.000 Kz.'), 'info');
      if (await acao('processar', { p_reu: p.id, p_motivo: motivo, p_valor: v })) fecharSheets();
    };
  });
  // 6 nov (dono): roubar com um valor às cegas — quanto mais pedes, maior o risco; a vítima pode fazer queixa
  de('roubar')?.addEventListener('click', () => {
    const el = sheet(`<h3>🦹 ${esc(tr('Roubar'))} ${esc(p.nome)}</h3>
      <p class="m">${esc(tr('Escreve quanto queres roubar. Não sabes quanto a pessoa tem na carteira: se tiver, é teu. Quanto mais pedires, maior o risco de a polícia (ou a CFB) te apanhar. A vítima pode fazer queixa.'))}</p>
      <input class="inp" id="rouboValor" type="number" inputmode="numeric" min="100" step="100" placeholder="5000" style="width:100%;box-sizing:border-box">
      <p class="m" id="rouboRisco" style="margin:6px 0 10px"></p>
      <button class="btn full" id="rouboIr">🦹 ${esc(tr('Roubar'))}</button>`);
    const inp = el.querySelector('#rouboValor'), risco = el.querySelector('#rouboRisco');
    const mostra = () => { const v = +inp.value || 0; const r = v < 100 ? 0 : Math.min(92, Math.round((0.06 + 0.84 * v / (v + 300000)) * 100));
      risco.textContent = v >= 100 ? tr('Risco de seres apanhado/a: ~{0}%').replace('{0}', r) : ''; };
    inp.addEventListener('input', mostra);
    el.querySelector('#rouboIr').onclick = async () => {
      const v = Math.floor(+inp.value || 0); if (v < 100) return toast(tr('Escreve quanto queres roubar (mínimo 100 Kz).'), 'info');
      if (await acao('roubar_jogador', { p_vitima: p.id, p_valor: v })) fecharSheets();
    };
  });
  de('amizade')?.addEventListener('click', async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'amizade' })) fecharSheets(); });
  // dono 8 nov: «we need people to be able to unfriend people» — não avisa a outra pessoa
  de('desamigo')?.addEventListener('click', () => confirmar(esc(tr('Desfazer a amizade com {0}?').replace('{0}', p.nome)), esc(tr('Deixam de ser amigos. Não avisamos a outra pessoa. Para voltarem a ser amigos, um dos dois tem de pedir amizade outra vez.')), esc(tr('Desfazer amizade')),
    async () => { if (await acao('desfazer_amizade', { p_alvo: p.id })) { amigos.delete(p.id); refaz(); } }));
  de('familia')?.addEventListener('click', () => escolherFamilia(p));
  de('encontro')?.addEventListener('click', () => escolherEncontro(p));
  de('sair')?.addEventListener('click', () => escolherSaida(p));
  // 0ck (dono, 3 nov): desafiar para jet ski / kart — se aceitar, os dois escolhem o transporte, viajam e jogam
  de('ludoAmigos')?.addEventListener('click', async () => { fecharSheets(); fecharTelemovel?.(); await ludoConvidar(p.id); });
  for (const [ac, jogo] of [['desafioJetski', 'jetski'], ['desafioKart', 'kart']]) de(ac)?.addEventListener('click', async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'desafio', p_grau: jogo })) fecharSheets(); });
  de('festejar')?.addEventListener('click', async () => { if (await acao('festejar', { p_anfitriao: p.id })) { if (eu) eu.fala = { txt: '🎉', ate: performance.now() + 3000 }; refaz(); } });
  de('bebe')?.addEventListener('click', () => pedirNome(`Ter um bebé com ${esc(p.nome)}? 👶`, `${esc(p.nome)} tem de aceitar. O bebé nasce 5 dias depois e mora convosco.`, 'Enviar pedido',
    async nome => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'filho', p_grau: nome })) fecharSheets(); }));
  de('bloquear')?.addEventListener('click', () => confirmar(`Bloquear ${esc(p.nome)}?`, 'Deixas de ver as mensagens dele/a e não podem interagir contigo.', 'Bloquear',
    async () => { if (await acao('bloquear', { p_alvo: p.id, p_bloquear: true })) { bloqueados.add(p.id); fecharSheets(); } }));
  de('desbloquear')?.addEventListener('click', async () => { if (await acao('bloquear', { p_alvo: p.id, p_bloquear: false })) { bloqueados.delete(p.id); refaz(); } });
  de('denunciar')?.addEventListener('click', () => denunciar(p));
}
function confirmar(titulo, texto, botao, fn) {
  const el = sheet(`<h3>${titulo}</h3><p class="m">${texto}</p><button class="btn full red" id="sim">${botao}</button><button class="btn full ghost" id="nao" style="margin-top:8px">Cancelar</button>`);
  el.querySelector('#sim').onclick = fn; el.querySelector('#nao').onclick = fecharSheets;
}
function escolherFamilia(p) {
  const graus = [['irmaos', '👫', 'Irmãos'], ['primos', '🧑‍🤝‍🧑', 'Primos'], ['tio', '🧔', `Eu sou tio/tia de ${esc(p.nome)}`], ['padrinho', '🙏', `Eu sou padrinho/madrinha de ${esc(p.nome)}`], ['pai', '👨‍👧', `Eu sou pai/mãe de ${esc(p.nome)}`], ['avo', '👵', `Eu sou avô/avó de ${esc(p.nome)}`]];
  const el = sheet(`<h3>Que família querem ser? 👨‍👩‍👧</h3><p class="m">${esc(p.nome)} tem de aceitar o pedido.</p>
    <div class="list">${graus.map(([g, e, t]) => `<button class="row" data-g="${g}" style="text-align:left"><span class="e">${e}</span><div class="t"><b>${t}</b></div></button>`).join('')}</div>`);
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = async () => { if (await acao('pedir', { p_alvo: p.id, p_tipo: 'familia', p_grau: b.dataset.g })) fecharSheets(); });
}
function denunciar(p) {
  const motivos = [['insultos', 'Insultos ou ódio'], ['assedio', 'Assédio ou conversa sexual'], ['menor', 'Parece ter menos de 18 anos'], ['spam', 'Spam'], ['nome', 'Nome ofensivo'], ['outro', 'Outra coisa']];
  const el = sheet(`<h3>Denunciar ${esc(p.nome)} 🚩</h3><p class="m">Os administradores vão ver. Se 3 pessoas denunciarem no mesmo dia, fica silenciado/a automaticamente.</p>
    <label>Motivo</label><select class="inp" id="dMot">${motivos.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
    <label>O que aconteceu? (opcional)</label><textarea class="inp" id="dTxt" maxlength="300" rows="3"></textarea>
    <button class="btn full red" id="dEnv">Enviar denúncia</button>`);
  el.querySelector('#dEnv').onclick = async () => {
    if (await acao('denunciar', { p_alvo: p.id, p_motivo: el.querySelector('#dMot').value, p_texto: el.querySelector('#dTxt').value.trim() || null })) fecharSheets();
  };
}

// depois de acabar/divorciar: a casa partilhada pode deixar de ser minha
async function depoisDoFim() {
  const tinhaLar = donoLar();
  await carregarCasal();
  const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador);
  await carregarMinhaMobilia();
  if (tinhaLar && cena?.tipo === 'casa' && cena.dono.id === tinhaLar) sairDeCasa();
  hud();
}

/* ---------- 📱 Social ---------- */
async function renderSocial(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  await atualizarPedidos();
  const tab = document.querySelector('.tabs [data-s=social]'); if (tab) tab.textContent = `💞 Social${pedidosPendentes.length ? ' (' + pedidosPendentes.length + ')' : ''}`;
  const { data: rels, error } = await sb.from('relacoes').select('*').or(`a.eq.${uid},b.eq.${uid}`);
  if (error) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const outro = r => r.a === uid ? r.b : r.a;
  const nomes = await nomesDe((rels || []).map(outro));
  const peso = r => r.romance === 'casados' ? 4 : r.romance === 'namoro' ? 3 : r.familia ? 2 : r.romance === 'paquera' ? 1 : 0;
  const lista = (rels || []).filter(r => nomes[outro(r)]).sort((x, y) => peso(y) - peso(x) || y.nivel - x.nivel);
  const NOME_PEDIDO = NOME_PEDIDOS;
  const GRAU = { irmaos: 'irmãos', primos: 'primos', tio: 'tio/tia (dele/a para ti)', padrinho: 'padrinho/madrinha (dele/a para ti)', pai: 'pai/mãe (dele/a para ti)', avo: 'avô/avó (dele/a para ti)' };
  body.innerHTML = procurarHTML() + `
    ${pedidosPendentes.length ? `<div class="sub2" style="margin-top:0">Pedidos para ti</div><div class="list">${pedidosPendentes.map(p => `<div class="row mine"><div class="t"><b>${esc(p.nome)}</b><small>${NOME_PEDIDO[p.tipo] || p.tipo}${(p.tipo === 'encontro' || p.tipo === 'saida') && localSaida(p.grau) ? ': ' + localSaida(p.grau).e + ' ' + localSaida(p.grau).nome + (localSaida(p.grau).preco ? ' (paga ' + esc(p.nome) + ')' : '') : p.tipo === 'filho' ? ' · nome: ' + esc(p.grau) : p.grau ? ' · ' + GRAU[p.grau] : ''}</small></div>
      <button class="btn sm" data-sim="${p.id}">Aceitar</button><button class="btn sm ghost" data-nao="${p.id}">Recusar</button></div>`).join('')}</div>` : ''}
    <div class="sub2" data-ui2="p" ${pedidosPendentes.length ? '' : 'style="margin-top:0"'}>As tuas pessoas</div>
    ${lista.length ? `<div class="list" data-ui2="p">${lista.map(r => { const o = outro(r), [e, t] = rotuloRelacao(r, o, nomes[o]); return `<div class="row" data-o="${o}"><span class="e">${e}</span><div class="t"><b>${esc(nomes[o])}</b><small>${t}</small></div><span class="price" style="color:${r.nivel >= 0 ? 'var(--green)' : 'var(--red)'}">${r.nivel > 0 ? '+' : ''}${r.nivel}</span>${['namoro', 'casados', 'paquera'].includes(r.romance) ? `<button class="btn sm ghost" data-fim="${o}" data-nome="${esc(nomes[o])}" data-cas="${r.romance === 'casados' ? 1 : ''}">💔</button>` : ''}</div>`; }).join('')}</div>`
      : '<div class="empty" data-ui2="p">Ainda não conheces ninguém. Toca noutros jogadores na rua para conversar! 👋</div>'}
    <div class="sub2" data-ui2="f">Fofocas de Luanda 👀</div>
    <div class="feed" data-ui2="f">${fofocas.length ? fofocas.slice(0, 20).map(f => `<div class="ev">${esc(f.texto)}<time>${tempoRel(f.criado_em)}</time></div>`).join('') : '<div class="empty">Ninguém está a falar de ninguém… por enquanto.</div>'}</div>`;
  ligarProcurar(body);
  blocoSugar(body);
  if (typeof ui2Social === 'function') ui2Social(body, lista.length);   // 8 nov: redesenho (teste)
  if (typeof salasSocial === 'function') salasSocial(body);   // 8 nov (0ez): salas
  body.querySelectorAll('[data-sim],[data-nao]').forEach(b => b.onclick = async () => {
    const r = await responderPedido(parseInt(b.dataset.sim || b.dataset.nao, 10), !!b.dataset.sim);
    if (r && !r.visita && !r.encontro) abrirTelemovel('social');
  });
  body.querySelectorAll('[data-fim]').forEach(b => b.onclick = () => confirmar(b.dataset.cas ? `Divorciar de ${b.dataset.nome}?` : `Acabar com ${b.dataset.nome}?`,
    b.dataset.cas ? 'O advogado custa até 25.000 Kz e toda a gente vai saber.' : 'Não há volta atrás (mas podem voltar a namoriscar).', b.dataset.cas ? 'Divorciar' : 'Acabar',
    async () => { if (await acao('terminar', { p_alvo: b.dataset.fim })) { await depoisDoFim(); abrirTelemovel('social'); } }));
}


/* ---------- 💬 conversas privadas entre jogadores ---------- */
let dmNaoLidas = 0, dmCanal = null, dmAberta = null, msgAba = 'conversas', amigos = new Set();
let _amigosEm = 0;
async function carregarAmigos(forcar) {
  // 9 nov (custos): vem no arranque(); depois só volta a pedir passados 10 min (antes era a cada regresso ao jogo)
  if (!forcar && Date.now() - _amigosEm < 10 * 60 * 1000 && amigos.size) return;
  const pa = typeof pre === 'function' ? pre('amigos') : null;
  const { data } = pa?.v ? { data: pa.v } : await sb.from('relacoes').select('a,b,nivel,romance,familia').or(`a.eq.${uid},b.eq.${uid}`);
  _amigosEm = Date.now();
  amigos = new Set((data || []).filter(r => r.nivel >= 40 || r.familia || ['namoro', 'casados'].includes(r.romance)).map(r => r.a === uid ? r.b : r.a));
}
async function iniciarDMs() {
  if (!uid) return;
  carregarAmigos();
  const pn = typeof pre === 'function' ? pre('dms_n') : null;   // 9 nov: vem no arranque()
  const { count } = pn && pn.v != null ? { count: pn.v } : await sb.from('dms').select('id', { count: 'exact', head: true }).eq('para', uid).eq('lida', false);
  dmNaoLidas = count || 0; atualizarPontoTel();
  if (dmCanal) sb.removeChannel(dmCanal);
  // 0bp passo C (2 nov): DMs por Broadcast privado (`dm:<uid>`, só quem recebe ouve); se falhar, volta ao canal antigo
  const vistosDm = new Set();
  const aoDm = async ({ new: m }) => {
    if (!m || m.para !== uid || vistosDm.has(m.id) || bloqueados.has(m.de)) return;
    vistosDm.add(m.id);
    if (dmAberta?.id === m.de) { dmAberta.render(); sb.rpc('ler_dms', { p_de: m.de }); return; }
    dmNaoLidas++; atualizarPontoTel();
    const nomes = await nomesDe([m.de]); toast(`💬 ${nomes[m.de] || '?'}: ${m.texto.slice(0, 60)}`, 'info', 6000);
    if (telSub === 'mensagens' && msgAba === 'conversas') abrirTelemovel('mensagens');
  };
  // 9 nov: pelo nosso servidor (canal pessoal); se falhar, o canal de reserva (postgres_changes) como antes
  const reservaDmRt = () => { if (dmCanal) { try { sb.removeChannel(dmCanal); } catch { } } dmCanal = sb.channel('dm-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dms', filter: 'para=eq.' + uid }, aoDm).subscribe(); };
  if (typeof rtPessoal === 'function' && rtPessoal('dm', ({ payload }) => aoDm({ new: payload }), reservaDmRt)) { dmCanal = null; return; }
  if (dmPrivadoRecusado) return reservaDmRt();   // 0fx: o canal privado já foi recusado nesta sessão — não insistir (havia quem tentasse 191×/h)
  let reservaDm = false, ligou = false;
  let esteDm = null;
  esteDm = dmCanal = sb.channel('dm:' + uid, { config: { private: true } })
    .on('broadcast', { event: 'nova' }, ({ payload }) => aoDm({ new: payload }))
    .subscribe(st => {   // 8 nov: depois de ligado, uma falha de rede é passageira (a biblioteca volta a ligar sozinha) — só vai para o canal de reserva se nunca chegou a ligar
      if (st === 'SUBSCRIBED') { ligou = true; return; }
      if (ligou || reservaDm || dmCanal !== esteDm || (st !== 'CHANNEL_ERROR' && st !== 'TIMED_OUT')) return;
      reservaDm = true; dmPrivadoRecusado = true; sb.removeChannel(dmCanal);
      dmCanal = sb.channel('dm-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dms', filter: 'para=eq.' + uid }, aoDm).subscribe();
    });
}
async function renderMensagensTabs(body) {
  body.innerHTML = `<div class="abas"><button class="${msgAba === 'conversas' ? 'on' : ''}" data-ma="conversas">💬 Conversas${dmNaoLidas ? ` (${dmNaoLidas})` : ''}</button><button class="${msgAba === 'sms' ? 'on' : ''}" data-ma="sms">✉️ SMS</button></div><div id="msgC"></div>`;
  body.querySelectorAll('[data-ma]').forEach(b => b.onclick = () => { msgAba = b.dataset.ma; renderMensagensTabs(body); });
  const c = body.querySelector('#msgC');
  if (msgAba === 'sms') return renderMensagens(c);
  c.innerHTML = procurarHTML() + '<div id="cvLista"><div class="empty">A carregar…</div></div>';
  ligarProcurar(c, x => `<button class="btn sm" data-dm-novo="${x.id}" data-nome="${esc(x.nome)}">Mensagem</button>`);
  c.addEventListener('procurou', () => c.querySelectorAll('[data-dm-novo]').forEach(b => b.onclick = () => abrirConversa(b.dataset.dmNovo, b.dataset.nome)));
  const { data } = await sb.from('dms').select('*').or(`de.eq.${uid},para.eq.${uid}`).order('criado_em', { ascending: false }).limit(300);
  const porPessoa = new Map();
  for (const m of data || []) { const o = m.de === uid ? m.para : m.de; if (bloqueados.has(o)) continue; const x = porPessoa.get(o) || { ultima: m, novas: 0 }; if (m.para === uid && !m.lida) x.novas++; porPessoa.set(o, x); }
  const nomes = await nomesDe([...porPessoa.keys()]);
  const l = c.querySelector('#cvLista'); if (!l) return;
  l.innerHTML = porPessoa.size ? `<div class="list">${[...porPessoa.entries()].map(([o, x]) => `<div class="row ${x.novas ? 'mine' : ''}" data-cv="${o}" data-nome="${esc(nomes[o] || '?')}" style="cursor:pointer"><span class="e">💬</span><div class="t"><b data-sem-traducao>${esc(nomes[o] || '?')}</b><small data-sem-traducao>${x.ultima.de === uid ? '↪ ' : ''}${esc(x.ultima.texto.slice(0, 60))}</small></div>${x.novas ? `<span class="price">${x.novas}</span>` : `<small>${tempoRel(x.ultima.criado_em)}</small>`}</div>`).join('')}</div>`
    : '<div class="empty">Ainda não tens conversas. Procura alguém pelo nome acima e manda uma mensagem.</div>';
  l.querySelectorAll('[data-cv]').forEach(r => r.onclick = () => abrirConversa(r.dataset.cv, r.dataset.nome));
  if (typeof ui2Conversas === 'function') ui2Conversas(c, l);   // 8 nov: redesenho (teste)
}
async function abrirConversa(outro, nome) {
  const el = sheet(`<h3 data-sem-traducao>💬 ${esc(nome)}</h3><div class="coms" id="cvMsgs" style="max-height:50vh;overflow:auto"><div class="empty">A carregar…</div></div>
    <div style="display:flex;gap:6px;margin-top:10px"><input class="inp" id="cvTxt" maxlength="500" placeholder="Escreve uma mensagem…" style="margin:0"><button class="btn sm" id="cvEnv">Enviar</button></div>`);
  const render = async () => {
    const { data } = await sb.from('dms').select('*').or(`de.eq.${outro},para.eq.${outro}`).order('criado_em', { ascending: false }).limit(60);
    const box = el.querySelector('#cvMsgs'); if (!box) return;
    box.innerHTML = (data || []).reverse().map(m => `<div class="com" style="text-align:${m.de === uid ? 'right' : 'left'}"><span data-sem-traducao style="display:inline-block;padding:6px 10px;border-radius:12px;background:${m.de === uid ? 'var(--gold,#FFCB00);color:#141012' : 'var(--card2,#2a2427)'}">${esc(m.texto)}</span><small>${tempoRel(m.criado_em)}</small></div>`).join('') || '<div class="empty">Diz olá! 👋</div>';
    box.scrollTop = box.scrollHeight;
  };
  dmAberta = { id: outro, render };
  await render();
  const antes = dmNaoLidas; await sb.rpc('ler_dms', { p_de: outro });
  const { count } = await sb.from('dms').select('id', { count: 'exact', head: true }).eq('para', uid).eq('lida', false); dmNaoLidas = count || 0; if (antes !== dmNaoLidas) atualizarPontoTel();
  const enviar = async () => {
    const i = el.querySelector('#cvTxt'), t = i.value.trim(); if (!t) return;
    i.value = ''; const { error } = await sb.rpc('enviar_dm', { p_para: outro, p_texto: t });
    if (error) { toast(limparErro(error.message), 'mau'); i.value = t; return; }
    render();
  };
  el.querySelector('#cvEnv').onclick = enviar;
  el.querySelector('#cvTxt').onkeydown = e => { if (e.key === 'Enter') enviar(); };
  const fim = new MutationObserver(() => { if (!el.isConnected) { dmAberta = null; fim.disconnect(); } }); fim.observe(document.body, { childList: true, subtree: true });
}

/* ---------- 💸 sugar daddy / mummy (personagens do jogo) ---------- */
async function diaDoSugar() { const pd = pre('dia_sugar'); const { data } = pd ? { data: pd.v } : await sb.rpc('dia_do_sugar'); if (data?.msg) { if (data.jogador) setJogador(data.jogador); toast(data.msg, data.tipo || 'info', 6000); } }
async function blocoSugar(body) {
  if (J.maior === false) return;
  const { data: s, error } = await sb.from('sugar').select('*').maybeSingle(); if (error) return;
  const el = document.createElement('div'); el.dataset.ui2 = 'p';
  el.innerHTML = `<div class="sub2">Sugar 💸</div>` + (s
    ? `<div class="list"><div class="row mine"><span class="e">💸</span><div class="t"><b data-sem-traducao>${esc(s.npc_nome)}</b><small>Sugar ${s.tipo} · ${fmtKz(s.mesada)} por dia</small></div><button class="btn sm ghost" id="sgFim">Acabar</button></div></div>`
    : `<p class="m">Uma pessoa rica paga-te uma mesada todos os dias. Dá jeito… mas o bairro fala, e pode acabar de repente.</p>
       <div style="display:flex;gap:8px"><button class="btn sm" data-sg="daddy">Procurar sugar daddy</button><button class="btn sm" data-sg="mummy">Procurar sugar mummy</button></div>`);
  const subs = body.querySelectorAll('.sub2'), ref = subs[subs.length - 1]; ref ? ref.before(el) : body.appendChild(el);
  el.querySelectorAll('[data-sg]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('arranjar_sugar', { p_tipo: b.dataset.sg })) abrirTelemovel('social'); else b.disabled = false; });
  el.querySelector('#sgFim')?.addEventListener('click', async () => { if (!await perguntar(`Acabar com ${s.npc_nome}? Perdes a mesada.`)) return; if (await acao('acabar_sugar')) abrirTelemovel('social'); });
}

/* ---------- 🔎 procurar pessoas pelo nome ---------- */
function procurarHTML() {
  return `<div class="procurar" style="margin-bottom:10px"><input class="inp" id="pqNome" type="search" placeholder="Procurar pelo nome ou email…" autocomplete="off" style="margin:0" maxlength="80"><div id="pqRes"></div></div>`;
}
function ligarProcurar(raiz, extra) {
  const inp = raiz.querySelector('#pqNome'), res = raiz.querySelector('#pqRes'); if (!inp) return;
  let t = null, seq = 0;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const bruto = inp.value.trim(), meu = ++seq;
    // email: não se procura (não revelamos quem tem conta) — envia-se um pedido de amizade "às cegas"
    if (bruto.includes('@')) {
      res.innerHTML = `<div class="list" style="margin-top:6px"><div class="row"><span class="e">📨</span><div class="t"><b>Pedir amizade por email</b><small>Por privacidade não mostramos se o email tem conta: se tiver, a pessoa recebe o teu pedido.</small></div><button class="btn sm" id="pqEmail">Enviar</button></div></div>`;
      res.querySelector('#pqEmail').onclick = async () => { const { data, error } = await sb.rpc('pedir_amizade_email', { p_email: bruto }); if (error) return toast(limparErro(error.message), 'mau'); toast(data.msg, 'info', 6000); inp.value = ''; res.innerHTML = ''; };
      return;
    }
    const q = bruto.replace(/[%_,()\\]/g, '').slice(0, 20);
    if (q.length < 2) { res.innerHTML = ''; return; }
    const { data } = await sb.from('jogadores').select('id,nome,bairro,aparencia').ilike('nome', q + '%').neq('id', uid).order('nome').limit(8);
    if (meu !== seq) return;
    const lista = (data || []).filter(x => !bloqueados.has(x.id));
    res.innerHTML = lista.length ? `<div class="list" style="margin-top:6px">${lista.map(x => `<div class="row"><div class="t"><b data-sem-traducao>${esc(x.nome)}</b><small>${esc(bairro(x.bairro)?.nome || '')}</small></div>
      ${extra ? extra(x) : ''}<button class="btn sm ghost" data-amz="${x.id}" title="Pedir amizade">🤝</button><button class="btn sm ghost" data-pq="${x.id}">Ver</button></div>`).join('')}</div>` : '<div class="empty">Ninguém com esse nome.</div>';
    res.querySelectorAll('[data-amz]').forEach(b => b.onclick = async () => { b.disabled = true; if (!await acao('pedir', { p_alvo: b.dataset.amz, p_tipo: 'amizade' })) b.disabled = false; });
    res.querySelectorAll('[data-pq]').forEach(b => b.onclick = () => { const x = lista.find(y => y.id === b.dataset.pq); tocarPessoa({ id: x.id, nome: x.nome, ap: x.aparencia }); });
    raiz.dispatchEvent(new CustomEvent('procurou', { detail: lista }));
  }, 250); };
}
/* ---------- 🛡️ Admin ---------- */
// 0y: quando crescer a cidade (o dono pode mudar estes números). Primeiro cresce o bairro com mais jogadores por dia.
const REGRA_CRESCER = [
  { jogadores: 500, passo: '+1 rua no bairro mais visitado' },
  { jogadores: 2000, passo: '+1 rua nos 3 mais visitados' },
  { jogadores: 10000, passo: 'bairros novos' },
];
const REGRA_BAIRRO = 40;   // jogadores diferentes por dia, em média na semana, para um bairro poder crescer
const TIPOS_ALERTA = {
  funil: 'Funil: uma conta recebe kumbu de várias contas novas',
  transferencia_mesma_pessoa: 'Envio entre contas do mesmo aparelho ou rede',
  conta_nova_esvaziada: 'Conta nova que deu quase tudo a outra',
  mesmo_aparelho: 'Várias contas no mesmo aparelho',
  contas_mesma_rede: 'Muitas contas novas na mesma rede (pode ser um cibercafé)',
  ritmo_bot: 'Ritmo de robô (45+ ações num minuto)',
};
// (0bi, 2 nov) renderAdmin passou para js/admin.js — painel por páginas

/* ============================================================
   👶 FILHOS E GERAÇÕES
   ============================================================ */
const TALENTOS = { futebol: '⚽ Futebol', musica: '🎤 Música', matematica: '🧮 Matemática', arte: '🎨 Arte', danca: '💃 Dança' };
const ESCOLAS = { publica: 'Pública · grátis', privada: 'Privada · 2.500 Kz/dia', internacional: 'Internacional · 10.000 Kz/dia' };
// nome da escola de um filho: escola pública, um colégio (tabela colegios) ou as antigas privada/internacional
const nomeEscola = id => id === 'publica' ? 'Escola pública' : D.colegios?.find(c => c.id === id)?.nome || (ESCOLAS[id] || id).split(' · ')[0];
function faseFilho(i) { return i < 3 ? ['👶', 'Bebé'] : i < 6 ? ['🧒', 'Criança pequena'] : i < 13 ? ['🧒', 'Criança'] : i < 18 ? ['🧑', 'Adolescente'] : ['🧑‍🎓', 'Adulto/a']; }
const eMeu = f => (f.p1 === uid && f.g1 === (J.geracao ?? 1)) || (f.p2 === uid && f.g2 === (J.geracao ?? 1));
async function lerFilhos() {
  const { data, error } = await sb.from('filhos').select('*').or(`p1.eq.${uid},p2.eq.${uid}`).order('nascido_em');
  return error ? null : data || [];
}
function pedirNome(titulo, texto, botao, fn) {
  const el = sheet(`<h3>${titulo}</h3><p class="m">${texto}</p><label>Nome</label><input class="inp" id="iNomeF" maxlength="20" placeholder="ex: Kiala, Nzinga, Tchissola">
    <button class="btn full" id="sim">${botao}</button>`);
  const i = el.querySelector('#iNomeF'); setTimeout(() => i.focus(), 50);
  el.querySelector('#sim').onclick = () => { const n = i.value.trim(); if (n.length < 2) return toast('Escreve um nome.', 'mau'); fn(n); };
}
function cartaoFilho(f, completo) {
  const i = idadeDe(f), [e, fase] = faseFilho(i), herd = J.herdeiro === f.id;
  if (new Date(f.nascido_em) > new Date()) {
    const dias = Math.ceil((new Date(f.nascido_em) - Date.now()) / 864e5);
    return `<div class="row mine"><span class="e">🤰</span><div class="t"><b>${esc(f.nome)}</b><small>Bebé a caminho — nasce daqui a ${dias} dia${dias > 1 ? 's' : ''}</small></div></div>`;
  }
  const fel = Math.round(f.felicidade);
  return `<div class="rel" style="margin-top:8px">
    <div class="lbl"><span>${e} ${esc(f.nome)}${herd ? ' 📜' : ''}</span><span style="color:var(--dim);font-weight:600">${sexoTxt(f)}${i} ano${i === 1 ? '' : 's'} · ${fase}${f.adotado ? ' · adotado/a' : ''}</span></div>
    ${i < 18 ? `<div class="lbl" style="margin-top:8px;font-weight:600"><span>😊 Felicidade</span><span>${fel}</span></div>
      <div class="meter"><u style="left:0;width:${fel}%;background:${fel < 30 ? 'var(--red)' : 'var(--green)'}"></u></div>` : ''}
    <div class="chips" style="margin-top:8px">
      ${i >= 6 && i < 18 ? `<span class="chip">🏫 ${esc(nomeEscola(f.escola))}</span><span class="chip">📝 Notas ${Number(f.notas).toFixed(1).replace('.', ',')}/20</span>` : ''}
      ${i >= 8 && f.talento ? `<span class="chip">✨ ${TALENTOS[f.talento] || f.talento}</span>` : ''}
      ${f.poupanca ? `<span class="chip">💰 Poupança ${fmtKz(f.poupanca)}</span>` : ''}
      ${herd ? `<span class="chip">📜 Vai herdar a tua vida</span>` : ''}
    </div>
    ${completo && eMeu(f) ? `<div class="grelha">
      ${i < 18 ? `<button data-f="brincar"><span class="e">🧸</span><span>Brincar</span></button>` : ''}
      ${i >= 6 && i < 18 ? `<button data-f="tpc"><span class="e">📚</span><span>Trabalhos de casa</span></button>` : ''}
      <button data-f="mesada"><span class="e">💰</span><span>Dar mesada</span></button>
      ${i < 18 ? `<button data-f="escola"><span class="e">🎒</span><span>Escolher colégio</span></button>` : ''}
      ${!herd ? `<button data-f="herdeiro"><span class="e">📜</span><span>Pôr no testamento</span></button>` : ''}
      ${i < 18 ? `<button data-f="entregar" class="perigo"><span class="e">🚪</span><span>Entregar</span></button>` : ''}
    </div>` : ''}
  </div>`;
}
function ligarFilho(el, f, depois) {
  const faz = async (ac, v) => { if (await acao('cuidar_filho', { p_id: f.id, p_acao: ac, p_valor: v ?? null })) depois(); };
  // 0k-C: brincar e trabalhos de casa abrem um mini-jogo (as estrelas mexem um bocadinho no resultado)
  const jogo = async ac => {
    const i = idadeDe(f);
    const est = ac === 'tpc' ? await jogoContas(i, f.nome) : i < 3 ? await jogoCucu(f.nome) : await jogoMemoria(i, f.nome);
    if (est === undefined) return;
    if (await acao('cuidar_filho2', { p_id: f.id, p_acao: ac, p_estrelas: est })) depois();
  };
  el.querySelector('[data-f=brincar]')?.addEventListener('click', () => jogo('brincar'));
  el.querySelector('[data-f=tpc]')?.addEventListener('click', () => jogo('tpc'));
  el.querySelector('[data-f=herdeiro]')?.addEventListener('click', () => faz('herdeiro'));
  // 0cj (Cinnss, 3 nov): deixar na igreja ou entregar para adoção; depois, 90 dias sem poder ter nem adotar filhos
  el.querySelector('[data-f=entregar]')?.addEventListener('click', () => {
    const s2 = sheet(`<h3>🚪 ${esc(tr('Entregar {0}?').replace('{0}', f.nome))}</h3>
      <div class="row" style="border-color:var(--red)"><span class="e">⚠️</span><div class="t"><b>${esc(tr('Depois disto, durante 90 dias não podes ter nem adotar filhos.'))}</b><small>${esc(tr('Não dá para voltar atrás: {0} sai da tua família.').replace('{0}', f.nome))}</small></div></div>
      <div class="list" style="margin-top:10px">
        <button class="row" data-modo="adocao" style="text-align:left"><span class="e">📄</span><div class="t"><b>${esc(tr('Entregar para adoção'))}</b><small>${esc(tr('Uma nova família cuida dele/a. Papéis: 5.000 Kz · reputação −3.'))}</small></div></button>
        <button class="row" data-modo="igreja" style="text-align:left"><span class="e">⛪</span><div class="t"><b>${esc(tr('Deixar na igreja'))}</b><small>${esc(tr('As freiras cuidam dele/a. De graça, mas o bairro fica a saber · reputação −10.'))}</small></div></button>
      </div><button class="btn full ghost" style="margin-top:10px" data-fechar>${esc(tr('Cancelar'))}</button>`);
    s2.querySelectorAll('[data-modo]').forEach(b => b.onclick = async () => {
      if (!await perguntar(tr('Tens a certeza? Durante 90 dias não podes ter nem adotar filhos.'), tr('Sim, entregar'))) return;
      if (await acao('entregar_filho', { p_id: f.id, p_modo: b.dataset.modo })) { fecharSheets(); if (typeof abrirTelemovel === 'function') abrirTelemovel('familia'); }
    });
  });
  el.querySelector('[data-f=mesada]')?.addEventListener('click', () => {
    const s2 = sheet(`<h3>💰 Mesada para ${esc(f.nome)}</h3><p class="m">Vai para a poupança dele/a. Se ${esc(f.nome)} herdar a tua vida, leva a poupança.</p>
      <div class="grelha">${[1000, 5000, 20000, 100000].map(v => `<button data-v="${v}"><span class="e">💵</span><span>${fmtKz(v)}</span></button>`).join('')}</div>`);
    s2.querySelectorAll('[data-v]').forEach(b => b.onclick = () => faz('mesada', parseInt(b.dataset.v, 10)));
  });
  el.querySelector('[data-f=escola]')?.addEventListener('click', () => {
    // colégios: mais caros = notas sobem mais depressa e quem herda começa com mais reputação e o selo do colégio
    const melhor = Math.max(...(D.colegios || []).map(c => c.taxa), 0.06);
    const barra = t => `<div class="meter" style="margin-top:4px;height:5px"><u style="left:0;width:${Math.round(t / melhor * 100)}%;background:var(--gold)"></u></div>`;
    const linha = (id, nome, preco, t, rep) => `<button class="row ${f.escola === id ? 'mine' : ''}" data-e="${id}" style="text-align:left"><span class="e">${id === 'publica' ? '🏫' : '🎒'}</span>
      <div class="t"><b>${esc(nome)}${f.escola === id ? ' · ✓' : ''}</b><small>${preco ? fmtKz(preco) + '/dia' : 'Grátis'} · ${tr('notas')} ${'▲'.repeat(Math.max(1, Math.round(t / melhor * 4)))}${rep ? ` · +${rep} ${tr('reputação ao herdar')}` : ''}</small>${barra(t)}</div></button>`;
    const s2 = sheet(`<h3>🎒 ${tr('Colégio de')} ${esc(f.nome)}</h3><p class="m">${tr('Colégios melhores fazem as notas subirem mais depressa. Se')} ${esc(f.nome)} ${tr('herdar a tua vida, começa com estudo (das notas), reputação extra e o selo do colégio no perfil. A propina é cobrada todos os dias; se não houver dinheiro, volta para a pública.')}</p>
      <div class="list">${linha('publica', 'Escola pública', 0, 0.06, 0)}${(D.colegios || []).map(c => linha(c.id, c.nome, c.propina, c.taxa, c.rep)).join('')}</div>`);
    s2.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { if (f.escola !== b.dataset.e) faz(b.dataset.e); });
  });
}
async function abrirFilho(id) {
  const fs = await lerFilhos(); const f = fs?.find(x => x.id === id);
  if (!f) return;
  const el = sheet(`<h3>${faseFilho(idadeDe(f))[0]} ${esc(f.nome)}</h3>${cartaoFilho(f, true)}`);
  ligarFilho(el, f, () => abrirFilho(id));
}
async function filhosNaCasa(donoId) {
  _filhosCasa = [];
  festaNaCasa(donoId);
  const { data: mor } = await sb.from('jogadores').select('id').eq('lar', donoId);
  const ids = [donoId, ...(mor || []).map(x => x.id)];
  const { data, error } = await sb.from('filhos').select('*').eq('estado', 'vivo').or(ids.map(i => `p1.eq.${i},p2.eq.${i}`).join(','));
  if (error || cena?.tipo !== 'casa' || cena.dono.id !== donoId) return;
  const r = rng(Date.now() & 0xffff);
  const filhos = (data || []).filter(f => new Date(f.nascido_em) <= new Date() && idadeDe(f) < 18);
  // 0cy (1) (dono, 3 nov): cada filho está num andar e só aparece nesse; os que já andam sobem e descem as escadas de vez em quando
  _filhosCasa = filhos;
  filhosNoAndar(r);
  empregadosNaCasa(donoId, r);
}
let _filhosCasa = [];
// também quando sobes/desces (jogo.js: mudarAndar): só ficam os filhos que estão neste andar
function filhosNoAndar(r = Math.random) {
  npcs = npcs.filter(n => !n.filho);
  for (const f of _filhosCasa) if (andarDoFilho(f, r) === (cena.andar || 0)) poeFilho(f, r);
  clearInterval(_intFilhos);
  if ((cena.andares || 1) > 1 && _filhosCasa.some(f => idadeDe(f) >= 2)) _intFilhos = setInterval(() => mudarAndarFilhos(_filhosCasa), 5000);
}
const ANDAR_FILHO = {};
let _intFilhos = null;
function andarDoFilho(f, r) {
  const n = cena?.andares || 1; if (n < 2) return 0;
  if (!(f.id in ANDAR_FILHO)) ANDAR_FILHO[f.id] = idadeDe(f) < 2 ? 0 : Math.floor(r() * n);   // os bebés ficam em baixo
  return Math.min(ANDAR_FILHO[f.id], n - 1);
}
function poeFilho(f, r, onde) {
  const i = idadeDe(f);
  const l = onde || livreProximo(cena.bloq, cena.W, cena.H, Math.floor(r() * cena.W), Math.floor(r() * cena.H)); if (!l) return null;
  const n = novoPersonagem('f' + f.id, f.nome, f.aparencia || {}, l[0], l[1], { npc: true, filho: f, idade: i, espera: r() * 3, escala: i < 3 ? 0.45 : i < 8 ? 0.6 : i < 13 ? 0.72 : 0.88 });
  npcs.push(n); return n;
}
// de ~5 em ~5 s: quem chegou às escadas desaparece deste andar; de vez em quando um filho muda de andar (a pé, pelas escadas)
function mudarAndarFilhos(filhos) {
  if (cena?.tipo !== 'casa' || (cena.andares || 1) < 2) return clearInterval(_intFilhos);
  const esc0 = cena.casa?.planta?.escada; if (!esc0) return;
  const escada = livreProximo(cena.bloq, cena.W, cena.H, Math.max(0, esc0[0] - 1), esc0[1]) || [Math.max(0, esc0[0] - 1), esc0[1]];
  for (const n of npcs) if (n.filho && n.saiAndar && (Math.hypot(n.x - n.saiAndar[0] - 0.5, n.y - n.saiAndar[1] - 0.5) < 1.2 || performance.now() > n.saiAte)) n.foi = true;
  if (npcs.some(n => n.foi)) npcs = npcs.filter(n => !n.foi);
  const aqui = cena.andar || 0, r = Math.random;
  for (const f of filhos) {
    if (idadeDe(f) < 2 || r() > 0.08) continue;                              // ~1 vez a cada minuto por filho
    const de = andarDoFilho(f, r), para = de === aqui ? (aqui ? aqui - 1 : aqui + 1) : aqui;
    ANDAR_FILHO[f.id] = para;
    if (de === aqui) {            // vai a pé até às escadas e muda de andar
      const n = npcs.find(x => x.filho?.id === f.id); if (!n) continue;
      const p = caminho(cena.bloq, cena.W, cena.H, Math.floor(n.x), Math.floor(n.y), escada[0], escada[1]);
      n.path = p && p.length > 1 ? p.slice(1) : []; n.espera = 1e9; n.saiAndar = escada; n.saiAte = performance.now() + 15000;
    } else if (!npcs.some(x => x.filho?.id === f.id)) {   // chega a este andar pelas escadas
      const n = poeFilho(f, r, escada); if (n) n.espera = 0.5;
    }
  }
}
// 🧹 os empregados aparecem em casa e vão fazendo o trabalho deles
const VISUAL_EMPREGADO = {
  empregada: [{ pele: 4, cabelo: 3, corCabelo: 0, camisa: '#2c6fb0', calca: '#2c6fb0', roupa: 3 }, ['🧹', '🧽', '🧺'], ['A casa está limpinha!', 'Já arrumei o quarto.', 'Cuidado, o chão está molhado!']],
  cozinheiro: [{ pele: 2, cabelo: 0, corCabelo: 0, camisa: '#f5f5f5', calca: '#333' }, ['🍲', '🍳', '🥘'], ['O funge já está quase!', 'Hoje há muamba.', 'Quer provar o molho?']],
  seguranca: [{ pele: 5, cabelo: 0, corCabelo: 0, camisa: '#141012', calca: '#141012' }, ['🛡️', '👀', '🔦'], ['Tudo calmo por aqui, chefe.', 'Ninguém entra sem eu ver.', 'Portão fechado.']],
  motorista: [{ pele: 3, cabelo: 1, corCabelo: 0, camisa: '#cfd6dc', calca: '#2a3b55' }, ['🚘', '🔑', '🧽'], ['O carro está lavado, chefe.', 'Para onde vamos hoje?', 'Já pus gasolina.']],
};
let _intEmpregados = null;
// Onde cada empregado anda (#31/#32): cozinheiro só na cozinha; segurança perto da porta; motorista lá fora, à volta dos carros.
// Devolve { tiles } (zona dentro de casa), { fora } (pontos na entrada da garagem), null (anda por toda a casa) ou false (não aparece neste andar).
function tilesDaSala(re) {
  const planta = cena.casa?.planta, andar = cena.andar || 0, W = cena.W, H = cena.H;
  const etiqueta = (cena.salas || []).find(s => re.test(s.n)); if (!etiqueta) return null;
  const parede = new Set(tilesParede(planta, andar).map(([x, y]) => x + ',' + y));
  const porta = new Set((planta?.paredes?.[andar] || []).flatMap(sg => (sg.p || []).map(([x, y]) => x + ',' + y)));
  const vistos = new Set(), fila = [[etiqueta.x, etiqueta.y]], out = [];
  while (fila.length) {
    const [x, y] = fila.pop(), k = x + ',' + y;
    if (x < 0 || y < 0 || x >= W || y >= H || vistos.has(k) || parede.has(k) || porta.has(k)) continue;
    vistos.add(k); if (!cena.bloq[y * W + x]) out.push([x, y]);
    fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}
function zonaEmpregado(tipo) {
  const andar = cena.andar || 0, W = cena.W, H = cena.H;
  const salasTodas = (cena.casa?.planta?.salas || []).flat();
  if (tipo === 'cozinheiro') {
    if (!salasTodas.some(s => /cozinha/i.test(s.n))) return null;          // casa de uma divisão: anda pela casa
    const t = tilesDaSala(/cozinha/i); return t && t.length ? { tiles: t } : false;
  }
  if (tipo === 'motorista') {
    if (andar) return false;
    const carros = Math.min(4, (J.itens || []).map(id => D.itens?.find(i => i.id === id)).filter(i => i?.categoria === 'veiculo').length);
    // duas faixas livres (junto à casa e junto à rua) e os intervalos entre carros por onde se atravessa (coordenadas de casa)
    // (cada carro k ocupa y de 0.3+2.4k a ~2.4+2.4k no mundo; posição de pessoa = casa + 0.5)
    const fa = W + 0.25, fb = W + 2.5, pts = [], cruzes = [-0.8];
    for (let k = 0; k < carros; k++) { const y = 0.3 + k * 2.4; pts.push([fa, y + 0.3], [fa, y + 1.2], [fb, y + 0.3], [fb, y + 1.2]); cruzes.push(k < carros - 1 ? y + 1.7 : y + 2.0); }
    if (!pts.length) pts.push([W + 1, H], [W + 1, H - 1]);                  // sem carros: espera ao portão da garagem
    return { fora: pts, faixas: carros ? [fa, fb] : null, cruzes };
  }
  if (tipo === 'seguranca' && !andar) {
    const t = [];
    for (let y = 0; y < Math.min(H, 4); y++) for (let x = Math.max(0, W - 5); x < W; x++) if (!cena.bloq[y * W + x] && !cena.ocupado?.has(x + ',' + y)) t.push([x, y]);
    return t.length ? { tiles: t } : null;
  }
  return null;
}
// dono 1 nov 00:41: «when I go upstairs the staff teleport there — they should be able to traverse the whole house».
// Cada empregado está num andar: motorista e segurança em baixo, o/a cozinheiro/a no andar da cozinha, a empregada vai mudando de andar pelas escadas.
const ANDAR_EMP = {};
function andarDoEmpregado(tipo) {
  if (!cena?.casa || (cena.andares || 1) < 2) return 0;
  if (tipo === 'motorista' || tipo === 'seguranca') return 0;
  if (tipo === 'cozinheiro') { const k = (cena.casa.planta?.salas || []).findIndex(a => (a || []).some(x => /cozinha/i.test(x.n))); return k < 0 ? 0 : k; }
  return ANDAR_EMP[tipo] ?? (ANDAR_EMP[tipo] = 0);
}
function mudarAndarEmpregados(data, r) {
  if (cena?.tipo !== 'casa' || (cena.andares || 1) < 2) return;
  const esc0 = cena.casa.planta?.escada; if (!esc0) return;
  const escada = livreProximo(cena.bloq, cena.W, cena.H, Math.max(0, esc0[0] - 1), esc0[1]) || [Math.max(0, esc0[0] - 1), esc0[1]];
  for (const e of data) {
    if (e.tipo !== 'empregada' || Math.random() > 0.4) continue;
    const aqui = andarDoEmpregado(e.tipo) === (cena.andar || 0);
    ANDAR_EMP[e.tipo] = andarDoEmpregado(e.tipo) ? 0 : 1;
    if (aqui) {   // vai a pé até às escadas e sobe/desce
      const n = npcs.find(x => x.empregado === e.tipo); if (!n) continue;
      const p = caminho(cena.bloq, cena.W, cena.H, Math.floor(n.x), Math.floor(n.y), escada[0], escada[1]);
      n.path = p && p.length > 1 ? p.slice(1) : []; n.espera = 1e9; n.zona = null; n.saiAndar = escada; n.saiAte = performance.now() + 15000;
    } else {      // chega pelas escadas a este andar
      const v = VISUAL_EMPREGADO[e.tipo]; if (!v) continue;
      const nomes = { empregada: 'Empregada' };
      npcs.push(novoPersonagem('e' + e.tipo, tr(nomes[e.tipo] || e.tipo), v[0], escada[0], escada[1], { npc: true, empregado: e.tipo, espera: 0.5 }));
    }
  }
}
async function empregadosNaCasa(donoId, r) {
  if (!ehMeuLar(donoId)) return;
  const { data } = await sb.from('empregados_casa').select('tipo');
  if (!data?.length || cena?.tipo !== 'casa' || cena.dono.id !== donoId) return;
  const nomes = { empregada: 'Empregada', cozinheiro: 'Cozinheiro/a', seguranca: 'Segurança', motorista: 'Motorista' };
  npcs = npcs.filter(n => !n.empregado);
  for (const e of data) {
    const v = VISUAL_EMPREGADO[e.tipo]; if (!v) continue;
    if (andarDoEmpregado(e.tipo) !== (cena.andar || 0)) continue;   // dono 1 nov: cada um está num andar; não te seguem quando sobes
    const z = zonaEmpregado(e.tipo);
    if (z === false) continue;                       // não aparece neste andar (ex.: cozinheiro no 1.º andar)
    let l;
    if (z?.fora) l = z.fora[Math.floor(r() * z.fora.length)];
    else if (z?.tiles?.length) l = z.tiles[Math.floor(r() * z.tiles.length)];
    else l = livreProximo(cena.bloq, cena.W, cena.H, Math.floor(r() * cena.W), Math.floor(r() * cena.H));
    if (!l) continue;
    npcs.push(novoPersonagem('e' + e.tipo, tr(nomes[e.tipo]), v[0], l[0], l[1], { npc: true, empregado: e.tipo, espera: r() * 3, zona: z?.tiles || null, fora: z?.fora || null, faixas: z?.faixas || null, cruzes: z?.cruzes || null }));
  }
  clearInterval(_intEmpregados);
  let ciclo = 0;
  _intEmpregados = setInterval(() => {
    if (cena?.tipo !== 'casa') return clearInterval(_intEmpregados);
    if (++ciclo % 10 === 0) mudarAndarEmpregados(data, r);   // de ~40 em ~40 s alguém pode usar as escadas
    for (const n of npcs) if (n.saiAndar && (Math.hypot(n.x - n.saiAndar[0] - 0.5, n.y - n.saiAndar[1] - 0.5) < 1.2 || performance.now() > n.saiAte)) n.foi = true;
    if (npcs.some(n => n.foi)) npcs = npcs.filter(n => !n.foi);
    for (const n of npcs) if (n.empregado && Math.random() < 0.5) { const em = VISUAL_EMPREGADO[n.empregado][1]; n.fala = { txt: em[Math.floor(Math.random() * em.length)], ate: performance.now() + 2500 }; }
  }, 4000);
}
// 0ae (Cinnss, 30 out; desenho aprovado): 📱 Família — o teu par e o estado da relação, a gravidez, os bebés (fome, banho, fralda, sono, ama),
// o quarto do bebé, os outros filhos, a casa e a conta do casal, os custos da semana e a árvore da família.
const ITENS_BEBE = { berco: ['🛏️', 'Berço', 30000, 'o sono desce para metade'], fraldas: ['👶', 'Fraldas para o mês', 6000, 'mudar a fralda fica grátis'],
  carrinho: ['🛒', 'Carrinho de bebé', 25000, 'podes levar o bebé a passear'], cadeira: ['🚗', 'Cadeira para o carro', 18000, 'passeios mais felizes'] };
const NECESS = [['fome', '🍼', 'Fome', 'comer', 'Dar de comer'], ['higiene', '🚿', 'Banho', 'banho', 'Dar banho'], ['fralda', '💧', 'Fralda', 'fralda', 'Mudar a fralda'], ['sono', '😴', 'Sono', 'dormir', 'Pôr a dormir']];
const ESCADA = [['', 'Solteiro/a'], ['paquera', 'A conhecer-se'], ['namoro', 'Namorados'], ['noivos', 'Noivos'], ['casados', 'Casados']];
function passoEscada(r) { if (!r?.romance || r.romance === 'ex') return 0; if (r.romance === 'paquera') return 1; if (r.romance === 'casados') return 4; return r.fase === 'noivos' || r.fase_antes === 'noivos' ? 3 : 2; }
async function lerPares() {
  const { data } = await sb.from('relacoes').select('*').or(`a.eq.${uid},b.eq.${uid}`).in('romance', ['paquera', 'namoro', 'casados']);
  const rs = data || []; if (!rs.length) return [];
  const nomes = await nomesDe(rs.map(r => r.a === uid ? r.b : r.a));
  return rs.map(r => ({ r, id: r.a === uid ? r.b : r.a, nome: nomes[r.a === uid ? r.b : r.a] || '?' }))
    .sort((x, y) => passoEscada(y.r) - passoEscada(x.r));
}
function barraNec(v) { return `<div class="meter" style="height:7px"><u style="left:0;width:${Math.max(0, Math.min(100, v))}%;background:${v < 30 ? 'var(--red)' : v < 60 ? 'var(--gold)' : 'var(--green)'}"></u></div>`; }
function cartaoGravidez(f, itens) {
  const ini = new Date(f.criado_em).getTime(), fim = new Date(f.nascido_em).getTime(), pr = Math.max(0, Math.min(1, (Date.now() - ini) / Math.max(1, fim - ini)));
  const passo = Math.min(4, Math.floor(pr * 5)), horas = Math.max(0, Math.round((fim - Date.now()) / 36e5));
  const quando = horas >= 24 ? `${Math.ceil(horas / 24)} ${tr(Math.ceil(horas / 24) === 1 ? 'dia' : 'dias')}` : `${horas} h`;
  const etapas = ['Notícia', 'Ecografia', 'Barriga a crescer', 'Mala pronta', 'Nascimento'];
  return `<div class="rel" style="margin-top:8px;border-color:var(--gold)">
    <div class="lbl"><span>🤰 ${esc(f.nome)}</span><span style="color:var(--dim);font-weight:600">${tr('nasce daqui a')} ${quando}</span></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:10px">${etapas.map((_, k) => `<div style="height:8px;border-radius:9px;background:${k <= passo ? 'var(--gold)' : 'var(--line)'}"></div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:4px;font-size:10.5px;color:var(--muted);text-align:center;font-weight:600">${etapas.map((t, k) => `<span style="${k === passo ? 'color:var(--gold)' : ''}">${tr(t)}</span>`).join('')}</div>
    <div class="sub2" style="margin:12px 0 6px">🧸 ${tr('Quarto do bebé')} · ${itens.length}/4</div>
    <div class="grelha">${Object.entries(ITENS_BEBE).map(([id, [e, n, preco, dica]]) => itens.includes(id)
      ? `<button disabled style="border-color:var(--green)"><span class="e">${e}</span><span>${tr(n)} ✓</span></button>`
      : `<button data-item="${id}"><span class="e">${e}</span><span>${tr(n)} · ${fmtKz(preco)}<small style="display:block;color:var(--dim);font-size:11px;font-weight:600">${tr(dica)}</small></span></button>`).join('')}</div>
    <div class="grelha" style="margin-top:8px"><button data-prep="${f.id}"><span class="e">🎨</span><span>${tr('Nome e aparência')}</span></button></div>
  </div>`;
}
// dono 1 nov: menino ou menina (antes todos pareciam meninas)
const sexoTxt = f => f.sexo ? tr(f.sexo === 'menino' ? 'Menino' : 'Menina') + ' · ' : '';
function cartaoBebe(f, n, itens, pares) {
  const i = idadeDe(f), meses = Math.max(0, Math.floor((Date.now() - new Date(f.nascido_em)) / 864e5 / 7 * 12));
  const fase = i < 1 ? (meses < 1 ? 'Recém-nascido/a' : 'Bebé') : 'Criança pequena';
  const outro = f.p1 === uid ? f.p2 : f.p1, nomeOutro = pares.find(p => p.id === outro)?.nome;
  const minhaVez = !outro || (new Date().getDay() % 2 === 0) === (f.p1 === uid);
  const ama = n?.ama_ate && new Date(n.ama_ate) > new Date();
  const idadeTxt = i < 1 ? `${meses} ${tr(meses === 1 ? 'mês' : 'meses')}` : `${i} ${tr(i === 1 ? 'ano' : 'anos')}`;
  return `<div class="rel" style="margin-top:8px" data-bebe="${f.id}">
    <div class="lbl"><span>👶 ${esc(f.nome)}</span><span style="color:var(--dim);font-weight:600">${sexoTxt(f)}${tr(fase)} · ${idadeTxt}</span></div>
    <small style="display:block;color:var(--muted);margin-top:4px">${nomeOutro ? (minhaVez ? tr('Hoje é a tua vez de cuidar') : `${tr('Hoje é a vez de')} ${esc(nomeOutro)}`) + ' · ' : ''}${ama ? `🤝 ${tr('Ama a cuidar até')} ${new Date(n.ama_ate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}` : tr('Sem ama')}</small>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${NECESS.map(([k, e, t, ac, bt]) => `<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:8px">
      <div class="lbl" style="font-size:13px"><span>${e} ${tr(t)}</span><span>${n ? n[k] : '—'}</span></div>${barraNec(n ? n[k] : 0)}
      <button class="btn sm ${n && n[k] < 40 ? '' : 'ghost'}" data-cuidar="${ac}" style="width:100%;margin-top:6px">${tr(bt)}</button></div>`).join('')}</div>
    <div class="grelha" style="margin-top:8px">
      ${itens.includes('carrinho') ? `<button data-cuidar="passear"><span class="e">🌅</span><span>${tr('Passear')}</span></button>` : ''}
      <button data-ama="${f.id}"><span class="e">🤝</span><span>${tr(i >= 1 ? 'Creche' : 'Ama')} · ${fmtKz(4000)}/${tr('dia')}</span></button>
      <button data-f="brincar"><span class="e">🧸</span><span>${tr('Brincar')}</span></button>
    </div>
  </div>`;
}
function abrirRelacao(par) {
  const r = par.r, at = passoEscada(r), [re, rt] = estadoRomance(r) || ['', ''];
  const el = sheet(`<h3>${re} ${esc(par.nome)}</h3><p class="m" style="margin-top:0">${rt}</p>
    <div class="list">${ESCADA.map(([k, t], i) => `<div class="row" style="${i > at ? 'opacity:.5' : ''}"><span class="e">${i < at ? '✅' : i === at ? (r.fase === 'pausa' ? '⏸️' : '💛') : '·'}</span><div class="t"><b>${tr(t)}</b>${i === at && r.fase === 'pausa' ? `<small>${tr(r.romance === 'casados' ? 'Separados (ainda casados)' : 'Em pausa')}</small>` : ''}</div></div>`).join('')}</div>
    <div class="grelha" style="margin-top:12px">
      ${r.romance === 'namoro' && !r.fase ? `<button data-r="noivado" class="romance"><span class="e">💍</span><span>${tr('Pedir em noivado · anel 45.000 Kz')}</span></button>` : ''}
      ${r.romance === 'namoro' && r.fase !== 'pausa' ? `<button data-r="casamento" class="romance"><span class="e">💍</span><span>${tr('Pedir em casamento')}</span></button>` : ''}
      ${r.romance !== 'paquera' ? (r.fase === 'pausa' ? `<button data-r="voltar" class="romance"><span class="e">💞</span><span>${tr('Voltar a estar juntos')}</span></button>` : `<button data-r="pausa"><span class="e">⏸️</span><span>${tr('Dar um tempo')}</span></button>`) : ''}
      <button data-r="distancia"><span class="e">✈️</span><span>${tr(r.distancia ? 'Já não é à distância' : 'Relação à distância')}</span></button>
      <button data-r="secreta"><span class="e">🤫</span><span>${tr(r.secreta ? 'Deixar de esconder' : 'Manter em segredo')}</span></button>
    </div>
    <small style="display:block;color:var(--dim);margin-top:10px">${tr('Para acabar ou divorciar, toca na pessoa no jogo.')}</small>`);
  el.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
    const ac = b.dataset.r;
    if (ac === 'noivado' || ac === 'casamento') {
      if (!await perguntar(ac === 'noivado' ? `${tr('Pedir em noivado?')} ${tr('Se aceitar, pagas o anel: 45.000 Kz.')}` : `${tr('Pedir em casamento?')} ${tr('Se aceitar, pagas o alambamento de 100.000 Kz à família.')}`)) return;
      if (await acao('pedir', { p_alvo: par.id, p_tipo: ac })) abrirTelemovel('familia');
      return;
    }
    if (ac === 'pausa' && !await perguntar(tr('Dar um tempo? Podem voltar quando quiserem.'), tr('Dar um tempo'))) return;
    if (await acao('mudar_relacao', { p_alvo: par.id, p_acao: ac })) { fecharSheets(); abrirTelemovel('familia'); }
  });
}
function abrirPrepararBebe(f) {
  const ap = f.aparencia || {};
  const el = sheet(`<h3>🎨 ${esc(f.nome)}</h3>
    <label>${tr('Nome')}${f.nome_mudado ? ` <small style="color:var(--dim)">(${tr('já foi mudado')})</small>` : ''}</label><input class="inp" id="pbNome" maxlength="20" value="${esc(f.nome)}" ${f.nome_mudado ? 'disabled' : ''}>
    <label style="margin-top:10px">${tr('Pele')}</label><div class="sw">${PELES.map((c, i) => `<button type="button" data-pele="${i}" class="${ap.pele === i ? 'on' : ''}" style="background:${c}" aria-label="${tr('Pele')} ${i + 1}"></button>`).join('')}</div>
    <label style="margin-top:10px">${tr('Cor do cabelo')}</label><div class="sw">${CORES_CABELO.map((c, i) => `<button type="button" data-cab="${i}" class="${ap.corCabelo === i ? 'on' : ''}" style="background:${c}" aria-label="${tr('Cor do cabelo')} ${i + 1}"></button>`).join('')}</div>
    <small style="display:block;color:var(--dim);margin-top:8px">${tr('Sem escolher, o bebé sai uma mistura dos dois.')}</small>
    <button class="btn full" id="pbOk" style="margin-top:12px">${tr('Guardar')}</button>`);
  let pele = null, cab = null;
  el.querySelectorAll('[data-pele]').forEach(b => b.onclick = () => { pele = +b.dataset.pele; el.querySelectorAll('[data-pele]').forEach(x => x.classList.toggle('on', x === b)); });
  el.querySelectorAll('[data-cab]').forEach(b => b.onclick = () => { cab = +b.dataset.cab; el.querySelectorAll('[data-cab]').forEach(x => x.classList.toggle('on', x === b)); });
  el.querySelector('#pbOk').onclick = async () => {
    const nome = el.querySelector('#pbNome').value.trim();
    if (await acao('preparar_bebe', { p_id: f.id, p_nome: f.nome_mudado || nome === f.nome ? null : nome, p_pele: pele, p_cabelo: cab })) { fecharSheets(); abrirTelemovel('familia'); }
  };
}
async function abrirArvore(meus, pares) {
  const { data: lin } = await sb.from('linhagem').select('*').eq('jogador_id', uid).order('geracao');
  const par = pares.find(p => p.r.romance === 'casados') || pares.find(p => p.r.romance === 'namoro');
  const caixa = (t, s, ex = '') => `<div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;text-align:center;min-width:92px;${ex}"><b style="display:block">${t}</b><small style="color:var(--muted)">${s}</small></div>`;
  const linha = '<div style="width:2px;height:18px;background:var(--line);margin:0 auto"></div>';
  sheet(`<h3>🌳 ${tr('Árvore da família')}</h3>
    ${(lin || []).map(l => `<div style="display:flex;justify-content:center">${caixa(esc(l.nome), `${l.geracao}.ª ${tr('geração')} · ${tr('morreu aos')} ${l.idade}`, 'border-style:dashed;opacity:.8')}</div>${linha}`).join('')}
    <div style="display:flex;justify-content:center;gap:8px;align-items:center">${caixa(tr('Tu'), `${idadeDe(J)} ${tr('anos')}`, 'border:2px solid var(--gold)')}${par ? `<span>💛</span>${caixa(esc(par.nome), (estadoRomance(par.r) || ['', ''])[1])}` : ''}</div>
    ${meus.length ? `${linha}<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">${meus.map(f => {
      const porNascer = new Date(f.nascido_em) > new Date();
      return caixa(esc(f.nome), porNascer ? tr('a caminho') : `${faseFilho(idadeDe(f))[1]} · ${idadeDe(f)}${f.adotado ? ' · ' + tr('adotado/a') : ''}${J.herdeiro === f.id ? ' · 📜' : ''}`, porNascer ? 'border-style:dashed;border-color:var(--gold)' : '');
    }).join('')}</div>` : `<p class="m" style="text-align:center">${tr('Ainda não tens filhos.')}</p>`}`);
}
async function renderFamilia(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const [todos, pares, { data: eb }] = await Promise.all([lerFilhos(), lerPares(), sb.rpc('estado_bebes')]);
  if (todos == null) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const bebes = eb?.bebes || {}, itens = eb?.itens || [];
  const meus = todos.filter(f => f.estado === 'vivo' && eMeu(f));
  const aCaminho = meus.filter(f => new Date(f.nascido_em) > new Date());
  const pequenos = meus.filter(f => new Date(f.nascido_em) <= new Date() && bebes[f.id]);
  const outros = meus.filter(f => new Date(f.nascido_em) <= new Date() && !bebes[f.id]);
  const irmaos = todos.filter(f => f.estado === 'vivo' && !eMeu(f) && ((f.p1 === uid && f.g1 === (J.geracao ?? 1) - 1) || (f.p2 === uid && f.g2 === (J.geracao ?? 1) - 1)));
  const herdeiro = meus.find(f => f.id === J.herdeiro);
  // custos da semana: propinas que pagas + ama/creche ativa
  const propinas = outros.filter(f => f.escola !== 'publica' && f.pagador === uid).reduce((s, f) => s + 7 * (D.colegios?.find(c => c.id === f.escola)?.propina || (f.escola === 'internacional' ? 10000 : 2500)), 0);
  const amas = pequenos.filter(f => bebes[f.id]?.ama_ate && new Date(bebes[f.id].ama_ate) > new Date()).length * 4000 * 7;
  const lar = meuLar(), casa = lar?.casa ? casaDe(lar.casa) : null;
  body.innerHTML = `
    ${pares.length ? pares.map(p => { const [e, t] = estadoRomance(p.r); return `<button class="row mine" data-par="${p.id}" style="text-align:left;width:100%;margin-bottom:8px"><span class="e">${e}</span><div class="t"><b data-sem-traducao>${esc(p.nome)}</b><small>${t}</small></div><span style="color:var(--dim)">›</span></button>`; }).join('')
      : `<div class="row"><span class="e">🙂</span><div class="t"><b>${tr('Solteiro/a')}</b><small>${tr('Toca em alguém no jogo → Convidar para sair.')}</small></div></div>`}
    ${aCaminho.map(f => cartaoGravidez(f, itens)).join('')}
    <div class="sub2">${tr('Os teus filhos')}</div>
    ${pequenos.map(f => cartaoBebe(f, bebes[f.id], itens, pares)).join('')}
    ${outros.map(f => `<div data-id="${f.id}">${cartaoFilho(f, true)}</div>`).join('')}
    ${!meus.length ? `<div class="empty">${tr('Ainda não tens filhos.')}</div>` : ''}
    <div class="grelha">
      ${casal ? `<button id="bBebe" class="romance"><span class="e">👶</span><span>${tr('Ter um bebé com')} ${esc(casal.nome)}</span></button>` : ''}
      <button id="bAdotar"><span class="e">🧸</span><span>${tr('Adotar')} · 30.000 Kz</span></button>
      <button id="bArvore"><span class="e">🌳</span><span>${tr('Árvore da família')}</span></button>
    </div>
    <div class="grelha" style="margin-top:8px">
      <div class="row"><div class="t"><small>🏠 ${tr('Casa')}</small><b>${casa ? esc(casa.nome) : tr('Sem casa')}</b></div></div>
      ${casal ? `<div class="row"><div class="t"><small>🏦 ${tr('Conta do casal')}</small><b>${fmtKz(casal.cofre || 0)}</b></div></div>` : ''}
    </div>
    ${propinas || amas ? `<div class="row" style="margin-top:8px"><div class="t"><small>${tr('Custos da família esta semana')}</small><b>${[amas ? `${tr('Ama/creche')} ${fmtKz(amas)}` : '', propinas ? `${tr('Colégio')} ${fmtKz(propinas)}` : ''].filter(Boolean).join(' · ')}</b></div></div>` : ''}
    <div class="sub2">📜 Testamento</div>
    <div class="rel" style="margin-top:0"><p class="m" style="margin:0">Quando morreres, continuas a jogar como <b>${herdeiro ? esc(herdeiro.nome) : meus.length ? 'o/a filho/a mais velho/a' : 'um/a sobrinho/a (sem filhos, o Estado fica com 30%)'}</b>, com a tua casa e o teu kumbu.</p>
      ${casal ? `<label>Parte do kumbu para ${esc(casal.nome)}</label><select class="inp" id="sParte">${[0, 25, 50, 75].map(v => `<option value="${v}" ${(J.parte_conjuge ?? 25) === v ? 'selected' : ''}>${v}%</option>`).join('')}</select>` : ''}
    </div>
    ${irmaos.length ? `<div class="sub2">Irmãos</div><div class="list">${irmaos.map(f => `<div class="row"><span class="e">${faseFilho(idadeDe(f))[0]}</span><div class="t"><b>${esc(f.nome)}</b><small>${idadeDe(f)} ano${idadeDe(f) === 1 ? '' : 's'}</small></div></div>`).join('')}</div>` : ''}`;
  if (typeof ui2Familia === 'function') ui2Familia(body);   // 8 nov: redesenho (teste)
  const volta = () => abrirTelemovel('familia');
  for (const f of outros) { const el = body.querySelector(`[data-id="${f.id}"]`); if (el) ligarFilho(el, f, volta); }
  for (const f of pequenos) {
    const el = body.querySelector(`[data-bebe="${f.id}"]`); if (!el) continue;
    ligarFilho(el, f, volta);
    el.querySelectorAll('[data-cuidar]').forEach(b => b.onclick = async () => { if (await acao('cuidar_bebe', { p_id: f.id, p_acao: b.dataset.cuidar })) volta(); });
    el.querySelector('[data-ama]')?.addEventListener('click', () => {
      const s2 = sheet(`<h3>🤝 ${tr(idadeDe(f) >= 1 ? 'Creche' : 'Ama')} · ${esc(f.nome)}</h3><p class="m">${tr('Enquanto trabalhas, a Tia Rosa cuida do bebé: as necessidades não descem abaixo de 70.')}</p>
        <div class="grelha">${[1, 3, 7].map(d => `<button data-d="${d}"><span class="e">📅</span><span>${d} ${tr(d === 1 ? 'dia' : 'dias')} · ${fmtKz(4000 * d)}</span></button>`).join('')}</div>`);
      s2.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (await acao('contratar_ama', { p_id: f.id, p_dias: +b.dataset.d })) { fecharSheets(); volta(); } });
    });
  }
  body.querySelectorAll('[data-item]').forEach(b => b.onclick = async () => { if (await acao('comprar_item_bebe', { p_item: b.dataset.item })) volta(); });
  body.querySelectorAll('[data-prep]').forEach(b => b.onclick = () => abrirPrepararBebe(meus.find(f => f.id === +b.dataset.prep)));
  body.querySelectorAll('[data-par]').forEach(b => b.onclick = () => abrirRelacao(pares.find(p => p.id === b.dataset.par)));
  body.querySelector('#bArvore').onclick = () => abrirArvore(meus, pares);
  body.querySelector('#bAdotar').onclick = () => pedirNome('Adotar uma criança 🧸', 'Vem uma criança de 0 a 10 anos de um lar em Luanda. Precisas de casa. Se fores casado/a, é filho/a dos dois.', 'Adotar (30.000 Kz)',
    async nome => { if (await acao('adotar', { p_nome: nome })) volta(); });
  body.querySelector('#bBebe')?.addEventListener('click', () => pedirNome(`Ter um bebé com ${esc(casal.nome)}? 👶`, `${esc(casal.nome)} tem de aceitar. O bebé nasce 5 dias depois.`, 'Enviar pedido',
    async nome => { if (await acao('pedir', { p_alvo: casal.id, p_tipo: 'filho', p_grau: nome })) volta(); }));
  body.querySelector('#sParte')?.addEventListener('change', async e => { await acao('testamento', { p_parte: parseInt(e.target.value, 10) }); });
}

// morreste (agora ou enquanto estavas fora): despedida e a vida do/a herdeiro/a
async function aoMudarGeracao() {
  // 8 nov: função com índice próprio (a consulta antiga era a mais pesada da base); se ainda não existir, usa a antiga
  const pdsp = pre('despedida'); let { data, error } = pdsp ? { data: pdsp.v, error: null } : await sb.rpc('minha_ultima_despedida');
  if (error) ({ data } = await sb.from('eventos').select('*').eq('jogador_id', uid).like('texto', '🕊️%').order('criado_em', { ascending: false }).limit(1));
  const ev = data?.[0]; if (!ev || ls.get('vel_obito_' + uid) === ev.id) return;
  ls.set('vel_obito_' + uid, ev.id);
  try { localStorage.removeItem('vel_ap_' + uid); } catch { }
  if (eu) { eu.ap = minhaAparencia(); presencaAgora(true); }
  await carregarCasal(); hud();
  sheet(`<h3>A vida continua 🕊️</h3><p class="m" style="font-size:15px;color:var(--ink)">${esc(ev.texto)}</p>${chipsVida()}
    <button class="btn full" data-fechar>Seguir em frente</button>`);
}

/* ============================================================
   💪 CORPO E MENTE
   ============================================================ */
function humor(j = J) {
  const st = j.stress ?? 20, so = j.solidao ?? 20, fe = j.felicidade ?? 50;
  if (j.doenca) return ['🤒', 'Doente'];
  if ((j.sujidade ?? 0) >= 70) return ['🪰', 'Sujo/a'];   // FILA 0dn-12
  if (st >= 95) return ['🔥', 'Burnout'];
  if (st >= 80) return ['😫', 'Esgotado/a'];
  if (so >= 70) return ['🥀', 'Sozinho/a'];
  if (st >= 60) return ['😰', 'Stressado/a'];
  if (fe >= 70) return ['😄', 'Feliz'];
  if (fe < 30) return ['😞', 'Em baixo'];
  return ['🙂', 'Bem'];
}
function blocoCorpo() {
  if (J.forma == null) return '';
  if (typeof ui2 === 'function' && ui2()) return ui2Corpo();   // 8 nov: redesenho (teste)
  const [e, t] = humor();
  const barra = (nome, v, bom) => { const ok = bom ? v >= 50 : v < 60; return `<div class="lbl" style="margin-top:8px;font-weight:600"><span>${nome}</span><span>${Math.round(v)}</span></div><div class="meter"><u style="left:0;width:${Math.max(0, Math.min(100, v))}%;background:${ok ? 'var(--green)' : v >= 80 && !bom ? 'var(--red)' : 'var(--gold)'}"></u></div>`; };
  const dica = J.stress >= 80 ? 'Precisas de descansar: praia, ginásio, igreja ou uma festa.' : J.solidao >= 70 ? 'Sentes-te sozinho/a. Conversa com alguém ou entra num grupo.' : J.forma < 30 ? 'Estás fora de forma. Vai correr ou ao ginásio.' : '';
  return `<div class="rel"><div class="lbl"><span>${e} ${t}</span></div>
    ${barra('💪 Forma física', J.forma, true)}${barra('😰 Stress', J.stress, false)}${barra('🥀 Solidão', J.solidao, false)}
    ${dica ? `<small style="display:block;color:var(--muted);font-size:12px;margin-top:8px">${dica}</small>` : ''}
    ${meuLar() ? `<button class="btn sm" id="bFesta" style="margin-top:10px">🎉 Dar uma festa em casa · ${fmtKz(15000)}</button>` : ''}
  </div>`;
}
document.addEventListener('click', async e => {
  if (e.target?.id !== 'bFesta') return;
  const r = await acao('dar_festa');
  if (r) { fecharSheets(); if (cena?.tipo === 'casa') festaNaCasa(cena.dono.id); }
});
async function festaNaCasa(donoId) {
  const { data } = await sb.from('festas').select('*').eq('dono', donoId).gt('acaba', new Date().toISOString()).limit(1);
  const f = data?.[0]; if (!f || cena?.tipo !== 'casa' || cena.dono.id !== donoId) return;
  cena.festa = f;
  const min = Math.max(1, Math.round((new Date(f.acaba) - Date.now()) / 60000));
  toast(`🎉 Há festa${f.aniversario ? ' de aniversário 🎂' : ''} nesta casa! Acaba daqui a ${min} min.${f.anfitriao !== uid ? ' Toca no anfitrião → Festejar.' : ''}`, 'bom', 6000);
}

/* ============================================================
   🤝 GRUPOS: igrejas, equipas e associações
   ============================================================ */
const TIPO_GRUPO = { igreja: ['⛪', 'Igreja'], clube: ['⚽', 'Equipa de futebol'], associacao: ['🤝', 'Associação'] };
async function lerGrupos() {
  // 9 nov (registos: 10 pedidos de 1.000 membros por abertura): um só pedido com os grupos, quantos membros e a minha linha
  const rg = await sb.rpc('grupos_resumo');
  if (!rg.error && Array.isArray(rg.data)) return rg.data.map(x => ({ ...x, eu: x.eu || undefined }));
  // 6 nov: 1.214 membros > 1.000 por pedido — lê tudo aos bocados (lerTudo em empresas.js), senão faltavam membros
  const [g, m] = await Promise.all([sb.from('grupos').select('*').order('id'), lerTudo(() => sb.from('membros').select('*').order('grupo_id').order('jogador_id'))]);
  if (g.error) return null;
  const membros = m.data || [];
  return (g.data || []).map(x => ({ ...x, n: membros.filter(y => y.grupo_id === x.id).length, eu: membros.find(y => y.grupo_id === x.id && y.jogador_id === uid) }));
}
function linhaGrupo(g) {
  const [e] = TIPO_GRUPO[g.tipo], aqui = g.bairro === J.bairro;
  const fez = g.eu?.ultima_presenca && Date.now() - new Date(g.eu.ultima_presenca) < 6 * 3600e3;
  const verbo = g.tipo === 'igreja' ? 'Ir ao culto' : g.tipo === 'clube' ? 'Treinar' : 'Ir à reunião';
  return `<div class="row ${g.eu ? 'mine' : ''}"><span class="e">${e}</span><div class="t"><b>${esc(g.nome)}</b><small>📍 ${esc(bairro(g.bairro)?.nome || g.bairro)} · ${g.n} membro${g.n === 1 ? '' : 's'}${g.eu?.papel === 'lider' ? ' · és o/a líder' : ''}</small>${g.descricao ? `<small>${esc(g.descricao)}</small>` : ''}</div>
    ${g.eu ? (aqui ? `<button class="btn sm" data-part="${g.id}" ${fez ? 'disabled' : ''}>${fez ? 'Feito hoje' : verbo}</button>` : `<button class="btn sm ghost" data-sair="${g.id}">Sair</button>`)
      : `<button class="btn sm ghost" data-entrar-g="${g.id}">Juntar-me</button>`}</div>`;
}
function ligarGrupos(el, depois) {
  el.querySelectorAll('[data-part]').forEach(b => b.onclick = async () => { if (await acao('participar', { p_grupo: +b.dataset.part })) depois(); });
  el.querySelectorAll('[data-entrar-g]').forEach(b => b.onclick = async () => { if (await acao('entrar_grupo', { p_grupo: +b.dataset.entrarG, p_entrar: true })) depois(); });
  el.querySelectorAll('[data-sair]').forEach(b => b.onclick = async () => { if (await acao('entrar_grupo', { p_grupo: +b.dataset.sair, p_entrar: false })) depois(); });
}
async function listaGrupos(div, tipo, bairroId, depois) {
  const gs = await lerGrupos();
  if (!div.isConnected) return;
  if (!gs) { div.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor.</div>'; return; }
  const l = gs.filter(g => g.tipo === tipo && g.bairro === bairroId);
  div.innerHTML = l.length ? l.map(linhaGrupo).join('') : `<div class="empty">${tipo === 'igreja' ? 'Ainda nenhum jogador fundou um grupo de fiéis aqui (podes rezar na mesma). Funda o teu em 📱 → Grupos!' : 'Ainda não há nenhum aqui. Funda o teu em 📱 → Grupos!'}</div>`;
  ligarGrupos(div, depois);
}
async function renderGrupos(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const gs = await lerGrupos();
  if (!gs) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const meus = gs.filter(g => g.eu), outros = gs.filter(g => !g.eu);
  const fundou = gs.some(g => g.criado_por === uid);
  if (typeof ui2 === 'function' && ui2()) return ui2Grupos(body, gs, fundou, `<form id="fGrupo"><label>Tipo</label><select class="inp" id="gTipo"><option value="clube">⚽ Equipa de futebol</option><option value="igreja">⛪ Igreja</option><option value="associacao">🤝 Associação</option></select>
      <label>Nome</label><input class="inp" id="gNome" maxlength="40" required placeholder="ex: Kilamba Leões">
      <label>Descrição (opcional)</label><input class="inp" id="gDesc" maxlength="140">
      <small style="display:block;color:var(--dim);font-size:12px;margin-top:6px">Fica sediado em ${esc(bairro(J.bairro)?.nome || '')}, o bairro onde estás agora.</small>
      <button class="btn full" type="submit">Fundar</button></form>`, async el => { if (await acao('criar_grupo', { p_tipo: el.querySelector('#gTipo').value, p_nome: el.querySelector('#gNome').value, p_descricao: el.querySelector('#gDesc').value || null })) { fecharSheets(); abrirTelemovel('grupos'); } });   // 8 nov: redesenho (teste)
  body.innerHTML = `<p class="m">Igrejas, equipas e associações: participar tira stress e solidão, e ficas amigo/a de quem lá estiver. Para participar tens de estar no bairro do grupo.</p>
    <div class="sub2">Os teus grupos</div>
    <div class="list">${meus.length ? meus.map(linhaGrupo).join('') : '<div class="empty">Ainda não estás em nenhum grupo.</div>'}</div>
    <div class="sub2">Todos os grupos</div>
    <div class="list">${outros.map(linhaGrupo).join('') || '<div class="empty">Já estás em todos!</div>'}</div>
    ${fundou ? '' : `<div class="sub2">Fundar um grupo · ${fmtKz(50000)}</div>
    <form id="fGrupo"><label>Tipo</label><select class="inp" id="gTipo"><option value="clube">⚽ Equipa de futebol</option><option value="igreja">⛪ Igreja</option><option value="associacao">🤝 Associação</option></select>
      <label>Nome</label><input class="inp" id="gNome" maxlength="40" required placeholder="ex: Kilamba Leões">
      <label>Descrição (opcional)</label><input class="inp" id="gDesc" maxlength="140">
      <small style="display:block;color:var(--dim);font-size:12px;margin-top:6px">Fica sediado em ${esc(bairro(J.bairro)?.nome || '')}, o bairro onde estás agora.</small>
      <button class="btn full" type="submit">Fundar</button></form>`}`;
  ligarGrupos(body, () => abrirTelemovel('grupos'));
  body.querySelector('#fGrupo')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (await acao('criar_grupo', { p_tipo: body.querySelector('#gTipo').value, p_nome: body.querySelector('#gNome').value, p_descricao: body.querySelector('#gDesc').value || null })) abrirTelemovel('grupos');
  });
}
