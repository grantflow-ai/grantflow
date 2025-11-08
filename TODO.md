# NIH Predefined Templates TODO

## Legend
- [ ] not started
- [~] in progress
- [x] complete

## Tasks

### Schema & Data Model
- [x] Design schema for predefined templates (table structure, parent linkage)
- [x] Generate Alembic migration via Taskfile to add new table/columns
- [~] Update SQLAlchemy models and enums to reflect new schema

### RAG Service Updates
- [~] Add ability to persist/load predefined templates in grant_template pipeline
- [~] Implement clone/attach workflow when creating NIH grant templates
- [ ] Extend API responses to surface parent template metadata

### Bulk Generation Script
- [x] Add config manifest describing NIH R-series guidelines + overrides
- [~] Implement `scripts/generate_predefined_templates.py` command-line entrypoint
- [ ] Wire script to reuse RAG template pipeline directly without Pub/Sub
- [ ] Add tests covering script behavior and predefined template cloning

### CI / Developer Workflow
- [ ] Document workflow in README / docs
- [ ] Add optional Taskfile target to run the script locally

## Notes
- Scripts live under `/scripts`; keep dependencies minimal and reuse existing helpers.
- Track progress by updating the status markers above as work proceeds.
