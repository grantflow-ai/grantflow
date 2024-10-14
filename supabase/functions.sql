-- Function to add a workspace_users row when a workspace is created

CREATE OR REPLACE FUNCTION public.add_owner_workspace_user()
RETURNS trigger AS $$
DECLARE
    app_user_id UUID;
BEGIN
    SELECT auth.uid() INTO app_user_id;
    INSERT INTO public.workspace_users (workspace_id, user_id, role)
    VALUES (NEW.id, app_user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function that inserts a row into public.app_users on auth user creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
begin
    insert into public.app_users (id, email, name, avatar_url)
    values (new.id, new.email, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'avatar_url');
    return new;
end;
$$;
