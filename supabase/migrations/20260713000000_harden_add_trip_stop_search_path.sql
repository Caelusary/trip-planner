-- Fixes the Supabase security advisor's "Function Search Path Mutable" WARN
-- for public.add_trip_stop. The function already fully-qualifies every
-- table reference (public.trip_stops), so this is defense-in-depth against
-- search_path-based schema injection, not a behavior change.
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
ALTER FUNCTION public.add_trip_stop(uuid, text, double precision, double precision, date, date, text)
SET search_path = '';
