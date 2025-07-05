// Script to periodically update project summaries using Gemini API
// This script should be run with a cron job or a process manager like PM2

const https = require('https');
let active = true;
const DEFAULT_INTERVAL = 30 * 60 * 1000; // 30 minutes between updates
const API_ENDPOINT = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/admin/summary-updater` 
  : 'http://localhost:3721/api/admin/summary-updater';

// Load environment variables if not in production
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
    console.log('Loaded environment variables from .env.local');
  } catch (err) {
    console.log('Could not load dotenv, continuing with existing environment variables');
  }
}

console.log(`[Summary Updater] Starting scheduler with API endpoint: ${API_ENDPOINT}`);
console.log(`[Summary Updater] Default interval: ${DEFAULT_INTERVAL / 60000} minutes`);

// Function to process a single project
async function processSingleProject() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(API_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`[Summary Updater] API response:`, result);
          resolve(result);
        } catch (err) {
          console.error(`[Summary Updater] Error parsing response: ${err.message}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[Summary Updater] Request error: ${err.message}`);
      reject(err);
    });

    req.write(JSON.stringify({ action: 'process' }));
    req.end();
  });
}

// Function to get service status
async function getStatus() {
  return new Promise((resolve, reject) => {
    const req = https.get(API_ENDPOINT, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (err) {
          console.error(`[Summary Updater] Error parsing status response: ${err.message}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[Summary Updater] Status request error: ${err.message}`);
      reject(err);
    });

    req.end();
  });
}

// Main process function
async function processLoop() {
  try {
    // Check status first
    const status = await getStatus();
    console.log(`[Summary Updater] Current status:`, status);

    // If we've already processed 5+ projects today, slow down to once per hour
    const interval = status.processedToday >= 5 ? 60 * 60 * 1000 : DEFAULT_INTERVAL;

    if (active) {
      console.log(`[Summary Updater] Processing next project...`);
      const result = await processSingleProject();
      
      // Schedule next run
      console.log(`[Summary Updater] Next run scheduled in ${interval / 60000} minutes`);
      setTimeout(processLoop, interval);
    } else {
      console.log('[Summary Updater] Service stopped');
    }
  } catch (err) {
    console.error(`[Summary Updater] Process loop error: ${err.message}`);
    console.log(`[Summary Updater] Retrying in ${DEFAULT_INTERVAL / 60000} minutes`);
    setTimeout(processLoop, DEFAULT_INTERVAL);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('[Summary Updater] Service stopping...');
  active = false;
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start the process loop
console.log('[Summary Updater] Service started');
processLoop();
