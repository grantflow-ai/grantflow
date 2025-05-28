# GrantFlow Storybook

This is the component library and documentation for GrantFlow's frontend components.

## Local Development

You can start Storybook locally using either of these commands:

```bash
# Using pnpm directly
pnpm storybook

# Using the project task runner
task frontend:storybook
```

## Building

```bash
pnpm build-storybook
```

## Deployment

Storybook is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment workflow is located at `.github/workflows/deploy-storybook.yaml`.

## Writing Stories

Stories should be placed alongside their components with the `.stories.tsx` extension. See existing stories in the codebase for examples.

## GitHub Pages URL

Once deployed, Storybook will be available at: <https://grantflow-ai.github.io/grantflow/>
