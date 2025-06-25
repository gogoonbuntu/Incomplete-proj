#!/usr/bin/env node

/**
 * This script helps prepare environment variables for Vercel deployment,
 * particularly focusing on the Firebase service account key which needs
 * to be properly formatted as a string.
 * 
 * Usage:
 * 1. Save your Firebase service account key JSON file
 * 2. Run: node scripts/prepare-vercel-env.js path/to/serviceAccountKey.json
 * 3. Copy the output and use it as your FIREBASE_SERVICE_ACCOUNT_KEY in Vercel
 */

const fs = require('fs');
const path = require('path');

// Get the file path from command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Please provide the path to your Firebase service account key JSON file');
  console.error('Usage: node prepare-vercel-env.js path/to/serviceAccountKey.json');
  process.exit(1);
}

const filePath = args[0];

try {
  // Read the file
  const fileContent = fs.readFileSync(path.resolve(filePath), 'utf8');
  
  // Parse the JSON to ensure it's valid
  const jsonContent = JSON.parse(fileContent);
  
  // Stringify it properly for use as an environment variable
  const stringifiedContent = JSON.stringify(jsonContent);
  
  console.log('\n=== Firebase Service Account Key for Vercel ===\n');
  console.log(stringifiedContent);
  console.log('\n=== Copy the above string and use it as your FIREBASE_SERVICE_ACCOUNT_KEY in Vercel ===\n');
  
  // Also create a .env.vercel file as a template
  const envTemplate = `# GitHub API
GITHUB_TOKEN=your_github_personal_access_token

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key

# Firebase Configuration (Public - Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'your_firebase_api_key'}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your_firebase_auth_domain'}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your_firebase_project_id'}
NEXT_PUBLIC_FIREBASE_DATABASE_URL=${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'your_firebase_database_url'}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your_firebase_messaging_sender_id'}
NEXT_PUBLIC_FIREBASE_APP_ID=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'your_firebase_app_id'}

# Firebase Admin Configuration (Server-side only - keep these private)
# Replace with the output from this script
FIREBASE_SERVICE_ACCOUNT_KEY=paste_the_output_from_this_script_here
FIREBASE_DATABASE_URL=${process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'your_firebase_database_url'}
FIREBASE_STORAGE_BUCKET=${process.env.FIREBASE_STORAGE_BUCKET || 'your_firebase_storage_bucket'}

# Google AdSense
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || 'your_google_adsense_client_id'}
`;

  fs.writeFileSync(path.resolve('.env.vercel'), envTemplate, 'utf8');
  console.log('Created .env.vercel template file for Vercel environment variables');
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${filePath}`);
  } else if (error instanceof SyntaxError) {
    console.error('Invalid JSON format in the service account key file');
  } else {
    console.error('Error processing the file:', error.message);
  }
  process.exit(1);
}
