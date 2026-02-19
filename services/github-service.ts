import { Octokit } from "octokit";

// Initialize Octokit with the auth token from environment variables
const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN 
});

export interface GithubRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
  readme_content?: string;
}

export const githubService = {
  // Fetch repositories for the authenticated user
  async fetchUserRepositories(): Promise<GithubRepo[]> {
    try {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        visibility: "all",
        affiliation: "owner,collaborator" // Fetch projects owned or collaborated on
      });
      
      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at || new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error);
      throw error;
    }
  },

  // Fetch README content for a specific repository
  async fetchReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const { data } = await octokit.rest.repos.getReadme({
        owner,
        repo,
        mediaType: {
          format: "raw", // Get raw content
        },
      });
      return String(data);
    } catch (error) {
      // README might not exist, which is fine
      return null;
    }
  }
};
