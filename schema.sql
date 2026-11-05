-- Ejecuta TODO este archivo en Supabase > SQL Editor > New query.
-- Estas tablas usan RLS: cada usuario solo puede leer y modificar sus propios registros.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  completed_today boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  movement_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.notes enable row level security;
alter table public.movements enable row level security;

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks" on public.tasks
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own habits" on public.habits;
create policy "Users manage own habits" on public.habits
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes" on public.notes
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own movements" on public.movements;
create policy "Users manage own movements" on public.movements
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.movements to authenticated;
