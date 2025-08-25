const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Connect to the database
const db = new sqlite3.Database('./db/tracker.db');

// Create tables and seed users
db.serialize(() => {
  // Create Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Create Entries table
  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNo TEXT,
    itemName TEXT,
    machineId TEXT,
    operatorId TEXT,
    materialPicked INTEGER,
    produced INTEGER,
    wasted INTEGER,
    wastageReason TEXT,
    status TEXT,
    enteredBy TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed users from SQL file
  const sql = fs.readFileSync('./db/init_users.sql', 'utf8');
  db.exec(sql, (err) => {
    if (err) {
      console.error('❌ Error seeding users:', err.message);
    } else {
      console.log('✅ Users table created and sample users added');
    }
  });
});

// Close the database connection
db.close();