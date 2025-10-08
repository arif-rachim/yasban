const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Path to runtime database
const dbPath = path.join(process.env.APPDATA || '', 'yasban', 'yasban.db');

// Path to migration SQL
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20251008045729_init', 'migration.sql');

console.log('Runtime database path:', dbPath);
console.log('Migration file:', migrationPath);

// Ensure the yasban directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Open database
const db = new Database(dbPath);

// Read migration SQL
const sql = fs.readFileSync(migrationPath, 'utf8');

// Execute migration
try {
  db.exec(sql);
  console.log('✓ Migration applied successfully!');

  // Verify tables were created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('✓ Tables created:', tables.map(t => t.name).join(', '));
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
