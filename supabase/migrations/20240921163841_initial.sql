CREATE TYPE "public"."invitation_status" AS ENUM ('pending', 'accepted', 'declined');

CREATE TYPE "public"."notification_type" AS ENUM ('invitation', 'message', 'alert');

CREATE TYPE "public"."user_role" AS ENUM ('owner', 'admin', 'member');

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
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "invited_by" uuid NOT NULL,
    "organization_id" uuid NOT NULL,
    "email" text NOT NULL,
    "role" user_role NOT NULL,
    "status" invitation_status NOT NULL DEFAULT 'pending'::invitation_status,
    "token" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "type" notification_type NOT NULL DEFAULT 'message'::notification_type,
    "title" text,
    "content" text NOT NULL,
    "link" text,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."organization_users" (
    "organization_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" user_role NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."organization_users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."organizations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "logo" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workspace_users" (
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" user_role NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."workspace_users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workspaces" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "description" text,
    "organization_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);

CREATE INDEX idx_app_users_email ON public.app_users USING btree (email);

CREATE INDEX idx_invitations_deleted_at ON public.invitations USING btree (deleted_at);

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);

CREATE INDEX idx_invitations_expires_at ON public.invitations USING btree (expires_at);

CREATE INDEX idx_invitations_organization_id ON public.invitations USING btree (organization_id);

CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);

CREATE INDEX idx_notifications_deleted_at ON public.notifications USING btree (deleted_at);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_organization_users_deleted_at ON public.organization_users USING btree (deleted_at);

CREATE INDEX idx_organization_users_organization_id ON public.organization_users USING btree (organization_id);

CREATE INDEX idx_organization_users_role ON public.organization_users USING btree (role);

CREATE INDEX idx_organization_users_user_id ON public.organization_users USING btree (user_id);

CREATE INDEX idx_organizations_deleted_at ON public.organizations USING btree (deleted_at);

CREATE INDEX idx_organizations_name ON public.organizations USING btree (name);

CREATE INDEX idx_workspace_users_deleted_at ON public.workspace_users USING btree (deleted_at);

CREATE INDEX idx_workspace_users_role ON public.workspace_users USING btree (role);

CREATE INDEX idx_workspace_users_user_id ON public.workspace_users USING btree (user_id);

CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users USING btree (workspace_id);

CREATE INDEX idx_workspaces_deleted_at ON public.workspaces USING btree (deleted_at);

CREATE INDEX idx_workspaces_organization_id ON public.workspaces USING btree (organization_id);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX organization_users_pkey ON public.organization_users USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX unique_organization_user ON public.organization_users USING btree (organization_id, user_id);

CREATE UNIQUE INDEX unique_workspace_user ON public.workspace_users USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspace_users_pkey ON public.workspace_users USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

ALTER TABLE "public"."app_users" ADD CONSTRAINT "app_users_pkey" PRIMARY KEY USING INDEX "app_users_pkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_pkey" PRIMARY KEY USING INDEX "invitations_pkey";

ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY USING INDEX "notifications_pkey";

