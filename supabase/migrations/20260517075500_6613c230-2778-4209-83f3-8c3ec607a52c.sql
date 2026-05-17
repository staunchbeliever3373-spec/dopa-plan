
create table public.energy_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level public.energy_level not null,
  note text,
  logged_at timestamptz not null default now()
);
create index energy_states_user_logged_idx on public.energy_states(user_id, logged_at desc);
alter table public.energy_states enable row level security;
create policy "own energy select" on public.energy_states for select using (auth.uid() = user_id);
create policy "own energy insert" on public.energy_states for insert with check (auth.uid() = user_id);

create table public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);
create index engagement_user_time_idx on public.engagement_events(user_id, occurred_at desc);
alter table public.engagement_events enable row level security;
create policy "own engagement select" on public.engagement_events for select using (auth.uid() = user_id);
create policy "own engagement insert" on public.engagement_events for insert with check (auth.uid() = user_id);

-- Rollover: unfinished scheduled tasks from before today → back to inbox
create or replace function public.rollover_unfinished_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare moved integer;
begin
  with updated as (
    update public.tasks
    set scheduled_for = null,
        status = 'inbox',
        started_at = null
    where status in ('scheduled','active')
      and scheduled_for is not null
      and scheduled_for < date_trunc('day', now())
    returning 1
  )
  select count(*) into moved from updated;
  return moved;
end; $$;

revoke execute on function public.rollover_unfinished_tasks() from public, anon, authenticated;
grant execute on function public.rollover_unfinished_tasks() to service_role;
