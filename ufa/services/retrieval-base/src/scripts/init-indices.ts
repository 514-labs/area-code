import { esClient } from "../elasticsearch/client";
import {
  FOO_INDEX,
  BAR_INDEX,
  fooIndexMapping,
  barIndexMapping,
} from "../elasticsearch/indices";

async function initIndices() {
  console.log("🔧 Initializing Elasticsearch indices...");

  try {
    // Check if indices exist
    const fooExists = await esClient.indices.exists({ index: FOO_INDEX });
    const barExists = await esClient.indices.exists({ index: BAR_INDEX });

    // Create foo index if it doesn't exist
    if (!fooExists) {
      console.log(`📄 Creating index: ${FOO_INDEX}`);
      await esClient.indices.create({
        index: FOO_INDEX,
        body: {
          mappings: fooIndexMapping,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                standard: {
                  type: "standard",
                },
              },
            },
          },
        },
      });
      console.log(`✅ Created index: ${FOO_INDEX}`);
    } else {
      console.log(`ℹ️  Index already exists: ${FOO_INDEX}`);
    }

    // Create bar index if it doesn't exist
    if (!barExists) {
      console.log(`📄 Creating index: ${BAR_INDEX}`);
      await esClient.indices.create({
        index: BAR_INDEX,
        body: {
          mappings: barIndexMapping,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                standard: {
                  type: "standard",
                },
              },
            },
          },
        },
      });
      console.log(`✅ Created index: ${BAR_INDEX}`);
    } else {
      console.log(`ℹ️  Index already exists: ${BAR_INDEX}`);
    }

    console.log("✨ All indices initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing indices:", error);
    process.exit(1);
  }
}

// Run the initialization
initIndices();
