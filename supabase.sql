-- LifeHub production Supabase setup
-- Run in Supabase SQL Editor after creating the project.

create table if not exists public.lifehub_households (
  workspace_key text primary key,
  name text not null default 'LifeHub family',
  owner_user_id uuid not null,
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
  created_by uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lifehub_items (
  workspace_key text not null references public.lifehub_households(workspace_key) on delete cascade,
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

create or replace function public.lifehub_is_member(target_workspace text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lifehub_members
    where workspace_key = target_workspace
      and user_id = auth.uid()
  );
$$;

create or replace function public.lifehub_is_owner(target_workspace text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lifehub_members
    where workspace_key = target_workspace
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.accept_lifehub_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace text;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select workspace_key
    into target_workspace
  from public.lifehub_invites
  where token = invite_token
    and expires_at > now();

  if target_workspace is null then
    raise exception 'Invite not found or expired';
  end if;

  user_email := coalesce(auth.jwt() ->> 'email', '');

  insert into public.lifehub_members (workspace_key, user_id, email, role)
  values (target_workspace, auth.uid(), user_email, 'member')
  on conflict (workspace_key, user_id)
  do update set email = excluded.email;

  return target_workspace;
end;
$$;

alter table public.lifehub_households enable row level security;
alter table public.lifehub_members enable row level security;
alter table public.lifehub_invites enable row level security;
alter table public.lifehub_items enable row level security;

grant select, insert, update, delete on public.lifehub_households to authenticated;
grant select, insert, update, delete on public.lifehub_members to authenticated;
grant select, insert, update, delete on public.lifehub_invites to authenticated;
grant select, insert, update, delete on public.lifehub_items to authenticated;
grant execute on function public.accept_lifehub_invite(text) to authenticated;

drop policy if exists "households select members" on public.lifehub_households;
drop policy if exists "households insert owner" on public.lifehub_households;
drop policy if exists "households update owner" on public.lifehub_households;
drop policy if exists "members select members" on public.lifehub_members;
drop policy if exists "members insert self owner" on public.lifehub_members;
drop policy if exists "members update owner" on public.lifehub_members;
drop policy if exists "invites select authenticated" on public.lifehub_invites;
drop policy if exists "invites insert members" on public.lifehub_invites;
drop policy if exists "invites delete owner" on public.lifehub_invites;
drop policy if exists "items all members" on public.lifehub_items;

create policy "households select members"
on public.lifehub_households for select
to authenticated
using (public.lifehub_is_member(workspace_key));

create policy "households insert owner"
on public.lifehub_households for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "households update owner"
on public.lifehub_households for update
to authenticated
using (public.lifehub_is_owner(workspace_key))
with check (public.lifehub_is_owner(workspace_key));

create policy "members select members"
on public.lifehub_members for select
to authenticated
using (public.lifehub_is_member(workspace_key));

create policy "members insert self owner"
on public.lifehub_members for insert
to authenticated
with check (user_id = auth.uid() and role = 'owner');

create policy "members update owner"
on public.lifehub_members for update
to authenticated
using (public.lifehub_is_owner(workspace_key))
with check (public.lifehub_is_owner(workspace_key));

create policy "invites select authenticated"
on public.lifehub_invites for select
to authenticated
using (true);

create policy "invites insert members"
on public.lifehub_invites for insert
to authenticated
with check (public.lifehub_is_member(workspace_key) and created_by = auth.uid());

create policy "invites delete owner"
on public.lifehub_invites for delete
to authenticated
using (public.lifehub_is_owner(workspace_key));

create policy "items all members"
on public.lifehub_items for all
to authenticated
using (public.lifehub_is_member(workspace_key))
with check (public.lifehub_is_member(workspace_key));

insert into storage.buckets (id, name, public)
values ('lifehub-files', 'lifehub-files', true)
on conflict (id) do update set public = true;

drop policy if exists "lifehub files read members" on storage.objects;
drop policy if exists "lifehub files insert members" on storage.objects;
drop policy if exists "lifehub files update members" on storage.objects;
drop policy if exists "lifehub files delete members" on storage.objects;

create policy "lifehub files read members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lifehub-files'
  and public.lifehub_is_member((storage.foldername(name))[1])
);

create policy "lifehub files insert members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lifehub-files'
  and public.lifehub_is_member((storage.foldername(name))[1])
);

create policy "lifehub files update members"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lifehub-files'
  and public.lifehub_is_member((storage.foldername(name))[1])
)
with check (
  bucket_id = 'lifehub-files'
  and public.lifehub_is_member((storage.foldername(name))[1])
);

create policy "lifehub files delete members"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lifehub-files'
  and public.lifehub_is_member((storage.foldername(name))[1])
);
