import { eq, desc } from "drizzle-orm";
import { db } from "../database/connection";
import { bar, type Bar } from "../database/schema";

export async function getBarsByFooId(fooId: string): Promise<Bar[]> {
  const bars = await db
    .select({
      id: bar.id,
      foo_id: bar.foo_id,
      value: bar.value,
      label: bar.label,
      notes: bar.notes,
      is_enabled: bar.is_enabled,
      created_at: bar.created_at,
      updated_at: bar.updated_at,
    })
    .from(bar)
    .where(eq(bar.foo_id, fooId))
    .orderBy(desc(bar.created_at));

  return bars;
}
