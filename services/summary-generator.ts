import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, storage } from "@/lib/firebase-admin";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "@/services/logger";

// Initialize Gemini API with key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Initialize counters to track API usage
let apiCallsToday = 0;
let lastResetDate = new Date().toDateString();

interface ProjectData {
  id: string;
  name: string;
  description: string;
  language: string;
  readme?: string;
  lastSummaryUpdate?: string;
  primaryFiles?: string[];
}

export const summaryGenerator = {
  // Reset API call counter if it's a new day
  checkAndResetCounter: () => {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      apiCallsToday = 0;
      lastResetDate = today;
      console.log(`[Summary Generator] API call counter reset for new day: ${today}`);
    }
    return apiCallsToday;
  },

  // Check if we've hit API limits
  canMakeApiCall: (maxCallsPerDay = 50) => {
    summaryGenerator.checkAndResetCounter();
    return apiCallsToday < maxCallsPerDay;
  },

  // Get the next project that needs a summary update
  getNextProjectForUpdate: async (): Promise<ProjectData | null> => {
    try {
      // Get projects sorted by lastSummaryUpdate (oldest first or null first)
      const snapshot = await db
        .collection("projects")
        .orderBy("lastSummaryUpdate", "asc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log("[Summary Generator] No projects found for update");
        return null;
      }

      const projectData = snapshot.docs[0].data() as ProjectData;
      projectData.id = snapshot.docs[0].id;

      // If the project was updated in the last 7 days, skip it
      if (projectData.lastSummaryUpdate) {
        const lastUpdate = new Date(projectData.lastSummaryUpdate);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          logger.logSummaryUpdate(`Project ${projectData.name} was updated recently (${daysSinceUpdate.toFixed(1)} days ago) - skipping`);
          return null;
        }
      }

      return projectData;
    } catch (error) {
      console.error("[Summary Generator] Error getting next project:", error);
      return null;
    }
  },

  // Analyze README content and generate summary
  analyzeSummary: async (projectData: ProjectData): Promise<string | null> => {
    if (!summaryGenerator.canMakeApiCall()) {
      console.log("[Summary Generator] API call limit reached for today");
      return null;
    }

    try {
      apiCallsToday++;
      
      // Create prompt for Gemini API
      const prompt = `
      I need a comprehensive summary for a GitHub project with the following details:
      
      Project Name: ${projectData.name}
      Current Description: ${projectData.description || "No description available"}
      Primary Language: ${projectData.language || "Unknown"}
      
      ${projectData.readme ? `README Content: ${projectData.readme.substring(0, 4000)}...` : "No README available"}
      
      Please create:
      1. A concise one-paragraph summary (max 2-3 sentences) that explains what this project does
      2. A bullet list of 3-5 main features or purposes of this project
      3. A technical overview paragraph highlighting the frameworks, languages, or libraries used
      
      Make sure the summary is in English, professional in tone, and accurately represents the project.
      If the README is not in English, please analyze it and create an English summary.
      
      Format the response as:
      
      SUMMARY: [One-paragraph summary]
      
      FEATURES:
      - [Feature 1]
      - [Feature 2]
      - [Feature 3]
      
      TECHNICAL: [Technical overview paragraph]
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      logger.logSummaryUpdate(`Successfully generated summary for ${projectData.name}`);
      return text;
    } catch (error) {
      console.error("[Summary Generator] Error generating summary:", error);
      return null;
    }
  },

  // Update project with new summary in Firebase
  updateProjectSummary: async (projectId: string, summary: string): Promise<boolean> => {
    try {
      await db.collection("projects").doc(projectId).update({
        enhancedDescription: summary,
        lastSummaryUpdate: new Date().toISOString(),
      });
      
      logger.logSummaryUpdate(`Updated summary for project ${projectId}`);
      return true;
    } catch (error) {
      console.error("[Summary Generator] Error updating project summary:", error);
      return false;
    }
  },

  // Process a single project
  processSingleProject: async (): Promise<boolean> => {
    const project = await summaryGenerator.getNextProjectForUpdate();
    
    if (!project) {
      console.log("[Summary Generator] No projects available for processing");
      return false;
    }

    logger.logSummaryUpdate(`Processing project: ${project.name}`);
    const summary = await summaryGenerator.analyzeSummary(project);
    
    if (summary) {
      return await summaryGenerator.updateProjectSummary(project.id, summary);
    }
    
    return false;
  }
};
