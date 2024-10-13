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

-- Function to calculate the completion percentage of a draft

CREATE OR REPLACE FUNCTION get_completion_percentage(application_draft_id UUID)
    RETURNS FLOAT AS $$
DECLARE
    total_required_questions INT;
    answered_required_questions INT;
BEGIN
    -- Count total required questions for this draft
    SELECT COUNT(DISTINCT q.id)
    INTO total_required_questions
    FROM grant_application_questions q
             JOIN grant_wizard_sections s ON q.section_id = s.id
             JOIN grant_cfps c ON s.cfp_id = c.id
             JOIN application_drafts d ON d.cfp_id = c.id
    WHERE d.id = application_draft_id AND q.required = true AND q.deleted_at IS NULL;

    -- Count answered required questions for this draft
    SELECT COUNT(DISTINCT a.question_id)
    INTO answered_required_questions
    FROM grant_application_answers a
             JOIN grant_application_questions q ON a.question_id = q.id
    WHERE a.draft_id = application_draft_id AND q.required = true AND a.deleted_at IS NULL AND a.value IS NOT NULL;

    -- Calculate and return the percentage
    IF total_required_questions > 0 THEN
        RETURN (answered_required_questions::FLOAT / total_required_questions::FLOAT) * 100;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh the materialized view for application draft completion percentages

CREATE OR REPLACE FUNCTION refresh_application_drafts_completion()
    RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY application_drafts_completion;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
