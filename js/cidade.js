/* ============================================================
   Vida na Banda — os bairros
   Mapa 33x33: estradas em 9-10, 20-21, 31-32; quarteirões 3x3.
   Cada quarteirão tem 2 lotes: lado 0 (frente para baixo, porta +y)
   e lado 1 (à direita, porta +x). Lote n = quarteirão*2 + lado.
   ============================================================ */
const MAPA = 33, ESTRADAS = [9, 20, 31], ORIG = [0, 11, 22], ESTRADAS_BASE = ESTRADAS;
// FILA 0dm-1 (dono, 5 nov): bairros maiores — cada bairro pode ter mais quarteirões (grade: 4 → 4×4 em vez de 3×3).
// Os quarteirões 0–8 ficam onde sempre estiveram; os novos juntam-se à direita e em baixo (lotes 18+).
function gradeDe(id) {
  const n = BAIRROS_MAPA[id]?.grade || 3, orig = Array.from({ length: n }, (_, i) => i * 11);
  return { n, W: n * 11, ORIG: orig, ESTR: orig.map(o => o + 9) };
}
function blocoDe(q, n = 3) {
  if (q < 9) return [q % 3, Math.floor(q / 3)];
  const extra = [];
  for (let qi = 0; qi < n; qi++) for (let qj = 0; qj < n; qj++) if (qi >= 3 || qj >= 3) extra.push([qi, qj]);
  extra.sort((a, b) => (a[1] >= 3) - (b[1] >= 3) || a[1] - b[1] || a[0] - b[0]);   // primeiro a coluna nova (de cima para baixo), depois a linha nova
  return extra[q - 9] || [0, 0];
}
const CH = { relva: 0, terra: 1, areia: 2, mar: 3, asfalto: 4, passeio: 5, praca: 6, terraEstrada: 7 };
const COR_CHAO = ['#6f9b4a', '#b4683f', '#e9d39c', '#2b84ad', '#4b4c52', '#bdb5a8', '#d3c7b2', '#9c5a36'];

// básicos + 3 extras que rodam todos os dias (cada bairro calha numa combinação diferente)
const COMIDA_RODA = ['cabrite', 'pincho', 'mikate', 'sumo_tutti', 'eka', 'cuca', 'kissangua', 'ginguba', 'bombo', 'sumo_maracuja', 'funge', 'sumo_mucua'];
const DIA_COMIDA = Math.floor(Date.now() / 864e5);
const CANTINA = ['pao_chourico', 'gelada', 'funge_calulu', 'kizaca', 'fanta', 'coca_cola', ...[0, 3, 6, 9].map(k => COMIDA_RODA[(DIA_COMIDA + k) % COMIDA_RODA.length])];
// bares: cerveja, refrigerante, vinho do pacote, kissangua e ginguba para petiscar
const BAR = ['gelada', 'nocal', 'fanta', 'coca_cola', 'vinho_pacote', 'kissangua', 'ginguba'];
// quarteirões candidatos a outdoor, por ordem; cada bairro fica com até OUTDOORS_POR_BAIRRO (lugares A–E)
const OUTDOOR_QUARTEIROES = [[1, 1], [2, 0], [0, 2], [2, 2], [1, 0], [0, 1], [2, 1], [1, 2], [0, 0]];
const OUTDOORS_POR_BAIRRO = 5;

