document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/rfid-entries")
    .then(response => response.json())
    .then(data => {
      const tableBody = document.getElementById("rfid-data");
      tableBody.innerHTML = "";

      data.forEach(entry => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${entry.id}</td>
          <td>${entry.tag}</td>
          <td>${new Date(entry.timestamp).toLocaleString()}</td>
          <td>${entry.location}</td>
        `;

        tableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Error fetching RFID data:", error);
    });
});