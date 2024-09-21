-- =============================================
-- Schema: version 2.2
-- =============================================

-- =============================================
-- Type Declarations
-- =============================================

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE notification_type AS ENUM ('invitation', 'message', 'alert');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');

-- =============================================
-- Table Definitions
-- =============================================

-- users table -- stores user information and links to auth.users
CREATE TABLE public.app_users (
    -- primary key
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- user information
    email text NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    avatar_url text,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- indexes
CREATE INDEX idx_app_users_email ON public.app_users (email);

-- row-level security
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users_can_view_own_data" ON public.app_users
FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_can_update_own_data" ON public.app_users
FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_can_delete_own_data" ON public.app_users
FOR DELETE USING (auth.uid() = id);

-- organizations table -- stores organization information
CREATE TABLE public.organizations (
    -- primary key
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- organization information
    name text NOT NULL,
    logo text,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    deleted_at timestamp with time zone  -- for soft delete
);

-- indexes
CREATE INDEX idx_organizations_name ON public.organizations (name);
CREATE INDEX idx_organizations_deleted_at ON public.organizations (deleted_at);

-- organization_users table -- links users to organizations and defines their roles
CREATE TABLE public.organization_users (
    -- composite primary key
    organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    user_id uuid REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    role user_role NOT NULL,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    deleted_at timestamp with time zone,  -- for soft delete

    PRIMARY KEY (organization_id, user_id)
);

-- indexes
CREATE INDEX idx_organization_users_role ON public.organization_users (role);
CREATE INDEX idx_organization_users_organization_id ON public.organization_users (organization_id);
CREATE INDEX idx_organization_users_user_id ON public.organization_users (user_id);
CREATE INDEX idx_organization_users_deleted_at ON public.organization_users (deleted_at);

-- workspaces table -- stores workspace information linked to organizations
CREATE TABLE public.workspaces (
    -- primary key
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- workspace information
    name text NOT NULL,
    description text,
    organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    deleted_at timestamp with time zone  -- for soft delete
);

-- indexes
CREATE INDEX idx_workspaces_organization_id ON public.workspaces (organization_id);
CREATE INDEX idx_workspaces_deleted_at ON public.workspaces (deleted_at);

-- workspace_users table -- links users to workspaces and defines their roles
CREATE TABLE public.workspace_users (
    -- composite primary key
    workspace_id uuid REFERENCES public.workspaces (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    user_id uuid REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    role user_role NOT NULL,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    deleted_at timestamp with time zone,  -- for soft delete

    PRIMARY KEY (workspace_id, user_id)
);

-- indexes
CREATE INDEX idx_workspace_users_role ON public.workspace_users (role);
CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users (workspace_id);
CREATE INDEX idx_workspace_users_user_id ON public.workspace_users (user_id);
CREATE INDEX idx_workspace_users_deleted_at ON public.workspace_users (deleted_at);

-- invitations table -- stores organization invitations sent to users
CREATE TABLE public.invitations (
    -- primary key
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- foreign keys
    invited_by uuid REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,

    -- invitation information
    email text NOT NULL,
    role user_role NOT NULL,
    status invitation_status DEFAULT 'pending' NOT NULL,
    token uuid NOT NULL DEFAULT uuid_generate_v4(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    deleted_at timestamp with time zone  -- for soft delete
);

-- indexes
CREATE INDEX idx_invitations_status ON public.invitations (status);
CREATE INDEX idx_invitations_email ON public.invitations (email);
CREATE INDEX idx_invitations_organization_id ON public.invitations (organization_id);
CREATE INDEX idx_invitations_token ON public.invitations (token);
CREATE INDEX idx_invitations_expires_at ON public.invitations (expires_at);
CREATE INDEX idx_invitations_deleted_at ON public.invitations (deleted_at);

-- notifications table -- stores user notifications
CREATE TABLE public.notifications (
    -- primary key
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- foreign key
    user_id uuid REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,

    -- notification information
    type notification_type NOT NULL DEFAULT 'message',
    title text,
    content text NOT NULL,
    link text,
    read boolean DEFAULT false,

    -- timestamps
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
    deleted_at timestamp with time zone  -- for soft delete
);

-- indexes
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at);
CREATE INDEX idx_notifications_deleted_at ON public.notifications (deleted_at);
CREATE INDEX idx_notifications_read ON public.notifications (read);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to populate app_users on new auth.users insert
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_timestamp trigger to relevant tables
CREATE TRIGGER update_timestamp_app_users
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_organization_users
BEFORE UPDATE ON public.organization_users
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_workspaces
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_workspace_users
BEFORE UPDATE ON public.workspace_users
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_invitations
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

CREATE TRIGGER update_timestamp_notifications
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

-- Function to prevent non-owners from assigning the owner role
CREATE OR REPLACE FUNCTION public.prevent_non_owner_assign_owner_role()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger on organization_users table
CREATE TRIGGER trg_prevent_non_owner_assign_owner_role
BEFORE INSERT OR UPDATE ON public.organization_users
FOR EACH ROW
EXECUTE PROCEDURE public.prevent_non_owner_assign_owner_role();

-- Function to enforce role hierarchy in workspace_users
CREATE OR REPLACE FUNCTION public.enforce_workspace_user_role_hierarchy()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger on workspace_users table
CREATE TRIGGER trg_enforce_workspace_user_role_hierarchy
BEFORE INSERT OR UPDATE ON public.workspace_users
FOR EACH ROW
EXECUTE PROCEDURE public.enforce_workspace_user_role_hierarchy();

-- Function to soft delete related records when an organization is soft deleted
CREATE OR REPLACE FUNCTION public.soft_delete_related_records()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger on organizations table
CREATE TRIGGER trg_soft_delete_organization
AFTER UPDATE ON public.organizations
FOR EACH ROW
WHEN (old.deleted_at IS null AND new.deleted_at IS NOT null)
EXECUTE PROCEDURE public.soft_delete_related_records();

-- Function to soft delete related records when a workspace is soft deleted
CREATE OR REPLACE FUNCTION public.soft_delete_workspace_related()
RETURNS trigger AS $$
BEGIN
    -- Soft delete workspace users
    UPDATE public.workspace_users
    SET deleted_at = timezone('utc', now())
    WHERE workspace_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on workspaces table
CREATE TRIGGER trg_soft_delete_workspace
AFTER UPDATE ON public.workspaces
FOR EACH ROW
WHEN (old.deleted_at IS null AND new.deleted_at IS NOT null)
EXECUTE PROCEDURE public.soft_delete_workspace_related();

-- =============================================
-- Row-Level Security Policies
-- =============================================

-- Enable RLS on organizations and organization_users tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations table
-- Only organization members can select organization data
CREATE POLICY select_organization_policy ON public.organizations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.deleted_at IS null
    )
);

