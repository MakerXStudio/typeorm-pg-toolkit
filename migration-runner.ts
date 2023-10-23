/* eslint-disable no-console */
import 'reflect-metadata'
import { DataSource } from 'typeorm'

export type Config = {
  /**
   * The root dir of the migration scripts.
   * Fallback to TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR environment variable.
   */
  rootDir?: string

  /**
   * The driver object This defaults to require("pg").
    */
  driver?: any

  /**
   * Postgres database host.
   * Fallback to TYPEORM_TOOLKIT_DATABASE_HOST environment variable.
   */
  host?: string

  /**
   * Postgres database port.
   * Fallback to TYPEORM_TOOLKIT_DATABASE_PORT environment variable.
   */
  port?: number

  /**
   * Postgres database dbName
   * Fallback to TYPEORM_TOOLKIT_DATABASE_NAME environment variable.
   */
  dbname?: string

  /**
   * Postgres database username
   * Fallback to TYPEORM_TOOLKIT_DATABASE_USERNAME environment variable.
   */
  username?: string

  /**
   * Postgres database password
   * Fallback to TYPEORM_TOOLKIT_DATABASE_PASSWORD environment variable.
   */
  password?: string

  /**
   * Postgres connection timeout. Default to 30 seconds
   */
  connectionTimeout?: number

  /**
   * Specify whether SSL connection to the Postgres database is required
   */
  ssl: boolean
}

export const runMigrations = async (config: Config) => {
  const rootDir = config.rootDir ?? process.env.TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR

  if (!rootDir) {
    throw new Error('Migration root dir is required. Either supply it via config or environment variable TYPEORM_TOOLKIT_MIGRATION_ROOT_DIR.')
  }

  const dataSource = new DataSource({
    type: 'postgres',
    driver: config.driver,
    host: config.host ?? process.env.TYPEORM_TOOLKIT_DATABASE_HOST,
    port: config.port ?? Number(process.env.TYPEORM_TOOLKIT_DATABASE_PORT!),
    database: config.dbname ?? process.env.TYPEORM_TOOLKIT_DATABASE_NAME,
    username: config.username ?? process.env.TYPEORM_TOOLKIT_DATABASE_USERNAME,
    password: config.password ?? process.env.TYPEORM_TOOLKIT_DATABASE_PASSWORD,
    connectTimeoutMS: config.connectionTimeout ?? 30 * 1000,
    synchronize: false,
    logging: true,
    entities: [''],
    migrations: [`${rootDir}/**/*{.ts,.js}`],
    subscribers: [],
    ssl: config.ssl,
  })

  console.log('Initialising database connection')
  await dataSource.initialize()

  console.log('Running migration(s)')
  const migrations = await dataSource.runMigrations({
    transaction: 'each',
  })
  console.log('runMigrations complete')
  for (const m of migrations) {
    console.info(`Executed migration: ${JSON.stringify(m, null, 4)}`)
  }
}


