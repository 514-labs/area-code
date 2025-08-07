import {
  type Foo,
  type CreateFoo,
  type UpdateFoo,
  type DbFoo,
  type NewDbFoo,
} from "../database/schema";
import { FooStatus } from "@workspace/models/foo";

// Convert database result to API type
export function getModelFromDBRow(dbFoo: DbFoo): Foo {
  return {
    id: dbFoo.id,
    name: dbFoo.name,
    description: dbFoo.description,
    status: dbFoo.status as FooStatus,
    priority: dbFoo.priority,
    is_active: dbFoo.isActive,
    metadata: dbFoo.metadata || {},
    tags: dbFoo.tags || [],
    score: dbFoo.score ? parseFloat(dbFoo.score) : 0,
    large_text: dbFoo.largeText || "",
    created_at: dbFoo.createdAt,
    updated_at: dbFoo.updatedAt,
  };
}

// Convert API data to database format
export function apiToDbFoo(apiData: CreateFoo | UpdateFoo): Partial<NewDbFoo> {
  const dbData: Partial<NewDbFoo> = {};

  // Copy over basic properties
  if ("name" in apiData && apiData.name !== undefined) {
    dbData.name = apiData.name;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.priority !== undefined) {
    dbData.priority = apiData.priority;
  }
  if (apiData.is_active !== undefined) {
    dbData.isActive = apiData.is_active;
  }
  if (apiData.metadata !== undefined) {
    dbData.metadata = apiData.metadata;
  }
  if (apiData.large_text !== undefined) {
    dbData.largeText = apiData.large_text;
  }

  // Convert score from number to string for database
  if (apiData.score !== undefined && typeof apiData.score === "number") {
    dbData.score = apiData.score.toString();
  }

  // Ensure tags is properly handled as array
  if (apiData.tags !== undefined && apiData.tags !== null) {
    if (Array.isArray(apiData.tags)) {
      dbData.tags = apiData.tags;
    } else {
      // If it's not an array, make it an empty array
      dbData.tags = [];
    }
  } else {
    // If tags is undefined or null, set to empty array
    dbData.tags = [];
  }

  return dbData;
}
