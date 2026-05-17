revoke execute on function public.rollover_unfinished_tasks() from anon, authenticated, public;
grant execute on function public.rollover_unfinished_tasks() to service_role;