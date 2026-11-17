-- =============================================================
-- VIDA EM MOZ — Phone Functionalities SQL
-- Cole este bloco inteiro no Supabase SQL Editor e execute.
-- Inclui: Família, Vagas, Imóveis, Social/Dating, Jornal,
--         Banco, Câmbio, Transferir, Universidade, Muxima
-- =============================================================

-- ─────────────────────────────────────────────────
-- EXTENSÕES
-- ─────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────────
-- TABELAS BASE (criadas se não existirem)
-- ─────────────────────────────────────────────────

-- jogadores (núcleo)
create table if not exists jogadores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text unique,
  bairro        text not null default 'polana_canico',
  kumbu         bigint not null default 500,          -- meticais
  energia       int not null default 100,
  fome          int not null default 100,
  felicidade    int not null default 80,
  saude         int not null default 100,
  reputacao     int not null default 0,
  nivel_edu     int not null default 0,
  emprego       text,
  nivel_emp     int not null default 1,
  stress        int not null default 0,
  solidao       int not null default 0,
  aparencia     jsonb default '{}',
  casa          text,
  lar           text,
  par           uuid references jogadores(id),
  casado_em     timestamptz,
  nasceu_em     date,
  preso_ate     timestamptz,
  detencao      boolean default false,
  ouro          int not null default 0,
  dolares       int not null default 0,
  online_em     timestamptz,
  criado_em     timestamptz default now()
);

-- relações (amigos, namoro, família)
create table if not exists relacoes (
  id         uuid primary key default gen_random_uuid(),
  de         uuid not null references jogadores(id) on delete cascade,
  para       uuid not null references jogadores(id) on delete cascade,
  tipo       text not null,   -- 'amigo','namoro','casado','familiar','bloqueado'
  score      int default 0,
  criado_em  timestamptz default now(),
  unique(de, para, tipo)
);

-- posts do Muxima
create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null references jogadores(id) on delete cascade,
  texto       text not null,
  foto        text,            -- URL ou base64 thumbnail
  bairro      text,
  gostos      int default 0,
  viral       boolean default false,
  patrocinado boolean default false,
  marca       text,
  criado_em   timestamptz default now()
);

-- comentários
create table if not exists comentarios (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references posts(id) on delete cascade,
  autor     uuid not null references jogadores(id) on delete cascade,
  texto     text not null,
  criado_em timestamptz default now()
);

-- seguir
create table if not exists seguir (
  seguidor   uuid not null references jogadores(id) on delete cascade,
  seguido    uuid not null references jogadores(id) on delete cascade,
  criado_em  timestamptz default now(),
  primary key(seguidor, seguido)
);

-- mensagens diretas
create table if not exists dms (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null references jogadores(id) on delete cascade,
  para        uuid not null references jogadores(id) on delete cascade,
  texto       text not null,
  lido        boolean default false,
  criado_em   timestamptz default now()
);

-- sms do jogo (notificações, eventos)
create table if not exists sms (
  id          uuid primary key default gen_random_uuid(),
  jogador_id  uuid not null references jogadores(id) on delete cascade,
  remetente   text not null default 'Sistema',
  texto       text not null,
  lido        boolean default false,
  criado_em   timestamptz default now()
);

-- eventos (feed de notificações)
create table if not exists eventos (
  id          uuid primary key default gen_random_uuid(),
  jogador_id  uuid not null references jogadores(id) on delete cascade,
  tipo        text not null,
  dados       jsonb default '{}',
  criado_em   timestamptz default now()
);

-- pedidos (amizade, namoro, casamento)
create table if not exists pedidos (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null references jogadores(id) on delete cascade,
  para        uuid not null references jogadores(id) on delete cascade,
  tipo        text not null,   -- 'amizade','namoro','casamento','bebe','adocao'
  estado      text not null default 'pendente',
  dados       jsonb default '{}',
  criado_em   timestamptz default now()
);

-- filhos
create table if not exists filhos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  pai         uuid references jogadores(id),
  mae         uuid references jogadores(id),
  bairro      text not null default 'polana_canico',
  nasceu_em   date not null default current_date,
  idade       int not null default 0,
  escola      boolean default false,
  saude       int default 100,
  felicidade  int default 100,
  criado_em   timestamptz default now()
);

-- propriedades (imóveis)
create table if not exists propriedades (
  id          text primary key,
  bairro      text not null,
  tipo        text not null,   -- 'quarto','t1','t2','vivenda','machamba'
  preco_compra bigint not null,
  renda_dia   bigint not null,
  dono        uuid references jogadores(id),
  inquilino   uuid references jogadores(id),
  arrendado_em timestamptz,
  mobiliada   boolean default false,
  criado_em   timestamptz default now()
);

-- mobília
create table if not exists mobilia (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null references jogadores(id) on delete cascade,
  propriedade text references propriedades(id),
  tipo        text not null,
  nome        text not null,
  x           int default 0,
  y           int default 0,
  rot         int default 0,
  cor         text,
  criado_em   timestamptz default now()
);

-- empresas
create table if not exists empresas (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null references jogadores(id),
  nome        text not null,
  tipo        text not null,   -- 'cantina','salao','loja','chapas','discoteca','construtora','importadora'
  bairro      text not null,
  caixa       bigint default 0,
  nivel       int default 1,
  criado_em   timestamptz default now()
);

-- empregados de empresa
create table if not exists empregados (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  jogador_id  uuid not null references jogadores(id),
  cargo       text not null default 'ajudante',
  salario_dia bigint default 500,
  entrada_em  timestamptz default now()
);

-- lavras / machambas
create table if not exists lavras (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null references jogadores(id),
  bairro      text not null,
  cultura     text not null default 'milho',
  fase        text default 'plantada',
  plantada_em timestamptz default now(),
  pronta_em   timestamptz,
  colhida     boolean default false
);

-- banco (contas e empréstimos)
create table if not exists banco_contas (
  jogador_id  uuid primary key references jogadores(id) on delete cascade,
  poupanca    bigint default 0,
  emprestimo  bigint default 0,
  emp_data    timestamptz,
  emp_vence   timestamptz,
  criado_em   timestamptz default now()
);

