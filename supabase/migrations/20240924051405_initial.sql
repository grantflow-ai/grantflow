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


CREATE TABLE "public"."grant_applications" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "title" text NOT NULL,
    "funding_organization" text NOT NULL,
    "workspace_id" uuid NOT NULL,
    "content" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


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


CREATE TABLE "public"."mailing_list" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "email" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


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


CREATE TABLE "public"."organizations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "logo" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."workspace_users" (
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" user_role NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE TABLE "public"."workspaces" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "description" text,
    "organization_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);

CREATE UNIQUE INDEX grant_applications_pkey ON public.grant_applications USING btree (id);

CREATE INDEX idx_app_users_email ON public.app_users USING btree (email);

CREATE INDEX idx_grant_applications_deleted_at ON public.grant_applications USING btree (deleted_at);

CREATE INDEX idx_grant_applications_workspace_id ON public.grant_applications USING btree (workspace_id);

CREATE INDEX idx_invitations_deleted_at ON public.invitations USING btree (deleted_at);

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);

CREATE INDEX idx_invitations_expires_at ON public.invitations USING btree (expires_at);

CREATE INDEX idx_invitations_organization_id ON public.invitations USING btree (organization_id);

CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);

CREATE INDEX idx_mailing_list_email ON public.mailing_list USING btree (email);

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

CREATE UNIQUE INDEX mailing_list_email_key ON public.mailing_list USING btree (email);

CREATE UNIQUE INDEX mailing_list_pkey ON public.mailing_list USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX organization_users_pkey ON public.organization_users USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX unique_organization_user ON public.organization_users USING btree (organization_id, user_id);

CREATE UNIQUE INDEX unique_workspace_user ON public.workspace_users USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspace_users_pkey ON public.workspace_users USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

ALTER TABLE "public"."app_users" ADD CONSTRAINT "app_users_pkey" PRIMARY KEY USING INDEX "app_users_pkey";

ALTER TABLE "public"."grant_applications" ADD CONSTRAINT "grant_applications_pkey" PRIMARY KEY USING INDEX "grant_applications_pkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_pkey" PRIMARY KEY USING INDEX "invitations_pkey";

ALTER TABLE "public"."mailing_list" ADD CONSTRAINT "mailing_list_pkey" PRIMARY KEY USING INDEX "mailing_list_pkey";

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

ALTER TABLE "public"."grant_applications" ADD CONSTRAINT "grant_applications_workspace_id_fkey" FOREIGN KEY (
    workspace_id
) REFERENCES workspaces (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."grant_applications" VALIDATE CONSTRAINT "grant_applications_workspace_id_fkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY (
    invited_by
) REFERENCES app_users (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."invitations" VALIDATE CONSTRAINT "invitations_invited_by_fkey";

ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY (
    organization_id
) REFERENCES organizations (id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."invitations" VALIDATE CONSTRAINT "invitations_organization_id_fkey";

ALTER TABLE "public"."mailing_list" ADD CONSTRAINT "mailing_list_email_key" UNIQUE USING INDEX "mailing_list_email_key";

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
