import { PINECONE_NAMESPACE } from "../src/lib/pinecone-contract";
import { buildPineconeInsightRecords } from "../src/lib/pinecone-insight-records";

const apiKey = process.env.PINECONE_API_KEY;
const host = process.env.PINECONE_INDEX_HOST;
const replace = process.env.PINECONE_REPLACE === "true";

if (!apiKey || !host) {
  throw new Error("PINECONE_API_KEY and PINECONE_INDEX_HOST must be configured as environment variables.");
}

const encodedNamespace = encodeURIComponent(PINECONE_NAMESPACE);
const namespaceEndpoint = `https://${host}/namespaces/${encodedNamespace}`;
const recordsEndpoint = `https://${host}/records/namespaces/${encodedNamespace}`;
const headers = {
  "Api-Key": apiKey,
  "X-Pinecone-Api-Version": "2025-04",
};

if (replace) {
  const response = await fetch(namespaceEndpoint, { method: "DELETE", headers });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Pinecone namespace reset failed: ${response.status}`);
  }
}

const records = buildPineconeInsightRecords();
for (let start = 0; start < records.length; start += 96) {
  const batch = records.slice(start, start + 96);
  const response = await fetch(`${recordsEndpoint}/upsert`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-ndjson" },
    body: `${batch.map((record) => JSON.stringify(record)).join("\n")}\n`,
  });
  if (!response.ok) {
    throw new Error(
      `Pinecone upsert failed at batch ${start / 96 + 1}: ${response.status} ${await response.text()}`,
    );
  }
}

console.log(JSON.stringify({ namespace: PINECONE_NAMESPACE, records: records.length, replace }, null, 2));