-- câmbio (histórico)
create table if not exists cambio_hist (
  id          uuid primary key default gen_random_uuid(),
  jogador_id  uuid not null references jogadores(id),
  tipo        text not null,   -- 'compra','venda'
  moeda       text not null default 'USD',
  mzn         bigint not null,
  amount      int not null,
  taxa        numeric(10,2) not null,
  criado_em   timestamptz default now()
);

-- transferências
create table if not exists transferencias (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null references jogadores(id),
  para        uuid not null references jogadores(id),
  valor       bigint not null,
  nota        text,
  criado_em   timestamptz default now()
);

-- universidade (matrículas e cursos)
create table if not exists univ_matriculas (
  id          uuid primary key default gen_random_uuid(),
  jogador_id  uuid not null references jogadores(id),
  curso       text not null,
  univ        text not null,
  semestre    int not null default 1,
  concluido   boolean default false,
  pago_ate    timestamptz,
  criado_em   timestamptz default now()
);

-- lotaria e sorte
create table if not exists lotaria (
  id          uuid primary key default gen_random_uuid(),
  jogador_id  uuid not null references jogadores(id),
  bilhete     text not null,
  sorteio_em  date not null default current_date,
  premio      bigint default 0,
  ganhou      boolean default false,
  criado_em   timestamptz default now()
);

-- jornal (notícias geradas)
create table if not exists jornal_noticias (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  corpo       text not null,
  categoria   text not null default 'geral',
  bairro      text,
  imagem      text,
  semana      int not null,
  ano         int not null,
  criado_em   timestamptz default now()
);

-- crimes e apreensões
create table if not exists crimes (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid references jogadores(id),
  vitima      uuid references jogadores(id),
  tipo        text not null,
  valor       bigint default 0,
  resolvido   boolean default false,
  criado_em   timestamptz default now()
);

-- ─────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────
create index if not exists idx_posts_autor     on posts(autor);
create index if not exists idx_posts_bairro    on posts(bairro);
create index if not exists idx_posts_criado    on posts(criado_em desc);
create index if not exists idx_eventos_jog     on eventos(jogador_id, criado_em desc);
create index if not exists idx_dms_de_para     on dms(de, para);
create index if not exists idx_dms_para        on dms(para, lido);
create index if not exists idx_pedidos_para    on pedidos(para, estado);
create index if not exists idx_relacoes_de     on relacoes(de);
create index if not exists idx_relacoes_para   on relacoes(para);
create index if not exists idx_propriedades_bairro on propriedades(bairro);
create index if not exists idx_emp_empresa     on empregados(empresa_id);

-- ─────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────
alter table jogadores        enable row level security;
alter table relacoes         enable row level security;
alter table posts            enable row level security;
alter table comentarios      enable row level security;
alter table seguir           enable row level security;
alter table dms              enable row level security;
alter table sms              enable row level security;
alter table eventos          enable row level security;
alter table pedidos          enable row level security;
alter table filhos           enable row level security;
alter table propriedades     enable row level security;
alter table mobilia          enable row level security;
alter table empresas         enable row level security;
alter table empregados       enable row level security;
alter table lavras           enable row level security;
alter table banco_contas     enable row level security;
alter table cambio_hist      enable row level security;
alter table transferencias   enable row level security;
alter table univ_matriculas  enable row level security;
alter table lotaria          enable row level security;
alter table jornal_noticias  enable row level security;
alter table crimes           enable row level security;

-- jogadores: cada um vê o seu; todos vêm o perfil público
create policy "jogadores_self" on jogadores
  for all using (auth.uid() = id);
create policy "jogadores_publico" on jogadores
  for select using (true);

-- posts: criador gere; todos leem
create policy "posts_leitura" on posts for select using (true);
create policy "posts_escrever" on posts for insert with check (auth.uid() = autor);
create policy "posts_apagar"   on posts for delete using (auth.uid() = autor);
create policy "posts_atualizar" on posts for update using (auth.uid() = autor);

-- comentários: todos leem; autenticados comentam
create policy "coments_leitura"   on comentarios for select using (true);
create policy "coments_inserir"   on comentarios for insert with check (auth.uid() = autor);
create policy "coments_apagar"    on comentarios for delete using (auth.uid() = autor);

-- seguir
create policy "seguir_leitura" on seguir for select using (true);
create policy "seguir_inserir" on seguir for insert with check (auth.uid() = seguidor);
create policy "seguir_apagar"  on seguir for delete using (auth.uid() = seguidor);

-- DMs: só participantes
create policy "dms_ver" on dms for select using (auth.uid() = de or auth.uid() = para);
create policy "dms_enviar" on dms for insert with check (auth.uid() = de);

-- SMS: só o destinatário
create policy "sms_ver" on sms for select using (auth.uid() = jogador_id);

-- eventos: só o jogador
create policy "eventos_ver" on eventos for select using (auth.uid() = jogador_id);

-- pedidos
create policy "pedidos_ver"    on pedidos for select using (auth.uid() = de or auth.uid() = para);
create policy "pedidos_enviar" on pedidos for insert with check (auth.uid() = de);
create policy "pedidos_gerir"  on pedidos for update using (auth.uid() = de or auth.uid() = para);

-- relações
create policy "relacoes_ver"   on relacoes for select using (auth.uid() = de or auth.uid() = para);
create policy "relacoes_gerir" on relacoes for all using (auth.uid() = de);

-- filhos: pais veem
create policy "filhos_ver" on filhos for select using (auth.uid() = pai or auth.uid() = mae);

-- propriedades: todos leem; RPC gere escrita
create policy "props_leitura" on propriedades for select using (true);

-- mobília: dono gere
create policy "mobilia_dono" on mobilia for all using (auth.uid() = dono);
create policy "mobilia_ver"  on mobilia for select using (true);

-- empresas: dono gere; todos leem
create policy "empresas_leitura" on empresas for select using (true);
create policy "empresas_dono"    on empresas for all using (auth.uid() = dono);

-- empregados
create policy "emps_ver"  on empregados for select using (true);
create policy "emps_gerir" on empregados for all using (
  auth.uid() = jogador_id or
  auth.uid() = (select dono from empresas where id = empresa_id)
);

