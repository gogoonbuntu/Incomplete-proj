const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables before anything else
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded .env.local');
} else {
  console.log('.env.local not found at ' + envPath);
}

// Now import firebase
const { db } = require('./lib/firebase-admin');

async function checkDatabase() {
  if (!db) {
    console.error('Firestore not initialized');
    return;
  }
  
  try {
    const snapshot = await db.collection('projects').get();
    console.log(`\n[Firestore Status]`);
    console.log(`Total projects found: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('No projects found in database. You may need to run crawl first.');
      return;
    }

    let summaryCount = 0;
    const projects = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const hasSummary = !!data.enhancedDescription;
      if (hasSummary) summaryCount++;
      
      projects.push({
        id: doc.id,
        name: data.name,
        hasSummary
      });
    });

    // Print all projects found
    console.log('\nList of all projects:');
    projects.forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (ID: ${p.id}) - AI Summary: ${p.hasSummary ? '✅' : '❌'}`);
    });

    console.log(`\nSummary Progress: ${summaryCount} / ${snapshot.size} projects analyzed.`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase();
