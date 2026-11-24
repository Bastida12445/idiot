-- The server-side provisioning script uses the Supabase service role to create
-- administrator profile rows. Keep this grant limited to the required table
-- and operations; browser roles remain unable to write profiles.
grant select, insert, update on table public.profiles to service_role;
