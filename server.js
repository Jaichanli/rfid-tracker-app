const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { loadCSV } = require('./csvLoader');
const { Parser } = require('json2csv');
const http = require('http');
const socketIO = require('socket.io');

const app = express(); // ✅ Only declared once
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./db/tracker.db', (err) => {
  if (err) console.error('❌ DB Connection Error:', err.message);
  else console.log('✅ Connected to tracker.db');
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Role-based access control
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.user?.role === role) next();
    else res.status(403).json({ error: 'Access denied' });
  };
}

// ✅ Add new route to serve view.html
app.get("/view", (req, res) => {
  res.sendFile(path.join(__dirname, "public/html/view.html"));
});

// ✅ Add new API endpoint for RFID entries
app.get("/api/rfid-entries", (req, res) => {
  const sampleData = [
    { id: 1, tag: "ABC123", timestamp: new Date(), location: "Gate A" },
    { id: 2, tag: "XYZ789", timestamp: new Date(), location: "Gate B" },
  ];
  res.json(sampleData);
});

// 🔐 Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (user) {
      req.session.user = { username: user.username, role: user.role || 'operator' };
      res.json({ success: true, role: user.role });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// 📦 CSV Endpoints
['orders', 'machines', 'operators'].forEach(type => {
  app.get(`/api/${type}`, async (req, res) => {
    try {
      const data = await loadCSV(`${type}.csv`);
      res.json(data);
    } catch {
      res.status(500).send(`Error loading ${type}`);
    }
  });
});

// 📝 Entry Submission
app.post('/api/entry', (req, res) => {
  const {
    orderNo, itemName, operatorId, machineId,
    materialPicked, producedQty, wastedQty,
    wastageReason, status, enteredBy
  } = req.body;

  const query = `
    INSERT INTO production_data (
      order_no, item_name, operator_id, machine_id,
      material_picked, produced_qty, wasted_qty,
      wastage_reason, status, entered_by, entry_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;

  db.run(query, [
    orderNo, itemName, operatorId, machineId,
    materialPicked, producedQty, wastedQty,
    wastageReason, status, enteredBy
  ], function (err) {
    if (err) {
      console.error(err.message);
      res.json({ success: false, message: 'Failed to save entry' });
    } else {
      io.emit('new-entry', req.body); // Broadcast to clients
      res.json({ success: true, message: 'Entry saved successfully', id: this.lastID });
    }
  });
});

// 📊 Summary APIs
app.get('/api/summary/orders', (req, res) => {
  const summary = { received: [], produced: [], wasted: [] };
  const timeFrames = {
    daily: "date(entry_date) = date('now')",
    weekly: "entry_date >= date('now', '-7 days')",
    monthly: "entry_date >= date('now', 'start of month')",
    yearly: "entry_date >= date('now', 'start of year')"
  };

  const queries = Object.values(timeFrames).map(condition =>
    new Promise(resolve => {
      db.get(`
        SELECT 
          SUM(material_picked) AS received,
          SUM(produced_qty) AS produced,
          SUM(wasted_qty) AS wasted
        FROM production_data
        WHERE ${condition}
      `, (err, row) => {
        summary.received.push(row?.received || 0);
        summary.produced.push(row?.produced || 0);
        summary.wasted.push(row?.wasted || 0);
        resolve();
      });
    })
  );

  Promise.all(queries).then(() => res.json(summary));
});

app.get('/api/summary/operators', (req, res) => {
  db.all(`
    SELECT operator_id, SUM(produced_qty) AS total
    FROM production_data
    GROUP BY operator_id
  `, (err, rows) => {
    res.json({
      names: rows.map(r => r.operator_id),
      performance: rows.map(r => r.total)
    });
  });
});

app.get('/api/summary/machines', (req, res) => {
  db.all(`
    SELECT machine_id,
      SUM(produced_qty) * 100.0 / (SUM(produced_qty) + SUM(wasted_qty)) AS efficiency
    FROM production_data
    GROUP BY machine_id
  `, (err, rows) => {
    res.json({
      names: rows.map(r => r.machine_id),
      efficiency: rows.map(r => Math.round(r.efficiency || 0))
    });
  });
});

// 📈 Comparison API
app.get('/api/compare', (req, res) => {
  const date = req.query.date;
  const previousDate = `date('${date}', '-1 day')`;

  const query = d => `
    SELECT 
      SUM(material_picked) AS receivedQty,
      SUM(produced_qty) AS dispatchedQty
    FROM production_data
    WHERE date(entry_date) = ${d}
  `;

  Promise.all([
    new Promise(resolve => db.get(query(`date('${date}')`), (err, row) => resolve(row))),
    new Promise(resolve => db.get(query(previousDate), (err, row) => resolve(row)))
  ]).then(([current, previous]) => {
    res.json({
      receivedQty: current?.receivedQty || 0,
      dispatchedQty: current?.dispatchedQty || 0,
      previousReceived: previous?.receivedQty || 0,
      previousDispatched: previous?.dispatchedQty || 0
    });
  });
});

// 📤 Export CSV
app.get('/api/export', requireRole('admin'), (req, res) => {
  db.all(`SELECT * FROM production_data`, (err, rows) => {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('production_data.csv');
    res.send(csv);
  });
});

// 👤 User-specific entries
app.get('/api/my-entries', (req, res) => {
  const username = req.session.user?.username;
  db.all(`SELECT * FROM production_data WHERE entered_by = ?`, [username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🔮 Production Prediction
app.get('/api/predict/production', (req, res) => {
  db.all(`
    SELECT strftime('%Y-%m-%d', entry_date) AS date, SUM(produced_qty) AS qty
    FROM production_data
    GROUP BY date
    ORDER BY date ASC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const qtys = rows.map(r => r.qty);
    const n = qtys.length;
    const x = [...Array(n).keys()];
    const y = qtys;

    const avgX = x.reduce((a, b) => a + b, 0) / n;
    const avgY = y.reduce((a, b) => a + b, 0) / n;

    const slope = x.reduce((sum, xi, i) => sum + (xi - avgX) * (y[i] - avgY), 0) /
                  x.reduce((sum, xi) => sum + Math.pow(xi - avgX, 2), 0);

    const intercept = avgY - slope * avgX;

    const predictedQty = Math.round(slope * n + intercept); // Predict for next day (x = n)

    res.json({ predictedQty });
  });
});