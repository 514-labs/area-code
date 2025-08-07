import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import { bar } from "../database/schema";

export async function deleteBar(id: string): Promise<{ success: boolean }> {
  const deletedBar = await db.delete(bar).where(eq(bar.id, id)).returning();

  if (deletedBar.length === 0) {
    throw new Error("Bar not found");
  }

  return { success: true };
}
