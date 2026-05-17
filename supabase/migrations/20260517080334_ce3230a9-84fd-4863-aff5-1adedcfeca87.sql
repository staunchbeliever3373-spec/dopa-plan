create table public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tokens jsonb not null,
  is_preset boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.themes enable row level security;

create policy "themes_select_own" on public.themes for select using (auth.uid() = user_id);
create policy "themes_insert_own" on public.themes for insert with check (auth.uid() = user_id);
create policy "themes_update_own" on public.themes for update using (auth.uid() = user_id);
create policy "themes_delete_own" on public.themes for delete using (auth.uid() = user_id);

create trigger themes_set_updated_at
  before update on public.themes
  for each row execute function public.set_updated_at();

alter table public.profiles add column if not exists active_theme_id uuid references public.themes(id) on delete set null;