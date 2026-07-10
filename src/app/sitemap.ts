import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://hbcpaysdebroons.fr";
  return [
    {
      url: `${base}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/licence`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/matchs`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
