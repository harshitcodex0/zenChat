require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const collId = 'cmth7brx200006c3kxphf4j2s';
  const r1 = await pool.query('SELECT id, title, status FROM document WHERE "collectionId" = ', [collId]);
  console.log('Docs:', JSON.stringify(r1.rows));
  const r2 = await pool.query('SELECT COUNT(*) as cnt FROM document_chunk dc JOIN document d ON dc."documentId" = d.id WHERE d."collectionId" = ', [collId]);
  console.log('Chunk count for collection:', r2.rows[0].cnt);
}
run().catch(e => console.error('Error:', e.message)).finally(() => pool.end());
