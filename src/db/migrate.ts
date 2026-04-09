import fs from 'fs';
import { db } from './knex';

export async function runMigration() {
    const raw = fs.readFileSync('./schema.json', 'utf-8');
    const schema = JSON.parse(raw);

    for (const tableName of Object.keys(schema)) {
        const exists = await db.schema.hasTable(tableName);
        if (!exists) {
            const sample = schema[tableName][0];
            await db.schema.createTable(tableName, (table) => {
                table.increments('id');
                Object.entries(sample).forEach(([col, val]) => {
                    if (col === 'id') return;
                    if (typeof val === 'number') table.integer(col);
                    else if (typeof val === 'boolean') table.boolean(col);
                    else table.text(col);
                });
                table.timestamps(true, true);
            })
            console.log(`✅ Đã tạo bảng "${tableName}"`);
        }
    }
}
