# Supabase Configs

This folder contains supabase configs.

The [schema.sql](./schema.sql) file contains the SQL schema for the database.
The [functions folder](./functions) contains the SQL scripts to create functions to interact with extensions.
The [migrations folder](./migrations) contains the SQL scripts to migrate the database [see scripts below].

## Installation

Install the dependencies at the project root, with the following command:

```sh
pnpm install -r
```

## Usage

After the `supabase` cli is installed with the above command, you can use the available scripts
in [package.json](./package.json):

### start

```sh
pnpm run start
```

Starts the database.

### stop

```sh
pnpm run stop
```

Stops the database.

### status

```sh
pnpm run status
```

Shows the status of the database.

### restart

```sh
pnpm run restart
```

Restarts the database.

### reset

```sh
pnpm run reset
```

Resets the database.

### link

```sh
pnpm run link <remote>
```

Links the database to a remote.

### generate:types

```sh
pnpm run generate:types
```

Generates the types for the database. These are set under the [gen folder](../gen/database-types).

### generate:migration

```sh
pnpm run generate:migration <migration-name>
```

Generates a migration file under the [migrations folder](./migrations).

### generate:seed

```sh
pnpm run generate:seed
```

Generates a seed file and saves it as [seed.sql](./seed.sql).

### push

```sh
pnpm run push
```

Pushes the database to the remote.

### pull

```sh
pnpm run pull
```

Pulls the database from the remote.
