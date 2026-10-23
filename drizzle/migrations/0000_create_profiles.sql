create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_unique on public.profiles (lower(username));

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Anyone can view profiles"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username)
    values (
      new.id,
      left(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, 'user'), '@', 1)), 20) || '_' || substr(new.id::text, 1, 4)
    )
    on conflict (id) do nothing;
    return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();