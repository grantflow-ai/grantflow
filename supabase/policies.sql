ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "users_can_view_own_data" ON public.app_users FOR
SELECT
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "users_can_update_own_data" ON public.app_users
FOR UPDATE
USING (auth.uid() = id);

-- Users can delete their own data
CREATE POLICY "users_can_delete_own_data" ON public.app_users FOR DELETE USING (auth.uid() = id);

-- Only organization members can select workspace data
CREATE POLICY select_workspace_policy ON public.workspaces FOR
SELECT
USING (
    EXISTS (
        SELECT 1
        FROM
            public.organization_users
        WHERE
            organization_users.organization_id = workspaces.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.deleted_at IS null
    )
);

-- Only organization members can select organization data
CREATE POLICY select_organization_policy ON public.organizations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.deleted_at IS null
    )
);

-- Only owners can update organization name or logo
CREATE POLICY update_organization_policy ON public.organizations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE
            organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- Only owners can modify organization users
CREATE POLICY modify_organization_users_policy ON public.organization_users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.organization_users AS ou
        WHERE
            ou.user_id = auth.uid()
            AND ou.role = 'owner'
            AND ou.deleted_at IS null
            AND ou.organization_id = organization_users.organization_id
    )
);


-- Users can access workspace if they are organization owners or workspace users
CREATE POLICY access_workspace_policy ON public.workspaces FOR
SELECT
USING (
    EXISTS (
        -- Organization owner
        SELECT 1
        FROM
            public.organization_users
        WHERE
            organization_users.organization_id = workspaces.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
    OR EXISTS (
        -- Workspace user
        SELECT 1
        FROM
            public.workspace_users
        WHERE
            workspace_users.workspace_id = workspaces.id
            AND workspace_users.user_id = auth.uid()
            AND workspace_users.deleted_at IS null
    )
);

-- Workspace CRUD operations for owners and admins
CREATE POLICY modify_workspace_policy ON public.workspaces FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM
            public.workspace_users
        WHERE
            workspace_users.workspace_id = workspaces.id
            AND workspace_users.user_id = auth.uid()
            AND workspace_users.role IN ('owner', 'admin')
            AND workspace_users.deleted_at IS null
    )
);

-- RLS policies for workspace_users table
-- Only owners and admins can manage workspace users with restrictions
CREATE POLICY manage_workspace_users_policy ON public.workspace_users FOR ALL USING (
    EXISTS (
        -- Owners can perform any action
        SELECT 1
        FROM
            public.workspace_users
        WHERE
            workspace_users.user_id = auth.uid()
            AND workspace_users.role = 'owner'
            AND workspace_users.deleted_at IS null
    )
    OR (
        -- Admins can manage users with roles lower than 'admin', not owners
        EXISTS (
            SELECT 1
            FROM
                public.workspace_users
            WHERE
                workspace_users.user_id = auth.uid()
                AND workspace_users.role = 'admin'
                AND workspace_users.deleted_at IS null
        )
        AND (workspace_users.role = 'member')
    )
);

-- Enable RLS on invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations table
-- Only organization owners can manage invitations
CREATE POLICY manage_invitations_policy ON public.invitations FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM
            public.organization_users
        WHERE
            organization_users.organization_id = invitations.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.deleted_at IS null
    )
);

-- Only invited users can view their own invitations
CREATE POLICY select_own_invitations_policy ON public.invitations FOR
SELECT
USING (
    invitations.email = (
        SELECT email
        FROM
            public.app_users
        WHERE
            id = auth.uid()
    )
);
