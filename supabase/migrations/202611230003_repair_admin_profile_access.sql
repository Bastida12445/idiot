begin;

grant usage on schema public to authenticated, service_role;
grant select on table public.profiles to authenticated;
grant select, insert, update on table public.profiles to service_role;

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Users can read their own profile and admins can read profiles"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;

grant execute on function public.is_admin() to authenticated;

commit;
