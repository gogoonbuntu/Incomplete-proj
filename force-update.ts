const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { summaryGenerator } = require('./services/summary-generator');
const { db } = require('./lib/firebase-admin');

async function forceUpdateAndVerify() {
  console.log('1. Force resetting all project status...');
  await summaryGenerator.resetAllProjectsUpdateStatus();
  
  console.log('\n2. Starting immediate analysis for 10 projects...');
  let successCount = 0;
  
  for (let i = 0; i < 10; i++) {
    try {
      const result = await summaryGenerator.processSingleProject();
      if (result && result.updated) {
        successCount++;
        console.log(`✅ [${i+1}/10] Success: ${result.projectName}`);
        
        if (i === 0) {
          const doc = await db.collection('projects').doc(result.projectId).get();
          console.log('\n--- Content Preview for the first project ---');
          console.log(doc.data().enhancedDescription);
          console.log('-------------------------------------------\n');
        }
      } else {
        console.log(`❌ [${i+1}/10] Failed`);
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nVerification Complete: ${successCount} projects updated.`);
}

forceUpdateAndVerify();
