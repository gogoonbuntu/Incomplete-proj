import { NextRequest, NextResponse } from "next/server";
import { summaryGenerator } from "@/services/summary-generator";
import { adminAuth } from "@/lib/admin-service";

// Status tracking for the service
let isRunning = false;
let lastRun: string | null = null;
let processedToday = 0;
let lastResetDate = new Date().toDateString();
let status = "idle";

// Reset daily counters
function checkAndResetCounters() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    processedToday = 0;
    lastResetDate = today;
    console.log(`[Summary Updater] Counter reset for new day: ${today}`);
  }
}

// Single-run handler - process one project
async function processSingleProject() {
  if (isRunning) {
    return { success: false, message: "Process already running" };
  }

  try {
    isRunning = true;
    status = "processing";
    
    checkAndResetCounters();
    const result = await summaryGenerator.processSingleProject();
    
    if (result) {
      processedToday++;
    }
    
    lastRun = new Date().toISOString();
    isRunning = false;
    status = "idle";
    
    return { 
      success: true, 
      result, 
      message: result ? "Project processed successfully" : "No eligible projects found or API limit reached" 
    };
  } catch (error) {
    console.error("[Summary Updater] Error:", error);
    isRunning = false;
    status = "error";
    return { success: false, message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// GET handler - get service status
export async function GET(request: NextRequest) {
  // Check for admin authentication (disabled for development as per memory)
  // const adminUser = await adminAuth.verifyAdmin(request);
  // if (!adminUser.isAdmin) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  checkAndResetCounters();
  
  return NextResponse.json({
    isRunning,
    lastRun,
    processedToday,
    apiCallsToday: summaryGenerator.checkAndResetCounter(),
    status
  });
}

// POST handler - start or stop the service
export async function POST(request: NextRequest) {
  // Check for admin authentication (disabled for development as per memory)
  // const adminUser = await adminAuth.verifyAdmin(request);
  // if (!adminUser.isAdmin) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  
  try {
    const { action } = await request.json();

    if (action === "process") {
      const result = await processSingleProject();
      return NextResponse.json(result);
    } 
    else {
      return NextResponse.json(
        { error: "Invalid action", validActions: ["process"] }, 
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Summary Updater] API error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
