require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // Check the actual join table
  const links = await pool.query('SELECT * FROM "_ChatKnowledge" LIMIT 10');
  console.log('Chat-Collection links:', JSON.stringify(links.rows));
  // Check if any chat has a linked collection
  const chats = await pool.query('SELECT id, title FROM chat ORDER BY "createdAt" DESC LIMIT 5');
  console.log('Recent chats:', JSON.stringify(chats.rows));
}
run().catch(console.error).finally(() => pool.end());
