create extension if not exists pgcrypto;

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year text,
  region text,
  grape text,
  quantity int not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists wines_updated_idx
  on public.wines (updated_at desc);

alter table public.wines enable row level security;

drop policy if exists "wines_select_public" on public.wines;
create policy "wines_select_public"
on public.wines
for select
to anon, authenticated
using (true);

drop policy if exists "wines_insert_public" on public.wines;
create policy "wines_insert_public"
on public.wines
for insert
to anon, authenticated
with check (true);

drop policy if exists "wines_update_public" on public.wines;
create policy "wines_update_public"
on public.wines
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "wines_delete_public" on public.wines;
create policy "wines_delete_public"
on public.wines
for delete
to anon, authenticated
using (true);
