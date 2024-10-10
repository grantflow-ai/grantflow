CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE notification_type AS ENUM ('invitation', 'message', 'alert');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE wizard_input_type AS ENUM ('text', 'boolean', 'date', 'date-range');
CREATE TYPE question_type AS ENUM ('per-section', 'per-research-aim', 'per-research-task');

-- users table 
CREATE TABLE
public.app_users
(
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
public.organizations
(
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
public.organization_users
(
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
public.workspaces
(
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

-- invitations table
CREATE TABLE public.invitations
(
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
CREATE TABLE public.notifications
(
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

-- mailing-list table
CREATE TABLE public.mailing_list
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_mailing_list_email ON public.mailing_list (email);

-- grant-funding-organization table
CREATE TABLE public.grant_funding_organization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_funding_organization_name ON public.grant_funding_organization (name);
CREATE INDEX idx_grant_funding_organization_deleted_at ON public.grant_funding_organization (deleted_at);

-- grant-cfp table
CREATE TABLE public.grant_cfps
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funding_organization_id UUID REFERENCES public.grant_funding_organization (
        id
    ) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    grant_identifier TEXT NOT NULL,
    allow_resubmissions BOOLEAN NOT NULL DEFAULT true,
    allow_clinical_trials BOOLEAN NOT NULL DEFAULT true,
    max_research_aims INT NOT NULL DEFAULT 3 CHECK (max_research_aims > 0),
    max_tasks INT NOT NULL DEFAULT 5 CHECK (max_tasks > 0),
    text TEXT NULL,
    url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_cfps_identifier ON public.grant_cfps (grant_identifier);
CREATE INDEX idx_grant_cfps_funding_organization_id ON public.grant_cfps (funding_organization_id);
CREATE INDEX idx_grant_cfps_deleted_at ON public.grant_cfps (deleted_at);

-- grant-wizard-sections table
CREATE TABLE public.grant_wizard_sections
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfp_id UUID REFERENCES public.grant_cfps (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    is_research_plan_section BOOLEAN NOT NULL DEFAULT false,
    title TEXT NOT NULL,
    help_text TEXT NULL,
    ordering INT NOT NULL,
    clinical_trials_only BOOLEAN NOT NULL DEFAULT false,
    resubmission_only BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_wizard_sections_cfp_id ON public.grant_wizard_sections (cfp_id);
CREATE INDEX idx_grant_wizard_sections_deleted_at ON public.grant_wizard_sections (deleted_at);
CREATE UNIQUE INDEX idx_grant_wizard_sections_cfp_id_stage_ordering ON public.grant_wizard_sections (
    cfp_id, is_research_plan_section, ordering
);

-- grant-application-questions table
CREATE TABLE public.grant_application_questions
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    depends_on UUID [] NULL,
    external_links TEXT [] NULL,
    file_upload BOOLEAN NOT NULL DEFAULT false,
    help_text TEXT NULL,
    input_type WIZARD_INPUT_TYPE NOT NULL DEFAULT 'text',
    max_length SMALLINT NULL,
    ordering INT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    question_type QUESTION_TYPE NOT NULL DEFAULT 'per-section',
    section_id UUID REFERENCES public.grant_wizard_sections (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grant_application_questions_section_id ON public.grant_application_questions (section_id);
CREATE INDEX idx_grant_application_questions_deleted_at ON public.grant_application_questions (deleted_at);
CREATE UNIQUE INDEX idx_grant_application_questions_section_id_ordering ON public.grant_application_questions (
    section_id, ordering
);

-- application-drafts table
CREATE TABLE public.application_drafts
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfp_id UUID REFERENCES public.grant_cfps (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_resubmission BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_application_drafts_grant_cfp_id ON public.application_drafts (cfp_id);
CREATE INDEX idx_application_drafts_deleted_at ON public.application_drafts (deleted_at);

-- research-aims table
CREATE TABLE public.research_aims
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES public.application_drafts (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    file_urls TEXT [] NULL,
    includes_clinical_trials BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_research_aims_draft_id ON public.research_aims (draft_id);
CREATE INDEX idx_research_aims_deleted_at ON public.research_aims (deleted_at);

-- research-tasks table
CREATE TABLE public.research_tasks
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_aim_id UUID REFERENCES public.research_aims (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    file_urls TEXT [] NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_research_aim_id ON public.research_tasks (research_aim_id);
CREATE INDEX idx_tasks_deleted_at ON public.research_tasks (deleted_at);


-- grant-application-answers table
CREATE TABLE public.grant_application_answers
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES public.application_drafts (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    question_id UUID REFERENCES public.grant_application_questions (id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
    question_type QUESTION_TYPE NOT NULL,
    research_aim_id UUID NULL REFERENCES public.research_aims (id) ON DELETE CASCADE ON UPDATE CASCADE,
    task_id UUID NULL REFERENCES public.research_tasks (id) ON DELETE CASCADE ON UPDATE CASCADE,
    value JSONB NULL,
    file_urls TEXT [] NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_aim_or_task_not_null
    CHECK (
        (question_type = 'per-section' AND research_aim_id IS null AND task_id IS null)
        OR (question_type = 'per-research-aim' AND research_aim_id IS NOT null AND task_id IS null)
        OR (question_type = 'per-research-task' AND research_aim_id IS NOT null AND task_id IS NOT null)
    )
);

CREATE INDEX idx_grant_application_answers_draft_id ON public.grant_application_answers (draft_id);
CREATE INDEX idx_grant_application_answers_question_id ON public.grant_application_answers (question_id);
CREATE INDEX idx_grant_application_answers_research_aim_id ON public.grant_application_answers (research_aim_id);
CREATE INDEX idx_grant_application_answers_task_id ON public.grant_application_answers (task_id);
CREATE INDEX idx_grant_application_answers_deleted_at ON public.grant_application_answers (deleted_at);
CREATE UNIQUE INDEX idx_grant_application_answers_unique ON public.grant_application_answers (
    draft_id,
    question_id
);

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
