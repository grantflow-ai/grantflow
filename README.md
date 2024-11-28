# Backend Services

## Prerequisites

You need a copy of `.env` file in the root of the repository. This file is git ignored and should not be
committed to GitHub.

## Installation

Make sure to be running a Python 3.12 shell.

1. It's recommended to use [pyenv](https://github.com/pyenv/pyenv) to manage python versions. For example:

   ```shell
   brew install pyenv
   pyenv install 3.12
   pyenv local 3.12
   ```

2. Install PDM globally - you can either install it via brew (recommended) or pipx:

   ```shell
   brew install pdm
   ```

2. Inside the repository, execute the setup command:

   ```shell
   task setup
   ```

   This command will install the necessary dependencies on the machine and use PDM to create a virtual environment under
   the `.venv` folder, which is git ignored, and install the dependencies inside it.

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
