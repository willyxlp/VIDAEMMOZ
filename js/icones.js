/* ============================================================
   Vida na Banda — ÍCONES e TEMAS
   Ícones de linha (SVG) no lugar dos emojis da interface.
   Temas: A «Noite de Kizomba» (escuro, por defeito), B «Samakaka»
   (claro, panos angolanos) e Automático (B de dia, A de noite).
   ============================================================ */
const ICONES = {
  objetivos: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM12 12h.01',
  muxima: 'M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7z',
  jornal: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4',
  eu: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  social: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M17 15c2 .5 4 2 4 5',
  familia: 'M3 11l9-7 9 7M5 10v10h14V10M12 17s-3-2-3-4a1.5 1.5 0 0 1 3-.5a1.5 1.5 0 0 1 3 .5c0 2-3 4-3 4z',
  saude: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  mensagens: 'M4 5h16v11H8l-4 4z',
  justica: 'M12 3v18M6 21h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  governo: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18',
  grupos: 'M7 11l3-3 4 1 3-3 4 4-6 6-3-1-3 3-5-5zM3 10l4 1M14 9l-2 2',
  vagas: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  empresas: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01',
  banco: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18',
  dolares: 'M12 3v18M16 7.5c0-1.5-1.8-2.5-4-2.5s-4 1-4 3 2 2.5 4 3 4 1 4 3-1.8 3-4 3-4-1-4-2.5',
  kumbu: 'M4 12h14M13 6l6 6-6 6',
  imoveis: 'M8 15a4 4 0 1 1 0-8a4 4 0 0 1 0 8zM11 11h10M18 11v3M21 11v3',
  loja: 'M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0',
  ouro: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v10M15 9.5h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9',
  radio: 'M4 9h16v11H4zM7 9l9-5M8 14.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 13h2M15 16h2',
  lavras: 'M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5zM6 21h12',
  sorte: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01',
  ranking: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  tempo: 'M8 8a4 4 0 0 1 7.5 1.5M8 4V2M3.5 5.5L2 4M2 10h2M7 20h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 20z',
  noticias: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  procurar: 'M11 18a7 7 0 1 0 0-14a7 7 0 0 0 0 14zM20 20l-4-4',
  ajuda: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
  admin: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  gelo: 'M12 2v20M4 7l16 10M20 7L4 17M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3.5 10.5L7 9l-.5-3.5M20.5 13.5L17 15l.5 3.5M20.5 10.5L17 9l.5-3.5M3.5 13.5L7 15l-.5 3.5',
  // HUD
  energia: 'M13 2L4 14h7l-1 8 9-12h-7z',
  fome: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2',
  humor: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01',
  vida: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  telefone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  falar: 'M4 5h16v11H8l-4 4z',
  casa: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  decorar: 'M14 4l6 6-3 3-6-6zM11 7l-7 7v4h4l7-7',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  centrar: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM12 1v4M12 19v4M1 12h4M19 12h4',
  voltar: 'M15 5l-7 7 7 7',
  fechar: 'M6 6l12 12M18 6L6 18',
  mapa: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  tema: 'M12 3a9 9 0 1 0 9 9c0-1-1-1.5-2-1.5h-2a2 2 0 0 1-2-2V8a5 5 0 0 0-3-5zM7.5 11h.01M9 7h.01M7.5 15h.01',
  // usados no lugar dos emojis espalhados pelo jogo
  pin: 'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5z',
  bebe: 'M12 21a8 8 0 1 0 0-16a8 8 0 0 0 0 16zM12 5c0-1.5 1-2.5 2-2.5M9.5 12h.01M14.5 12h.01M10 16c1.2 1 2.8 1 4 0',
  estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  bola: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 7l4 3-1.5 4.5h-5L8 10zM12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5l-2.5 4M8 10L3.5 8.5',
  martelo: 'M15 4l5 5-3 3-5-5zM13.5 8.5L4 18l2 2 9.5-9.5',
  carro: 'M5 17h14v-5l-2-5H7l-2 5zM5 12h14M7.5 17v2M16.5 17v2M8 14.5h.01M16 14.5h.01',
  autocarro: 'M5 3h14v14H5zM5 11h14M8 17v3M16 17v3M8 14h.01M16 14h.01M9 6h6',
  comboio: 'M6 3h12v13H6zM6 10h12M8 16l-2 4M16 16l2 4M9 13h.01M15 13h.01',
  mota: 'M2 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM16 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM5 17l4-6h5l5 6M14 11l-1-4h3',
  aviao: 'M2 13l8-2 4-7h2l-1.5 7.5L21 13v2l-6.5-1L13 20h-2l-.5-5.5L2 15z',
  barco: 'M3 15l2 5h14l2-5zM12 3v12M12 4l7 9h-7',
  palmeira: 'M12 21c0-5 .5-9 2-12M14 9c-2-3-6-3-8-1M14 9c1-3 5-4 7-2M14 9c3 0 5 2 5 5M14 9c-3 0-6 2-6 5M5 21h14',
  festa: 'M4 20l4-12 8 8zM14 4l1 2M19 9l2-1M17 3l-1 3M20 14l-2-1',
  presente: 'M4 10h16v4H4zM5 14h14v7H5zM12 10v11M12 10c-2-4-6-4-6-1s6 1 6 1zM12 10c2-4 6-4 6-1s-6 1-6 1z',
  dinheiro: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM6 10v4M18 10v4',
  forca: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  mao: 'M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-3 7-7 7-3 0-5-2-6.5-4.5L5 12a1.5 1.5 0 0 1 3 1',
  megafone: 'M3 10v4h3l9 5V5L6 10zM18 9a4 4 0 0 1 0 6',
  ok: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM8 12l3 3 5-6',
  mascara: 'M3 9c3-2 15-2 18 0 0 5-3 8-6 8-2 0-2-2-3-2s-1 2-3 2c-3 0-6-3-6-8zM8 11h2M14 11h2',
  gema: 'M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 16 3-16',
  musica: 'M9 18V5l11-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM14 16a3 3 0 1 0 6 0a3 3 0 1 0-6 0z',
  fogo: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z',
  igreja: 'M12 2v5M10 4h4M5 21V12l7-5 7 5v9M10 21v-5h4v5M3 21h18',
  cadeado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  chave: 'M4 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM12 12h9M18 12v3M21 12v3',
  bilhete: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10',
  livro: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3',
  rodar: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  capelo: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
  documento: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6',
  caixa: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  grafico: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-6',
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 12a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v6H2zM5 18v2M19 18v2',
  porta: 'M6 21V3h12v18M3 21h18M14 12h.01',
  sol: 'M12 17a5 5 0 1 0 0-10a5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  chuva: 'M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3',
  agua: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  mundo: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  faca: 'M19 3L7 15l2 2L21 5zM9 17l-5 4M7 15l-3 3',
  luz: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  aviso: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  roupa: 'M8 3L3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  relogio: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 7v5l3 2',
  tv: 'M3 6h18v12H3zM8 21h8M12 18v3',
  fabrica: 'M3 21V10l6 3V10l6 3V6h6v15zM7 17h2M12 17h2M17 17h2',
  pata: 'M12 20c-3 0-5-1.5-5-3.5S9.5 12 12 12s5 2.5 5 4.5-2 3.5-5 3.5zM4.5 10.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM16.5 10.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM8 6.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM13 6.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z',
  olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6z',
  anel: 'M6 15a6 6 0 1 0 12 0a6 6 0 1 0-12 0zM9 5l3-3 3 3-3 4z',
  som: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
  mudo: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  ponto: 'M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z',
  cama: 'M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-8v1M6 11a2 2 0 1 0 0-.01',
  peixe: 'M3 12c3-5 10-6 14-1l4-3v8l-4-3c-4 5-11 4-14-1zM8 11h.01',
  carrinho: 'M3 4h2l2.5 11h11L21 7H7M9 20a1 1 0 1 0 0-.01M18 20a1 1 0 1 0 0-.01',
  arte: 'M12 3a9 9 0 1 0 9 9c0-1-1-1.5-2-1.5h-2a2 2 0 0 1-2-2V8a5 5 0 0 0-3-5zM7.5 11h.01M9 7h.01M7.5 15h.01',
  coroa: 'M3 8l4 4 5-7 5 7 4-4-2 11H5zM5 21h14',
  crianca: 'M12 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM8 22v-6l-2-4 4-2h4l4 2-2 4v6',
};

