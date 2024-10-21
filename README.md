# Parser-Indexer Function

This repository includes the GrantFlow.AI parser-indexer service. This service is responsible for parsing and indexing
materials (PDF, docx, images etc.) uploaded by users.

The service uses the following Azure cloud services:

- Azure Functions. This service is used to deploy and orchestrate the service.
- Azure Blob Storage, the [entry point to the service](./src/app.py) is triggered whenever a new blob is written to a specific
  blob container.
- Azure Document Intelligence. This service is used to extract text from images and PDFs, using OCR and other techniques.
- Azure OpenAI. This service is used to generate embeddings for the extracted texts.
- Azure AI search. This service is used to index the extracted text and metadata from the documents and store it for use in RAG.

## Prerequisites

You need a copy of `local.settings.json` file in the root of the repository. This file is git ignored and should not be
committed to GitHub.

## Installation

Make sure to be running a Python 3.11 shell.

1. It's recommended to use [pyenv](https://github.com/pyenv/pyenv) to manage python versions. For example:

   ```shell
   brew install pyenv
   pyenv install 3.11
   pyenv local 3.11
   ```

2. Install PDM globally - you can either install it via brew (recommended) or pipx:

   ```shell
   brew install pdm
   ```

3. Install [taskfile](https://taskfile.dev/) with

   ```shell
   brew install go-task
   ```
4. Inside the repository, execute the setup command:

   ```shell
   task setup
   ```

   This command will install the necessary dependencies on the machine and use PDM to create a virtual environment under
   the `.venv` folder, which is git ignored, and install the dependencies inside it.

### Setup

1. Clone the repository
2. Inside the repository, execute the setup command:
   ```shell
   pdm run setup
   ```
   This command will install the necessary dependencies on the machine and use PDM to create a virtual environment under
   the `.venv` folder, which is git ignored, and install the dependencies inside it. It will also setup pre-commit.

### PDM Scripts

PDM includes several scripts for convenience. You can see the available scripts in the
[pyproject.toml file](./pyproject.toml) under `[tool.pdm.scripts]`.

For example, you can run the following command to start the functions framework:

#### Start

```shell
pdm run start
```

This will run the PDM script called `start`, which you can see defined in the [pyproject.toml file](./pyproject.toml)

### Test

To execute testing run:

```shell
pdm run test
```

Which will run pytest

### Lint

To execute all the linters and formatters run:

```shell
pdm run lint
```

Which will run [pre-commit](https://pre-commit.com)

## Deployment

Deployment is automated using github CI/CD - merging to main will deploy to production.

You can manually deploy by executing:

```shell
task publish
```

You can also just sync the local.settings.json file by executing:

```shell
task sync-settings
```
