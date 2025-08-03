import { FooWithCDC, BarWithCDC } from "@workspace/models";
import { IngestPipeline, Stream } from "@514labs/moose-lib";
import { SqlServerDebeziumPayload } from "../models/debeziumPayload";
import { transformDebeziumPayloadToFooWithCDC, transformDebeziumPayloadToBarWithCDC } from "../cdc/sqlServerDebeziumTransform";

// Destination Topic for CDC Debezium payloads that will be written to by the Debezium connector
export const sqlServerDebeziumPayloadStream = new Stream<SqlServerDebeziumPayload>("SqlServerDebeziumPayloadRedpandaTopic", {});

// Destination Tables and Topics for CDC Debezium payloads
export const FooPipeline = new IngestPipeline<FooWithCDC>("Foo", {
  table: {
    orderByFields: ["cdc_id", "cdc_timestamp"],
    deduplicate: true,
  },
  stream: true,
  ingest: true,
});

export const BarPipeline = new IngestPipeline<BarWithCDC>("Bar", {
  table: {
    orderByFields: ["cdc_id", "cdc_timestamp"],
    deduplicate: true,
  },
  stream: true,
  ingest: true,
});


// Stream processing function that consume CDC Debezium payloads from the source topic and transform them to CDC tables
sqlServerDebeziumPayloadStream.addTransform(FooPipeline.stream!, transformDebeziumPayloadToFooWithCDC);
sqlServerDebeziumPayloadStream.addTransform(BarPipeline.stream!, transformDebeziumPayloadToBarWithCDC);