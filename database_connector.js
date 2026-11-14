let connection = null;
let databaseDialect = '';
let connectionId = '';
let connectionCatalog = '';
const { execFileSync } = require('node:child_process');

exports.listDrivers = () => {
  if (process.platform === 'win32') return [];
  try {
    return execFileSync('odbcinst', ['-q', '-d'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('[') && line.endsWith(']'))
      .map((line) => line.slice(1, -1));
  } catch (_) {
    return [];
  }
};

const value = (row, name) => {
  const key = Object.keys(row || {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? row[key] : null;
};

const connectionStringCatalog = (raw) => {
  const match = String(raw || '').match(/(?:^|;)\s*(?:DATABASE|DB|CATALOG|INITIAL\s+CATALOG)\s*=\s*(\{(?:[^}]|}})*\}|[^;]*)/i);
  const attribute = String(match?.[1] || '').trim();
  return attribute.startsWith('{') && attribute.endsWith('}')
    ? attribute.slice(1, -1).replaceAll('}}', '}').trim()
    : attribute;
};

const resolveCurrentCatalog = async (conn, dialect) => {
  const queryByDialect = {
    mysql: 'SELECT DATABASE() AS database_name',
    mariadb: 'SELECT DATABASE() AS database_name',
    postgresql: 'SELECT current_database() AS database_name',
    sqlserver: 'SELECT DB_NAME() AS database_name'
  };
  const query = queryByDialect[String(dialect || '').toLowerCase()];
  if (!query) return '';
  try {
    const rows = await conn.query(query);
    return String(value(Array.isArray(rows) ? rows[0] : null, 'database_name') || '').trim();
  } catch (_) {
    return '';
  }
};

const quoteIdentifier = (name, dialect) => {
  const text = String(name || '');
  if (!text || text.includes('\0')) throw new Error('Invalid database identifier.');
  const quote = /mysql|maria/i.test(dialect) ? '`' : '"';
  return `${quote}${text.replaceAll(quote, quote + quote)}${quote}`;
};

const getOdbc = () => {
  try {
    return require('odbc');
  } catch (error) {
    if (error?.code === 'ERR_DLOPEN_FAILED') {
      throw new Error('The ODBC runtime is missing. Install unixODBC and an ODBC driver for your database.');
    }
    throw new Error('The ODBC package is unavailable. Reinstall the app dependencies.');
  }
};

const requireConnection = () => {
  if (!connection) throw new Error('Connect to a database first.');
  return connection;
};

const requireConnectionId = (provided) => {
  requireConnection();
  if (!provided || provided !== connectionId) throw new Error('The database connection changed. Reconnect and try again.');
};

const tableMetadata = async (conn, target) => {
  const tables = await conn.tables(target.catalog || null, target.schema || null, target.table, null);
  const table = tables.find((row) => value(row, 'TABLE_NAME') === target.table
    && (value(row, 'TABLE_SCHEM') || '') === (target.schema || '')
    && (value(row, 'TABLE_CAT') || '') === (target.catalog || ''));
  if (!table) throw new Error('That table is not available on this connection. Refresh the table list.');
  return table;
};

const serialize = (row) => Object.fromEntries(Object.entries(row).map(([key, cell]) => [
  key,
  typeof cell === 'bigint' ? String(cell) : (cell instanceof Date ? cell.toISOString() : cell)
]));

