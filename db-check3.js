require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // Check chat table columns
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='chat'");
  console.log('Chat columns:', cols.rows.map(r => r.column_name));
  // Check all tables with "knowledge" in name
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  console.log('All tables:', tables.rows.map(r => r.tablename));
}
run().catch(console.error).finally(() => pool.end());
