create type "public"."invitation_status" as enum ('pending', 'accepted', 'declined');

create type "public"."notification_type" as enum ('invitation', 'message', 'alert');

create type "public"."user_role" as enum ('owner', 'admin', 'member');

create table "public"."app_users" (
    "id" uuid not null,
    "email" text not null,
    "first_name" text not null,
    "last_name" text not null,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


create table "public"."grant_applications" (
    "id" uuid not null default uuid_generate_v4(),
    "title" text not null,
    "funding_organization" text not null,
    "workspace_id" uuid not null,
    "content" jsonb not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."invitations" (
    "id" uuid not null default uuid_generate_v4(),
    "invited_by" uuid not null,
    "organization_id" uuid not null,
    "email" text not null,
    "role" user_role not null,
    "status" invitation_status not null default 'pending'::invitation_status,
    "token" uuid not null default uuid_generate_v4(),
    "expires_at" timestamp with time zone not null default (now() + '7 days'::interval),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


create table "public"."mailing_list" (
    "id" uuid not null default uuid_generate_v4(),
    "email" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."notifications" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "type" notification_type not null default 'message'::notification_type,
    "title" text,
    "content" text not null,
    "link" text,
    "read" boolean default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."organization_users" (
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "role" user_role not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."organizations" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "logo" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."workspace_users" (
    "workspace_id" uuid not null,
    "user_id" uuid not null,
    "role" user_role not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "deleted_at" timestamp with time zone
);


create table "public"."workspaces" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "organization_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
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

alter table "public"."app_users" add constraint "app_users_pkey" PRIMARY KEY using index "app_users_pkey";

alter table "public"."grant_applications" add constraint "grant_applications_pkey" PRIMARY KEY using index "grant_applications_pkey";

alter table "public"."invitations" add constraint "invitations_pkey" PRIMARY KEY using index "invitations_pkey";

alter table "public"."mailing_list" add constraint "mailing_list_pkey" PRIMARY KEY using index "mailing_list_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."organization_users" add constraint "organization_users_pkey" PRIMARY KEY using index "organization_users_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."workspace_users" add constraint "workspace_users_pkey" PRIMARY KEY using index "workspace_users_pkey";

alter table "public"."workspaces" add constraint "workspaces_pkey" PRIMARY KEY using index "workspaces_pkey";

alter table "public"."app_users" add constraint "app_users_email_key" UNIQUE using index "app_users_email_key";

alter table "public"."app_users" add constraint "app_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_users" validate constraint "app_users_id_fkey";

alter table "public"."grant_applications" add constraint "grant_applications_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."grant_applications" validate constraint "grant_applications_workspace_id_fkey";

alter table "public"."invitations" add constraint "invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_invited_by_fkey";

alter table "public"."invitations" add constraint "invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_organization_id_fkey";

alter table "public"."mailing_list" add constraint "mailing_list_email_key" UNIQUE using index "mailing_list_email_key";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."organization_users" add constraint "check_valid_organization_role" CHECK ((role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'member'::user_role]))) not valid;

alter table "public"."organization_users" validate constraint "check_valid_organization_role";

alter table "public"."organization_users" add constraint "organization_users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."organization_users" validate constraint "organization_users_organization_id_fkey";

alter table "public"."organization_users" add constraint "organization_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."organization_users" validate constraint "organization_users_user_id_fkey";

alter table "public"."organization_users" add constraint "unique_organization_user" UNIQUE using index "unique_organization_user";

alter table "public"."workspace_users" add constraint "check_valid_workspace_role" CHECK ((role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'member'::user_role]))) not valid;

alter table "public"."workspace_users" validate constraint "check_valid_workspace_role";

alter table "public"."workspace_users" add constraint "unique_workspace_user" UNIQUE using index "unique_workspace_user";

alter table "public"."workspace_users" add constraint "workspace_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES app_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_users" validate constraint "workspace_users_user_id_fkey";

alter table "public"."workspace_users" add constraint "workspace_users_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_users" validate constraint "workspace_users_workspace_id_fkey";

alter table "public"."workspaces" add constraint "workspaces_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspaces" validate constraint "workspaces_organization_id_fkey";



