create table public.app_users
(
    id         uuid primary key references auth.users (id) on delete cascade on update cascade,
    avatar_url text,
    email      text        not null unique,
    first_name text        null,
    last_name  text        null,
    username   text        not null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_app_users_email on public.app_users (email);

alter table public.app_users
    enable row level security;

create policy "users can view own data" on public.app_users
    for select using (auth.uid() = id);

create policy "users can update own data" on public.app_users
    for update using (auth.uid() = id);

create policy "users can delete own data" on public.app_users
    for delete using (auth.uid() = id);


create or replace function public.handle_new_user()
    returns trigger as
$$
begin
    insert into public.app_users (id, email, username, first_name, last_name, avatar_url)
    values (new.id,
            new.email,
            new.raw_user_meta_data ->> 'username',
            new.raw_user_meta_data ->> 'first_name',
            new.raw_user_meta_data ->> 'last_name',
            new.raw_user_meta_data ->> 'avatar_url');
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert
    on auth.users
    for each row
execute procedure public.handle_new_user();
