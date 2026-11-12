/* ============================================================
   Vida na Banda — 🔍 procurar no telemóvel (dono, 25 out: "spent 20 mins looking for how to invite someone to my house")
   Uma barra no ecrã inicial do telemóvel que encontra: apps, "como fazer" (guias curtos com um botão que leva lá)
   e todos os sítios de todos os bairros (se for aqui, a personagem vai a pé; se não, diz para onde apanhar transporte).
   Procura em português e na língua do jogador (os títulos e textos passam pelo tr()).
   ============================================================ */

// guias: t = título, k = palavras-chave (pt/en/fr, sem acentos), c = como fazer, app = app a abrir, f = ação especial
const GUIAS = [
  { t: 'Convidar alguém para a tua casa', k: 'convidar convite casa visita receber festa invite house home visit guest inviter maison visite', c: 'Toca na pessoa (na rua ou em 📱 Social) → «Convidar para a minha casa». Só dá com amigos, família ou o teu par. A pessoa recebe o convite em 📱 Social e, se aceitar, vai logo lá.', app: 'social' },
  { t: 'Visitar a casa de um amigo', k: 'visitar amigo casa mora onde vive visit friend house lives visiter ami', c: 'Vai ao prédio onde a pessoa mora e toca nele: aparece «🏠 Mora aqui» com o botão Visitar. Também podes tocar na pessoa → «Visitar a casa» (no mesmo bairro) ou pedir-lhe um convite.', app: 'social' },
  { t: 'Fazer amigos', k: 'amigo amigos amizade pedir conhecer friend friends friendship ami amis', c: 'Toca noutro jogador → Conversar, Elogiar, Contar piada… ou «Pedir amizade». Em 📱 Social também podes procurar pelo nome.', app: 'social' },
  { t: 'Arranjar emprego', k: 'emprego trabalho vaga vagas salario job work hire emploi travail', c: 'Abre 📱 Vagas, escolhe um trabalho para o qual tens estudo e reputação e carrega em Aceitar. Depois vai ao sítio e carrega em Trabalhar.', app: 'vagas' },
  { t: 'Ganhar dinheiro', k: 'dinheiro kumbu ganhar rico biscate money earn cash rich argent gagner', c: 'Trabalha no teu emprego, faz biscates nos edifícios que os têm, vende na zunga, ou abre um negócio em 📱 Empresas que fatura mesmo quando não jogas.', app: 'vagas' },
  { t: 'Arrendar ou comprar casa', k: 'casa arrendar comprar renda morar apartamento vivenda house rent buy apartment home maison louer acheter', c: 'Abre 📱 Imóveis para ver casas à venda e para arrendar, ou toca num prédio de casas na rua. A renda paga-se sozinha todos os dias.', app: 'imoveis' },
  { t: 'Decorar a casa', k: 'decorar moveis mobilia sofa cama por arrumar furniture decorate decorer meubles', c: 'Vai para casa (botão 🏠 Casa) e carrega em 🔨 Decorar. Os móveis que compras ficam no armazém até os pores.', f: 'casa' },
  { t: 'Comprar móveis', k: 'comprar moveis loja mobilia shop furniture buy acheter meubles boutique', c: 'Abre 📱 Loja (entrega em casa) ou vai aos Móveis do Mercado, em Viana (mais barato). Os móveis de luxo estão no Casa & Design, em Talatona.', app: 'loja' },
  { t: 'Mudar o visual', k: 'visual cabelo roupa aparencia cor pele look hair clothes outfit apparence cheveux vetements', c: 'Em 📱 Perfil → «Mudar o visual»: cabelo, roupa e cores.', f: 'visual' },
  { t: 'Mudar a língua', k: 'lingua idioma portugues ingles frances language english french langue anglais', c: 'Em 📱 Perfil → Idioma.', app: 'eu' },
  { t: 'Enviar kumbu a alguém', k: 'enviar transferir dinheiro kumbu pagar send transfer money pay envoyer argent', c: 'Abre 📱 Transferir, escreve o nome da pessoa e o valor.', app: 'kumbu' },
  { t: 'Mensagens privadas', k: 'mensagem mensagens conversa chat privado dm message messages conversation', c: 'Abre 📱 Mensagens, ou toca na pessoa → Mensagem.', app: 'mensagens' },
  { t: 'Namorar', k: 'namorar namoro paquera encontro sair romance date dating girlfriend boyfriend sortir amour', c: 'Toca na pessoa → Namoriscar ou «Convidar para sair»; quando se derem bem, «Pedir em namoro». (Só para quem confirmou ter 18+.)', app: 'social' },
  { t: 'Casar', k: 'casar casamento alambamento noivo marry marriage wedding mariage epouser', c: 'Quando já namoram, toca no teu par → «Pedir em casamento». Quem pede paga o alambamento de 100.000 Kz.', app: 'social' },
  { t: 'Ter um bebé ou adotar', k: 'bebe filho filha adotar gravida familia baby child kid adopt pregnant bebe enfant adopter', c: 'Casais: toca no teu par → «Ter um bebé». Qualquer pessoa com casa pode adotar em 📱 Família.', app: 'familia' },
  { t: 'Viajar para outro bairro', k: 'viajar bairro paragem candongueiro taxi mota transporte ir travel bus taxi go trip voyager quartier', c: 'Vai à paragem de candongueiros do teu bairro e escolhe o destino. Se tens carro, toca nele à porta de casa → Viajar.', f: 'paragem' },
  { t: 'Comer', k: 'comer fome comida barriga cantina restaurante food eat hunger restaurant manger faim', c: 'Toca numa cantina, bar ou restaurante e escolhe a comida. Com a barriga vazia perdes energia e saúde.' },
  { t: 'Dormir e recuperar energia', k: 'dormir energia cansado descansar cama sleep energy tired rest dormir fatigue', c: 'Em casa, toca na cama para dormir. Longe de casa, carrega em 🏠 Casa → «Dormir aqui» (pensão por 2.500 Kz, ou um banco da paragem se não tiveres dinheiro).', f: 'casa' },
  { t: 'Dormir fora (pensão ou hotel)', k: 'hotel pensao hostel dormir fora quarto noite longe guesthouse inn room night sleep away auberge chambre nuit', c: 'Longe de casa, carrega em 🏠 Casa → «Dormir aqui»: uma pensão por 2.500 Kz a noite; sem dinheiro, dormes num banco da paragem.', f: 'casa' },
  { t: 'Voltar para casa', k: 'voltar casa preso longe outra cidade ir para casa boleia home go home back stuck rentrer maison coince', c: 'Carrega em 🏠 Casa: se a casa ficar noutra cidade, aparece o caminho para lá (mesmo cansado/a) e, sem dinheiro, a boleia grátis.', f: 'casa' },
  { t: 'Apanhar um avião', k: 'aviao voo voar aeroporto plane flight fly airport avion vol aeroport', c: 'Vai ao aeroporto (em Luanda, na Maianga) e escolhe o destino. Também há aeroportos em Benguela, Huambo, Lubango, Namibe, Malanje e Cabinda.' },
  { t: 'Ir à praia', k: 'praia mar nadar areia ilha mussulo beach sea swim sand plage mer nager', c: 'Vai à Ilha de Luanda (praia e Jet Ski) ou apanha o barco no Cais da Ilha para o Mussulo. Com tempestade os barcos não saem.' },
  { t: 'Rezar ou ir ao culto', k: 'igreja rezar culto missa orar fe pray church service mass prier eglise messe', c: 'Toca numa igreja (Igreja do Bairro, Sé Catedral…) → «Rezar». Tira stress e solidão, uma vez a cada 6 horas.' },
  { t: 'Estudar', k: 'estudar estudo universidade curso escola study university school etudier universite', c: 'Abre 📱 Universidade ou vai a uma universidade (ISPTEC, UAN…). Mais estudo abre empregos melhores.', app: 'universidade' },
  { t: 'Guardar dinheiro no banco', k: 'banco poupar deposito juros guardar bank save savings deposit banque epargne', c: 'Abre 📱 Banco para depositar (os ladrões não roubam o que está no banco) e ver os juros.', app: 'banco' },
  { t: 'Comprar um carro', k: 'carro comprar stand automovel mota jipe car buy vehicle voiture acheter', c: 'Vai ao Stand Automóvel em Talatona. Na tua casa, toca no carro → Viajar.' },
  { t: 'Contratar empregados', k: 'empregada cozinheiro motorista seguranca empregados staff maid cook driver employes', c: 'Abre 📱 Empregados (precisas de casa). O salário paga-se sozinho todos os dias.', app: 'empregados' },
  { t: 'Abrir um negócio', k: 'negocio empresa abrir cantina loja investir business company shop entreprise', c: 'Abre 📱 Empresas e escolhe o negócio. Fatura todos os dias, mesmo quando não jogas.', app: 'empresas' },
  { t: 'Assaltar alguém', k: 'assaltar roubar crime ladrao rob steal crime voler', c: 'Toca num jogador → Assaltar (só em certos bairros; os novatos estão protegidos 3 dias). É arriscado: podes ir preso/a e ficar com cadastro.' },
  { t: 'Sair da cadeia', k: 'cadeia preso fianca policia advogado jail prison bail police prison', c: 'Cumpre a pena ou paga a fiança na Secretaria da cadeia. Vê em 📱 Justiça.', app: 'justica' },
  { t: 'Anunciar num outdoor', k: 'anunciar outdoor publicidade anuncio marca advertise billboard ad publicite', c: 'Toca num outdoor na rua para ver como anunciar.' },
  { t: 'Ganhar Ouro', k: 'ouro moedas premium gold coins or', c: 'Abre 📱 Ouro para ver os pacotes e os extras exclusivos.', app: 'ouro' },
  { t: 'Andar de jet ski', k: 'jet ski jetski mota de agua baia ilha mar corrida jogo tubarao recorde water race game sea requin course', c: 'Vai à Ilha de Luanda e toca no «Jet Ski da Baía». Cada corrida custa 500 Kz; cada moeda vale 10 Kz e um novo recorde pessoal dá 1 Ouro (até 3 por dia).' },
  { t: 'Ouvir música', k: 'musica radio ouvir cancao music radio song musique', c: 'Abre 📱 Rádio.', app: 'radio' },
  { t: 'Ajuda: como se joga', k: 'ajuda ajudar comecar como jogar tutorial help how play aide', c: 'Abre 📱 Ajuda para um resumo de tudo o que se pode fazer.', app: 'ajuda' },
];

