# Vercel Deployment Guide

This guide provides detailed instructions for deploying this Next.js application to Vercel, with special attention to handling Firebase service account keys and other environment variables.

## Prerequisites

- A Vercel account
- A Firebase project with Realtime Database enabled
- GitHub personal access token
- Google Gemini API key
- Google AdSense account (optional)

## Step 1: Prepare Your Firebase Service Account Key

The Firebase service account key is a JSON object that needs to be properly formatted for Vercel:

1. Go to your Firebase project settings
2. Navigate to "Service accounts"
3. Click "Generate new private key"
4. Save the JSON file
5. Convert the JSON to a string:
   - Open the JSON file
   - Copy all contents
   - **Important**: You need to convert this JSON to a string that can be stored as an environment variable
   - You can use this command to convert it (replace `path/to/serviceAccountKey.json` with your file path):

```bash
cat path/to/serviceAccountKey.json | jq -c
```

## Step 2: Set Up Vercel Project

1. Push your code to a GitHub repository
2. Log in to your Vercel account
3. Click "Add New" > "Project"
4. Select your GitHub repository
5. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next
   - Install Command: npm install

## Step 3: Configure Environment Variables

Add all required environment variables to your Vercel project:

1. In your project settings, go to "Environment Variables"
2. Add each variable from your `.env.local` file:

### GitHub API
```
GITHUB_TOKEN=your_github_personal_access_token
```

### Gemini AI API
```
GEMINI_API_KEY=your_gemini_api_key
```

### Firebase Configuration (Client-side)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### Firebase Admin Configuration (Server-side)
```
FIREBASE_SERVICE_ACCOUNT_KEY=your_stringified_service_account_key_json
FIREBASE_DATABASE_URL=your_firebase_database_url
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
```

### Google AdSense
```
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=your_adsense_client_id
```

## Step 4: Deploy

1. Click "Deploy"
2. Wait for the build and deployment to complete
3. Once deployed, Vercel will provide a URL to access your application

## Step 5: Verify Deployment

After deployment, verify that:

1. The application loads correctly
2. Authentication works
3. Project data is loading
4. Crawling functionality works
5. AdSense placeholders appear (actual ads will only show after Google approval)

## Troubleshooting

### Build Failures

If your build fails, check:

1. **Missing environment variables**: Ensure all required variables are set in Vercel
2. **Firebase service account key format**: Make sure it's properly stringified
3. **Build logs**: Review for specific errors

### Runtime Errors

If you encounter runtime errors:

1. **Firebase connection issues**: Check your Firebase rules and service account permissions
2. **API rate limiting**: GitHub API has rate limits; implement rate limiting strategies
3. **Missing data**: Verify your database is properly set up and accessible

### Firebase Service Account Key Issues

If you're having issues with the Firebase service account key:

1. Regenerate a new key from Firebase console
2. Make sure to properly stringify it (no newlines, proper escaping)
3. Set it as an environment variable in Vercel

## Security Best Practices

1. Use Vercel's environment variable encryption for sensitive data
2. Set appropriate Firebase security rules
3. Regularly rotate API keys and tokens
4. Monitor your application logs for unusual activity

## Updating Your Deployment

To update your deployment:

1. Push changes to your GitHub repository
2. Vercel will automatically rebuild and deploy
3. To change environment variables, update them in the Vercel project settings

## Custom Domains

To use a custom domain:

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your domain and follow the verification steps