-- lavras: dono gere
create policy "lavras_dono" on lavras for all using (auth.uid() = dono);
create policy "lavras_ver"  on lavras for select using (true);

-- banco: próprio jogador
create policy "banco_self" on banco_contas for all using (auth.uid() = jogador_id);

-- câmbio: próprio jogador
create policy "cambio_self" on cambio_hist for all using (auth.uid() = jogador_id);

-- transferências: participantes
create policy "transf_ver" on transferencias
  for select using (auth.uid() = de or auth.uid() = para);

-- universidade: próprio jogador
create policy "univ_self" on univ_matriculas for all using (auth.uid() = jogador_id);

-- lotaria: próprio jogador
create policy "lotaria_self" on lotaria for all using (auth.uid() = jogador_id);

-- jornal: todos leem
create policy "jornal_leitura" on jornal_noticias for select using (true);

-- crimes: participantes
create policy "crimes_ver" on crimes
  for select using (auth.uid() = autor or auth.uid() = vitima);

-- ─────────────────────────────────────────────────
-- FUNÇÕES AUXILIARES
-- ─────────────────────────────────────────────────

-- helper: id do jogador autenticado
create or replace function meu_id()
returns uuid language sql stable security definer as $$
  select id from jogadores where id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — ARRANQUE E ESTADO
-- ─────────────────────────────────────────────────

-- estado geral do jogador (chamado ao carregar o jogo)
create or replace function estado()
returns jsonb language plpgsql security definer as $$
declare
  j   jogadores%rowtype;
  bc  banco_contas%rowtype;
  res jsonb;
begin
  select * into j from jogadores where id = auth.uid();
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;

  select * into bc from banco_contas where jogador_id = j.id;

  -- atualizar última vez online
  update jogadores set online_em = now() where id = j.id;

  res := to_jsonb(j) || jsonb_build_object(
    'banco', coalesce(to_jsonb(bc), '{}'),
    'seguidores', (select count(*) from seguir where seguido = j.id),
    'seguindo',   (select count(*) from seguir where seguidor = j.id),
    'posts_count', (select count(*) from posts where autor = j.id)
  );
  return res;
end;
$$;

-- criar personagem (registo)
create or replace function criar_personagem(
  p_nome     text,
  p_bairro   text default 'polana_canico',
  p_aparenca jsonb default '{}'
) returns jsonb language plpgsql security definer as $$
declare
  novo_id uuid := auth.uid();
  j       jogadores%rowtype;
begin
  if novo_id is null then
    return jsonb_build_object('erro', 'sem_auth');
  end if;
  if exists (select 1 from jogadores where id = novo_id) then
    return jsonb_build_object('erro', 'ja_existe');
  end if;

  insert into jogadores (id, nome, bairro, aparencia, nasceu_em)
  values (novo_id, p_nome, p_bairro, p_aparenca, current_date)
  returning * into j;

  -- criar conta bancária
  insert into banco_contas (jogador_id) values (novo_id) on conflict do nothing;

  -- evento de boas-vindas
  insert into sms (jogador_id, remetente, texto)
  values (novo_id, 'Vida em Moz', 'Bem-vindo/a a Maputo! A vida é uma luta — mas tem graça. 🌴');

  return jsonb_build_object('jogador', to_jsonb(j), 'ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — MUXIMA (REDE SOCIAL)
-- ─────────────────────────────────────────────────

-- feed do muxima (posts do bairro + seguidos)
create or replace function muxima_feed(
  p_bairro   text default null,
  p_pagina   int  default 0,
  p_limite   int  default 20
) returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select
        p.id, p.texto, p.foto, p.bairro, p.gostos, p.viral,
        p.patrocinado, p.marca, p.criado_em,
        jsonb_build_object(
          'id', j.id, 'nome', j.nome, 'aparencia', j.aparencia
        ) as autor,
        (select count(*) from comentarios c where c.post_id = p.id) as n_coments,
        exists(select 1 from seguir s where s.seguidor = uid_me and s.seguido = p.autor) as sigo
      from posts p
      join jogadores j on j.id = p.autor
      where
        (p_bairro is null or p.bairro = p_bairro)
        or p.autor in (select seguido from seguir where seguidor = uid_me)
      order by p.criado_em desc
      limit p_limite offset p_pagina * p_limite
    ) r
  );
end;
$$;

-- publicar post
create or replace function publicar_post(
  p_texto    text,
  p_foto     text default null,
  p_bairro   text default null
) returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  novo   posts%rowtype;
  fans   int;
begin
  if length(p_texto) > 500 then
    return jsonb_build_object('erro', 'texto_longo');
  end if;

  insert into posts (autor, texto, foto, bairro)
  values (uid_me, p_texto, p_foto, p_bairro)
  returning * into novo;

  -- check viral (> 50 gostos simulados inicialmente com random)
  select count(*) into fans from seguir where seguido = uid_me;
  if fans > 200 and random() < 0.1 then
    update posts set viral = true where id = novo.id;
  end if;

  return jsonb_build_object('post', to_jsonb(novo), 'ok', true);
end;
$$;

