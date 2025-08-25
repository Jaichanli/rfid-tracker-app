const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Parses a CSV file and logs the results in a table.
 * @param {string} fileName - Name of the CSV file inside the /data folder.
 */
function parseCSV(fileName) {
  const filePath = path.join(__dirname, 'data', fileName);
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log(`✅ Parsed ${results.length} rows from ${fileName}`);
      console.table(results);
    })
    .on('error', (err) => {
      console.error(`❌ Error reading ${fileName}:`, err.message);
    });
}

// Run parser if this file is executed directly
if (require.main === module) {
  parseCSV('orders.csv');
}

// Export for use in other modules
module.exports = { parseCSV };