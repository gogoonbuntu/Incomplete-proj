import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/activity"],
      },
    ],
    sitemap: "https://incomplete-proj.vercel.app/sitemap.xml",
  }
}