-- gostar de post
create or replace function gostar(p_post_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  novos  int;
begin
  update posts set gostos = gostos + 1 where id = p_post_id
  returning gostos into novos;
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  -- check viral
  if novos >= 50 then update posts set viral = true where id = p_post_id; end if;
  return jsonb_build_object('gostos', novos, 'ok', true);
end;
$$;

-- comentar
create or replace function comentar(p_post_id uuid, p_texto text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  novo   comentarios%rowtype;
begin
  insert into comentarios (post_id, autor, texto)
  values (p_post_id, uid_me, p_texto)
  returning * into novo;
  return jsonb_build_object('comentario', to_jsonb(novo), 'ok', true);
end;
$$;

-- apagar post
create or replace function apagar_post(p_post_id uuid)
returns jsonb language plpgsql security definer as $$
begin
  delete from posts where id = p_post_id and autor = auth.uid();
  if not found then return jsonb_build_object('erro', 'nao_autorizado'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- seguir / deixar de seguir jogador
create or replace function seguir_jogador(p_alvo uuid, p_seguir boolean default true)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  if p_seguir then
    insert into seguir (seguidor, seguido) values (uid_me, p_alvo) on conflict do nothing;
  else
    delete from seguir where seguidor = uid_me and seguido = p_alvo;
  end if;
  return jsonb_build_object(
    'seguidores', (select count(*) from seguir where seguido = p_alvo),
    'ok', true
  );
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — MENSAGENS (DMs e SMS)
-- ─────────────────────────────────────────────────

-- enviar DM
create or replace function enviar_dm(p_para uuid, p_texto text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  nova   dms%rowtype;
begin
  insert into dms (de, para, texto)
  values (uid_me, p_para, p_texto)
  returning * into nova;
  return jsonb_build_object('dm', to_jsonb(nova), 'ok', true);
end;
$$;

-- ler DMs com alguém
create or replace function ler_dms(p_outro uuid, p_pagina int default 0)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  -- marcar como lidos
  update dms set lido = true
  where para = uid_me and de = p_outro and lido = false;

  return (
    select jsonb_agg(row_to_json(r) order by r.criado_em asc)
    from (
      select d.*, j.nome as de_nome
      from dms d join jogadores j on j.id = d.de
      where (d.de = uid_me and d.para = p_outro)
         or (d.de = p_outro and d.para = uid_me)
      order by d.criado_em desc
      limit 50 offset p_pagina * 50
    ) r
  );
end;
$$;

-- enviar mensagem (alias compatível com código legado)
create or replace function enviar_mensagem(p_para uuid, p_texto text)
returns jsonb language sql security definer as $$
  select enviar_dm(p_para, p_texto);
$$;

-- ─────────────────────────────────────────────────
-- RPCs — FAMÍLIA
-- ─────────────────────────────────────────────────

-- estado da família (par, filhos, pedidos)
create or replace function familia_estado()
returns jsonb language plpgsql security definer as $$
declare
  uid_me  uuid := auth.uid();
  j       jogadores%rowtype;
  par_j   jogadores%rowtype;
  fs      jsonb;
  peds    jsonb;
begin
  select * into j from jogadores where id = uid_me;

  if j.par is not null then
    select * into par_j from jogadores where id = j.par;
  end if;

  select jsonb_agg(to_jsonb(f)) into fs
  from filhos f
  where f.pai = uid_me or f.mae = uid_me;

  select jsonb_agg(jsonb_build_object(
    'id', p.id, 'tipo', p.tipo, 'estado', p.estado,
    'de', jsonb_build_object('id', jd.id, 'nome', jd.nome),
    'criado_em', p.criado_em
  )) into peds
  from pedidos p
  join jogadores jd on jd.id = p.de
  where p.para = uid_me and p.estado = 'pendente';

  return jsonb_build_object(
    'par',    case when par_j.id is not null then to_jsonb(par_j) else null end,
    'filhos', coalesce(fs, '[]'),
    'pedidos_pendentes', coalesce(peds, '[]'),
    'casado_em', j.casado_em
  );
end;
$$;

-- pedir casamento
create or replace function pedir_casamento(p_para uuid)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  if exists (select 1 from pedidos where de = uid_me and para = p_para and tipo = 'casamento' and estado = 'pendente') then
    return jsonb_build_object('erro', 'ja_enviado');
  end if;
  insert into pedidos (de, para, tipo) values (uid_me, p_para, 'casamento');
  return jsonb_build_object('ok', true);
end;
$$;

-- responder pedido (aceitar/rejeitar)
create or replace function casamento_por_decidir(p_pedido_id uuid, p_aceitar boolean)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  ped    pedidos%rowtype;
begin
  select * into ped from pedidos
  where id = p_pedido_id and para = uid_me and estado = 'pendente';
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;

  update pedidos set estado = case when p_aceitar then 'aceite' else 'recusado' end
  where id = p_pedido_id;

  if p_aceitar and ped.tipo = 'casamento' then
    update jogadores set par = ped.de,  casado_em = now() where id = uid_me;
    update jogadores set par = uid_me,  casado_em = now() where id = ped.de;

    insert into relacoes (de, para, tipo) values (uid_me, ped.de, 'casado') on conflict do nothing;
    insert into relacoes (de, para, tipo) values (ped.de, uid_me, 'casado') on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'aceite', p_aceitar);
end;
$$;

-- ter bebé
create or replace function ter_bebe(p_nome text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  novo   filhos%rowtype;
begin
  select * into j from jogadores where id = uid_me;
  if j.par is null then return jsonb_build_object('erro', 'sem_par'); end if;
  if j.kumbu < 20000 then return jsonb_build_object('erro', 'sem_dinheiro'); end if;

  update jogadores set kumbu = kumbu - 20000 where id = uid_me;

  insert into filhos (nome, pai, mae, bairro)
  values (
    p_nome,
    case when j.id < j.par then j.id else j.par end,
    case when j.id < j.par then j.par else j.id end,
    j.bairro
  )
  returning * into novo;

  return jsonb_build_object('filho', to_jsonb(novo), 'ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — VAGAS E EMPREGO
-- ─────────────────────────────────────────────────

-- lista de vagas disponíveis no bairro
create or replace function vagas_bairro(p_bairro text default null)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
begin
  select * into j from jogadores where id = uid_me;

  -- Maputo job market — Mozambican context
  return jsonb_build_array(
    jsonb_build_object('id','zungueiro','nome','Zungueiro/a','salario_dia',300,'req_edu',0,'req_rep',0,'bairro','todos','emoji','🛒','desc','Vende no mercado informal. Sem requisitos.'),
    jsonb_build_object('id','chapa_cobrador','nome','Cobrador de Chapa','salario_dia',500,'req_edu',0,'req_rep',0,'bairro','todos','emoji','🚐','desc','Chama passageiros e cobra a viagem.'),
    jsonb_build_object('id','pescador','nome','Pescador/a','salario_dia',600,'req_edu',0,'req_rep',5,'bairro','costa_do_sol','emoji','🎣','desc','Na Costa do Sol, pesca de madrugada.'),
    jsonb_build_object('id','mecânico','nome','Mecânico/a','salario_dia',1200,'req_edu',1,'req_rep',10,'bairro','maxaquene','emoji','🔧','desc','Oficina no Maxaquene.'),
    jsonb_build_object('id','cozinheiro','nome','Cozinheiro/a','salario_dia',1000,'req_edu',1,'req_rep',5,'bairro','todos','emoji','👨‍🍳','desc','Cantinas e restaurantes em Maputo.'),
    jsonb_build_object('id','professor','nome','Professor/a','salario_dia',2500,'req_edu',3,'req_rep',20,'bairro','todos','emoji','📚','desc','Escola pública. Exige Licenciatura.'),
    jsonb_build_object('id','enfermeiro','nome','Enfermeiro/a','salario_dia',3000,'req_edu',3,'req_rep',20,'bairro','todos','emoji','🩺','desc','Hospital Central de Maputo.'),
    jsonb_build_object('id','programador','nome','Programador/a','salario_dia',8000,'req_edu',4,'req_rep',30,'bairro','sommerschield','emoji','💻','desc','Tech startups na Baixa e Sommerschield.'),
    jsonb_build_object('id','medico','nome','Médico/a','salario_dia',15000,'req_edu',5,'req_rep',50,'bairro','todos','emoji','👨‍⚕️','desc','Clínica privada. Exige Medicina.'),
    jsonb_build_object('id','engenheiro','nome','Engenheiro/a','salario_dia',20000,'req_edu',5,'req_rep',60,'bairro','baixa','emoji','⚙️','desc','Empresas de infraestrutura. Projetos nacionais.'),
    jsonb_build_object('id','seguranca','nome','Segurança','salario_dia',800,'req_edu',0,'req_rep',0,'bairro','todos','emoji','🛡️','desc','Condomínios e centros comerciais.'),
    jsonb_build_object('id','jornalista','nome','Jornalista','salario_dia',5000,'req_edu',3,'req_rep',40,'bairro','baixa','emoji','📰','desc','Rádio Moçambique ou STV.')
  );
end;
$$;

-- pegar emprego
create or replace function pegar_emprego(p_emprego_id text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
begin
  select * into j from jogadores where id = uid_me;

  update jogadores set emprego = p_emprego_id, nivel_emp = 1
  where id = uid_me;

  insert into eventos (jogador_id, tipo, dados)
  values (uid_me, 'emprego', jsonb_build_object('emprego', p_emprego_id));

  return jsonb_build_object('ok', true, 'emprego', p_emprego_id);
end;
$$;

-- pedir demissão
create or replace function pedir_demissao()
returns jsonb language plpgsql security definer as $$
begin
  update jogadores set emprego = null, nivel_emp = 1 where id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — IMÓVEIS
-- ─────────────────────────────────────────────────

-- listar imóveis disponíveis para arrendar/comprar
create or replace function imoveis_disponiveis(
  p_bairro text default null,
  p_tipo   text default null
) returns jsonb language plpgsql security definer as $$
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select
        p.*,
        case when p.dono is not null then
          jsonb_build_object('id', j.id, 'nome', j.nome)
        else null end as info_dono
      from propriedades p
      left join jogadores j on j.id = p.dono
      where
        (p_bairro is null or p.bairro = p_bairro)
        and (p_tipo is null or p.tipo = p_tipo)
      order by p.renda_dia asc
      limit 50
    ) r
  );
end;
$$;

-- arrendar casa
create or replace function arrendar_casa(p_prop_id text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  prop   propriedades%rowtype;
begin
  select * into j    from jogadores     where id = uid_me;
  select * into prop from propriedades  where id = p_prop_id;

  if not found then return jsonb_build_object('erro', 'imovel_nao_encontrado'); end if;
  if prop.inquilino is not null then return jsonb_build_object('erro', 'ja_arrendado'); end if;
  if j.kumbu < prop.renda_dia * 7 then return jsonb_build_object('erro', 'sem_dinheiro'); end if;

  -- primeira semana de renda
  update jogadores set
    kumbu = kumbu - (prop.renda_dia * 7),
    casa  = p_prop_id
  where id = uid_me;

  update propriedades set
    inquilino    = uid_me,
    arrendado_em = now()
  where id = p_prop_id;

  return jsonb_build_object('ok', true, 'imovel', to_jsonb(prop));
end;
$$;

-- comprar casa
create or replace function comprar_casa(p_prop_id text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  prop   propriedades%rowtype;
begin
  select * into j    from jogadores     where id = uid_me;
  select * into prop from propriedades  where id = p_prop_id;

  if not found then return jsonb_build_object('erro', 'imovel_nao_encontrado'); end if;
  if prop.dono is not null then return jsonb_build_object('erro', 'ja_comprado'); end if;
  if j.kumbu < prop.preco_compra then return jsonb_build_object('erro', 'sem_dinheiro'); end if;

  update jogadores set kumbu = kumbu - prop.preco_compra, lar = p_prop_id where id = uid_me;
  update propriedades set dono = uid_me, inquilino = uid_me where id = p_prop_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- colocar imóvel à venda (apenas dono)
create or replace function colocar_imovel_venda(p_prop_id text, p_preco bigint)
returns jsonb language plpgsql security definer as $$
begin
  update propriedades
  set preco_compra = p_preco
  where id = p_prop_id and dono = auth.uid();
  if not found then return jsonb_build_object('erro', 'nao_autorizado'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — BANCO
-- ─────────────────────────────────────────────────

-- estado da conta bancária
create or replace function banco_estado()
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  bc     banco_contas%rowtype;
  j      jogadores%rowtype;
begin
  select * into j  from jogadores    where id = uid_me;
  select * into bc from banco_contas where jogador_id = uid_me;

  if not found then
    insert into banco_contas (jogador_id) values (uid_me) returning * into bc;
  end if;

  return jsonb_build_object(
    'carteira',   j.kumbu,
    'poupanca',   bc.poupanca,
    'emprestimo', bc.emprestimo,
    'emp_vence',  bc.emp_vence,
    'total',      j.kumbu + bc.poupanca
  );
end;
$$;

-- depositar na poupança
create or replace function banco_depositar(p_valor bigint)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  if p_valor <= 0 then return jsonb_build_object('erro', 'valor_invalido'); end if;

  update jogadores    set kumbu    = kumbu    - p_valor where id = uid_me and kumbu >= p_valor;
  if not found then return jsonb_build_object('erro', 'sem_dinheiro'); end if;

  insert into banco_contas (jogador_id, poupanca) values (uid_me, p_valor)
  on conflict (jogador_id) do update set poupanca = banco_contas.poupanca + p_valor;

  return jsonb_build_object('ok', true, 'depositado', p_valor);
end;
$$;

-- levantar da poupança
create or replace function banco_levantar(p_valor bigint)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  update banco_contas set poupanca = poupanca - p_valor
  where jogador_id = uid_me and poupanca >= p_valor;
  if not found then return jsonb_build_object('erro', 'sem_saldo'); end if;

  update jogadores set kumbu = kumbu + p_valor where id = uid_me;
  return jsonb_build_object('ok', true, 'levantado', p_valor);
end;
$$;

-- pedir empréstimo (Banco da Baixa)
create or replace function banco_pedir_emprestimo(p_valor bigint)
returns jsonb language plpgsql security definer as $$
declare
  uid_me  uuid := auth.uid();
  bc      banco_contas%rowtype;
  max_emp bigint := 500000;
begin
  select * into bc from banco_contas where jogador_id = uid_me;
  if bc.emprestimo > 0 then return jsonb_build_object('erro', 'ja_tem_emprestimo'); end if;
  if p_valor > max_emp then return jsonb_build_object('erro', 'valor_maximo', 'max', max_emp); end if;

  update banco_contas set
    emprestimo = p_valor,
    emp_data   = now(),
    emp_vence  = now() + interval '7 days'
  where jogador_id = uid_me;

  update jogadores set kumbu = kumbu + p_valor where id = uid_me;

  return jsonb_build_object('ok', true, 'emprestimo', p_valor, 'vence_em', now() + interval '7 days');
end;
$$;

-- pagar empréstimo
create or replace function banco_pagar_emprestimo()
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  bc     banco_contas%rowtype;
  total  bigint;
begin
  select * into bc from banco_contas where jogador_id = uid_me;
  if bc.emprestimo = 0 then return jsonb_build_object('erro', 'sem_emprestimo'); end if;

  -- 1.5% por dia de juros
  total := bc.emprestimo + round(bc.emprestimo * 0.015 *
    extract(epoch from (now() - bc.emp_data)) / 86400);

  update jogadores set kumbu = kumbu - total where id = uid_me and kumbu >= total;
  if not found then return jsonb_build_object('erro', 'sem_dinheiro', 'total', total); end if;

  update banco_contas set emprestimo = 0, emp_data = null, emp_vence = null
  where jogador_id = uid_me;

  return jsonb_build_object('ok', true, 'pago', total);
end;
$$;

-- juros diários da poupança (chamado pelo cron ou pelo arranque)
create or replace function banco_juros_diarios()
returns void language plpgsql security definer as $$
begin
  -- 0.5% por dia (primeiro milhão)
  update banco_contas
  set poupanca = poupanca + round(least(poupanca, 1000000) * 0.005)
  where poupanca > 0;
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — CÂMBIO (USD / EUR / ZAR)
-- ─────────────────────────────────────────────────

-- taxa de câmbio do dia (simulada com volatilidade)
create or replace function cambio_hoje()
returns jsonb language plpgsql stable security definer as $$
declare
  seed numeric := extract(doy from current_date) + extract(year from current_date) * 365;
  usd  numeric := 63.5 + ((seed * 7919) % 100) / 100.0 * 4;   -- 63.5–67.5 MZN/USD
  eur  numeric := 70.0 + ((seed * 6271) % 100) / 100.0 * 5;   -- 70–75 MZN/EUR
  zar  numeric := 3.4  + ((seed * 3511) % 100) / 1000.0 * 0.5; -- 3.4–3.9 MZN/ZAR
begin
  return jsonb_build_object(
    'USD', jsonb_build_object('compra', round(usd, 2), 'venda', round(usd * 1.025, 2)),
    'EUR', jsonb_build_object('compra', round(eur, 2), 'venda', round(eur * 1.025, 2)),
    'ZAR', jsonb_build_object('compra', round(zar, 3), 'venda', round(zar * 1.025, 3)),
    'data', current_date
  );
end;
$$;

-- comprar moeda estrangeira
create or replace function cambio_comprar(
  p_moeda   text,
  p_amount  int,
  p_oficial boolean default true
) returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  taxa   numeric;
  custo  bigint;
  taxa_j jsonb;
  col    text;
begin
  select * into j from jogadores where id = uid_me;
  taxa_j := cambio_hoje();

  if p_moeda = 'USD' then
    taxa := (taxa_j->'USD'->'venda')::numeric;
    col  := 'dolares';
    if p_oficial and p_amount > 200 then
      return jsonb_build_object('erro', 'limite_200_USD_oficial');
    end if;
  elsif p_moeda = 'EUR' then
    taxa := (taxa_j->'EUR'->'venda')::numeric;
    col  := 'dolares';   -- armazenado como dolares para simplificar
  else
    return jsonb_build_object('erro', 'moeda_invalida');
  end if;

  -- kinguila: +3% mas sem limite
  if not p_oficial then taxa := taxa * 1.03; end if;

  custo := round(taxa * p_amount)::bigint;

  if j.kumbu < custo then return jsonb_build_object('erro', 'sem_dinheiro', 'precisa', custo); end if;

  update jogadores set
    kumbu   = kumbu   - custo,
    dolares = dolares + p_amount
  where id = uid_me;

  insert into cambio_hist (jogador_id, tipo, moeda, mzn, amount, taxa)
  values (uid_me, 'compra', p_moeda, custo, p_amount, taxa);

  return jsonb_build_object('ok', true, 'custo_mzn', custo, 'taxa', taxa);
end;
$$;

-- vender moeda estrangeira
create or replace function cambio_vender(p_moeda text, p_amount int)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  taxa   numeric;
  recebe bigint;
  taxa_j jsonb;
begin
  select * into j from jogadores where id = uid_me;
  if j.dolares < p_amount then return jsonb_build_object('erro', 'sem_moeda'); end if;

  taxa_j := cambio_hoje();
  taxa   := (taxa_j->p_moeda->'compra')::numeric;
  recebe := round(taxa * p_amount)::bigint;

  update jogadores set
    kumbu   = kumbu   + recebe,
    dolares = dolares - p_amount
  where id = uid_me;

  insert into cambio_hist (jogador_id, tipo, moeda, mzn, amount, taxa)
  values (uid_me, 'venda', p_moeda, recebe, p_amount, taxa);

  return jsonb_build_object('ok', true, 'recebeu_mzn', recebe, 'taxa', taxa);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — TRANSFERIR (kumbu entre jogadores)
-- ─────────────────────────────────────────────────

-- transferir meticais para outro jogador
create or replace function transferir_kumbu(
  p_para  uuid,
  p_valor bigint,
  p_nota  text default null
) returns jsonb language plpgsql security definer as $$
declare
  uid_me  uuid := auth.uid();
  destino jogadores%rowtype;
begin
  if p_valor <= 0 then return jsonb_build_object('erro', 'valor_invalido'); end if;

  update jogadores set kumbu = kumbu - p_valor
  where id = uid_me and kumbu >= p_valor;
  if not found then return jsonb_build_object('erro', 'sem_dinheiro'); end if;

  update jogadores set kumbu = kumbu + p_valor where id = p_para
  returning * into destino;
  if not found then
    -- reverter
    update jogadores set kumbu = kumbu + p_valor where id = uid_me;
    return jsonb_build_object('erro', 'destinatario_nao_encontrado');
  end if;

  insert into transferencias (de, para, valor, nota)
  values (uid_me, p_para, p_valor, p_nota);

  insert into eventos (jogador_id, tipo, dados)
  values (p_para, 'transferencia_recebida',
    jsonb_build_object('de', uid_me, 'valor', p_valor, 'nota', p_nota));

  return jsonb_build_object('ok', true, 'para', destino.nome, 'valor', p_valor);
end;
$$;

-- histórico de transferências
create or replace function historico_transferencias(p_pagina int default 0)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select t.*,
        jd.nome as de_nome,
        jp.nome as para_nome
      from transferencias t
      join jogadores jd on jd.id = t.de
      join jogadores jp on jp.id = t.para
      where t.de = uid_me or t.para = uid_me
      order by t.criado_em desc
      limit 30 offset p_pagina * 30
    ) r
  );
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — UNIVERSIDADE
-- ─────────────────────────────────────────────────

-- cursos disponíveis em Maputo (Eduardo Mondlane, ISRI, etc.)
create or replace function universidade_cursos()
returns jsonb language sql stable security definer as $$
  select jsonb_build_array(
    jsonb_build_object('id','basico','nome','Ensino Básico','univ','Escola','semestres',2,'custo_sem',0,'nivel',1,'emoji','📖'),
    jsonb_build_object('id','secundario','nome','Ensino Secundário','univ','Escola Secundária','semestres',4,'custo_sem',0,'nivel',2,'emoji','📚'),
    jsonb_build_object('id','tecnico','nome','Curso Técnico','univ','IPEME','semestres',4,'custo_sem',5000,'nivel',3,'emoji','🔧'),
    jsonb_build_object('id','direito','nome','Direito','univ','UEM','semestres',8,'custo_sem',15000,'nivel',4,'emoji','⚖️'),
    jsonb_build_object('id','medicina','nome','Medicina','univ','UEM — Faculdade de Medicina','semestres',12,'custo_sem',25000,'nivel',5,'emoji','🩺'),
    jsonb_build_object('id','engenharia','nome','Engenharia Civil','univ','UEM — Engenharia','semestres',10,'custo_sem',20000,'nivel',5,'emoji','⚙️'),
    jsonb_build_object('id','informatica','nome','Informática','univ','ISRI / UEM','semestres',8,'custo_sem',18000,'nivel',4,'emoji','💻'),
    jsonb_build_object('id','economia','nome','Economia','univ','UEM — Economia','semestres',8,'custo_sem',15000,'nivel',4,'emoji','📊'),
    jsonb_build_object('id','jornalismo','nome','Jornalismo','univ','UEM — Letras','semestres',6,'custo_sem',12000,'nivel',3,'emoji','📰')
  );
$$;

-- matricular-se num curso
create or replace function univ_matricular(p_curso_id text, p_univ text)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  j      jogadores%rowtype;
  ma     univ_matriculas%rowtype;
begin
  select * into j from jogadores where id = uid_me;

  if exists (select 1 from univ_matriculas
             where jogador_id = uid_me and curso = p_curso_id and concluido = false) then
    return jsonb_build_object('erro', 'ja_matriculado');
  end if;

  insert into univ_matriculas (jogador_id, curso, univ, pago_ate)
  values (uid_me, p_curso_id, p_univ, now() + interval '30 days')
  returning * into ma;

  return jsonb_build_object('matricula', to_jsonb(ma), 'ok', true);
end;
$$;

-- estado académico do jogador
create or replace function univ_estado()
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select * from univ_matriculas
      where jogador_id = uid_me
      order by criado_em desc
    ) r
  );
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — JORNAL
-- ─────────────────────────────────────────────────

-- notícias da semana em Maputo
create or replace function jornal_semana()
returns jsonb language plpgsql security definer as $$
declare
  semana_num int := extract(week from current_date)::int;
  ano_num    int := extract(year from current_date)::int;
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select * from jornal_noticias
      where semana = semana_num and ano = ano_num
      order by criado_em desc
      limit 20
    ) r
  );
end;
$$;

-- inserir notícia (usado pelo sistema / admin)
create or replace function jornal_inserir_noticia(
  p_titulo    text,
  p_corpo     text,
  p_categoria text default 'geral',
  p_bairro    text default null
) returns jsonb language plpgsql security definer as $$
begin
  insert into jornal_noticias (titulo, corpo, categoria, bairro,
    semana, ano)
  values (p_titulo, p_corpo, p_categoria, p_bairro,
    extract(week from current_date)::int,
    extract(year from current_date)::int);
  return jsonb_build_object('ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — SOCIAL / DATING
-- ─────────────────────────────────────────────────

-- jogadores online no mesmo bairro (para interagir)
create or replace function jogadores_bairro(p_bairro text)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select j.id, j.nome, j.aparencia, j.emprego, j.reputacao,
             r.tipo as relacao
      from jogadores j
      left join relacoes r on r.de = uid_me and r.para = j.id
      where j.bairro = p_bairro
        and j.id != uid_me
        and j.online_em > now() - interval '10 minutes'
      order by j.online_em desc
      limit 30
    ) r
  );