exports.connect = async (connectionString, dialectHint = '') => {
  const raw = String(connectionString || '').trim();
  if (!raw || raw.length > 4096) throw new Error('Enter a connection string (maximum 4096 characters).');
  const next = await getOdbc().connect(raw);
  const nextDialect = ['mysql', 'mariadb', 'postgresql', 'sqlserver', 'other'].includes(dialectHint)
    ? dialectHint
    : (/maria/i.test(raw) ? 'mariadb' : (/mysql/i.test(raw) ? 'mysql' : (/postgres/i.test(raw) ? 'postgresql' : (/sql\s*server|microsoft/i.test(raw) ? 'sqlserver' : ''))));
  const nextCatalog = connectionStringCatalog(raw) || await resolveCurrentCatalog(next, nextDialect);
  const previous = connection;
  connection = next;
  const detectedDialect = /maria/i.test(raw) ? 'mariadb'
    : (/mysql/i.test(raw) ? 'mysql' : (/postgres/i.test(raw) ? 'postgresql' : (/sql\s*server|microsoft/i.test(raw) ? 'sqlserver' : '')));
  databaseDialect = nextDialect || detectedDialect;
  connectionCatalog = nextCatalog;
  connectionId = require('crypto').randomUUID();
  if (previous) await previous.close().catch(() => {});
  return { success: true, connectionId };
};

exports.listTables = async (id) => {
  requireConnectionId(id);
  const conn = requireConnection();
  const tables = await conn.tables(connectionCatalog || null, null, null, 'TABLE,VIEW');
  return tables.map((row) => ({
    catalog: value(row, 'TABLE_CAT') || '',
    schema: value(row, 'TABLE_SCHEM') || '',
    table: value(row, 'TABLE_NAME') || '',
    type: value(row, 'TABLE_TYPE') || 'TABLE'
  })).filter((row) => row.table
    && (!connectionCatalog || String(row.catalog || '').toLowerCase() === connectionCatalog.toLowerCase()));
};

exports.readTable = async (target) => {
  requireConnectionId(target?.connectionId);
  const conn = requireConnection();
  await tableMetadata(conn, target || {});
  const columns = await conn.columns(target.catalog || null, target.schema || null, target.table, null);
  const columnNames = columns
    .sort((a, b) => Number(value(a, 'ORDINAL_POSITION')) - Number(value(b, 'ORDINAL_POSITION')))
    .map((row) => value(row, 'COLUMN_NAME'))
    .filter(Boolean);
  const primaryKeys = await conn.primaryKeys(target.catalog || null, target.schema || null, target.table);
  const keys = primaryKeys
    .sort((a, b) => Number(value(a, 'KEY_SEQ')) - Number(value(b, 'KEY_SEQ')))
    .map((row) => value(row, 'COLUMN_NAME'))
    .filter(Boolean);
  const dialect = databaseDialect || conn.dbmsName || '';
  const quote = (part) => quoteIdentifier(part, dialect);
  const nameParts = [target.catalog, target.schema, target.table].filter(Boolean);
  if (/postgres/i.test(dialect) && nameParts.length > 1) nameParts.shift();
  const parts = nameParts.map(quote);
  const sql = `SELECT * FROM ${parts.join('.')}`;
  const cursor = await conn.query(sql, { cursor: true, fetchSize: 1000 });
  const rows = [];
  try {
    while (!cursor.noData && rows.length <= 10000) {
      const chunk = await cursor.fetch();
      rows.push(...chunk.map(serialize));
    }
  } finally {
    await cursor.close();
  }
  const truncated = rows.length > 10000;
  if (truncated) rows.length = 10000;
  return { columns: columnNames, rows, primaryKeys: keys, truncated };
};

