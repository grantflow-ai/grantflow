-- trigger the function every time a user is created

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to add a workspace_users row when a workspace is created

CREATE OR REPLACE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_workspace_user();

-- Trigger to refresh the materialized view when application_drafts is updated

CREATE TRIGGER refresh_application_drafts_completion_trigger
    AFTER INSERT OR UPDATE OR DELETE ON application_drafts
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_application_drafts_completion();

-- Trigger to refresh the materialized view when grant_application_answers is updated

CREATE TRIGGER refresh_application_drafts_completion_answers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON grant_application_answers
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_application_drafts_completion();