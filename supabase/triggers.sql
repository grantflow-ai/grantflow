-- trigger the function every time a user is created

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to add a workspace_users row when a workspace is created

CREATE OR REPLACE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_workspace_user();