exports.applyCellEdits = async ({ target, originalRows, rows, columns: requestedColumns }) => {
  requireConnectionId(target?.connectionId);
  const conn = requireConnection();
  await tableMetadata(conn, target || {});
  const metadataKeys = await conn.primaryKeys(target.catalog || null, target.schema || null, target.table);
  const primaryKeys = metadataKeys
    .sort((a, b) => Number(value(a, 'KEY_SEQ')) - Number(value(b, 'KEY_SEQ')))
    .map((row) => value(row, 'COLUMN_NAME'))
    .filter(Boolean);
  if (!Array.isArray(primaryKeys) || primaryKeys.length === 0) {
    throw new Error('This table has no primary key, so safe updates are unavailable.');
  }
  const metadataColumns = await conn.columns(target.catalog || null, target.schema || null, target.table, null);
  const columns = metadataColumns.map((row) => value(row, 'COLUMN_NAME')).filter(Boolean);
  const validRows = (input) => Array.isArray(input) && input.every((row) => row && typeof row === 'object' && !Array.isArray(row));
  if (!Array.isArray(originalRows) || !Array.isArray(rows) || originalRows.length !== rows.length
      || !validRows(originalRows) || !validRows(rows)
      || !Array.isArray(requestedColumns) || requestedColumns.length !== columns.length
      || columns.some((column) => !requestedColumns.includes(column))
      || (originalRows[0] && columns.some((column) => !(column in originalRows[0])))) {
    // shortcut: database writeback covers edits to existing cells; support row and schema operations with separately audited SQL paths.
    throw new Error('Only cell edits can be applied. Row and column structure must stay unchanged.');
  }
  const originalByKey = new Map(originalRows.map((row) => [JSON.stringify(primaryKeys.map((key) => row[key])), row]));
  if (originalByKey.size !== originalRows.length || originalRows.some((row) => primaryKeys.some((key) => row[key] === null || row[key] === undefined || row[key] === ''))) {
    throw new Error('Rows need unique, non-empty primary keys before changes can be applied.');
  }
  const quote = (part) => quoteIdentifier(part, databaseDialect || conn.dbmsName || '');
  const tableName = [target.catalog, target.schema, target.table].filter(Boolean).map(quote).join('.');
  const edits = [];
  for (const row of rows) {
    const key = JSON.stringify(primaryKeys.map((name) => row[name]));
    const original = originalByKey.get(key);
    if (!original) throw new Error('Primary key values cannot be changed. Reload the table to continue.');
    const changes = columns.filter((column) => !primaryKeys.includes(column)
      && !Object.is(original[column], row[column]));
    if (changes.length) edits.push({ original, row, changes });
  }
  if (edits.length === 0) return { success: true, updated: 0 };

  await conn.beginTransaction();
  try {
    let updated = 0;
    for (const { original, row, changes } of edits) {
      const predicates = primaryKeys.map((key) => `${quote(key)} = ?`);
      const params = primaryKeys.map((key) => original[key]);
      for (const column of changes) {
        if (original[column] == null) predicates.push(`${quote(column)} IS NULL`);
        else {
          predicates.push(`${quote(column)} = ?`);
          params.push(original[column]);
        }
      }
      const assignments = changes.map((column) => `${quote(column)} = ?`);
      const result = await conn.query(
        `UPDATE ${tableName} SET ${assignments.join(', ')} WHERE ${predicates.join(' AND ')}`,
        [...changes.map((column) => row[column]), ...params]
      );
      if (result.count !== 1) throw new Error('A row changed in the database since it was loaded. No edits were applied. Reload and try again.');
      updated += 1;
    }
    await conn.commit();
    return { success: true, updated };
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  }
};

const toDatabaseValue = (input, dialect = '') => {
  if (input === undefined || input === null) return null;
  if (typeof input === 'bigint') return String(input);
  if (typeof input === 'boolean' && !/postgres|sqlserver/i.test(dialect)) return input ? 1 : 0;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'object') return JSON.stringify(input);
  if (typeof input === 'number' && !Number.isFinite(input)) return String(input);
  return input;
};