// emoji → ícone (o emoji sem o seletor de variação)
const EMOJI_IC = (() => { const m = new Map(), g = {"casa": "🏠🏡🏘️🏚️🛖🧹", "empresas": "🏢🏬🏙️🏰🏗️🏭", "fabrica": "", "telefone": "📱📲📞", "pin": "📍🗺️🧭", "bebe": "👶🍼🤰", "crianca": "🧒🧸🧑‍🎓", "governo": "🏛️🗳️🎗️", "estrela": "⭐🌟✨🕶️", "bola": "⚽🏀", "martelo": "🔨🧱⛏️🔧", "carro": "🛣️🚗🚕🚚🚘", "autocarro": "🚐🚌🚏", "comboio": "🚂", "mota": "🛵🏍️", "admin": "🛡️👮🚔🚨", "palmeira": "⛰️🏖️🌴🏝️🌊🌅🌄🏞️🏜️", "festa": "🎉🎂🎈🎊", "presente": "🎁", "dinheiro": "💳💰💵💸🪙👛🐷🏧🧾💴💶", "ouro": "", "saude": "🏥🩺🚑💊🤒🤢🤧🦟", "vida": "❤️💛🤍💞💕💌🌹😍💔🥀💖💘", "forca": "🏃💪🏋️", "anel": "💍", "fome": "🍲🍗🍖🥣🍳🥪🥐🍽️🥬🫘🥔🍺🍹☕🍔🍕🍚🥘", "lavras": "🌺🌱🌿🌳🌽🌾", "banco": "🏦", "mao": "🤝👋🙏✋🙋👍👆", "loja": "🛍️", "carrinho": "🛒", "aviao": "✈️🚀🛩️", "falar": "💬🗨️", "megafone": "📢📣🎤", "ok": "✅☑️", "mascara": "🤫🔪", "gema": "💎", "musica": "💃🎶🎵🎚️📻🕺", "som": "🔊🔔", "mudo": "🔇", "fogo": "🔥", "igreja": "⛪✝️🕊️", "cadeado": "⛓️🔒🔐🔓", "chave": "🔑", "sorte": "🎲🎰🎡", "gelo": "🧊❄️", "bilhete": "🎟️🎫", "livro": "📚📖📝🏫", "capelo": "🎓🎒", "documento": "📜📄📂📁📋📰🪧", "caixa": "📦", "vagas": "💼👔", "grafico": "📈📉📊", "sofa": "🛋️", "porta": "🚪", "sol": "☀️", "tempo": "⛅🌤️🌫️", "chuva": "🌧️⛈️", "agua": "💧🚰🚱🚿", "mundo": "🌍🌎🌏", "justica": "⚖️", "luz": "🕯️💡🔌⚡⛽", "aviso": "⚠️❗🚩⛔🚫🔞❓", "arte": "🎨", "barco": "🛥️🚢🚤⛵🛟🎣", "ranking": "🏆", "coroa": "👑", "social": "👨‍👩‍👧👫🧑‍🤝‍🧑👥🤝", "eu": "👤🧑🧔🧕💇🤳", "roupa": "💅👗👕", "humor": "😂😤🙂😄😌😎😊😫😞😠😇😱😕😴😰", "relogio": "⏳⏸⏭⌛", "tv": "📺🎬", "pata": "🐶🐕🐈🐔🥚", "olho": "👀", "muxima": "📸", "mais": "🟢", "menos": "🔴", "fechar": "🗑️", "peixe": "🐟🦞", "mensagens": "⌨️✉️📨", "noticias": "", "cama": "🛏️", "dolares": ""};
  // 8 nov (auditoria): browsers antigos sem Intl.Segmenter paravam o ficheiro todo → parte os emojis à mão
  const partes = typeof Intl !== 'undefined' && Intl.Segmenter ? (s => [...new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(s)].map(x => x.segment))
    : (s => s.match(/\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*|./gu) || []);
  for (const [ic, lista] of Object.entries(g)) for (const segment of partes(lista)) m.set(segment.replace(/\uFE0F/g, ''), ic);
  return m; })();
