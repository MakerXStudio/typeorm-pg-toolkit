# TypeORM toolkit
A set of useful TypeORM tools to work with Postgres

## Features
Supported features are:

### Data migrations
- `migration-create`: Create an empty migration script.
- `migration-generate`: Generate migration scripts to match the current Postgres database with the current entity model.
- `migration-check`: Check for discrepancies between the current Postgres database and the current entity model.
- `migration-revert`: Revert the latest migration script.

### Data snapshot
- `snapshot-create`: Create a snapshot of the current Postgres database.
- `snapshot-restore`: Restore a snapshot
- `snapshot-clean`: Delete all snapshots

## Environment variables
This toolkit expect you to set the below environment variables

### Data migrations
- `TYPEORM_TOOLKIT_MIGRATION_DATASOURCE_CONFIG`: The path to TypeORM datasource file.
- `TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR`: The directory to generate new migration scripts to.

### Data snapshots
- `TYPEORM_TOOLKIT_DATABASE_HOST`: Postgres database host
- `TYPEORM_TOOLKIT_DATABASE_PORT`: Postgres database port
- `TYPEORM_TOOLKIT_DATABASE_NAME`: Postgres database name
- `TYPEORM_TOOLKIT_DATABASE_USERNAME`: Postgres database username
- `TYPEORM_TOOLKIT_DATABASE_PASSWORD`: Postgres database password

Note: The username must have permissions to create snapshot/restore permissions.
