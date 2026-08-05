import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { siteUrl } from "@/lib/site";

const AtlasDashboard = import.meta.env.SSR
  ? () => null
  : lazy(() => import("@/components/atlas-dashboard").then((module) => ({ default: module.AtlasDashboard })));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/") },
      { property: "og:image", content: siteUrl("/hero-themes-v2.webp") },
      { name: "twitter:image", content: siteUrl("/hero-themes-v2.webp") },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${siteUrl("/")}#website`,
          url: siteUrl("/"),
          name: "AI Engineering Insight Atlas",
          description: "Explore practical industry insights across nine engineering domains.",
          inLanguage: "en",
        },
      },
    ],
    links: [
      { rel: "canonical", href: siteUrl("/") },
      { rel: "preload", href: "/hero-themes-v2.webp", as: "image", fetchPriority: "high" },
    ],
  }),
  component: AtlasDashboard,
});
