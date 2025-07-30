// Elasticsearch integration helper for analytical-base
// Sends processed CDC data to Elasticsearch via retrieval service

// Environment configuration for retrieval service
// This should match the retrieval-base service URL
// Default: http://localhost:8083 (retrieval-base default port)
const RETRIEVAL_BASE_URL = process.env.RETRIEVAL_BASE_URL || "http://localhost:8083";

// Enable/disable Elasticsearch integration via environment variable
// Set ELASTICSEARCH_ENABLED=false to disable Elasticsearch integration
const ELASTICSEARCH_ENABLED = process.env.ELASTICSEARCH_ENABLED !== "false";

export interface ElasticsearchData {
  action: "index" | "delete";
  data: Record<string, unknown>;
}

/**
 * Send data to Elasticsearch via the retrieval service
 * Replicates the sendDataToElasticsearch function from sync-base
 * 
 * @param type - The data type ("foo" or "bar")
 * @param action - The action to perform ("index" or "delete")
 * @param data - The data to send
 */
export const sendDataToElasticsearch = async (
  type: "foo" | "bar",
  action: "index" | "delete", 
  data: Record<string, unknown>
): Promise<void> => {
  // Skip if Elasticsearch integration is disabled
  if (!ELASTICSEARCH_ENABLED) {
    console.log(`🔍 [Analytical-Base] Elasticsearch integration disabled, skipping ${type} ${action}`);
    return;
  }

  console.log(`🔍 [Analytical-Base] Sending ${type} ${action} to Elasticsearch`);
  
  const url = `${RETRIEVAL_BASE_URL}/api/ingest/${type}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, data }),
    });

    if (response.ok) {
      console.log(`✅ [Analytical-Base] Successfully sent ${type} ${action} to Elasticsearch`);
    } else {
      console.error(
        `❌ [Analytical-Base] Failed to send ${type} ${action} to Elasticsearch:`,
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(
      `❌ [Analytical-Base] Error sending ${type} ${action} to Elasticsearch:`,
      error
    );
  }
};

/**
 * Helper function to extract data for Elasticsearch indexing from CDC records
 * Converts FooWithCDC/BarWithCDC back to the format expected by Elasticsearch
 * 
 * @param record - The CDC record (FooWithCDC or BarWithCDC)
 * @param operation - The CDC operation type
 * @returns Object with action and data for Elasticsearch
 */
export const prepareElasticsearchData = (
  record: Record<string, any>,
  operation: "INSERT" | "UPDATE" | "DELETE"
): { action: "index" | "delete"; data: Record<string, unknown> } => {
  if (operation === "DELETE") {
    return {
      action: "delete",
      data: { id: record.id }
    };
  }
  
  // For INSERT/UPDATE, prepare the full record for indexing
  // Remove CDC-specific fields that aren't needed in Elasticsearch
  const { cdc_id, cdc_operation, cdc_timestamp, ...cleanData } = record;
  
  return {
    action: "index",
    data: {
      ...cleanData,
      // Convert dates to ISO strings for Elasticsearch
      created_at: record.created_at instanceof Date 
        ? record.created_at.toISOString() 
        : record.created_at,
      updated_at: record.updated_at instanceof Date 
        ? record.updated_at.toISOString() 
        : record.updated_at,
    }
  };
}; 