import { IngestPipeline } from "@514labs/moose-lib";
import { FooThingEvent, BarThingEvent } from "@workspace/models";

// FooThingEvent Ingestion Pipeline
export const FooThingEventPipeline = new IngestPipeline<FooThingEvent>(
  "FooThingEvent",
  {
    table: {
      orderByFields: ["id", "timestamp"],
      deduplicate: true,
    },
    stream: true,
    ingest: true,
    metadata: {
      description:
        "Ingestion pipeline for FooThing events that captures all foo-related operations including creation, updates, deletion, activation, and deactivation.",
    },
  }
);

// BarThingEvent Ingestion Pipeline
export const BarThingEventPipeline = new IngestPipeline<BarThingEvent>(
  "BarThingEvent",
  {
    table: {
      orderByFields: ["id", "timestamp"],
      deduplicate: true,
    },
    stream: true,
    ingest: true,
    metadata: {
      description:
        "Ingestion pipeline for BarThing events that captures all bar-related operations including creation, updates, deletion, enabling, and disabling.",
    },
  }
);
