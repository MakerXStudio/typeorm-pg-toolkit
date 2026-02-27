# TypeORM toolkit

## Install
```
npm install @makerx/typeorm-pg-toolkit --save-dev
```
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

### Jest test database manager
`TestDatabaseManager` is a helper with managing databases in Jest tests.
The ultimate purpose is to make sure that all test suites are run in isolation.
Data created in one tests shouldn't affect other tests.
How it works is:
- During Jest setup process, an empty base database is created. Then all the migration scripts are run on the base database.
- For each test suite, a brand new database is created by cloning the base database. All tests in the suite are run against this database.
  When the test suite finishes running, the database is dropped.
- When all Jest tests finishes, the base database is dropped.

To use it, please follow the below steps:

- In Jest setup, initialise the test database manager
```typescript
export const testDbManager = new TestDatabaseManager({
  typeOrmOptions: typeOrmConfig,
  dbPrefix: 'db_prefix_',
  adminUsername: 'admin',
  adminPassword: 'password',
  postgresDatabaseName: 'postgres',
})

// in jest.setup,ts
export default async (): Promise<void> => {
  config({ override: true })
  await testDbManager.init()
}
```
- In each test suite, create new database at the beginning and drop it at the end
```typescript
describe('reviewRaise mutation', () => {
  let dispose: () => Promise<void> = () => Promise.resolve()

  beforeAll(async () => {
      const res = await testDbManager.prepareTestDatabaseSource()
      dispose = res.dispose
  })
  afterAll(async () => {
      await dispose()
  })

  // Other tests
})
```
- Don't forget the drop the base database in Jest teardown
```typescript
// In jest.teardown.ts
export default async (): Promise<void> => {
  await testDbManager.dispose()
}
```

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
