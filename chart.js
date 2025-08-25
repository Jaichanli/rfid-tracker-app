// Sample data — replace with dynamic fetch later
const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const data = [12, 19, 3, 5, 2, 3, 9];

const entryCtx = document.getElementById('entryChart')?.getContext('2d');
let entryChart;

if (entryCtx) {
  entryChart = new Chart(entryCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Entries per Day',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: 'Weekly RFID Entry Stats',
          font: { size: 18 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 5 }
        }
      }
    }
  });
}

const socket = io();
socket.on('new-entry', (entry) => {
  data.push(entry.count);
  labels.push(entry.day);
  entryChart?.update();
});

let roleChart;
async function loadUserRolesChart(type = 'pie') {
  const res = await fetch('/api/user-roles');
  const data = await res.json();

  const labels = data.map(r => r.role);
  const counts = data.map(r => r.count);

  const ctx = document.getElementById('roleChart')?.getContext('2d');
  if (!ctx) return;

  if (roleChart) roleChart.destroy();

  roleChart = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: 'User Roles',
        data: counts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'User Role Distribution',
          font: { size: 18 }
        },
        legend: { position: 'bottom' }
      },
      scales: type === 'bar' ? {
        y: { beginAtZero: true }
      } : {}
    }
  });
}

document.getElementById('chartToggle')?.addEventListener('change', (e) => {
  const chartType = e.target.checked ? 'bar' : 'pie';
  loadUserRolesChart(chartType);
});

loadUserRolesChart(); // Default to pie

let loginChart;
async function loadLoginActivityChart() {
  const start = document.getElementById('startDate')?.value;
  const end = document.getElementById('endDate')?.value;

  let url = '/api/login-activity';
  if (start && end) {
    url += `?start=${start}&end=${end}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  const labels = data.map(d => d.date);
  const counts = data.map(d => d.count);

  const ctx = document.getElementById('loginChart')?.getContext('2d');
  if (!ctx) return;

  if (loginChart) loginChart.destroy();

  loginChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Logins per Day',
        data: counts,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Filtered Login Activity',
          font: { size: 18 }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

loadLoginActivityChart();

// Auto-refresh login chart every 60 seconds
setInterval(() => {
  loadLoginActivityChart();
}, 60000);

// Chart Export (PNG)
function exportChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${canvasId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// CSV Export Utility
function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map(row => Object.values(row).join(',')).join('\n');
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Export Login Activity CSV
async function exportLoginCSV() {
  const start = document.getElementById('startDate')?.value;
  const end = document.getElementById('endDate')?.value;

  let url = '/api/login-activity';
  if (start && end) url += `?start=${start}&end=${end}`;

  const res = await fetch(url);
  const data = await res.json();

  downloadCSV('login_activity.csv', data);
}

// Export User Roles CSV
async function exportRoleCSV() {
  const res = await fetch('/api/user-roles');
  const data = await res.json();

  downloadCSV('user_roles.csv', data);
}