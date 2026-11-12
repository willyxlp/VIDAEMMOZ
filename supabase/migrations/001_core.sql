-- Vida na Banda (versao local) · Migracao 001 · nucleo: contas, personagem, estado, arranque, pulso
-- NOVO CODIGO (nao e o original). Escrito a partir do que o frontend chama; AINDA NAO TESTADO num Postgres real.
-- Corre no Supabase: SQL Editor -> New query -> colar tudo -> Run.

-- ============ TABELAS ============
create table if not exists public.jogadores (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  aparencia jsonb not null default '{}'::jsonb,
  bairro text,
  maior boolean not null default false,
  classe text,
  admin boolean not null default false,
  kumbu bigint not null default 0,
  ouro int not null default 0,
  dolares bigint not null default 0,
  poupanca bigint not null default 0,
  divida bigint not null default 0,
  divida_prazo timestamptz,
  fome numeric not null default 100,
  energia numeric not null default 100,
  saude numeric not null default 100,
  forma numeric not null default 50,
  stress numeric not null default 0,
  solidao numeric not null default 0,
  felicidade numeric not null default 50,
  doenca text,
  emprego text,
  empresa_id uuid,
  cargo_nivel int not null default 0,
  turnos int not null default 0,
  turnos_total int not null default 0,
  estudo int not null default 0,
  curso text,
  universidade text,
  casa text,
  itens text[] not null default '{}',
  acabamentos jsonb not null default '{}'::jsonb,
  reputacao int not null default 0,
  procurado int not null default 0,
  cadastro int not null default 0,
  preso_ate timestamptz,
  geracao int not null default 1,
  casa_aberta boolean not null default false,
  esconder_ricos boolean not null default false,
  vip_ate timestamptz,
  protecao_ate timestamptz,
  seguro_ate timestamptz,
  idade_base int not null default 18,
  nascido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  visto_em timestamptz not null default now(),
  sessao text
);
create unique index if not exists jogadores_nome_ci on public.jogadores (lower(nome));

create table if not exists public.dispositivos (
  disp text not null,
  jogador_id uuid not null references public.jogadores(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (disp, jogador_id)
);

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  jogador_id uuid not null references public.jogadores(id) on delete cascade,
  texto text not null,
  tipo text not null default 'info',
  criado_em timestamptz not null default now()
);
create index if not exists eventos_jogador on public.eventos (jogador_id, criado_em desc);

create table if not exists public.erros (
  id bigint generated always as identity primary key,
  msg text, origem text, pilha text, ua text, url text, versao text,
  jogador_id uuid, criado_em timestamptz not null default now()
);

-- Catalogos (so as colunas que o frontend usa de certeza; a migracao 002 acrescenta o resto a partir do catalogo real)
create table if not exists public.bairros (id text primary key, nome text not null, ordem int not null default 0);
create table if not exists public.empregos (id text primary key, nome text not null, ordem int not null default 0, bairro text, estudo_min int not null default 0, vaga_salario bigint);
create table if not exists public.comidas (id text primary key, nome text not null, preco bigint not null default 0, fome int not null default 0, caseira boolean not null default false);
create table if not exists public.casas (id text primary key, nome text, bairro text);
create table if not exists public.lazer (id text primary key, nome text);
create table if not exists public.itens (id text primary key, nome text, nivel int not null default 0);
create table if not exists public.moveis (id text primary key, nome text, ordem int not null default 0);
create table if not exists public.colegios (id text primary key, nome text, ordem int not null default 0);
create table if not exists public.pacotes_ouro (id text primary key, ativo boolean not null default true, ordem int not null default 0);
create table if not exists public.pacotes_kz (id text primary key, ativo boolean not null default true, ordem int not null default 0);

-- ============ SEGURANCA (RLS) ============
alter table public.jogadores enable row level security;
alter table public.dispositivos enable row level security;
alter table public.eventos enable row level security;
alter table public.erros enable row level security;

-- Ninguem escreve nas tabelas pelo browser: so as funcoes abaixo (security definer).
revoke all on public.jogadores, public.dispositivos, public.eventos, public.erros from anon, authenticated;

-- Dados publicos de um jogador (para ver vizinhos). Dinheiro, saude, etc. so via estado().
grant select (id, nome, aparencia, bairro, visto_em, nascido_em, idade_base, casa_aberta, acabamentos) on public.jogadores to authenticated;
drop policy if exists jogadores_ler on public.jogadores;
create policy jogadores_ler on public.jogadores for select to authenticated using (true);

