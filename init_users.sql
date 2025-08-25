CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL -- e.g., 'admin', 'operator', 'viewer'
);
INSERT INTO users (username, password, role) VALUES
('jai', 'rfid123', 'admin'),
('operator1', 'op123', 'operator'),
('viewer1', 'view123', 'viewer');
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'operator'
);
INSERT INTO users (username, password, role) VALUES ('jai', 'rfid123', 'admin');
INSERT INTO users (username, password, role) VALUES ('ravi', 'rfid456', 'operator');