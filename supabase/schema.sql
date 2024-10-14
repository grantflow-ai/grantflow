CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');

-- mailing-list table
CREATE TABLE public.mailing_list
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_mailing_list_email ON public.mailing_list (email);

-- users table 
CREATE TABLE
public.app_users
(
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_app_users_email ON public.app_users (email);

-- workspaces table 
CREATE TABLE
public.workspaces
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workspaces_deleted_at ON public.workspaces (deleted_at);

-- workspace_users table 
CREATE TABLE
public.workspace_users
(
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

-- funding-organization table
CREATE TABLE public.funding_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_funding_organization_name ON public.funding_organizations (name);
CREATE INDEX idx_funding_organization_deleted_at ON public.funding_organizations (deleted_at);

-- grant-cfp table
CREATE TABLE public.grant_cfps
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funding_organization_id UUID REFERENCES public.funding_organizations (
        id
    ) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    allow_clinical_trials BOOLEAN NOT NULL DEFAULT true,
    allow_resubmissions BOOLEAN NOT NULL DEFAULT true,
    category VARCHAR(255),
    code VARCHAR(255) NOT NULL,
    description TEXT,
    title VARCHAR(255) NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_cfps_identifier ON public.grant_cfps (code);
CREATE INDEX idx_grant_cfps_funding_organization_id ON public.grant_cfps (funding_organization_id);
CREATE INDEX idx_grant_cfps_deleted_at ON public.grant_cfps (deleted_at);

-- grant-application table
CREATE TABLE public.grant_applications
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    cfp_id UUID REFERENCES public.grant_cfps (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_resubmission BOOLEAN NOT NULL DEFAULT false,
    significance TEXT NOT NULL,
    innovation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_application_grant_cfp_id ON public.grant_applications (cfp_id);
CREATE INDEX idx_grant_application_deleted_at ON public.grant_applications (deleted_at);

-- research-aims table
CREATE TABLE public.research_aims
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES public.grant_applications (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_urls TEXT [] NULL,
    required_clinical_trials BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_research_aims_application_id ON public.research_aims (application_id);
CREATE INDEX idx_research_aims_deleted_at ON public.research_aims (deleted_at);

-- research-tasks table
CREATE TABLE public.research_tasks
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aim_id UUID REFERENCES public.research_aims (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_urls TEXT [] NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_aim_id ON public.research_tasks (aim_id);
CREATE INDEX idx_tasks_deleted_at ON public.research_tasks (deleted_at);
