import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import {
  bar,
  foo,
  type Bar,
  type UpdateBar,
  type NewDbBar,
} from "../database/schema";

export async function updateBar(id: string, data: UpdateBar): Promise<Bar> {
  const updateData: Partial<NewDbBar> = {
    ...data,
    updatedAt: new Date(),
  };

  // If updating fooId, verify that foo exists
  if (updateData.fooId) {
    const fooExists = await db
      .select()
      .from(foo)
      .where(eq(foo.id, updateData.fooId))
      .limit(1);

    if (fooExists.length === 0) {
      throw new Error("Referenced foo does not exist");
    }
  }

  const updatedBar = await db
    .update(bar)
    .set(updateData)
    .where(eq(bar.id, id))
    .returning({
      id: bar.id,
      foo_id: bar.fooId,
      value: bar.value,
      label: bar.label,
      notes: bar.notes,
      is_enabled: bar.isEnabled,
      created_at: bar.createdAt,
      updated_at: bar.updatedAt,
    });

  if (updatedBar.length === 0) {
    throw new Error("Bar not found");
  }

  return updatedBar[0];
}