grant select on public.eventos to authenticated;
drop policy if exists eventos_meus on public.eventos;
create policy eventos_meus on public.eventos for select to authenticated using (jogador_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['bairros','empregos','comidas','casas','lazer','itens','moveis','colegios','pacotes_ouro','pacotes_kz'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists leitura_publica on public.%I', t);
    execute format('create policy leitura_publica on public.%I for select to anon, authenticated using (true)', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- ============ FUNCOES ============
create or replace function public.jogador_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(j) - 'sessao' from public.jogadores j where j.id = p_id
$$;

create or replace function public.nome_disponivel(p_nome text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_nome is null or p_nome !~ '^[A-Za-z0-9_]{3,16}$' then
    return jsonb_build_object('ok', false, 'msg', 'O nome deve ter 3 a 16 caracteres: letras, números ou _');
  end if;
  if exists (select 1 from public.jogadores where lower(nome) = lower(p_nome)) then
    return jsonb_build_object('ok', false, 'msg', 'Esse nome já está em uso.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.aparelho_cheio(p_disp text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select count(*) from public.dispositivos where disp = p_disp), 0) >= 3
$$;

create or replace function public.registar_dispositivo(p_disp text, p_ua text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_disp is null then return; end if;
  insert into public.dispositivos (disp, jogador_id) values (left(p_disp, 100), auth.uid()) on conflict do nothing;
end $$;

create or replace function public.criar_personagem(p_nome text, p_aparencia jsonb, p_maior boolean, p_disp text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r numeric := random();
  v_classe text; v_kumbu bigint; v_bairro text;
begin
  if v_uid is null then raise exception 'Sessão inválida. Entra de novo.'; end if;
  if exists (select 1 from public.jogadores where id = v_uid) then raise exception 'Já tens personagem.'; end if;
  if not coalesce(p_maior, false) then raise exception 'Confirma que tens 18 anos ou mais para jogar.'; end if;
  if p_nome is null or p_nome !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'O nome deve ter 3 a 16 caracteres: letras, números ou _'; end if;
  if exists (select 1 from public.jogadores where lower(nome) = lower(p_nome)) then raise exception 'Esse nome já está em uso.'; end if;
  if p_disp is not null and (select count(*) from public.dispositivos where disp = p_disp and jogador_id <> v_uid) >= 3 then
    raise exception 'Este aparelho já tem 3 contas, o máximo.';
  end if;
  select id into v_bairro from public.bairros order by ordem limit 1;
  if v_bairro is null then raise exception 'O catálogo está vazio: corre primeiro o seed (migração 002).'; end if;

  -- Lotaria da vida (valores de teste, para afinar depois)
  v_classe := case when v_r < 0.60 then 'musseque' when v_r < 0.90 then 'media' else 'rica' end;
  v_kumbu  := case v_classe when 'musseque' then 20000 when 'media' then 150000 else 1500000 end;

  begin
    insert into public.jogadores (id, nome, aparencia, bairro, maior, classe, kumbu)
    values (v_uid, p_nome, coalesce(p_aparencia, '{}'::jsonb), v_bairro, true, v_classe, v_kumbu);
  exception when unique_violation then
    raise exception 'Esse nome já está em uso.';
  end;
  if p_disp is not null then
    insert into public.dispositivos (disp, jogador_id) values (left(p_disp, 100), v_uid) on conflict do nothing;
  end if;
  return jsonb_build_object('classe', v_classe);
end $$;

create or replace function public.estado() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_j jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida. Entra de novo.'; end if;
  v_j := public.jogador_json(v_uid);
  if v_j is null then raise exception 'Ainda não tens personagem.'; end if;
  update public.jogadores set visto_em = now() where id = v_uid;
  return jsonb_build_object('jogador', v_j);
end $$;

create or replace function public.arranque() returns jsonb
language sql security definer set search_path = public as $$ select public.estado() $$;

create or replace function public.reclamar_sessao(p_sessao text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.jogadores set sessao = left(p_sessao, 100) where id = auth.uid();
end $$;

create or replace function public.arranque_tudo(p_disp text default null, p_ua text default null, p_sessao text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_r jsonb;
begin
  v_r := public.estado();
  perform public.registar_dispositivo(p_disp, p_ua);
  perform public.reclamar_sessao(p_sessao);
  return v_r;
end $$;

create or replace function public.pulso(p_expo jsonb default null, p_vistas jsonb default null, p_sala boolean default false, p_estado boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then return null; end if;
  update public.jogadores set visto_em = now() where id = v_uid;
  v_out := jsonb_build_object('manut', null, 'sessao', (select sessao from public.jogadores where id = v_uid),
                              'sms', '[]'::jsonb, 'dil', null, 'vb', null, 'fof', '[]'::jsonb);
  if coalesce(p_estado, true) then v_out := v_out || jsonb_build_object('jogador', public.jogador_json(v_uid)); end if;
  return v_out;
end $$;

create or replace function public.aviso_manutencao() returns jsonb
language sql stable security definer set search_path = public as $$ select null::jsonb $$;

create or replace function public.pagamento_local_ativo() returns boolean
language sql stable security definer set search_path = public as $$ select false $$;

create or replace function public.registar_erro(p_msg text, p_origem text default null, p_pilha text default null, p_ua text default null, p_url text default null, p_versao text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.erros (msg, origem, pilha, ua, url, versao, jogador_id)
  values (left(p_msg, 500), left(p_origem, 300), left(p_pilha, 3000), left(p_ua, 300), left(p_url, 300), left(p_versao, 50), auth.uid());
end $$;

-- ============ PERMISSOES DAS FUNCOES ============
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.nome_disponivel(text), public.aparelho_cheio(text), public.registar_erro(text,text,text,text,text,text),
  public.aviso_manutencao(), public.pagamento_local_ativo() to anon, authenticated;
grant execute on function public.registar_dispositivo(text,text), public.criar_personagem(text,jsonb,boolean,text), public.estado(),
  public.arranque(), public.arranque_tudo(text,text,text), public.reclamar_sessao(text), public.pulso(jsonb,jsonb,boolean,boolean) to authenticated;

-- Tempo real: notificacoes novas chegam ao jogador
do $$ begin
  alter publication supabase_realtime add table public.eventos;
exception when duplicate_object then null; when undefined_object then null; end $$;
