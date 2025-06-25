# Incomplete Projects Discovery

A Next.js application for discovering and continuing development on unfinished GitHub projects.

## Project Overview

This application helps developers find unfinished GitHub projects that they can contribute to or fork for their own use. It uses Firebase for backend services, GitHub API for repository data, and Google Gemini API for AI analysis.

## Features

- Browse unfinished GitHub projects
- Filter and sort projects by various criteria
- Trigger crawling to fetch new projects
- Bookmark interesting projects
- User authentication via Firebase
- AI analysis of project potential

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with the required environment variables (see below)
4. Run the development server:
   ```
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

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
FIREBASE_SERVICE_ACCOUNT_KEY=your_service_account_key_json
FIREBASE_DATABASE_URL=your_firebase_database_url
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
```

### Google AdSense
```
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=your_adsense_client_id
```

## Deploying to Vercel

### Prerequisites

1. A Vercel account
2. A Firebase project with Realtime Database enabled
3. GitHub personal access token
4. Google Gemini API key
5. Google AdSense account (optional)

### Deployment Steps

1. Push your code to a GitHub repository
2. Import the repository in Vercel
3. Configure the environment variables in Vercel's project settings
4. Deploy the project

### Important Notes for Vercel Deployment

1. **Firebase Service Account Key**: This should be a JSON string containing your Firebase service account credentials. In Vercel, you need to add this as an environment variable. Make sure to stringify the JSON object before adding it.

2. **Build Settings**: The project is already configured with the necessary build settings in `vercel.json`. No additional configuration is needed.

3. **Environment Variables**: All environment variables from your local `.env.local` file need to be added to Vercel's environment variables section in the project settings.

4. **Security**: Ensure that your Firebase security rules are properly configured to protect your data.

## Troubleshooting

### Common Issues

1. **Firebase Authentication Issues**: Ensure that the authentication methods you want to use are enabled in the Firebase console.

2. **API Rate Limiting**: The GitHub API has rate limits. If you encounter rate limiting issues, consider implementing a more robust rate limiting strategy.

3. **Missing Environment Variables**: If you encounter errors related to missing configuration, check that all required environment variables are set.

4. **AdSense Not Loading**: Google AdSense requires approval before ads will display. During development, placeholder ads will be shown.

## License

[MIT](LICENSE)
