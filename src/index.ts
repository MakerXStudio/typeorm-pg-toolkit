import { requestText, runChildProc, writeError, writeText, writeWarning, yeahNah } from './helpers'
import { Client } from 'pg'

type commands =
  | 'migration-generate'
  | 'migration-create'
  | 'migration-check'
  | 'migration-revert'
  | 'snapshot-create'
  | 'snapshot-restore'
  | 'snapshot-clean'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | unknown

const databaseConfig = {
  host: process.env.TYPEORM_TOOLKIT_DATABASE_HOST!,
  port: Number(process.env.TYPEORM_TOOLKIT_DATABASE_PORT!),
  user: process.env.TYPEORM_TOOLKIT_DATABASE_USERNAME!,
  password: process.env.TYPEORM_TOOLKIT_DATABASE_PASSWORD!,
  database: process.env.TYPEORM_TOOLKIT_DATABASE_NAME!,
}

run(process.argv[2])
  .then((code) => process.exit(code))
  .catch((e) => {
    writeError(e instanceof Error ? e.message : `${e}`)
    process.exit(-1)
  })

async function run(command: commands): Promise<number> {
  switch (command) {
    case 'snapshot-create': {
      let snapshotName = process.argv[3]
      if (!snapshotName) {
        snapshotName = requestText('Enter a name for the snapshot: ')
      }
      await createSnapshot(snapshotName)
      return 0
    }
    case 'snapshot-restore': {
      await restoreSnapshot(process.argv[3])
      return 0
    }
    case 'snapshot-clean':
      await cleanSnapshots()
      return 0
    case 'migration-generate':
      generateMigration(process.argv[3])
      return 0
    case 'migration-create':
      createMigration(process.argv[3])
      return 0
    case 'migration-check':
      checkMigration()
      return 0
    case 'migration-revert':
      revertMigration()
      return 0
    default:
      throw new Error('Missing command: Expected "create" or "restore"')
  }
}

async function createPgClient(): Promise<Client> {
  const client = new Client({ ...databaseConfig, database: 'postgres' })
  writeText('Connecting to postgres')
  await client.connect()
  return client
}

async function cleanSnapshots() {
  const client = await createPgClient()
  const databases = await getDatabases(client, databaseConfig.database)
  if (databases.length === 0) {
    writeText('There are no snapshot databases to remove.')
    return
  }
  writeWarning(`This will drop the following snapshot databases: \n${databases.map((db) => `  - ${db}`).join('\n')}`)

  const confirmationText = `Yes I'm sure`
  const confirmation = requestText(`Enter "${confirmationText}" to confirm this action: `)
  if (confirmation !== confirmationText) throw new Error('Aborted by user')
  for (const db of databases) await dropDatabase(client, db)
}

async function createSnapshot(snapshotName: string | undefined) {
  if (snapshotName === undefined || !/^[a-z_]+$/i.test(snapshotName)) {
    throw new Error(`Invalid snapshot name ${snapshotName ?? '<undefined>'}. Snapshot name must only contain letters and underscores`)
  }
  const snapshotDbName = `${databaseConfig.database}_${snapshotName}`

  const client = await createPgClient()

  const existingDatabases = await getDatabases(client, databaseConfig.database)

  if (existingDatabases.some((db) => db === snapshotDbName)) {
    writeWarning(`Snapshot db with the name ${snapshotDbName} already exists.`)
    if (yeahNah('Would you like to override this snapshot database?')) {
      await dropDatabase(client, snapshotDbName)
    } else throw new Error('Aborted by user')
  }

  await closeOtherConnections(client, databaseConfig.database)

  writeText(`Creating snapshot database ${snapshotDbName}`)

  await client.query(
    `
    create database "${snapshotDbName}" with template = "${databaseConfig.database}"
  `
  )
}

async function restoreSnapshot(snapshotName: string | undefined) {
  const client = await createPgClient()

  const snapshotDatabaseName = await getSnapshotDatabaseName(client, snapshotName)

  writeWarning('This will drop the main database and override it with the specified snapshot.')

  if (!yeahNah('Are you sure you want to continue?')) throw new Error('Aborted by user')

  await closeOtherConnections(client, databaseConfig.database)
  await closeOtherConnections(client, snapshotDatabaseName)

  await dropDatabase(client, databaseConfig.database)

  writeText(`Restoring snapshot from ${snapshotDatabaseName}`)
  await client.query(`CREATE DATABASE ${databaseConfig.database} WITH TEMPLATE = ${snapshotDatabaseName}`)

  if (yeahNah('Would you like to remove the snapshot?')) {
    await dropDatabase(client, snapshotDatabaseName)
  }
}

async function getSnapshotDatabaseName(client: Client, snapshotName: string | undefined): Promise<string> {
  const databases = await getDatabases(client, databaseConfig.database)

  if (snapshotName) {
    const matchedDbName = databases.find((db) => db === `${databaseConfig.database}_${snapshotName}`)
    if (matchedDbName) {
      return matchedDbName
    }
    writeWarning(`Couldn't find snapshot with the name "${snapshotName}"`)
  }
  writeText(
    `Available snapshots: \n${databases.map((db, i) => `  ${i + 1}: ${db.substring(databaseConfig.database.length + 1)}`).join('\n')}`
  )

  const snapshotNumber = Number(requestText('Enter the number of the snapshot to restore: '))

  if (isNaN(snapshotNumber) || !databases[snapshotNumber - 1]) throw new Error('Invalid snapshot selection')
  return databases[snapshotNumber - 1]!
}

async function dropDatabase(client: Client, databaseName: string) {
  writeText(`Dropping snapshot database ${databaseName}`)
  await client.query(`DROP DATABASE ${databaseName}`)
}

async function getDatabases(client: Client, baseName: string) {
  const data = await client.query<{ datname: string }>(
    `
    SELECT datname
    FROM pg_database
    WHERE datname like $1 and datname <> $2
    ORDER BY datname
  `,
    [`${baseName}_%`, baseName]
  )

  return data.rows.map((r) => r.datname)
}

async function closeOtherConnections(client: Client, dbName: string) {
  writeText(`Closing active connections to ${dbName}`)
  const query = `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1::text
      AND pid <> pg_backend_pid();`

  await client.query(query, [dbName])
}

function generateMigration(name: string) {
  writeText(`Generating migration with name: ${name}`)

  runChildProc('typeorm-ts-node-commonjs', [
    `migration:generate`,
    '--dataSource',
    process.env.TYPEORM_TOOLKIT_MIGRATION_DATASOURCE_CONFIG!,
    '--pretty',
    `${process.env.TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR}/${name}`,
  ])
}

function createMigration(name: string) {
  writeText(`Creating migration with name: ${name}`)

  runChildProc('typeorm-ts-node-commonjs', [`migration:create`, '--pretty', `${process.env.TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR}/${name}`])
}

function checkMigration() {
  writeText(`Checking if migration is needed`)

  runChildProc('typeorm-ts-node-commonjs', [
    `migration:generate`,
    '--dryrun',
    '--dataSource',
    process.env.TYPEORM_TOOLKIT_MIGRATION_DATASOURCE_CONFIG!,
    '--check',
    'some/path',
  ])
}

function revertMigration() {
  writeText(`Reverting the latest migration`)

  runChildProc('typeorm-ts-node-commonjs', [`migration:revert`, '--dataSource', process.env.TYPEORM_TOOLKIT_MIGRATION_DATASOURCE_CONFIG!])
}