// Lote 9 (quarteirão central, lado direito) é sempre a paragem.
const BAIRROS_MAPA = {
  cazenga: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.11, palmeira: 0.02, arvore: 0.03, baobab: 0.01, carro: 0.02 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Cantina da Tia Rosa', emoji: '🍲', w: 4, d: 3, h: 26, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 1, nome: 'Terminal do Cazenga', emoji: '🚐', w: 3, d: 4, h: 22, cor: '#3d7cc9', telhado: 'zinco', acao: [{ t: 'emprego', id: 'cobrador' }] },
      { s: 2, nome: 'Quintal do Sr. Manuel', emoji: '🛖', w: 4, d: 4, h: 24, cor: '#d9cbb0', telhado: 'zinco', acao: [{ t: 'casa', id: 'anexo_cazenga' }] },
      { s: 5, nome: 'Centro de Saúde do Cazenga', emoji: '🏥', w: 3, d: 4, h: 30, cor: '#f2f2f2', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'saude', txt: 'Centro de saúde público e farmácia.' }] },
      { s: 7, nome: 'Curandeiro', emoji: '🌿', w: 3, d: 3, h: 18, cor: '#8a6a4a', telhado: 'zinco', acao: [{ t: 'saude', txt: 'O mais-velho que trata com raízes e rezas.' }] },
      { s: 3, nome: 'Campo do Cazenga', emoji: '⚽', w: 4, d: 3, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
      { s: 4, nome: 'Igreja do Bairro', emoji: '⛪', w: 4, d: 4, h: 46, cor: '#f2efe8', telhado: 'telha', acao: [{ t: 'info', txt: 'Domingo de manhã a igreja enche.' }, { t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 6, nome: 'Obra', emoji: '🧱', w: 4, d: 3, h: 16, cor: '#a9a39a', telhado: 'plano', acao: [{ t: 'biscato' }] },
      { s: 13, nome: 'Quintal do Sr. Manuel', emoji: '🛖', w: 4, d: 4, h: 24, cor: '#cdb79a', telhado: 'zinco', acao: [{ t: 'casa', id: 'anexo_cazenga' }] },
      { s: 12, nome: 'Administração do Cazenga', emoji: '🏛️', w: 4, d: 3, h: 30, cor: '#e8dcc0', telhado: 'plano', toldo: '#c0392b', acao: [{ t: 'info', txt: 'Bandeira à porta, fila lá dentro.' }, { t: 'governo' }] },
      { s: 8, nome: 'Beco do Esquema', emoji: '🕶️', w: 3, d: 3, h: 18, cor: '#4a4040', telhado: 'zinco', acao: [{ t: 'info', txt: 'Uns rapazes encostados à parede, de olho em quem passa…' }, { t: 'crime', tipos: ['carteira', 'burla', 'assalto'] }] },
      { s: 15, nome: 'Cantinho do Kota', emoji: '🍺', w: 3, d: 3, h: 22, cor: '#2f8f5b', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'lazer', id: 'bola' }, { t: 'comida', ids: [...BAR, 'pao_chourico'] }] },
    ]
  },
  viana: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.06, arvore: 0.03, baobab: 0.02, carro: 0.03 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Fábrica de Viana', emoji: '🏭', w: 5, d: 4, h: 44, cor: '#9aa3ab', telhado: 'plano', tanque: true, acao: [{ t: 'emprego', id: 'operario' }] },
      { s: 1, nome: 'Armazém', emoji: '📦', w: 3, d: 5, h: 34, cor: '#7f8a93', telhado: 'zinco', acao: [{ t: 'biscato' }] },
      { s: 2, nome: 'Mercado do Km 30', emoji: '🧺', w: 5, d: 4, h: 18, cor: '#f07c2a', telhado: 'zinco', toldo: '#2f8f5b', acao: [{ t: 'lazer', id: 'mercado' }, { t: 'comida', ids: CANTINA }, { t: 'grupos', tipo: 'associacao' }] },
      { s: 5, nome: 'Igreja Tocoísta', emoji: '⛪', w: 4, d: 4, h: 40, cor: '#f5f1e8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 3, nome: 'Móveis do Mercado', emoji: '🛋️', w: 3, d: 4, h: 26, cor: '#c47a2c', telhado: 'zinco', toldo: '#2c6fb0', acao: [{ t: 'moveis', loja: 'barata' }] },
      { s: 4, nome: 'Casas de Bloco', emoji: '🏠', w: 4, d: 4, h: 26, cor: '#d8d0c0', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_viana' }] },
      { s: 6, nome: 'Cantina do Viana', emoji: '🍲', w: 4, d: 3, h: 24, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 13, nome: 'Casas de Bloco', emoji: '🏠', w: 4, d: 4, h: 26, cor: '#cfc3a8', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_viana' }] },
      { s: 7, nome: 'Estação do CFL', emoji: '🚂', w: 3, d: 5, h: 28, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'info', txt: 'O Caminho de Ferro de Luanda liga Viana a Malanje.' }, { t: 'estacao' }] },
      { s: 14, nome: 'Feira dos Animais', emoji: '🐔', w: 4, d: 3, h: 14, cor: '#c47a2c', telhado: 'zinco', toldo: '#2f8f5b', acao: [{ t: 'info', txt: 'Galinhas, cabritos, cães e gatos. Muito barulho e muito regateio.' }, { t: 'itens', cats: ['animal'] }] },
      { s: 12, nome: 'Administração de Viana', emoji: '🏛️', w: 4, d: 3, h: 30, cor: '#e8dcc0', telhado: 'plano', toldo: '#c0392b', acao: [{ t: 'info', txt: 'Bandeira à porta, fila lá dentro.' }, { t: 'governo' }] },
      { s: 8, nome: 'Traseiras do Mercado', emoji: '🕶️', w: 3, d: 3, h: 16, cor: '#5a4a3a', telhado: 'zinco', acao: [{ t: 'info', txt: 'Aqui vende-se de tudo. Não perguntes de onde veio.' }, { t: 'crime', tipos: ['carteira', 'burla', 'assalto'] }] },
    ]
  },
  // bairros novos (FILA #2, 27 out) — lotes com as mesmas medidas/cores dos já fotografados (o 3D usa as mesmas fotografias)
  rangel: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.12, palmeira: 0.02, arvore: 0.04, carro: 0.03 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Tasca do Rangel', emoji: '🍲', w: 4, d: 3, h: 26, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 1, nome: 'Terminal do Rangel', emoji: '🚐', w: 3, d: 4, h: 22, cor: '#3d7cc9', telhado: 'zinco', acao: [{ t: 'emprego', id: 'kupapata' }] },
      { s: 2, nome: 'Casas de Quintal', emoji: '🛖', w: 4, d: 4, h: 24, cor: '#d9cbb0', telhado: 'zinco', acao: [{ t: 'casa', id: 'quintal_rangel' }] },
      { s: 3, nome: 'Campo do Rangel', emoji: '⚽', w: 4, d: 3, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
      { s: 4, nome: 'Igreja do Rangel', emoji: '⛪', w: 4, d: 4, h: 46, cor: '#f2efe8', telhado: 'telha', acao: [{ t: 'info', txt: 'Coro ao domingo e reuniões à quarta.' }, { t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 6, nome: 'Obra', emoji: '🧱', w: 4, d: 3, h: 16, cor: '#a9a39a', telhado: 'plano', acao: [{ t: 'biscato' }] },
      { s: 13, nome: 'Casas de Quintal', emoji: '🛖', w: 4, d: 4, h: 24, cor: '#cdb79a', telhado: 'zinco', acao: [{ t: 'casa', id: 'quintal_rangel' }] },
      { s: 12, nome: 'Comissão de Moradores', emoji: '🤝', w: 4, d: 3, h: 30, cor: '#e8dcc0', telhado: 'plano', toldo: '#c0392b', acao: [{ t: 'info', txt: 'Aqui resolve-se tudo: da luz ao lixo.' }, { t: 'grupos', tipo: 'associacao' }] },
      { s: 15, nome: 'Bar do Rangel', emoji: '🍺', w: 3, d: 3, h: 22, cor: '#2f8f5b', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'lazer', id: 'bola' }, { t: 'comida', ids: [...BAR, 'pao_chourico'] }] },
    ]
  },
  novavida: {
    chao: CH.relva, estradaFora: CH.asfalto, decor: { predio: 0.05, arvore: 0.06, palmeira: 0.03, carro: 0.04 },
    lotes: [
      { s: 0, nome: 'Escola de Futebol da Nova Vida', emoji: '⚽', w: 5, d: 4, h: 40, cor: '#f5b81c', telhado: 'plano', acao: [{ t: 'emprego', id: 'treinador' }] },
      { s: 1, nome: 'Sede do Condomínio', emoji: '🤝', w: 3, d: 4, h: 30, cor: '#2c6fb0', telhado: 'plano', toldo: '#f5b81c', acao: [{ t: 'grupos', tipo: 'associacao' }] },
      { s: 3, nome: 'Prédio Amarelo', emoji: '🏢', w: 3, d: 4, h: 110, cor: '#f3d36b', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_novavida' }] },
      { s: 4, nome: 'Churrasqueira da Nova Vida', emoji: '🍖', w: 4, d: 3, h: 22, cor: '#c0392b', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'comida', ids: ['frango_churrasco', 'porco_grelhado', ...CANTINA] }] },
      { s: 6, nome: 'Cantina da Nova Vida', emoji: '🍲', w: 4, d: 3, h: 22, cor: '#8fc4e8', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 13, nome: 'Prédio Verde', emoji: '🏢', w: 4, d: 4, h: 110, cor: '#9ccf9a', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_novavida' }] },
    ]
  },
  zango: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.13, arvore: 0.03, baobab: 0.01, carro: 0.03 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 1, nome: 'Armazém', emoji: '📦', w: 3, d: 5, h: 34, cor: '#7f8a93', telhado: 'zinco', acao: [{ t: 'biscato' }] },
      { s: 2, nome: 'Mercado do Zango', emoji: '🧺', w: 5, d: 4, h: 18, cor: '#f07c2a', telhado: 'zinco', toldo: '#2f8f5b', acao: [{ t: 'lazer', id: 'mercado' }, { t: 'comida', ids: CANTINA }, { t: 'grupos', tipo: 'associacao' }] },
      { s: 4, nome: 'Casas do Zango', emoji: '🏠', w: 4, d: 4, h: 26, cor: '#d8d0c0', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_zango' }] },
      { s: 5, nome: 'Igreja do Zango', emoji: '⛪', w: 4, d: 4, h: 40, cor: '#f5f1e8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 6, nome: 'Cantina do Zango', emoji: '🍲', w: 4, d: 3, h: 24, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 13, nome: 'Casas do Zango', emoji: '🏠', w: 4, d: 4, h: 26, cor: '#cfc3a8', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_zango' }] },
      { s: 8, nome: 'Rua da Dirá', emoji: '🍺', w: 3, d: 3, h: 16, cor: '#5a4a3a', telhado: 'zinco', acao: [{ t: 'info', txt: 'A rua que nunca dorme: kuduro alto, grelhados no passeio e gente até de madrugada.' }, { t: 'lazer', id: 'bola' }, { t: 'comida', ids: [...BAR, 'pincho'] }] },
    ]
  },
  maianga: {
    chao: CH.praca, estradaFora: CH.asfalto, decor: { casinha: 0.05, arvore: 0.06, palmeira: 0.03, carro: 0.04 }, telhadoCasinha: 'telha',
    lotes: [
      { s: 0, nome: 'Hospital Josina Machel', emoji: '🏥', w: 5, d: 4, h: 50, cor: '#f2f2f2', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'info', txt: 'Se desmaiares, é aqui que acordas — e a conta não é barata.' }, { t: 'saude', txt: 'Hospital, centro de saúde e farmácia.' }, { t: 'emprego', id: 'medico' }] },
      { s: 1, nome: 'Lavagem do Zé', emoji: '🧽', w: 3, d: 4, h: 20, cor: '#16a3a3', telhado: 'zinco', acao: [{ t: 'emprego', id: 'lavador' }] },
      { s: 2, nome: 'Restaurante da Maianga', emoji: '🍗', w: 4, d: 3, h: 28, cor: '#f5b81c', telhado: 'telha', toldo: '#e0313f', acao: [{ t: 'comida', ids: ['muamba', ...CANTINA] }] },
      { s: 10, nome: 'ISAF', emoji: '🎓', w: 4, d: 4, h: 44, cor: '#e9dcc4', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'univ', id: 'isaf' }] },
      { s: 5, nome: 'Aeroporto 4 de Fevereiro', emoji: '✈️', w: 3, d: 5, h: 34, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', antena: true, acao: [{ t: 'aeroporto' }] },
      { s: 3, nome: 'Campo da Maianga', emoji: '⚽', w: 4, d: 3, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
      { s: 4, nome: 'Prédio da Maianga', emoji: '🏬', w: 4, d: 4, h: 78, cor: '#e8b9a0', telhado: 'plano', antena: true, acao: [{ t: 'casa', id: 'apart_maianga' }] },
      { s: 6, nome: 'Obra', emoji: '🧱', w: 4, d: 3, h: 16, cor: '#a9a39a', telhado: 'plano', acao: [{ t: 'biscato' }] },
      { s: 8, nome: 'Kartódromo da Maianga', emoji: '🏎️', w: 5, d: 4, h: 6, cor: '#2d2f33', telhado: 'plano', toldo: '#cc092f', acao: [{ t: 'info', txt: 'Pneus empilhados, cheiro a gasolina e karts a rugir. 3 voltas pelas ruas da Maianga.' }, { t: 'kart' }] },
      { s: 13, nome: 'Bar do Largo', emoji: '⚽', w: 3, d: 3, h: 24, cor: '#7a4b8c', telhado: 'telha', toldo: '#f5b81c', acao: [{ t: 'lazer', id: 'bola' }, { t: 'comida', ids: [...BAR, 'pincho', 'pao_chourico'] }] },
    ]
  },
  mutamba: {
    chao: CH.praca, estradaFora: CH.asfalto, decor: { arvore: 0.05, palmeira: 0.05, carro: 0.05, torre: 0.05 },
    lotes: [
      { s: 0, nome: 'Universidade Agostinho Neto', emoji: '🎓', w: 5, d: 4, h: 54, cor: '#e9dcc4', telhado: 'telha', acao: [{ t: 'univ' }] },
      { s: 1, nome: 'Banco', emoji: '🏦', w: 3, d: 5, h: 120, cor: '#2c4a63', telhado: 'plano', antena: true, acao: [{ t: 'banco' }, { t: 'emprego', id: 'bancario' }] },
      { s: 2, nome: 'Café da Baixa', emoji: '☕', w: 4, d: 3, h: 30, cor: '#c47a2c', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 4, nome: 'Fortaleza de São Miguel', emoji: '🏰', w: 5, d: 4, h: 22, cor: '#cdb98e', telhado: 'plano', acao: [{ t: 'info', txt: 'A Fortaleza de São Miguel, de 1576. Daqui vê-se a baía toda — e a Marginal, onde toda a gente corre ao fim da tarde.' }, { t: 'treino', onde: 'correr' }] },
      { s: 6, nome: 'Clínica da Baixa', emoji: '🩺', w: 4, d: 3, h: 50, cor: '#eef2f5', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'saude', txt: 'Clínica privada e farmácia.' }] },
      { s: 3, nome: 'Sé Catedral', emoji: '⛪', w: 4, d: 4, h: 70, cor: '#f2ead8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 5, nome: 'Torre Comercial', emoji: '🏢', w: 3, d: 4, h: 150, cor: '#5a7d94', telhado: 'plano', antena: true, acao: [{ t: 'biscato' }] },
      { s: 7, nome: 'Esquadra da Polícia', emoji: '👮', w: 3, d: 5, h: 32, cor: '#2c4a8a', telhado: 'plano', toldo: '#f5f1e8', antena: true, acao: [{ t: 'policia' }] },
      { s: 14, nome: 'Tribunal Provincial', emoji: '⚖️', w: 4, d: 4, h: 44, cor: '#e8e2d0', telhado: 'telha', acao: [{ t: 'info', txt: 'Aqui julgam-se os processos. Um bom advogado faz toda a diferença; o defensor oficioso tem 200 processos em cima da mesa.' }] },
      { s: 10, nome: 'Torre VIP da Marginal', emoji: '🏙️', w: 3, d: 4, h: 170, cor: '#1c2633', telhado: 'plano', antena: true, toldo: '#d4af37', acao: [{ t: 'casa', id: 'penthouse_marginal' }] },   // 8 nov: casa VIP (Ouro)
      { s: 13, nome: 'Edifício do Governo', emoji: '🏛️', w: 4, d: 4, h: 60, cor: '#e8e2d0', telhado: 'plano', acao: [{ t: 'info', txt: 'Fila para tratar do BI. Volta amanhã… ou na próxima semana.' }, { t: 'governo' }] },
    ]
  },
  benguela: {
    chao: CH.areia, estradaFora: CH.asfalto, praia: true, decor: { palmeira: 0.06, arvore: 0.05, casinha: 0.05, carro: 0.02 }, telhadoCasinha: 'telha',
    barraca: { nome: 'Praia Morena', emoji: '🏖️', acao: [{ t: 'lazer', id: 'baia_azul' }, { t: 'comida', ids: ['gelada', 'calulu_peixe'] }] },
    lotes: [
      { s: 2, nome: 'Porto do Lobito', emoji: '🚢', w: 5, d: 4, h: 40, cor: '#7f8a93', telhado: 'plano', tanque: true, acao: [{ t: 'emprego', id: 'estivador' }, { t: 'biscato' }] },
      { s: 3, nome: 'Aeroporto da Catumbela', emoji: '✈️', w: 3, d: 5, h: 32, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', antena: true, acao: [{ t: 'aeroporto' }] },
      { s: 4, nome: 'Prédio da Praia Morena', emoji: '🏢', w: 4, d: 4, h: 80, cor: '#f2d0c4', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_benguela' }] },
      { s: 5, nome: 'Estação do CFB', emoji: '🚂', w: 3, d: 5, h: 30, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'info', txt: 'O Caminho de Ferro de Benguela liga o Lobito ao planalto e ao leste.' }, { t: 'estacao' }] },
      { s: 10, nome: 'Cantina da Restinga', emoji: '🐟', w: 4, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#16a3a3', acao: [{ t: 'comida', ids: ['calulu_peixe', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
      { s: 11, nome: 'Campo da Praia', emoji: '⚽', w: 3, d: 4, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
      { s: 14, nome: 'Quintal benguelense', emoji: '🛖', w: 4, d: 4, h: 24, cor: '#e7cfa8', telhado: 'zinco', acao: [{ t: 'casa', id: 'quintal_benguela' }] },
      { s: 15, nome: 'Hospital de Benguela', emoji: '🏥', w: 3, d: 4, h: 34, cor: '#f2f2f2', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'saude', txt: 'Centro de saúde, clínica e farmácia.' }] },
      { s: 16, nome: 'Baía Azul', emoji: '🏝️', w: 4, d: 3, h: 6, cor: '#3fb8c9', telhado: 'plano', acao: [{ t: 'lazer', id: 'baia_azul' }, { t: 'treino', onde: 'correr' }] },
    ]
  },
  huambo: {
    chao: CH.relva, estradaFora: CH.terraEstrada, decor: { casinha: 0.06, arvore: 0.08, carro: 0.02 }, telhadoCasinha: 'telha',
    lotes: [
      { s: 0, nome: 'Fazenda do Planalto', emoji: '🌽', w: 5, d: 4, h: 14, cor: '#c9a24a', telhado: 'zinco', acao: [{ t: 'emprego', id: 'agricultor' }, { t: 'lavras' }, { t: 'biscato' }] },
      { s: 1, nome: 'Aeroporto Albano Machado', emoji: '✈️', w: 3, d: 5, h: 30, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'aeroporto' }] },
      { s: 2, nome: 'Estação do CFB', emoji: '🚂', w: 5, d: 4, h: 30, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'estacao' }] },
      { s: 3, nome: 'Centro de Saúde', emoji: '🏥', w: 3, d: 4, h: 26, cor: '#f2f2f2', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'saude', txt: 'Centro de saúde, farmácia e um curandeiro ali ao lado.' }] },
      { s: 4, nome: 'Casas coloniais', emoji: '🏡', w: 4, d: 4, h: 30, cor: '#f2e3c2', telhado: 'telha', acao: [{ t: 'casa', id: 'casa_huambo' }] },
      { s: 6, nome: 'Cantina do Planalto', emoji: '🍲', w: 4, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: ['milho_assado', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
      { s: 12, nome: 'Miradouro do Planalto', emoji: '🌄', w: 4, d: 3, h: 6, cor: '#7cb05a', telhado: 'plano', acao: [{ t: 'lazer', id: 'planalto' }, { t: 'treino', onde: 'correr' }] },
      { s: 13, nome: 'Sé Catedral do Huambo', emoji: '⛪', w: 3, d: 4, h: 60, cor: '#f2ead8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 15, nome: 'Casas coloniais', emoji: '🏡', w: 3, d: 4, h: 28, cor: '#e9d8b8', telhado: 'telha', acao: [{ t: 'casa', id: 'casa_huambo' }] },
    ]
  },
  lubango: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.05, arvore: 0.05, baobab: 0.02, carro: 0.02 }, telhadoCasinha: 'telha',
    lotes: [
      { s: 0, nome: 'Miradouro da Tundavala', emoji: '🏞️', w: 5, d: 4, h: 8, cor: '#8a6a4a', telhado: 'plano', acao: [{ t: 'lazer', id: 'tundavala' }, { t: 'emprego', id: 'guia' }] },
      { s: 1, nome: 'Aeroporto da Mukanka', emoji: '✈️', w: 3, d: 5, h: 30, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'aeroporto' }] },
      { s: 2, nome: 'Cristo Rei', emoji: '✝️', w: 3, d: 3, h: 90, cor: '#f2f2f2', telhado: 'plano', acao: [{ t: 'lazer', id: 'cristo_rei' }] },
      { s: 3, nome: 'Serra da Leba', emoji: '🛣️', w: 3, d: 5, h: 10, cor: '#6f7a5a', telhado: 'plano', acao: [{ t: 'lazer', id: 'serra_leba' }, { t: 'treino', onde: 'correr' }] },
      { s: 5, nome: 'Estação do CFM', emoji: '🚂', w: 3, d: 5, h: 28, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'info', txt: 'O Caminho de Ferro de Moçâmedes desce a serra até ao mar, no Namibe.' }, { t: 'estacao' }] },
      { s: 7, nome: 'Clínica do Lubango', emoji: '🩺', w: 3, d: 4, h: 34, cor: '#f2f2f2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'saude', txt: 'Centro de saúde, clínica e farmácia.' }] },
      { s: 4, nome: 'Prédios do Lubango', emoji: '🏢', w: 4, d: 4, h: 70, cor: '#e8b9a0', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_lubango' }] },
      { s: 6, nome: 'Cantina da Huíla', emoji: '🍖', w: 4, d: 3, h: 22, cor: '#c0392b', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'comida', ids: ['cabrito', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
      { s: 13, nome: 'Casa dos Guias', emoji: '🧭', w: 3, d: 4, h: 24, cor: '#e8c547', telhado: 'zinco', acao: [{ t: 'grupos', tipo: 'associacao' }, { t: 'emprego', id: 'guia' }] },
    ]
  },
  mussulo: {
    chao: CH.areia, estradaFora: CH.areia, praia: true, decor: { palmeira: 0.14 },
    barraca: { nome: 'Praia do Mussulo', emoji: '🏖️', acao: [{ t: 'lazer', id: 'mussulo' }, { t: 'jetski' }, { t: 'comida', ids: ['gelada', 'marisco'] }] },
    lotes: [
      { s: 2, nome: 'Cais', emoji: '🛥️', w: 4, d: 3, h: 14, cor: '#16a3a3', telhado: 'plano', toldo: '#f5f1e8', acao: [{ t: 'barco' }] },
      { s: 3, nome: 'Restaurante da Baía', emoji: '🦞', w: 3, d: 4, h: 22, cor: '#f2e3c2', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: ['marisco', 'gelada'] }] },
      { s: 4, nome: 'Casas de praia', emoji: '🏝️', w: 5, d: 4, h: 26, cor: '#f5f1e8', telhado: 'telha', acao: [{ t: 'casa', id: 'resort_mussulo' }] },
      { s: 5, nome: 'Posto de nadadores', emoji: '🛟', w: 3, d: 3, h: 18, cor: '#e0313f', telhado: 'plano', acao: [{ t: 'emprego', id: 'nadador_salvador' }] },
      { s: 10, nome: 'Jet-ski & Kite', emoji: '🚤', w: 4, d: 3, h: 14, cor: '#2c6fb0', telhado: 'plano', toldo: '#f5b81c', acao: [{ t: 'info', txt: 'Jet skis prontos na areia do Mussulo.' }, { t: 'jetski' }] },
      { s: 14, nome: 'Casas de praia', emoji: '🏝️', w: 4, d: 4, h: 26, cor: '#e9d8b8', telhado: 'telha', acao: [{ t: 'casa', id: 'resort_mussulo' }] },
      { s: 8, nome: 'Vivendas VIP', emoji: '🏖️', w: 4, d: 4, h: 34, cor: '#f6efe2', telhado: 'plano', toldo: '#d4af37', acao: [{ t: 'casa', id: 'vivenda_mussulo_vip' }] },   // 8 nov: casa VIP (Ouro)
    ]
  },
  namibe: {
    chao: CH.areia, estradaFora: CH.asfalto, praia: true, decor: { casinha: 0.05, carro: 0.02, palmeira: 0.01 }, telhadoCasinha: 'plano',
    barraca: { nome: 'Praia das Miragens', emoji: '🏖️', acao: [{ t: 'lazer', id: 'praia' }, { t: 'comida', ids: ['gelada', 'peixe_seco'] }] },
    lotes: [
      { s: 2, nome: 'Porto de Pesca', emoji: '🎣', w: 5, d: 4, h: 22, cor: '#7f8a93', telhado: 'zinco', acao: [{ t: 'emprego', id: 'pescador' }, { t: 'grupos', tipo: 'associacao' }] },
      { s: 3, nome: 'Aeroporto Yuri Gagarin', emoji: '✈️', w: 3, d: 5, h: 30, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'aeroporto' }] },
      { s: 4, nome: 'Casas do Namibe', emoji: '🏠', w: 4, d: 4, h: 22, cor: '#f5f1e8', telhado: 'plano', acao: [{ t: 'casa', id: 'casa_namibe' }] },
      { s: 5, nome: 'Estação do CFM', emoji: '🚂', w: 3, d: 5, h: 28, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'estacao' }] },
      { s: 10, nome: 'Tours no deserto', emoji: '🏜️', w: 4, d: 3, h: 10, cor: '#d9a35f', telhado: 'plano', acao: [{ t: 'lazer', id: 'deserto' }, { t: 'lazer', id: 'arco' }] },
      { s: 14, nome: 'Centro de Saúde', emoji: '🏥', w: 4, d: 4, h: 24, cor: '#f2f2f2', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'saude', txt: 'Centro de saúde e farmácia.' }] },
      { s: 11, nome: 'Cantina do Namibe', emoji: '🐟', w: 3, d: 4, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#16a3a3', acao: [{ t: 'comida', ids: ['peixe_seco', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
    ]
  },
  malanje: {
    chao: CH.relva, estradaFora: CH.terraEstrada, decor: { casinha: 0.07, arvore: 0.08, baobab: 0.01, carro: 0.01 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Lavras de Malanje', emoji: '🌱', w: 5, d: 4, h: 8, cor: '#8fae4a', telhado: 'plano', acao: [{ t: 'lavras' }, { t: 'biscato' }] },
      { s: 1, nome: 'Aeroporto de Malanje', emoji: '✈️', w: 3, d: 5, h: 28, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'aeroporto' }] },
      { s: 2, nome: 'Estação do CFL', emoji: '🚂', w: 5, d: 4, h: 28, cor: '#c0392b', telhado: 'telha', acao: [{ t: 'estacao' }] },
      { s: 3, nome: 'Centro de Saúde', emoji: '🏥', w: 3, d: 4, h: 24, cor: '#f2f2f2', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'saude', txt: 'Centro de saúde, farmácia e curandeiro.' }] },
      { s: 4, nome: 'Casas de Malanje', emoji: '🏡', w: 4, d: 4, h: 24, cor: '#e9d8b8', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_malanje' }] },
      { s: 6, nome: 'Cantina de Malanje', emoji: '🥬', w: 4, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#2f8f5b', acao: [{ t: 'comida', ids: ['funge_bombo', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
      { s: 12, nome: 'Excursões: Kalandula', emoji: '💧', w: 4, d: 3, h: 12, cor: '#3fb8c9', telhado: 'plano', acao: [{ t: 'lazer', id: 'kalandula' }, { t: 'lazer', id: 'pungo' }] },
      { s: 13, nome: 'Campo de Malanje', emoji: '⚽', w: 3, d: 4, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
    ]
  },
  cabinda: {
    chao: CH.relva, estradaFora: CH.asfalto, decor: { arvore: 0.14, casinha: 0.04, carro: 0.02, palmeira: 0.03 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Base Petrolífera', emoji: '🛢️', w: 5, d: 4, h: 60, cor: '#2a3b55', telhado: 'plano', tanque: true, antena: true, acao: [{ t: 'emprego', id: 'plataforma' }, { t: 'emprego', id: 'cozinheiro_base' }] },
      { s: 1, nome: 'Aeroporto de Cabinda', emoji: '✈️', w: 3, d: 5, h: 30, cor: '#e9eef2', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'aeroporto' }] },
      { s: 2, nome: 'Prédio do Petróleo', emoji: '🏢', w: 4, d: 4, h: 90, cor: '#d9e2e8', telhado: 'plano', antena: true, acao: [{ t: 'casa', id: 'apart_cabinda' }] },
      { s: 3, nome: 'Clínica do Petróleo', emoji: '🩺', w: 3, d: 4, h: 40, cor: '#f5f8fa', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'saude', txt: 'Centro de saúde, clínica, farmácia e curandeiro.' }] },
      { s: 4, nome: 'Entrada do Maiombe', emoji: '🌳', w: 4, d: 4, h: 10, cor: '#2f6b33', telhado: 'plano', acao: [{ t: 'lazer', id: 'maiombe' }, { t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }, { t: 'emprego', id: 'guarda_maiombe' }] },
      { s: 5, nome: 'Fronteira do Yema', emoji: '📦', w: 3, d: 5, h: 20, cor: '#6a6a4a', telhado: 'zinco', acao: [{ t: 'info', txt: 'Do outro lado é o Congo. Há quem passe combustível e tabaco… e há a Polícia Fiscal.' }, { t: 'crime', tipos: ['contrabando'] }, { t: 'emprego', id: 'comerciante_fronteira' }] },
      { s: 6, nome: 'Cantina de Cabinda', emoji: '🍲', w: 4, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: ['mwambe', ...CANTINA] }, { t: 'lazer', id: 'bola' }] },
      // dono 4 nov («tenho um emprego, mas não vem a placa do work»): 4 empregos de Cabinda não tinham onde trabalhar
      { s: 7, nome: 'Porto de Cabinda', emoji: '⚓', w: 4, d: 4, h: 26, cor: '#5d6b75', telhado: 'zinco', acao: [{ t: 'emprego', id: 'estivador_cabinda' }] },
    ]
  },
  cadeia: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { arvore: 0.01 },
    lotes: [
      { s: 0, nome: 'Refeitório', emoji: '🥣', w: 5, d: 4, h: 22, cor: '#9aa3ab', telhado: 'zinco', acao: [{ t: 'cadeia', o: 'comer' }] },
      { s: 1, nome: 'Oficina', emoji: '🔨', w: 3, d: 5, h: 24, cor: '#7f8a93', telhado: 'zinco', acao: [{ t: 'cadeia', o: 'trabalhar' }] },
      { s: 2, nome: 'Pátio', emoji: '🏀', w: 5, d: 4, h: 4, cor: '#a9a39a', telhado: 'plano', acao: [{ t: 'cadeia', o: 'treinar' }, { t: 'cadeia', o: 'cartas' }] },
      { s: 4, nome: 'Secretaria', emoji: '📋', w: 4, d: 4, h: 30, cor: '#d8d0c0', telhado: 'plano', acao: [{ t: 'cadeia', o: 'fianca' }, { t: 'cadeia', o: 'precaria' }, { t: 'info', txt: 'Advogados, visitas e fianças. Tudo com muito carimbo.' }] },
      { s: 6, nome: 'Pavilhão A', emoji: '⛓️', w: 5, d: 3, h: 34, cor: '#8a8a8a', telhado: 'plano', acao: [{ t: 'info', txt: 'Celas cheias. Cada um conta a sua história — e todos são inocentes.' }] },
      { s: 13, nome: 'Pavilhão B', emoji: '⛓️', w: 3, d: 4, h: 34, cor: '#8a8a8a', telhado: 'plano', acao: [{ t: 'info', txt: 'Dorme-se mal, mas dorme-se.' }] },
      { s: 12, nome: 'Torre de vigia', emoji: '🗼', w: 2, d: 2, h: 60, cor: '#6a6a6a', telhado: 'plano', acao: [{ t: 'info', txt: 'Nem penses em fugir.' }] },
    ]
  },
  ilha: {
    chao: CH.areia, estradaFora: CH.asfalto, praia: true, decor: { palmeira: 0.12, carro: 0.03 },
    lotes: [
      { s: 2, nome: 'Restaurante Coconuts', emoji: '🐟', w: 4, d: 3, h: 26, cor: '#f2e3c2', telhado: 'zinco', toldo: '#16a3a3', acao: [{ t: 'comida', ids: ['mufete', ...CANTINA] }, { t: 'emprego', id: 'empregado_mesa' }] },
      { s: 3, nome: 'Discoteca Kizomba', emoji: '💃', w: 3, d: 4, h: 30, cor: '#3b1f4a', telhado: 'plano', toldo: '#e86aa6', acao: [{ t: 'lazer', id: 'kizomba' }, { t: 'comida', ids: ['gelada', 'nocal', 'coca_cola', 'moet'] }, { t: 'emprego', id: 'dj' }] },
      { s: 4, nome: 'Prédio Vista Mar', emoji: '🌊', w: 4, d: 4, h: 96, cor: '#f5f1e8', telhado: 'plano', antena: true, acao: [{ t: 'casa', id: 'apart_ilha' }] },
      { s: 11, nome: 'Cais do Mussulo', emoji: '🛥️', w: 3, d: 4, h: 14, cor: '#16a3a3', telhado: 'plano', toldo: '#f5f1e8', acao: [{ t: 'barco' }] },
      { s: 10, nome: 'Cantina da Ilha', emoji: '🍲', w: 4, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 5, nome: 'Jet Ski da Baía', emoji: '🌊', w: 3, d: 3, h: 16, cor: '#ffcb00', telhado: 'plano', toldo: '#cc092f', acao: [{ t: 'info', txt: 'Jet skis alinhados na areia, prontos para voar pela Baía.' }, { t: 'jetski' }] },
      { s: 15, nome: 'Bar da Praia', emoji: '🍹', w: 3, d: 3, h: 20, cor: '#16a3a3', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'comida', ids: [...BAR, 'sumo_maracuja', 'pao_chourico'] }, { t: 'lazer', id: 'bola' }] },
    ]
  },
  kilamba: {
    chao: CH.relva, estradaFora: CH.asfalto, decor: { predio: 0.07, arvore: 0.05, carro: 0.03 },
    lotes: [
      { s: 1, nome: 'Kilamba Fit', emoji: '🏋️', w: 3, d: 4, h: 30, cor: '#2c6fb0', telhado: 'plano', toldo: '#f5b81c', acao: [{ t: 'treino', onde: 'ginasio' }] },
      { s: 5, nome: 'Sede dos Moradores', emoji: '🤝', w: 3, d: 3, h: 22, cor: '#e8c547', telhado: 'zinco', acao: [{ t: 'grupos', tipo: 'associacao' }] },
      { s: 0, nome: 'Escola do Kilamba', emoji: '📚', w: 5, d: 4, h: 40, cor: '#f5b81c', telhado: 'plano', acao: [{ t: 'emprego', id: 'professor' }] },
      { s: 2, nome: 'Prédio Cor-de-rosa', emoji: '🏢', w: 4, d: 4, h: 110, cor: '#e9a3b4', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_kilamba' }] },
      { s: 3, nome: 'Prédio Amarelo', emoji: '🏢', w: 3, d: 4, h: 110, cor: '#f3d36b', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_kilamba' }] },
      { s: 4, nome: 'Churrasqueira do Quintal', emoji: '🍖', w: 4, d: 3, h: 22, cor: '#c0392b', telhado: 'zinco', toldo: '#f5b81c', acao: [{ t: 'comida', ids: ['churrasco', ...CANTINA] }] },
      { s: 6, nome: 'Cantina do Kilamba', emoji: '🍲', w: 4, d: 3, h: 22, cor: '#8fc4e8', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }, { t: 'lazer', id: 'bola' }] },
      { s: 13, nome: 'Prédio Verde', emoji: '🏢', w: 4, d: 4, h: 110, cor: '#9ccf9a', telhado: 'plano', acao: [{ t: 'casa', id: 'apart_kilamba' }] },
    ]
  },
  // FILA 0dn-9 (dono, 6 nov): Camama — bairro calmo a sul, com o cemitério
  camama: {
    chao: CH.terra, estradaFora: CH.terraEstrada, decor: { casinha: 0.07, arvore: 0.07, carro: 0.02 }, telhadoCasinha: 'zinco',
    lotes: [
      { s: 0, nome: 'Cemitério do Camama', emoji: '🪦', w: 5, d: 4, h: 3, cor: '#7d8f6a', telhado: 'plano', campas: true, acao: [{ t: 'cemiterio' }, { t: 'emprego', id: 'coveiro' }] },
      { s: 2, nome: 'Mercado do Camama', emoji: '🧺', w: 4, d: 4, h: 6, cor: '#c9a46a', telhado: 'plano', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 4, nome: 'Bar Última Paragem', emoji: '🍺', w: 4, d: 3, h: 22, cor: '#3b3b47', telhado: 'zinco', toldo: '#7a4b8c', acao: [{ t: 'info', txt: 'Dizem que o Kota Sapalo ainda aparece às sextas para beber uma Cuca.' }, { t: 'comida', ids: BAR }] },
      { s: 6, nome: 'Igreja do Camama', emoji: '⛪', w: 4, d: 4, h: 44, cor: '#f2efe8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 1, nome: 'Casas do Camama', emoji: '🏠', w: 3, d: 4, h: 24, cor: '#e7c9a0', telhado: 'zinco', acao: [{ t: 'casa', id: 'casa_camama' }] },
      { s: 5, nome: 'Cantina da Tia Mingota', emoji: '🍲', w: 3, d: 4, h: 22, cor: '#8fc4e8', telhado: 'zinco', toldo: '#e0313f', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 13, nome: 'Casas da Rua Nova', emoji: '🏠', w: 4, d: 4, h: 24, cor: '#f2e3c2', telhado: 'telha', acao: [{ t: 'casa', id: 'casa_camama' }] },
    ]
  },
  talatona: {
    chao: CH.relva, estradaFora: CH.asfalto, decor: { arvore: 0.06, palmeira: 0.06, carro: 0.05 }, grade: 4,
    lotes: [
      // FILA 0dm-1 (dono, 5 nov): Talatona maior — quarteirões novos à direita e em baixo
      { s: 18, nome: 'Campo de Talatona', emoji: '⚽', w: 5, d: 4, h: 5, cor: '#4f9a3c', telhado: 'plano', acao: [{ t: 'lazer', id: 'bola' }, { t: 'grupos', tipo: 'clube' }, { t: 'emprego', id: 'treinador' }] },
      { s: 19, nome: 'Salão Talatona', emoji: '💇', w: 3, d: 4, h: 30, cor: '#f7d6e0', telhado: 'plano', toldo: '#e86aa6', acao: [{ t: 'emprego', id: 'barbeiro' }, { t: 'emprego', id: 'maquilhador' }] },
      { s: 20, nome: 'Restaurante Panorama', emoji: '🍽️', w: 5, d: 4, h: 40, cor: '#f5f1e8', telhado: 'plano', toldo: '#2a3b55', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 21, nome: 'Café Belas', emoji: '☕', w: 3, d: 4, h: 24, cor: '#c8a27a', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 22, nome: 'Condomínio Belas', emoji: '🏡', w: 5, d: 4, h: 30, cor: '#f2efe6', telhado: 'telha', acao: [{ t: 'casa', id: 'vivenda_talatona' }, { t: 'emprego', id: 'seguranca' }] },
      { s: 23, nome: 'Igreja de Talatona', emoji: '⛪', w: 3, d: 5, h: 46, cor: '#f2efe8', telhado: 'telha', acao: [{ t: 'grupos', tipo: 'igreja' }, { t: 'emprego', id: 'pastor' }] },
      { s: 24, nome: 'Lounge Talatona', emoji: '🍸', w: 5, d: 4, h: 30, cor: '#1f1f1f', telhado: 'plano', toldo: '#d4af37', acao: [{ t: 'comida', ids: [...BAR, 'moet'] }] },
      { s: 25, nome: 'Belas Fit', emoji: '🏋️', w: 3, d: 4, h: 32, cor: '#e0313f', telhado: 'plano', toldo: '#1f1f1f', acao: [{ t: 'treino', onde: 'ginasio' }] },
      { s: 26, nome: 'Loja de Telemóveis', emoji: '📱', w: 5, d: 4, h: 28, cor: '#e9eef2', telhado: 'plano', toldo: '#16a3a3', acao: [{ t: 'itens', cats: ['telemovel'] }] },
      { s: 28, nome: 'Condomínio Jardim', emoji: '🏡', w: 5, d: 4, h: 30, cor: '#efe6d2', telhado: 'telha', acao: [{ t: 'casa', id: 'vivenda_talatona' }] },
      { s: 0, nome: 'Talatona Shopping', emoji: '🛍️', w: 5, d: 4, h: 44, cor: '#eaeaea', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'moda_loja' }, { t: 'lazer', id: 'shopping' }, { t: 'comida', ids: ['jantar_fino', 'gelada', 'sumo_maracuja', 'moet'] }, { t: 'itens' }] },
      { s: 1, nome: 'Casa & Design', emoji: '🛋️', w: 3, d: 4, h: 30, cor: '#1f1f1f', telhado: 'plano', toldo: '#f5b81c', acao: [{ t: 'moveis', loja: 'fina' }] },
      { s: 2, nome: 'Petrolífera', emoji: '🛢️', w: 4, d: 4, h: 130, cor: '#2a3b55', telhado: 'plano', antena: true, acao: [{ t: 'emprego', id: 'engenheiro' }] },
      { s: 3, nome: 'Tech Hub', emoji: '💻', w: 3, d: 4, h: 70, cor: '#16a3a3', telhado: 'plano', acao: [{ t: 'emprego', id: 'programador' }] },
      { s: 4, nome: 'Condomínio Jardim', emoji: '🏡', w: 5, d: 4, h: 30, cor: '#f5f1e8', telhado: 'telha', acao: [{ t: 'casa', id: 'vivenda_talatona' }, { t: 'emprego', id: 'seguranca' }] },
      { s: 7, nome: 'Clínica Palanca Negra', emoji: '🩺', w: 3, d: 5, h: 40, cor: '#f5f8fa', telhado: 'plano', toldo: '#2c6fb0', acao: [{ t: 'saude', txt: 'Clínica privada: rápida, limpa e cara.' }] },
      { s: 5, nome: 'Talatona Gym', emoji: '🏋️', w: 3, d: 4, h: 36, cor: '#1f1f1f', telhado: 'plano', toldo: '#e0313f', acao: [{ t: 'treino', onde: 'ginasio' }] },
      { s: 6, nome: 'Pastelaria', emoji: '🥐', w: 4, d: 3, h: 24, cor: '#f2c6a0', telhado: 'plano', toldo: '#e86aa6', acao: [{ t: 'comida', ids: CANTINA }] },
      { s: 13, nome: 'Condomínio Jardim', emoji: '🏡', w: 4, d: 4, h: 30, cor: '#efe6d2', telhado: 'telha', acao: [{ t: 'casa', id: 'vivenda_talatona' }] },
      { s: 8, nome: 'Stand Automóvel', emoji: '🚗', w: 5, d: 4, h: 24, cor: '#e9eef2', telhado: 'plano', toldo: '#e0313f', antena: true, acao: [{ t: 'info', txt: 'Da carrinha de candongueiro ao jipão 4x4. Test drive? Só se comprares.' }, { t: 'itens', cats: ['veiculo'] }] },
      { s: 10, nome: 'ISPTEC', emoji: '🎓', w: 4, d: 4, h: 64, cor: '#1d3c5e', telhado: 'plano', antena: true, acao: [{ t: 'univ', id: 'isptec' }] },
      { s: 12, nome: 'Universidade Óscar Ribas', emoji: '🎓', w: 4, d: 4, h: 48, cor: '#f2efe6', telhado: 'plano', toldo: '#8a1c2b', acao: [{ t: 'univ', id: 'uor' }] },
      { s: 14, nome: 'Boutique Luxo', emoji: '👗', w: 4, d: 4, h: 34, cor: '#1f1f1f', telhado: 'plano', toldo: '#d4af37', acao: [{ t: 'moda_loja', teste: true }, { t: 'itens', cats: ['moda', 'telemovel'] }, { t: 'moda' }, { t: 'emprego', id: 'estilista' }] },   // 7 nov (dono): a coleção da semana e o guarda-roupa também na Boutique (primeiro no teste)
    ]
  }
};
// 7 nov (dono): «make it every boutique in the game … prices and quality vary per city, different clothes everywhere replaced each week».
// Cada bairro/cidade ganha a sua loja de roupa (primeiro só no site de teste). A coleção da semana de cada sítio vem do servidor.
const MODA_NIVEL = a => ['talatona', 'ilha', 'mussulo'].includes(a) ? 'rica' : ['cazenga', 'viana', 'rangel', 'zango', 'camama'].includes(a) ? 'popular' : 'media';
(function lojasDeRoupa() {   // 9 nov (dono 08:44): «add the boutique from the test site to the live game now» — agora em todos
  const LOJA = { popular: { nome: 'Loja de roupa do bairro', emoji: '👕', cor: '#e0a96d', toldo: '#2a62c9', telhado: 'zinco' },
    media: { nome: 'Boutique', emoji: '👗', cor: '#f3e6d8', toldo: '#7a1f3d', telhado: 'plano' },
    rica: { nome: 'Boutique de luxo', emoji: '💎', cor: '#1f1f1f', toldo: '#d4af37', telhado: 'plano' } };
  for (const [bid, b] of Object.entries(BAIRROS_MAPA)) {
    if (bid === 'cadeia' || !b.lotes) continue;
    const ja = b.lotes.find(l => /Boutique/.test(l.nome)) || (bid === 'talatona' && b.lotes.find(l => (l.acao || []).some(a => a.t === 'moda_loja')));
    if (ja) { if (!ja.acao.some(a => a.t === 'moda_loja')) ja.acao.unshift({ t: 'moda_loja', teste: true }); continue; }
    const n = b.grade || 3, usados = new Set(b.lotes.map(l => l.s));
    let s = -1;
    for (let k = 0; k < n * n * 2; k++) if (k !== 9 && !usados.has(k) && !(b.praia && Math.floor(k / 2) % 3 === 0)) { s = k; break; }
    if (s < 0) continue;
    const L = LOJA[MODA_NIVEL(bid)];
    b.lotes.push({ s, nome: L.nome, emoji: L.emoji, w: 3, d: 3, h: 26, cor: L.cor, telhado: L.telhado, toldo: L.toldo, acao: [{ t: 'moda_loja', teste: true }, { t: 'moda' }] });
  }
})();
// 8 nov 18:08 (dono, FILA 0ex): «in cafes in other cities, please add coffee as well» — um café (com café) em cada cidade fora de Luanda, para espalhar os jogadores
(function cafesNasCidades() {
  const NOMES = { benguela: 'Café da Marginal', huambo: 'Café do Planalto', lubango: 'Café da Huíla', namibe: 'Café do Deserto', malanje: 'Café das Quedas', cabinda: 'Café do Maiombe' };
  for (const [bid, nome] of Object.entries(NOMES)) {
    const b = BAIRROS_MAPA[bid]; if (!b?.lotes || b.lotes.some(l => /caf[eé]/i.test(l.nome))) continue;
    const n = b.grade || 3, usados = new Set(b.lotes.map(l => l.s));
    let s = -1;
    for (let k = 0; k < n * n * 2; k++) if (k !== 9 && !usados.has(k) && !(b.praia && Math.floor(k / 2) % 3 === 0)) { s = k; break; }
    if (s < 0) continue;
    b.lotes.push({ s, nome, emoji: '☕', w: 3, d: 3, h: 24, cor: '#c8a27a', telhado: 'plano', toldo: '#2f8f5b', acao: [{ t: 'comida', ids: CANTINA }] });
  }
})();

