import { Client } from "@elastic/elasticsearch";

// Create Elasticsearch client instance
export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: false,
});
