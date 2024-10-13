-- View to store the completion percentage of an application draft

CREATE MATERIALIZED VIEW application_drafts_completion AS
SELECT
    d.id AS draft_id,
    get_completion_percentage(d.id) AS completion_percentage
FROM application_drafts d;
CREATE UNIQUE INDEX ON application_drafts_completion (draft_id);
