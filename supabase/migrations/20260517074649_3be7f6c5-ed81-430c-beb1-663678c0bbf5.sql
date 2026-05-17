
-- Enums
create type public.task_status as enum ('inbox','scheduled','active','done','dropped');
create type public.energy_level as enum ('low','medium','high');
create type public.dump_status as enum ('pending','processing','parsed','failed');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  status public.task_status not null default 'inbox',
  energy_required public.energy_level,
  scheduled_for timestamptz,
  duration_minutes int default 30,
  color_token text default 'chart-1',
  parent_task_id uuid references public.tasks(id) on delete cascade,
  source text default 'manual',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_scheduled_idx on public.tasks(user_id, scheduled_for);
create index tasks_user_status_idx on public.tasks(user_id, status);
alter table public.tasks enable row level security;
create policy "own tasks select" on public.tasks for select using (auth.uid() = user_id);
create policy "own tasks insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "own tasks update" on public.tasks for update using (auth.uid() = user_id);
create policy "own tasks delete" on public.tasks for delete using (auth.uid() = user_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Brain dumps
create table public.brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  status public.dump_status not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brain_dumps_user_idx on public.brain_dumps(user_id, created_at desc);
alter table public.brain_dumps enable row level security;
create policy "own dumps select" on public.brain_dumps for select using (auth.uid() = user_id);
create policy "own dumps insert" on public.brain_dumps for insert with check (auth.uid() = user_id);
create policy "own dumps update" on public.brain_dumps for update using (auth.uid() = user_id);
create policy "own dumps delete" on public.brain_dumps for delete using (auth.uid() = user_id);
create trigger brain_dumps_updated_at before update on public.brain_dumps
  for each row execute function public.set_updated_at();

-- Brain dump items
create table public.brain_dump_items (
  id uuid primary key default gen_random_uuid(),
  dump_id uuid not null references public.brain_dumps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  category text,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index brain_dump_items_dump_idx on public.brain_dump_items(dump_id);
alter table public.brain_dump_items enable row level security;
create policy "own items select" on public.brain_dump_items for select using (auth.uid() = user_id);
create policy "own items insert" on public.brain_dump_items for insert with check (auth.uid() = user_id);
create policy "own items update" on public.brain_dump_items for update using (auth.uid() = user_id);
create policy "own items delete" on public.brain_dump_items for delete using (auth.uid() = user_id);
