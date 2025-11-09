# NIH Predefined Template Auto-Selection

- [x] Update `services/rag/src/grant_template/cfp_analysis/metadata_extraction.py` (prompt, schema, `CFPMetadataResult`) so the metadata step outputs `activity_code` alongside the granting institution.
- [x] Adjust RAG pipeline wiring (`services/rag/src/grant_template/pipeline.py`) to short-circuit via `clone_predefined_template_if_possible`:
  * first attempt to match predefined templates by `(institution_id, activity_code)`
  * fall back to the most recent predefined template for that institution when no activity code is inferred
- [x] Extend unit coverage (`services/rag/tests/grant_template/pipeline_test.py`, `services/rag/tests/grant_template/metadata_extraction_test.py`) to cover activity-code normalization + cloning behavior.
- [x] Update E2E/functional tests around CFP analysis to assert the new metadata field and the auto-clone flow (`services/rag/tests/e2e/...`).
- [x] Document the backend-only auto-selection behavior (README/task docs) once implementation stabilizes.
