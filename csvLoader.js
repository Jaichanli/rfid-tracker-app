const fs = require('fs');
const csv = require('csv-parser');

/**
 * Loads and parses a CSV file into an array of objects.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<Array<Object>>} Parsed CSV data.
 */
function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`✅ Successfully loaded ${results.length} rows from ${filePath}`);
        resolve(results);
      })
      .on('error', (err) => {
        console.error(`❌ Failed to load CSV from ${filePath}:`, err.message);
        reject(err);
      });
  });
}

module.exports = { loadCSV };