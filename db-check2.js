require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // Find the correct join table name
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%chat%'");
  console.log('Chat tables:', JSON.stringify(tables.rows));
  const tables2 = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%ollect%'");
  console.log('Collection tables:', JSON.stringify(tables2.rows));
  // Check chunks
  const chunks = await pool.query('SELECT dc.id, dc."documentId", LEFT(dc.content, 50) as preview FROM document_chunk dc LIMIT 5');
  console.log('Sample chunks:', JSON.stringify(chunks.rows));
}
run().catch(console.error).finally(() => pool.end());
