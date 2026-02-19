const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import services
const { summaryGenerator } = require('./services/summary-generator');
const { db } = require('./lib/firebase-admin');

async function runImmediateAnalysis() {
  console.log('--- Immediate Analysis Start (10 Projects) ---');
  
  let successCount = 0;
  for (let i = 0; i < 10; i++) {
    console.log(`
[Project ${i+1}/10] Attempting to process...`);
    try {
      // processSingleProject will find the next project that needs update and update it
      const result = await summaryGenerator.processSingleProject();
      
      if (result && result.updated) {
        successCount++;
        console.log(`✅ Success: Updated ${result.projectName}`);
        
        // Fetch and show a preview of the content
        const doc = await db.collection('projects').doc(result.projectId).get();
        const data = doc.data();
        console.log(`   Preview: ${data.enhancedDescription.substring(0, 150)}...`);
      } else {
        console.log(`❌ Skipped or Failed: ${result?.projectName || 'Unknown'}`);
      }
    } catch (err) {
      console.error(`Error processing project: ${err.message}`);
    }
    
    // Safety delay
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`
--- Completed: ${successCount} projects updated ---`);
}

runImmediateAnalysis();
