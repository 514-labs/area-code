import { FooWithCDC, FooStatus } from "@workspace/models";
import { RealtimePayload } from "./supabase-cdc.types";
import { sendDataToAnalyticalPipeline } from "./send-data-to-analytical";
import { sendDataToElasticsearch } from "./send-data-to-elastic";

// Business logic handlers for each table
export async function handleFooChange(payload: RealtimePayload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "activated" | "deactivated";
  // let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      if (!newRecord) {
        console.error("INSERT event missing new record");
        return;
      }
      action = "created";
      console.log(`🔔 Business Logic: New foo "${newRecord.name}" created`);
      break;
    case "UPDATE":
      if (!newRecord || !oldRecord) {
        console.error("UPDATE event missing records");
        return;
      }
      // Determine specific update type
      if (oldRecord.is_active !== newRecord.is_active) {
        action = newRecord.is_active ? "activated" : "deactivated";
        console.log(`🔔 Business Logic: Foo "${newRecord.name}" ${action}`);
      } else {
        action = "updated";
        console.log(`🔔 Business Logic: Foo "${newRecord.name}" updated`);
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
      console.log(`🔔 Business Logic: Foo "${oldRecord.name}" was deleted`);
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
      return;
  }

  try {
    const cdc_operation =
      eventType === "INSERT"
        ? "INSERT"
        : eventType === "UPDATE"
          ? "UPDATE"
          : "DELETE";

    // For DELETE events, use oldRecord; for INSERT/UPDATE, use newRecord
    const sourceData = eventType === "DELETE" ? oldRecord : newRecord;

    if (sourceData) {
      let fooPipelineData: FooWithCDC;

      if (eventType === "DELETE") {
        // For DELETE events, we only get the ID, so create a complete record with defaults
        fooPipelineData = {
          id: sourceData.id as string,
          name: "", // Unknown - record was deleted
          description: null,
          status: FooStatus.ARCHIVED, // Mark as archived since it's deleted
          priority: 0,
          is_active: false,
          metadata: {},
          tags: [],
          score: 0,
          large_text: "",
          created_at: new Date(), // Use current time as fallback
          updated_at: new Date(), // Use current time as fallback
          cdc_id: `foo-${sourceData.id}-${Date.now()}`,
          cdc_operation: "DELETE",
          cdc_timestamp: new Date(),
        };
      } else {
        // For INSERT/UPDATE events, we have the full record
        fooPipelineData = {
          ...sourceData,
          cdc_id: `foo-${sourceData.id}-${Date.now()}`,
          cdc_operation,
          cdc_timestamp: new Date(),
        } as FooWithCDC;
      }

      await sendDataToAnalyticalPipeline("Foo", fooPipelineData);
    }

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE" && oldRecord) {
      await sendDataToElasticsearch("foo", "delete", { id: oldRecord.id });
    } else if (newRecord) {
      await sendDataToElasticsearch("foo", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending FooThingEvent:", error);
  }
}
