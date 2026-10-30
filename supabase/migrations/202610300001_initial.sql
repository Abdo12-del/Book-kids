-- Initial schema. Apply only to a dedicated Supabase project.
-- Public access is limited to published content and approved comments.
create extension if not exists pgcrypto;

create type public.story_status as enum ('draft', 'in_review', 'needs_revision', 'approved', 'published', 'rejected');
create type public.admin_role as enum ('super_admin', 'content_manager', 'reviewer', 'comment_moderator');
create type public.comment_status as enum ('pending', 'approved', 'hidden');

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.admin_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.admin_role not null,
  primary key(user_id, role)
);
-- Never grant client access to code hashes. Exchange codes only via a trusted server.
create table public.access_codes (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.child_profiles(id) on delete cascade,
  code_hash text not null unique, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.volumes (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
  introduction text not null default '', cover_path text, published boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now()
);
create table public.stories (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.child_profiles(id),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) <= 50000),
  category text not null default 'أخرى', cover_path text, notes text,
  status public.story_status not null default 'draft', review_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.story_versions (
  id bigint generated always as identity primary key, story_id uuid not null references public.stories(id) on delete cascade,
  title text not null, body text not null, edited_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.volume_stories (
  volume_id uuid not null references public.volumes(id) on delete cascade,
  story_id uuid not null unique references public.stories(id) on delete cascade,
  position integer not null check (position >= 0), primary key(volume_id, story_id), unique(volume_id, position)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(), story_id uuid not null references public.stories(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000), status public.comment_status not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.story_views (
  id bigint generated always as identity primary key, story_id uuid not null references public.stories(id) on delete cascade,
  -- A rotating, server-generated pseudonymous token; never an IP address.
  visitor_token text not null, viewed_on date not null default current_date,
  created_at timestamptz not null default now(), unique(story_id, visitor_token, viewed_on)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade, message text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.moderation_logs (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  story_id uuid references public.stories(id), action text not null, detail text, created_at timestamptz not null default now()
);

create function public.has_admin_role(allowed public.admin_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_roles where user_id = auth.uid() and role = any(allowed));
$$;
revoke all on function public.has_admin_role(public.admin_role[]) from public;
grant execute on function public.has_admin_role(public.admin_role[]) to anon, authenticated;

-- Avoid recursive RLS checks between stories and volume_stories.
create function public.is_story_public(story_uuid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.stories s join public.volume_stories vs on vs.story_id = s.id join public.volumes v on v.id = vs.volume_id where s.id = story_uuid and s.status = 'published' and v.published);
$$;
revoke all on function public.is_story_public(uuid) from public;
grant execute on function public.is_story_public(uuid) to anon, authenticated;

alter table public.child_profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.access_codes enable row level security;
alter table public.volumes enable row level security;
alter table public.stories enable row level security;
alter table public.story_versions enable row level security;
alter table public.volume_stories enable row level security;
alter table public.comments enable row level security;
alter table public.story_views enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_logs enable row level security;

create policy child_self on public.child_profiles for select to authenticated using (user_id = auth.uid());
create policy child_admin on public.child_profiles for all to authenticated using (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[])) with check (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[]));
create policy own_role on public.admin_roles for select to authenticated using (user_id = auth.uid());
create policy published_volumes on public.volumes for select using (published);
create policy manage_volumes on public.volumes for all to authenticated using (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[])) with check (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[]));
create policy published_stories on public.stories for select using (public.is_story_public(id));
create policy own_stories on public.stories for select to authenticated using (exists(select 1 from public.child_profiles c where c.id = child_id and c.user_id = auth.uid() and c.active));
create policy create_draft on public.stories for insert to authenticated with check (status = 'draft' and exists(select 1 from public.child_profiles c where c.id = child_id and c.user_id = auth.uid() and c.active));
-- Status transitions and reviews need server-side validation; child updates are not granted directly.
create policy review_stories on public.stories for all to authenticated using (public.has_admin_role(array['super_admin','content_manager','reviewer']::public.admin_role[])) with check (public.has_admin_role(array['super_admin','content_manager','reviewer']::public.admin_role[]));
create policy version_staff on public.story_versions for select to authenticated using (public.has_admin_role(array['super_admin','content_manager','reviewer']::public.admin_role[]));
create policy version_child on public.story_versions for select to authenticated using (exists(select 1 from public.stories s join public.child_profiles c on c.id = s.child_id where s.id = story_id and c.user_id = auth.uid() and c.active));
create policy published_volume_stories on public.volume_stories for select using (public.is_story_public(story_id));
create policy manage_volume_stories on public.volume_stories for all to authenticated using (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[])) with check (public.has_admin_role(array['super_admin','content_manager']::public.admin_role[]));
create policy approved_comments on public.comments for select using (status = 'approved' and public.is_story_public(story_id));
create policy moderate_comments on public.comments for all to authenticated using (public.has_admin_role(array['super_admin','comment_moderator']::public.admin_role[])) with check (public.has_admin_role(array['super_admin','comment_moderator']::public.admin_role[]));
create policy own_notifications on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy staff_logs on public.moderation_logs for select to authenticated using (public.has_admin_role(array['super_admin','content_manager','reviewer','comment_moderator']::public.admin_role[]));

-- Retain original and each changed text version, including administrative corrections.
create function public.save_story_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.body is distinct from old.body or new.title is distinct from old.title then
    insert into public.story_versions(story_id,title,body,edited_by) values(new.id,new.title,new.body,auth.uid());
  end if;
  return new;
end $$;
create trigger story_version_after_change after insert or update on public.stories for each row execute function public.save_story_version();

-- Do not expose review notes or child IDs to anonymous readers. A curated public
-- view/endpoint with an explicit column list must be installed before launch.
revoke select on public.stories from anon;
