create table "public"."app_users" (
    "id" uuid not null,
    "avatar_url" text,
    "email" text not null,
    "first_name" text,
    "last_name" text,
    "username" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."app_users" enable row level security;

CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);

CREATE INDEX idx_app_users_email ON public.app_users USING btree (email);

alter table "public"."app_users" add constraint "app_users_pkey" PRIMARY KEY using index "app_users_pkey";

alter table "public"."app_users" add constraint "app_users_email_key" UNIQUE using index "app_users_email_key";

alter table "public"."app_users" add constraint "app_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_users" validate constraint "app_users_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

grant delete on table "public"."app_users" to "anon";

grant insert on table "public"."app_users" to "anon";

grant references on table "public"."app_users" to "anon";

grant select on table "public"."app_users" to "anon";

grant trigger on table "public"."app_users" to "anon";

grant truncate on table "public"."app_users" to "anon";

grant update on table "public"."app_users" to "anon";

grant delete on table "public"."app_users" to "authenticated";

grant insert on table "public"."app_users" to "authenticated";

grant references on table "public"."app_users" to "authenticated";

grant select on table "public"."app_users" to "authenticated";

grant trigger on table "public"."app_users" to "authenticated";

grant truncate on table "public"."app_users" to "authenticated";

grant update on table "public"."app_users" to "authenticated";

grant delete on table "public"."app_users" to "service_role";

grant insert on table "public"."app_users" to "service_role";

grant references on table "public"."app_users" to "service_role";

grant select on table "public"."app_users" to "service_role";

grant trigger on table "public"."app_users" to "service_role";

grant truncate on table "public"."app_users" to "service_role";

grant update on table "public"."app_users" to "service_role";

create policy "users can delete own data"
on "public"."app_users"
as permissive
for delete
to public
using ((auth.uid() = id));


create policy "users can update own data"
on "public"."app_users"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "users can view own data"
on "public"."app_users"
as permissive
for select
to public
using ((auth.uid() = id));




