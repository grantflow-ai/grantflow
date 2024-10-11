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
CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to add a workspace_users row when a workspace is created
CREATE OR REPLACE FUNCTION public.add_owner_workspace_user()
    RETURNS TRIGGER AS $$
DECLARE
    app_user_id UUID;
BEGIN
    SELECT auth.uid() INTO app_user_id;
    INSERT INTO public.workspace_users (workspace_id, user_id, role)
    VALUES (NEW.id, app_user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add a workspace_users row when a workspace is created
CREATE OR REPLACE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
EXECUTE FUNCTION public.add_owner_workspace_user();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;