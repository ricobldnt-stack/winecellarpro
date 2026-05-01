create extension if not exists pgcrypto;

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  year text,
  region text,
  grape text,
  quantity int not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists wines_user_updated_idx
  on public.wines (user_id, updated_at desc);

alter table public.wines enable row level security;

drop policy if exists "wines_select_own" on public.wines;
create policy "wines_select_own"
on public.wines
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "wines_insert_own" on public.wines;
create policy "wines_insert_own"
on public.wines
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "wines_update_own" on public.wines;
create policy "wines_update_own"
on public.wines
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wines_delete_own" on public.wines;
create policy "wines_delete_own"
on public.wines
for delete
to authenticated
using (auth.uid() = user_id);
