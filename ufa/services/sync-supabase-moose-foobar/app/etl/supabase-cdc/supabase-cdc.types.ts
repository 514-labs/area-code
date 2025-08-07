export type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  commit_timestamp?: string;
};
