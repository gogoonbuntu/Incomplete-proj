#!/usr/bin/env node

/**
 * This script verifies that all required environment variables are present
 * and properly formatted before deployment.
 * 
 * Usage:
 * node scripts/verify-env.js
 */

require('dotenv').config({ path: '.env.local' });

const chalk = require('chalk') || { green: (t) => t, yellow: (t) => t, red: (t) => t };

console.log(chalk.green('Verifying environment variables for deployment...\n'));

const requiredVars = {
  // GitHub API
  'GITHUB_TOKEN': {
    description: 'GitHub Personal Access Token',
    format: 'Should start with "ghp_", "gho_", or similar prefix',
    required: true
  },
  
  // Gemini AI API
  'GEMINI_API_KEY': {
    description: 'Google Gemini API Key',
    format: 'Alphanumeric string',
    required: true
  },
  
  // Firebase Configuration (Public - Client-side)
  'NEXT_PUBLIC_FIREBASE_API_KEY': {
    description: 'Firebase API Key',
    format: 'Alphanumeric string',
    required: true
  },
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': {
    description: 'Firebase Auth Domain',
    format: 'Usually ends with .firebaseapp.com',
    required: true
  },
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': {
    description: 'Firebase Project ID',
    format: 'Alphanumeric string with hyphens',
    required: true
  },
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL': {
    description: 'Firebase Database URL',
    format: 'URL ending with .firebasedatabase.app/',
    required: true
  },
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': {
    description: 'Firebase Messaging Sender ID',
    format: 'Numeric string',
    required: true
  },
  'NEXT_PUBLIC_FIREBASE_APP_ID': {
    description: 'Firebase App ID',
    format: 'Format: 1:123456789012:web:abcdef1234567890',
    required: true
  },
  
  // Firebase Admin Configuration (Server-side only)
  'FIREBASE_SERVICE_ACCOUNT_KEY': {
    description: 'Firebase Service Account Key (JSON string)',
    format: 'Stringified JSON object',
    required: false, // Made optional for Vercel deployment
    validator: (value) => {
      if (!value) return { valid: true, warning: 'Missing, but will be handled gracefully in production' };
      if (value === 'your-service-account-key-here') {
        return { valid: true, warning: 'Using placeholder value. This will need to be replaced in Vercel deployment.' };
      }
      try {
        const parsed = JSON.parse(value);
        if (!parsed.project_id || !parsed.private_key) {
          return { valid: false, error: 'JSON parsed but missing required fields (project_id, private_key)' };
        }
        return { valid: true };
      } catch (e) {
        return { valid: false, error: 'Not a valid JSON string' };
      }
    }
  },
  'FIREBASE_DATABASE_URL': {
    description: 'Firebase Database URL (server-side)',
    format: 'URL ending with .firebasedatabase.app/',
    required: false, // Made optional as we can fall back to NEXT_PUBLIC_FIREBASE_DATABASE_URL
    validator: (value) => {
      if (!value && process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
        return { valid: true, warning: 'Using NEXT_PUBLIC_FIREBASE_DATABASE_URL as fallback' };
      }
      return { valid: !!value };
    }
  },
  'FIREBASE_STORAGE_BUCKET': {
    description: 'Firebase Storage Bucket',
    format: 'Usually [PROJECT_ID].appspot.com',
    required: false
  },
  
  // Google AdSense
  'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT': {
    description: 'Google AdSense Client ID',
    format: 'Format: ca-pub-XXXXXXXXXXXXXXXX',
    required: false, // Made optional as we handle missing values gracefully
    validator: (value) => {
      if (!value) return { valid: true, warning: 'Missing, but will be handled gracefully' };
      if (!value.startsWith('ca-pub-')) {
        return { valid: false, error: 'Should start with "ca-pub-"' };
      }
      return { valid: true };
    }
  }
};

let hasErrors = false;
let hasWarnings = false;

Object.entries(requiredVars).forEach(([key, config]) => {
  const value = process.env[key];
  console.log(`Checking ${chalk.yellow(key)}:`);
  
  if (!value) {
    if (config.required) {
      console.log(`  ${chalk.red('✖')} Missing required variable`);
      console.log(`  Description: ${config.description}`);
      console.log(`  Expected format: ${config.format}`);
      hasErrors = true;
    } else {
      console.log(`  ${chalk.yellow('⚠')} Missing optional variable`);
      console.log(`  Description: ${config.description}`);
      hasWarnings = true;
    }
  } else {
    if (config.validator) {
      const result = config.validator(value);
      if (!result.valid) {
        console.log(`  ${chalk.red('✖')} Invalid format: ${result.error}`);
        console.log(`  Expected format: ${config.format}`);
        hasErrors = true;
      } else if (result.warning) {
        console.log(`  ${chalk.yellow('⚠')} ${result.warning}`);
        hasWarnings = true;
      } else {
        console.log(`  ${chalk.green('✓')} Valid`);
      }
    } else {
      console.log(`  ${chalk.green('✓')} Present`);
    }
  }
  console.log('');
});

if (hasErrors) {
  console.log(chalk.red('❌ Verification failed. Please fix the errors above before deploying.'));
  process.exit(1);
} else if (hasWarnings) {
  console.log(chalk.yellow('⚠️ Verification completed with warnings. Your app may not function fully without these variables.'));
  process.exit(0);
} else {
  console.log(chalk.green('✅ All environment variables verified successfully!'));
  process.exit(0);
}
