-- Baseline schema snapshot, captured from the live production project
-- (tpjawauntyfqtdpkewgn) on 2026-07-10 via Supabase MCP introspection.
--
-- This is NOT a replay of the original migration history — the two prior
-- migrations applied directly against the remote project
-- (20260708052343_create_trips_and_stops, 20260709142221_add_trip_stop_atomic_position)
-- were never captured as files. This snapshot exists so future schema
-- changes have a version-controlled starting point instead of none at all.
-- Applying this file against an already-provisioned copy of the project
-- will fail (objects already exist) — it's a reference baseline, not meant
-- to be re-run against tpjawauntyfqtdpkewgn itself.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null,
  destination_city text not null,
  destination_lat double precision,
  destination_lon double precision,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  city text not null,
  lat double precision,
  lon double precision,
  arrival_date date,
  departure_date date,
  notes text,
  "position" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint trip_stops_trip_id_position_key unique (trip_id, "position")
);

alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;

create policy "Users manage own trips"
  on public.trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage stops of own trips"
  on public.trip_stops
  for all
  using (exists (select 1 from public.trips t where t.id = trip_stops.trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_stops.trip_id and t.user_id = auth.uid()));

-- Atomically appends a stop at the next available position for a trip,
-- retrying on a concurrent-insert position conflict instead of failing
-- (fixes a real race condition when two requests add a stop to the same
-- trip at the same time).
create or replace function public.add_trip_stop(
  p_trip_id uuid,
  p_city text,
  p_lat double precision,
  p_lon double precision,
  p_arrival_date date,
  p_departure_date date,
  p_notes text
)
returns public.trip_stops
language plpgsql
as $function$
declare
  v_position integer;
  v_row public.trip_stops;
  v_attempts integer := 0;
begin
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'add_trip_stop: too many position conflicts for trip %', p_trip_id;
    end if;

    select coalesce(max(position), -1) + 1 into v_position
    from public.trip_stops
    where trip_id = p_trip_id;

    begin
      insert into public.trip_stops (trip_id, city, lat, lon, arrival_date, departure_date, notes, position)
      values (p_trip_id, p_city, p_lat, p_lon, p_arrival_date, p_departure_date, p_notes, v_position)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- Another concurrent insert took this position — retry with a fresh max().
    end;
  end loop;
end;
$function$;
