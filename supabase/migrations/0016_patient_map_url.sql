-- Store the Google Maps link a relative/Admin attaches for a recipient's home.
-- home_lat/home_lng (already present) drive the check-in geofence + navigation;
-- map_url keeps the original pasted link for one-tap นำทาง to the exact place.
alter table public.patients
  add column if not exists map_url text;
