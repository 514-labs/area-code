import { getRetrievalBaseUrl } from "../../env-vars";


export async function sendDataToElasticsearch(
  type: "foo" | "bar",
  action: "index" | "delete",
  data: Record<string, unknown>
) {
  console.log("Sending data to Elasticsearch:", type, action, data);
  const retrievalUrl = getRetrievalBaseUrl();
  const url = `${retrievalUrl}/api/ingest/${type}`;

  try {
    console.log(`🔍 Sending ${type} ${action} to Elasticsearch: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, data }),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${type} ${action} to Elasticsearch`);
    } else {
      console.error(
        `❌ Failed to send ${type} ${action} to Elasticsearch:`,
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(
      `❌ Error sending ${type} ${action} to Elasticsearch:`,
      error
    );
  }
}