// 0am (dono, 30–31 out): cada tipo de coisa tem a sua cor e forma (as palavras ficam) — ver docs/design/linguagem-visual.md
const CAT_ICONE = (() => { const m = {}, g = {
  dinheiro: 'dinheiro ouro banco loja carrinho gema dolares presente ranking coroa',
  perigo: 'aviso admin fogo mascara saude cadeado justica',
  viagem: 'carro autocarro comboio mota aviao barco pin mundo',
  amor: 'vida anel bebe crianca festa',
  corpo: 'fome forca cama humor agua lavras peixe pata',
  trabalho: 'vagas empresas fabrica martelo livro capelo grafico documento governo',
  pessoas: 'social mao falar mensagens eu telefone megafone igreja muxima' };
  for (const [c, l] of Object.entries(g)) for (const n of l.split(' ')) m[n] = c; return m; })();
const catDoIcone = ic => CAT_ICONE[ic] || null;
const icDoEmoji = e => EMOJI_IC.get(e.replace(/\uFE0F/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')) || null;
const icone = (nome, tam = 22, cls = '') =>
  `<svg class="ico ${cls}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONES[nome] || ICONES.ajuda}"/></svg>`;
// troca <span data-ic="nome"></span> pelo ícone (para o HTML estático)
function preencherIcones(raiz = document) {
  raiz.querySelectorAll('[data-ic]').forEach(el => { if (!el.firstElementChild) el.innerHTML = icone(el.dataset.ic, +(el.dataset.tam || 22)); });
}

/* ---------- instalar como app (PWA) ---------- */
let pedidoInstalar = null;
const jaInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function mostrarBotoesInstalar() {
  const pode = !jaInstalada();
  document.querySelectorAll('[data-instalar]').forEach(b => b.classList.toggle('hide', !pode));
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; mostrarBotoesInstalar(); });
addEventListener('appinstalled', () => { pedidoInstalar = null; mostrarBotoesInstalar(); });
async function instalarApp() {
  if (pedidoInstalar) { pedidoInstalar.prompt(); try { await pedidoInstalar.userChoice; } catch { } pedidoInstalar = null; mostrarBotoesInstalar(); return; }
  const passos = ehIOS()
    ? `<p class="m" data-tr-html>No Safari: toca em <b>Partilhar</b> (o quadrado com a seta para cima), depois em <b>Adicionar ao ecrã principal</b> e confirma com <b>Adicionar</b>.</p>`
    : `<p class="m" data-tr-html>No Chrome: toca no menu <b>⋮</b> (os três pontos em cima, à direita) e escolhe <b>Instalar app</b> ou <b>Adicionar ao ecrã principal</b>.</p>`;
  const el = sheet(`<h3>${ehIOS() ? 'Instalar no iPhone' : 'Instalar no telemóvel'}</h3>${passos}
    <p class="m">O Vida na Banda fica no teu ecrã como uma app, sem barra do navegador.</p>
    <button class="btn full" type="button" data-fechar-inst>Percebi</button>`);
  el.querySelector('[data-fechar-inst]').onclick = () => { const m = el.closest('.tel-modal'); if (m) m.remove(); else fecharSheets(); };
}
document.addEventListener('click', e => { if (e.target.closest?.('[data-instalar]')) instalarApp(); });
document.addEventListener('DOMContentLoaded', mostrarBotoesInstalar);
if ('serviceWorker' in navigator && !/^(127\.0\.0\.1|localhost)$/.test(location.hostname))
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { }));

