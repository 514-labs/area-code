interface DebeziumCDCSchema {
    type: string;
    fields: {
      name: string;
      type: string;
    }[];
    optional: boolean;
    name: string;
    field: string;
  }
  
  interface DebeziumCDCSource {
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
  
  interface DebeziumCDCPayload {
    before?: Record<string, any>;
    after: Record<string, any>;
    source: DebeziumCDCSource;
    op: "r" | "c" | "u" | "d";
    ts_ms: number;
    ts_us?: number;
    ts_ns?: number;
  }
  
  
  export interface SqlServerDebeziumPayload {
    schema: DebeziumCDCSchema;
    payload: DebeziumCDCPayload;
  }
  
  
  