ALTER TABLE "public"."organization_users" ADD CONSTRAINT "organization_users_pkey" PRIMARY KEY USING INDEX "organization_users_pkey";

ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_pkey" PRIMARY KEY USING INDEX "organizations_pkey";

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

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY (
    organization_id
) REFERENCES organizations (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."invitations" VALIDATE CONSTRAINT "invitations_organization_id_fkey";

ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (
    user_id
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."notifications" VALIDATE CONSTRAINT "notifications_user_id_fkey";

ALTER TABLE "public"."organization_users" ADD CONSTRAINT "check_valid_organization_role" CHECK (
    (role = any(ARRAY['owner'::user_role, 'admin'::user_role, 'member'::user_role]))
) NOT VALID;

ALTER TABLE "public"."organization_users" VALIDATE CONSTRAINT "check_valid_organization_role";

ALTER TABLE "public"."organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY (
    organization_id
) REFERENCES organizations (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."organization_users" VALIDATE CONSTRAINT "organization_users_organization_id_fkey";

ALTER TABLE "public"."organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY (
    user_id
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."organization_users" VALIDATE CONSTRAINT "organization_users_user_id_fkey";

ALTER TABLE "public"."organization_users" ADD CONSTRAINT "unique_organization_user" UNIQUE USING INDEX "unique_organization_user";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "check_valid_workspace_role" CHECK (
    (role = any(ARRAY['owner'::user_role, 'admin'::user_role, 'member'::user_role]))
) NOT VALID;

ALTER TABLE "public"."workspace_users" VALIDATE CONSTRAINT "check_valid_workspace_role";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "unique_workspace_user" UNIQUE USING INDEX "unique_workspace_user";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY (
    user_id
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_users" VALIDATE CONSTRAINT "workspace_users_user_id_fkey";

ALTER TABLE "public"."workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY (
    workspace_id
) REFERENCES workspaces (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_users" VALIDATE CONSTRAINT "workspace_users_workspace_id_fkey";

ALTER TABLE "public"."workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY (
    organization_id
) REFERENCES organizations (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspaces" VALIDATE CONSTRAINT "workspaces_organization_id_fkey";

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_workspace_user_role_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    current_user_role user_role;
BEGIN
    SELECT role INTO current_user_role
    FROM public.workspace_users
    WHERE workspace_id = NEW.workspace_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL;

    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'You do not have permission to modify this workspace user.';
    END IF;

    IF current_user_role = 'admin' AND NEW.role = 'owner' THEN
        RAISE EXCEPTION 'Admin cannot assign owner role.';
    END IF;

    IF current_user_role = 'admin' AND OLD.role = 'owner' THEN
        RAISE EXCEPTION 'Admin cannot modify owner.';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.app_users (id, first_name, last_name, avatar_url, email)
    VALUES (
               NEW.id,
               NEW.raw_user_meta_data ->> 'first_name',
               NEW.raw_user_meta_data ->> 'last_name',
               NEW.raw_user_meta_data ->> 'avatar_url',
               NEW.email
           );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_non_owner_assign_owner_role()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.role = 'owner' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = NEW.organization_id
              AND user_id = auth.uid()
              AND role = 'owner'
              AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Only an owner can assign the owner role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_related_records()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Soft delete related workspaces
    UPDATE public.workspaces
    SET deleted_at = timezone('utc', now())
    WHERE organization_id = OLD.id AND deleted_at IS NULL;

    -- Soft delete organization users
    UPDATE public.organization_users
    SET deleted_at = timezone('utc', now())
    WHERE organization_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_workspace_related()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Soft delete workspace users
    UPDATE public.workspace_users
    SET deleted_at = timezone('utc', now())
    WHERE workspace_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
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

GRANT DELETE ON TABLE "public"."organization_users" TO "anon";

GRANT INSERT ON TABLE "public"."organization_users" TO "anon";

GRANT REFERENCES ON TABLE "public"."organization_users" TO "anon";

GRANT SELECT ON TABLE "public"."organization_users" TO "anon";

GRANT TRIGGER ON TABLE "public"."organization_users" TO "anon";

GRANT TRUNCATE ON TABLE "public"."organization_users" TO "anon";

GRANT UPDATE ON TABLE "public"."organization_users" TO "anon";

GRANT DELETE ON TABLE "public"."organization_users" TO "authenticated";

GRANT INSERT ON TABLE "public"."organization_users" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."organization_users" TO "authenticated";

GRANT SELECT ON TABLE "public"."organization_users" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."organization_users" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."organization_users" TO "authenticated";

GRANT UPDATE ON TABLE "public"."organization_users" TO "authenticated";

GRANT DELETE ON TABLE "public"."organization_users" TO "service_role";

GRANT INSERT ON TABLE "public"."organization_users" TO "service_role";

GRANT REFERENCES ON TABLE "public"."organization_users" TO "service_role";

GRANT SELECT ON TABLE "public"."organization_users" TO "service_role";

GRANT TRIGGER ON TABLE "public"."organization_users" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."organization_users" TO "service_role";

GRANT UPDATE ON TABLE "public"."organization_users" TO "service_role";

GRANT DELETE ON TABLE "public"."organizations" TO "anon";

GRANT INSERT ON TABLE "public"."organizations" TO "anon";

GRANT REFERENCES ON TABLE "public"."organizations" TO "anon";

GRANT SELECT ON TABLE "public"."organizations" TO "anon";

GRANT TRIGGER ON TABLE "public"."organizations" TO "anon";

GRANT TRUNCATE ON TABLE "public"."organizations" TO "anon";

GRANT UPDATE ON TABLE "public"."organizations" TO "anon";

GRANT DELETE ON TABLE "public"."organizations" TO "authenticated";

GRANT INSERT ON TABLE "public"."organizations" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."organizations" TO "authenticated";

GRANT SELECT ON TABLE "public"."organizations" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."organizations" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."organizations" TO "authenticated";

GRANT UPDATE ON TABLE "public"."organizations" TO "authenticated";

GRANT DELETE ON TABLE "public"."organizations" TO "service_role";

GRANT INSERT ON TABLE "public"."organizations" TO "service_role";

GRANT REFERENCES ON TABLE "public"."organizations" TO "service_role";

GRANT SELECT ON TABLE "public"."organizations" TO "service_role";

GRANT TRIGGER ON TABLE "public"."organizations" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."organizations" TO "service_role";

GRANT UPDATE ON TABLE "public"."organizations" TO "service_role";

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

CREATE POLICY "users_can_delete_own_data"
ON "public"."app_users"
AS PERMISSIVE
FOR DELETE
TO public
USING ((auth.uid() = id));


CREATE POLICY "users_can_update_own_data"
ON "public"."app_users"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = id));


CREATE POLICY "users_can_view_own_data"
ON "public"."app_users"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = id));