const columnSqlType = (values, dialect) => {
  const present = values.filter((item) => item !== null && item !== undefined);
  if (present.length && present.every((item) => typeof item === 'boolean')) {
    return /postgres/i.test(dialect) ? 'BOOLEAN' : (/sqlserver/i.test(dialect) ? 'BIT' : 'SMALLINT');
  }
  if (present.length && present.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    if (present.every(Number.isSafeInteger)) return 'BIGINT';
    return /sqlserver/i.test(dialect) ? 'FLOAT' : (/mysql|maria/i.test(dialect) ? 'DOUBLE' : 'DOUBLE PRECISION');
  }

  const maxLength = present.reduce((maximum, item) => Math.max(maximum, String(toDatabaseValue(item, dialect)).length), 1);
  if (/mysql|maria/i.test(dialect)) return 'LONGTEXT';
  if (/postgres/i.test(dialect)) return 'TEXT';
  if (/sqlserver/i.test(dialect)) return 'NVARCHAR(MAX)';
  if (maxLength > 4000) throw new Error('A text value is longer than this database driver’s portable 4,000 character limit. Use a supported MySQL, PostgreSQL, or SQL Server driver.');
  return `VARCHAR(${Math.min(maxLength, 4000)})`;
};

exports.applyChanges = async ({ target, originalColumns, originalRows, columns, rows }) => {
  requireConnectionId(target?.connectionId);
  const conn = requireConnection();
  const table = await tableMetadata(conn, target || {});
  if (!/^(?:BASE\s+)?TABLE$/i.test(String(value(table, 'TABLE_TYPE') || '').trim())) {
    throw new Error('Read/write mode is available only for database tables, not views.');
  }

  const validColumns = (items) => Array.isArray(items)
    && items.length > 0
    && items.length <= 1799
    && items.every((column) => typeof column === 'string' && column.trim() && !column.includes('\0'))
    && new Set(items.map((column) => column.toLowerCase())).size === items.length;
  const validRows = (items) => Array.isArray(items)
    && items.length <= 100000
    && items.every((row) => row && typeof row === 'object' && !Array.isArray(row));
  if (!validColumns(originalColumns) || !validColumns(columns)
      || !validRows(originalRows) || !validRows(rows)
      || (originalRows[0] && originalColumns.some((column) => !(column in originalRows[0])))
      || rows.some((row) => columns.some((column) => !(column in row)))) {
    throw new Error('The live database edit could not be matched to the loaded table shape. Reload the table and try again.');
  }

  const primaryKeys = (await conn.primaryKeys(target.catalog || null, target.schema || null, target.table))
    .sort((a, b) => Number(value(a, 'KEY_SEQ')) - Number(value(b, 'KEY_SEQ')))
    .map((row) => value(row, 'COLUMN_NAME'))
    .filter(Boolean);
  if (primaryKeys.length === 0) throw new Error('Read/write mode requires a primary key so edits can target rows safely.');
  if (primaryKeys.some((column) => !originalColumns.includes(column) || !columns.includes(column))) {
    throw new Error('Primary key columns cannot be removed or renamed while connected to this table.');
  }

  const columnMetadata = await conn.columns(target.catalog || null, target.schema || null, target.table, null);
  const databaseColumns = columnMetadata.map((row) => value(row, 'COLUMN_NAME')).filter(Boolean);
  if (databaseColumns.length !== originalColumns.length
      || databaseColumns.some((column) => !originalColumns.includes(column))) {
    throw new Error('The database table schema changed outside DEM. Reload the table before writing more changes.');
  }

  const dialect = databaseDialect || conn.dbmsName || '';
  const quote = (identifier) => quoteIdentifier(identifier, dialect);
  const tableName = [target.catalog, target.schema, target.table].filter(Boolean).map(quote).join('.');
  const addedColumns = columns.filter((column) => !originalColumns.includes(column));
  const removedColumns = originalColumns.filter((column) => !columns.includes(column));
  const generatedRows = rows.map((row) => ({ ...row }));
  const keyFor = (row) => JSON.stringify(primaryKeys.map((key) => row[key]));
  const originalKeys = new Set(originalRows.map(keyFor));
  if (originalKeys.size !== originalRows.length) throw new Error('Loaded rows contain duplicate primary keys. Reload before editing.');

  const missingKeyRows = generatedRows.filter((row) => primaryKeys.some((key) => row[key] === null || row[key] === undefined || row[key] === ''));
  if (missingKeyRows.length > 0) {
    const generatedKey = primaryKeys.find((key) => /^_*data_explorer_row_id$/i.test(key));
    if (!generatedKey || generatedRows.length <= originalRows.length) {
      return { success: true, pending: true, message: `Enter a value for primary key${primaryKeys.length > 1 ? 's' : ''} ${primaryKeys.join(', ')} before the new row can be written.` };
    }
    const maxResult = await conn.query(`SELECT MAX(${quote(generatedKey)}) AS max_id FROM ${tableName}`);
    const maximum = Number(value(Array.isArray(maxResult) ? maxResult[0] : null, 'max_id') || 0);
    if (!Number.isSafeInteger(maximum)) throw new Error(`Could not generate a safe ${generatedKey} value for the new row.`);
    let nextId = maximum + 1;
    generatedRows.forEach((row) => {
      if (row[generatedKey] === null || row[generatedKey] === undefined || row[generatedKey] === '') {
        row[generatedKey] = nextId++;
      }
    });
  }

  const currentByKey = new Map(generatedRows.map((row) => [keyFor(row), row]));
  if (currentByKey.size !== generatedRows.length) throw new Error('Rows need unique primary keys before they can be written.');
  const originalByKey = new Map(originalRows.map((row) => [keyFor(row), row]));
  const insertedRows = generatedRows.filter((row) => !originalByKey.has(keyFor(row)));
  const deletedRows = originalRows.filter((row) => !currentByKey.has(keyFor(row)));
  const changedRows = generatedRows.flatMap((row) => {
    const original = originalByKey.get(keyFor(row));
    if (!original) return [];
    const changedColumns = columns.filter((column) => !primaryKeys.includes(column)
      && !Object.is(original[column], row[column]));
    return changedColumns.length > 0 ? [{ original, row, changedColumns }] : [];
  });
  if (removedColumns.some((column) => primaryKeys.includes(column))) {
    throw new Error('Primary key columns cannot be removed while connected to this table.');
  }
  if (addedColumns.length === 0 && removedColumns.length === 0
      && insertedRows.length === 0 && deletedRows.length === 0 && changedRows.length === 0) {
    return { success: true, updated: 0, inserted: 0, deleted: 0, addedColumns: [], removedColumns: [], rows: generatedRows };
  }

  await conn.beginTransaction();
  try {
    for (const column of addedColumns) {
      const columnType = columnSqlType(generatedRows.map((row) => row[column]), dialect);
      await conn.query(`ALTER TABLE ${tableName} ADD ${quote(column)} ${columnType}`);
    }
    for (const { original, row, changedColumns } of changedRows) {
      const predicates = primaryKeys.map((key) => `${quote(key)} = ?`);
      const params = primaryKeys.map((key) => toDatabaseValue(original[key], dialect));
      for (const column of changedColumns) {
        if (!originalColumns.includes(column)) continue;
        if (original[column] == null) predicates.push(`${quote(column)} IS NULL`);
        else {
          predicates.push(`${quote(column)} = ?`);
          params.push(toDatabaseValue(original[column], dialect));
        }
      }
      const assignments = changedColumns.map((column) => `${quote(column)} = ?`).join(', ');
      const result = await conn.query(
        `UPDATE ${tableName} SET ${assignments} WHERE ${predicates.join(' AND ')}`,
        [...changedColumns.map((column) => toDatabaseValue(row[column], dialect)), ...params]
      );
      if (result.count !== 1) throw new Error('A row changed in the database since it was loaded. No edits were applied. Reload and try again.');
    }
    for (const row of insertedRows) {
      const insertColumns = columns;
      const result = await conn.query(
        `INSERT INTO ${tableName} (${insertColumns.map(quote).join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`,
        insertColumns.map((column) => toDatabaseValue(row[column], dialect))
      );
      if (result.count !== 1) throw new Error('The database did not confirm the inserted row.');
    }
    for (const row of deletedRows) {
      const predicates = primaryKeys.map((key) => `${quote(key)} = ?`);
      const params = primaryKeys.map((key) => toDatabaseValue(row[key], dialect));
      const result = await conn.query(`DELETE FROM ${tableName} WHERE ${predicates.join(' AND ')}`, params);
      if (result.count !== 1) throw new Error('A row changed in the database since it was loaded. No edits were applied. Reload and try again.');
    }
    for (const column of removedColumns) {
      await conn.query(`ALTER TABLE ${tableName} DROP COLUMN ${quote(column)}`);
    }
    await conn.commit();
    return {
      success: true,
      updated: changedRows.length,
      inserted: insertedRows.length,
      deleted: deletedRows.length,
      addedColumns,
      removedColumns,
      rows: generatedRows
    };
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  }
};

