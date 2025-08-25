// 📦 Utility: Fetch data from an endpoint
async function fetchData(endpoint) {
  const res = await fetch(endpoint);
  return res.json();
}

// 📊 Chart Renderers
function renderOrdersChart(data) {
  const ctx = document.getElementById('ordersChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
      datasets: [
        {
          label: 'Received',
          data: data.received,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        },
        {
          label: 'Produced',
          data: data.produced,
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        },
        {
          label: 'Wasted',
          data: data.wasted,
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Orders Overview'
        }
      }
    }
  });
}

function renderOperatorChart(data) {
  const ctx = document.getElementById('operatorChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.names,
      datasets: [{
        label: 'Units Produced',
        data: data.performance,
        backgroundColor: 'rgba(153, 102, 255, 0.6)'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Operator Performance'
        }
      }
    }
  });
}

function renderMachineChart(data) {
  const ctx = document.getElementById('machineChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.names,
      datasets: [{
        label: 'Efficiency (%)',
        data: data.efficiency,
        backgroundColor: 'rgba(255, 206, 86, 0.6)'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Machine Efficiency'
        }
      }
    }
  });
}

// 📈 Load Dashboard Charts
async function loadDashboard() {
  const [orders, operators, machines] = await Promise.all([
    fetchData('/api/summary/orders'),
    fetchData('/api/summary/operators'),
    fetchData('/api/summary/machines')
  ]);

  renderOrdersChart(orders);
  renderOperatorChart(operators);
  renderMachineChart(machines);
}

// 🔍 Load Comparison Data
async function loadComparison() {
  const date = document.getElementById('compareDate').value;
  if (!date) return;

  const data = await fetchData(`/api/compare?date=${date}`);
  const { receivedQty, dispatchedQty, previousReceived, previousDispatched } = data;

  const receivedDiff = ((receivedQty - previousReceived) / previousReceived * 100).toFixed(2);
  const dispatchedDiff = ((dispatchedQty - previousDispatched) / previousDispatched * 100).toFixed(2);

  document.getElementById('comparisonResult').innerHTML = `
    <h3>📅 Comparison for ${date}</h3>
    <p>Received Qty: ${receivedQty} (${receivedDiff}% vs previous)</p>
    <p>Dispatched Qty: ${dispatchedQty} (${dispatchedDiff}% vs previous)</p>
  `;
}

// 📤 Export Data
function exportData() {
  window.location.href = '/api/export';
}

// 🔮 Load Prediction
async function loadPrediction() {
  const res = await fetch('/api/predict/production');
  const { predictedQty } = await res.json();
  document.getElementById('predictionBox').innerText = `📈 Tomorrow's Forecast: ${predictedQty} units`;
}

// 🧹 Delete Modal Logic
let userToDelete = null;

function showDeleteModal(id) {
  userToDelete = id;
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (userToDelete !== null) {
    await fetch(`/api/users/${userToDelete}`, { method: 'DELETE' });
    userToDelete = null;
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();
    loadUsers(); // Assuming this function exists elsewhere
  }
});

// 🔁 Real-time Updates via Socket
const socket = io();

socket.on('new-entry', (entry) => {
  console.log('📡 New entry received:', entry);
  loadDashboard(); // Refresh charts
});

// 🚀 Initial Load + Auto Refresh
loadDashboard();
setInterval(loadDashboard, 60000); // Refresh every 60 seconds
async function loadUsers() {
  const res = await fetch('/api/users');
  const users = await res.json();
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  users.forEach(user => {
    const row = `<tr>
      <td>${user.name}</td>
      <td>${user.role}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${user.id}')">Delete</button>
      </td>
    </tr>`;
    tbody.innerHTML += row;
  });
}
