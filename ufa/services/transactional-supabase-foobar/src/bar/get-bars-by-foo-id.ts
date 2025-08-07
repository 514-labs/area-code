import { eq, desc } from "drizzle-orm";
import { db } from "../database/connection";
import { bar, type Bar } from "../database/schema";

export async function getBarsByFooId(fooId: string): Promise<Bar[]> {
  const bars = await db
    .select({
      id: bar.id,
      foo_id: bar.fooId,
      value: bar.value,
      label: bar.label,
      notes: bar.notes,
      is_enabled: bar.isEnabled,
      created_at: bar.createdAt,
      updated_at: bar.updatedAt,
    })
    .from(bar)
    .where(eq(bar.fooId, fooId))
    .orderBy(desc(bar.createdAt));

  return bars;
}
