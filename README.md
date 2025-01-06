# Grantflow Backend

## Prerequisites

You need a copy of `.env` file in the root of the repository. This file is git ignored and should not be
committed to GitHub.

## Installation

1. Install UV on your system (see: https://docs.astral.sh/uv/getting-started/installation):

   ```shell
   brew install pdm
   ```

2. Inside the repository, execute the sync command:

   ```shell
   uv sync
   ```

   This command will install the necessary dependencies on the machine and use UV to create a virtual environment under
   the `.venv` folder, which is git ignored, and install the dependencies inside it.
