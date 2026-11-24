create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  slug text not null unique,
  title text not null,
  bio text not null default '',
  photo_url text,
  skills text[] not null default '{}',
  education text,
  specialization text,
  email text,
  facebook_url text,
  github_url text,
  linkedin_url text,
  phone text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null,
  description text not null default '',
  category text not null,
  cover_image text,
  gallery text[] not null default '{}',
  technologies text[] not null default '{}',
  owner_member_id uuid references public.team_members(id) on delete set null,
  contributing_member_ids uuid[] not null default '{}',
  completed_at date,
  github_url text,
  live_url text,
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_published_created_idx on public.projects(published, created_at desc);
create index if not exists projects_category_idx on public.projects(category);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  icon text not null default 'sparkles',
  image_url text,
  category text not null,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists services_public_order_idx on public.services(published, sort_order);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  email text,
  photo_url text,
  rating smallint not null check (rating between 1 and 5),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_status_created_idx on public.testimonials(status, created_at desc);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  is_read boolean not null default false,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_messages_read_created_idx on public.contact_messages(is_read, created_at desc);

create table if not exists public.visitor_events (
  id uuid primary key,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  path text not null check (path like '/%' and length(path) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists visitor_events_created_idx on public.visitor_events(created_at desc);
create index if not exists visitor_events_visitor_idx on public.visitor_events(visitor_hash, created_at desc);
create index if not exists visitor_events_path_idx on public.visitor_events(path, created_at desc);

create table if not exists public.website_settings (
  id text primary key default 'default' check (id = 'default'),
  company_name text not null default 'Studio Name',
  logo_url text,
  tagline text not null default '',
  hero_headline text not null default '',
  hero_description text not null default '',
  company_email text not null default '',
  facebook_url text,
  phone text,
  footer_text text not null default '',
  social_links jsonb not null default '[]'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  story text not null default '',
  mission text not null default '',
  vision text not null default '',
  values text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','team_members','projects','services','testimonials','contact_messages','website_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.services enable row level security;
alter table public.testimonials enable row level security;
alter table public.contact_messages enable row level security;
alter table public.visitor_events enable row level security;
alter table public.website_settings enable row level security;
alter table public.activity_logs enable row level security;

create policy "Admins can view profiles" on public.profiles for select to authenticated using (public.is_admin() or id = (select auth.uid()));
create policy "Public can view active team" on public.team_members for select to anon, authenticated using (active or public.is_admin());
create policy "Admins manage team" on public.team_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can view published projects" on public.projects for select to anon, authenticated using (published or public.is_admin());
create policy "Admins manage projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can view published services" on public.services for select to anon, authenticated using (published or public.is_admin());
create policy "Admins manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can view approved testimonials" on public.testimonials for select to anon, authenticated using (status = 'approved' or public.is_admin());
create policy "Admins manage testimonials" on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage contact messages" on public.contact_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins view visitor events" on public.visitor_events for select to authenticated using (public.is_admin());
create policy "Public can view website settings" on public.website_settings for select to anon, authenticated using (true);
create policy "Admins manage website settings" on public.website_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins view activity logs" on public.activity_logs for select to authenticated using (public.is_admin());
create policy "Admins add activity logs" on public.activity_logs for insert to authenticated with check (public.is_admin() and actor_id = (select auth.uid()));

grant select on public.profiles, public.team_members, public.projects, public.services, public.testimonials, public.website_settings to anon, authenticated;
grant insert, update, delete on public.profiles, public.team_members, public.projects, public.services, public.testimonials, public.website_settings, public.contact_messages, public.activity_logs to authenticated;
grant select on public.contact_messages, public.activity_logs, public.visitor_events to authenticated;

-- Administrator profile records are provisioned only by the server-side setup script.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;

-- The linked Auth user UUID is private; public team reads use explicitly granted columns.
revoke select on public.team_members from anon;
grant select (id, full_name, slug, title, bio, photo_url, skills, education, specialization, email, facebook_url, github_url, linkedin_url, phone, active, sort_order, created_at, updated_at) on public.team_members to anon;

-- Email is collected privately and is deliberately unavailable to either browser role.
revoke select on public.testimonials from anon, authenticated;
grant select (id, client_name, photo_url, rating, message, status, created_at, updated_at) on public.testimonials to anon, authenticated;
grant update (client_name, email, photo_url, rating, message, status) on public.testimonials to authenticated;
grant delete on public.testimonials to authenticated;
revoke insert, update, delete on public.testimonials from anon;

revoke insert, update, delete on public.contact_messages from anon, authenticated;
revoke insert, update, delete on public.visitor_events from anon, authenticated;

create or replace function public.submit_testimonial(
  p_client_name text, p_email text, p_photo_url text, p_rating integer, p_message text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if length(trim(p_client_name)) not between 2 and 100
    or p_rating not between 1 and 5
    or length(trim(p_message)) not between 10 and 2000
    or (p_email is not null and length(p_email) > 254) then
    raise exception 'Invalid testimonial submission' using errcode = '22023';
  end if;
  insert into public.testimonials(client_name,email,photo_url,rating,message,status)
  values(trim(p_client_name), nullif(trim(p_email),''), p_photo_url, p_rating, trim(p_message), 'pending')
  returning id into result_id;
  return jsonb_build_object('id', result_id, 'status', 'pending', 'created_at', now());
end;
$$;
revoke all on function public.submit_testimonial(text,text,text,integer,text) from public;
grant execute on function public.submit_testimonial(text,text,text,integer,text) to service_role;

create or replace function public.submit_contact_message(
  p_full_name text, p_email text, p_subject text, p_message text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if length(trim(p_full_name)) not between 2 and 100
    or length(trim(p_email)) not between 3 and 254
    or length(trim(p_subject)) not between 3 and 160
    or length(trim(p_message)) not between 10 and 5000 then
    raise exception 'Invalid contact submission' using errcode = '22023';
  end if;
  insert into public.contact_messages(full_name,email,subject,message)
  values(trim(p_full_name), trim(p_email), trim(p_subject), trim(p_message))
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.submit_contact_message(text,text,text,text) from public;
grant execute on function public.submit_contact_message(text,text,text,text) to service_role;

create or replace function public.set_contact_notification_status(
  p_message_id uuid, p_status text, p_error text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','failed') then
    raise exception 'Invalid notification status' using errcode = '22023';
  end if;
  update public.contact_messages
  set email_status = p_status, email_error = left(p_error, 1000)
  where id = p_message_id;
end;
$$;
revoke all on function public.set_contact_notification_status(uuid,text,text) from public;
grant execute on function public.set_contact_notification_status(uuid,text,text) to service_role;

create or replace function public.record_visitor_event(
  p_event_id uuid, p_visitor_hash text, p_path text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor_hash !~ '^[0-9a-f]{64}$'
    or p_path not like '/%'
    or length(p_path) > 500
    or p_path like '/admin%'
    or p_path like '/login%' then
    raise exception 'Invalid visitor event' using errcode = '22023';
  end if;
  insert into public.visitor_events(id, visitor_hash, path)
  values(p_event_id, p_visitor_hash, p_path)
  on conflict (id) do nothing;
end;
$$;
revoke all on function public.record_visitor_event(uuid,text,text) from public;
grant execute on function public.record_visitor_event(uuid,text,text) to service_role;

create or replace function public.admin_analytics_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'totalVisits', (select count(*) from public.visitor_events),
    'uniqueVisitors', (select count(distinct visitor_hash) from public.visitor_events),
    'todayVisits', (select count(*) from public.visitor_events where created_at >= date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'),
    'monthVisits', (select count(*) from public.visitor_events where created_at >= date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'),
    'totalProjects', (select count(*) from public.projects),
    'publishedServices', (select count(*) from public.services where published),
    'approvedTestimonials', (select count(*) from public.testimonials where status = 'approved'),
    'unreadMessages', (select count(*) from public.contact_messages where not is_read)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_analytics_overview() from public;
grant execute on function public.admin_analytics_overview() to authenticated;

create or replace function public.admin_analytics_report(p_range text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  local_now timestamp without time zone := now() at time zone 'Asia/Manila';
  local_start timestamp without time zone;
  interval_size interval;
  bucket_size text;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_range not in ('today','7d','30d','12m') then
    raise exception 'Invalid analytics range' using errcode = '22023';
  end if;
  if p_range = 'today' then
    local_start := date_trunc('day', local_now);
  elsif p_range = '7d' then
    local_start := date_trunc('day', local_now) - interval '6 days';
  elsif p_range = '30d' then
    local_start := date_trunc('day', local_now) - interval '29 days';
  else
    local_start := date_trunc('month', local_now) - interval '11 months';
  end if;
  interval_size := case when p_range = '12m' then interval '1 month' else interval '1 day' end;
  bucket_size := case when p_range = '12m' then 'month' else 'day' end;

  with buckets as (
    select generated.bucket,
      to_char(generated.bucket, case when p_range = '12m' then 'Mon YY' else 'Mon DD' end) as label
    from generate_series(date_trunc(bucket_size, local_start), date_trunc(bucket_size, local_now), interval_size) as generated(bucket)
  ), grouped as (
    select date_trunc(bucket_size, events.created_at at time zone 'Asia/Manila') as bucket,
      count(*)::integer as views,
      count(distinct events.visitor_hash)::integer as visitors
    from public.visitor_events events
    where events.created_at >= local_start at time zone 'Asia/Manila'
    group by 1
  ), page_counts as (
    select events.path, count(*)::integer as views
    from public.visitor_events events
    where events.created_at >= local_start at time zone 'Asia/Manila'
    group by events.path
    order by views desc, events.path
    limit 10
  ), recent_views as (
    select events.path, events.created_at
    from public.visitor_events events
    where events.created_at >= local_start at time zone 'Asia/Manila'
    order by events.created_at desc
    limit 15
  )
  select jsonb_build_object(
    'totalViews', (select count(*) from public.visitor_events where created_at >= local_start at time zone 'Asia/Manila'),
    'uniqueVisitors', (select count(distinct visitor_hash) from public.visitor_events where created_at >= local_start at time zone 'Asia/Manila'),
    'series', coalesce((select jsonb_agg(jsonb_build_object('label', buckets.label, 'views', coalesce(grouped.views,0), 'visitors', coalesce(grouped.visitors,0)) order by buckets.bucket) from buckets left join grouped using (bucket)), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', page_counts.path, 'views', page_counts.views) order by page_counts.views desc, page_counts.path) from page_counts), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('path', recent_views.path, 'created_at', recent_views.created_at) order by recent_views.created_at desc) from recent_views), '[]'::jsonb),
    'timezone', 'Asia/Manila'
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_analytics_report(text) from public;
grant execute on function public.admin_analytics_report(text) to authenticated;

insert into public.website_settings(id) values ('default') on conflict (id) do nothing;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
  ('team-images','team-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
  ('service-images','service-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
  ('testimonial-images','testimonial-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view portfolio images" on storage.objects for select to anon, authenticated
using (bucket_id in ('project-images','team-images','service-images','testimonial-images'));
create policy "Admins upload portfolio images" on storage.objects for insert to authenticated
with check (
  bucket_id in ('project-images','team-images','service-images','testimonial-images')
  and public.is_admin()
  and name ~* '\.(jpe?g|png|webp|avif)$'
  and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','image/avif')
);
create policy "Admins update portfolio images" on storage.objects for update to authenticated
using (bucket_id in ('project-images','team-images','service-images','testimonial-images') and public.is_admin())
with check (
  bucket_id in ('project-images','team-images','service-images','testimonial-images')
  and public.is_admin()
  and name ~* '\.(jpe?g|png|webp|avif)$'
  and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','image/avif')
);
create policy "Admins delete portfolio images" on storage.objects for delete to authenticated
using (bucket_id in ('project-images','team-images','service-images','testimonial-images') and public.is_admin());
