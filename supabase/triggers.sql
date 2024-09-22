-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to populate app_users on new auth.users insert
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Apply update_timestamp trigger to relevant tables
CREATE TRIGGER update_timestamp_app_users BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_organization_users BEFORE UPDATE ON public.organization_users FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_workspaces BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_workspace_users BEFORE UPDATE ON public.workspace_users FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_invitations BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();
CREATE TRIGGER update_timestamp_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp();

-- Function to prevent non-owners from assigning the owner role
CREATE OR REPLACE FUNCTION public.prevent_non_owner_assign_owner_role() RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

-- Trigger on organization_users table
CREATE TRIGGER trg_prevent_non_owner_assign_owner_role BEFORE INSERT OR UPDATE ON public.organization_users FOR EACH ROW EXECUTE PROCEDURE public.prevent_non_owner_assign_owner_role();

-- Function to enforce role hierarchy in workspace_users
CREATE OR REPLACE FUNCTION public.enforce_workspace_user_role_hierarchy() RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

-- Trigger on workspace_users table
CREATE TRIGGER trg_enforce_workspace_user_role_hierarchy BEFORE INSERT OR UPDATE ON public.workspace_users FOR EACH ROW EXECUTE PROCEDURE public.enforce_workspace_user_role_hierarchy();

-- Function to soft delete related records when an organization is soft deleted
CREATE OR REPLACE FUNCTION public.soft_delete_related_records() RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

-- Trigger on organizations table
CREATE TRIGGER trg_soft_delete_organization AFTER UPDATE ON public.organizations FOR EACH ROW WHEN (
    old.deleted_at IS null AND new.deleted_at IS NOT null
) EXECUTE PROCEDURE public.soft_delete_related_records();

-- Function to soft delete related records when a workspace is soft deleted
CREATE OR REPLACE FUNCTION public.soft_delete_workspace_related() RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete workspace users
    UPDATE public.workspace_users
    SET deleted_at = timezone('utc', now())
    WHERE workspace_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
END; $$ LANGUAGE plpgsql;

-- Trigger on workspaces table
CREATE TRIGGER trg_soft_delete_workspace AFTER UPDATE ON public.workspaces FOR EACH ROW WHEN (
    old.deleted_at IS null AND new.deleted_at IS NOT null
) EXECUTE PROCEDURE public.soft_delete_workspace_related();