-- Only owners can update organization name or logo
CREATE POLICY update_organization_policy ON public.organizations
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- RLS policies for organization_users table
-- Only owners can view organization users
CREATE POLICY select_organization_users_policy ON public.organization_users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- Only owners can modify organization users
CREATE POLICY modify_organization_users_policy ON public.organization_users
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- Enable RLS on workspaces and workspace_users tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspaces table
-- Users must be in the organization to access the workspace
CREATE POLICY select_workspace_policy ON public.workspaces
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = workspaces.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.deleted_at IS null
    )
);

-- Users can access workspace if they are organization owners or workspace users
CREATE POLICY access_workspace_policy ON public.workspaces
FOR SELECT USING (
    EXISTS (
        -- Organization owner
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = workspaces.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    ) OR EXISTS (
        -- Workspace user
        SELECT 1 FROM public.workspace_users
        WHERE
            workspace_users.workspace_id = workspaces.id
            AND workspace_users.user_id = auth.uid()
            AND workspace_users.deleted_at IS null
    )
);

-- Workspace CRUD operations for owners and admins
CREATE POLICY modify_workspace_policy ON public.workspaces
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workspace_users
        WHERE
            workspace_users.workspace_id = workspaces.id
            AND workspace_users.user_id = auth.uid()
            AND workspace_users.role IN ('owner', 'admin')
            AND workspace_users.deleted_at IS null
    )
);

-- RLS policies for workspace_users table
-- Only owners and admins can manage workspace users with restrictions
CREATE POLICY manage_workspace_users_policy ON public.workspace_users
FOR ALL USING (
    EXISTS (
        -- Owners can perform any action
        SELECT 1 FROM public.workspace_users
        WHERE
            workspace_users.user_id = auth.uid()
            AND workspace_users.role = 'owner'
            AND workspace_users.deleted_at IS null
    ) OR (
        -- Admins can manage users with roles lower than 'admin', not owners
        EXISTS (
            SELECT 1 FROM public.workspace_users
            WHERE
                workspace_users.user_id = auth.uid()
                AND workspace_users.role = 'admin'
                AND workspace_users.deleted_at IS null
        ) AND (
            workspace_users.role = 'member'
        )
    )
);

-- Enable RLS on invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations table
-- Only organization owners can manage invitations
CREATE POLICY manage_invitations_policy ON public.invitations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = invitations.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- Only invited users can view their own invitations
CREATE POLICY select_own_invitations_policy ON public.invitations
FOR SELECT USING (
    invitations.email = (SELECT email FROM public.app_users WHERE id = auth.uid())
);

-- =============================================
-- Data Integrity Constraints
-- =============================================

ALTER TABLE public.organization_users
ADD CONSTRAINT unique_organization_user
UNIQUE (organization_id, user_id);

ALTER TABLE public.workspace_users
ADD CONSTRAINT unique_workspace_user
UNIQUE (workspace_id, user_id);

ALTER TABLE public.organization_users
ADD CONSTRAINT check_valid_organization_role
CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE public.workspace_users
ADD CONSTRAINT check_valid_workspace_role
CHECK (role IN ('owner', 'admin', 'member'));

-- =============================================
-- Realtime Subscriptions
-- =============================================

DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE
public.notifications;