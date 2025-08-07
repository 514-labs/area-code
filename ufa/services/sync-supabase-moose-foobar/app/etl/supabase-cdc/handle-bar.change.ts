import { BarWithCDC } from "@workspace/models";
import { RealtimePayload } from "./supabase-cdc.types";
import { sendDataToAnalyticalPipeline } from "./send-data-to-analytical";
import { sendDataToElasticsearch } from "./send-data-to-elastic";

export async function handleBarChange(payload: RealtimePayload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "enabled" | "disabled";
  // let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      if (!newRecord) {
        console.error("INSERT event missing new record");
        return;
      }
      action = "created";
      console.log(
        `🔔 Business Logic: New bar with value ${newRecord.value} created`
      );
      break;
    case "UPDATE":
      if (!newRecord || !oldRecord) {
        console.error("UPDATE event missing records");
        return;
      }
      // Determine specific update type
      if (oldRecord.is_enabled !== newRecord.is_enabled) {
        action = newRecord.is_enabled ? "enabled" : "disabled";
        console.log(`🔔 Business Logic: Bar ${action}`);
      } else {
        action = "updated";
        console.log(`🔔 Business Logic: Bar updated`);
      }

      // Track which fields changed
      // changes = Object.keys(newRecord).filter(
      //   (key) =>
      //     JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      // );
      break;
    case "DELETE":
      if (!oldRecord) {
        console.error("DELETE event missing old record");
        return;
      }
      action = "deleted";
      console.log(
        `🔔 Business Logic: Bar with value ${oldRecord.value} was deleted`
      );
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
      return;
  }

  // Create and send BarThingEvent to analytics
  try {
    // Send to analytical pipeline for CDC processing
    const cdc_operation =
      eventType === "INSERT"
        ? "INSERT"
        : eventType === "UPDATE"
          ? "UPDATE"
          : "DELETE";

    // For DELETE events, use oldRecord; for INSERT/UPDATE, use newRecord
    const sourceData = eventType === "DELETE" ? oldRecord : newRecord;

    if (sourceData) {
      let barPipelineData: BarWithCDC;

      if (eventType === "DELETE") {
        // For DELETE events, we only get the ID, so create a complete record with defaults
        barPipelineData = {
          id: sourceData.id as string,
          foo_id: "", // Unknown - record was deleted
          value: 0,
          label: null,
          notes: null,
          is_enabled: false,
          created_at: new Date(), // Use current time as fallback
          updated_at: new Date(), // Use current time as fallback
          cdc_id: `bar-${sourceData.id}-${Date.now()}`,
          cdc_operation: "DELETE",
          cdc_timestamp: new Date(),
        };
      } else {
        // For INSERT/UPDATE events, we have the full record
        barPipelineData = {
          ...sourceData,
          cdc_id: `bar-${sourceData.id}-${Date.now()}`,
          cdc_operation,
          cdc_timestamp: new Date(),
        } as BarWithCDC;
      }

      await sendDataToAnalyticalPipeline("Bar", barPipelineData);
    }

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE" && oldRecord) {
      await sendDataToElasticsearch("bar", "delete", { id: oldRecord.id });
    } else if (newRecord) {
      await sendDataToElasticsearch("bar", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending BarThingEvent:", error);
  }
}
