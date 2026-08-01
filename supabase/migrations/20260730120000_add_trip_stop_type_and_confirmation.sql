-- Adds a structured "what kind of stop is this" field plus a real
-- confirmation-number field to trip_stops, so a flight/hotel/reservation
-- can record its own confirmation code instead of it being buried inside
-- the freeform notes string alongside everything else.
alter table public.trip_stops
  add column stop_type text not null default 'activity',
  add column confirmation_number text;

alter table public.trip_stops
  add constraint trip_stops_stop_type_check
  check (stop_type in ('flight', 'lodging', 'activity', 'restaurant', 'transport'));

-- Replacing add_trip_stop's signature (not just its body) means the old
-- 7-arg overload has to be dropped explicitly first — CREATE OR REPLACE
-- only replaces a function with the exact same argument-type list, so
-- without this the old signature would linger as a second, unused overload.
drop function if exists public.add_trip_stop(uuid, text, double precision, double precision, date, date, text);

create or replace function public.add_trip_stop(
  p_trip_id uuid,
  p_city text,
  p_lat double precision,
  p_lon double precision,
  p_arrival_date date,
  p_departure_date date,
  p_notes text,
  p_stop_type text default 'activity',
  p_confirmation_number text default null
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
      insert into public.trip_stops (
        trip_id, city, lat, lon, arrival_date, departure_date, notes, position,
        stop_type, confirmation_number
      )
      values (
        p_trip_id, p_city, p_lat, p_lon, p_arrival_date, p_departure_date, p_notes, v_position,
        p_stop_type, p_confirmation_number
      )
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- Another concurrent insert took this position — retry with a fresh max().
    end;
  end loop;
end;
$function$;

-- Re-applies the same search-path hardening from
-- 20260713000000_harden_add_trip_stop_search_path.sql to the new signature
-- (dropping/recreating the function above doesn't carry it over).
alter function public.add_trip_stop(uuid, text, double precision, double precision, date, date, text, text, text)
set search_path = '';
