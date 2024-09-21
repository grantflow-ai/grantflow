CREATE TYPE "public"."invitation_status" AS ENUM ('pending', 'accepted', 'declined');

CREATE TYPE "public"."workspace_role" AS ENUM ('owner', 'admin', 'viewer');

CREATE TABLE "public"."app_users" (
    "id" uuid NOT NULL,
    "email" text NOT NULL,
    "first_name" text NOT NULL,
    "last_name" text NOT NULL,
    "avatar_url" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);


ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."invitations" (
    "id" uuid NOT NULL,
    "invited_by" uuid NOT NULL,
    "workspace_id" uuid NOT NULL,
    "email" text NOT NULL,
    "status" invitation_status NOT NULL DEFAULT 'pending'::invitation_status,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."notifications" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "content" text NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."workspace_users" (
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" workspace_role NOT NULL,
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."workspaces" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);

CREATE INDEX idx_app_users_email ON public.app_users USING btree (email);

CREATE INDEX idx_invitations_created_at ON public.invitations USING btree (created_at);

CREATE INDEX idx_invitations_deleted_at ON public.invitations USING btree (deleted_at);

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);

CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);

CREATE INDEX idx_notifications_deleted_at ON public.notifications USING btree (deleted_at);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_workspace_users_deleted_at ON public.workspace_users USING btree (deleted_at);

CREATE INDEX idx_workspace_users_role ON public.workspace_users USING btree (role);

CREATE INDEX idx_workspace_users_user_id ON public.workspace_users USING btree (user_id);

CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users USING btree (workspace_id);

CREATE INDEX idx_workspaces_deleted_at ON public.workspaces USING btree (deleted_at);

CREATE INDEX idx_workspaces_name ON public.workspaces USING btree (name);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX workspace_users_pkey ON public.workspace_users USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

ALTER TABLE "public"."app_users" ADD CONSTRAINT "app_users_pkey" PRIMARY KEY USING INDEX "app_users_pkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_pkey" PRIMARY KEY USING INDEX "invitations_pkey";

ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY USING INDEX "notifications_pkey";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "workspace_users_pkey" PRIMARY KEY USING INDEX "workspace_users_pkey";

ALTER TABLE "public"."workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY USING INDEX "workspaces_pkey";

ALTER TABLE "public"."app_users" ADD CONSTRAINT "app_users_email_key" UNIQUE USING INDEX "app_users_email_key";

