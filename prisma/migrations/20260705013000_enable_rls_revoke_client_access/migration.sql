alter table if exists public.leads enable row level security;

alter table if exists public.audit_requests enable row level security;

revoke all privileges on table public.leads from anon, authenticated;

revoke all privileges on table public.audit_requests from anon, authenticated;

do $$
begin
  if to_regclass('public._prisma_migrations') is not null then
    revoke all privileges on table public._prisma_migrations from anon, authenticated;
  end if;
end $$;
