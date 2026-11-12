/* ============================================================
   Vida na Banda — interiores dos edifícios
   Entra-se em restaurantes, ginásios, discotecas, bancos, lojas,
   clínicas, escritórios, universidades, igrejas… e faz-se tudo
   lá dentro, nos balcões e "estações" de cada sítio.
   Vista isométrica (igual às casas) e roda 90° como o resto.
   ============================================================ */

// ações dos edifícios que se fazem lá dentro (os outros abrem o painel normal)
const TIPOS_DENTRO = ['comida', 'lazer', 'emprego', 'treino', 'saude', 'banco', 'univ', 'itens', 'moveis', 'policia', 'governo', 'grupos', 'aeroporto', 'crime', 'biscato', 'info', 'moda_loja'];

function categoriaInterior(spec) {
  const ts = (spec.acao || []).map(a => a.t), id = a => (spec.acao || []).find(x => x.t === a);
  if (ts.includes('casa') || ts.includes('paragem') || ts.includes('outdoor') || ts.includes('barco') || ts.includes('estacao') || ts.includes('lavras') || ts.includes('cadeia') || ts.includes('kart')) return null;
  if (!ts.some(t => TIPOS_DENTRO.includes(t))) return null;
  // sítios ao ar livre: ficam com o painel normal
  if (/^(Campo|Beco|Mercado|Praia|Feira|Quintal|Obra|Cemitério)/.test(spec.nome || '')) return null;
  const FORA_LAZER = ['bola', 'praia', 'mussulo', 'jetski', 'kalandula', 'serra_leba', 'tundavala', 'passeio', 'pesca'];
  const FORA_EMPREGO = ['lavador', 'pescador', 'kupapata', 'cobrador', 'zungueira', 'pedreiro'];
  const util = (spec.acao || []).filter(a => !(a.t === 'lazer' && FORA_LAZER.includes(a.id)) && !(a.t === 'emprego' && FORA_EMPREGO.includes(a.id)) && a.t !== 'biscato' && a.t !== 'info');
  if (!util.some(a => TIPOS_DENTRO.includes(a.t)) && !/Hospital|Clínica/.test(spec.nome || '')) return null;
  if (ts.includes('treino') && id('treino').onde === 'ginasio') return 'ginasio';
  if (ts.includes('treino')) return null;                     // correr: é lá fora
  if (ts.includes('lazer') && ['kizomba', 'discoteca'].includes(id('lazer').id)) return 'discoteca';
  if (ts.includes('univ')) return 'aula';
  if (ts.includes('saude')) return 'clinica';
  if (ts.includes('banco')) return 'banco';
  if (ts.includes('grupos') && id('grupos').tipo === 'igreja') return 'igreja';
  if (ts.includes('policia') || ts.includes('governo')) return 'reparticao';
  if (ts.includes('aeroporto')) return 'terminal';
  if (ts.includes('itens') || ts.includes('moveis') || (ts.includes('moda_loja') && !ts.includes('lazer'))) return 'loja';
  if (ts.includes('comida')) return 'restaurante';
  if (ts.includes('emprego')) return 'escritorio';
  if (ts.includes('lazer')) return 'lazer';
  return 'recepcao';
}

const ESTILO_INTERIOR = {
  restaurante: { chao: 'tijoleira', parede: '#f3d36b', nome: 'Sala de refeições' },
  discoteca: { chao: 'xadrez', parede: '#2a1f3a', nome: 'Pista' },
  ginasio: { chao: 'cimento', parede: '#e9eef2', nome: 'Treino' },
  clinica: { chao: 'mosaico', parede: '#e9f4f7', nome: 'Receção' },
  banco: { chao: 'mosaico', parede: '#d9e6ef', nome: 'Balcões' },
  loja: { chao: 'mosaico', parede: '#f5f1e8', nome: 'Loja' },
  escritorio: { chao: 'alcatifa', parede: '#e6e2da', nome: 'Escritório' },
  aula: { chao: 'madeira', parede: '#f2ead8', nome: 'Sala de aula' },
  igreja: { chao: 'madeira', parede: '#f5f1e8', nome: 'Nave' },
  reparticao: { chao: 'mosaico', parede: '#dde3c8', nome: 'Atendimento' },
  terminal: { chao: 'mosaico', parede: '#e9eef2', nome: 'Terminal' },
  lazer: { chao: 'madeira', parede: '#f0b27a', nome: 'Sala de jogos' },
  recepcao: { chao: 'mosaico', parede: '#e9dcc4', nome: 'Receção' },
};