end;
$$;

-- pedir amizade
create or replace function pedir_amizade(p_para uuid)
returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  if exists (select 1 from relacoes where de = uid_me and para = p_para and tipo = 'amigo') then
    return jsonb_build_object('erro', 'ja_amigos');
  end if;
  insert into pedidos (de, para, tipo) values (uid_me, p_para, 'amizade') on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- pedir amizade por email
create or replace function pedir_amizade_email(p_email text)
returns jsonb language plpgsql security definer as $$
declare
  alvo uuid;
begin
  select id into alvo from jogadores where email = p_email;
  if not found then return jsonb_build_object('erro', 'email_nao_encontrado'); end if;
  return pedir_amizade(alvo);
end;
$$;

-- responder pedido de amizade
create or replace function responder_pedido(p_pedido_id uuid, p_aceitar boolean)
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  ped    pedidos%rowtype;
begin
  select * into ped from pedidos
  where id = p_pedido_id and para = uid_me and estado = 'pendente';
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;

  update pedidos set estado = case when p_aceitar then 'aceite' else 'recusado' end
  where id = p_pedido_id;

  if p_aceitar then
    insert into relacoes (de, para, tipo) values (uid_me, ped.de, ped.tipo) on conflict do nothing;
    insert into relacoes (de, para, tipo) values (ped.de, uid_me, ped.tipo) on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- convidar para encontro (praia, jantar, marrabenta)
