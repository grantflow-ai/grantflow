CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE notification_type AS ENUM ('invitation', 'message', 'alert');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');

-- users table 
CREATE TABLE
public.app_users (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_app_users_email ON public.app_users (email);

-- organizations table 
CREATE TABLE
public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_name ON public.organizations (name);
CREATE INDEX idx_organizations_deleted_at ON public.organizations (deleted_at);

-- organization_users table 
CREATE TABLE
public.organization_users (
    organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    user_id UUID REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    role USER_ROLE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.organization_users
ADD CONSTRAINT unique_organization_user UNIQUE (organization_id, user_id);

ALTER TABLE public.organization_users
ADD CONSTRAINT check_valid_organization_role CHECK (role IN ('owner', 'admin', 'member'));

CREATE INDEX idx_organization_users_role ON public.organization_users (role);
CREATE INDEX idx_organization_users_organization_id ON public.organization_users (organization_id);
CREATE INDEX idx_organization_users_user_id ON public.organization_users (user_id);
CREATE INDEX idx_organization_users_deleted_at ON public.organization_users (deleted_at);

-- workspaces table 
CREATE TABLE
public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workspaces_organization_id ON public.workspaces (organization_id);
CREATE INDEX idx_workspaces_deleted_at ON public.workspaces (deleted_at);

-- workspace_users table 
CREATE TABLE
public.workspace_users (
    workspace_id UUID REFERENCES public.workspaces (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    user_id UUID REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    role USER_ROLE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.workspace_users
ADD CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id);

ALTER TABLE public.workspace_users
ADD CONSTRAINT check_valid_workspace_role CHECK (role IN ('owner', 'admin', 'member'));

CREATE INDEX idx_workspace_users_role ON public.workspace_users (role);
CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users (workspace_id);
CREATE INDEX idx_workspace_users_user_id ON public.workspace_users (user_id);
CREATE INDEX idx_workspace_users_deleted_at ON public.workspace_users (deleted_at);

-- grant-applications table
CREATE TABLE public.grant_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    funding_organization TEXT NOT NULL,
    workspace_id UUID REFERENCES public.workspaces (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_applications_workspace_id ON public.grant_applications (workspace_id);
CREATE INDEX idx_grant_applications_deleted_at ON public.grant_applications (deleted_at);

-- invitations table 
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invited_by UUID REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role USER_ROLE NOT NULL,
    status INVITATION_STATUS DEFAULT 'pending' NOT NULL,
    token UUID NOT NULL DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invitations_status ON public.invitations (status);
CREATE INDEX idx_invitations_email ON public.invitations (email);
CREATE INDEX idx_invitations_organization_id ON public.invitations (organization_id);
CREATE INDEX idx_invitations_token ON public.invitations (token);
CREATE INDEX idx_invitations_expires_at ON public.invitations (expires_at);
CREATE INDEX idx_invitations_deleted_at ON public.invitations (deleted_at);

-- notifications table 
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.app_users (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    type NOTIFICATION_TYPE NOT NULL DEFAULT 'message',
    title TEXT,
    content TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at);
CREATE INDEX idx_notifications_deleted_at ON public.notifications (deleted_at);
CREATE INDEX idx_notifications_read ON public.notifications (read);

-- ============================================= 
-- Supabase Realtime Subscriptions
-- =============================================

DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