ALTER TABLE "public"."app_users" ADD CONSTRAINT "app_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users (
    id
) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."app_users" VALIDATE CONSTRAINT "app_users_id_fkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY (
    invited_by
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."invitations" VALIDATE CONSTRAINT "invitations_invited_by_fkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_workspace_id_fkey" FOREIGN KEY (
    workspace_id
) REFERENCES workspaces (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."invitations" VALIDATE CONSTRAINT "invitations_workspace_id_fkey";

ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (
    user_id
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."notifications" VALIDATE CONSTRAINT "notifications_user_id_fkey";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY (
    user_id
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_users" VALIDATE CONSTRAINT "workspace_users_user_id_fkey";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY (
    workspace_id
) REFERENCES workspaces (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_users" VALIDATE CONSTRAINT "workspace_users_workspace_id_fkey";

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    insert into public.app_users (id, first_name, last_name, avatar_url, email)
    values (
               new.id,
               new.raw_user_meta_data ->> 'first_name',
               new.raw_user_meta_data ->> 'last_name',
               new.raw_user_meta_data ->> 'avatar_url',
               new.email
           );
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
    if not exists (select 1 from public.workspace_users where workspace_id = old.workspace_id and deleted_at is null) then
        update public.workspaces set deleted_at = now() where id = old.workspace_id;
    end if;
    return old;
end;
$function$;

GRANT DELETE ON TABLE "public"."app_users" TO "anon";

GRANT INSERT ON TABLE "public"."app_users" TO "anon";

GRANT REFERENCES ON TABLE "public"."app_users" TO "anon";

GRANT SELECT ON TABLE "public"."app_users" TO "anon";

GRANT TRIGGER ON TABLE "public"."app_users" TO "anon";

GRANT TRUNCATE ON TABLE "public"."app_users" TO "anon";

GRANT UPDATE ON TABLE "public"."app_users" TO "anon";

GRANT DELETE ON TABLE "public"."app_users" TO "authenticated";

GRANT INSERT ON TABLE "public"."app_users" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."app_users" TO "authenticated";

GRANT SELECT ON TABLE "public"."app_users" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."app_users" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."app_users" TO "authenticated";

GRANT UPDATE ON TABLE "public"."app_users" TO "authenticated";

GRANT DELETE ON TABLE "public"."app_users" TO "service_role";

GRANT INSERT ON TABLE "public"."app_users" TO "service_role";

GRANT REFERENCES ON TABLE "public"."app_users" TO "service_role";

GRANT SELECT ON TABLE "public"."app_users" TO "service_role";

GRANT TRIGGER ON TABLE "public"."app_users" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."app_users" TO "service_role";

GRANT UPDATE ON TABLE "public"."app_users" TO "service_role";

GRANT DELETE ON TABLE "public"."invitations" TO "anon";

GRANT INSERT ON TABLE "public"."invitations" TO "anon";

GRANT REFERENCES ON TABLE "public"."invitations" TO "anon";

GRANT SELECT ON TABLE "public"."invitations" TO "anon";

GRANT TRIGGER ON TABLE "public"."invitations" TO "anon";

GRANT TRUNCATE ON TABLE "public"."invitations" TO "anon";

GRANT UPDATE ON TABLE "public"."invitations" TO "anon";

GRANT DELETE ON TABLE "public"."invitations" TO "authenticated";

GRANT INSERT ON TABLE "public"."invitations" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."invitations" TO "authenticated";

GRANT SELECT ON TABLE "public"."invitations" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."invitations" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."invitations" TO "authenticated";

GRANT UPDATE ON TABLE "public"."invitations" TO "authenticated";

GRANT DELETE ON TABLE "public"."invitations" TO "service_role";

GRANT INSERT ON TABLE "public"."invitations" TO "service_role";

GRANT REFERENCES ON TABLE "public"."invitations" TO "service_role";

GRANT SELECT ON TABLE "public"."invitations" TO "service_role";

GRANT TRIGGER ON TABLE "public"."invitations" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."invitations" TO "service_role";

GRANT UPDATE ON TABLE "public"."invitations" TO "service_role";

GRANT DELETE ON TABLE "public"."notifications" TO "anon";

GRANT INSERT ON TABLE "public"."notifications" TO "anon";

GRANT REFERENCES ON TABLE "public"."notifications" TO "anon";

GRANT SELECT ON TABLE "public"."notifications" TO "anon";

GRANT TRIGGER ON TABLE "public"."notifications" TO "anon";

GRANT TRUNCATE ON TABLE "public"."notifications" TO "anon";

GRANT UPDATE ON TABLE "public"."notifications" TO "anon";

GRANT DELETE ON TABLE "public"."notifications" TO "authenticated";

GRANT INSERT ON TABLE "public"."notifications" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."notifications" TO "authenticated";

GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."notifications" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."notifications" TO "authenticated";

GRANT UPDATE ON TABLE "public"."notifications" TO "authenticated";

GRANT DELETE ON TABLE "public"."notifications" TO "service_role";

GRANT INSERT ON TABLE "public"."notifications" TO "service_role";

GRANT REFERENCES ON TABLE "public"."notifications" TO "service_role";

GRANT SELECT ON TABLE "public"."notifications" TO "service_role";

GRANT TRIGGER ON TABLE "public"."notifications" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."notifications" TO "service_role";

GRANT UPDATE ON TABLE "public"."notifications" TO "service_role";

GRANT DELETE ON TABLE "public"."workspace_users" TO "anon";

GRANT INSERT ON TABLE "public"."workspace_users" TO "anon";

GRANT REFERENCES ON TABLE "public"."workspace_users" TO "anon";

GRANT SELECT ON TABLE "public"."workspace_users" TO "anon";

GRANT TRIGGER ON TABLE "public"."workspace_users" TO "anon";

GRANT TRUNCATE ON TABLE "public"."workspace_users" TO "anon";

GRANT UPDATE ON TABLE "public"."workspace_users" TO "anon";

GRANT DELETE ON TABLE "public"."workspace_users" TO "authenticated";

GRANT INSERT ON TABLE "public"."workspace_users" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."workspace_users" TO "authenticated";

GRANT SELECT ON TABLE "public"."workspace_users" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."workspace_users" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."workspace_users" TO "authenticated";

GRANT UPDATE ON TABLE "public"."workspace_users" TO "authenticated";

GRANT DELETE ON TABLE "public"."workspace_users" TO "service_role";

GRANT INSERT ON TABLE "public"."workspace_users" TO "service_role";

GRANT REFERENCES ON TABLE "public"."workspace_users" TO "service_role";

GRANT SELECT ON TABLE "public"."workspace_users" TO "service_role";

GRANT TRIGGER ON TABLE "public"."workspace_users" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."workspace_users" TO "service_role";

GRANT UPDATE ON TABLE "public"."workspace_users" TO "service_role";

GRANT DELETE ON TABLE "public"."workspaces" TO "anon";

GRANT INSERT ON TABLE "public"."workspaces" TO "anon";

GRANT REFERENCES ON TABLE "public"."workspaces" TO "anon";

GRANT SELECT ON TABLE "public"."workspaces" TO "anon";

GRANT TRIGGER ON TABLE "public"."workspaces" TO "anon";

GRANT TRUNCATE ON TABLE "public"."workspaces" TO "anon";

GRANT UPDATE ON TABLE "public"."workspaces" TO "anon";

GRANT DELETE ON TABLE "public"."workspaces" TO "authenticated";

GRANT INSERT ON TABLE "public"."workspaces" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."workspaces" TO "authenticated";

GRANT SELECT ON TABLE "public"."workspaces" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."workspaces" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."workspaces" TO "authenticated";

GRANT UPDATE ON TABLE "public"."workspaces" TO "authenticated";

GRANT DELETE ON TABLE "public"."workspaces" TO "service_role";

GRANT INSERT ON TABLE "public"."workspaces" TO "service_role";

GRANT REFERENCES ON TABLE "public"."workspaces" TO "service_role";

GRANT SELECT ON TABLE "public"."workspaces" TO "service_role";

GRANT TRIGGER ON TABLE "public"."workspaces" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."workspaces" TO "service_role";

GRANT UPDATE ON TABLE "public"."workspaces" TO "service_role";

CREATE POLICY "users can delete own data"
ON "public"."app_users"
AS PERMISSIVE
FOR DELETE
TO public
USING ((auth.uid() = id));


CREATE POLICY "users can update own data"
ON "public"."app_users"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = id));


CREATE POLICY "users can view own data"
ON "public"."app_users"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = id));


CREATE TRIGGER soft_delete_workspace_trigger AFTER DELETE ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION soft_delete_workspace();
