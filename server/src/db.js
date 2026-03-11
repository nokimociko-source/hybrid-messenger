const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../catlover.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      about TEXT,
      status TEXT,
      avatar_frame TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        db.all('PRAGMA table_info(users)', (pragmaErr, columns) => {
            if (pragmaErr) return;
            const hasPasswordHash = Array.isArray(columns) && columns.some((c) => c && c.name === 'password_hash');
            if (!hasPasswordHash) {
                db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
            }
        });
    }
});

module.exports = db;
