-- LifeHub Supabase setup
-- Run this once in Supabase SQL Editor.

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

alter table public.lifehub_items enable row level security;

grant select, insert, update, delete on public.lifehub_items to anon;

drop policy if exists "lifehub anon read" on public.lifehub_items;
drop policy if exists "lifehub anon insert" on public.lifehub_items;
drop policy if exists "lifehub anon update" on public.lifehub_items;
drop policy if exists "lifehub anon delete" on public.lifehub_items;

-- MVP policy: the browser uses a random workspace_key.
-- For production, replace this with Supabase Auth policies.
create policy "lifehub anon read"
on public.lifehub_items for select
to anon
using (true);

create policy "lifehub anon insert"
on public.lifehub_items for insert
to anon
with check (true);

create policy "lifehub anon update"
on public.lifehub_items for update
to anon
using (true)
with check (true);

create policy "lifehub anon delete"
on public.lifehub_items for delete
to anon
using (true);

insert into storage.buckets (id, name, public)
values ('lifehub-files', 'lifehub-files', true)
on conflict (id) do update set public = true;

drop policy if exists "lifehub files read" on storage.objects;
drop policy if exists "lifehub files insert" on storage.objects;
drop policy if exists "lifehub files update" on storage.objects;
drop policy if exists "lifehub files delete" on storage.objects;

create policy "lifehub files read"
on storage.objects for select
to anon
using (bucket_id = 'lifehub-files');

create policy "lifehub files insert"
on storage.objects for insert
to anon
with check (bucket_id = 'lifehub-files');

create policy "lifehub files update"
on storage.objects for update
to anon
using (bucket_id = 'lifehub-files')
with check (bucket_id = 'lifehub-files');

create policy "lifehub files delete"
on storage.objects for delete
to anon
using (bucket_id = 'lifehub-files');