/* ---------- 🍲 menus (FILA 0c, 26 out): as comidas e bebidas angolanas da Cinnss espalhadas pelo jogo ----------
   Cada sítio vende só o que faz sentido lá (cantina, restaurante, bar, café, mercado, praia, paragem); os menus são curtos,
   mudam de bairro para bairro e rodam todos os dias. Os pratos especiais de cada sítio (muamba da Maianga, mufete da Ilha…)
   ficam sempre. Fonte das listas: tools/comidas_cinnss.py. Álcool: o servidor só vende a quem confirmou 18+. */
const POOL_COMIDA = {
  rua: ['frango_churrasco', 'paracuca', 'kitaba', 'cocada', 'chamucas', 'pastel_carne', 'pastel_peixe', 'pao_ovo', 'pao_frango', 'banana_pao_assada', 'banana_frita', 'mandioca_frita', 'chikuanga', 'catatos', 'bolinhos', 'bolo_mandioca', 'bolo_ginguba', 'doce_ginguba', 'pe_moleque', 'pao_manteiga', 'cachupa', 'pipocas', 'pincho', 'ginguba', 'pao_chourico', 'milho_assado', 'bombo', 'mikate'],
  casa: ['funge', 'funge_milho', 'funge_bombo', 'pirao', 'muamba', 'muamba_peixe', 'moamba_ginguba', 'calulu_peixe', 'calulu_carne', 'kizaca', 'funge_calulu', 'fumbua', 'jimboa', 'feijao_palma', 'feijao_peixe_seco', 'arroz_feijao', 'arroz_cabidela', 'arroz_frango', 'arroz_peixe', 'peixe_grelhado', 'cacusso', 'caldeirada_peixe', 'caldeirada_cabrito', 'cabrito_assado', 'dobrada', 'feijoada', 'porco_grelhado', 'frango_grelhado', 'bombo_cozido', 'batata_doce', 'banana_pao_cozida', 'milho_cozido', 'matata', 'makayabu', 'peixe_seco', 'feijao_palma_funge', 'carne_guisada', 'massa_frango', 'sopa_peixe'],
  sumo: ['kissangua', 'kissangua_ananas', 'kissangua_arroz', 'sumo_mucua', 'sumo_tamarindo', 'sumo_maracuja', 'sumo_manga', 'sumo_goiaba', 'sumo_maboque', 'sumo_ananas', 'sumo_melancia', 'sumo_limao', 'sumo_cana', 'sumo_caju', 'sumo_ginguba', 'ginguba_drink', 'gasosa', 'fanta', 'coca_cola', 'sumo_tutti'],
  alcool: ['cuca', 'nocal', 'eka', 'ngola', 'gelada', 'maruvo', 'capatica', 'mongozo', 'aguardente', 'vinho_tinto', 'vinho_branco', 'vinho_pacote'],
  cafe: ['pastel_nata', 'pao_manteiga', 'bolo_mandioca', 'bolo_ginguba', 'pao_ovo', 'pao_frango', 'chamucas', 'pastel_carne', 'pastel_peixe', 'bolinhos'],
  petisco: ['pincho', 'ginguba', 'catatos', 'frango_churrasco', 'chamucas', 'mandioca_frita', 'banana_frita', 'kitaba', 'pastel_carne'],
  praia: ['peixe_grelhado', 'cacusso', 'banana_frita', 'frango_churrasco', 'arroz_marisco', 'milho_assado', 'pipocas', 'cocada'],
  fino: ['arroz_marisco', 'cabrito_assado', 'caldeirada_peixe', 'caldeirada_cabrito', 'porco_grelhado', 'cacusso', 'muamba', 'moamba_ginguba', 'feijoada', 'arroz_cabidela'],
};
// sabores da terra (entram primeiro nos menus desses bairros)
const TERRA_COMIDA = {
  cabinda: ['makayabu', 'chikuanga', 'kitaba'], malanje: ['funge_bombo', 'fumbua', 'jimboa'], huambo: ['milho_assado', 'milho_cozido', 'funge_milho'],
  benguela: ['caldeirada_peixe', 'calulu_peixe', 'peixe_grelhado'], namibe: ['peixe_seco', 'feijao_peixe_seco', 'sopa_peixe'], lubango: ['caldeirada_cabrito', 'milho_cozido', 'funge_milho'],
  maianga: ['muamba', 'muamba_peixe'], ilha: ['mufete', 'peixe_grelhado', 'cacusso', 'agua_coco'], mussulo: ['agua_coco', 'arroz_marisco', 'peixe_grelhado'], cazenga: ['catatos', 'kitaba', 'bombo'],
  viana: ['cachupa', 'bombo_cozido', 'chikuanga'], kilamba: ['frango_churrasco', 'arroz_frango'], talatona: ['arroz_marisco', 'pastel_nata'],
};
const MENU_FORMA = {   // [lista, quantos]
  cantina: [['terra', 1], ['casa', 4], ['rua', 1], ['sumo', 2], ['alcool', 1]],
  restaurante: [['terra', 1], ['fino', 3], ['casa', 2], ['sumo', 1], ['alcool', 2]],
  bar: [['alcool', 4], ['sumo', 1], ['petisco', 3]],
  cafe: [['quente', 2], ['cafe', 4], ['sumo', 1]],
  mercado: [['terra', 1], ['rua', 5], ['sumo', 2]],
  praia: [['coco', 1], ['terra', 1], ['praia', 2], ['sumo', 2], ['alcool', 2]],
  paragem: [['rua', 4], ['sumo', 1]],
};
const _todasDoPool = new Set(Object.values(POOL_COMIDA).flat());
function hashTexto(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function menuDe(tipo, bairroId, chave = '', fixos = []) {
  let sm = (hashTexto(bairroId + '|' + tipo + '|' + chave) + DIA_COMIDA * 7919) >>> 0 || 1;   // gerador próprio (este ficheiro também corre sozinho nos testes)
  const r = () => (sm = (Math.imul(sm, 1664525) + 1013904223) >>> 0) / 4294967296, out = [...fixos];
  const tira = (lista, n) => { const l = lista.filter(x => !out.includes(x)); for (let k = 0; k < n && l.length; k++) out.push(l.splice(Math.floor(r() * l.length), 1)[0]); };
  for (const [nome, n] of MENU_FORMA[tipo] || MENU_FORMA.cantina) {
    if (nome === 'terra') tira(TERRA_COMIDA[bairroId] || [], n);
    else if (nome === 'quente') out.push(...['cafe', 'cha_caxinde'].filter(x => !out.includes(x)).slice(0, n));
    else if (nome === 'coco') { if (!out.includes('agua_coco')) out.push('agua_coco'); }
    else tira(POOL_COMIDA[nome] || [], n);
  }
  return out.slice(0, 10);
}
function tipoSitioComida(nome = '', emoji = '') {
  if (/praia|coco/i.test(nome) || emoji === '🏖️') return 'praia';
  if (/caf[eé]|pastelaria|padaria/i.test(nome) || emoji === '☕') return 'cafe';
  if (/bar\b|bar |cantinho|kizomba|discoteca|kota|largo|boate|lounge/i.test(nome) || ['🍺', '🍹', '💃'].includes(emoji)) return 'bar';
  if (/mercado|feira|zunga|praça/i.test(nome) || emoji === '🧺') return 'mercado';
  if (/restaurante|jantar|marisq|grelh/i.test(nome)) return 'restaurante';
  return 'cantina';
}
// LL14 · horários reais (hora de Luanda): discotecas das 21h às 5h, bares das 17h às 3h (o servidor confere a discoteca)
const HORARIOS = { discoteca: [21, 5], bar: [17, 3] };
function horarioLugar(spec) {
  if (!spec) return null;
  const acao = spec.acao || [];
  const tipo = acao.some(a => a.t === 'lazer' && ['kizomba', 'discoteca'].includes(a.id)) ? 'discoteca'
    : acao.some(a => a.t === 'comida') && tipoSitioComida(spec.nome, spec.emoji) === 'bar' ? 'bar' : null;
  if (!tipo) return null;
  const [abre, fecha] = HORARIOS[tipo], h = horaLuanda();
  return { tipo, abre, fecha, aberto: h >= abre || h < fecha };
}
// troca as listas antigas (CANTINA/BAR, iguais em todo o lado) por menus próprios de cada sítio; os especiais ficam
const MENU_PARAGEM = {};
(function menusComida() {
  const genericas = new Set([...CANTINA, ...BAR, ...COMIDA_RODA, ..._todasDoPool]), todos = [];
  for (const [bid, b] of Object.entries(BAIRROS_MAPA)) {
    const sitios = [...(b.lotes || []).map(l => [l, 'L' + l.s]), ...(b.barraca ? [[b.barraca, 'praia']] : [])];
    for (const [l, chave] of sitios) for (const a of l.acao || []) {
      if (a.t !== 'comida') continue;
      const especiais = a.ids.filter(id => !genericas.has(id)), tipo = tipoSitioComida(l.nome, l.emoji);
      a.ids = menuDe(tipo, bid, chave, especiais); todos.push({ tipo, ids: a.ids, n: especiais.length });
    }
    MENU_PARAGEM[bid] = menuDe('paragem', bid, 'paragem'); todos.push({ tipo: 'paragem', ids: MENU_PARAGEM[bid], n: 0 });
  }
  // garantia: todas as comidas e bebidas estão à venda em algum sítio, todos os dias (num sítio do tipo certo)
  const ONDE = { rua: ['paragem', 'mercado', 'cafe'], cafe: ['cafe', 'mercado', 'paragem'], casa: ['cantina', 'restaurante'], fino: ['restaurante', 'cantina'],
    sumo: ['cantina', 'mercado', 'praia', 'cafe'], alcool: ['bar', 'praia', 'cantina', 'restaurante'], petisco: ['bar', 'paragem'], praia: ['praia', 'cantina'] };
  const conta = new Map(); todos.forEach(m => m.ids.forEach(i => conta.set(i, (conta.get(i) || 0) + 1)));
  let k = DIA_COMIDA;
  for (const [pool, ids] of Object.entries(POOL_COMIDA)) for (const id of ids) {
    if (conta.get(id)) continue;
    const alvos = todos.filter(m => (ONDE[pool] || []).includes(m.tipo)); if (!alvos.length) continue;
    for (let t = 0; t < alvos.length; t++) {
      const m = alvos[(k + t) % alvos.length];
      if (m.ids.length < 10) { m.ids.push(id); break; }
      const j = m.ids.findIndex((x, ii) => ii >= m.n && conta.get(x) > 1);     // troca uma que também se vende noutro sítio
      if (j >= 0) { conta.set(m.ids[j], conta.get(m.ids[j]) - 1); m.ids[j] = id; break; }
    }
    k++; conta.set(id, 1);
  }
})();

function loteRect(s, w, d, n = 3) {
  const q = Math.floor(s / 2), lado = s % 2, [qi, qj] = blocoDe(q, n), bx = qi * 11, by = qj * 11;
  if (lado === 0) { w = Math.min(w, 5); d = Math.min(d, 4); return { x: bx, y: by + 8 - d, w, d, porta: 'y', px: bx + Math.floor(w / 2), py: by + 8 }; }
  w = Math.min(w, 3); d = Math.min(d, 5); return { x: bx + 8 - w, y: by, w, d, porta: 'x', px: bx + 8, py: by + Math.floor(d / 2) };
}

function gerarBairro(id) {
  const spec = BAIRROS_MAPA[id];
  const G = gradeDe(id), NQ = G.n, ORIG = G.ORIG, ESTRADAS = G.ESTR;
  const W = G.W, H = G.W, N = W * H;
  const chao = new Uint8Array(N).fill(spec.chao), bloq = new Uint8Array(N), ocupado = new Uint8Array(N);
  const r = rng([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const objetos = [], portas = new Map(), estradas = [];
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) chao[y * W + x] = v; };

  // estradas e passeios
  ESTRADAS.forEach((e, i) => {
    const tipo = i === NQ - 1 ? spec.estradaFora : CH.asfalto;
    for (let k = 0; k < W; k++) { set(k, e, tipo); set(k, e + 1, tipo); set(e, k, tipo); set(e + 1, k, tipo); }
    estradas.push({ eixo: 'h', p: e, tipo }, { eixo: 'v', p: e, tipo });
  });
  for (let qi = 0; qi < NQ; qi++) for (let qj = 0; qj < NQ; qj++) {
    const bx = ORIG[qi], by = ORIG[qj];
    for (let k = 0; k < 9; k++) { set(bx + 8, by + k, CH.passeio); set(bx + k, by + 8, CH.passeio); }
  }
  // Ilha: praia e mar na coluna da esquerda
  if (spec.praia) {
    for (let y = 0; y < H; y++) for (let x = 0; x < 9; x++) { set(x, y, x < 4 ? CH.mar : CH.areia); }
    for (let y = 0; y < H; y++) for (let x = 0; x < 4; x++) bloq[y * W + x] = 1;
  }

  const marca = (x, y, w, d) => { for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) { bloq[j * W + i] = 1; ocupado[j * W + i] = 1; } };

  // paragem (lote 9) — igual em todos os bairros
  const P = loteRect(9, 2, 2);
  objetos.push({ kind: 'paragem', x: P.x, y: P.y, w: 2, d: 2, h: 34, spec: { nome: 'Paragem de candongueiros', emoji: '🚐', acao: [{ t: 'paragem' }, { t: 'comida', zunga: true, ids: MENU_PARAGEM[id] || menuDe('paragem', id, 'paragem') }] }, porta: [P.px, P.py] });
  marca(P.x, P.y, 2, 2);
  objetos.push({ kind: 'carro', x: 20, y: 11, w: 1, d: 2, h: 26, cor: '#f2f2f2', tipo: 'candongueiro', rot: 0 }); marca(20, 11, 1, 2);
  portas.set(P.px + ',' + P.py, objetos[0]);

  // edifícios
  spec.lotes.forEach(l => {
    if (spec.praia && Math.floor(l.s / 2) % 3 === 0) return;
    const R = loteRect(l.s, l.w, l.d, NQ);
    const o = { kind: 'edificio', x: R.x, y: R.y, w: R.w, d: R.d, h: l.h, spec: l, porta: [R.px, R.py], b: { ...l, x: R.x, y: R.y, w: R.w, d: R.d, porta: R.porta } };
    objetos.push(o); marca(R.x, R.y, R.w, R.d); portas.set(R.px + ',' + R.py, o);
  });

  // praia: barracas
  if (spec.praia) {
    [[5, 3], [6, 8], [5, 14], [6, 24], [5, 28]].forEach(([x, y], i) => {
      const o = { kind: 'barraca', x, y, w: 1, d: 1, h: 34, cor: ['#e0313f', '#f5b81c', '#2c6fb0', '#2f8f5b', '#e86aa6'][i], spec: spec.barraca || { nome: 'Praia da Ilha', emoji: '🏖️', acao: [{ t: 'lazer', id: 'praia' }, { t: 'treino', onde: 'correr' }, { t: 'comida', ids: ['gelada'] }] }, porta: [x + 1, y] };
      objetos.push(o); marca(x, y, 1, 1); portas.set((x + 1) + ',' + y, o);
    });
  }

  // 📣 outdoors: canto de baixo à direita de dois quarteirões (os lotes nunca chegam lá)
  let nOut = 0;
  if (id !== 'cadeia') OUTDOOR_QUARTEIROES.forEach(([qi, qj]) => {
    if (nOut >= OUTDOORS_POR_BAIRRO || (spec.praia && qi === 0)) return;
    const x = ORIG[qi] + 6, y = ORIG[qj] + 7;
    if (ocupado[y * W + x] || ocupado[y * W + x + 1]) return;
    const slot = id + '-' + 'ABCDE'[nOut++];
    objetos.push({ kind: 'outdoor', x, y, w: 2, d: 1, h: 78, slot, spec: { nome: 'Outdoor', emoji: '📣', acao: [{ t: 'outdoor', slot }] }, porta: [x, y + 1] });
    marca(x, y, 2, 1);
  });

  // decoração dentro dos quarteirões
  const d = spec.decor;
  for (let qi = 0; qi < NQ; qi++) for (let qj = 0; qj < NQ; qj++) {
    const bx = ORIG[qi], by = ORIG[qj];
    if (spec.praia && qi === 0) {
      for (let y = by; y < by + 9; y++) if (r() < 0.25) { const x = 7 + (r() < 0.5 ? 0 : 1); if (!ocupado[y * W + x] && chao[y * W + x] === CH.areia) { objetos.push({ kind: 'palmeira', x, y, w: 1, d: 1, h: 70 }); marca(x, y, 1, 1); } }
      continue;
    }
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) {
      if (ocupado[y * W + x]) continue;
      const v = r();
      let acc = 0;
      const livre = (w, h) => { for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if (i >= bx + 8 || j >= by + 8 || ocupado[j * W + i]) return false; return true; };
      if (d.casinha && v < (acc += d.casinha) && livre(2, 2)) {
        const cores = ['#e8d9b8', '#d9a066', '#f2e3c2', '#c9d6c2', '#e0b6a8', '#b8cfe0', '#f3e1a0'];
        const cc = { x, y, w: 2, d: 2, h: 22, cor: cores[Math.floor(r() * cores.length)], telhado: spec.telhadoCasinha || 'zinco', porta: r() < 0.5 ? 'x' : 'y' };
        if (cc.telhado === 'zinco' && cc.cor === '#f2e3c2') cc.porta = 'x';   // esta combinação não tem fotografia 3D (tools/modelos/predios.py --novos)
        objetos.push({ kind: 'casinha', x, y, w: 2, d: 2, h: 20 + Math.floor(r() * 8), b: cc });
        objetos[objetos.length - 1].h = objetos[objetos.length - 1].b.h; marca(x, y, 2, 2); continue;
      }
      if (d.predio && v < (acc += d.predio) && livre(3, 3)) {
        const cores = ['#e9a3b4', '#f3d36b', '#9ccf9a', '#8fc4e8', '#f0b27a', '#c5a3e0'];
        objetos.push({ kind: 'casinha', x, y, w: 3, d: 3, h: 100, b: { x, y, w: 3, d: 3, h: 100, cor: cores[Math.floor(r() * cores.length)], telhado: 'plano', porta: 'y' } }); marca(x, y, 3, 3); continue;
      }
      if (d.torre && v < (acc += d.torre) && livre(2, 2)) {
        objetos.push({ kind: 'casinha', x, y, w: 2, d: 2, h: 90 + Math.floor(r() * 60), b: { x, y, w: 2, d: 2, h: 100, cor: ['#5a7d94', '#7d8b99', '#3f5f73', '#a0b4c0'][Math.floor(r() * 4)], telhado: 'plano', porta: 'y', antena: r() < 0.5 } });
        objetos[objetos.length - 1].b.h = objetos[objetos.length - 1].h; marca(x, y, 2, 2); continue;
      }
      if (d.palmeira && v < (acc += d.palmeira)) { objetos.push({ kind: 'palmeira', x, y, w: 1, d: 1, h: 70 }); marca(x, y, 1, 1); continue; }
      if (d.arvore && v < (acc += d.arvore)) { objetos.push({ kind: 'arvore', x, y, w: 1, d: 1, h: 56, cor: ['#4f8f3a', '#3f7d33', '#5f9e45'][Math.floor(r() * 3)] }); marca(x, y, 1, 1); continue; }
      if (d.baobab && v < (acc += d.baobab)) { objetos.push({ kind: 'baobab', x, y, w: 1, d: 1, h: 60 }); marca(x, y, 1, 1); continue; }
      if (d.carro && v < (acc += d.carro) && livre(1, 2)) { objetos.push({ kind: 'carro', x, y, w: 1, d: 2, h: 22, cor: ['#c0392b', '#2c6fb0', '#eeeeee', '#222222', '#7f8c8d', '#f5b81c'][Math.floor(r() * 6)], rot: 0 }); marca(x, y, 1, 2); continue; }
    }
  }
  // FILA 0dn-9: campas no cemitério (decoração, por cima do relvado; não bloqueiam)
  for (const l of spec.lotes || []) if (l.campas) {
    const R = loteRect(l.s, l.w, l.d, NQ);
    for (let yy = R.y + 1; yy < R.y + R.d; yy += 1) for (let xx = R.x + (yy % 2); xx < R.x + R.w; xx += 2) objetos.push({ kind: 'campa', x: xx, y: yy, w: 0.4, d: 0.2, h: 14, z0: l.h, cor: ['#c9ccd1', '#b9bdc4', '#d8d4cb'][(xx + yy) % 3] });
  }
  // candeeiros nos passeios (não bloqueiam)
  for (let qi = 0; qi < NQ; qi++) for (let qj = 0; qj < NQ; qj++) {
    const bx = ORIG[qi], by = ORIG[qj];
    [[bx + 8, by + 1], [bx + 8, by + 6], [bx + 2, by + 8], [bx + 6, by + 8]].forEach(([x, y]) => {
      if (spec.praia && qi === 0) return;
      if (portas.has(x + ',' + y) || portas.has((x + 1) + ',' + y) || portas.has(x + ',' + (y + 1))) return;
      objetos.push({ kind: 'candeeiro', x, y, w: 0.2, d: 0.2, h: 50, ox: 0.4 });
    });
  }
  return { tipo: 'bairro', id, W, H, chao, bloq, objetos, portas, estradas, estr: ESTRADAS, spawn: [P.px, P.py + 1], paragem: [P.px, P.py] };
}

