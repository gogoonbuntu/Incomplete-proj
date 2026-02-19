import { db } from "../lib/firebase-admin";
import { Firestore } from "firebase-admin/firestore";

const firestore = db as Firestore;

export const recommendationEngine = {
  /**
   * Recommend projects to work on.
   * Strategy:
   * 1. Prioritize projects that haven't been summarized yet (newly imported).
   * 2. Then projects updated recently on GitHub but not locally.
   */
  getRecommendedProjects: async (limit: number = 5) => {
    try {
      // 1. Projects needing AI summary
      const unsummarizedSnapshot = await firestore
        .collection("projects")
        .where("lastSummaryUpdate", "==", null)
        .limit(limit)
        .get();

      if (!unsummarizedSnapshot.empty) {
        return unsummarizedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // 2. Recently active projects
      const recentSnapshot = await firestore
        .collection("projects")
        .orderBy("updated_at", "desc")
        .limit(limit)
        .get();

      return recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Recommendation error:", error);
      return [];
    }
  }
};
