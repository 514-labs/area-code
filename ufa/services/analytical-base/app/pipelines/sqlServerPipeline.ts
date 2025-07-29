import { IngestPipeline, Stream, Key} from "@514labs/moose-lib";


interface CDCSchema {
  type: string;
  fields: {
    name: string;
    type: string;
  }[];
  optional: boolean;
  name: string;
  field: string;
}

interface CDCSource {
  version: string;
  connector: string;
  name: string;
  ts_ms: number;
  snapshot: boolean;
  db: string;
  sequence?: string;
  ts_us?: number;
  ts_ns?: number;
  schema: string;
  table: string;
  change_lsn?: string;
  commit_lsn?: string;
  event_serial_no?: number;
}

interface CDCPayload {
  before?: Record<string, any>;
  after: Record<string, any>;
  source: CDCSource;
  op: "r" | "c" | "u" | "d";
  ts_ms: number;
  ts_us?: number;
  ts_ns?: number;
}


export interface SqlServerDebeziumPayload {
  schema: CDCSchema;
  payload: CDCPayload;
}


export const sqlServerDebeziumPayloadStream = new Stream<SqlServerDebeziumPayload>("SqlServerDebeziumPayload", {});


export interface ProcessSqlServerDebeziumPayload {
  time: Key<Date>;
  payload: Record<string, any>;
}

export const processSqlServerDebeziumPayloadPipeline = new IngestPipeline<ProcessSqlServerDebeziumPayload>("SqlServerDebeziumProcessedPayload", {
  stream: true,
  table: true,
  ingest: false,
});

export const transformSqlServerDebeziumPayload = (payload: SqlServerDebeziumPayload) => {
  const after = payload.payload.after;
  const before = payload.payload.before;
  const op = payload.payload.op;
  const source = payload.payload.source;
  const ts_ms = payload.payload.ts_ms;
  const ts_us = payload.payload.ts_us;
  const ts_ns = payload.payload.ts_ns;
  console.log("AFTER:");
  console.log(JSON.stringify(after, null, 2));
  console.log("BEFORE:");
  console.log(JSON.stringify(before, null, 2));
  console.log("OPERATION:");
  console.log(op);
  console.log("SOURCE:");
  console.log(source);
  console.log("TIMESTAMP MS:");
  console.log(ts_ms);
  console.log("TIMESTAMP US:");
  console.log(ts_us);
  console.log("TIMESTAMP NS:");
  console.log(ts_ns);
  console.log("--------------------------------");
  return {
    time: new Date(),
    payload: payload,
  };
};


