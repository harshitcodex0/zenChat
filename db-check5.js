require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // The chat IS linked to a collection. Let's verify the collection has processed docs
  const collectionId = 'cmth7brx200006c3kxphf4j2s';
  const docs = await pool.query('SELECT id, title, status, "collectionId" FROM document WHERE "collectionId" = ', [collectionId]);
  console.log('Docs in chat collection:', JSON.stringify(docs.rows));
  // Check chunks for these docs
  if (docs.rows.length > 0) {
    const docIds = docs.rows.map(d => d.id);
    const chunks = await pool.query('SELECT COUNT(*) FROM document_chunk WHERE "documentId" = ANY()', [docIds]);
    console.log('Chunks for these docs:', chunks.rows[0].count);
  }
}
run().catch(console.error).finally(() => pool.end());
