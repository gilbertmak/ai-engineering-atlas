import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { searchPineconeApprovedInsights } from "./pinecone-search.server";

export type { PineconeTalkMatch } from "@/lib/pinecone-contract";

export const searchApprovedInsights = createServerFn({ method: "POST" })
  .validator(z.object({ query: z.string().trim().min(3).max(200) }))
  .handler(({ data }) => searchPineconeApprovedInsights(data.query));
