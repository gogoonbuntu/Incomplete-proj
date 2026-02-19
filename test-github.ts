import dotenv from 'dotenv';
import path from 'path';
import { githubService } from './services/github-service';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGithub() {
  console.log('Testing GitHub API with ESM import...');
  
  try {
    const repos = await githubService.fetchUserRepositories();
    console.log(`Successfully fetched ${repos.length} repositories.`);
    
    if (repos && repos.length > 0) {
      repos.slice(0, 5).forEach(r => console.log(`- ${r.full_name || r.name}`));
    }
  } catch (error: any) {
    console.error('GitHub Fetch Error:', error.message);
  }
}

testGithub();