const semAcento = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function indiceProcura() {
  if (indiceProcura._c) return indiceProcura._c;
  const r = [];
  for (const a of APPS) if (!a.admin || J?.admin) r.push({ tipo: 'app', ic: a.ic, t: a.n, k: a.id, app: a.id });
  for (const g of GUIAS) r.push({ tipo: 'guia', ic: 'ajuda', ...g });
  for (const [bid, b] of Object.entries(BAIRROS_MAPA)) for (const l of b.lotes || []) if (l.nome) r.push({ tipo: 'lugar', ic: 'ponto', emoji: l.emoji, t: l.nome, k: (l.acao || []).map(a => a.t + ' ' + (a.id || '')).join(' '), bairro: bid });
  return (indiceProcura._c = r);
}
function procurarNoJogo(q) {
  const termos = semAcento(q).split(/\s+/).filter(x => x.length > 1);
  if (!termos.length) return [];
  const pontos = [];
  for (const e of indiceProcura()) {
    const titulo = semAcento(e.t) + ' ' + semAcento(tr(e.t)), resto = semAcento(e.k) + ' ' + (e.c ? semAcento(tr(e.c)) : '') + ' ' + (e.bairro ? semAcento(bairro(e.bairro)?.nome) : '');
    let p = 0;
    for (const t of termos) { if (titulo.includes(t)) p += 3; else if (resto.includes(t)) p += 1; else { p = -1; break; } }
    if (p > 0) pontos.push([p + (e.tipo === 'guia' ? 0.5 : 0) + (e.bairro === J?.bairro ? 0.3 : 0), e]);
  }
  return pontos.sort((a, b) => b[0] - a[0]).slice(0, 14).map(x => x[1]);
}
function linhaProcura(e, i) {
  const sub = e.tipo === 'app' ? tr('App') : e.tipo === 'guia' ? tr('Como fazer') : `📍 ${bairro(e.bairro)?.nome || ''}${e.bairro === J?.bairro ? ' · ' + tr('aqui') : ''}`;
  return `<button class="row" data-res="${i}" style="text-align:left;width:100%"><span class="e">${e.emoji ? e.emoji : icone(e.ic || 'ponto', 20)}</span><div class="t"><b>${esc(e.t)}</b><small>${esc(sub)}</small></div></button>`;
}
function abrirResultado(e) {
  if (e.tipo === 'app') return abrirTelemovel(e.app);
  if (e.tipo === 'lugar') {
    if (e.bairro !== J.bairro || cena?.tipo !== 'bairro') {
      const el = sheet(`<h3>📍 ${esc(e.t)}</h3><p class="m">Fica em ${esc(bairro(e.bairro)?.nome || e.bairro)}. Apanha um candongueiro na paragem do teu bairro (ou vai de carro).</p><button class="btn full" data-ir-paragem>Ir à paragem</button>`);
      el.querySelector('[data-ir-paragem]').onclick = () => { fecharSheets(); irParaParagem(); };
      return;
    }
    const o = cena.objetos.find(x => x.spec?.nome === e.t);
    fecharTelemovel(); if (o) andarAte(o);
    return;
  }
  // guia: o "como fazer" e um botão que leva lá
  const botao = e.app ? `<button class="btn full" data-abrir="${e.app}">${tr('Abrir')} ${esc(tr(APPS.find(a => a.id === e.app)?.n || e.app))}</button>`
    : e.f === 'visual' ? `<button class="btn full" data-f="visual">${tr('Mudar o visual')}</button>`
    : e.f === 'casa' ? `<button class="btn full" data-f="casa">${tr('Ir para casa')}</button>`
    : e.f === 'paragem' ? `<button class="btn full" data-f="paragem">${tr('Ir à paragem')}</button>` : '';
  const el = sheet(`<h3>${esc(e.t)}</h3><p class="m">${esc(e.c)}</p>${botao}`);
  el.querySelector('[data-abrir]')?.addEventListener('click', ev => abrirTelemovel(ev.currentTarget.dataset.abrir));
  el.querySelector('[data-f]')?.addEventListener('click', ev => {
    const f = ev.currentTarget.dataset.f; fecharSheets();
    if (f === 'visual') { abrirTelemovel('eu'); setTimeout(() => typeof abrirVisual === 'function' && abrirVisual(), 50); }
    if (f === 'casa') { fecharTelemovel(); $('#bCasa')?.click(); }
    if (f === 'paragem') irParaParagem();
  });
}
function andarAte(o) {
  const alvo = o.porta && !cena.bloq[o.porta[1] * cena.W + o.porta[0]] ? o.porta : (typeof adjacenteLivre === 'function' ? adjacenteLivre(o) : null);
  if (alvo) andarPara(eu, alvo[0], alvo[1], () => tocarObjeto(o)); else tocarObjeto(o);
  cam.seguir = true;
}
function irParaParagem() {
  fecharTelemovel();
  if (cena?.tipo !== 'bairro') return toast(tr('Sai de casa e vai à paragem de candongueiros do teu bairro.'), 'info');
  const o = cena.objetos.find(x => x.kind === 'paragem'); if (o) andarAte(o);
}
// a barra no ecrã inicial do telemóvel
function ligarProcuraTel(ecra) {
  const inp = ecra.querySelector('#telBusca'), res = ecra.querySelector('#telRes'), grade = ecra.querySelectorAll('.grade, .widget.hoje');
  if (!inp) return;
  let atual = [];
  const mostrar = () => {
    const q = inp.value.trim();
    grade.forEach(g => g.classList.toggle('hide', !!q));
    if (!q) { res.innerHTML = ''; return; }
    atual = procurarNoJogo(q);
    res.innerHTML = atual.length ? `<div class="list">${atual.map(linhaProcura).join('')}</div>` : `<div class="empty">${esc(tr('Nada encontrado. Experimenta outras palavras (ex.: casa, emprego, viajar).'))}</div>`;
    res.querySelectorAll('[data-res]').forEach(b => b.onclick = () => abrirResultado(atual[+b.dataset.res]));
  };
  inp.addEventListener('input', mostrar);
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter' && atual[0]) abrirResultado(atual[0]); });
}
