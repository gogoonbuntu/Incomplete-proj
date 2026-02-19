import { NextResponse } from "next/server";
import { githubService } from "../../../services/github-service";
import { db } from "../../../lib/firebase-admin";
import { Firestore } from "firebase-admin/firestore";

export const runtime = 'nodejs';

// Prevent vercel timeout
export const maxDuration = 300; 

export async function GET() {
  try {
    console.log("Crawl started: fetching repositories from GitHub...");
    const repos = await githubService.fetchUserRepositories();
    console.log(`Fetched ${repos.length} repositories from GitHub.`);

    const firestore = db as Firestore;
    const batch = firestore.batch();
    
    let count = 0;
    const BATCH_SIZE = 400; // Firestore batch limit is 500

    if (repos.length === 0) {
      console.warn("No repositories found to sync.");
    }

    for (const repo of repos) {
      const docRef = firestore.collection("projects").doc(String(repo.id));
      batch.set(docRef, {
        id: String(repo.id),
        name: repo.name,
        description: repo.description,
        language: repo.language,
        html_url: repo.html_url,
        stars: repo.stargazers_count,
        updated_at: repo.updated_at,
        lastSyncedAt: new Date().toISOString()
      }, { merge: true });
      
      count++;
      if (count >= BATCH_SIZE) break; // Limit for safety in this iteration
    }

    await batch.commit();
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${count} repositories from GitHub.`,
      count 
    });
  } catch (error: any) {
    console.error("Crawling failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
