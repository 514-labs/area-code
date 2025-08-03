// Index definitions for Elasticsearch

export const FOO_INDEX = "foos";
export const BAR_INDEX = "bars";

// Mapping for Foo index
export const fooIndexMapping = {
  properties: {
    id: { type: "keyword" },
    name: {
      type: "text",
      fields: {
        keyword: { type: "keyword" },
      },
    },
    description: {
      type: "text",
      analyzer: "standard",
    },
    status: { type: "keyword" },
    priority: { type: "integer" },
    isActive: { type: "boolean" },
    metadata: { type: "object" },
    tags: { type: "keyword" },
    score: { type: "float" },
    largeText: {
      type: "text",
      analyzer: "standard",
    },
    createdAt: { type: "date" },
    updatedAt: { type: "date" },
  },
} as const;

// Mapping for Bar index
export const barIndexMapping = {
  properties: {
    id: { type: "keyword" },
    fooId: { type: "keyword" },
    value: { type: "float" },
    label: {
      type: "text",
      fields: {
        keyword: { type: "keyword" },
      },
    },
    notes: {
      type: "text",
      analyzer: "standard",
    },
    isEnabled: { type: "boolean" },
    createdAt: { type: "date" },
    updatedAt: { type: "date" },
  },
} as const;