/* ---------- temas ---------- */
const TEMAS = [['a', 'Noite de Kizomba'], ['b', 'Samakaka'], ['auto', 'Automático (dia/noite)']];
let temaEscolhido = (() => { try { return localStorage.getItem('vel_tema') || 'a'; } catch { return 'a'; } })();
const horaTema = () => new Date(Date.now() + 3600e3).getUTCHours();
const temaEfetivo = () => temaEscolhido === 'auto' ? (horaTema() >= 6 && horaTema() < 18 ? 'b' : 'a') : temaEscolhido;
function aplicarTema() {
  const t = temaEfetivo();
  if (document.documentElement.dataset.tema !== t) document.documentElement.dataset.tema = t;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'b' ? '#ffffff' : '#121014';
}
function mudarTema(v) {
  temaEscolhido = v; try { localStorage.setItem('vel_tema', v); } catch { }
  aplicarTema();
  document.querySelectorAll('select[data-tema]').forEach(s => { s.value = v; });
}
function seletorTemaHTML() {
  return `<label class="lingua"><span aria-hidden="true">${icone('tema', 16)}</span><select data-tema aria-label="Tema">${TEMAS.map(([c, n]) => `<option value="${c}" ${c === temaEscolhido ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
}
document.addEventListener('change', e => { if (e.target.matches?.('select[data-tema]')) mudarTema(e.target.value); });
aplicarTema();
setInterval(aplicarTema, 60000);
document.addEventListener('DOMContentLoaded', () => preencherIcones());
