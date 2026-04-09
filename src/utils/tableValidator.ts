import {db} from '../db/knex';


// Hàm này query information_schema (bảng metadata của Postgres)
// để kiểm tra xem tên bảng có tồn tại không → whitelist an toàn
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await db('information_schema.tables')
    .where({
      table_schema: 'public',
      table_name: tableName,
    })
    .count('table_name as count')
    .first();
  return Number(result?.count) > 0;
}