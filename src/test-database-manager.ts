import { randomUUID } from 'crypto'
import { Client } from 'pg'
import { DataSource, Logger } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

const noop = () => void 0
const errorOnlyLogger: Logger = {
  logQueryError(error: string | Error, query: string, parameters?: any[]) {
    // eslint-disable-next-line no-console
    console.error('TYPEORM:ERROR', error, query, parameters)
  },
  logQuery: noop,
  logQuerySlow: noop,
  logSchemaBuild: noop,
  logMigration: noop,
  log: noop,
}

export class TestDatabaseManager {
  private _toDispose: Array<() => Promise<void>> = []
  private readonly typeOrmOptions: PostgresConnectionOptions
  private readonly dbPrefix: string
  private readonly baseDbName: string
  private readonly adminUsername: string
  private readonly adminPassword: string
  private readonly postgresDatabaseName: string

  constructor({
    typeOrmOptions,
    dbPrefix,
    postgresDatabaseName,
    adminUsername,
    adminPassword,
  }: {
    typeOrmOptions: PostgresConnectionOptions
    dbPrefix: string
    postgresDatabaseName: string
    adminUsername: string
    adminPassword: string
  }) {
    this.dbPrefix = dbPrefix
    this.baseDbName = `${dbPrefix}base`

    this.typeOrmOptions = {
      ...typeOrmOptions,
      logger: errorOnlyLogger,
    }

    this.postgresDatabaseName = postgresDatabaseName
    this.adminUsername = adminUsername
    this.adminPassword = adminPassword
  }

  async init() {
    await this.dropDatabase(this.baseDbName)
    await this.createBaseDatabase()
    this._toDispose.push(() => this.dropDatabase(this.baseDbName))
  }

  async prepareTestDatabaseSource() {
    const dbName = `${this.dbPrefix}${randomUUID().replaceAll('-', '_')}`
    await this.cloneDatabase(this.baseDbName, dbName)

    const dataSource = new DataSource({
      ...this.typeOrmOptions,
      username: this.adminUsername,
      database: dbName,
    })
    await dataSource.initialize()

    const dispose = async () => {
      await dataSource.destroy()
      await this.dropDatabase(dbName)
    }
    this._toDispose.push(dispose)

    return {
      dataSource,
      dispose,
    }
  }

  async dispose() {
    return Promise.allSettled(this._toDispose.map((x) => x()))
  }

  async createBaseDatabase() {
    await this.runPgQuery(`create database ${this.baseDbName}`)
    const datasource = new DataSource({
      ...this.typeOrmOptions,
      username: this.adminUsername,
      database: this.baseDbName,
    })
    await datasource.initialize()
    await datasource.runMigrations({
      transaction: 'each',
    })
    await datasource.destroy()
  }

  async dropDatabase(databaseName: string) {
    if (!databaseName.startsWith(this.dbPrefix)) throw new Error(`Cannot drop non test database ${databaseName}`)
    await this.closeOtherConnections(databaseName)
    await this.runPgQuery(`DROP DATABASE IF EXISTS ${databaseName} `)
  }

  cloneDatabase(sourceDatabaseName: string, copyDatabaseName: string) {
    return this.runPgQuery(`create database "${copyDatabaseName}" with template = "${sourceDatabaseName}"`)
  }

  closeOtherConnections(databaseName: string) {
    return this.runPgQuery(
      `
    SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1::text
      AND pid <> pg_backend_pid();
  `,
      [databaseName]
    )
  }

  async runPgQuery(query: string, ...args: any[]) {
    const pg = new Client({
      host: this.typeOrmOptions.host,
      port: this.typeOrmOptions.port,
      password: this.adminPassword,
      user: this.adminUsername,
      database: this.postgresDatabaseName,
    })
    try {
      await pg.connect()
      return await pg.query(query, args)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Query failed', query, e)
      throw e
    } finally {
      await pg.end()
    }
  }
}
