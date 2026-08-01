-- Read-only "anyone with the link" trip sharing. `share_token` is an
-- unguessable per-trip secret; `share_enabled` lets the owner turn sharing
-- off (revoking access) without losing/regenerating the link itself.
alter table public.trips
  add column share_token uuid not null default gen_random_uuid() unique,
  add column share_enabled boolean not null default false;

-- Deliberately NOT a permissive RLS policy like
-- `using (share_enabled = true)` — that would let anyone list every shared
-- trip in the table via a plain `select * from trips`, regardless of
-- whether they know its token. These SECURITY DEFINER functions bypass RLS
-- internally but only ever return the one row whose token was supplied as
-- an argument, so knowing the token is actually required.
create or replace function public.get_shared_trip(p_token uuid)
returns public.trips
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.trips where share_token = p_token and share_enabled = true limit 1;
$$;

create or replace function public.get_shared_trip_stops(p_token uuid)
returns setof public.trip_stops
language sql
stable
security definer
set search_path = ''
as $$
  select ts.* from public.trip_stops ts
  join public.trips t on t.id = ts.trip_id
  where t.share_token = p_token and t.share_enabled = true
  order by ts.position asc;
$$;

grant execute on function public.get_shared_trip(uuid) to anon, authenticated;
grant execute on function public.get_shared_trip_stops(uuid) to anon, authenticated;
