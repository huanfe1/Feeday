import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import { initDB } from './init';
import { createKysely } from './kysely';
import { DatabaseMethods } from './methods';

const dbPath = join(app.getPath('userData'), 'database.db');

const rawDb = new DatabaseSync(dbPath);
initDB(rawDb);

const db = createKysely(rawDb);

const dbMethods = new DatabaseMethods(db);

export { db, dbMethods };

app.on('before-quit', () => db.destroy());
