// https://github.com/kysely-org/kysely/issues/1292#issuecomment-2670341588
import type { Database } from '@shared/types/database';
import { CamelCasePlugin, Kysely } from 'kysely';
import { GenericSqliteDialect, buildQueryFn, parseBigInt } from 'kysely-generic-sqlite';
import type { IGenericSqlite } from 'kysely-generic-sqlite';
import type { DatabaseSync } from 'node:sqlite';

export function createKysely(db: DatabaseSync): Kysely<Database> {
    return new Kysely<Database>({
        dialect: new GenericSqliteDialect(() => createSqliteExecutor(db)),
        plugins: [new CamelCasePlugin()],
    });
}

function createSqliteExecutor(db: DatabaseSync): IGenericSqlite<DatabaseSync> {
    const getStmt = (sql: string) => {
        const stmt = db.prepare(sql);
        // stmt.setReadBigInts(true);
        return stmt;
    };

    return {
        db,
        query: buildQueryFn({
            all: (sql, parameters = []) => getStmt(sql).all(...parameters),
            run: (sql, parameters = []) => {
                const { changes, lastInsertRowid } = getStmt(sql).run(...parameters);
                return {
                    insertId: parseBigInt(lastInsertRowid),
                    numAffectedRows: parseBigInt(changes),
                };
            },
        }),
        close: () => db.close(),
        iterator: (isSelect, sql, parameters = []) => {
            if (!isSelect) {
                throw new Error('Only support select in stream()');
            }
            return getStmt(sql).iterate(...parameters) as any;
        },
    };
}
