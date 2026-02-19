/**
 * Integrated Updater Script
 * 1. Crawls new repositories from GitHub
 * 2. Generates AI summaries for projects that need updates
 * 
 * Runs continuously with a defined interval.
 */

const http = require('http');
const https = require('https');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
  console.log('Loaded environment variables from .env.local');
} catch (err) {
  console.log('Could not load dotenv, continuing with existing environment variables');
}

const PORT = process.env.PORT || 3721;
const BASE_URL = `http://localhost:${PORT}`;
const CRAWL_ENDPOINT = `${BASE_URL}/api/crawl`;
const SUMMARY_ENDPOINT = `${BASE_URL}/api/admin/summary-updater`;

const INTERVAL = 10 * 60 * 1000; // 10 minutes interval
let active = true;

async function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          resolve({ error: 'Failed to parse JSON', raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runIntegratedUpdate() {
  if (!active) return;

  console.log(`
[${new Date().toLocaleString()}] Starting integrated update cycle...`);

  try {
    // Step 1: Crawl new projects
    console.log('[Step 1/2] Crawling GitHub for new projects...');
    const crawlResult = await makeRequest(CRAWL_ENDPOINT, { method: 'GET' });
    console.log('[Step 1/2] Crawl Result:', crawlResult.message || crawlResult);

    // Step 2: Update AI Summaries (Process multiple projects)
    console.log('[Step 2/2] Updating AI summaries...');
    let updatedCount = 0;
    const MAX_SUMMARIES_PER_CYCLE = 10; // Updated to 10 projects per cycle

    for (let i = 0; i < MAX_SUMMARIES_PER_CYCLE; i++) {
      const summaryResult = await makeRequest(SUMMARY_ENDPOINT, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { action: 'process' });
      
      if (summaryResult.updated) {
        updatedCount++;
        console.log(`[Step 2/2] Updated project: ${summaryResult.projectName}`);
      } else {
        console.log(`[Step 2/2] No more projects to update or limit reached.`);
        break;
      }
      
      // Small delay between AI calls to be safe
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`[Step 2/2] Cycle complete. Updated ${updatedCount} summaries.`);

  } catch (err) {
    console.error(`[Error] Update cycle failed: ${err.message}`);
  }

  if (active) {
    console.log(`[Scheduler] Next cycle in ${INTERVAL / (60 * 1000)} minute(s)...`);
    setTimeout(runIntegratedUpdate, INTERVAL);
  }
}

// Handle termination
process.on('SIGINT', () => {
  console.log('Stopping integrated updater...');
  active = false;
  setTimeout(() => process.exit(0), 1000);
});

console.log('Integrated Updater Service Started');
runIntegratedUpdate();
