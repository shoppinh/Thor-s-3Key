create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid,
  status text not null default 'open' check (status in ('open','in_progress','locked','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  team text check (team in ('A','B')),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists game_events (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists match_state (
  room_id uuid primary key references rooms(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  round_number int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_rooms_updated on rooms;
create trigger trg_rooms_updated before update on rooms
for each row execute procedure set_updated_at();

alter table rooms enable row level security;
alter table room_members enable row level security;
alter table game_events enable row level security;
alter table match_state enable row level security;

create policy room_read_public on rooms for select using (status in ('open','in_progress','locked'));
create policy room_insert_any on rooms for insert with check (true);

create policy rm_read_public on room_members for select using (true);
create policy rm_upsert_any on room_members for insert with check (true);
create policy rm_update_any on room_members for update using (true);

create policy ev_read_public on game_events for select using (true);
create policy ev_insert_any on game_events for insert with check (true);
create policy ms_read_public on match_state for select using (true);
create policy ms_upsert_any on match_state for insert with check (true);
create policy ms_update_any on match_state for update using (true);


