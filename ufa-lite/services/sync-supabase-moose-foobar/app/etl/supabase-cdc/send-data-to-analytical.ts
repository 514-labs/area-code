import { BarWithCDC, FooWithCDC } from "@workspace/models";
import { getAnalyticsBaseUrl } from "../../env-vars";

export async function sendDataToAnalyticalPipeline(
  type: "Foo" | "Bar",
  data: FooWithCDC | BarWithCDC
) {
  const analyticsUrl = getAnalyticsBaseUrl();
  const url = `${analyticsUrl}/ingest/${type}`;

  try {
    console.log(`📊 Sending ${type} data to analytical pipeline: ${url}`);

    // Helper function to safely format dates
    const formatDate = (dateValue: unknown): string => {
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === "string" && dateValue) {
        const date = new Date(dateValue);
        return isNaN(date.getTime())
          ? new Date().toISOString()
          : date.toISOString();
      }
      // For missing dates (like in DELETE events), use current timestamp
      return new Date().toISOString();
    };

    // Format dates properly for JSON serialization
    const formattedData = {
      ...data,
      created_at: formatDate(data.created_at),
      updated_at: formatDate(data.updated_at),
      cdc_timestamp: data.cdc_timestamp.toISOString(),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${type} data to analytical pipeline`);
    } else {
      console.error(
        `❌ Failed to send ${type} data to analytical pipeline:`,
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(
      `❌ Error sending ${type} data to analytical pipeline:`,
      error
    );
  }
}
