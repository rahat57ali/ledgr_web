create extension if not exists "pgcrypto";

create table if not exists public.budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month text not null,
  total_budget numeric not null default 0,
  rollover_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, budget_month)
);

create table if not exists public.budget_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month text not null,
  name text not null,
  budget_amount numeric not null default 0,
  is_default boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month text not null,
  label text not null,
  amount numeric not null default 0,
  is_rollover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null,
  category_name text not null,
  expense_date timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'credit-card',
  amount numeric not null,
  next_due_date timestamptz not null,
  category_name text not null default 'Bills',
  created_at timestamptz not null default now()
);

create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'complete')),
  group_by_category boolean not null default false,
  receipt_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  estimated_price numeric not null default 0,
  category_name text not null default 'Grocery',
  is_bought boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.rollover_recovery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_month text not null,
  target_month text not null,
  step integer not null check (step between 1 and 3),
  rollover_amount numeric not null default 0,
  previous_budget_total numeric not null default 0,
  updated_budget_total numeric,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_budget_months_updated_at on public.budget_months;
create trigger trg_budget_months_updated_at
before update on public.budget_months
for each row execute function public.set_updated_at();

drop trigger if exists trg_rollover_recovery_updated_at on public.rollover_recovery;
create trigger trg_rollover_recovery_updated_at
before update on public.rollover_recovery
for each row execute function public.set_updated_at();

alter table public.budget_months enable row level security;
alter table public.budget_allocations enable row level security;
alter table public.income_sources enable row level security;
alter table public.expenses enable row level security;
alter table public.bills enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_items enable row level security;
alter table public.rollover_recovery enable row level security;

create policy "budget_months_self" on public.budget_months
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budget_allocations_self" on public.budget_allocations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "income_sources_self" on public.income_sources
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "expenses_self" on public.expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bills_self" on public.bills
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "grocery_lists_self" on public.grocery_lists
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "grocery_items_self" on public.grocery_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rollover_recovery_self" on public.rollover_recovery
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_read_own" on storage.objects
for select using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_insert_own" on storage.objects
for insert with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_delete_own" on storage.objects
for delete using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