const MODA_INTERIOR = {
  popular: { chaos: ['cimento', 'tijoleira'], paredes: ['#e8d5b7', '#d9e4c8', '#f0d0b0', '#cfe0e8', '#ead2d2', '#f2e3a0'], arara: '#8a5a32', roupas: ['#2a62c9', '#cc092f', '#2f8f5b', '#f5b81c', '#f07c2a', '#f4f4f2'] },
  media: { chaos: ['madeira', 'mosaico', 'tijoleira'], paredes: ['#f3e6d8', '#e8dff0', '#dceee9', '#f6e1d3', '#e9e4d4', '#f4dbe4'], arara: '#c8a27a', roupas: ['#ff6f61', '#1fb5a8', '#b79ad8', '#7a1f3d', '#22305a', '#e98bb0'] },
  rica: { chaos: ['xadrez', 'alcatifa', 'mosaico'], paredes: ['#1f1f1f', '#2a1f3a', '#0f2a24', '#2b2118'], arara: '#d4af37', roupas: ['#d4af37', '#c7ccd4', '#0f7a5a', '#1f3fa8', '#9b111e', '#f6f0e1'] },
};

// móvel "de cenário" (não é de ninguém): tipo usa o desenho do motor; id pode ter desenho próprio (ARTE_MOVEIS)
let _idMovelInt = 0;
function mvInt(id, tipo, w, d, cor, nome, emoji) { return { id, tipo, w, d, cor, nome, emoji: emoji || '', preco: 0 }; }

