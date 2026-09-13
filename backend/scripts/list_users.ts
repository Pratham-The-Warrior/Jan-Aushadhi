import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, firebase_uid, name, role, linked_pmbjk_code, phone, email FROM users`);
    console.log('--- Database Users ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
