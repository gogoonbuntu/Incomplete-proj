// Dynamic import to handle octokit ESM/CJS compatibility issues
let Octokit: any;

async function getOctokit() {
  if (!Octokit) {
    try {
      const module = await import("octokit");
      Octokit = module.Octokit;
    } catch (e) {
      // Fallback or re-throw
      throw new Error("Failed to load octokit module");
    }
  }
  return new Octokit({ 
    auth: process.env.GITHUB_TOKEN 
  });
}

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
      const octokit = await getOctokit();
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        visibility: "all",
        affiliation: "owner,collaborator"
      });
      
      return data.map((repo: any) => ({
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
      const octokit = await getOctokit();
      const { data } = await octokit.rest.repos.getReadme({
        owner,
        repo,
        mediaType: {
          format: "raw",
        },
      });
      return String(data);
    } catch (error) {
      return null;
    }
  },

  // NEW: Fetch file tree
  async fetchFileTree(owner: string, repo: string): Promise<string[]> {
    try {
      const octokit = await getOctokit();
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "",
      });
      
      if (Array.isArray(data)) {
        return data.map((file: any) => file.name);
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  // NEW: Fetch specific file content
  async fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const octokit = await getOctokit();
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        mediaType: {
          format: "raw",
        },
      });
      return String(data);
    } catch (error) {
      return null;
    }
  }
};
