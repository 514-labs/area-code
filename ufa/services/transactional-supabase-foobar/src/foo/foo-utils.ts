import {
  type Foo,
  type CreateFoo,
  type UpdateFoo,
  type DbFoo,
  type NewDbFoo,
} from "../database/schema";
import { FooStatus } from "@workspace/models/foo";

export function convertDbFooToModel(dbFoo: DbFoo): Foo {
  return {
    ...dbFoo,
    status: dbFoo.status as FooStatus,
    score: dbFoo.score ? parseFloat(dbFoo.score) : 0,
    metadata: dbFoo.metadata || {},
    tags: dbFoo.tags || [],
    large_text: dbFoo.large_text || "",
  };
}

export function convertModelToDbFoo(
  apiData: CreateFoo | UpdateFoo
): Partial<NewDbFoo> {
  const dbData = { ...apiData } as Partial<NewDbFoo>;

  if (apiData.score !== undefined && typeof apiData.score === "number") {
    dbData.score = apiData.score.toString();
  }

  if (apiData.tags !== undefined && apiData.tags !== null) {
    if (Array.isArray(apiData.tags)) {
      dbData.tags = apiData.tags;
    } else {
      dbData.tags = [];
    }
  } else {
    dbData.tags = [];
  }

  if (dbData.metadata === undefined) {
    dbData.metadata = {};
  }

  return dbData;
}
