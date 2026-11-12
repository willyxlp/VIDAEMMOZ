# Vida na Banda — versao local (inspirada)

## Arrancar
1. Cria um projeto novo no Supabase (so para desenvolvimento).
2. Edita `config.js` com o Project URL e a chave publishable/anon (Project Settings -> API). Nunca a service_role.
3. Supabase -> SQL Editor -> cola e corre `supabase/migrations/001_core.sql`.
4. Supabase -> Authentication: Site URL = `http://localhost:8000`; Email: desliga "Confirm email"; Captcha: desligado.
5. Na pasta do projeto: `py -m http.server 8000` e abre http://localhost:8000 (usa `localhost`).

## O que e original e o que e novo
- Original (do download): index.html, css/, js/ (exceto os 2 stubs), com 3 alteracoes: `js/erros.js` (liga ao teu Supabase em localhost), `js/jogo.js` linhas 4-5 (sem URL de producao) e `index.html` (carrega config.js) e `js/medir.js` (pixel do dono removido).
- Novo: `js/ajuda_dados.js` e `js/comida_fotos.js` (stubs vazios), `supabase/migrations/*`, `docs/backend_contract.md`, `config.js`, `.nojekyll`, `.gitignore`.
- `_arquivo/index.outra-versao.html` e a segunda copia do index (guardada, nao usada).

## Em falta (nao veio no download)
img/ (todas as imagens), i18n/*.json, manifest.webmanifest, sw.js, catalogo do jogo (bairros, empregos...), codigo das funcoes do servidor.