create or replace function convidar_encontro(
  p_para     uuid,
  p_tipo     text,   -- 'praia','jantar','marrabenta','cinema'
  p_local    text
) returns jsonb language plpgsql security definer as $$
declare uid_me uuid := auth.uid();
begin
  insert into pedidos (de, para, tipo, dados)
  values (uid_me, p_para, 'encontro',
    jsonb_build_object('tipo', p_tipo, 'local', p_local));
  return jsonb_build_object('ok', true);
end;
$$;

-- ─────────────────────────────────────────────────
-- RPCs — CONVITES
-- ─────────────────────────────────────────────────

create or replace function meus_convites()
returns jsonb language plpgsql security definer as $$
declare
  uid_me uuid := auth.uid();
  cod    text;
  total  bigint;
  semana bigint;
begin
  cod   := encode(uid_me::text::bytea, 'base64');
  cod   := replace(replace(replace(cod, '+', '-'), '/', '_'), '=', '');
  cod   := left(cod, 10);

  select count(*) into total  from jogadores where email like '%' || uid_me::text || '%';
  select count(*) into semana from jogadores
  where criado_em > now() - interval '7 days';

  return jsonb_build_object('codigo', cod, 'total', total, 'semana', semana);
end;
$$;

-- ─────────────────────────────────────────────────
-- DADOS INICIAIS — IMÓVEIS DE MAPUTO
-- ─────────────────────────────────────────────────
insert into propriedades (id, bairro, tipo, preco_compra, renda_dia) values
  ('quarto_canico_1',      'polana_canico',  'quarto',  600000,  2000),
  ('quarto_canico_2',      'polana_canico',  'quarto',  600000,  2000),
  ('t1_maxaquene_1',       'maxaquene',      't1',      1200000, 4000),
  ('t1_maxaquene_2',       'maxaquene',      't1',      1200000, 4000),
  ('t2_sommerschield_1',   'sommerschield',  't2',      3600000, 12000),
  ('t2_sommerschield_2',   'sommerschield',  't2',      3600000, 12000),
  ('vivenda_somm_1',       'sommerschield',  'vivenda', 18000000, 60000),
  ('quarto_baixa_1',       'baixa',          'quarto',  800000,  2800),
  ('t1_baixa_1',           'baixa',          't1',      1800000, 6000),
  ('t2_costa_sol_1',       'costa_do_sol',   't2',      4000000, 14000),
  ('vivenda_costa_sol_1',  'costa_do_sol',   'vivenda', 20000000, 70000),
  ('machamba_matola_1',    'matola',         'machamba',500000,  1500),
  ('machamba_matola_2',    'matola',         'machamba',500000,  1500),
  ('quarto_museu_1',       'museu',          'quarto',  700000,  2300),
  ('t1_museu_1',           'museu',          't1',      1400000, 4800)
