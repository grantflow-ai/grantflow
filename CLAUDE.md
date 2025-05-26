# GrantFlow.AI Monorepo Guidelines

Instructions:

- Update CLAUDE.md with your learnings
- Update this file with your own guidelines
- If you encounter mistakes, correct them

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
- Storybook development: `cd frontend && pnpm storybook`
- Build Storybook: `cd frontend && pnpm build-storybook`

## Storybook

- We use Storybook for component development and documentation in the frontend
- Storybook is configured with Next.js and Vite using `@storybook/experimental-nextjs-vite`
- Story files should follow the pattern `*.stories.tsx` and be placed alongside components
- Stories can include both UI testing stories (with mocked API calls) and integration testing stories
- The built Storybook is deployed to GitHub Pages automatically on push to main branch

## Testing Guidelines

### Python Testing

- Use `pytest.mark.asyncio` for async test functions
- When testing code that uses singleton patterns (like client references), create fixtures to reset the singleton state between tests
- For mocking async functions, use `AsyncMock` from `unittest.mock`
- When mocking Google Cloud clients, ensure you mock both the client creation and the method calls
- For testing JSON serialization output, be aware that the `serialize` function may produce compact JSON without spaces after colons
- Test both success and failure scenarios, including specific exception types
- Use `pytest.raises` with the `match` parameter to verify specific error messages
- When testing functions that accept both string and UUID types, test both variations
