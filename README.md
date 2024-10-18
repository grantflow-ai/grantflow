# Parser-Indexer Function

This repository includes a parser-indexer Azure function.

## Installation

### Prerequisites

Make sure to be running a Python 3.11 shell.

It's recommended to use [pyenv](https://github.com/pyenv/pyenv) to manage python versions. For example:

```shell
brew install pyenv
pyenv install 3.11
pyenv local 3.11
```

Install PDM globally - you can either install it via brew (recommended) or pipx:

```shell
brew install pdm
```

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