function gerarInterior(o) {
  const cat = categoriaInterior(o.spec); if (!cat) return null;
  const est = ESTILO_INTERIOR[cat];
  const W = Math.max(10, Math.min(14, o.w * 2 + 4)), H = Math.max(9, Math.min(12, o.d * 2 + 4));
  const bloq = new Uint8Array(W * H), objetos = [], staff = [], clientes = [];
  const todas = (o.spec.acao || []).map(a => a.t).filter(t => TIPOS_DENTRO.includes(t));
  const livre = (x, y, w, d) => { for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) if (i < 0 || j < 0 || i >= W || j >= H || bloq[j * W + i]) return false; return true; };
  // põe um móvel; estacao = ações que se fazem ali (null = só cenário)
  const pon = (mv, x, y, rot, estacao, rotulo) => {
    const w = rot % 2 ? mv.d : mv.w, d = rot % 2 ? mv.w : mv.d;
    if (!livre(x, y, w, d)) return null;
    const ob = { kind: 'movel', x, y, w, d, h: alturaMovel(mv.tipo), mv, mb: { id: 'i' + (++_idMovelInt), rot, x, y }, pisavel: mv.pisavel, estacao, rotulo };
    objetos.push(ob);
    if (!mv.pisavel) for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) bloq[j * W + i] = 1;
    return ob;
  };
  const porta = [W - 2, 0];
  bloq[1 * W + (W - 2)] = 0;                                     // corredor da entrada fica livre
  const reservar = (x, y) => { bloq[y * W + x] = 2; };
  reservar(W - 2, 0); reservar(W - 2, 1); reservar(W - 2, 2);   // dono 4 nov: a coluna da discoteca da Ilha ficava em cima da porta e não se saía
  const soltar = () => { for (let i = 0; i < bloq.length; i++) if (bloq[i] === 2) bloq[i] = 0; };
  const r = rng((o.x * 31 + o.y * 17 + W) >>> 0);
  let estiloModa = null;

  const balcao = (x, y, len, rot, est2, rot2) => pon(mvInt('int_balcao', 'balcao', len, 1, '#8a5a32', 'Balcão', '🛎️'), x, y, rot || 0, est2 || todas, rot2 || 'Balcão');
  const planta = (x, y) => pon(mvInt('planta', 'planta', 1, 1, '#2f8f5b', 'Planta'), x, y, 0, null);
  const staffEm = (x, y, ap, nome, falas) => staff.push({ x, y, ap, nome, falas });

  if (cat === 'restaurante') {
    balcao(1, 2, 4, 0, todas, 'Balcão — pedir comida');
    pon(mvInt('fogao', 'fogao', 1, 1, '#ececec', 'Fogão'), 1, 0, 0, null); pon(mvInt('fogao', 'fogao', 1, 1, '#ececec', 'Fogão'), 2, 0, 0, null);
    pon(mvInt('frigorifico', 'frigorifico', 1, 1, '#f2f2f2', 'Geleira'), 4, 0, 0, null);
    // 0r (play-test): a «Tia da cantina» só nas cantinas/tascas; nos restaurantes e bares é o empregado de mesa
    if (/cantina|tasca|quitanda|roulotte/i.test(o.spec.nome || ''))
      staffEm(2.5, 1.5, { pele: 3, cabelo: 3, corCabelo: 0, camisa: '#f5f5f5', calca: '#333' }, 'Tia da cantina', ['O que vai ser hoje?', 'Hoje o calulu está divinal!', 'Pão com chouriço acabadinho de fazer.']);
    else staffEm(2.5, 1.5, { pele: 5, cabelo: 1, corCabelo: 0, camisa: '#1d1d1d', calca: '#1d1d1d' }, 'Empregado de mesa', ['Bem-vindo! Mesa para quantos?', 'O prato do dia é muamba de galinha.', 'Já vos trago a carta.']);
    for (let ty = 5; ty < H - 1; ty += 3) for (let tx = 1; tx < W - 3; tx += 3) {
      if (!pon(mvInt('int_mesa_rest', 'mesa', 1, 1, '#c8a27a', 'Mesa'), tx + 1, ty, 0, todas, 'Mesa — comer aqui')) continue;
      // 0cy (4): as cadeiras viradas para a mesa (antes ficavam de lado — «the chair is backwards»)
      pon(mvInt('cadeira', 'cadeira', 1, 1, '#8a5a32', 'Cadeira'), tx, ty, 1, null); pon(mvInt('cadeira', 'cadeira', 1, 1, '#8a5a32', 'Cadeira'), tx + 2, ty, 3, null);
      if (r() < 0.5) clientes.push([tx + 1, ty + 1]);
    }
    planta(0, H - 1); planta(W - 1, H - 1);
  } else if (cat === 'discoteca' || cat === 'lazer') {
    const pista = pon(mvInt('int_pista', 'tapete', 4, 4, '#7a1fd0', 'Pista de dança'), Math.floor(W / 2) - 2, Math.floor(H / 2) - 1, 0, ['lazer'], 'Pista — dançar');
    if (pista) pista.pisavel = true, pista.mv.pisavel = true;
    pon(mvInt('int_dj', 'mesa', 3, 1, '#1e1e24', 'Cabine do DJ'), Math.floor(W / 2) - 1, 0, 0, ['lazer', 'emprego'], 'DJ — pedir uma música');
    pon(mvInt('som_kuduro', 'som', 1, 1, '#141012', 'Coluna'), Math.floor(W / 2) - 2, 0, 0, null); pon(mvInt('som_kuduro', 'som', 1, 1, '#141012', 'Coluna'), Math.floor(W / 2) + 2, 0, 0, null);
    balcao(0, H - 4, 3, 1, todas, 'Bar — bebidas');
    staffEm(Math.floor(W / 2) + 0.5, 1.5, { pele: 4, cabelo: 0, corCabelo: 0, camisa: '#cc092f', calca: '#141012' }, 'DJ', ['Toca a mexer!', 'Próxima é um kuduro!', 'Pede a tua música!']);
    staffEm(1.5, H - 2.5, { pele: 2, cabelo: 2, corCabelo: 0, camisa: '#141012', calca: '#141012' }, 'Barman', ['Uma Cuca bem gelada?', 'O que vai beber?']);
    for (let k = 0; k < 4; k++) clientes.push([Math.floor(W / 2) - 1 + (k % 2) * 2, Math.floor(H / 2) + Math.floor(k / 2)]);
    pon(mvInt('sofa', 'sofa', 2, 1, '#7a1fd0', 'Sofá'), W - 3, H - 1, 0, null);
  } else if (cat === 'ginasio') {
    for (let k = 0; k < Math.min(4, W - 4); k++) pon(mvInt('int_passadeira', 'passadeira', 1, 2, '#333', 'Passadeira'), 1 + k * 2, 0, 0, ['treino'], 'Passadeira — correr');
    pon(mvInt('int_halteres', 'halteres', 2, 1, '#555', 'Pesos'), 1, H - 2, 0, ['treino'], 'Pesos — treinar');
    pon(mvInt('int_halteres', 'halteres', 2, 1, '#555', 'Pesos'), 4, H - 2, 0, ['treino'], 'Pesos — treinar');
    pon(mvInt('tapete_azul', 'tapete', 3, 2, '#2c6fb0', 'Tapete de alongamentos'), W - 5, H - 4, 0, null);
    balcao(W - 4, 4, 2, 1, todas, 'Receção do ginásio');
    staffEm(W - 2.5, 5.5, { pele: 5, cabelo: 0, corCabelo: 0, camisa: '#e0313f', calca: '#141012' }, 'Personal trainer', ['Mais uma série!', 'Sem dor, sem ganho.', 'Bebe água, campeão!']);
    clientes.push([2, 3], [5, 3]);
  } else if (cat === 'clinica') {
    balcao(1, 2, 3, 0, todas, 'Receção — ser atendido/a');
    staffEm(2.5, 1.5, { pele: 2, cabelo: 3, corCabelo: 0, camisa: '#f5f5f5', calca: '#f5f5f5' }, 'Enfermeira', ['O doutor já o atende.', 'Tem o cartão de saúde?', 'Sente-se, por favor.']);
    for (let k = 0; k < 3; k++) pon(mvInt('cama_simples', 'cama', 1, 2, '#bfe3f2', 'Cama'), W - 2 - k * 2, H - 3, 0, ['saude'], 'Cama — tratamento');
    for (let k = 0; k < 4; k++) pon(mvInt('cadeira', 'cadeira', 1, 1, '#2c6fb0', 'Cadeira'), 1 + k, 5, 0, null);
    clientes.push([2, 6]);
  } else if (cat === 'banco') {
    for (let k = 0; k < 2; k++) { balcao(1 + k * 4, 2, 3, 0, ['banco'], 'Balcão — poupança e empréstimos'); staffEm(2.5 + k * 4, 1.5, { pele: 1 + k * 2, cabelo: k ? 3 : 1, corCabelo: 0, camisa: '#2a3b55', calca: '#2a3b55' }, 'Bancário/a', ['Bom dia, em que posso ajudar?', 'Tem o BI consigo?']); }
    pon(mvInt('int_multibanco', 'multibanco', 1, 1, '#cc092f', 'Multicaixa'), W - 1, 4, 0, ['banco'], 'Multicaixa');
    pon(mvInt('int_multibanco', 'multibanco', 1, 1, '#cc092f', 'Multicaixa'), W - 1, 5, 0, ['banco'], 'Multicaixa');
    for (let k = 0; k < 3; k++) pon(mvInt('poltrona', 'sofa', 1, 1, '#2a3b55', 'Cadeira'), 1 + k, H - 2, 0, null);
    clientes.push([3, 5], [4, 6]);
  } else if (cat === 'loja') {
    // 0g-B: cada loja mostra o que vende — carros no stand, roupa na boutique, móveis em exposição; a caixa fica logo à entrada
    const cats = (o.spec.acao || []).flatMap(a => a.t === 'itens' ? (a.cats || []) : a.t === 'moveis' ? ['moveis'] : a.t === 'moda_loja' && !(o.spec.acao || []).some(x => x.t === 'lazer') ? ['moda'] : []);
    const caixa = balcao(W - 6, 3, 3, 0, todas, 'Caixa — ver e comprar');
    const vend = cats.includes('veiculo') ? 'Vendedor/a' : 'Caixa';
    staffEm(W - 4.5, 2.5, { pele: 3, cabelo: 4, corCabelo: 0, camisa: cats.includes('veiculo') ? '#2a3b55' : '#16a3a3', calca: '#2a3b55' }, vend,
      cats.includes('veiculo') ? ['Este aqui é uma máquina!', 'Quer ver a ficha técnica?', 'Pagamento a pronto, sem fiado.'] : cats.includes('moda') ? ['Esse fica-lhe a matar!', 'Chegou coleção nova.', 'Temos o seu tamanho.'] : cats.includes('moveis') ? ['Pode sentar-se, é para experimentar.', 'Entregamos em casa!', 'Este sofá é o mais vendido.'] : ['Encontrou tudo?', 'Temos promoções hoje!']);
    if (cats.includes('veiculo')) {
      const cores = ['#cc092f', '#141012', '#f4f2ee', '#2c6fb0', '#f5b81c', '#7a7f87'];
      let k = 0;
      // 7 nov 19:35 (dono): cada carro em exposição é um carro do Stand — tocar nele abre o estúdio com esse carro (no teste)
      const doStand = typeof CARROS_POSE !== 'undefined' ? (D.itens || []).filter(i => CARROS_POSE.includes(i.id) && i.onde === 'stand').sort((a, z) => a.preco - z.preco) : [];
      for (let y = 5; y < H - 2; y += 4) for (let x = 1; x < W - 3; x += 4) { const ob = pon(mvInt('int_carro_expo', 'expositor', 2, 3, cores[k++ % cores.length], 'Carro em exposição'), x, y, k % 2 ? 1 : 0, todas, 'Carro em exposição — ver carros'); if (ob && doStand.length) ob.carro = doStand[(k - 1) % doStand.length].id; }
      pon(mvInt('int_secretaria', 'mesa', 2, 1, '#e6e2da', 'Secretária'), 1, 1, 0, todas, 'Vendedor — ver carros');
      planta(0, 0); clientes.push([4, 4]);
    } else if (cats.includes('moda')) {
      // 7 nov (dono): «the background differs per city» — cada loja de roupa tem o seu chão, as suas paredes e as cores da sua roupa
      const nivel = typeof MODA_NIVEL === 'function' ? MODA_NIVEL(J.bairro) : 'media', est3 = MODA_INTERIOR[nivel];
      const hb = [...(J.bairro || '')].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
      estiloModa = { chao: est3.chaos[hb % est3.chaos.length], parede: est3.paredes[(hb >>> 3) % est3.paredes.length] };
      const roupas = est3.roupas.map((_, i, a) => a[(i + hb) % a.length]);
      for (let x = 0; x < W - 7; x += 3) pon(mvInt('int_arara', 'expositor', 3, 1, est3.arara, 'Arara'), x, 0, 0, todas, 'Arara — ver roupa');
      for (let y = 5, k = 0; y < H - 1; y += 3) for (let x = 1; x < W - 2; x += 3, k++) if (!pon(mvInt('int_manequim', 'expositor', 1, 1, roupas[k % roupas.length], 'Manequim'), x, y, 0, todas, 'Manequim — ver roupa')) continue; else if (k % 2) pon(mvInt('int_arara', 'expositor', 2, 1, '#2c6fb0', 'Arara'), x + 1, y, 0, todas, 'Arara — ver roupa');
      pon(mvInt('quadro', 'quadro', 1, 1, '#d4af37', 'Espelho'), W - 1, H - 2, 0, null);
      clientes.push([4, 4], [7, 7]);
    } else if (cats.includes('moveis')) {
      const montra = [['sofa', 'sofa', 3, 1, '#7a1fd0', 'Sofá'], ['cama', 'cama', 2, 2, '#2c6fb0', 'Cama'], ['mesa', 'mesa', 2, 1, '#8a5a32', 'Mesa'], ['tv', 'tv', 2, 1, '#141012', 'TV'], ['candeeiro', 'candeeiro', 1, 1, '#f5b81c', 'Candeeiro'], ['estante', 'estante', 2, 1, '#8a5a32', 'Estante'], ['frigorifico', 'frigorifico', 1, 1, '#f2f2f2', 'Geleira'], ['planta', 'planta', 1, 1, '#2f8f5b', 'Planta']];
      let k = 0;
      for (let y = 5; y < H - 1; y += 3) for (let x = 1; x < W - 2; x += 4) { const [id, t, w, d, c, n] = montra[k++ % montra.length]; pon(mvInt(id, t, w, d, c, n), x, y, 0, todas, 'Em exposição — ver móveis'); }
      for (let x = 0; x < W - 7; x += 2) pon(mvInt('estante', 'estante', 2, 1, '#c8a27a', 'Estante'), x, 0, 0, todas, 'Estante — ver móveis');
      clientes.push([3, 4], [7, 7]);
    } else {
      for (let k = 0; k < W - 7; k += 2) pon(mvInt('int_prateleira', 'estante', 2, 1, '#f5f1e8', 'Prateleira'), k, 0, 0, todas, 'Prateleira — ver produtos');
      for (let y = 5; y < H - 1; y += 3) pon(mvInt('int_prateleira', 'estante', 3, 1, '#f5f1e8', 'Prateleira'), 2, y, 0, todas, 'Prateleira — ver produtos');
      clientes.push([6, 4], [6, 7]);
    }
    if (!caixa) balcao(W - 4, H - 3, 3, 0, todas, 'Caixa — ver e comprar');
  } else if (cat === 'aula') {
    pon(mvInt('int_quadro', 'quadro', 4, 1, '#1d3c2e', 'Quadro'), Math.floor(W / 2) - 2, 0, 0, ['univ'], 'Quadro — estudar');
    pon(mvInt('mesa', 'mesa', 2, 1, '#8a5a32', 'Secretária do professor'), Math.floor(W / 2) - 1, 2, 0, ['univ'], 'Professor — matrícula');
    staffEm(Math.floor(W / 2) + 1.5, 1.5, { pele: 4, cabelo: 0, corCabelo: 5, camisa: '#2a3b55', calca: '#2a3b55' }, 'Professor/a', ['Abram o caderno.', 'Matéria nova hoje!', 'Quem fez o trabalho?']);
    for (let y = 5; y < H - 1; y += 2) for (let x = 1; x < W - 3; x += 3) { pon(mvInt('mesa', 'mesa', 1, 1, '#c8a27a', 'Carteira'), x, y, 0, ['univ'], 'Carteira — estudar'); pon(mvInt('cadeira', 'cadeira', 1, 1, '#2c6fb0', 'Cadeira'), x + 1, y, 2, null); if (r() < 0.4) clientes.push([x + 1, y + 1]); }
  } else if (cat === 'igreja') {
    pon(mvInt('mesa', 'mesa', 3, 1, '#f5f1e8', 'Altar'), Math.floor(W / 2) - 1, 1, 0, todas, 'Altar');
    pon(mvInt('candeeiro', 'candeeiro', 1, 1, '#f5b81c', 'Vela'), Math.floor(W / 2) - 2, 1, 0, null); pon(mvInt('candeeiro', 'candeeiro', 1, 1, '#f5b81c', 'Vela'), Math.floor(W / 2) + 2, 1, 0, null);
    for (let y = 4; y < H - 1; y += 2) { pon(mvInt('int_banco_igreja', 'sofa', 3, 1, '#8a5a32', 'Banco'), 1, y, 0, todas, 'Banco — rezar'); pon(mvInt('int_banco_igreja', 'sofa', 3, 1, '#8a5a32', 'Banco'), W - 5, y, 0, todas, 'Banco — rezar'); if (r() < 0.5) clientes.push([4, y + 1]); }
    staffEm(Math.floor(W / 2) + 0.5, 2.5, { pele: 5, cabelo: 0, corCabelo: 5, camisa: '#141012', calca: '#141012' }, 'Pastor', ['Deus abençoe!', 'Seja bem-vindo/a à casa do Senhor.']);
  } else if (cat === 'escritorio' || cat === 'reparticao') {
    balcao(1, 2, 3, 0, todas, cat === 'reparticao' ? 'Atendimento' : 'Receção');
    staffEm(2.5, 1.5, { pele: 2, cabelo: 3, corCabelo: 0, camisa: '#f5f1e8', calca: '#2a3b55' }, cat === 'reparticao' ? 'Funcionário/a' : 'Rececionista', ['Senha, por favor.', 'Aguarde um momento.', 'O chefe já vem.']);
    for (let y = 5; y < H - 1; y += 3) for (let x = 1; x < W - 3; x += 4) { pon(mvInt('int_secretaria', 'mesa', 2, 1, '#e6e2da', 'Secretária'), x, y, 0, todas, 'Secretária — trabalhar'); pon(mvInt('cadeira', 'cadeira', 1, 1, '#141012', 'Cadeira'), x, y + 1, 0, null); if (r() < 0.5) clientes.push([x + 1, y + 1]); }
    planta(W - 1, H - 1);
  } else if (cat === 'terminal') {
    balcao(1, 2, 4, 0, todas, 'Check-in — voos');
    staffEm(3, 1.5, { pele: 3, cabelo: 3, corCabelo: 0, camisa: '#2c6fb0', calca: '#2a3b55' }, 'Check-in', ['Passaporte ou BI, por favor.', 'Boa viagem!']);
    for (let y = 5; y < H - 1; y += 2) pon(mvInt('poltrona', 'sofa', 4, 1, '#2a3b55', 'Cadeiras'), 2, y, 0, null);
    pon(mvInt('tv', 'tv', 2, 1, '#141012', 'Painel de voos'), W - 4, 0, 0, todas, 'Painel de partidas');
    clientes.push([6, 6], [3, 7]);
  } else {
    balcao(1, 2, 3, 0, todas, 'Balcão');
    staffEm(2.5, 1.5, aparenciaAleatoria(r), 'Funcionário/a', ['Bem-vindo/a!', 'Em que posso ajudar?']);
    pon(mvInt('sofa', 'sofa', 2, 1, '#2a3b55', 'Sofá'), 2, H - 2, 0, null); planta(W - 1, H - 1);
  }
  // dono 5 nov (bug do banco: «only button to ask for loan»): o que o edifício tem e não ficou em nenhum móvel ganha uma secretária
  const comEstacao = new Set(objetos.flatMap(ob => ob.estacao || []));
  const faltam = todas.filter(t => !comEstacao.has(t));
  if (faltam.length) {
    const rot = faltam.includes('emprego') ? 'Secretária — trabalhar' : faltam.includes('moda_loja') ? 'Loja de moda' : 'Balcão';
    let posto = null;
    for (let y = H - 2; y >= 3 && !posto; y--) for (let x = 1; x < W - 3 && !posto; x++) posto = pon(mvInt('int_secretaria', 'mesa', 2, 1, '#e6e2da', 'Secretária'), x, y, 0, faltam, rot);
  }
  soltar();
  return {
    tipo: 'interior', id: 'int:' + J.bairro + ':' + o.x + ':' + o.y, lugar: o, cat, W, H, bloq, objetos, portas: new Map(),
    spawn: [W - 2, 1], saida: porta, parede: estiloModa?.parede || o.spec.parede || est.parede, chao: estiloModa?.chao || est.chao, salas: [{ x: Math.floor(W / 2), y: H - 1, n: est.nome }],
    staff, clientes,
  };
}

