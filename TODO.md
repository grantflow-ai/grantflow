# NIH Predefined Templates TODO

## Legend
- [ ] not started
- [~] in progress
- [x] complete

## Tasks

### Schema & Data Model
- [x] Design schema for predefined templates (table structure, parent linkage)
- [x] Generate Alembic migration via Taskfile to add new table/columns
- [x] Update SQLAlchemy models and enums to reflect new schema

### RAG Service Updates
- [x] Add ability to persist/load predefined templates in grant_template pipeline
- [x] Implement clone/attach workflow when creating NIH grant templates
- [x] Extend API responses to surface parent template metadata

### Bulk Generation Script
- [x] Add config manifest describing NIH R-series guidelines + overrides
- [x] Implement `python -m services.rag.src.predefined` command-line entrypoint
- [x] Wire CLI to reuse the RAG template pipeline directly (guideline ingestion + prompts)
- [x] Add tests covering CLI behavior and predefined template cloning

### CI / Developer Workflow
- [x] Document workflow in README / docs
- [x] Add optional Taskfile target to run the script locally

## Notes
- Scripts live under `/scripts`; keep dependencies minimal and reuse existing helpers.
- Track progress by updating the status markers above as work proceeds.
