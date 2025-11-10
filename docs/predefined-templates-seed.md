# Predefined Grant Templates Workflow

Use this guide whenever you need to refresh the seeded predefined templates (e.g., after regen on staging) or to reuse the exporter elsewhere.

## 1. Export From Staging

1. Ensure the Cloud SQL proxy is running for `grantflow-staging` (Taskfile commands already manage this for `db:remote:*` flows).
2. Export all templates into JSON fixtures (one file per activity code):

   ```bash
   PYTHONPATH=. \
   DATABASE_CONNECTION_STRING="postgresql+asyncpg://postgres:<staging-password>@127.0.0.1:5432/postgres" \
   uv run python scripts/export_predefined_templates.py
   ```

   This writes formatted files to `scripts/predefined_grant_templates/`. Re-run anytime; the exporter cleans older fixtures first.

3. Run Biome formatting so CI accepts the fixtures:

   ```bash
   pnpm biome format --write scripts/predefined_grant_templates
   ```

## 2. Seed Locally (and Ensure CI Coverage)

1. Reset or migrate your local database as needed (`task db:reset` or `task db:migrate`).
2. Run the seed script, which now includes predefined templates:

   ```bash
   task db:seed
   ```

   The script upserts granting institutions, backoffice admins, and every template under `scripts/predefined_grant_templates/`.

3. (Optional) Sanity check:

   ```bash
   PYTHONPATH=. DATABASE_CONNECTION_STRING="postgresql+asyncpg://local:local@localhost:5433/local" \
   uv run python - <<'PY'
   import asyncio
   from sqlalchemy import select, func
   from packages.db.src.connection import get_session_maker
   from packages.db.src.tables import PredefinedGrantTemplate

   async def main():
       async with get_session_maker()() as session:
           result = await session.execute(select(func.count()).select_from(PredefinedGrantTemplate))
           print("predefined templates:", result.scalar_one())

   asyncio.run(main())
   PY
   ```

## 3. Regeneration Checklist

- [ ] Export from staging (step 1) after any upstream changes.
- [ ] Format fixtures with Biome.
- [ ] Commit updated JSON files plus any code changes.
- [ ] Run `task db:seed` locally to ensure the fixtures load cleanly.
- [ ] Push through CI (adds coverage for the seed script plus keeps predefined templates in sync).

That’s it—keeping the fixtures under `scripts/predefined_grant_templates/` plus these steps ensures everyone can refresh the dataset deterministically.***
