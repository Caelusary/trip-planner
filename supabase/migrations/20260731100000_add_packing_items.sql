-- Per-trip packing checklist: user-added items plus auto-generated
-- suggestions (see lib/packingList.ts), same ownership-via-join RLS
-- pattern as trip_stops.
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null,
  checked boolean not null default false,
  "position" integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.packing_items enable row level security;

create policy "Users manage packing items of own trips"
  on public.packing_items
  for all
  using (exists (select 1 from public.trips t where t.id = packing_items.trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = packing_items.trip_id and t.user_id = auth.uid()));
