// Firebase Cloud Function for crawling GitHub projects
const { onRequest } = require("firebase-functions/v2/https")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")

initializeApp()
const db = getFirestore()

exports.crawlProjects = onRequest(async (req, res) => {
  try {
    console.log("Starting project crawling...")

    // This would be implemented with the actual crawling logic
    // For now, we'll simulate the process

    const mockProjects = [
      {
        id: "example-1",
        title: "React Dashboard Template",
        description: "A modern React dashboard with TypeScript and Tailwind CSS",
        language: "TypeScript",
        stars: 15,
        forks: 3,
        lastUpdate: new Date().toISOString(),
        githubUrl: "https://github.com/example/react-dashboard",
        score: 8.5,
        // ... other fields
      },
      // Add more mock projects
    ]

    // Save projects to Firestore
    const batch = db.batch()

    mockProjects.forEach((project) => {
      const docRef = db.collection("projects").doc(project.id)
      batch.set(docRef, {
        ...project,
        updatedAt: new Date(),
      })
    })

    await batch.commit()

    console.log(`Successfully processed ${mockProjects.length} projects`)

    res.json({
      success: true,
      message: `Processed ${mockProjects.length} projects`,
      count: mockProjects.length,
    })
  } catch (error) {
    console.error("Crawling failed:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})
