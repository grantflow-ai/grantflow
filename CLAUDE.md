# GrantFlow.AI Monorepo Guidelines

## Guidelines

- DO NOT add inline comments
- DO NOT add doc strings
- Always type all arguments and return statements in Python
- Use python 3.12+ syntax only, especially for typing
- Use pytest functional style only
- We are working inside a monorepo that includes a Next.js frontend (under `./frontend`) and Python services (under `./services` and `./packages`).
- For Python commands, use `uv run <command>` instead of `python <command>`
- Use `pre-commit run --all-files` to run all pre-commit hooks on all files or select specific hooks.
- We use ruff and mypy for linting and type checking, respectively. These are available in pre-commit or can be ran using uv.
- We use `pnpm` as the package manager for JS.
- We use eslint and prettier for linting and formatting in the frontend.
- Python tests use shared plugins located under `./testing`. We use a real database in testing, see the pertinent plugin for context.
- Each service and package have their own `conftest.py` file
- To run python tests, set the PYTHONPATH variable to the root of the monorepo. This can be done by running `export PYTHONPATH=$(pwd)` in the terminal before running the tests.
- Add fixtures meant to be shared or reused under `./testing` as part of the pertinent test plugin
- We use opentofu for terraform, so use `tofu` commands instead of `terraform`

## Commands

- Frontend typecheck: `cd frontend && pnpm typecheck`
- Frontend tests: `cd frontend && pnpm test`
- Python tests: `export PYTHONPATH=$(pwd) && uv run pytest <path>`
- Linting: `pre-commit run --all-files`
