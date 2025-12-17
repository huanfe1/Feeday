import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import initSql from './init.sql?raw';

const dbPath = join(app.getPath('userData'), 'database.db');
export const db = new DatabaseSync(dbPath);

db.exec(initSql);

export default function () {
    db.close();
}