CREATE POLICY "manage_invitations_policy"
ON "public"."invitations"
AS PERMISSIVE
FOR ALL
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users
    WHERE
        (
            (organization_users.organization_id = invitations.organization_id)
            AND (organization_users.user_id = auth.uid())
            AND (organization_users.role = 'owner'::user_role)
            AND (organization_users.deleted_at IS null)
        )
)));


CREATE POLICY "select_own_invitations_policy"
ON "public"."invitations"
AS PERMISSIVE
FOR SELECT
TO public
USING ((email = (
    SELECT app_users.email
    FROM app_users
    WHERE (app_users.id = auth.uid())
)));


CREATE POLICY "modify_organization_users_policy"
ON "public"."organization_users"
AS PERMISSIVE
FOR ALL
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users AS organization_users_1
    WHERE
        (
            (organization_users_1.organization_id = organization_users_1.organization_id)
            AND (organization_users_1.user_id = auth.uid())
            AND (organization_users_1.role = 'owner'::user_role)
            AND (organization_users_1.deleted_at IS null)
        )
)));


CREATE POLICY "select_organization_users_policy"
ON "public"."organization_users"
AS PERMISSIVE
FOR SELECT
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users AS organization_users_1
    WHERE
        (
            (organization_users_1.organization_id = organization_users_1.organization_id)
            AND (organization_users_1.user_id = auth.uid())
            AND (organization_users_1.role = 'owner'::user_role)
            AND (organization_users_1.deleted_at IS null)
        )
)));


CREATE POLICY "select_organization_policy"
ON "public"."organizations"
AS PERMISSIVE
FOR SELECT
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users
    WHERE
        (
            (organization_users.organization_id = organizations.id)
            AND (organization_users.user_id = auth.uid())
            AND (organization_users.deleted_at IS null)
        )
)));


CREATE POLICY "update_organization_policy"
ON "public"."organizations"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users
    WHERE
        (
            (organization_users.organization_id = organizations.id)
            AND (organization_users.user_id = auth.uid())
            AND (organization_users.role = 'owner'::user_role)
            AND (organization_users.deleted_at IS null)
        )
)));


