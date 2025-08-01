import { Client } from "@elastic/elasticsearch";

// Create Elasticsearch client instance
export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  // Authentication required in production (Elastic Cloud)
  ...(process.env.NODE_ENV === "production" && {
    auth: {
      apiKey: process.env.ELASTICSEARCH_API_KEY || "",
    },
  }),

  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: false,
});
