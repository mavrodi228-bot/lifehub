-- LifeHub Supabase setup
-- Run this once in Supabase SQL Editor.

create table if not exists public.lifehub_households (
  workspace_key text primary key,
  name text not null default 'LifeHub family',
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lifehub_members (
  workspace_key text not null references public.lifehub_households(workspace_key) on delete cascade,
  user_id uuid not null,
  email text,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_key, user_id)
);

create table if not exists public.lifehub_invites (
  token text primary key,
  workspace_key text not null references public.lifehub_households(workspace_key) on delete cascade,
  created_by uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lifehub_items (
  workspace_key text not null,
  id text not null,
  list text not null check (list in ('tasks', 'shopping', 'documents', 'family')),
  title text not null,
  category text,
  due_date date,
  note text,
  done boolean not null default false,
  attachment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_key, id)
);

alter table public.lifehub_households enable row level security;
alter table public.lifehub_members enable row level security;
alter table public.lifehub_invites enable row level security;
alter table public.lifehub_items enable row level security;

grant select, insert, update, delete on public.lifehub_households to anon, authenticated;
grant select, insert, update, delete on public.lifehub_members to anon, authenticated;
grant select, insert, update, delete on public.lifehub_invites to anon, authenticated;
grant select, insert, update, delete on public.lifehub_items to anon, authenticated;

drop policy if exists "lifehub households access" on public.lifehub_households;
drop policy if exists "lifehub members access" on public.lifehub_members;
drop policy if exists "lifehub invites access" on public.lifehub_invites;
drop policy if exists "lifehub items access" on public.lifehub_items;

-- MVP policies: the browser uses workspace_key plus Supabase Auth.
-- For production, tighten these with user-scoped membership checks.
create policy "lifehub households access"
on public.lifehub_households
for all
to anon, authenticated
using (true)
with check (true);

create policy "lifehub members access"
on public.lifehub_members
for all
to anon, authenticated
using (true)
with check (true);

create policy "lifehub invites access"
on public.lifehub_invites
for all
to anon, authenticated
using (true)
with check (true);

create policy "lifehub items access"
on public.lifehub_items
for all
to anon, authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('lifehub-files', 'lifehub-files', true)
on conflict (id) do update set public = true;

drop policy if exists "lifehub files read" on storage.objects;
drop policy if exists "lifehub files insert" on storage.objects;
drop policy if exists "lifehub files update" on storage.objects;
drop policy if exists "lifehub files delete" on storage.objects;

create policy "lifehub files read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'lifehub-files');

create policy "lifehub files insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'lifehub-files');

create policy "lifehub files update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'lifehub-files')
with check (bucket_id = 'lifehub-files');

create policy "lifehub files delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'lifehub-files');