on conflict do nothing;

-- ─────────────────────────────────────────────────
-- NOTÍCIAS INICIAIS DO JORNAL
-- ─────────────────────────────────────────────────
insert into jornal_noticias (titulo, corpo, categoria, semana, ano) values
(
  '🌊 Costa do Sol lotada no fim-de-semana',
  'Centenas de mapuenses aproveitaram o sol e a maresia na Costa do Sol este fim-de-semana. Os vendedores de matapa e pão com bife não pararam.',
  'lazer',
  extract(week from current_date)::int,
  extract(year from current_date)::int
),
(
  '🚐 Chapas da Polana Caniço aumentam frequência',
  'A empresa de transportes Chapas do Sul anunciou mais viagens na rota Polana Caniço–Baixa a partir desta semana.',
  'transporte',
  extract(week from current_date)::int,
  extract(year from current_date)::int
),
(
  '🎵 Festival de Marrabenta no Jardim dos Professores',
  'O tradicional festival de marrabenta regressa ao Jardim dos Professores. Entrada livre para toda a família.',
  'cultura',
  extract(week from current_date)::int,
  extract(year from current_date)::int
),
(
  '📉 Metical sobe face ao rand sul-africano',
  'O metical ganhou terreno face ao rand nas últimas sessões do Banco de Moçambique, aliviando a pressão nas importações.',
  'economia',
  extract(week from current_date)::int,
  extract(year from current_date)::int
)
on conflict do nothing;

-- =============================================================
-- FIM DO SCRIPT
-- Execute no Supabase SQL Editor → Run (ou F5)
-- Depois confirma: SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' ORDER BY routine_name;
-- =============================================================