/* ---------- desenho do chão (feito uma vez para uma imagem) ---------- */
function desenhaChaoBairro(ctx, cena) {
  const { W, H, chao } = cena, r = rng(99), ESTRADAS = cena.estr || ESTRADAS_BASE;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = chao[y * W + x];
    let cor = COR_CHAO[c];
    const v = (r() - 0.5) * 0.06;
    losango(ctx, x, y, 1, 1, shade(cor, v), 0, c === CH.passeio || c === CH.praca ? 'rgba(0,0,0,.06)' : null);
    if (c === CH.relva && r() < 0.25) { const [px, py] = iso(x + r(), y + r()); ctx.fillStyle = shade(cor, -0.18); ctx.fillRect(px, py - 3, 1.5, 3); ctx.fillRect(px + 3, py - 2, 1.5, 2); }
    if ((c === CH.terra || c === CH.terraEstrada) && r() < 0.3) { const [px, py] = iso(x + r(), y + r()); ctx.fillStyle = shade(cor, -0.2); ctx.beginPath(); ctx.ellipse(px, py, 2, 1, 0, 0, 7); ctx.fill(); }
    if (c === CH.mar) { const [px, py] = iso(x + 0.3 + r() * 0.4, y + 0.3 + r() * 0.4); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.quadraticCurveTo(px, py - 3, px + 6, py); ctx.stroke(); }
    if (c === CH.areia && x === 4) { const A = iso(4, y), B = iso(4, y + 1); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
  }
  // marcas na estrada (só asfalto)
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  cena.estradas.forEach(e => {
    if (e.tipo !== CH.asfalto) return;
    for (let k = 0; k < W; k += 1) {
      if (ESTRADAS.some(p => k >= p && k <= p + 1)) continue;
      if (e.eixo === 'h') { if (cena.chao[(e.p) * W + k] !== CH.asfalto) continue; const a = iso(k + 0.2, e.p + 1), b = iso(k + 0.7, e.p + 1); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      else { if (cena.chao[k * W + e.p] !== CH.asfalto) continue; const a = iso(e.p + 1, k + 0.2), b = iso(e.p + 1, k + 0.7); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
  });
  // passadeiras junto aos cruzamentos
  ESTRADAS.forEach(px => ESTRADAS.forEach(py => {
    for (let i = 0; i < 2; i++) for (let s = 0; s < 4; s++) {
      if (cena.chao[(py + i) * W + Math.min(W - 1, px + 2)] === CH.asfalto) { const a = iso(px + 2 + s * 0.22, py + i + 0.1), b = iso(px + 2 + s * 0.22, py + i + 0.9); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
  }));
}

/* ---------- interior da casa ---------- */
const CHAOS = {
  cimento: ['#b9b4ac', '#aea9a1'], madeira: ['#b07a46', '#a06c3b'], mosaico: ['#e8e4dc', '#d0ccc4'],
  xadrez: ['#f2f2f2', '#2a2a2a'], tijoleira: ['#c8704a', '#b8623e'], alcatifa: ['#7a4b8c', '#70437f']
};
const CORES_PAREDE = ['#e9dcc4', '#f5f1e8', '#f3d36b', '#e9a3b4', '#9ccf9a', '#8fc4e8', '#f0b27a', '#c5a3e0', '#e0313f', '#2a3b55', '#16a3a3', '#5a3a22'];

// paredes interiores (planta da casa): devolve os quadrados ocupados por paredes num andar
function tilesParede(planta, andar) {
  const out = [];
  for (const s of planta?.paredes?.[andar] || []) {
    const [x1, y1] = s.a, [x2, y2] = s.b;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      if (!(s.p || []).some(([px, py]) => px === x && py === y)) out.push([x, y, y1 === y2 && x1 !== x2 ? 'h' : x1 === x2 && y1 !== y2 ? 'v' : 'p']);
  }
  return out;
}
function gerarCasa(casa, mobilia, moveis, dono, andar = 0) {
  const W = casa.largura, H = casa.fundo, bloq = new Uint8Array(W * H);
  const planta = casa.planta || null, andares = planta?.andares || 1;
  andar = Math.min(andar, andares - 1);
  const objetos = [], ocupado = new Set();
  const dirs = new Map();
  for (const [x, y, dr] of tilesParede(planta, andar)) { const k = x + ',' + y; dirs.set(k, (dirs.get(k) || '') + dr); }
  for (const [k, dr] of dirs) { const [x, y] = k.split(',').map(Number); if (x < W && y < H) { bloq[y * W + x] = 1; ocupado.add(k); objetos.push({ kind: 'parede', x, y, w: 1, d: 1, h: 34, dir: dr }); } }
  if (planta?.escada) {
    const [ex, ey, ew, ed] = planta.escada;
    for (let x = ex; x < ex + ew; x++) for (let y = ey; y < ey + ed; y++) { bloq[y * W + x] = 1; ocupado.add(x + ',' + y); }
    objetos.push({ kind: 'escada', x: ex, y: ey, w: ew, d: ed, h: 44, andar, andares });
  }
  mobilia.filter(m => m.x != null && (m.andar || 0) === andar).forEach(m => {
    const mv = moveis.find(v => v.id === m.movel); if (!mv) return;
    const w = m.rot % 2 ? mv.d : mv.w, d = m.rot % 2 ? mv.w : mv.d;
    objetos.push({ kind: 'movel', x: m.x, y: m.y, w, d, h: alturaMovel(mv.tipo), mv, mb: m, pisavel: mv.pisavel });
    if (!mv.pisavel) for (let i = m.x; i < m.x + w; i++) for (let j = m.y; j < m.y + d; j++) if (i < W && j < H) bloq[j * W + i] = 1;
  });
  return { tipo: 'casa', id: 'casa:' + dono.id, dono, casa, W, H, bloq, objetos, portas: new Map(), spawn: [W - 2, 0], saida: andar ? null : [W - 2, 0], parede: dono.parede || '#e9dcc4', chao: dono.chao || 'cimento', andar, andares, ocupado, salas: planta?.salas?.[andar] || [] };
}
function alturaMovel(tipo) { return ({ cama: 26, sofa: 26, tv: 40, som: 30, mesa: 20, cadeira: 26, fogao: 24, frigorifico: 52, chuveiro: 60, banheira: 22, jacuzzi: 20, balcao: 24, expositor: 30, passadeira: 22, halteres: 20, multibanco: 44, sanita: 30, lavatorio: 30, microondas: 26, bancada: 22, maquina: 30, estante: 52, ventoinha: 50, ac: 44, planta: 26, palmeira: 40, candeeiro: 46, tapete: 1, quadro: 38 })[tipo] || 20; }

function desenhaChaoCasa(ctx, cena) {
  const { W, H } = cena, [c1, c2] = CHAOS[cena.chao] || CHAOS.cimento;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let cor = cena.chao === 'madeira' ? (y % 2 ? c1 : c2) : cena.chao === 'alcatifa' ? c1 : ((x + y) % 2 ? c1 : c2);
    losango(ctx, x, y, 1, 1, cor, 0, 'rgba(0,0,0,.08)');
  }
  // paredes do fundo (desenhadas na vista: são sempre as de trás, rode a casa como rodar)
  const WH = 74, p = cena.parede, W0 = W, H0 = H;
  { const W = VR % 2 ? H0 : W0, H = VR % 2 ? W0 : H0;
  poly(ctx, [isoV(0, 0), isoV(W, 0), isoV(W, 0, WH), isoV(0, 0, WH)], shade(p, -0.05));
  poly(ctx, [isoV(0, 0), isoV(0, H), isoV(0, H, WH), isoV(0, 0, WH)], shade(p, -0.2));
  // rodapé
  poly(ctx, [isoV(0, 0), isoV(W, 0), isoV(W, 0, 5), isoV(0, 0, 5)], shade(p, -0.35));
  poly(ctx, [isoV(0, 0), isoV(0, H), isoV(0, H, 5), isoV(0, 0, 5)], shade(p, -0.45));
  // topo das paredes
  poly(ctx, [isoV(0, 0, WH), isoV(W, 0, WH), isoV(W, -0.25, WH), isoV(-0.25, -0.25, WH), isoV(-0.25, H, WH), isoV(0, H, WH)], shade(p, -0.5));
  // janela na parede da esquerda
  const jy = Math.floor(H / 2) - 0.5;
  poly(ctx, [isoV(0, jy, 28), isoV(0, jy + 1.4, 28), isoV(0, jy + 1.4, 58), isoV(0, jy, 58)], '#8fd0f0');
  poly(ctx, [isoV(0, jy + 0.68, 28), isoV(0, jy + 0.72, 28), isoV(0, jy + 0.72, 58), isoV(0, jy + 0.68, 58)], '#fff');
  }
  // nomes das divisões, pintados no chão
  // 0r (play-test): numa plaquinha escura com letras brancas, para se ler em qualquer chão (tijoleira, madeira…)
  ctx.font = '800 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const s of cena.salas || []) { const [lx, ly] = iso(s.x + 0.5, s.y + 0.5), txt = (typeof tr === 'function' ? tr(s.n) : s.n).toUpperCase(), w = ctx.measureText(txt).width + 12;
    ctx.fillStyle = 'rgba(20,16,12,.55)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx - w / 2, ly - 8, w, 16, 8); else ctx.rect(lx - w / 2, ly - 8, w, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fillText(txt, lx, ly + 0.5); }
  ctx.textBaseline = 'alphabetic';
  if (cena.andar) { // no 1.º andar não há porta para a rua: há outra janela
    const jx = Math.floor((VR % 2 ? H : W) / 2) - 0.5;
    poly(ctx, [isoV(jx, 0, 28), isoV(jx + 1.4, 0, 28), isoV(jx + 1.4, 0, 58), isoV(jx, 0, 58)], '#8fd0f0');
    return;
  }
  if (VR) return;   // a porta da rua só se desenha na vista normal (sai-se com o botão Sair)
  // porta (parede de trás, em x = W-2)
  const dx = W - 2;
  poly(ctx, [iso(dx + 0.1, 0), iso(dx + 0.9, 0), iso(dx + 0.9, 0, 52), iso(dx + 0.1, 0, 52)], '#5a3a22');
  poly(ctx, [iso(dx + 0.15, 0, 2), iso(dx + 0.85, 0, 2), iso(dx + 0.85, 0, 48), iso(dx + 0.15, 0, 48)], '#7a5232');
  const [kx, ky] = iso(dx + 0.75, 0, 26); ctx.fillStyle = '#f5b81c'; ctx.beginPath(); ctx.arc(kx, ky, 2, 0, 7); ctx.fill();
  // tapete de entrada
  losango(ctx, dx + 0.1, 0.05, 0.8, 0.6, '#6b4b25');
}