exports.saveDataset = async ({ connectionId: id, tableName: rawTableName, columns, rows }) => {
  requireConnectionId(id);
  const conn = requireConnection();
  const tableName = String(rawTableName || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(tableName)) {
    throw new Error('Use a table name beginning with a letter or underscore, followed by letters, numbers, or underscores (63 characters max).');
  }
  if (!Array.isArray(columns) || columns.length === 0 || columns.length > 1799
      || columns.some((column) => typeof column !== 'string' || !column.trim())
      || new Set(columns.map((column) => column.toLowerCase())).size !== columns.length) {
    throw new Error('The dataset must have unique, non-empty column names.');
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100000
      || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Choose a dataset with 1 to 100,000 rows.');
  }

  const existingTables = await conn.tables(null, null, null, 'TABLE,VIEW');
  if (existingTables.some((row) => String(value(row, 'TABLE_NAME') || '').toLowerCase() === tableName.toLowerCase())) {
    throw new Error(`A table or view named "${tableName}" already exists. Choose a new name; existing tables are never overwritten.`);
  }

  const dialect = databaseDialect || conn.dbmsName || '';
  const quote = (identifier) => quoteIdentifier(identifier, dialect);
  const table = quote(tableName);
  let rowIdColumn = 'data_explorer_row_id';
  while (columns.some((column) => column.toLowerCase() === rowIdColumn.toLowerCase())) rowIdColumn = `_${rowIdColumn}`;
  const sqlColumns = columns.map((column) => {
    const values = rows.map((row) => row[column]);
    return `${quote(column)} ${columnSqlType(values, dialect)}`;
  });
  sqlColumns.unshift(`${quote(rowIdColumn)} INTEGER PRIMARY KEY`);

  await conn.beginTransaction();
  try {
    await conn.query(`CREATE TABLE ${table} (${sqlColumns.join(', ')})`);
    const insertedColumns = [rowIdColumn, ...columns];
    const batchSize = Math.max(1, Math.floor(1800 / insertedColumns.length));
    const columnSql = insertedColumns.map(quote).join(', ');
    let inserted = 0;
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const valuesSql = batch.map(() => `(${insertedColumns.map(() => '?').join(', ')})`).join(', ');
      const params = batch.flatMap((row, index) => [start + index + 1, ...columns.map((column) => toDatabaseValue(row[column], dialect))]);
      await conn.query(`INSERT INTO ${table} (${columnSql}) VALUES ${valuesSql}`, params);
      inserted += batch.length;
    }
    await conn.commit();
    return { success: true, tableName, inserted, primaryKey: rowIdColumn };
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw new Error(`${error?.message || 'The dataset could not be saved.'} If this database commits table creation separately, an empty table named "${tableName}" may remain.`);
  }
};

exports.disconnect = async () => {
  const current = connection;
  connection = null;
  databaseDialect = '';
  connectionId = '';
  connectionCatalog = '';
  if (current) await current.close();
  return { success: true };
};
