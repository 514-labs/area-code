import { FooWithCDC, BarWithCDC } from "@workspace/models";
import { IngestPipeline } from "@514labs/moose-lib";

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