// entrar e sair
function entrarEdificio(o) {
  const c = gerarInterior(o); if (!c) return false;
  sairDoCanal(); if (deco) sairDeco();
  const voltar = { bairro: J.bairro, porta: o.porta };
  cena = c; cena.voltar = voltar;
  construirChao();
  eu = novoPersonagem(uid, J.nome, minhaAparencia(), c.spawn[0], c.spawn[1], { eu: true });
  outros.clear(); npcs = [];
  for (const s of c.staff) npcs.push(novoPersonagem('st' + npcs.length, tr(s.nome), s.ap, s.x, s.y, { npc: true, espera: 1e9, falas: s.falas }));
  const rr = rng(Date.now() & 0xffff);
  for (const [x, y] of c.clientes) if (!c.bloq[y * c.W + x]) npcs.push(novoPersonagem('cl' + npcs.length, null, aparenciaAleatoria(rr), x, y, { npc: true, espera: 2 + rr() * 8 }));
  cam.z = zoomCasa(); centrarCamera(true);
  entrarNoCanal('i-' + cena.id.slice(4).replace(/:/g, '-'));
  if (typeof registarVisita === 'function') registarVisita(J.bairro, o.spec.nome || '');
  hud(); toast(`${o.spec.emoji || '🚪'} ${tr(o.spec.nome)}` + (c.cat === 'loja' ? ' · ' + tr('Toca na caixa ou em qualquer artigo à vista para ver tudo.') : ''), 'info', c.cat === 'loja' ? 5000 : 3400);
  return true;
}

// tocar numa estação lá dentro: abre o painel do edifício só com o que se faz ali
function usarEstacao(ob) {
  if (ob.carro && window.VEL_TESTE && typeof abrirPosesCarro === 'function' && typeof temWebGL === 'function' && temWebGL()) { abrirPosesCarro(ob.carro); return; }
  const o = cena.lugar, so = ob.estacao;
  const spec = { ...o.spec, nome: ob.rotulo || o.spec.nome, acao: o.spec.acao.filter(a => so.includes(a.t)) };
  if (!spec.acao.length) spec.acao = o.spec.acao;
  abrirLugar({ ...o, spec, _dentro: true });
}
