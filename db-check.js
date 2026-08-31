require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const chunks = await pool.query('SELECT COUNT(*) as cnt FROM document_chunk');
  console.log('Total chunks:', chunks.rows[0].cnt);
  const docs = await pool.query('SELECT id, title, status FROM document');
  console.log('Documents:', JSON.stringify(docs.rows));
  const links = await pool.query('SELECT * FROM "_ChatKnowledgeCollections" LIMIT 5');
  console.log('Chat-Collection links:', JSON.stringify(links.rows));
  const colls = await pool.query('SELECT id, name FROM knowledge_collection');
  console.log('Collections:', JSON.stringify(colls.rows));
}
run().catch(console.error).finally(() => pool.end());