CREATE POLICY "manage_workspace_users_policy"
ON "public"."workspace_users"
AS PERMISSIVE
FOR ALL
TO public
USING (((EXISTS (
    SELECT 1
    FROM workspace_users AS workspace_users_1
    WHERE
        (
            (workspace_users_1.workspace_id = workspace_users_1.workspace_id)
            AND (workspace_users_1.user_id = auth.uid())
            AND (workspace_users_1.role = 'owner'::user_role)
            AND (workspace_users_1.deleted_at IS null)
        )
))
OR ((
    EXISTS (
        SELECT 1
        FROM workspace_users AS workspace_users_1
        WHERE
            (
                (workspace_users_1.workspace_id = workspace_users_1.workspace_id)
                AND (workspace_users_1.user_id = auth.uid())
                AND (workspace_users_1.role = 'admin'::user_role)
                AND (workspace_users_1.deleted_at IS null)
            )
    )
) AND (role = 'member'::user_role
))));


CREATE POLICY "access_workspace_policy"
ON "public"."workspaces"
AS PERMISSIVE
FOR SELECT
TO public
USING (((EXISTS (
    SELECT 1
    FROM organization_users
    WHERE
        (
            (organization_users.organization_id = workspaces.organization_id)
            AND (organization_users.user_id = auth.uid())
            AND (organization_users.role = 'owner'::user_role)
            AND (organization_users.deleted_at IS null)
        )
))
OR (EXISTS (
    SELECT 1
    FROM workspace_users
    WHERE
        (
            (workspace_users.workspace_id = workspaces.id)
            AND (workspace_users.user_id = auth.uid())
            AND (workspace_users.deleted_at IS null)
        )
))));


CREATE POLICY "modify_workspace_policy"
ON "public"."workspaces"
AS PERMISSIVE
FOR ALL
TO public
USING ((EXISTS (
    SELECT 1
    FROM workspace_users
    WHERE
        (
            (workspace_users.workspace_id = workspaces.id)
            AND (workspace_users.user_id = auth.uid())
            AND (workspace_users.role = any(ARRAY['owner'::user_role, 'admin'::user_role]))
            AND (workspace_users.deleted_at IS null)
        )
)));


CREATE POLICY "select_workspace_policy"
ON "public"."workspaces"
AS PERMISSIVE
FOR SELECT
TO public
USING ((EXISTS (
    SELECT 1
    FROM organization_users
    WHERE
        (
            (organization_users.organization_id = workspaces.organization_id)
            AND (organization_users.user_id = auth.uid())
            AND (organization_users.deleted_at IS null)
        )
)));


CREATE TRIGGER update_timestamp_app_users BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_timestamp_invitations BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_timestamp_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_prevent_non_owner_assign_owner_role BEFORE INSERT OR UPDATE ON public.organization_users FOR EACH ROW EXECUTE FUNCTION prevent_non_owner_assign_owner_role();

CREATE TRIGGER update_timestamp_organization_users BEFORE UPDATE ON public.organization_users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_soft_delete_organization AFTER UPDATE ON public.organizations FOR EACH ROW WHEN (
    ((old.deleted_at IS null) AND (new.deleted_at IS NOT null))
) EXECUTE FUNCTION soft_delete_related_records();

CREATE TRIGGER update_timestamp_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_enforce_workspace_user_role_hierarchy BEFORE INSERT OR UPDATE ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION enforce_workspace_user_role_hierarchy();

CREATE TRIGGER update_timestamp_workspace_users BEFORE UPDATE ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_soft_delete_workspace AFTER UPDATE ON public.workspaces FOR EACH ROW WHEN (
    ((old.deleted_at IS null) AND (new.deleted_at IS NOT null))
) EXECUTE FUNCTION soft_delete_workspace_related();

CREATE TRIGGER update_timestamp_workspaces BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION update_timestamp();
